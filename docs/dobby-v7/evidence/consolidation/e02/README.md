# E02 — Preuves de consolidation du 11 novembre 2026

Référence de départ : `a84f67a`. Source locale servie depuis la branche intégrée ; aucun compte réel ni service Supabase utilisés. Ces preuves ne constituent pas une validation physique Safari/iPhone ni la recette d'une publication.

| Exigence | Modification et preuve | Résultat source |
|---|---|---|
| E02-01 | `chat.js mount()` / `chat.css` : hero de 252–300 px, asset Stitch original, centrage, images décodées, géométrie sans recadrage vertical aux trois largeurs de revue | PASS 320/390/1440 |
| E02-02 | Session de brouillon multisegments, résultats cumulatifs sans duplication, aucun envoi sur final/end/error, arrêt/reprise/annulation, sauvegarde des partiels et protection contre callbacks tardifs/navigation/changement de compte | PASS, frontières vocales simulées |
| E02-03 | Writers natifs : ajout Courses persisté, doublon empêché, consultation puis clic vers la même liste E07 et rechargement, liens Missions/Agenda/Documents ; demande non prise en charge explicitée | PASS source locale |

Les captures `before-320/390/1440.png` précèdent le correctif. `after-320/390/1440.png` montrent la nouvelle composition après décodage des images. `keyboard-simulated-*.png` montrent seulement un viewport réduit, sans clavier matériel. `dictation-paused-simulated-390.png` montre une dictée conservée avant tout envoi.

Commandes réellement exécutées avec `DOBBY_TEST_ORIGIN=http://127.0.0.1:8789` :

- `E02_BASELINE=1 node essai-stitch-v7/tests/e02-consolidation.cjs` : captures avant.
- `node essai-stitch-v7/tests/e02-consolidation.cjs` : RED observé, premier segment final créant un échange (`1 !== 0`), puis PASS 390/320/1440 après correction. Un second RED a reproduit l'écrasement d'une correction manuelle par un final tardif lorsque `stop()` termine de façon asynchrone ; le test passe après invalidation immédiate de l'ancienne instance.
- `node essai-stitch-v7/tests/e02.cjs` : PASS 320/390/1440, assertions métier, source Stitch et historique ancien conservées.
- `node essai-stitch-v7/tests/e02-voice-history.cjs` : PASS, historique de plus de 24 échanges, isolation A/B, reprise de page en cache, suppression d'échange, synthèse et préférence Son. Les anciens déclenchements automatiques ont été remplacés dans le scénario par une action explicite Envoyer.
- `node essai-stitch-v7/tests/e02-edge.cjs` : PASS, parsing, liens, confirmations périmées, échecs de writer, confidentialité, effets et viewport visuel simulé.
- `node --check` sur `chat.js`, `e02-consolidation.cjs` et `e02-voice-history.cjs` : PASS.

`results.json` provient du nouveau scénario. Les captures et le résultat de la suite historique sont isolés dans `legacy-suite/`. Les profils de test sont éphémères ; le stockage IndexedDB et les écritures dans la liste native sont réels. `SpeechRecognition`, `speechSynthesis` et la sortie d'identité native sont simulés à leurs frontières. Aucun résultat n'atteste la synchronisation entre vrais comptes, une voix Safari disponible, une permission matérielle ou la tolérance réelle aux pauses sur iPhone.

La [recette du bundle intégré local](bundle/README.md), puis la [recette réellement hébergée du 11 novembre 2026](hosted/README.md), ont également passé 320/390/1440 px. La recette hébergée conserve son journal, ses résultats JSON, ses captures et son exécution horodatée avec `exitCode: 0`. Les mêmes limites matérielles et d'identité simulée s'appliquent.
