# DOBBY V7 repas — checkpoint avant modification

Base inspectée : `b327aa5`, worktree `/workspace/dobby-v7-review`, application native `essai-stitch-v7`, sans AGENTS.md dans ce dépôt. Documents 00, 01 et 02 du pack lus dans l’ordre. Aucun accès Supabase distant.

| ID | Baseline | Preuve native / écart |
|---|---|---|
| T01 | À_CORRIGER | cuisine-e07.js taverne empile Jour, Semaine, Grimoire ; aucun onglet |
| T02 | À_CORRIGER | carte Courses du Foyer dans taverne(), import natif cuisine-list à préserver |
| T03 | À_CORRIGER | cartes jour ouvrent recipe ; cuisine-e074.js expose cook-mode-btn dans fiche |
| T04 | PARTIEL | mealAction status/move possède confirmation, expectedMeal et transaction/rollback ; outils cachés dans details |
| T05 | PARTIEL | pick natif existe, libellé Choisir un repas sans + |
| T06 | DÉJÀ_VALIDÉ | calendrier hebdo n’expose pas de cook |
| T07 | À_CORRIGER | planRecipe conserve convives/childFactor sans toucher recette ; manque +/- dans semaine |
| T08 | NON_RÉALISÉ | meal record unique par date-slot, pas de dessert ; JSON planned partagé existant |
| T09 | NON_RÉALISÉ | cookProgress par recipe+method ; pas de composant de repas indépendant |
| T10 | PARTIEL | catégorie arbitraire importée et filtre dynamique, mais aucune catégorie Desserts toujours disponible ni bouton éditeur |
| T11 | NON_RÉALISÉ | cuisine-list.proposal parcourt pendingMeals() uniquement ; coordination shopping nécessaire |
| T12 | À_CORRIGER | cuisine-p01.js filters() affiche Vos envies en section ouverte |
| T13 | À_CORRIGER | fin E074 ouvre recette + modal festin, sans statut préparé ni retour automatique |

Contrats à préserver : V5 stockage `dobby-v5-familial-preview-20261108`, planned JSON du module menus ; planSelectedMeal, mealAction transactionnel ; imports courses tokens/provenance cuisine-list ; médias et import IA recettes natifs. Aucune migration distante autorisée. Les permissions réelles restent soumises au gate transversal et à la recette utilisateur du backend.
