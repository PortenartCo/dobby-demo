# Validation intégrée Dobby — résultat final

**Régressions natives : 633 / 633 tests réussis. Campagne standard complète : PASS, code de sortie 0 en 338.733 s (5 min 39 s). Aucun échec observé.**

- Source produit finale : `af015f8c334b67112ee197293611bdecc88d7905`.
- Exécution finale : Chromium sur `http://127.0.0.1:8765`, comptes/données fictifs et profils isolés. Les requêtes distantes du navigateur sont annulées ou remplies par des fixtures ; les transports réseau Node sont bloqués avant chargement des tests.
- Les quatre groupes natifs portent le SHA produit final au début et à la fin. Le HEAD a ensuite avancé à `8fe5af4d08ace4481f62c9639504545aa8ec3412` avec les scripts/tests de consolidation et les artefacts de prévisualisation générés (353 fichiers). Le filtrage des sources canoniques ne montre aucune modification produit ni des tests natifs exécutés. La liste exacte est conservée dans le reçu JSON, sans répéter les chemins des bundles ici.
- Aucun fichier source, branche ou commit modifié par cette mission. Les builders de tests ont travaillé dans des dossiers temporaires isolés, conformément à l'autorisation de l'agent principal ; aucun bundle actif n'a été généré par cette mission.

## Régressions natives finales

| Groupe | Tests | Réussis | Échecs | Annulés | Ignorés | Log |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| core | 444 | 444 | 0 | 0 | 0 | `/workspace/scratch/dobby-native-final-core.log` |
| permissions | 15 | 15 | 0 | 0 | 0 | `/workspace/scratch/dobby-native-final-permissions.log` |
| courses-repas | 84 | 84 | 0 | 0 | 0 | `/workspace/scratch/dobby-native-final-courses-repas.log` |
| contrats-maison | 90 | 90 | 0 | 0 | 0 | `/workspace/scratch/dobby-native-final-contrats-maison.log` |

Commandes : socle `node --require /workspace/scratch/dobby-native-network-guard.cjs --test essai-sync-v1/tests/*.test.mjs essai-sync-v2/tests/*.test.mjs essai-stitch-v5-famille/tests/*.test.mjs`, puis les mêmes groupes ciblés de permissions, Courses/Repas et Contrats/Maison documentés dans `/workspace/scratch/dobby-native-results.md`. Rapport natif final : `/workspace/scratch/dobby-native-final-results.md`.

## Campagne standard finale

Commande : `npm test --prefix essai-stitch-v7/tests` avec garde réseau Node et variables de preuves compatibles dirigées vers scratch.

Log complet : `/workspace/scratch/dobby-integrated-standard-ci.log`. Reçu : `/workspace/scratch/dobby-integrated-standard-results.json`. Marqueur final : `E07_P01_P02_TARGETED_CI_PASS`.

La campagne a exécuté 27 sous-scripts : 24 suites navigateur et trois suites `node:test` (23 tests au total dans ces trois suites, déjà partiellement couverts par les groupes natifs ; ces comptes ne sont pas additionnés aux 633 comme tests uniques).

| Vérification | Résultat |
| --- | --- |
| Génération Menu en dossier temporaire | 1 test PASS |
| Menu, filtres, retour/rechargement, sauvegarde et conservation des données | 320/390/1440 px PASS |
| Paramètres | 320/390/768/1440 px PASS |
| Sauvegarde depuis Paramètres | 16 cas PASS |
| Contacts CRUD et droits | 320/390/768/1440 px PASS |
| Contacts erreurs, formulaire obsolète, quota, reprise et lecture seule | PASS |
| Intégration Contacts/Archives | 320/390/768/1440 px PASS |
| Notes du foyer | 320/390/768/1440 px PASS |
| Repas P01 et frontières immédiates E07.4 | 12/12 scripts PASS, empreintes sources inchangées |
| Modèles Courses/P02 et disponibilité Maison | 17 + 5 tests PASS |
| Courses P02 navigateur et effets | 320/390/1440 px PASS ; reprise des animations PASS |
| Courses famille et concurrence | snapshot canonique 8 cas, CRUD, quantités fractionnaires, hors ligne/rechargement, conflits et course concurrente PASS |
| Maison partagée de la liste de courses | 11 scénarios PASS : deux clients, déclarations, hors ligne/reprise, conflits CAS, unités, schéma ancien, import idempotent et permissions |

Les preuves compatibles sont sous `/workspace/scratch/dobby-integrated-final-evidence/` et `/workspace/scratch/dobby-integrated-evidence/` (Paramètres, P01, P02, repas, partage).

31 fichiers de preuves historiques modifiés/non suivis de cette campagne ont été copiés avec SHA-256 sous `/workspace/scratch/dobby-integrated-final-evidence/historical/`. Liste exacte : `/workspace/scratch/dobby-integrated-standard-artifacts.json`. Les chemins originaux sont sous `docs/dobby-v7/evidence/menu-01-08/`, `e07-p01/`, `e07-4/b-ui/` et `e07-4/b-engine/`. Ils n'ont pas été restaurés par cette mission ; l'agent principal peut le faire après archivage.

## Vérifications complémentaires conservées avant Contacts

Ces suites ont entièrement terminé sur `a96675a020d77a1075da19e9e647760eaf7a3c9c`, avant l'intégration finale Contacts. Elles n'ont pas été répétées car Contacts n'a pas modifié leurs modules natifs ; Notes a toutefois été retesté dans la campagne finale ci-dessus.

| Script | Statut | Durée | Log |
| --- | --- | ---: | --- |
| `notes-stitch23.cjs` | PASS | 45.024 s | `/workspace/scratch/dobby-integrated-notes-stitch23.log` |
| `fam-agenda-memos.cjs` | PASS | 33.378 s | `/workspace/scratch/dobby-integrated-fam-agenda-memos.log` |
| `fam-agenda-memos-sync.cjs` | PASS | 20.354 s | `/workspace/scratch/dobby-integrated-fam-agenda-memos-sync.log` |
| `fam-agenda-month.cjs` | PASS | 6.369 s | `/workspace/scratch/dobby-integrated-fam-agenda-month.log` |

Agenda/mémos couvre trois largeurs, deux profils HTTP factices, la reprise hors ligne, les identifiants stables, les notes locales conservées et l'import explicite idempotent.

Contrats/Maison : **8 / 8 scripts PASS**, aucun échec. Rapport détaillé `/workspace/scratch/dobby-integrated-contracts-house.md` : 10 cas limites Contrats, 26 contrôles de documents Maison et sept régressions Maison. Les 37 preuves historiques sont copiées sous `/workspace/scratch/dobby-integrated-evidence/legacy/` ; liste exacte `/workspace/scratch/dobby-integrated-contracts-house-artifacts.json`.

## Passe volontairement interrompue

La première campagne standard sur a96675a a été arrêtée par SIGTERM à la demande de l'agent principal avant le merge Contacts. Ce statut est **interrompu, pas échec de régression**, et a été remplacé par la campagne finale complète PASS. Log conservé : `/workspace/scratch/dobby-integrated-standard-ci-a96675a-interrupted.log`.

Aucun échec n'a nécessité une attribution préexistant/intégration. Le présent rapport ne certifie aucun service distant réel ni compte réel.
