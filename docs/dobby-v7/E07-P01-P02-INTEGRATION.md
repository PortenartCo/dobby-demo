# DOBBY — intégration préparatoire E07-P01 + E07-P02 et disponibilité familiale

Base P01 : `e93f3dd64e9406fc145e95c105bedcb575d70034`. Source P02 avec le correctif « Déjà à la maison » partagé : `a60632d20f8951d37352de4c37d063c1667e0fe1`.

Les blocs de `cuisine-e07.js` ont été réconciliés sur l'ancêtre commun `69ef361ad139356c2d1473d825f9231e7610b0e4`, sans hunk recouvrant. Les modules P01 restent inchangés ; le module Courses P02, le client familial, le coeur de synchronisation et l'observateur d'effets sont intégrés. Le panier demeure unique et le writer familial natif garde les révisions CAS.

Les tests ciblés P01 + E07.4 + P02 + client familial simulé A/B seront vérifiés sur le SHA d'intégration ; aucune réussite de CI n'est présumée. Les anciens aperçus hébergés et `main` restent intacts.

**Disponibilité familiale :** le code P02 met `at_home_quantity` sur chaque article synchronisé. Le SQL est une proposition non appliquée. Le projet Supabase personnel `pqcdkrwljgvgagzwrcmg` est inaccessible via l'actuel connecteur (permission refusée) : pas de préflight schéma réel, pas de migration, pas de preuve multi-comptes réels. Les tests HTTP fictifs ne constituent pas un déploiement. Ne pas considérer cette fonction opérationnelle dans le foyer avant validation séparée.

Le générateur de simulation A/B est conservé sans publication automatique. Le catalogue ~200 recettes générales + ~200 diététiques est un lot indépendant, non remplacé par de fausses recettes.
