/* localStorage keys shared across all modules */
const DATA_KEY     = 'app:data';
const SETTINGS_KEY = 'app:settings';

/* DOM references for the main stat displays */
const statRecords  = document.getElementById('stat-total-records');
const statAmount   = document.getElementById('stat-total-amount');
const statCur1     = document.getElementById('stat-total-cur1');
const statCur2     = document.getElementById('stat-total-cur2');
const labelCur1    = document.getElementById('label-total-cur1');
const labelCur2    = document.getElementById('label-total-cur2');
const statTopCat   = document.getElementById('stat-top-category');
const statBudget   = document.getElementById('stat-budget-status');
const trendChart   = document.getElementById('trend-chart');
const ariaStatus   = document.getElementById('aria-status');

/* Read the full transaction list from localStorage */
function getRecords()  { return JSON.parse(localStorage.getItem(DATA_KEY)     || '[]'); }

/* Read saved settings from localStorage */
function getSettings() { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); }

/* Returns the category name with the highest combined spend across all records */
function topCategory(records) {
    if (!records.length) return 'N/A';
    const totals = {};
    records.forEach(r => {
        totals[r.category] = (totals[r.category] || 0) + (parseFloat(r.amount) || 0);
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];
}

/*
 * Updates the budget status card text and CSS class.
 * Shows remaining balance when under cap, or overage amount when over.
 * Also announces the status to screen readers via the shared ARIA live region.
 */
function updateBudgetStatus(total, cap) {
    if (!cap) {
        statBudget.textContent = 'No cap set';
        statBudget.className   = 'stat-value';
        return;
    }
    const remaining = cap - total;
    if (remaining < 0) {
        statBudget.textContent = `Over by $${Math.abs(remaining).toFixed(2)}`;
        statBudget.className   = 'stat-value budget-over';
        ariaStatus.setAttribute('aria-live', 'assertive');
        ariaStatus.textContent = `Budget cap exceeded by $${Math.abs(remaining).toFixed(2)}.`;
    } else {
        statBudget.textContent = `$${remaining.toFixed(2)} of $${parseFloat(cap).toFixed(2)} remaining`;
        statBudget.className   = 'stat-value budget-under';
        ariaStatus.setAttribute('aria-live', 'polite');
        ariaStatus.textContent = `$${remaining.toFixed(2)} remaining under your $${parseFloat(cap).toFixed(2)} cap.`;
    }
}

/*
 * Builds the 7-day bar chart inside #trend-chart.
 * Generates date strings for today and the 6 preceding days, sums spending
 * per day, then injects a .trend-col div (bar + label) for each day.
 * Bar heights are scaled relative to the day with the highest spend.
 */
function renderTrend(records) {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
    }

    /* Map each date to its total spend, defaulting to 0 */
    const dailyTotals = Object.fromEntries(days.map(d => [d, 0]));
    records.forEach(r => {
        if (r.date in dailyTotals) dailyTotals[r.date] += parseFloat(r.amount) || 0;
    });

    const maxVal     = Math.max(...Object.values(dailyTotals), 1);
    const BAR_MAX_PX = 120;

    trendChart.innerHTML = '';
    days.forEach(day => {
        const val       = dailyTotals[day];
        const barHeight = Math.max(2, Math.round((val / maxVal) * BAR_MAX_PX));

        const col = document.createElement('div');
        col.className = 'trend-col';

        const bar = document.createElement('div');
        bar.className = 'trend-bar';
        bar.style.height = `${barHeight}px`;
        bar.setAttribute('role', 'img');
        bar.setAttribute('aria-label', `${day}: $${val.toFixed(2)}`);

        const lbl = document.createElement('span');
        lbl.className   = 'trend-label';
        lbl.textContent = day.slice(5); // MM-DD

        col.append(bar, lbl);
        trendChart.appendChild(col);
    });
}

/*
 * Main dashboard refresh . reads records and settings from localStorage,
 * then updates every stat display like entry count, total amount, top category,
 * currency conversions, budget status, and the 7-day trend chart.
 */
function updateDashboard() {
    const records  = getRecords();
    const settings = getSettings();
    const total    = records.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

    statRecords.textContent = records.length;
    statAmount.textContent  = `$${total.toFixed(2)}`;
    statTopCat.textContent  = topCategory(records);

    /* Currency 1 conversion — falls back to a prompt if no rate is saved */
    if (settings.cur1Name && settings.cur1Rate) {
        labelCur1.textContent = `Total (${settings.cur1Name})`;
        statCur1.textContent  = `${settings.cur1Name} ${(total * settings.cur1Rate).toFixed(2)}`;
    } else {
        labelCur1.textContent = 'Total (EUR)';
        statCur1.textContent  = 'Set rate in Settings';
    }

    /* Currency 2 conversion. falls back to a prompt if no rate is saved */
    if (settings.cur2Name && settings.cur2Rate) {
        labelCur2.textContent = `Total (${settings.cur2Name})`;
        statCur2.textContent  = `${settings.cur2Name} ${(total * settings.cur2Rate).toFixed(2)}`;
    } else {
        labelCur2.textContent = 'Total (RWF)';
        statCur2.textContent  = 'Set rate in Settings';
    }

    updateBudgetStatus(total, settings.budgetCap);
    renderTrend(records);
}

/* Re-run the dashboard whenever transactions or settings change */
document.addEventListener('records:updated',  updateDashboard);
document.addEventListener('settings:updated', updateDashboard);

updateDashboard();

/*
 * Mirror cards and budget fill bar
 * The dashboard has secondary card elements that duplicate values already
 * shown in the banknote / primary stats. These src/dst maps track which
 * source elements to read from and which targets to write to.
 */
const src = {
    records:  document.getElementById('stat-total-records'),
    category: document.getElementById('stat-top-category'),
    budget:   document.getElementById('stat-budget-status'),
    amount:   document.getElementById('stat-total-amount')
};
const dst = {
    records:    document.getElementById('stat-total-records-mirror'),
    category:   document.getElementById('stat-top-category-mirror'),
    fill:       document.getElementById('budget-fill'),
    sevenTotal: document.getElementById('seven-total')
};

/*
 * Parses the budget status text to derive a 0–100 percentage,
 * then sets the width of the visual progress bar accordingly.
 * Pins to 100% when over budget.
 */
function syncBudgetBar() {
    if (!src.budget || !dst.fill) return;
    const txt = src.budget.textContent || '';
    let pct = 0;
    if (/over by/i.test(txt)) {
        pct = 100;
    } else {
        const nums = (txt.match(/[\d,]+(?:\.\d+)?/g) || []).map(n => parseFloat(n.replace(/,/g, '')));
        if (nums.length >= 2) {
            const remaining = nums[0], cap = nums[1];
            if (cap > 0) pct = Math.min(100, Math.max(0, ((cap - remaining) / cap) * 100));
        }
    }
    dst.fill.style.width = pct.toFixed(2) + '%';
}

/*
 * Sums all transactions from the past 7 days and writes the total
 * into the "last seven days" subtitle beneath the trend chart.
 */
function syncSevenTotal() {
    try {
        const records = JSON.parse(localStorage.getItem('app:data') || '[]');
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            days.push(d.toISOString().slice(0, 10));
        }
        const total = records.reduce((sum, r) => days.includes(r.date) ? sum + (parseFloat(r.amount) || 0) : sum, 0);
        if (dst.sevenTotal) dst.sevenTotal.textContent = '$' + total.toFixed(2) + ' this week';
    } catch (e) {}
}

/* Copies mirrored stat values and refreshes the budget bar and 7-day total */
function syncAll() {
    if (src.records  && dst.records)  dst.records.textContent  = src.records.textContent;
    if (src.category && dst.category) dst.category.textContent = src.category.textContent;
    syncBudgetBar();
    syncSevenTotal();
}

/*
 * Watch the primary stat elements for DOM text changes so the mirror cards
 * stay in sync without needing a full dashboard re-render.
 */
const mo = new MutationObserver(syncAll);
[src.records, src.category, src.budget, src.amount].forEach(el => {
    if (el) mo.observe(el, { childList: true, characterData: true, subtree: true });
});

document.addEventListener('records:updated',  syncAll);
document.addEventListener('settings:updated', syncAll);
window.addEventListener('load', syncAll);
syncAll();
