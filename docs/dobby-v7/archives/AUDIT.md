# Archives — inventaire et suivi

## C0 — main courant

Base main `25dd637c1b827bd09a46d8a55be63d9c14966f19` ; #11 fusionnée, #15 ouverte (documentation/sondes), #16 Maison ouverte et non importée. Aucun AGENTS.md dans dobby-demo. Aucun SQL nécessaire : les payloads JSON existants sont extensibles.

| Source native | ID | Writer / persistance | Partage existant | Cycle |
|---|---|---|---|---|
| familyDocs | id | DobbyFamilyContracts.save ; documents natifs / save | contracts pour contrats/assurances et partage explicite ; retainedLocalOnly conservé | extension archive |
| houseItems | id | houseForm / save natif | module house actif uniquement | extension archive, houseLogs/houseDocs intacts |
| customRecipes | id | cuisine transaction / save natif | module recipes actif uniquement | extension archive, planned/courses intacts |
| famContacts | id | xContactForm / save natif | module family actif uniquement | extension archive |
| familyNotes | id | familyNoteForm / save natif | local uniquement | extension archive |
| sharedFamilyNotes | id | changeSharedMemo / save natif | family actif uniquement | extension archive |

Les commandes de cycle de vie étendent le pipeline natif de ces sources ; elles ne créent ni collection parallèle ni copie de document. Les droits sont relus au commit et le snapshot inclut le contexte d'authentification. Une donnée locale reste locale.

Exclusions : catalogue général de recettes (lecture et provenance), identités/santé (règles et confidentialité spécifiques), Missions/Runes (séries et ledger), paiements/achats (historique irréversible), agenda/menus (événements et références déjà planifiés), logs d'entretien et pièces (preuves rattachées, pas des fiches à désactiver), listes de tâches (coches et usages opérationnels). Aucun bouton fictif sur ces domaines.

Documents autonomes : registre documentaire natif conservé sous Paramètres. Aucun archivage implicite.

## Journal

- Lecture du pack et inventaire C0 effectués. Implémentation et preuves en cours.
- Décision : exécution dans un checkout dédié et une branche indépendante ; le checkout Portenart-Platform reste intact.
- Décision : aucune extension de l'architecture du foyer et aucun transfert automatique de données locales.

## Validation et livraison

Les corrections C1/C2/C3 sont implémentées et vérifiées localement. Voir [les 56 contrôles](03_TESTS_RECETTE.md), [la revue](REVIEW.md) et [les preuves](evidence/).

Commandes exécutées depuis la racine du dépôt :

| Commande | Résultat observé |
|---|---|
| `node --test essai-sync-v1/tests/*.test.mjs essai-sync-v2/tests/*.test.mjs essai-stitch-v5-famille/tests/*.test.mjs essai-stitch-v5-famille/tests/*.test.cjs` avec `DOBBY_TEST_ORIGIN=http://127.0.0.1:8765` | 486/486 ; native-suite.log |
| `node essai-stitch-v7/tests/archives-ci.cjs` | 9 tests writer/sync, 4 largeurs UI, parcours sources/PDF/backup et régressions de revue ; archives-final.log |
| `node essai-stitch-v7/tests/archives-sources.cjs` | Conservation d'une mise à jour du contrat archivé, originaux/avenants, sauvegarde partielle ancienne et restauration complète ; sources-final.log |
| `node essai-stitch-v7/tests/contracts-ci.cjs` | Campagne E08, import externe ZIP/JSON, pièces et refus Enfant ; contracts-regression.log |
| `node --test essai-stitch-v7/tests/e07-4-*.test.* essai-stitch-v7/tests/e07-3-*.test.* essai-stitch-v7/tests/e07-p01*.test.* essai-stitch-v7/tests/e09-memo-writer.test.cjs essai-stitch-v7/tests/integrated-build.test.cjs essai-stitch-v7/tests/integrated-preview-fixture.test.cjs` | 66/66 ; cuisine-models.log |
| `node essai-stitch-v7/tests/register-{documents,house,family,preservation,navigation}.cjs` exécutés séparément | Tous passent à 320/390 ; register-regressions.log |
| `node essai-stitch-v7/tests/e07-p02-family.cjs` | Passe isolément sur main et sur le lot ; grocery-isolated.log et baseline-grocery.log |
| `node essai-stitch-v7/build-source.cjs` ; `npm run build:css --prefix essai-stitch-v7` | Build réel réussi, CSS inchangé ; build.log |
| `npm run test:all --prefix essai-stitch-v7/tests` | Échec historique E08 décrit ci-dessous ; full-browser-suite.log |
| `npm test --prefix essai-stitch-v7/tests` | Menu + recettes passent ; un scénario Courses a rencontré un snapshot périmé, puis passe isolément sans changement de code ; checkpoint-suite.log / grocery-isolated.log |

Les campagnes locales ont utilisé du HTTP local et des fixtures, avec le trafic applicatif externe bloqué. La synchronisation est une preuve de protocole simulé, pas un login de deux vrais comptes, ni une validation des politiques RLS déployées.

## Réserve globale vérifiée

L'exhaustif historique s'arrête dans `consolidation-shared.cjs` : il attend `0 contrats et assurances enregistrés`, alors que le module canonique E08 de main affiche `0 éléments enregistrés`. Le même test exécuté avec les fichiers de production de main `25dd637` servis via un serveur local de référence échoue à la même assertion : `baseline-historical.log`. Cette ancienne attente de présentation n'a pas été réécrite pour faire passer le lot. Les tests E08 actuels de `contracts-ci.cjs` passent. R09 reste bloqué tant que la CI globale n'est pas verte.

L'ancienne fixture `register-documents-sync.cjs` ne fournissait pas de contexte canonique au parent simulé : son échec sur main est conservé dans `baseline-documents-sync.log`. Elle fournit maintenant le DTO canonique partagé avec les autres recettes, attend la fin de connexion puis passe par `access.refresh`. Aucune garde de production n'a été abaissée.

## Conservation et compatibilité

`archive` est une métadonnée extensible des objets source, pas un registre. Les anciennes fiches sans champ restent actives. La date est créée au commit local ; une réactivation garde la date précédente dans `lastArchivedAt`. Les pièces ne sont pas déplacées. Le partage transporte uniquement les collections déjà activées ; les mémos locaux et documents privés ne sont pas ajoutés à un payload partagé. Une archive partagée porte le foyer canonique pour refuser sa consultation après changement de contexte.

La restauration complète native a réellement été confirmée dans un profil TEST, avec comparaison de la fiche et des octets du PDF. Les imports partiels anciens et les mises à jour du contrat conservent le statut. Cela ne constitue pas un rollback de production.

La PR Maison #16 reste indépendante : aucun cherry-pick ni remplacement de ses développements. Les zones communes sont les hooks de liste Maison, les payloads génériques, le build et les quatre racines HTML. Si #16 arrive dans main avant ce lot, il faudra composer les amendements natifs et rejouer les tests sur cette nouvelle base ; aucune fusion de #16 n'a été effectuée ici.

## Captures et niveaux de preuve

Images avant : `evidence/before-{320,390,768,1440}.png`. Après : `empty-*`, `list-*`, `detail-*`, `confirm-*`, `reactivate-*`. `archived-contract-pdf-390.png` montre la consultation du PDF depuis le vrai contrat archivé. Les quatre largeurs ont été automatisées ; une inspection visuelle a couvert hero, recherche, liste, dialogue mobile et PDF. Le SHA256 du visuel est fixé dans `essai-stitch-v7/assets/archives/provenance.json` et correspond octet pour octet au fichier fourni.

Développement et tests locaux : réalisés. PR : #17 créée en brouillon ; CI et reçu dans DELIVERY.md. Fusion, publication, SQL distant, activation de gates : non effectués. Recette réelle des deux comptes familiaux : différée, conformément à la demande.

## Retour arrière

Retirer le commit de ce lot avant fusion ; après une éventuelle intégration autorisée, revert du lot. Les champs JSON extensibles restent conservés. Un ancien client ne connaît pas les filtres d'archivage : conserver une sauvegarde native et remettre ce lot pour retrouver le cycle complet. Aucun rollback de production exécuté.
