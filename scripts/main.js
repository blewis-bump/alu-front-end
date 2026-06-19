/* decorative engraving pattern drawn on the banknote background */
const c = document.getElementById('note-canvas');
if (c) {
    /* Draws a single rosette curve (epitrochoid) at (cx, cy) using parametric equations */
    function rosette(ctx, cx, cy, A, B, n, rot) {
        ctx.beginPath();
        for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.008) {
            const tt = t + rot;
            const x = cx + A * Math.cos(tt) + B * Math.cos(n * tt);
            const y = cy + A * Math.sin(tt) - B * Math.sin(n * tt);
            if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    /*
     * Draws a layered stack of rosettes at one point to create the dense
     * engraving effect: 14 shrinking outer rings + 8 inner detail rings.
     */
    function rosetteStack(ctx, cx, cy, baseA, baseB, n) {
        for (let i = 0; i < 14; i++) {
            const f = 1 - i * 0.06;
            rosette(ctx, cx, cy, baseA * f, baseB * f, n, i * 0.14);
        }
        for (let j = 0; j < 8; j++) {
            rosette(ctx, cx, cy, baseA * 0.34, baseB * 0.16, n + 4, j * 0.18);
        }
    }

    /*
     * Sizes the canvas to the element's current CSS dimensions (with DPR scaling
     * for sharp rendering on high-density screens), then draws:
     *   1. 70 horizontal sine-wave lines that form the guilloche background.
     *   2. Three rosette clusters (left, right, centre) on top.
     */
    function drawCanvas() {
        const rect = c.getBoundingClientRect();
        if (!rect.width) return;
        const dpr = window.devicePixelRatio || 1;
        const W = rect.width, H = rect.height;
        c.width  = Math.round(W * dpr);
        c.height = Math.round(H * dpr);
        const ctx = c.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = 'rgba(171,21,9,0.07)';

        /* amplitude and phase shift per line */
        for (let k = 0; k < 70; k++) {
            const amp = 4 + k * 0.85, phase = k * 0.32;
            ctx.beginPath();
            for (let x = 0; x <= W; x += 3) {
                const env = Math.sin((x / W) * Math.PI);
                const y = H * 0.5
                    + Math.sin(x * 0.022 + phase) * amp * env
                    + Math.sin(x * 0.006 + phase * 0.5) * (amp * 0.4) * env;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        /* Rosette clusters — u scales the radii to the canvas height */
        ctx.strokeStyle = 'rgba(171,21,9,0.10)';
        const u = H / 300;
        rosetteStack(ctx, W * 0.26, H * 0.5, 40 * u, 30 * u, 12);
        rosetteStack(ctx, W * 0.74, H * 0.5, 40 * u, 30 * u, 12);
        rosetteStack(ctx, W * 0.50, H * 0.5, 66 * u, 46 * u, 14);
    }

    drawCanvas();
    /* Redraw after a short delay to catch cases where layout hasn't settled yet */
    setTimeout(drawCanvas, 120);
    window.addEventListener('resize', drawCanvas);
}

/* SPA navigation — shows one section at a time and updates nav state */
const allNavButtons = document.querySelectorAll('button[data-section]');
const ariaStatus    = document.getElementById('aria-status');

/* Human-readable section names used for screen-reader announcements */
const sectionLabels = {
    'dashboard':    'Dashboard',
    'records':      'Transaction Records',
    'form-section': 'Add Entry',
    'settings':     'Settings',
    'about':        'About'
};

/*
 * Hides all sections, reveals the one matching id, marks the correct nav
 * button as aria-current = page, announces the transition to screen readers,
 * and moves focus to the section heading.
 */
function showSection(id) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if (!target) return;
    target.classList.remove('hidden');

    allNavButtons.forEach(btn => {
        if (btn.dataset.section === id) {
            btn.setAttribute('aria-current', 'page');
        } else {
            btn.removeAttribute('aria-current');
        }
    });

    /* Brief timeout lets the live region clear first so the new message is announced */
    if (ariaStatus) {
        ariaStatus.textContent = '';
        setTimeout(() => { ariaStatus.textContent = 'Now viewing: ' + (sectionLabels[id] || id); }, 50);
    }

    /* Move focus to the heading so keyboard users land in the right place */
    const heading = target.querySelector('h2');
    if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus();
    }
}

/* Wire every nav button (header + mobile sidebar) to showSection */
allNavButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        showSection(btn.dataset.section);
        if (history.pushState) history.pushState({ section: btn.dataset.section }, '', '#' + btn.dataset.section);
    });
});

/* Support the browser back/forward buttons */
window.addEventListener('popstate', e => {
    showSection((e.state && e.state.section) || 'dashboard');
});

/* On first load, show the section from the URL hash, defaulting to dashboard */
const initial = (location.hash || '#dashboard').replace('#', '');
showSection(initial);
