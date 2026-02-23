# BudgetFlow - Etat actuel des fonctionnalites

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

### Transactions
| Fonctionnalite | Statut |
|---|---|
| Ajout transaction (type, montant, categorie, date, description) | Done |
| Champ date pre-rempli avec aujourd'hui | Done |
| Description optionnelle (defaut = nom de la categorie) | Done |
| Suppression individuelle (bouton x) | Done |
| Bouton Annuler la derniere saisie (desactive si vide) | Done |
| Bouton Tout remettre a zero (confirmation + archivage auto) | Done |
| Detection mois passe -> envoi en archive automatiquement | Done |
| Toast jaune de confirmation quand transaction envoyee en archive | Done |

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

### Graphique
| Fonctionnalite | Statut |
|---|---|
| Doughnut Chart.js des depenses par categorie | Done |
| Couleurs variees par categorie | Done |
| Passage en rouge (#dc2626) des categories ayant cause le depassement du seuil | Done |
| Legende en bas avec pourcentages dans les tooltips | Done |
| Message "Aucune depense enregistree" quand vide | Done |

### Systeme d'alerte (seuil 300 EUR)
| Fonctionnalite | Statut |
|---|---|
| Banniere rouge pulsante quand solde <= 300 EUR | Done |
| Animation CSS alertPulse sur la bordure | Done |
| Panneau de conseils personnalises par categorie | Done |
| Montant a economiser pour repasser au-dessus du seuil | Done |
| Budget suggere par categorie base sur les revenus | Done |
| Tips pratiques par categorie (alimentation, transport, etc.) | Done |
| Code couleur : bordure rouge = exces, bordure violette = maitrise | Done |

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
| Bouton toggle afficher/masquer les archives | Done |
| Tri des archives par mois descendant | Done |

### Interface / UX
| Fonctionnalite | Statut |
|---|---|
| Theme sombre moderne (variables CSS) | Done |
| Responsive mobile (breakpoint 600px) | Done |
| Grille 3 colonnes -> 1 colonne sur mobile | Done |
| Boutons empiles en colonne sur mobile | Done |
| Icone calendrier cliquable et visible sur le champ date | Done |
| Transitions hover sur tous les elements interactifs | Done |
| Protection XSS (escapeHtml sur les descriptions) | Done |
| Toast notifications (violet standard, jaune pour archives) | Done |

## Categories disponibles

### Revenus
| Categorie | Icone |
|---|---|
| Salaire | 💰 |
| Freelance | 💻 |
| Investissements | 📈 |
| Autre revenu | 💵 |

### Depenses
| Categorie | Icone | Cible budget |
|---|---|---|
| Alimentation | 🛒 | 30% |
| Transport | 🚗 | 10% |
| Logement | 🏠 | 35% |
| Loisirs | 🎮 | 10% |
| Sante | 🏥 | 5% |
| Shopping | 🛍️ | 5% |
| Factures | 📄 | 10% |
| Autre depense | 📦 | 5% |

## Cles localStorage

| Cle | Type | Contenu |
|---|---|---|
| `budgetflow_users` | Object | { username: passwordHash, ... } |
| `budgetflow_session` | String | Username connecte actuellement |
| `budgetflow_{user}_transactions` | Array | Transactions du mois en cours |
| `budgetflow_{user}_archives` | Array | Archives mensuelles avec conseils |
| `budgetflow_{user}_last_reset` | String | Dernier mois de reset (YYYY-MM) |

## Structures de donnees

### Transaction
```json
{
    "id": "1708700000000",
    "type": "expense",
    "amount": 45.50,
    "category": "Alimentation",
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
            "category": "Alimentation",
            "amount": 450,
            "pct": "37.5",
            "idealPct": 30,
            "tip": "Planifiez vos repas a l'avance...",
            "isWarning": true,
            "suggestedMax": 450
        }
    ],
    "archivedAt": "2026-02-01T00:00:00.000Z"
}
```

### User storage
```json
{
    "username1": "h_abc123",
    "username2": "h_def456"
}
```

## Fichiers du projet
```
budgetflow/
├── index.html          (203 lignes) - Page unique auth + app
├── style.css           (1003 lignes) - Theme sombre, responsive
├── script.js           (643 lignes) - Auth, transactions, archives, conseils
├── CLAUDE.md           - Guide technique complet
└── project-select.md   - Ce fichier (etat des fonctionnalites)
```

## Bugs corriges
| Bug | Cause | Correction |
|---|---|---|
| Perte des donnees au rechargement | IIFE checkSession() placee avant les declarations DOM de l'app | Deplacee a la fin de script.js (ligne 630+) |
| Date du jour disparait apres reload | Meme cause (renderTodayDate crashait) | Corrige par le meme fix |
| Donnees non persistantes apres deconnexion/reconnexion | Meme cause (openSession crashait avant de pouvoir render) | Corrige par le meme fix |

## Regles importantes
- **Ne JAMAIS deplacer l'IIFE `checkSession()` plus haut dans script.js** : elle doit rester apres toutes les declarations `const` DOM
- Les transactions sont sauvees dans localStorage a chaque modification (ajout, suppression, undo, reset)
- Le reset mensuel auto se declenche uniquement si `last_reset` != mois courant
