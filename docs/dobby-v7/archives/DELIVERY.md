# Reçu de livraison — Archives & Scriptorium

- PR en brouillon : https://github.com/PortenartCo/dobby-demo/pull/17
- Branche : `feat/dobby-v7-archives-stitch22-20261113`.
- Départ sur main `25dd637`, puis intégration de PR15 et du dernier main `a4190bb3b1b2fd95995e33dbce09ffb31c77614c` (PR16 Maison).
- Commit de code validé : `a0d59549d8ac1fd66d3b42898ebd47d047f119c8`. La clôture suivante ne modifie que ce rapport, le bilan, l'inventaire et les preuves documentaires.
- Bilan technique ciblé : **56 PASS**. Aucun statut de recette réelle A/B n'est revendiqué.

La CI complète du code est verte : run 43437263496, jobs Archives, source-backed-browser et SQL isolé ; Sync 43437263486. Snapshot dans evidence/ci-code-a0d5954.json. Les checks de PR #17 font foi pour le SHA final de livraison, y compris après clôture documentaire.

La campagne Archives, les 525 tests natifs, les 66 tests de modèles/build, la campagne Contrats et la campagne Maison complète passent. Les PDF originaux/avenants et les pièces Maison ont été consultés et comparés octet pour octet. La restauration native complète a été exécutée dans des profils TEST. Les imports partiels anciens préservent le statut et refusent une réactivation implicite.

L'exhaustif historique final échoue sur une attente Missions préexistante, reproduite sur main a4190bb figé et détaillée dans AUDIT.md. Cette réserve reste séparée des 56 critères ciblés et de la CI réussie ; aucun succès de cette campagne exhaustive n'est revendiqué.

Reproduction locale : serveur statique à la racine, variable `DOBBY_TEST_ORIGIN=http://127.0.0.1:8765`, puis `CHROMIUM_PATH=/usr/bin/chromium node essai-stitch-v7/tests/archives-ci.cjs`. Build réel reproductible : `node essai-stitch-v7/build-source.cjs`, `npm run build:css --prefix essai-stitch-v7`, puis diff nul.

Les fichiers exacts du lot sont dans MODIFIED_FILES.txt. Les sources du pack restent sous spec/ ; les 56 résultats figurent dans 03_TESTS_RECETTE.md. Les revues indépendantes, corrections et retests sont dans REVIEW.md. Les preuves finales de composition portent le suffixe main16 ; les précédentes sont conservées comme étapes historiques.

Aucune fusion, publication, exécution SQL distante ni activation de gate. La recette des deux comptes familiaux reste groupée en fin de projet. Le checkout et la branche sont conservés pour revue. Retour arrière : retrait/revert du lot ; aucun binaire déplacé.
