// ===== Config =====
const BALANCE_THRESHOLD = 300;
const USERS_KEY = 'budgetflow_users';
const SESSION_KEY = 'budgetflow_session';

// ===== EventBus =====
const EventBus = {
    _listeners: {},
    on(event, fn) { (this._listeners[event] = this._listeners[event] || []).push(fn); },
    off(event, fn) { this._listeners[event] = (this._listeners[event] || []).filter(f => f !== fn); },
    emit(event, data) { (this._listeners[event] || []).forEach(fn => fn(data)); }
};

// ===== PWA Service Worker =====
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ===== Auth Helpers =====
function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function hashPassword(pw) {
    let h = 0;
    for (let i = 0; i < pw.length; i++) {
        h = ((h << 5) - h + pw.charCodeAt(i)) | 0;
    }
    return 'h_' + Math.abs(h).toString(36);
}

function userKey(prefix) {
    return `budgetflow_${currentUser}_${prefix}`;
}

let currentUser = null;

// ===== Storage (per-user) =====
function loadTransactions() {
    const data = localStorage.getItem(userKey('transactions'));
    return data ? JSON.parse(data) : [];
}

function saveTransactions(txs) {
    localStorage.setItem(userKey('transactions'), JSON.stringify(txs));
}

function loadArchives() {
    const data = localStorage.getItem(userKey('archives'));
    return data ? JSON.parse(data) : [];
}

function saveArchives(archives) {
    localStorage.setItem(userKey('archives'), JSON.stringify(archives));
}

// ===== Settings (per-user) =====
function loadSettings() {
    const data = localStorage.getItem(userKey('settings'));
    return data ? JSON.parse(data) : {
        savingsGoal: 0,
        recurringTxns: [],
        currencies: {
            rates: { USD: 1.08, GBP: 0.86, CHF: 0.97, CAD: 1.47, JPY: 162.5 },
            lastUpdate: null
        }
    };
}

function saveSettings(s) {
    localStorage.setItem(userKey('settings'), JSON.stringify(s));
}

let currentSettings = {};

let transactions = [];
let lastDeletedTransaction = null;

let expenseChart = null;
let evolutionChart = null;
let comparisonChart = null;

// ===== Theme =====
function getTheme() {
    return localStorage.getItem('budgetflow_theme') || 'dark';
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('budgetflow_theme', theme);
    const icon = theme === 'light' ? '\u2600' : '\u263E';
    const themeIcon = document.getElementById('theme-icon');
    const themeAuth = document.getElementById('btn-theme-auth');
    if (themeIcon) themeIcon.textContent = icon;
    if (themeAuth) themeAuth.textContent = icon;
    updateChartsTheme();
}

function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

function getThemeColor() {
    return getTheme() === 'light' ? '#6b7280' : '#8b8fa3';
}

function getThemeGridColor() {
    return getTheme() === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
}

function updateChartsTheme() {
    const color = getThemeColor();
    const grid = getThemeGridColor();
    if (expenseChart) {
        expenseChart.options.plugins.legend.labels.color = color;
        expenseChart.update();
    }
    if (evolutionChart) {
        evolutionChart.options.scales.x.ticks.color = color;
        evolutionChart.options.scales.y.ticks.color = color;
        evolutionChart.options.scales.y.grid.color = grid;
        evolutionChart.update();
    }
    if (comparisonChart) {
        comparisonChart.options.scales.x.ticks.color = color;
        comparisonChart.options.scales.y.ticks.color = color;
        comparisonChart.options.scales.y.grid.color = grid;
        comparisonChart.options.plugins.legend.labels.color = color;
        comparisonChart.update();
    }
}

// Apply theme immediately
setTheme(getTheme());

// ===== Auth UI =====
const authOverlay = document.getElementById('auth-overlay');
const appContainer = document.getElementById('app');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');

tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    loginError.classList.add('hidden');
});

tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    registerError.classList.add('hidden');
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const users = getUsers();

    if (!users[username] || users[username] !== hashPassword(password)) {
        loginError.textContent = 'Identifiant ou mot de passe incorrect.';
        loginError.classList.remove('hidden');
        return;
    }

    loginError.classList.add('hidden');
    openSession(username);
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const password2 = document.getElementById('reg-password2').value;
    const users = getUsers();

    if (users[username]) {
        registerError.textContent = 'Ce nom d\'utilisateur est deja pris.';
        registerError.classList.remove('hidden');
        return;
    }
    if (password !== password2) {
        registerError.textContent = 'Les mots de passe ne correspondent pas.';
        registerError.classList.remove('hidden');
        return;
    }

    registerError.classList.add('hidden');
    users[username] = hashPassword(password);
    saveUsers(users);
    openSession(username);
});

function openSession(username) {
    currentUser = username;
    localStorage.setItem(SESSION_KEY, username);
    transactions = loadTransactions();
    currentSettings = loadSettings();
    lastDeletedTransaction = null;
    authOverlay.classList.add('hidden');
    appContainer.classList.remove('hidden');

    document.getElementById('user-avatar').textContent = username.charAt(0).toUpperCase();
    document.getElementById('user-name').textContent = username;

    initApp();
}

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem(SESSION_KEY);
    currentUser = null;
    appContainer.classList.add('hidden');
    authOverlay.classList.remove('hidden');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('reg-username').value = '';
    document.getElementById('reg-password').value = '';
    document.getElementById('reg-password2').value = '';
});

// Theme buttons
document.getElementById('btn-theme').addEventListener('click', toggleTheme);
document.getElementById('btn-theme-auth').addEventListener('click', toggleTheme);

// Password toggle (eye icon)
const EYE_OPEN = '<svg class="eye-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_CLOSED = '<svg class="eye-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
document.querySelectorAll('.btn-toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.innerHTML = isPassword ? EYE_CLOSED : EYE_OPEN;
    });
});

// ===== App DOM =====
const form = document.getElementById('transaction-form');
const typeSelect = document.getElementById('type');
const amountInput = document.getElementById('amount');
const currencySelect = document.getElementById('currency');
const categorySelect = document.getElementById('category');
const dateInput = document.getElementById('date');
const descriptionInput = document.getElementById('description');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const balanceEl = document.getElementById('balance');
const balanceCard = document.querySelector('.card-balance');
const transactionList = document.getElementById('transaction-list');
const emptyState = document.getElementById('empty-state');
const chartCanvas = document.getElementById('expense-chart');
const chartEmpty = document.getElementById('chart-empty');
const alertBanner = document.getElementById('alert-banner');
const adviceSection = document.getElementById('advice-section');
const adviceContent = document.getElementById('advice-content');
const btnUndo = document.getElementById('btn-undo');
const btnReset = document.getElementById('btn-reset');
const btnToggleArchives = document.getElementById('btn-toggle-archives');
const archivesBody = document.getElementById('archives-body');
const archivesList = document.getElementById('archives-list');
const archivesEmpty = document.getElementById('archives-empty');
const archiveDetail = document.getElementById('archive-detail');
const archiveDetailContent = document.getElementById('archive-detail-content');
const btnBackArchives = document.getElementById('btn-back-archives');
const todayDateEl = document.getElementById('today-date');
const toastEl = document.getElementById('toast');

// Filter DOM
const filterSearch = document.getElementById('filter-search');
const filterType = document.getElementById('filter-type');
const filterCategory = document.getElementById('filter-category');
const filterDateFrom = document.getElementById('filter-date-from');
const filterDateTo = document.getElementById('filter-date-to');
const btnClearFilters = document.getElementById('btn-clear-filters');

// ===== Category Icons =====
const categoryIcons = {
    'Salaire': '\u{1F4B0}', 'Freelance': '\u{1F4BB}', 'Investissements': '\u{1F4C8}',
    'Autre revenu': '\u{1F4B5}', 'Grosses courses': '\u{1F6D2}', 'Courses quotidiennes': '\u{1F956}', 'Transport': '\u{1F697}',
    'Logement': '\u{1F3E0}', 'Loisirs': '\u{1F3AE}', 'Sante': '\u{1F3E5}',
    'Shopping': '\u{1F6CD}\u{FE0F}', 'Factures': '\u{1F4C4}', 'Autre depense': '\u{1F4E6}',
};

const chartColors = [
    '#818cf8', '#f87171', '#34d399', '#fbbf24',
    '#f472b6', '#60a5fa', '#a78bfa', '#fb923c',
];

// ===== Toast =====
let toastTimeout = null;
function showToast(message, type) {
    clearTimeout(toastTimeout);
    toastEl.textContent = message;
    toastEl.className = 'toast ' + (type === 'archive' ? 'archive-toast' : '');
    toastEl.classList.remove('hidden');
    requestAnimationFrame(() => toastEl.classList.add('visible'));
    toastTimeout = setTimeout(() => {
        toastEl.classList.remove('visible');
        setTimeout(() => toastEl.classList.add('hidden'), 300);
    }, 3000);
}

// ===== Today's Date =====
function renderTodayDate() {
    const now = new Date();
    const formatted = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(now);
    todayDateEl.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// ===== Current Month Key =====
function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthKeyFromDate(dateStr) {
    return dateStr.substring(0, 7);
}

// ===== Multi-Currency =====
function getExchangeRates() {
    return (currentSettings.currencies && currentSettings.currencies.rates) || { USD: 1.08, GBP: 0.86, CHF: 0.97, CAD: 1.47, JPY: 162.5 };
}

function convertToEUR(amount, currency) {
    if (!currency || currency === 'EUR') return amount;
    const rates = getExchangeRates();
    const rate = rates[currency];
    if (!rate) return amount;
    return amount / rate;
}

// ===== Archive helpers =====
function computeTotalsFrom(txs) {
    const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amountEUR || t.amount), 0);
    const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amountEUR || t.amount), 0);
    return { income, expense, balance: income - expense };
}

const categoryAdvice = {
    'Grosses courses': { tip: 'Planifiez vos repas a l\'avance, faites une liste et comparez les prix entre enseignes.', target: 0.20 },
    'Courses quotidiennes': { tip: 'Limitez les achats impulsifs du quotidien en fixant un budget journalier.', target: 0.10 },
    'Transport': { tip: 'Pensez au covoiturage, aux transports en commun ou au velo pour reduire vos frais.', target: 0.10 },
    'Logement': { tip: 'Verifiez vos contrats d\'energie et d\'assurance pour trouver des offres plus avantageuses.', target: 0.35 },
    'Loisirs': { tip: 'Fixez-vous un budget loisirs hebdomadaire et privilegiez les activites gratuites.', target: 0.10 },
    'Sante': { tip: 'Comparez les mutuelles et verifiez vos remboursements pour optimiser vos depenses.', target: 0.05 },
    'Shopping': { tip: 'Appliquez la regle des 48h : attendez 2 jours avant tout achat non essentiel.', target: 0.05 },
    'Factures': { tip: 'Renegociez vos abonnements et resiliez ceux que vous n\'utilisez plus.', target: 0.10 },
    'Autre depense': { tip: 'Identifiez ces depenses et categorisez-les pour mieux les controler.', target: 0.05 },
};

function generateAdviceData(txs, income, expense, balance) {
    const expenses = txs.filter((t) => t.type === 'expense');
    if (expenses.length === 0) return null;
    const grouped = {};
    expenses.forEach((t) => { grouped[t.category] = (grouped[t.category] || 0) + (t.amountEUR || t.amount); });
    return Object.entries(grouped).sort((a, b) => b[1] - a[1]).map(([category, amount]) => {
        const pct = ((amount / expense) * 100).toFixed(1);
        const adv = categoryAdvice[category];
        const idealPct = adv ? (adv.target * 100) : null;
        const tip = adv ? adv.tip : 'Surveillez cette categorie et fixez-vous un plafond mensuel.';
        const isWarning = idealPct !== null && parseFloat(pct) > idealPct;
        const suggestedMax = (isWarning && income > 0 && adv) ? income * adv.target : null;
        return { category, amount, pct, idealPct, tip, isWarning, suggestedMax };
    });
}

function archiveMonth(monthKey, txs) {
    if (txs.length === 0) return;
    const { income, expense, balance } = computeTotalsFrom(txs);
    const advice = generateAdviceData(txs, income, expense, balance);
    const archive = {
        month: monthKey, transactions: [...txs], income, expense, balance, advice,
        savingsGoal: currentSettings.savingsGoal || 0,
        savedAmount: Math.max(0, income - expense),
        archivedAt: new Date().toISOString()
    };
    const archives = loadArchives();
    const idx = archives.findIndex((a) => a.month === monthKey);
    if (idx !== -1) archives[idx] = archive; else archives.unshift(archive);
    saveArchives(archives);
}

function addTransactionToArchive(monthKey, transaction) {
    const archives = loadArchives();
    let archive = archives.find((a) => a.month === monthKey);
    if (!archive) {
        archive = { month: monthKey, transactions: [], income: 0, expense: 0, balance: 0, advice: null, archivedAt: new Date().toISOString() };
        archives.unshift(archive);
    }
    archive.transactions.unshift(transaction);
    const { income, expense, balance } = computeTotalsFrom(archive.transactions);
    archive.income = income;
    archive.expense = expense;
    archive.balance = balance;
    archive.advice = generateAdviceData(archive.transactions, income, expense, balance);
    archives.sort((a, b) => b.month.localeCompare(a.month));
    saveArchives(archives);
}

// ===== Auto Monthly Reset =====
function checkMonthlyReset() {
    const currentMonth = getCurrentMonthKey();
    const lastReset = localStorage.getItem(userKey('last_reset'));

    if (lastReset !== currentMonth) {
        if (lastReset && transactions.length > 0) {
            archiveMonth(lastReset, transactions);
        }
        transactions = [];
        saveTransactions(transactions);
        localStorage.setItem(userKey('last_reset'), currentMonth);
        lastDeletedTransaction = null;
    }
}

// ===== Recurring Transactions =====
function applyRecurringTransactions() {
    const recurring = currentSettings.recurringTxns || [];
    if (recurring.length === 0) return;

    const currentMonth = getCurrentMonthKey();
    const appliedKey = userKey('recurring_applied');
    const applied = JSON.parse(localStorage.getItem(appliedKey) || '{}');
    let added = 0;

    recurring.forEach(rec => {
        if (!rec.active) return;
        const applyId = currentMonth + '_' + rec.id;
        if (applied[applyId]) return;

        const day = String(rec.day).padStart(2, '0');
        const dateStr = currentMonth + '-' + day;

        const transaction = {
            id: Date.now().toString() + '_' + rec.id,
            type: rec.type,
            amount: rec.amount,
            currency: 'EUR',
            amountEUR: rec.amount,
            category: rec.category,
            date: dateStr,
            description: rec.description || rec.category,
            recurring: true
        };

        transactions.unshift(transaction);
        applied[applyId] = true;
        added++;
    });

    if (added > 0) {
        saveTransactions(transactions);
        localStorage.setItem(appliedKey, JSON.stringify(applied));
    }
}

// ===== Init App =====
function initApp() {
    checkMonthlyReset();
    applyRecurringTransactions();
    renderTodayDate();
    dateInput.value = new Date().toISOString().split('T')[0];
    renderRecurringList();
    render();
}

// ===== Format =====
function formatCurrency(amount, currency) {
    const cur = currency || 'EUR';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur }).format(amount);
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function formatMonthLabel(monthKey) {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
}

// ===== Add Transaction =====
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const currency = currencySelect.value;
    const rawAmount = parseFloat(amountInput.value);
    const amountEUR = convertToEUR(rawAmount, currency);

    const transaction = {
        id: Date.now().toString(),
        type: typeSelect.value,
        amount: rawAmount,
        currency: currency,
        amountEUR: amountEUR,
        category: categorySelect.value,
        date: dateInput.value,
        description: descriptionInput.value.trim() || categorySelect.value,
    };

    const txMonth = getMonthKeyFromDate(transaction.date);
    const currentMonth = getCurrentMonthKey();

    if (txMonth < currentMonth) {
        addTransactionToArchive(txMonth, transaction);
        showToast('Transaction ajoutee dans l\'archive de ' + formatMonthLabel(txMonth), 'archive');
    } else {
        transactions.unshift(transaction);
        lastDeletedTransaction = null;
        saveTransactions(transactions);
        render();
    }

    amountInput.value = '';
    categorySelect.value = '';
    descriptionInput.value = '';
    currencySelect.value = 'EUR';
    amountInput.focus();
});

// ===== Undo =====
btnUndo.addEventListener('click', () => {
    if (transactions.length === 0) return;
    lastDeletedTransaction = transactions.shift();
    saveTransactions(transactions);
    render();
});

// ===== Reset All =====
btnReset.addEventListener('click', () => {
    if (transactions.length === 0) return;
    if (!confirm('Voulez-vous vraiment remettre les compteurs a zero ?\nLes donnees seront archivees automatiquement.')) return;
    const monthKey = getCurrentMonthKey();
    archiveMonth(monthKey, transactions);
    transactions = [];
    lastDeletedTransaction = null;
    saveTransactions(transactions);
    render();
    renderArchivesList();
    showToast('Compteurs remis a zero. Donnees archivees.', 'archive');
});

// ===== Delete Transaction =====
function deleteTransaction(id) {
    const el = document.querySelector(`[data-id="${id}"]`);
    if (el) {
        el.style.transition = 'opacity 0.3s, transform 0.3s';
        el.style.opacity = '0';
        el.style.transform = 'translateX(30px)';
        setTimeout(() => {
            transactions = transactions.filter((t) => t.id !== id);
            saveTransactions(transactions);
            render();
        }, 250);
    } else {
        transactions = transactions.filter((t) => t.id !== id);
        saveTransactions(transactions);
        render();
    }
}

// ===== Compute Totals =====
function computeTotals() {
    return computeTotalsFrom(transactions);
}

// ===== Filter Transactions =====
function getFilteredTransactions() {
    let filtered = [...transactions];
    const searchTerm = filterSearch.value.trim().toLowerCase();
    const typeVal = filterType.value;
    const catVal = filterCategory.value;
    const fromVal = filterDateFrom.value;
    const toVal = filterDateTo.value;

    if (searchTerm) {
        filtered = filtered.filter(t =>
            t.description.toLowerCase().includes(searchTerm) ||
            t.category.toLowerCase().includes(searchTerm)
        );
    }
    if (typeVal) filtered = filtered.filter(t => t.type === typeVal);
    if (catVal) filtered = filtered.filter(t => t.category === catVal);
    if (fromVal) filtered = filtered.filter(t => t.date >= fromVal);
    if (toVal) filtered = filtered.filter(t => t.date <= toVal);

    return filtered;
}

function isFiltersActive() {
    return filterSearch.value || filterType.value || filterCategory.value || filterDateFrom.value || filterDateTo.value;
}

// Filter listeners
[filterSearch, filterType, filterCategory, filterDateFrom, filterDateTo].forEach(el => {
    el.addEventListener('input', renderTransactions);
});

btnClearFilters.addEventListener('click', () => {
    filterSearch.value = '';
    filterType.value = '';
    filterCategory.value = '';
    filterDateFrom.value = '';
    filterDateTo.value = '';
    renderTransactions();
});

// ===== Render Summary =====
function renderSummary() {
    const { income, expense, balance } = computeTotals();
    totalIncomeEl.textContent = formatCurrency(income);
    totalExpenseEl.textContent = formatCurrency(expense);
    balanceEl.textContent = formatCurrency(balance);
    balanceCard.classList.toggle('negative', balance < 0);
    const belowThreshold = balance <= BALANCE_THRESHOLD && transactions.length > 0;
    alertBanner.classList.toggle('hidden', !belowThreshold);
}

// ===== Render Transactions =====
function renderTransactions() {
    const filtered = getFilteredTransactions();
    const draggable = !isFiltersActive();

    const items = filtered.map((t, idx) => {
        const icon = categoryIcons[t.category] || '\u{1F4CC}';
        const sign = t.type === 'income' ? '+' : '-';
        const showCurrency = t.currency && t.currency !== 'EUR';
        const amountDisplay = showCurrency
            ? `${sign}${formatCurrency(t.amountEUR || t.amount)}<span class="transaction-currency-sub">${formatCurrency(t.amount, t.currency)}</span>`
            : `${sign}${formatCurrency(t.amountEUR || t.amount)}`;

        return `
            <div class="transaction-item" data-id="${t.id}" data-index="${idx}" ${draggable ? 'draggable="true"' : ''}>
                ${draggable ? '<div class="drag-handle">&#x2630;</div>' : ''}
                <div class="transaction-icon ${t.type}">${icon}</div>
                <div class="transaction-info">
                    <div class="transaction-desc">${escapeHtml(t.description)}${t.recurring ? ' <span style="color:var(--accent);font-size:0.7rem">&#x21BB;</span>' : ''}</div>
                    <div class="transaction-meta">${t.category} &middot; ${formatDate(t.date)}</div>
                </div>
                <div class="transaction-amount ${t.type}">${amountDisplay}</div>
                <button class="btn-delete" onclick="deleteTransaction('${t.id}')" title="Supprimer" aria-label="Supprimer">&#x2715;</button>
            </div>
        `;
    });

    if (items.length === 0) {
        emptyState.classList.remove('hidden');
        transactionList.innerHTML = '';
        transactionList.appendChild(emptyState);
    } else {
        emptyState.classList.add('hidden');
        transactionList.innerHTML = items.join('');
    }
}

// ===== Drag and Drop =====
let dragSrcIndex = null;

transactionList.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.transaction-item');
    if (!item) return;
    dragSrcIndex = parseInt(item.dataset.index);
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragSrcIndex.toString());
});

transactionList.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const item = e.target.closest('.transaction-item');
    if (item) {
        transactionList.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        item.classList.add('drag-over');
    }
});

transactionList.addEventListener('dragleave', (e) => {
    const item = e.target.closest('.transaction-item');
    if (item) item.classList.remove('drag-over');
});

transactionList.addEventListener('drop', (e) => {
    e.preventDefault();
    const item = e.target.closest('.transaction-item');
    if (!item) return;
    const destIndex = parseInt(item.dataset.index);
    if (dragSrcIndex === null || dragSrcIndex === destIndex) return;

    const [moved] = transactions.splice(dragSrcIndex, 1);
    transactions.splice(destIndex, 0, moved);
    saveTransactions(transactions);
    render();
});

transactionList.addEventListener('dragend', () => {
    dragSrcIndex = null;
    transactionList.querySelectorAll('.dragging, .drag-over').forEach(el => {
        el.classList.remove('dragging', 'drag-over');
    });
});

// ===== Find Overspent Categories =====
function findOverspentCategories() {
    const sorted = [...transactions].reverse();
    let runningBalance = 0;
    const cats = new Set();
    for (const t of sorted) {
        runningBalance += t.type === 'income' ? (t.amountEUR || t.amount) : -(t.amountEUR || t.amount);
        if (t.type === 'expense' && runningBalance <= BALANCE_THRESHOLD) cats.add(t.category);
    }
    return cats;
}

// ===== Render Chart =====
function renderChart() {
    const expenses = transactions.filter((t) => t.type === 'expense');
    if (expenses.length === 0) {
        chartEmpty.classList.remove('hidden');
        chartCanvas.classList.add('hidden');
        if (expenseChart) { expenseChart.destroy(); expenseChart = null; }
        return;
    }
    chartEmpty.classList.add('hidden');
    chartCanvas.classList.remove('hidden');

    const grouped = {};
    expenses.forEach((t) => { grouped[t.category] = (grouped[t.category] || 0) + (t.amountEUR || t.amount); });
    const labels = Object.keys(grouped);
    const data = Object.values(grouped);

    const { balance } = computeTotals();
    const overspent = balance <= BALANCE_THRESHOLD && transactions.length > 0 ? findOverspentCategories() : new Set();
    const colors = labels.map((l, i) => overspent.has(l) ? '#dc2626' : chartColors[i % chartColors.length]);

    if (expenseChart) {
        expenseChart.data.labels = labels;
        expenseChart.data.datasets[0].data = data;
        expenseChart.data.datasets[0].backgroundColor = colors;
        expenseChart.update();
    } else {
        expenseChart = new Chart(chartCanvas, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
            options: {
                responsive: true, cutout: '65%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: getThemeColor(), padding: 16, font: { size: 13 } } },
                    tooltip: { callbacks: { label: (ctx) => {
                        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        return ` ${ctx.label}: ${formatCurrency(ctx.parsed)} (${((ctx.parsed / total) * 100).toFixed(1)}%)`;
                    } } },
                },
            },
        });
    }
}

// ===== Render Evolution Chart =====
function renderEvolutionChart() {
    const canvas = document.getElementById('evolution-chart');
    const empty = document.getElementById('evolution-empty');
    const section = document.getElementById('evolution-section');
    const archives = loadArchives();

    if (archives.length === 0) {
        if (evolutionChart) { evolutionChart.destroy(); evolutionChart = null; }
        section.style.display = 'none';
        return;
    }

    section.style.display = '';
    empty.classList.add('hidden');
    canvas.classList.remove('hidden');

    const sorted = [...archives].sort((a, b) => a.month.localeCompare(b.month));
    const { balance } = computeTotals();

    const labels = sorted.map(a => formatMonthLabel(a.month));
    const balances = sorted.map(a => a.balance);
    labels.push(formatMonthLabel(getCurrentMonthKey()));
    balances.push(balance);

    const themeColor = getThemeColor();
    const gridColor = getThemeGridColor();

    if (evolutionChart) {
        evolutionChart.data.labels = labels;
        evolutionChart.data.datasets[0].data = balances;
        evolutionChart.options.scales.x.ticks.color = themeColor;
        evolutionChart.options.scales.y.ticks.color = themeColor;
        evolutionChart.options.scales.y.grid.color = gridColor;
        evolutionChart.update();
    } else {
        evolutionChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Solde',
                    data: balances,
                    borderColor: '#818cf8',
                    backgroundColor: 'rgba(129, 140, 248, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 5,
                    pointBackgroundColor: '#818cf8',
                    pointBorderWidth: 2,
                    pointBorderColor: getTheme() === 'light' ? '#ffffff' : '#1a1d27'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        ticks: { color: themeColor, callback: v => formatCurrency(v) },
                        grid: { color: gridColor }
                    },
                    x: {
                        ticks: { color: themeColor, maxRotation: 45 },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => 'Solde: ' + formatCurrency(ctx.parsed.y) } }
                }
            }
        });
    }
}

// ===== Render Comparison Chart =====
function renderComparisonChart() {
    const canvas = document.getElementById('comparison-chart');
    const empty = document.getElementById('comparison-empty');
    const section = document.getElementById('comparison-section');
    const archives = loadArchives();

    if (archives.length === 0) {
        if (comparisonChart) { comparisonChart.destroy(); comparisonChart = null; }
        section.style.display = 'none';
        return;
    }

    section.style.display = '';
    empty.classList.add('hidden');
    canvas.classList.remove('hidden');

    const sorted = [...archives].sort((a, b) => a.month.localeCompare(b.month));
    const { income, expense } = computeTotals();

    const labels = sorted.map(a => formatMonthLabel(a.month));
    labels.push(formatMonthLabel(getCurrentMonthKey()));

    const incomes = sorted.map(a => a.income);
    incomes.push(income);

    const expenses = sorted.map(a => a.expense);
    expenses.push(expense);

    const themeColor = getThemeColor();
    const gridColor = getThemeGridColor();

    if (comparisonChart) {
        comparisonChart.data.labels = labels;
        comparisonChart.data.datasets[0].data = incomes;
        comparisonChart.data.datasets[1].data = expenses;
        comparisonChart.options.scales.x.ticks.color = themeColor;
        comparisonChart.options.scales.y.ticks.color = themeColor;
        comparisonChart.options.scales.y.grid.color = gridColor;
        comparisonChart.options.plugins.legend.labels.color = themeColor;
        comparisonChart.update();
    } else {
        comparisonChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Revenus', data: incomes, backgroundColor: 'rgba(52, 211, 153, 0.7)', borderRadius: 6 },
                    { label: 'Depenses', data: expenses, backgroundColor: 'rgba(248, 113, 113, 0.7)', borderRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: themeColor, callback: v => formatCurrency(v) },
                        grid: { color: gridColor }
                    },
                    x: {
                        ticks: { color: themeColor },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { position: 'top', labels: { color: themeColor, padding: 16 } },
                    tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + formatCurrency(ctx.parsed.y) } }
                }
            }
        });
    }
}

// ===== Render Advice =====
function renderAdvice() {
    const { income, expense, balance } = computeTotals();
    const expenses = transactions.filter((t) => t.type === 'expense');
    if (expenses.length === 0 || transactions.length === 0) { adviceSection.classList.add('hidden'); return; }
    adviceSection.classList.remove('hidden');

    const grouped = {};
    expenses.forEach((t) => { grouped[t.category] = (grouped[t.category] || 0) + (t.amountEUR || t.amount); });
    const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);

    const belowThreshold = balance <= BALANCE_THRESHOLD;
    const savingsRate = income > 0 ? ((income - expense) / income * 100) : 0;
    const warningCount = sorted.filter(([cat, amt]) => {
        const adv = categoryAdvice[cat];
        return adv && (amt / expense * 100) > (adv.target * 100);
    }).length;

    let html = '';
    if (belowThreshold) {
        const deficit = BALANCE_THRESHOLD - balance;
        html += `<div class="advice-summary advice-summary-warning"><div class="advice-summary-icon">\u26A0</div><div><div class="advice-summary-label">Solde en dessous du seuil de ${formatCurrency(BALANCE_THRESHOLD)}</div><div class="advice-summary-amount">${formatCurrency(deficit)} a economiser</div></div></div>`;
    } else if (warningCount > 0) {
        html += `<div class="advice-summary advice-summary-mixed"><div class="advice-summary-icon">\u{1F4CA}</div><div><div class="advice-summary-label">${warningCount} poste${warningCount > 1 ? 's' : ''} au-dessus du budget ideal</div><div class="advice-summary-detail">Solde : ${formatCurrency(balance)} | Taux d'epargne : ${savingsRate.toFixed(0)}%</div></div></div>`;
    } else {
        html += `<div class="advice-summary advice-summary-good"><div class="advice-summary-icon">\u2705</div><div><div class="advice-summary-label">Toutes vos depenses sont bien maitrisees !</div><div class="advice-summary-detail">Solde : ${formatCurrency(balance)} | Taux d'epargne : ${savingsRate.toFixed(0)}%</div></div></div>`;
    }

    sorted.forEach(([category, amount]) => {
        const pct = ((amount / expense) * 100).toFixed(1);
        const icon = categoryIcons[category] || '\u{1F4CC}';
        const adv = categoryAdvice[category];
        const idealPct = adv ? (adv.target * 100) : null;
        const tip = adv ? adv.tip : 'Surveillez cette categorie et fixez-vous un plafond mensuel.';
        const isWarning = idealPct !== null && parseFloat(pct) > idealPct;
        let analysis = '';
        if (isWarning) {
            analysis = `<strong>${pct}%</strong> de vos depenses (ideal : ~${idealPct}%).`;
            if (income > 0 && adv) analysis += ` Budget suggere : <strong>${formatCurrency(income * adv.target)}/mois</strong>.`;
        } else {
            analysis = `<strong>${pct}%</strong> de vos depenses. Poste maitrise.`;
        }
        html += `<div class="advice-card ${isWarning ? '' : 'tip'}"><div class="advice-card-icon">${icon}</div><div class="advice-card-body"><div class="advice-card-title">${escapeHtml(category)} <span class="category-tag">${formatCurrency(amount)}</span></div><div class="advice-card-text">${analysis}<br>${tip}</div></div></div>`;
    });

    adviceContent.innerHTML = html;
}

// ===== Render Savings Goal =====
function renderSavingsGoal() {
    const goal = currentSettings.savingsGoal || 0;
    const progressEl = document.getElementById('savings-progress');

    if (goal <= 0) {
        progressEl.style.display = 'none';
        return;
    }
    progressEl.style.display = 'flex';

    const { income, expense } = computeTotals();
    const saved = Math.max(0, income - expense);
    const pct = Math.min(100, (saved / goal) * 100);

    const bar = document.getElementById('savings-bar');
    bar.style.width = pct + '%';
    bar.classList.toggle('complete', pct >= 100);

    document.getElementById('savings-current').textContent = formatCurrency(saved);
    document.getElementById('savings-target').textContent = formatCurrency(goal);
    document.getElementById('savings-pct').textContent = Math.round(pct) + '%';
}

// Savings goal events
document.getElementById('btn-edit-goal').addEventListener('click', () => {
    const setup = document.getElementById('savings-setup');
    setup.classList.toggle('hidden');
    if (!setup.classList.contains('hidden')) {
        document.getElementById('savings-goal-input').value = currentSettings.savingsGoal || '';
        document.getElementById('savings-goal-input').focus();
    }
});

document.getElementById('btn-save-goal').addEventListener('click', () => {
    const val = parseFloat(document.getElementById('savings-goal-input').value) || 0;
    currentSettings.savingsGoal = val;
    saveSettings(currentSettings);
    document.getElementById('savings-setup').classList.add('hidden');
    renderSavingsGoal();
    showToast('Objectif d\'epargne enregistre');
});

// ===== Render Annual Stats =====
function renderAnnualStats() {
    const archives = loadArchives();
    const section = document.getElementById('annual-section');
    const yearSelect = document.getElementById('annual-year-select');
    const grid = document.getElementById('annual-grid');

    if (archives.length === 0) {
        section.style.display = 'none';
        return;
    }
    section.style.display = '';

    const years = new Set();
    archives.forEach(a => years.add(a.month.substring(0, 4)));
    years.add(getCurrentMonthKey().substring(0, 4));
    const sortedYears = [...years].sort().reverse();

    const currentSelection = yearSelect.value || sortedYears[0];
    yearSelect.innerHTML = sortedYears.map(y =>
        `<option value="${y}" ${y === currentSelection ? 'selected' : ''}>${y}</option>`
    ).join('');

    const selectedYear = yearSelect.value;
    const yearArchives = archives.filter(a => a.month.startsWith(selectedYear));
    const { income: curIncome, expense: curExpense, balance: curBalance } = computeTotals();
    const currentMonth = getCurrentMonthKey();
    const isCurrentYear = currentMonth.startsWith(selectedYear);

    let totalIncome = yearArchives.reduce((s, a) => s + a.income, 0);
    let totalExpense = yearArchives.reduce((s, a) => s + a.expense, 0);
    let monthCount = yearArchives.length;

    if (isCurrentYear) {
        totalIncome += curIncome;
        totalExpense += curExpense;
        monthCount += 1;
    }

    const totalBalance = totalIncome - totalExpense;
    const avgIncome = monthCount > 0 ? totalIncome / monthCount : 0;
    const avgExpense = monthCount > 0 ? totalExpense / monthCount : 0;

    const allMonths = yearArchives.map(a => ({ label: formatMonthLabel(a.month), balance: a.balance }));
    if (isCurrentYear) allMonths.push({ label: formatMonthLabel(currentMonth), balance: curBalance });

    const bestMonth = allMonths.length > 0 ? allMonths.reduce((best, m) => m.balance > best.balance ? m : best) : null;
    const worstMonth = allMonths.length > 0 ? allMonths.reduce((worst, m) => m.balance < worst.balance ? m : worst) : null;

    const savingsRate = totalIncome > 0 ? ((totalBalance / totalIncome) * 100).toFixed(1) : '0.0';

    grid.innerHTML = `
        <div class="annual-stat"><div class="annual-stat-label">Total revenus</div><div class="annual-stat-value income">${formatCurrency(totalIncome)}</div></div>
        <div class="annual-stat"><div class="annual-stat-label">Total depenses</div><div class="annual-stat-value expense">${formatCurrency(totalExpense)}</div></div>
        <div class="annual-stat"><div class="annual-stat-label">Solde annuel</div><div class="annual-stat-value balance">${formatCurrency(totalBalance)}</div></div>
        <div class="annual-stat"><div class="annual-stat-label">Moy. revenus/mois</div><div class="annual-stat-value income">${formatCurrency(avgIncome)}</div></div>
        <div class="annual-stat"><div class="annual-stat-label">Moy. depenses/mois</div><div class="annual-stat-value expense">${formatCurrency(avgExpense)}</div></div>
        <div class="annual-stat"><div class="annual-stat-label">Taux d'epargne</div><div class="annual-stat-value neutral">${savingsRate}%</div></div>
        <div class="annual-stat"><div class="annual-stat-label">Meilleur mois</div><div class="annual-stat-value income">${bestMonth ? escapeHtml(bestMonth.label) : '-'}</div><div class="annual-stat-sub">${bestMonth ? formatCurrency(bestMonth.balance) : ''}</div></div>
        <div class="annual-stat"><div class="annual-stat-label">Pire mois</div><div class="annual-stat-value expense">${worstMonth ? escapeHtml(worstMonth.label) : '-'}</div><div class="annual-stat-sub">${worstMonth ? formatCurrency(worstMonth.balance) : ''}</div></div>
        <div class="annual-stat"><div class="annual-stat-label">Nb de mois</div><div class="annual-stat-value neutral">${monthCount}</div></div>
    `;
}

document.getElementById('annual-year-select').addEventListener('change', renderAnnualStats);

// ===== Escape HTML =====
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===== Export CSV =====
function escapeCSV(str) {
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function exportCSV(txs, filename) {
    const BOM = '\uFEFF';
    const header = 'Date;Type;Categorie;Description;Montant;Devise;Montant EUR\n';
    const rows = txs.map(t => {
        const sign = t.type === 'income' ? '' : '-';
        const cur = t.currency || 'EUR';
        const amtEUR = (t.amountEUR || t.amount).toFixed(2).replace('.', ',');
        return `${t.date};${t.type === 'income' ? 'Revenu' : 'Depense'};${escapeCSV(t.category)};${escapeCSV(t.description)};${sign}${t.amount.toFixed(2).replace('.', ',')};${cur};${sign}${amtEUR}`;
    }).join('\n');

    const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename + '.csv');
    showToast('Export CSV telecharge');
}

function exportPDF(txs, title) {
    const { income, expense, balance } = computeTotalsFrom(txs);
    const printWindow = window.open('', '_blank');
    if (!printWindow) { showToast('Popup bloquee par le navigateur'); return; }

    const rows = txs.map(t => {
        const sign = t.type === 'income' ? '+' : '-';
        const cur = t.currency || 'EUR';
        const displayAmt = cur !== 'EUR' ? `${sign}${t.amount.toFixed(2)} ${cur} (${(t.amountEUR || t.amount).toFixed(2)} EUR)` : `${sign}${t.amount.toFixed(2)} EUR`;
        return `<tr><td>${formatDate(t.date)}</td><td>${t.type === 'income' ? 'Revenu' : 'Depense'}</td><td>${escapeHtml(t.category)}</td><td>${escapeHtml(t.description)}</td><td style="text-align:right;color:${t.type === 'income' ? '#059669' : '#dc2626'}">${displayAmt}</td></tr>`;
    }).join('');

    printWindow.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title>
    <style>body{font-family:'Segoe UI',sans-serif;padding:2rem;color:#1f2937}h1{font-size:1.5rem;margin-bottom:.5rem}.summary{display:flex;gap:2rem;margin:1rem 0;flex-wrap:wrap}.summary div{padding:.5rem 1rem;border:1px solid #d1d5db;border-radius:8px}table{width:100%;border-collapse:collapse;margin-top:1rem}th,td{padding:.5rem;border-bottom:1px solid #d1d5db;text-align:left;font-size:.9rem}th{background:#f3f4f6;font-weight:600}@media print{body{padding:0}}</style></head><body>
    <h1>BudgetFlow - ${escapeHtml(title)}</h1>
    <div class="summary"><div>Revenus: ${income.toFixed(2)} EUR</div><div>Depenses: ${expense.toFixed(2)} EUR</div><div>Solde: ${balance.toFixed(2)} EUR</div></div>
    <table><thead><tr><th>Date</th><th>Type</th><th>Categorie</th><th>Description</th><th>Montant</th></tr></thead><tbody>${rows}</tbody></table>
    </body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
}

// Export buttons
document.getElementById('btn-export-csv').addEventListener('click', () => {
    if (transactions.length === 0) { showToast('Aucune transaction a exporter'); return; }
    const monthLabel = formatMonthLabel(getCurrentMonthKey()).replace(/\s/g, '-');
    exportCSV(transactions, 'budgetflow-' + monthLabel);
});

document.getElementById('btn-export-pdf').addEventListener('click', () => {
    if (transactions.length === 0) { showToast('Aucune transaction a exporter'); return; }
    exportPDF(transactions, 'Rapport ' + formatMonthLabel(getCurrentMonthKey()));
});

// ===== Recurring Transactions UI =====
function renderRecurringList() {
    const list = document.getElementById('recurring-list');
    const empty = document.getElementById('recurring-empty');
    const recurring = currentSettings.recurringTxns || [];

    if (recurring.length === 0) {
        list.innerHTML = '';
        list.appendChild(empty);
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    list.innerHTML = recurring.map((rec, idx) => {
        const icon = categoryIcons[rec.category] || '\u{1F4CC}';
        const sign = rec.type === 'income' ? '+' : '-';
        const activeClass = rec.active ? '' : ' inactive';
        const toggleIcon = rec.active ? '\u23F8' : '\u25B6';
        const toggleTitle = rec.active ? 'Desactiver' : 'Activer';
        return `<div class="recurring-item${activeClass}">
            <div class="transaction-icon ${rec.type}">${icon}</div>
            <div class="recurring-item-info">
                <div class="recurring-item-desc">${escapeHtml(rec.description || rec.category)}</div>
                <div class="recurring-item-meta">${rec.category} &middot; Jour ${rec.day} du mois</div>
            </div>
            <div class="recurring-item-amount ${rec.type}">${sign}${formatCurrency(rec.amount)}</div>
            <div class="recurring-item-actions">
                <button class="btn-toggle-recurring" onclick="toggleRecurring(${idx})" title="${toggleTitle}">${toggleIcon}</button>
                <button class="btn-delete-recurring" onclick="deleteRecurring(${idx})" title="Supprimer">&#x2715;</button>
            </div>
        </div>`;
    }).join('');
}

document.getElementById('btn-add-recurring').addEventListener('click', () => {
    document.getElementById('recurring-form').classList.remove('hidden');
});

document.getElementById('btn-cancel-recurring').addEventListener('click', () => {
    document.getElementById('recurring-form').classList.add('hidden');
});

document.getElementById('btn-save-recurring').addEventListener('click', () => {
    const amt = parseFloat(document.getElementById('rec-amount').value);
    if (!amt || amt <= 0) { showToast('Montant invalide'); return; }
    const cat = document.getElementById('rec-category').value;
    if (!cat) { showToast('Choisissez une categorie'); return; }

    const rec = {
        id: 'rec_' + Date.now(),
        type: document.getElementById('rec-type').value,
        amount: amt,
        category: cat,
        description: document.getElementById('rec-description').value.trim(),
        day: Math.min(28, Math.max(1, parseInt(document.getElementById('rec-day').value) || 1)),
        active: true
    };
    currentSettings.recurringTxns = currentSettings.recurringTxns || [];
    currentSettings.recurringTxns.push(rec);
    saveSettings(currentSettings);
    renderRecurringList();
    document.getElementById('recurring-form').classList.add('hidden');
    document.getElementById('rec-amount').value = '';
    document.getElementById('rec-description').value = '';
    showToast('Transaction recurrente ajoutee');
});

function toggleRecurring(idx) {
    currentSettings.recurringTxns[idx].active = !currentSettings.recurringTxns[idx].active;
    saveSettings(currentSettings);
    renderRecurringList();
}

function deleteRecurring(idx) {
    if (!confirm('Supprimer cette transaction recurrente ?')) return;
    currentSettings.recurringTxns.splice(idx, 1);
    saveSettings(currentSettings);
    renderRecurringList();
}

// ===== Currency Settings =====
function renderCurrencyRates() {
    const rates = getExchangeRates();
    const container = document.getElementById('currency-rates');
    const currencies = ['USD', 'GBP', 'CHF', 'CAD', 'JPY'];
    container.innerHTML = currencies.map(c => `
        <div class="currency-rate-item">
            <label>${c}</label>
            <input type="number" id="rate-${c}" step="0.01" value="${rates[c] || ''}" min="0">
        </div>
    `).join('');
}

document.getElementById('btn-save-rates').addEventListener('click', () => {
    const currencies = ['USD', 'GBP', 'CHF', 'CAD', 'JPY'];
    const rates = {};
    currencies.forEach(c => {
        const val = parseFloat(document.getElementById('rate-' + c).value);
        if (val > 0) rates[c] = val;
    });
    currentSettings.currencies = { rates, lastUpdate: new Date().toISOString().split('T')[0] };
    saveSettings(currentSettings);
    document.getElementById('currency-overlay').classList.add('hidden');
    showToast('Taux de change enregistres');
});

document.getElementById('btn-close-currency').addEventListener('click', () => {
    document.getElementById('currency-overlay').classList.add('hidden');
});

// ===== Archives UI =====
btnToggleArchives.addEventListener('click', () => {
    const isHidden = archivesBody.classList.toggle('hidden');
    btnToggleArchives.textContent = isHidden ? 'Voir les archives' : 'Masquer les archives';
    if (!isHidden) renderArchivesList();
});

function renderArchivesList() {
    const archives = loadArchives();
    archiveDetail.classList.add('hidden');
    archivesList.classList.remove('hidden');

    if (archives.length === 0) {
        archivesList.innerHTML = '<p class="empty-state">Aucune archive disponible</p>';
        return;
    }

    archivesList.innerHTML = archives.map((a, idx) => {
        const label = formatMonthLabel(a.month);
        const balClass = a.balance >= 0 ? 'positive' : 'negative';
        const txCount = a.transactions.length;
        return `
            <div class="archive-month-item" onclick="openArchiveDetail(${idx})">
                <div class="archive-month-info">
                    <div class="archive-month-name">${label}</div>
                    <div class="archive-month-stats">${txCount} transaction${txCount > 1 ? 's' : ''} &middot; ${formatCurrency(a.income)} revenus &middot; ${formatCurrency(a.expense)} depenses</div>
                </div>
                <div class="archive-month-balance ${balClass}">${formatCurrency(a.balance)}</div>
                <div class="archive-arrow">&#8250;</div>
            </div>
        `;
    }).join('');
}

function openArchiveDetail(idx) {
    const archives = loadArchives();
    const a = archives[idx];
    if (!a) return;

    archivesList.classList.add('hidden');
    archiveDetail.classList.remove('hidden');

    const label = formatMonthLabel(a.month);
    const balClass = a.balance >= 0 ? '' : ' negative';

    let html = `<h3 style="font-size:1.1rem;margin-bottom:0.75rem;text-transform:capitalize">${label}</h3>`;
    html += `<div class="archive-summary-grid">
        <div class="archive-stat"><div class="archive-stat-label">Revenus</div><div class="archive-stat-value income">${formatCurrency(a.income)}</div></div>
        <div class="archive-stat"><div class="archive-stat-label">Depenses</div><div class="archive-stat-value expense">${formatCurrency(a.expense)}</div></div>
        <div class="archive-stat"><div class="archive-stat-label">Solde</div><div class="archive-stat-value balance${balClass}">${formatCurrency(a.balance)}</div></div>
    </div>`;

    if (a.advice && a.advice.length > 0) {
        html += '<div class="archive-subtitle" style="color:var(--expense)">Conseils de ce mois</div>';
        a.advice.forEach((item) => {
            const icon = categoryIcons[item.category] || '\u{1F4CC}';
            let analysis = item.isWarning
                ? `<strong>${item.pct}%</strong> des depenses (ideal : ~${item.idealPct}%).` + (item.suggestedMax ? ` Budget suggere : <strong>${formatCurrency(item.suggestedMax)}/mois</strong>.` : '')
                : `<strong>${item.pct}%</strong> des depenses. Poste maitrise.`;
            html += `<div class="advice-card ${item.isWarning ? '' : 'tip'}" style="margin-top:0.4rem"><div class="advice-card-icon">${icon}</div><div class="advice-card-body"><div class="advice-card-title">${escapeHtml(item.category)} <span class="category-tag">${formatCurrency(item.amount)}</span></div><div class="advice-card-text">${analysis}<br>${item.tip}</div></div></div>`;
        });
    }

    html += '<div class="archive-subtitle">Transactions</div>';
    (a.transactions || []).forEach((t) => {
        const icon = categoryIcons[t.category] || '\u{1F4CC}';
        const sign = t.type === 'income' ? '+' : '-';
        html += `<div class="archive-transaction-item"><div class="archive-transaction-icon">${icon}</div><div class="archive-transaction-info"><div class="archive-transaction-desc">${escapeHtml(t.description)}</div><div class="archive-transaction-meta">${t.category} &middot; ${formatDate(t.date)}</div></div><div class="archive-transaction-amount ${t.type}">${sign}${formatCurrency(t.amountEUR || t.amount)}</div></div>`;
    });

    // Export + delete buttons
    html += `<div class="archive-export-buttons">
        <button class="btn-export" onclick="exportCSV(loadArchives()[${idx}].transactions, 'archive-${a.month}')">&#128196; CSV</button>
        <button class="btn-export" onclick="exportPDF(loadArchives()[${idx}].transactions, 'Archive ${escapeHtml(label)}')">&#128424; PDF</button>
    </div>`;
    html += `<button class="btn-delete-archive" onclick="deleteArchive(${idx})">Supprimer cette archive</button>`;
    archiveDetailContent.innerHTML = html;
}

btnBackArchives.addEventListener('click', () => {
    archiveDetail.classList.add('hidden');
    archivesList.classList.remove('hidden');
    renderArchivesList();
});

function deleteArchive(idx) {
    if (!confirm('Supprimer definitivement cette archive ?')) return;
    const archives = loadArchives();
    archives.splice(idx, 1);
    saveArchives(archives);
    archiveDetail.classList.add('hidden');
    archivesList.classList.remove('hidden');
    renderArchivesList();
}

// ===== Keyboard Shortcuts =====
const SHORTCUTS = [
    { key: 'n', alt: true, label: 'Nouvelle transaction', action: () => amountInput.focus() },
    { key: 'z', alt: true, label: 'Annuler derniere saisie', action: () => btnUndo.click() },
    { key: 'r', alt: true, label: 'Remettre a zero', action: () => btnReset.click() },
    { key: 'a', alt: true, label: 'Afficher/masquer archives', action: () => btnToggleArchives.click() },
    { key: 't', alt: true, label: 'Changer de theme', action: () => toggleTheme() },
    { key: 'f', alt: true, label: 'Rechercher', action: () => filterSearch.focus() },
    { key: 'h', alt: true, label: 'Aide raccourcis', action: () => toggleShortcutsOverlay() },
    { key: 'e', alt: true, label: 'Taux de change', action: () => openCurrencyOverlay() },
    { key: 'Escape', alt: false, label: 'Fermer / Quitter champ', action: () => closeOverlays() },
];

function toggleShortcutsOverlay() {
    const overlay = document.getElementById('shortcuts-overlay');
    overlay.classList.toggle('hidden');
    if (!overlay.classList.contains('hidden')) {
        renderShortcutsList();
    }
}

function openCurrencyOverlay() {
    renderCurrencyRates();
    document.getElementById('currency-overlay').classList.remove('hidden');
}

function closeOverlays() {
    document.getElementById('shortcuts-overlay').classList.add('hidden');
    document.getElementById('currency-overlay').classList.add('hidden');
    if (document.activeElement) document.activeElement.blur();
}

function renderShortcutsList() {
    const list = document.getElementById('shortcuts-list');
    list.innerHTML = SHORTCUTS.map(s => {
        const keyLabel = s.alt ? 'Alt + ' + s.key.toUpperCase() : s.key;
        return `<div class="shortcut-row"><span class="shortcut-desc">${s.label}</span><span class="shortcut-key">${keyLabel}</span></div>`;
    }).join('');
}

document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName;
    if ((tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') && e.key !== 'Escape') return;

    for (const s of SHORTCUTS) {
        if (e.key.toLowerCase() === s.key.toLowerCase() && e.altKey === s.alt) {
            e.preventDefault();
            s.action();
            return;
        }
    }
});

document.getElementById('btn-close-shortcuts').addEventListener('click', () => {
    document.getElementById('shortcuts-overlay').classList.add('hidden');
});

document.getElementById('btn-shortcuts-hint').addEventListener('click', toggleShortcutsOverlay);

// ===== Master Render =====
function render() {
    renderSummary();
    renderTransactions();
    renderChart();
    renderAdvice();
    renderSavingsGoal();
    renderEvolutionChart();
    renderComparisonChart();
    renderAnnualStats();
    btnUndo.disabled = transactions.length === 0;
    EventBus.emit('render', { transactions });
}

// ===== Auto-login (must be last) =====
(function checkSession() {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
        const users = getUsers();
        if (users[saved]) {
            openSession(saved);
            return;
        }
    }
    authOverlay.classList.remove('hidden');
    appContainer.classList.add('hidden');
})();
