# BudgetFlow - Guide Projet

## Description
Organisateur de budget personnel moderne. Application web frontend uniquement (HTML/CSS/JS) avec persistance localStorage. Theme sombre/clair, PWA, multi-devises.

## Deploiement
- **GitHub** : https://github.com/AmazingeventParis/budgetflow
- **Live** : https://amazingeventparis.github.io/budgetflow/
- **Deploy** : GitHub Actions (push sur main -> GitHub Pages)

## Stack technique
- **HTML5** / **CSS3** (variables CSS, grilles, animations)
- **JavaScript** vanilla (ES6+)
- **Chart.js 4.4.7** via CDN (doughnut, line, bar)
- **PWA** : manifest.json + service worker (network-first)
- **Aucun framework** / aucun bundler / aucun serveur requis

## Structure des fichiers
```
budgetflow/
├── index.html          (513 lignes) - Page unique (auth + app + overlays)
├── style.css           (1946 lignes) - Theme sombre/clair, animations
├── script.js           (1659 lignes) - Toute la logique
├── sw.js               (47 lignes) - Service worker (network-first, cache v2)
├── manifest.json       (24 lignes) - PWA manifest
├── icons/
│   ├── icon-192.png    - Icone PWA 192x192
│   ├── icon-512.png    - Icone PWA 512x512
│   └── generate-icons.html - Generateur d'icones canvas
├── .github/workflows/
│   └── deploy.yml      - GitHub Actions deploy
├── CLAUDE.md           - Ce fichier
└── project-select.md   - Etat des fonctionnalites
```

## Architecture JS

### Organisation du fichier script.js
| Lignes | Section |
|---|---|
| 1-4 | Config (BALANCE_THRESHOLD, cles storage) |
| 6-12 | EventBus (pub/sub leger) |
| 14-17 | PWA Service Worker registration |
| 19-40 | Auth helpers (getUsers, saveUsers, hashPassword, userKey) |
| 42-59 | Storage per-user (load/save transactions, archives) |
| 61-78 | Settings per-user (loadSettings, saveSettings, currentSettings) |
| 80-85 | Chart variables (expenseChart, evolutionChart, comparisonChart) |
| 87-138 | Theme (getTheme, setTheme, toggleTheme, updateChartsTheme) |
| 140-247 | Auth UI (tabs, login, register, logout, openSession, password toggle) |
| 249-286 | Declarations DOM de l'app |
| 288-304 | Category icons (avec retrocompat anciennes categories) |
| 306-346 | Category colors (couleur unique par categorie pour le chart) |
| 349-361 | Systeme de toast |
| 363-380 | Date du jour + cles mois |
| 382-393 | Multi-devises (convertToEUR, getExchangeRates) |
| 395-479 | Archive helpers (computeTotalsFrom, categoryAdvice, generateAdviceData, archiveMonth) |
| 481-495 | Reset mensuel auto (checkMonthlyReset) |
| 497-536 | Transactions recurrentes (applyRecurringTransactions) |
| 538-547 | initApp() |
| 549-563 | Fonctions de formatage (currency, date, month label) |
| 566-603 | Ajout transaction (avec detection mois passe + multi-devises) |
| 605-644 | Undo, Reset, Delete |
| 646-690 | Compute totals + Filter transactions |
| 692-739 | Render summary + transactions |
| 740-786 | Drag and Drop |
| 787-840 | Find overspent + Render Chart (doughnut) |
| 843-917 | Render Evolution Chart (line) |
| 918-991 | Render Comparison Chart (bar) |
| 992-1039 | Render Advice (3 modes: warning/mixed/good) |
| 1040-1082 | Render Savings Goal |
| 1083-1148 | Render Annual Stats |
| 1149-1154 | escapeHtml |
| 1156-1221 | Export CSV + PDF |
| 1222-1302 | Recurring Transactions UI (CRUD) |
| 1303-1331 | Currency Settings overlay |
| 1333-1477 | Custom Categories (CRUD, icon picker, inject into selects) |
| 1478-1572 | Archives UI (toggle, liste, detail, export, suppression) |
| 1573-1631 | Keyboard shortcuts (overlay + listener) |
| 1633-1645 | Master render |
| 1647-1659 | Auto-login IIFE (DOIT rester en dernier) |

### Authentification
- Comptes stockes dans `budgetflow_users` (username -> hash)
- Session dans `budgetflow_session`
- Chaque utilisateur a son propre namespace : `budgetflow_{username}_transactions`, `budgetflow_{username}_archives`, `budgetflow_{username}_last_reset`, `budgetflow_{username}_settings`
- Hash simple (non cryptographique) : suffisant pour du localStorage
- Toggle visibilite mot de passe (icone oeil SVG) sur les 3 champs password

### Flux de donnees
```
Page load
  ├─ setTheme(getTheme()) -> applique theme sauvegarde
  └─ checkSession() (IIFE, fin du fichier)
       ├─ Session trouvee -> openSession(username) -> initApp()
       └─ Pas de session -> affiche ecran auth

openSession(username)
  ├─ currentUser = username
  ├─ Charge transactions + settings utilisateur
  ├─ Cache auth, affiche app
  └─ initApp()

initApp()
  ├─ checkMonthlyReset() -> archive si nouveau mois
  ├─ applyRecurringTransactions() -> ajoute recurrentes du mois
  ├─ injectCustomCategories() -> ajoute categories perso dans les selects
  ├─ renderTodayDate() -> badge date en haut
  ├─ dateInput.value = aujourd'hui
  ├─ renderRecurringList()
  └─ render()

render()
  ├─ renderSummary() -> cartes revenus/depenses/solde + alerte
  ├─ renderTransactions() -> liste filtrable avec drag&drop
  ├─ renderChart() -> doughnut Chart.js (couleurs uniques par categorie)
  ├─ renderAdvice() -> analyse des depenses (toujours visible)
  ├─ renderSavingsGoal() -> barre de progression epargne
  ├─ renderEvolutionChart() -> courbe du solde (archives)
  ├─ renderComparisonChart() -> barres revenus/depenses (archives)
  ├─ renderAnnualStats() -> grille stats annuelles
  ├─ btnUndo.disabled = ...
  └─ EventBus.emit('render')
```

### Systeme de conseils (Analyse des depenses)
- S'affiche des qu'il y a des depenses (pas seulement sous le seuil)
- 3 modes de resume :
  - **Vert** : toutes les depenses maitrisees + taux d'epargne
  - **Jaune** : N postes au-dessus du budget ideal
  - **Rouge** : solde en dessous du seuil de 300 EUR + montant a economiser
- Chaque categorie analysee individuellement (% reel vs ideal, conseil personnalise)
- Conseils sauvegardes dans les archives

### Categories de depenses (sous-categories)
| Groupe | Sous-categories | Budget ideal |
|---|---|---|
| Alimentation | Grosses courses, Courses quotidiennes | 20% + 10% |
| Transport | Essence, Transport en commun, Entretien vehicule | 5% + 3% + 2% |
| Logement | Loyer, Charges, Internet / Telephone | 25% + 5% + 5% |
| Loisirs | Sorties, Abonnements, Sport | 4% + 3% + 3% |
| Sante | Medecin, Pharmacie | 3% + 2% |
| Shopping | Vetements, Electronique, Cadeaux | 2% + 2% + 1% |
| Factures | Assurances, Impots | 3% + 2% |
| Autre | Autre depense | 5% |

- Chaque option a son icone emoji dans les selects
- Optgroups en rose fuchsia avec icone du groupe
- Categories custom par utilisateur (stockees dans settings)
- Retrocompat anciennes categories (Alimentation, Transport, etc.)

## Design tokens (variables CSS)

### Theme sombre (defaut)
| Variable | Valeur |
|---|---|
| `--bg` | `#0f1117` |
| `--surface` | `#1a1d27` |
| `--surface-hover` | `#222632` |
| `--border` | `#2a2e3d` |
| `--text` | `#e4e6f0` |
| `--text-muted` | `#8b8fa3` |
| `--income` | `#34d399` |
| `--expense` | `#f87171` |
| `--accent` | `#818cf8` |
| `--accent-hover` | `#6366f1` |

### Theme clair
| Variable | Valeur |
|---|---|
| `--bg` | `#f5f5f7` |
| `--surface` | `#ffffff` |
| `--text` | `#1f2937` |
| `--text-muted` | `#6b7280` |
| `--income` | `#059669` |
| `--expense` | `#dc2626` |
| `--accent` | `#6366f1` |

## IDs DOM complets

### Auth
`auth-overlay`, `tab-login`, `tab-register`, `login-form`, `login-username`, `login-password`, `login-error`, `register-form`, `reg-username`, `reg-password`, `reg-password2`, `register-error`, `btn-theme-auth`

### App / Header
`app`, `user-avatar`, `user-name`, `btn-logout`, `btn-theme`, `theme-icon`, `today-date`

### Summary / Alerte
`total-income`, `total-expense`, `balance`, `alert-banner`, `toast`

### Epargne
`savings-section`, `savings-setup`, `savings-goal-input`, `btn-edit-goal`, `btn-save-goal`, `savings-progress`, `savings-bar`, `savings-current`, `savings-target`, `savings-pct`

### Formulaire
`transaction-form`, `type`, `amount`, `currency`, `category`, `btn-add-category`, `date`, `description`, `btn-undo`, `btn-reset`

### Transactions recurrentes
`recurring-section`, `recurring-form`, `recurring-list`, `recurring-empty`, `rec-type`, `rec-amount`, `rec-category`, `rec-day`, `rec-description`, `btn-add-recurring`, `btn-save-recurring`, `btn-cancel-recurring`

### Affichage / Graphiques
`transaction-list`, `empty-state`, `expense-chart`, `chart-empty`, `evolution-section`, `evolution-chart`, `evolution-empty`, `comparison-section`, `comparison-chart`, `comparison-empty`, `advice-section`, `advice-content`

### Filtres / Export
`filter-bar`, `filter-search`, `filter-type`, `filter-category`, `filter-date-from`, `filter-date-to`, `btn-clear-filters`, `btn-export-csv`, `btn-export-pdf`

### Stats annuelles
`annual-section`, `annual-year-select`, `annual-grid`

### Archives
`btn-toggle-archives`, `archives-body`, `archives-list`, `archives-empty`, `archive-detail`, `archive-detail-content`, `btn-back-archives`

### Overlays
`shortcuts-overlay`, `shortcuts-list`, `btn-shortcuts-hint`, `btn-close-shortcuts`, `currency-overlay`, `currency-rates`, `btn-save-rates`, `btn-close-currency`, `custom-category-overlay`, `custom-cat-name`, `custom-cat-type`, `icon-picker`, `custom-category-list`, `btn-save-custom-cat`, `btn-cancel-custom-cat`

## Cles localStorage
| Cle | Contenu |
|---|---|
| `budgetflow_users` | Objet { username: passwordHash } |
| `budgetflow_session` | Username connecte |
| `budgetflow_theme` | 'dark' ou 'light' (globale) |
| `budgetflow_{user}_transactions` | Tableau des transactions du mois en cours |
| `budgetflow_{user}_archives` | Tableau des archives mensuelles |
| `budgetflow_{user}_last_reset` | Dernier mois de reset (YYYY-MM) |
| `budgetflow_{user}_settings` | Objet settings (savingsGoal, recurringTxns, currencies, customCategories) |
| `budgetflow_{user}_recurring_applied` | Objet { monthKey_id: true } pour eviter doublons recurrentes |

## Raccourcis clavier
| Raccourci | Action |
|---|---|
| Alt+N | Nouvelle transaction (focus montant) |
| Alt+Z | Annuler derniere saisie |
| Alt+R | Tout remettre a zero |
| Alt+A | Afficher/masquer archives |
| Alt+T | Changer de theme |
| Alt+F | Rechercher (focus filtre) |
| Alt+H | Aide raccourcis |
| Alt+E | Taux de change |
| Escape | Fermer overlays |

## Conventions
- Pas d'accents dans le code JS (chaines simples ASCII)
- Format monnaie : `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })`
- Format date : `Intl.DateTimeFormat('fr-FR')`
- IDs DOM en kebab-case (`transaction-list`, `btn-undo`)
- Cle mois : format `YYYY-MM`
- Protection XSS via `escapeHtml()` sur toutes les chaines utilisateur
- Meme layout desktop et mobile (pas de media query responsive)

## Bugs corriges
- **Auto-login crash** : l'IIFE `checkSession()` etait placee avant les declarations DOM. Corrige en la placant a la fin de script.js. Ne jamais la deplacer plus haut.
- **Temporal Dead Zone** : `setTheme()` appelait `updateChartsTheme()` qui referençait des variables `let` non encore declarees. Corrige en deplacant les declarations de chart avant le code theme.
- **Service Worker cache** : strategie cache-first empechait les mises a jour. Corrige en passant a network-first + version de cache incrementee.
- **Icone oeil emoji** : `&#128065;` ne s'affichait pas partout. Remplace par SVG inline.
- **Icones punaise** : anciennes categories (Alimentation, Transport, etc.) n'avaient plus d'icone apres le split en sous-categories. Corrige en ajoutant les anciens noms dans categoryIcons.

## Pour tester
Ouvrir `index.html` directement dans un navigateur. Aucune installation requise.
Pour tester la PWA : `npx serve` dans le dossier puis ouvrir localhost.
