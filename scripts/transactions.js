const DATA_KEY = 'app:data';

let records   = [];
let sortField = 'date';
let sortAsc   = false;
let editingId = null;

//  Form refs 
const form          = document.getElementById('transaction-form');
const formTitle     = document.getElementById('form-title');
const hiddenId      = document.getElementById('form-record-id');
const descInput     = document.getElementById('form-description');
const amountInput   = document.getElementById('form-amount');
const categoryInput = document.getElementById('form-category');
const dateInput     = document.getElementById('form-date');
const cancelBtn     = document.getElementById('form-cancel');
const errDesc       = document.getElementById('err-description');
const errAmount     = document.getElementById('err-amount');
const errCategory   = document.getElementById('err-category');
const errDate       = document.getElementById('err-date');

//  Records refs 
const recordsBody   = document.getElementById('records-body');
const searchInput   = document.getElementById('search-input');
const caseToggle    = document.getElementById('search-case-insensitive');
const sortDateBtn   = document.getElementById('sort-date');
const sortDescBtn   = document.getElementById('sort-description');
const sortAmountBtn = document.getElementById('sort-amount');
const ariaStatus    = document.getElementById('aria-status');

// Regex patterns (Section C) 
// Rule 1: no leading/trailing whitespace.
const DESC_RE     = /^\S(?:.*\S)?$/;
// Rule 2: valid monetary amount, no leading zeros, max 2 decimal places.
const AMOUNT_RE   = /^(0|[1-9]\d*)(\.\d{1,2})?$/;
// Rule 3: strict YYYY-MM-DD date.
const DATE_RE     = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
// Rule 4: letters only, separated by spaces or hyphens.
const CATEGORY_RE = /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/;
// Advanced rule: back-reference catches adjacent duplicate words (e.g. "the the").
const DUP_WORD_RE = /\b(\w+)\s+\1\b/i;

// Storage 
function loadRecords() {
    records = JSON.parse(localStorage.getItem(DATA_KEY) || '[]');
}

function saveRecords() {
    localStorage.setItem(DATA_KEY, JSON.stringify(records));
}

// ID generation 
function generateId() {
    const nums = records
        .map(r => parseInt(r.id.replace(/\D/g, ''), 10))
        .filter(n => !isNaN(n));
    const max = nums.length ? Math.max(...nums) : 0;
    return `txn_${String(max + 1).padStart(4, '0')}`;
}

// Section navigation
function showSection(id) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// Validation 
function validateForm() {
    let valid = true;
    const desc = descInput.value;

    if (!DESC_RE.test(desc)) {
        errDesc.textContent = 'No leading or trailing spaces allowed.';
        valid = false;
    } else if (DUP_WORD_RE.test(desc)) {
        errDesc.textContent = 'Description has a repeated word (e.g. "the the"). Please revise.';
        valid = false;
    } else {
        errDesc.textContent = '';
    }

    if (!AMOUNT_RE.test(amountInput.value)) {
        errAmount.textContent = 'Enter a valid amount (e.g. 12.50). No leading zeros or more than 2 decimal places.';
        valid = false;
    } else {
        errAmount.textContent = '';
    }

    if (!CATEGORY_RE.test(categoryInput.value.trim())) {
        errCategory.textContent = 'Category must use letters only, with spaces or hyphens between words (e.g. Food, Books).';
        valid = false;
    } else {
        errCategory.textContent = '';
    }

    if (!DATE_RE.test(dateInput.value)) {
        errDate.textContent = 'Enter a valid date in YYYY-MM-DD format.';
        valid = false;
    } else {
        errDate.textContent = '';
    }

    return valid;
}

// Search 
function compileSearch() {
    const pattern = searchInput.value.trim();
    if (!pattern) return { filter: null, hl: null };
    const base = caseToggle.checked ? 'i' : '';
    try {
        return {
            filter: new RegExp(pattern, base),
            hl:     new RegExp(pattern, base + 'g'),
        };
    } catch {
        return { filter: null, hl: null };
    }
}

//  HTML helpers
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function highlight(text, re) {
    if (!re) return escapeHtml(text);
    re.lastIndex = 0;
    const parts = [];
    let last = 0;
    let match;
    while ((match = re.exec(text)) !== null) {
        parts.push(escapeHtml(text.slice(last, match.index)));
        parts.push(`<mark>${escapeHtml(match[0])}</mark>`);
        last = re.lastIndex;
        if (match[0].length === 0) re.lastIndex++;
    }
    parts.push(escapeHtml(text.slice(last)));
    return parts.join('');
}

// Render table 
function getSortedFiltered() {
    const { filter, hl } = compileSearch();

    const filtered = filter
        ? records.filter(r => {
            filter.lastIndex = 0;
            return (
                filter.test(r.description) ||
                filter.test(r.category)    ||
                filter.test(String(r.amount)) ||
                filter.test(r.date)
            );
          })
        : [...records];

    filtered.sort((a, b) => {
        let va, vb;
        if      (sortField === 'amount')      { va = parseFloat(a.amount); vb = parseFloat(b.amount); }
        else if (sortField === 'description') { va = a.description.toLowerCase(); vb = b.description.toLowerCase(); }
        else                                  { va = a.date; vb = b.date; }
        if (va < vb) return sortAsc ? -1 : 1;
        if (va > vb) return sortAsc ?  1 : -1;
        return 0;
    });

    return { filtered, hl };
}

function renderTable() {
    const { filtered, hl } = getSortedFiltered();
    recordsBody.innerHTML = '';

    if (filtered.length === 0) {
        const tr  = document.createElement('tr');
        const td  = document.createElement('td');
        td.colSpan = 5;
        td.textContent = records.length === 0
            ? 'No transactions yet. Use Add/Edit Transaction to add one.'
            : 'No matches found for that search pattern.';
        tr.appendChild(td);
        recordsBody.appendChild(tr);
        return;
    }

    filtered.forEach(record => {
        if (hl) hl.lastIndex = 0;

        const tr = document.createElement('tr');

        const descTd = document.createElement('td');
        descTd.innerHTML = highlight(record.description, hl);

        const amountTd = document.createElement('td');
        amountTd.textContent = `$${parseFloat(record.amount).toFixed(2)}`;

        const catTd = document.createElement('td');
        catTd.innerHTML = highlight(record.category, hl);

        const dateTd = document.createElement('td');
        dateTd.textContent = record.date;

        const actionTd = document.createElement('td');

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className   = 'btn-edit';
        editBtn.setAttribute('aria-label', `Edit ${record.description}`);
        editBtn.addEventListener('click', () => loadForEdit(record.id));

        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.className   = 'btn-delete';
        delBtn.setAttribute('aria-label', `Delete ${record.description}`);
        delBtn.addEventListener('click', () => deleteRecord(record.id));

        actionTd.append(editBtn, delBtn);
        tr.append(descTd, amountTd, catTd, dateTd, actionTd);
        recordsBody.appendChild(tr);
    });
}

// Edit
function loadForEdit(id) {
    const record = records.find(r => r.id === id);
    if (!record) return;

    showSection('form-section');
    formTitle.textContent   = 'Edit Transaction';
    hiddenId.value          = record.id;
    descInput.value         = record.description;
    amountInput.value       = record.amount;
    categoryInput.value     = record.category;
    dateInput.value         = record.date;
    editingId               = id;

    ariaStatus.setAttribute('aria-live', 'polite');
    ariaStatus.textContent = `Editing: ${record.description}`;
}

// Delete 
function deleteRecord(id) {
    const record = records.find(r => r.id === id);
    if (!record) return;
    if (!confirm(`Delete "${record.description}"?`)) return;

    records = records.filter(r => r.id !== id);
    saveRecords();
    document.dispatchEvent(new CustomEvent('records:updated'));
    renderTable();

    ariaStatus.setAttribute('aria-live', 'polite');
    ariaStatus.textContent = `Deleted: ${record.description}`;
}

// Form submit
form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateForm()) return;

    const now = new Date().toISOString();

    if (editingId) {
        records = records.map(r => r.id !== editingId ? r : {
            ...r,
            description : descInput.value.trim(),
            amount      : parseFloat(amountInput.value),
            category    : categoryInput.value.trim(),
            date        : dateInput.value,
            updatedAt   : now,
        });
        ariaStatus.textContent = 'Transaction updated.';
    } else {
        records.push({
            id          : generateId(),
            description : descInput.value.trim(),
            amount      : parseFloat(amountInput.value),
            category    : categoryInput.value.trim(),
            date        : dateInput.value,
            createdAt   : now,
            updatedAt   : now,
        });
        ariaStatus.textContent = 'Transaction added.';
    }

    ariaStatus.setAttribute('aria-live', 'polite');
    saveRecords();
    document.dispatchEvent(new CustomEvent('records:updated'));
    resetForm();
    showSection('records');
    renderTable();
});

cancelBtn.addEventListener('click', () => {
    resetForm();
    showSection('records');
    renderTable();
});

// Reset form 
function resetForm() {
    form.reset();
    hiddenId.value        = '';
    formTitle.textContent = 'Add New Transaction';
    editingId             = null;
    [errDesc, errAmount, errCategory, errDate].forEach(el => { el.textContent = ''; });
}

//Sort
function updateSortButtons() {
    sortDateBtn.textContent   = 'Date'        + (sortField === 'date'        ? (sortAsc ? ' ↑' : ' ↓') : '');
    sortDescBtn.textContent   = 'Description' + (sortField === 'description' ? (sortAsc ? ' ↑' : ' ↓') : '');
    sortAmountBtn.textContent = 'Amount'      + (sortField === 'amount'      ? (sortAsc ? ' ↑' : ' ↓') : '');
}

function setSort(field) {
    sortAsc   = (sortField === field) ? !sortAsc : true;
    sortField = field;
    updateSortButtons();
    renderTable();
}

sortDateBtn.addEventListener('click',   () => setSort('date'));
sortDescBtn.addEventListener('click',   () => setSort('description'));
sortAmountBtn.addEventListener('click', () => setSort('amount'));
updateSortButtons();

// Search 
searchInput.addEventListener('input',  renderTable);
caseToggle.addEventListener('change',  renderTable);

// Sync with import from Settings 
document.addEventListener('records:updated', () => {
    loadRecords();
    renderTable();
});

// Collapse double spaces in description on blur
const descField = document.getElementById('form-description');
if (descField) {
    descField.addEventListener('blur', () => {
        descField.value = descField.value.replace(/  +/g, ' ').trim();
    });
}

// Init
loadRecords();
renderTable();
