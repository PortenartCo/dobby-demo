# CI — intégration Famille du 12 novembre 2026

Le workflow `.github/workflows/dobby-stitch-v7.yml` conserve ses 16 étapes existantes, leur ordre, leurs conditions et le garde de réutilisation historique. Deux filtres de déclenchement couvrent le nouveau builder. Une étape s’ajoute uniquement pour `feat/dobby-v7-famille-integration-20261112`, y compris lorsqu’il s’agit de la branche source d’une pull request.

La campagne existante `Functional Stitch roots and source fidelity` continue de lancer `tests/ci.cjs`. Le fichier `ci-scope.json` conserve `e07p01p02Only: true` : les contrôles Courses E07-P01/P02 sont donc rejoués. Aucune preuve issue d’un ancien run n’est substituée à l’intégration Famille. Les conditions spécifiques à la branche globale et le script `check-dobby-review-reuse.cjs` sont inchangés.

Les contrôles communs restent obligatoires : registre exhaustif, syntaxe, suites natives offline/famille/conflits, provenance du builder intégré, E06, formats et temporisateurs E07, dérivation source/CSS, manifeste Stitch et campagne Courses. La nouvelle étape exécute `essai-stitch-v7/tests/fam-integration-ci.cjs` dans le même job, sur le serveur localhost du workflow.

| Contrôle ajouté | Contrat vérifié |
| --- | --- |
| `fam-integration-build.test.cjs` | Namespace indépendant, sources et empreintes, conservation des corrections globales, parents fictifs explicites, refus de sources de production non committées et de réécriture d’un dossier existant. |
| `fam-integration-transverse.test.cjs` et `e09-memo-writer.test.cjs` | Empreintes E02/Courses/Runes/runtime global, ordre des adaptateurs et writer natif des mémos E09. |
| `family-member-policy.test.cjs` natif | Autorisations réelles des writers membres et santé, refus enfant/bébé/animal/identité inconnue, attribution initiale/finale des soins et confirmation E06. |
| `fam-detail.cjs`, `fam-members.cjs` | Fiches individuelles, navigation, formulaires, catégories et identités héritées, lecture seule, dépendance invitation et affichage 320/390/1440. |
| `fam-agenda-memos.cjs`, `fam-agenda-memos-sync.cjs`, `fam-agenda-month.cjs` | Agenda, mémos, synchronisation, conflits, dates, mois et années. |
| `family-review-effects.cjs` | Effets réellement peints, ON/OFF, persistance, mouvement réduit, absence de doublon et conservation des données. |
| `build-dobby-family-review.cjs` | Construction neuve de `essai-dobby-v7-famille-review-20261112` depuis le checkout courant. |
| `fam-integration-transverse.cjs` | Parcours partagés E02/Courses, mémos E09, missions et runes dans le nouveau bundle. |
| `fam-integration-preview.cjs` | Parcours du bundle Famille aux trois largeurs, isolation A/B, réseau simulé, persistance et réinitialisation. |

Le runner vérifie d’abord que le serveur fournit les mêmes octets `family.js` que le checkout. Il impose une nouvelle sortie, fournit explicitement `DOBBY_TEST_ORIGIN`, les deux bases de tests du bundle, les répertoires de preuve et `NODE_PATH` pour le test natif CJS. Il impose les trois largeurs de recette et désactive le mode de capture de référence des effets. Chaque commande doit réussir ; un échec arrête la campagne et reste inscrit dans `ci-current/results.json` avec son journal. Les preuves sont conservées par l’upload d’artefacts existant du workflow.

Exécution locale, serveur racine actif sur le port choisi et dossier de sortie absent :

```sh
DOBBY_TEST_ORIGIN=http://127.0.0.1:8873 CHROMIUM_PATH=/usr/bin/chromium node essai-stitch-v7/tests/fam-integration-ci.cjs
```

L’option locale explicite `--allow-dirty` autorise seulement une preuve avant commit. Elle n’est jamais utilisée dans le workflow et le manifeste du bundle conserve alors `sourceState: working-tree`. La livraison et son contrôle GitHub doivent reconstruire depuis des sources committées.

`workflow-structure.json` atteste la comparaison structurelle du YAML : les 16 anciennes étapes et tous les paramètres non concernés sont conservés. `source-derivation.json` atteste la reconstruction source/CSS locale et l’absence de différence sur la liste exacte de fichiers dérivés contrôlée par le workflow. Les résultats d’exécution sont dans `../ci-current/`; le statut GitHub final doit être lié au SHA effectivement poussé.

Exécution locale initiale : les dix premières commandes du runner ont réussi sur le checkout `bc3c1e5a12bb76350cd8981b79cf67f85949ecce` avec les ajouts de travail déclarés. La dernière a correctement arrêté la campagne : le test tentait de cliquer un bouton d’import situé dans un `<details>` fermé. Le test a été corrigé pour ouvrir la section par son `<summary>` avant chaque import. `../ci-current/results.json` et son journal conservent ce premier échec ; ils ne constituent pas une preuve de campagne complète réussie. La recette du test corrigé est exécutée séparément, puis les onze commandes seront rejouées dans GitHub sur les sources committées.
