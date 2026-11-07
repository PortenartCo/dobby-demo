# Dobby — essai Stitch V5 (7 novembre 2026)

## Périmètre graphique
Le produit principal demeure l'application Dobby ChatGPT, non le code métier exporté par Stitch. Le design V5 réutilise la version V4 dans `index.html`, puis charge `stitch-v5.css` et `stitch-v5.js`.

Les deux archives Stitch disponibles ont des contenus identiques et **quatre écrans HTML distincts** :
1. Échoppe du Chemin de Traverse — accueil.
2. Bibliothèque des Missions — tâches.
3. Taverne Gourmande — repas et menus.
4. Salon des Curiosités — famille et organisation.

La V5 reprend le visuel des trois dernières pages avec leurs illustrations spécifiques, ainsi que le thème commun du fichier `DESIGN.md`. L'accueil demeure celui de l'essai précédent, déjà accepté graphiquement.

Les écrans sont alimentés par les données de Dobby : tâches internes, repas planifiés, membres de famille, rendez-vous enregistrés. Les contenus fictifs et démonstrations d'interactions Stitch n'ont pas été importés comme fonctionnalités.

## Couverture des autres écrans
Adaptation au même thème **sans maquette Stitch dédiée** dans les ZIP : Maison/équipements, Documents/contrats, Recettes détaillées/mode cuisine, Courses, Conversation, Import PDF/photos/recettes, Santé détaillée, Répertoire, Listes, Recherche, formulaires.

Le thème V3 et les composants V5 s'appliquent globalement ; la disposition exacte de ces sous-écrans n'est **pas** certifiée conforme à Stitch en l'absence de références correspondantes.

## Préservation / rollback
- Production : `/index.html` (racine GitHub Pages), inchangée.
- Branche sauvegardée : `backup/pre-stitch-2026-11-05`, copie identique à la production vérifiée.
- Anciens essais : `essai-stitch/`, `essai-stitch-v2/`, `essai-stitch-v3/`, `essai-stitch-v4/`, non modifiés.
- Essai actuel : `essai-stitch-v5/`.
- Données d'essai : clé `dobby-stitch-preview-20261105`, séparée de la clé de production `dobby-demo-v1`.
- Les données restent locales au navigateur ; aucune migration, synchronisation Apple ou IA réelle ajoutée.

Pour revenir visuellement à Dobby original : ouvrir `https://portenartco.github.io/dobby-demo/`. Ne pas supprimer les données locales avant une sauvegarde.

## Vérifications
- Présence et identité des fichiers GitHub vérifiées.
- Script JS V5 compilable (test de syntaxe).
- Tests ciblés des rendus dynamiques : tâches, recettes, membres, rendez-vous, routes d'actions et images de références : PASS.
- **Non vérifié** : rendu graphique réel sur iPhone / intégration dans Safari, disponibilité durable des images Google, test manuel complet des flux de chaque module.

## À obtenir pour une reproduction plus complète
Les nouveaux exports HTML ou captures des écrans Stitch additionnels, s'ils existent dans le projet Stitch mais ne figurent pas dans les deux ZIP fournis. Les quatre écrans ci-dessus sont les seules maquettes natives visibles dans les archives actuellement accessibles.
