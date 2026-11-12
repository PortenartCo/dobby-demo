# Taverne E07.3 — contrôles ciblés

Code concerné : `cuisine-e07.js` et `cuisine-e07.css`, exclusivement la Taverne et le routage de ses deux nouvelles actions calendrier depuis `cuisine.js`.

- « Les Repas du Jour » : Midi et Soir indépendants, photographies existantes via `recipeVisual()` ou pictogramme explicitement générique, durée totale commune au catalogue, convives et portions du repas natif exact. Aucun champ de recette fictif lorsque le créneau est vide.
- Calendrier du lundi au dimanche, sept jours visibles ; une rangée à 390/1440, deux rangées à 320 pour conserver les cibles de 44 px. Navigation ±7 jours et sélection en état de présentation seulement, sans nouveau stockage et sans modification de `st.day` ni du planning.
- Détail de la journée sélectionnée et accès « Voir la recette », « Modifier le repas » ou « Choisir un repas ». Les actions utilisent toujours les routes et writers natifs.
- Cartes Grimoire et Courses : titres/actions 16 px, informations secondaires 14 px, actions principales 52 px. Aucun changement de page Courses.

## Exécution réelle

`DOBBY_TEST_ORIGIN=http://127.0.0.1:8894 node essai-stitch-v7/tests/e07-3-taverne.cjs`

[RED avant modification](logs/before-red.log) : l’ancienne présentation n’affiche que le repas du soir.

[GREEN](logs/after-green.log) : **PASS 320, 390, 1440 px**, [résultats structurés](results.json).

Le test utilise des contextes Chromium éphémères, des données TEST et les APIs natives ; requêtes extérieures bloquées, aucun compte familial réel. Il vérifie les deux créneaux, photographie et repli, portions exactes, sept jours et cibles tactiles, semaines précédente/suivante, sélection et absence d’écriture native, repas annulé et durée inconnue. Il choisit puis enregistre réellement un dîner par le formulaire natif, le retrouve après rechargement, conserve le déjeuner et les autres jours/archives/articles, puis consulte une recette et revient par le navigateur. Les cinq destinations permanentes sont conservées et aucun débordement horizontal n’est constaté.

Captures fonctionnelles [320](taverne-320.png), [390](taverne-390.png), [1440](taverne-1440.png). Les comparaisons visuelles avant/après complètes sont produites séparément par le contrôle indépendant de présentation.
