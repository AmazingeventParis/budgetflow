# BudgetFlow - Guide Projet

## Description
Organisateur de budget personnel simple et moderne. Application web frontend uniquement (HTML/CSS/JS) avec persistance localStorage.

## Stack technique
- **HTML5** / **CSS3** (variables CSS, grilles, responsive)
- **JavaScript** vanilla (ES6+)
- **Chart.js 4.4.7** via CDN (graphique doughnut)
- **Aucun framework** / aucun bundler / aucun serveur requis

## Structure des fichiers
```
budgetflow/
├── index.html          (203 lignes) - Page unique (auth + app)
├── style.css           (1003 lignes) - Styles (theme sombre, responsive < 600px)
├── script.js           (643 lignes) - Toute la logique (auth, transactions, archives, conseils)
├── CLAUDE.md           - Ce fichier
└── project-select.md   - Etat actuel des fonctionnalites
```

## Architecture JS

### Organisation du fichier script.js
| Lignes | Section |
|---|---|
| 1-4 | Config (BALANCE_THRESHOLD, cles storage) |
| 6-25 | Auth helpers (getUsers, saveUsers, hashPassword, userKey) |
| 27-49 | Storage per-user (load/save transactions et archives) |
| 51-143 | Auth UI (tabs, login, register, logout, openSession) |
| 145-173 | Declarations DOM de l'app |
| 175-188 | Category icons + chart colors |
| 190-202 | Systeme de toast |
| 204-221 | Date du jour + cles mois (getCurrentMonthKey, getMonthKeyFromDate) |
| 223-300 | Archive helpers + reset mensuel auto |
| 302-308 | initApp() |
| 310-324 | Fonctions de formatage (currency, date, month label) |
| 326-358 | Ajout transaction (avec detection mois passe) |
| 360-392 | Undo, Reset, Delete |
| 394-487 | Render summary, transactions, chart |
| 489-522 | Render advice (conseils) |
| 524-529 | escapeHtml |
| 531-619 | Archives UI (toggle, liste, detail, suppression) |
| 621-628 | Master render |
| 630-643 | Auto-login IIFE (DOIT rester en dernier) |

### Authentification
- Comptes stockes dans `budgetflow_users` (username -> hash)
- Session dans `budgetflow_session`
- Chaque utilisateur a son propre namespace : `budgetflow_{username}_transactions`, `budgetflow_{username}_archives`, `budgetflow_{username}_last_reset`
- Hash simple (non cryptographique) : suffisant pour du localStorage

### Flux de donnees
```
Page load
  └─ checkSession() (IIFE, fin du fichier)
       ├─ Session trouvee -> openSession(username) -> initApp()
       └─ Pas de session -> affiche ecran auth

openSession(username)
  ├─ currentUser = username
  ├─ Charge transactions utilisateur
  ├─ Cache auth, affiche app
  └─ initApp()

initApp()
  ├─ checkMonthlyReset() -> archive si nouveau mois
  ├─ renderTodayDate() -> badge date en haut
  ├─ dateInput.value = aujourd'hui
  └─ render()

render()
  ├─ renderSummary() -> cartes revenus/depenses/solde + alerte
  ├─ renderTransactions() -> liste historique
  ├─ renderChart() -> doughnut Chart.js
  ├─ renderAdvice() -> conseils si solde <= 300
  └─ btnUndo.disabled = ...
```

### Detection des mois passes
- Quand on ajoute une transaction, on compare `getMonthKeyFromDate(date)` avec `getCurrentMonthKey()`
- Si mois passe (`txMonth < currentMonth`) : `addTransactionToArchive()` + toast jaune
- Si mois courant/futur : ajout normal dans `transactions`

### Reset automatique mensuel
- `checkMonthlyReset()` compare `last_reset` avec le mois courant
- Si different : archive le mois precedent puis vide les transactions

### Systeme de conseils
- Seuil : `BALANCE_THRESHOLD = 300`
- Quand solde <= 300 EUR : banniere rouge pulsante + panneau conseils
- Cibles par categorie : Alimentation 30%, Transport 10%, Logement 35%, Loisirs 10%, Sante 5%, Shopping 5%, Factures 10%, Autre 5%
- Conseils sauvegardes dans les archives pour consultation ulterieure

## Design tokens (variables CSS)
| Variable | Valeur | Usage |
|---|---|---|
| `--bg` | `#0f1117` | Fond de page |
| `--surface` | `#1a1d27` | Fond des cartes |
| `--surface-hover` | `#222632` | Hover des cartes |
| `--border` | `#2a2e3d` | Bordures |
| `--text` | `#e4e6f0` | Texte principal |
| `--text-muted` | `#8b8fa3` | Texte secondaire |
| `--income` | `#34d399` | Vert revenus |
| `--income-bg` | `rgba(52, 211, 153, 0.1)` | Fond vert clair |
| `--expense` | `#f87171` | Rouge depenses |
| `--expense-bg` | `rgba(248, 113, 113, 0.1)` | Fond rouge clair |
| `--accent` | `#818cf8` | Violet accent |
| `--accent-hover` | `#6366f1` | Violet hover |
| `--radius` | `12px` | Coins arrondis |

## IDs DOM complets

### Auth
`auth-overlay`, `tab-login`, `tab-register`, `login-form`, `login-username`, `login-password`, `login-error`, `register-form`, `reg-username`, `reg-password`, `reg-password2`, `register-error`

### App / Header
`app`, `user-avatar`, `user-name`, `btn-logout`, `today-date`

### Summary / Alerte
`total-income`, `total-expense`, `balance`, `alert-banner`, `toast`

### Formulaire
`transaction-form`, `type`, `amount`, `category`, `date`, `description`, `btn-undo`, `btn-reset`

### Affichage
`transaction-list`, `empty-state`, `expense-chart`, `chart-empty`, `advice-section`, `advice-content`

### Archives
`btn-toggle-archives`, `archives-body`, `archives-list`, `archives-empty`, `archive-detail`, `archive-detail-content`, `btn-back-archives`

## Cles localStorage
| Cle | Contenu |
|---|---|
| `budgetflow_users` | Objet { username: passwordHash } |
| `budgetflow_session` | Username connecte |
| `budgetflow_{user}_transactions` | Tableau des transactions du mois en cours |
| `budgetflow_{user}_archives` | Tableau des archives mensuelles |
| `budgetflow_{user}_last_reset` | Dernier mois de reset (YYYY-MM) |

## Conventions
- Pas d'accents dans le code JS (chaines simples ASCII)
- Format monnaie : `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })`
- Format date : `Intl.DateTimeFormat('fr-FR')`
- IDs DOM en kebab-case (`transaction-list`, `btn-undo`)
- Cle mois : format `YYYY-MM`
- Protection XSS via `escapeHtml()` sur toutes les chaines utilisateur

## Bugs corriges
- **Auto-login crash** : l'IIFE `checkSession()` etait placee avant les declarations DOM de l'app (`totalIncomeEl`, `dateInput`, etc.), causant un crash silencieux au rechargement. Corrige en deplacant l'auto-login a la toute fin de script.js (ligne 630+). Ne jamais deplacer cette IIFE plus haut dans le fichier.

## Pour tester
Ouvrir `index.html` directement dans un navigateur. Aucune installation requise.
