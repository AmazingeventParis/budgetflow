# BudgetFlow - Etat actuel des fonctionnalites

## Deploiement
- **Repo** : https://github.com/AmazingeventParis/budgetflow
- **Site** : https://amazingeventparis.github.io/budgetflow/

## Fonctionnalites implementees

### Authentification
| Fonctionnalite | Statut |
|---|---|
| Ecran connexion / inscription | Done |
| Onglets Connexion / Inscription | Done |
| Validation username (3-20 chars) + mot de passe (min 4) | Done |
| Confirmation mot de passe a l'inscription | Done |
| Messages d'erreur (identifiant pris, mdp incorrect, mdp non identiques) | Done |
| Hash du mot de passe (non cryptographique) | Done |
| Session persistante (auto-login au rechargement) | Done |
| Deconnexion avec nettoyage des champs | Done |
| Avatar (premiere lettre du pseudo, cercle violet) | Done |
| Donnees isolees par utilisateur (namespace localStorage) | Done |
| Toggle visibilite mot de passe (icone oeil SVG) | Done |

### Transactions
| Fonctionnalite | Statut |
|---|---|
| Ajout transaction (type, montant, devise, categorie, date, description) | Done |
| Multi-devises (EUR, USD, GBP, CHF, CAD, JPY) avec conversion | Done |
| Champ date pre-rempli avec aujourd'hui | Done |
| Description optionnelle (defaut = nom de la categorie) | Done |
| Suppression individuelle (bouton x) | Done |
| Suppression animee (fadeOut + translateX) | Done |
| Bouton Annuler la derniere saisie (desactive si vide) | Done |
| Bouton Tout remettre a zero (confirmation + archivage auto) | Done |
| Detection mois passe -> envoi en archive automatiquement | Done |
| Toast de confirmation (violet standard, jaune pour archives) | Done |
| Drag & Drop pour reordonner les transactions | Done |

### Transactions recurrentes
| Fonctionnalite | Statut |
|---|---|
| Formulaire ajout (type, montant, categorie, jour du mois, description) | Done |
| Liste des recurrentes avec toggle actif/inactif | Done |
| Suppression individuelle | Done |
| Application automatique au chargement (1 fois par mois) | Done |

### Categories de depenses (sous-categories)
| Groupe | Sous-categories | Icones | Budget ideal |
|---|---|---|---|
| Alimentation | Grosses courses, Courses quotidiennes | 🛒 🥖 | 20% + 10% |
| Transport | Essence, Transport en commun, Entretien vehicule | ⛽ 🚌 🔧 | 5% + 3% + 2% |
| Logement | Loyer, Charges, Internet / Telephone | 🏠 💡 📱 | 25% + 5% + 5% |
| Loisirs | Sorties, Abonnements, Sport | 🍻 📺 🏋️ | 4% + 3% + 3% |
| Sante | Medecin, Pharmacie | 🏥 💊 | 3% + 2% |
| Shopping | Vetements, Electronique, Cadeaux | 👕 💻 🎁 | 2% + 2% + 1% |
| Factures | Assurances, Impots | 📋 🏛️ | 3% + 2% |
| Autre | Autre depense | 📦 | 5% |

| Fonctionnalite | Statut |
|---|---|
| Sous-categories detaillees par groupe de depenses | Done |
| Icone emoji sur chaque option dans les selects | Done |
| Optgroups en rose fuchsia avec icone du groupe | Done |
| Categories custom par utilisateur (creation + suppression) | Done |
| Icon picker (24 emojis) pour categories custom | Done |
| Injection dynamique des categories custom dans tous les selects | Done |
| Retrocompatibilite anciennes categories (Alimentation, Transport, etc.) | Done |

### Categories de revenus
| Categorie | Icone |
|---|---|
| Salaire | 💰 |
| Freelance | 💻 |
| Investissements | 📈 |
| Autre revenu | 💵 |

### Affichage
| Fonctionnalite | Statut |
|---|---|
| Date du jour en haut de page (badge arrondi sous le titre) | Done |
| Barre utilisateur (avatar + nom + bouton deconnexion) | Done |
| Carte total revenus (vert) | Done |
| Carte total depenses (rouge) | Done |
| Carte solde (violet, rouge si negatif) | Done |
| Historique des transactions avec icones emoji par categorie | Done |
| Message "Aucune transaction" quand liste vide | Done |
| Meme layout desktop et mobile (pas de breakpoint responsive) | Done |

### Graphiques
| Fonctionnalite | Statut |
|---|---|
| Doughnut Chart.js des depenses par categorie | Done |
| Couleur unique et distincte par categorie (jamais 2 similaires cote a cote) | Done |
| Passage en rouge des categories ayant cause le depassement du seuil | Done |
| Legende en bas avec pourcentages dans les tooltips | Done |
| Message "Aucune depense enregistree" quand vide | Done |
| Graphique evolution du solde (line, archives + mois courant) | Done |
| Graphique comparaison mensuelle (bar, revenus vs depenses) | Done |

### Analyse des depenses (conseils)
| Fonctionnalite | Statut |
|---|---|
| Toujours visible des qu'il y a des depenses | Done |
| Resume vert : toutes depenses maitrisees + taux epargne | Done |
| Resume jaune : N postes au-dessus du budget ideal | Done |
| Resume rouge : solde sous seuil 300 EUR + montant a economiser | Done |
| Analyse individuelle par categorie (% reel vs ideal) | Done |
| Conseil personnalise par sous-categorie | Done |
| Budget suggere base sur les revenus | Done |
| Code couleur : bordure rouge = exces, bordure violette = maitrise | Done |
| Conseils sauvegardes dans les archives | Done |

### Objectif d'epargne
| Fonctionnalite | Statut |
|---|---|
| Formulaire pour definir un objectif mensuel | Done |
| Barre de progression (epargne = revenus - depenses) | Done |
| Animation pulse quand objectif atteint (100%) | Done |
| Objectif sauvegarde dans les settings utilisateur | Done |

### Filtres et recherche
| Fonctionnalite | Statut |
|---|---|
| Recherche texte dans descriptions | Done |
| Filtre par type (revenus/depenses) | Done |
| Filtre par categorie (toutes les sous-categories) | Done |
| Filtre par plage de dates (debut/fin) | Done |
| Bouton "Effacer" pour reinitialiser les filtres | Done |
| Filtrage en temps reel | Done |

### Export
| Fonctionnalite | Statut |
|---|---|
| Export CSV (BOM UTF-8, separateur ;, montants avec virgule) | Done |
| Export PDF (fenetre print avec tableau HTML stylise) | Done |
| Export disponible aussi depuis les archives | Done |

### Statistiques annuelles
| Fonctionnalite | Statut |
|---|---|
| Selecteur d'annee dynamique | Done |
| Total revenus / depenses / solde annuel | Done |
| Moyennes mensuelles | Done |
| Taux d'epargne moyen | Done |
| Meilleur et pire mois | Done |
| Nombre de mois avec donnees | Done |

### Multi-devises
| Fonctionnalite | Statut |
|---|---|
| 6 devises supportees (EUR, USD, GBP, CHF, CAD, JPY) | Done |
| Conversion automatique en EUR | Done |
| Taux de change editables par l'utilisateur | Done |
| Affichage devise originale si != EUR | Done |
| Retrocompatibilite transactions sans devise -> EUR | Done |

### Archives
| Fonctionnalite | Statut |
|---|---|
| Reset automatique le 1er du mois avec archivage du mois precedent | Done |
| Archivage manuel via bouton reset (avec confirmation) | Done |
| Liste des mois archives (nb transactions, revenus, depenses, solde) | Done |
| Detail d'une archive (resume + transactions + conseils) | Done |
| Conseils sauvegardes dans les archives pour consultation ulterieure | Done |
| Ajout de transactions dans les archives de mois passes (detection auto) | Done |
| Recalcul des totaux et conseils de l'archive apres ajout | Done |
| Suppression d'une archive individuelle (avec confirmation) | Done |
| Export CSV/PDF depuis une archive | Done |
| Bouton toggle afficher/masquer les archives | Done |
| Tri des archives par mois descendant | Done |

### Theme et interface
| Fonctionnalite | Statut |
|---|---|
| Theme sombre (defaut) | Done |
| Theme clair | Done |
| Toggle theme (bouton lune/soleil dans header + ecran auth) | Done |
| Transition douce entre themes | Done |
| Mise a jour couleurs Chart.js au changement de theme | Done |
| Theme persiste dans localStorage (global) | Done |

### Animations
| Fonctionnalite | Statut |
|---|---|
| fadeInUp sur les sections au chargement (stagger) | Done |
| slideInLeft sur les items de transaction | Done |
| Hover lift sur les cartes (translateY + box-shadow) | Done |
| Scale 0.97 au clic sur les boutons | Done |
| Slide-up sur les toasts | Done |
| Pulse sur barre epargne a 100% | Done |
| prefers-reduced-motion respecte | Done |

### Raccourcis clavier
| Raccourci | Action | Statut |
|---|---|---|
| Alt+N | Nouvelle transaction | Done |
| Alt+Z | Annuler derniere saisie | Done |
| Alt+R | Tout remettre a zero | Done |
| Alt+A | Afficher/masquer archives | Done |
| Alt+T | Changer de theme | Done |
| Alt+F | Rechercher (focus filtre) | Done |
| Alt+H | Aide raccourcis | Done |
| Alt+E | Taux de change | Done |
| Escape | Fermer overlays | Done |

### PWA
| Fonctionnalite | Statut |
|---|---|
| manifest.json (name, icons, standalone, theme_color) | Done |
| Service worker network-first (cache v2) | Done |
| Icones 192x192 et 512x512 | Done |
| Meta tags apple-mobile-web-app | Done |
| Fallback offline vers index.html | Done |

## Cles localStorage
| Cle | Type | Contenu |
|---|---|---|
| `budgetflow_users` | Object | { username: passwordHash, ... } |
| `budgetflow_session` | String | Username connecte actuellement |
| `budgetflow_theme` | String | 'dark' ou 'light' |
| `budgetflow_{user}_transactions` | Array | Transactions du mois en cours |
| `budgetflow_{user}_archives` | Array | Archives mensuelles avec conseils |
| `budgetflow_{user}_last_reset` | String | Dernier mois de reset (YYYY-MM) |
| `budgetflow_{user}_settings` | Object | { savingsGoal, recurringTxns, currencies, customCategories } |
| `budgetflow_{user}_recurring_applied` | Object | { monthKey_id: true } |

## Structures de donnees

### Transaction
```json
{
    "id": "1708700000000",
    "type": "expense",
    "amount": 45.50,
    "amountEUR": 45.50,
    "currency": "EUR",
    "category": "Grosses courses",
    "date": "2026-02-23",
    "description": "Courses au supermarche"
}
```

### Archive
```json
{
    "month": "2026-01",
    "transactions": [ ... ],
    "income": 1500,
    "expense": 1200,
    "balance": 300,
    "advice": [
        {
            "category": "Grosses courses",
            "amount": 350,
            "pct": "29.2",
            "idealPct": 20,
            "tip": "Planifiez vos repas...",
            "isWarning": true,
            "suggestedMax": 300
        }
    ],
    "savingsGoal": 200,
    "archivedAt": "2026-02-01T00:00:00.000Z"
}
```

### Settings
```json
{
    "savingsGoal": 200,
    "recurringTxns": [
        {
            "id": "1708700000000",
            "type": "expense",
            "amount": 750,
            "category": "Loyer",
            "description": "Loyer mensuel",
            "day": 5,
            "active": true
        }
    ],
    "currencies": {
        "rates": { "USD": 1.08, "GBP": 0.86, "CHF": 0.97, "CAD": 1.47, "JPY": 162.5 },
        "lastUpdate": "2026-02-23"
    },
    "customCategories": [
        { "name": "Animaux", "type": "expense", "icon": "🐶" }
    ]
}
```

## Fichiers du projet
```
budgetflow/
├── index.html          (513 lignes) - Page unique auth + app + overlays
├── style.css           (1946 lignes) - Themes sombre/clair, animations
├── script.js           (1659 lignes) - Auth, transactions, archives, graphiques, PWA
├── sw.js               (47 lignes) - Service worker network-first
├── manifest.json       (24 lignes) - PWA manifest
├── icons/              - Icones PWA (192 + 512)
├── .github/workflows/  - GitHub Actions deploy
├── CLAUDE.md           - Guide technique complet
└── project-select.md   - Ce fichier (etat des fonctionnalites)
```

## Bugs corriges
| Bug | Cause | Correction |
|---|---|---|
| Perte des donnees au rechargement | IIFE checkSession() avant declarations DOM | Deplacee a la fin de script.js |
| Temporal Dead Zone sur chart variables | setTheme() referençait des let non declarees | Variables deplacees avant le code theme |
| Service Worker cache les anciennes versions | Strategie cache-first | Passe a network-first + version v2 |
| Icone oeil invisible | Emoji &#128065; non rendu partout | Remplace par SVG inline |
| Punaises au lieu des icones categories | Anciennes categories sans icone apres split | Ajout retrocompat dans categoryIcons |

## Regles importantes
- **Ne JAMAIS deplacer l'IIFE `checkSession()` plus haut dans script.js** : elle doit rester apres toutes les declarations
- **Variables chart** (`expenseChart`, `evolutionChart`, `comparisonChart`) doivent etre declarees AVANT le code theme
- Les transactions sont sauvees dans localStorage a chaque modification
- Le reset mensuel auto se declenche uniquement si `last_reset` != mois courant
- Le service worker utilise `budgetflow-v2` : incrementer la version pour forcer les mises a jour
