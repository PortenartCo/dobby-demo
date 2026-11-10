# Consolidation E07 — preuves ciblées

Base de consolidation : `bb95132d363f14e760d568c84342b60cba183ce6` (Gate 0). Les captures `before/list-{320,390,1440}.png` ont été prises avant modification des fichiers E07, avec les mêmes achats fictifs que les captures `after/list-*`. Les illustrations sont chargées et décodées avant capture ; aucune donnée familiale réelle.

| ID | Résultat du lot | Code / preuve |
|---|---|---|
| E07-01 | REPORTÉ — AUTORISÉ | Calendrier compact réservé à E07.3 ; planning E07.1 conservé. |
| E07-02 | REPORTÉ — AUTORISÉ | Grimoire, sélection et fiche non reconstruits. |
| E07-03 | REPORTÉ — AUTORISÉ | Cuisine et TM5 conservés ; recette de non-régression `cuisine.cjs`. |
| E07-04 | VÉRIFIÉ ciblé | `cuisine-list.js preview(E,range)` et `confirmImport` : début/fin inclusifs, Midi+Soir, quantités/provenances natives, manuel homonyme séparé. Contrôles dates et raccourcis 3/7/14/personnalisé dans `cuisine-e07.js`. Aperçu avant mutation ; nouvelle prévisualisation exigée après modification des dates. |
| E07-05 | VÉRIFIÉ ciblé | CTA doré pleine largeur, icône, explication sans coche, confirmation, succès. `archive(E,ids)` ne retire que les achats approuvés, encore cochés et sans conflit ; les autres achats persistent. |
| E07-06 | VÉRIFIÉ ciblé | Bouton historique supprimé ; ancienne route redirigée vers `shop`. Archives et reçus natifs conservés ; aucune purge. |
| E07-07 | VÉRIFIÉ 320/390/1440 | Trois CTA mesurés : police ≥16 px, largeur du conteneur et hauteur ≥48 px. |
| E07-08 | VÉRIFIÉ ciblé | Accords des compteurs/confirmations ; hero, image et cartouche conservés. Captures `after/final-*` et `after/range-*`. |
| E07-09 | REPORTÉ — AUTORISÉ | Effet du bouton de fiche vers Panier réservé à E07.3. |
| E07-10 | REVUE UTILISATEUR EN COURS | Ces tests et captures ne constituent pas une validation utilisateur. |

## Vérifications réellement exécutées

- `e07-consolidation.cjs` : PASS 320/390/1440. Le test initial échoue causalement sur 16 apports proposés au lieu de 8 (`logs/red.txt`). La version corrigée vérifie bornes incluses, deux créneaux, annulation, quantités manuelles, déduplication après rechargement, dates invalides, raccourcis, confirmation périmée par changement de dates, suppression ciblée, archives techniques conservées, accords et géométrie (`logs/green.txt`).
- `e07-2-model.cjs` : PASS, migration, CRUD, unités distinctes, quantités inconnues, précision, révision de portions, déplacement, provenance/rechargement, archivage partiel et retour arrière sur erreur de stockage (`logs/model.txt`).
- `e07-2.cjs` : PASS 320/390/1440, liste unique, édition, aperçu/annulation/confirmation, coche/réactivation, persistance, suppression, défilement et ancienne route sans destruction (`logs/e07-2.txt`).
- `cuisine.cjs` : PASS 320/390, opérations recettes, favoris, portions, cuisson/TM5, ajouts/imports, édition, déplacements/annulation et rechargement (`logs/cuisine.txt`).
- `cuisine-family.cjs` : PASS 320/390 avec client familial réel contre fixture HTTP éphémère : CRUD, quantités fractionnaires, hors ligne, rechargement, conflit, imports explicites, déduplication et fin partielle (`logs/cuisine-family.txt`). Aucune preuve multiappareils réelle revendiquée.
- `e07-1.cjs` : PASS 320/390/1440, hero, CTA, images/repli, deux créneaux, préparé persistant, navigation et dock fixe (`logs/e07-1.txt`). L'ancienne attente du bouton Retour de la page Historique a été remplacée par un clic réel sur Taverne dans le dock ; l'attente URL tient compte de son action native `#taverne` (`logs/e07-1-routing-old-expectation.txt`).

Les tests historiques affectés par la décision E07-06 conservent les assertions de données : ils contrôlent désormais les archives natives et la redirection, sans exiger une navigation utilisateur supprimée par la revue. Les fixtures d'import sélectionnent une date explicite ou utilisent aujourd'hui, selon leur scénario. Les captures de régression sont dans `regression/`, sans écraser les preuves historiques E07.

Le lot n'a modifié ni moteur, ni writer familial, ni synchronisation, ni SQL, ni chrome, ni builder. `cuisine.js` reçoit seulement la redirection de l'ancienne route et l'export du helper `recipeVisual` partagé avec E01. La campagne générale, l'aperçu généré et la publication relèvent de l'intégration finale.
