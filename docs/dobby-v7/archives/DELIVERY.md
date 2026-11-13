# Reçu de livraison — Archives & Scriptorium

- PR en brouillon : https://github.com/PortenartCo/dobby-demo/pull/17
- Base main : `25dd637c1b827bd09a46d8a55be63d9c14966f19` (toujours courante au contrôle avant push).
- Commit fonctionnel et preuves : `39305c1b2afdfc03351ee4825e36ef9016c673d7`.
- Les commits suivants ne complètent que la documentation de livraison ; le code vérifié reste identique à ce commit fonctionnel.
- Bilan : **55 PASS, R09 BLOCKED**. Aucun statut de recette réelle A/B n'est revendiqué.

La campagne locale Archives, les 486 tests natifs, les 66 tests de modèles/build et la campagne Contrats (51 tests natifs plus navigateur) passent. Les PDF originaux/avenants ont été consultés depuis l'archive et comparés octet pour octet. Une restauration native complète a été exécutée dans un profil TEST ; les anciennes sauvegardes partielles préservent aussi le statut.

L'exhaustif historique échoue sur l'attente E08 périmée détaillée dans AUDIT.md ; le même échec est reproduit avec main intact. La CI PR est lancée sur le SHA livré et son état doit être lu dans les checks GitHub. Les premiers runs du commit fonctionnel sont `43426788104` (Stitch) et `43426788072` (Sync) ; ils ne valent pas résultat d'un éventuel commit documentaire suivant.

Reproduction locale : serveur statique à la racine, variable `DOBBY_TEST_ORIGIN=http://127.0.0.1:8765`, puis `node essai-stitch-v7/tests/archives-ci.cjs`. Build reproductible post-commit : `node essai-stitch-v7/build-source.cjs`, `npm run build:css --prefix essai-stitch-v7`, puis diff nul sur les racines générées/templates/CSS.

Les fichiers exacts du lot sont dans MODIFIED_FILES.txt. Les sources du pack restent sous spec/ ; le bilan exécuté se trouve dans 03_TESTS_RECETTE.md. La revue indépendante et les régressions causales sont dans REVIEW.md.

Aucune fusion, publication de site, exécution SQL distante ni activation de gate. La recette des deux comptes familiaux reste groupée en fin de projet. Le checkout et la branche sont conservés pour la suite de la revue.
