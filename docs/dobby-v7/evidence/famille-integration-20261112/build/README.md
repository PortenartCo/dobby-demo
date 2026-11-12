# Constructeur de la revue Famille — 12 novembre 2026

Le constructeur additif `scripts/build-dobby-family-review.cjs` appelle le constructeur global courant sans en modifier les sources. Il crée par défaut `essai-dobby-v7-famille-review-20261112/` et refuse tout répertoire déjà présent. `--output` permet de choisir un autre répertoire neuf. Les sources de production doivent être commises ; `--allow-dirty` produit uniquement une preuve locale identifiée `working-tree`.

```sh
node scripts/build-dobby-family-review.cjs
node scripts/build-dobby-family-review.cjs --allow-dirty --output /tmp/dobby-famille-local-neuf
node --test essai-stitch-v7/tests/global-build.test.cjs essai-stitch-v7/tests/fam-integration-build.test.cjs
```

Les seuls changements du `review-config.js` global et du `global-demo.js` copiés sont les remplacements exacts de `dobby-review-v7-global-20261112|` par `dobby-review-v7-famille-20261112|`. Le manifeste conserve leurs empreintes source et résultat, le nombre de substitutions et les empreintes des deux constructeurs hérités. Les corrections courantes du backend simulé, de la restauration des documents et de la réinitialisation sont ainsi conservées. Le runtime et les writers natifs restent identiques aux sources, sauf les adaptations déjà effectuées par le constructeur global.

`family-config.js`, chargé après la configuration globale et avant le runtime, compose un nouvel objet gelé. Les personas `review-person` (A) et `review-person-b` (B) sont explicitement `parent`. `review-baby`, `review-child` et `review-pet` fournissent les trois catégories dépendantes. Tous les noms affichent `DÉMO` ; les champs d’identité restent cohérents avec le modèle natif. Les résultats magiques préremplis utilisent le schéma E05 version 1 et les identifiants de son catalogue, sans prétendre avoir exécuté le questionnaire E06.

Les clés de session et de stockage, le backend partagé, son verrou et la réinitialisation utilisent l’espace Famille. Les bases IndexedDB et les stockages applicatifs conservent l’enveloppe par client A/B du runtime. Le script `DobbyGlobalDemo` garde son API existante : `ready`, `sync()`, `reset()`, `setOffline()`, `state()`, `rows()` et `requests()`.

Le manifeste indique `version: V7-FAMILLE`, `base: 6a6fcd9bcee522da7342de391e5c3d7bfe1955b3`, `familySource: a28a1e74e6fd6fcb0db8b154002ce032ae10f130` et le HEAD courant dans `sourceSha`. Chaque ressource livrée a une empreinte vérifiable. `realBackend`, `realAuth` et `migrationsApplied` sont `false`. Le constructeur ne publie rien.

Les tests ont d’abord échoué sur l’absence du nouveau constructeur et de la configuration. Après implémentation, trois tests Famille passent : construction et provenance complète, politique native des personas A/B et des dépendants, refus des sources non commises avant création du répertoire. Une assertion renforcée a également échoué sur la référence FAM abrégée avant son remplacement par le SHA complet. Le contrôle global existant passe à côté des nouveaux tests : **4 tests, 4 réussites, 0 échec**. Voir `builder-tests.log` pour la vérification enregistrée.

Les parcours navigateur, la coexistence avec l’essai global et les preuves hébergées sont suivis par les contrôles d’intégration séparés. Ce dossier décrit la preuve du constructeur.
