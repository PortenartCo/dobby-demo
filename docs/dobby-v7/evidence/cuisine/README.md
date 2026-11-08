# Cuisine — comparaisons des 13 sources

Références HTML Stitch rendues localement et interfaces raccordées, à **320 et 390 px**. Les deux ressources Google inaccessibles utilisent le remplacement Taverne documenté dans [INTEGRATION.md](../../INTEGRATION.md). Les données après intégration proviennent de fixtures dans le moteur natif, sans compte réel.

[Galerie de comparaison](index.html) · [Contrôles détaillés](checks.json)

| Écran | Référence 320 | Intégré 320 | Référence 390 | Intégré 390 |
|---|---|---|---|---|
| Taverne | [Source](before/taverne-320.png) | [DOBBY](after/taverne-320.png) | [Source](before/taverne-390.png) | [DOBBY](after/taverne-390.png) |
| Choix du repas | [Source](before/pick-320.png) | [DOBBY](after/pick-320.png) | [Source](before/pick-390.png) | [DOBBY](after/pick-390.png) |
| Grimoire | [Source](before/recipes-320.png) | [DOBBY](after/recipes-320.png) | [Source](before/recipes-390.png) | [DOBBY](after/recipes-390.png) |
| Fiche recette | [Source](before/recipe-320.png) | [DOBBY](after/recipe-320.png) | [Source](before/recipe-390.png) | [DOBBY](after/recipe-390.png) |
| Mode cuisine | [Source](before/cook-320.png) | [DOBBY](after/cook-320.png) | [Source](before/cook-390.png) | [DOBBY](after/cook-390.png) |
| Adaptation TM5 | [Source](before/tm5-320.png) | [DOBBY](after/tm5-320.png) | [Source](before/tm5-390.png) | [DOBBY](after/tm5-390.png) |
| Ajout manuel 1 | [Source](before/recipe-add-1-320.png) | [DOBBY](after/recipe-add-1-320.png) | [Source](before/recipe-add-1-390.png) | [DOBBY](after/recipe-add-1-390.png) |
| Ajout manuel 2 | [Source](before/recipe-add-320.png) | [DOBBY](after/recipe-add-320.png) | [Source](before/recipe-add-390.png) | [DOBBY](after/recipe-add-390.png) |
| Import JSON | [Source](before/batch-320.png) | [DOBBY](after/batch-320.png) | [Source](before/batch-390.png) | [DOBBY](after/batch-390.png) |
| Préparation des courses 1 | [Source](before/shop-1-320.png) | [DOBBY](after/shop-1-320.png) | [Source](before/shop-1-390.png) | [DOBBY](after/shop-1-390.png) |
| Préparation des courses 2 | [Source](before/shop-320.png) | [DOBBY](after/shop-320.png) | [Source](before/shop-390.png) | [DOBBY](after/shop-390.png) |
| Courses validées | [Source](before/shop-final-320.png) | [DOBBY](after/shop-final-320.png) | [Source](before/shop-final-390.png) | [DOBBY](after/shop-final-390.png) |
| Historique | [Source](before/shop-history-320.png) | [DOBBY](after/shop-history-320.png) | [Source](before/shop-history-390.png) | [DOBBY](after/shop-history-390.png) |

Les 52 captures ci-dessus sont produites par `cuisine-visual.cjs`. La référence conserve les données fictives du HTML pour comparaison, sans exécuter ses scripts. Le résultat intégré ne reprend pas ces données.

Le test familial utilise le véritable client avec une API simulée en mémoire. Les six captures supplémentaires montrent ses états réels :
- Connecté : [320 px](after/shop-connected-320.png), [390 px](after/shop-connected-390.png).
- Modification hors ligne : [320 px](after/shop-offline-320.png), [390 px](after/shop-offline-390.png).
- Conflit avant résolution : [320 px](after/shop-conflict-320.png), [390 px](after/shop-conflict-390.png).
