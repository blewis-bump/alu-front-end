const SETTINGS_KEY = 'app:settings';
const DATA_KEY     = 'app:data';

const budgetCapInput  = document.getElementById('settings-budget-cap');
const cur1NameSelect  = document.getElementById('rate-currency-1-name');
const cur1RateInput   = document.getElementById('rate-currency-1');
const cur2NameSelect  = document.getElementById('rate-currency-2-name');
const cur2RateInput   = document.getElementById('rate-currency-2');
const saveBtn         = document.getElementById('btn-save-settings');
const savedMsg        = document.getElementById('settings-saved-msg');
const exportBtn       = document.getElementById('btn-export');
const importInput     = document.getElementById('input-import');
const ariaStatus      = document.getElementById('aria-status');

const errBudgetCap = document.getElementById('err-budget-cap');
const errRate1     = document.getElementById('err-rate-1');
const errRate2     = document.getElementById('err-rate-2');

// Matches amounts with up to 2 decimal places, no leading zeros.
const AMOUNT_RE = /^(0|[1-9]\d*)(\.\d{1,2})?$/;
// Same structure but allows up to 4 decimal places for exchange rates
const RATE_RE   = /^(0|[1-9]\d*)(\.\d{1,4})?$/;

function validateNumeric(value, regex, errorEl, fieldName) {
    if (value === '') {
        errorEl.textContent = '';
        return true;
    }
    if (!regex.test(value)) {
        errorEl.textContent = `${fieldName} must be a positive number (e.g. 500 or 0.92).`;
        return false;
    }
    errorEl.textContent = '';
    return true;
}

function loadSettings() {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if (saved.budgetCap != null) budgetCapInput.value = saved.budgetCap;
    if (saved.cur1Name)          cur1NameSelect.value = saved.cur1Name;
    if (saved.cur1Rate != null)  cur1RateInput.value  = saved.cur1Rate;
    if (saved.cur2Name)          cur2NameSelect.value = saved.cur2Name;
    if (saved.cur2Rate != null)  cur2RateInput.value  = saved.cur2Rate;
}

function saveSettings() {
    const capValid   = validateNumeric(budgetCapInput.value, AMOUNT_RE, errBudgetCap, 'Budget cap');
    const rate1Valid = validateNumeric(cur1RateInput.value,  RATE_RE,   errRate1,     'Rate');
    const rate2Valid = validateNumeric(cur2RateInput.value,  RATE_RE,   errRate2,     'Rate');

    if (!capValid || !rate1Valid || !rate2Valid) {
        savedMsg.textContent = '';
        return;
    }

    const settings = {
        budgetCap : budgetCapInput.value !== '' ? parseFloat(budgetCapInput.value) : null,
        cur1Name  : cur1NameSelect.value,
        cur1Rate  : cur1RateInput.value  !== '' ? parseFloat(cur1RateInput.value)  : null,
        cur2Name  : cur2NameSelect.value,
        cur2Rate  : cur2RateInput.value  !== '' ? parseFloat(cur2RateInput.value)  : null,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    savedMsg.textContent = 'Settings saved.';
    setTimeout(() => { savedMsg.textContent = ''; }, 3000);

    document.dispatchEvent(new CustomEvent('settings:updated'));
    announceBudgetStatus(settings.budgetCap);
}

function announceBudgetStatus(cap) {
    if (!cap) return;
    const records = JSON.parse(localStorage.getItem(DATA_KEY) || '[]');
    const total   = records.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    const remaining = cap - total;

    if (remaining < 0) {
        ariaStatus.setAttribute('aria-live', 'assertive');
        ariaStatus.textContent = `Budget cap exceeded by $${Math.abs(remaining).toFixed(2)}.`;
    } else {
        ariaStatus.setAttribute('aria-live', 'polite');
        ariaStatus.textContent = `$${remaining.toFixed(2)} remaining under your $${cap.toFixed(2)} cap.`;
    }
}

function exportData() {
    const raw  = localStorage.getItem(DATA_KEY) || '[]';
    const blob = new Blob([raw], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'finance-tracker-export.json';
    a.click();
    URL.revokeObjectURL(url);
    ariaStatus.setAttribute('aria-live', 'polite');
    ariaStatus.textContent = 'Data exported successfully.';
}

function importData(file) {
    const existing = JSON.parse(localStorage.getItem(DATA_KEY) || '[]');
    if (existing.length > 0) {
        const confirmed = confirm(
            `Importing will replace all ${existing.length} existing record(s) with the file contents. Continue?`
        );
        if (!confirmed) {
            importInput.value = '';
            return;
        }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) throw new Error('File must contain a JSON array.');

            const required = ['id', 'description', 'amount', 'category', 'date'];
            data.forEach((record, i) => {
                required.forEach(field => {
                    if (!(field in record)) {
                        throw new Error(`Record ${i + 1} is missing field: "${field}".`);
                    }
                });
            });

            localStorage.setItem(DATA_KEY, JSON.stringify(data));
            document.dispatchEvent(new CustomEvent('records:updated'));
            ariaStatus.setAttribute('aria-live', 'polite');
            ariaStatus.textContent = `Imported ${data.length} record(s) successfully.`;
        } catch (err) {
            ariaStatus.setAttribute('aria-live', 'assertive');
            ariaStatus.textContent = `Import failed: ${err.message}`;
        }
        importInput.value = '';
    };
    reader.readAsText(file);
}

const quickActionMsg = document.getElementById('quick-action-msg');

function showQuickMsg(text) {
    quickActionMsg.textContent = text;
    setTimeout(() => { quickActionMsg.textContent = ''; }, 3000);
}

function loadSampleData() {
    const existing = JSON.parse(localStorage.getItem(DATA_KEY) || '[]');
    if (existing.length > 0) {
        const confirmed = confirm(
            `This will replace your ${existing.length} existing record(s) with sample data. Continue?`
        );
        if (!confirmed) return;
    }
    fetch('seed.json')
        .then(res => {
            if (!res.ok) throw new Error('Could not load seed.json');
            return res.json();
        })
        .then(data => {
            localStorage.setItem(DATA_KEY, JSON.stringify(data));
            document.dispatchEvent(new CustomEvent('records:updated'));
            showQuickMsg(`Sample data loaded — ${data.length} example transactions added.`);
        })
        .catch(err => {
            showQuickMsg(`Failed to load sample data: ${err.message}`);
        });
}

function resetToDefaults() {
    const confirmed = confirm(
        'Reset the app? This clears all saved entries and settings in this browser and reloads with fresh defaults.'
    );
    if (!confirmed) return;
    localStorage.removeItem(DATA_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    loadSettings();
    budgetCapInput.value = '';
    cur1RateInput.value  = '';
    cur2RateInput.value  = '';
    document.dispatchEvent(new CustomEvent('records:updated'));
    document.dispatchEvent(new CustomEvent('settings:updated'));
    showQuickMsg('Reset complete — all data and settings cleared.');
}

saveBtn.addEventListener('click', saveSettings);
exportBtn.addEventListener('click', exportData);
importInput.addEventListener('change', (e) => {
    if (e.target.files[0]) importData(e.target.files[0]);
});

document.getElementById('btn-sample-data').addEventListener('click', loadSampleData);
document.getElementById('btn-reset').addEventListener('click', resetToDefaults);

loadSettings();

// Currency save button delegates to main save button
const btnCur = document.getElementById('btn-save-currency');
if (btnCur) btnCur.addEventListener('click', () => saveBtn.click());
