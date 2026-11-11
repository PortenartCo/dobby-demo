# DOBBY E07.4 — Consolidation de revue

Branche : `feat/dobby-e074-consolidation-20261111`, worktree indépendant `/workspace/dobby-e074`, depuis le SHA E07.3 testé `c121027e53b335800d1559a39481c774a137a3fa`. Les branches E07.3 et de la revue E01–E06 restent intactes. Aucune fusion applicative sur main.

**E07 reste PARTIEL** : la refonte « Choisir un repas » et « Préparer la liste de courses » est reportée. Photos/PDF familiaux Supabase et vérification physique Safari/iPhone des alertes restent hors périmètre et NON VÉRIFIÉS.

## Code et checkpoints

| Checkpoint | Commit | Changement | Preuves |
|---|---|---|---|
| A | `f108cc7` | Import IA direct, ZIP prioritaire, inconnus enregistrables, liaisons exactes, conservation des originaux et rollback | [Import](E07-4-IMPORT.md) |
| B | `601ecd1` | Fiche simplifiée, méthodes intégrées, calendrier, édition même ID et retrait récupérable | [Fiche](E07-4-FICHE.md), [moteur](E07-4-ENGINE.md) |
| C | `31d5232` | Étapes/ingrédients/images dédiés, minuteurs persistants, fin Stitch et garde du rendu asynchrone | [Cuisson](E07-4-TIMERS.md) |
| D | [`69ef361`](https://github.com/PortenartCo/dobby-demo/commit/69ef361ad139356c2d1473d825f9231e7610b0e4) | Préférences partagées ON/OFF, effets sur toutes les vues E07, profil isolé, CI et preuves | [Résultats locaux](evidence/e07-4/d-integration/results.json) |

La fiche réutilise le total de durée reconnu par le catalogue, y compris les anciennes métadonnées contradictoires. Le V5 historique reste inchangé ; les amendements minimaux du validateur et du writer dans sa copie familiale sont listés par la fixture E07.4 et vérifiés par la garde d’intégrité native. Les préférences utilisent uniquement `st.stitchPreferences` : effets ON par défaut, son OFF ; un OFF explicite reste conservé. Les vues Taverne, Grimoire, Fiche, Cuisine, Import et Courses utilisent la même ambiance existante et respectent la réduction système des animations.

## Vérifications locales et non-régression

25 suites navigateur ciblées terminées : A/B/C, horloges et writers natifs, E07.3 Taverne/catalogue/favoris/effets, courses E07.2, module familial et frontières E01–E08. Les nouveaux parcours E07 sont vérifiés à 320 / 390 / 1440 px. Les tests purs couvrent les formats V1/V2, ZIP dangereux, liaisons, minuteurs, quota et reprise ; aucun test physique iPhone ni synchronisation réelle n’est revendiqué.

- [Résultats consolidés et empreintes des entrées testées](evidence/e07-4/d-integration/results.json).
- [Parcours du bundle local sans interception ni simulation du moteur](evidence/e07-4/preview-local/results.json) : formulaires, imports JSON/ZIP/photos, TM5, doublons, reload, vrais minuteurs courts, calendrier, retrait/restauration, export, cinq destinations et reset à deux onglets. Zéro requête externe, mutation HTTP ou ressource manquante.
- [Effets : classes et pixels des six vues, trois largeurs, OFF/reload, réduction système et silence automatique](evidence/e07-4/d-integration/effects/results.json).
- [Construction du profil isolé reproductible](evidence/e07-4/d-build-green.txt), [génération des sources/CSS identique](evidence/e07-4/d-reproducible-generation.json).
- [Frontières et main relu avant publication](evidence/e07-4/d-integration/main-current-before-publication.json) :21 entrées préexistantes, sources historiques/V5/SQL inchangés. Les quatre racines HTML diffèrent uniquement par les inclusions E07.4 générées.
- [61 décisions et leurs preuves](../MATRICE-E07-4-RESULTATS.csv), [captures avant/après et comparaison Stitch](E07-4-CAPTURES.md).

Le premier parcours de reset du nouveau test a conservé le hash Grimoire après les actions ajoutées, alors que l’assertion reprise d’E07.3 attendait Taverne. Le test revient maintenant explicitement à Taverne avant reset. Seul ce parcours a été rejoué ; les24 suites déjà vertes n’ont pas été répétées. Le journal initial reste conservé. Une autre correction déterministe empêche un ancien refresh catalogue de repeindre la Cuisine après une attente d’hydratation.

## CI, publication et fonctionnement hébergé

[Ouvrir le nouvel aperçu E07.4](https://portenartco.github.io/dobby-demo/essai-dobby-e07-consolidation-review-20261111/).

| Niveau | Verdict et preuve |
|---|---|
| Code modifié | Source testé **`69ef361ad139356c2d1473d825f9231e7610b0e4`**, base E07.3 `c121027…` ; checkpoints A/B/C/D conservés sur la branche dédiée. |
| Tests exécutés |25 suites navigateur locales, tests purs formats/ZIP/minuteurs, rollback et génération reproductible PASS. Les données de travail et leurs empreintes sont distinguées du SHA final commité. |
| Intégration vérifiée | [Stitch V7](https://github.com/PortenartCo/dobby-demo/actions/runs/43062969284) et [Sync natif](https://github.com/PortenartCo/dobby-demo/actions/runs/43062969259) **PASS sur `69ef361ad139356c2d1473d825f9231e7610b0e4`**. Tous les steps des deux jobs sont verts. |
| Publication confirmée | Commit statique **[`31f81cceb6602f83b602d11d6ef0c806a38e07df`](https://github.com/PortenartCo/dobby-demo/commit/31f81cceb6602f83b602d11d6ef0c806a38e07df)**, parent `84e254f…`, [Pages PASS](https://github.com/PortenartCo/dobby-demo/actions/runs/43066016251).283 fichiers ajoutés au seul nouveau sous-arbre ;21 entrées préexistantes inchangées. |
| Fonctionnement hébergé | **PASS à 320 / 390 / 1440 px**, sans interception ni moteur simulé.283 fichiers HTTP identiques au bundle,278 sources comparées aux blobs Git,16 anciens index HTTP identiques. Zéro mutation HTTP, requête externe ou ressource manquante dans le parcours. |

Le manifeste servi indique `sourceSha:69ef361ad139356c2d1473d825f9231e7610b0e4`, `sourceState:committed`, `realBackend:false` et le préfixe indépendant `dobby-review-e074-20261111|`. Son SHA256 est `d593f89221ffac710d1f26bee1dda4eeb791dd10f5e59b60004e0fffba9b533f` ; les trois parcours hébergés observent ce même manifeste.

- [Contrôle final agrégé](evidence/e07-4/publication/final-verification.json), [preuve Git et HTTP fichier par fichier](evidence/e07-4/publication/http-and-git.json).
- [Résultats hébergés des trois largeurs](evidence/e07-4/hosted/results.json), [journal](evidence/e07-4/hosted-green.txt), [preuves CI](evidence/e07-4/ci/stitch.json).
- [Contrôle du manifeste publié](https://portenartco.github.io/dobby-demo/essai-dobby-e07-consolidation-review-20261111/review-manifest.json), [branche Git](https://github.com/PortenartCo/dobby-demo/tree/feat/dobby-e074-consolidation-20261111).

Les deux workflows existaient déjà et se déclenchent sur push ; aucun workflow supplémentaire ni PR n’a été créé. Le mode E07.4 réutilise les tests E07.3 encore valables et adapte les seules attentes remplacées : création manuelle retirée, portée des effets et métadonnées enrichies. Un port local codé en dur dans un test a été paramétré avant la première CI puis vérifié séparément ; aucune nouvelle campagne n’a été relancée pour ce changement de test.

La branche E07.3 reste à `0f410eee…` et la revue parallèle E01–E06 à `9a3e5dbc…`. Aucune branche applicative fusionnée sur main, aucun force-push. La publication est un commit indépendant contenant uniquement le nouvel aperçu statique ; tous les anciens sous-arbres sont inchangés. Le V5 historique et SQL restent intacts ; la copie native familiale comporte seulement les amendements A/B documentés et vérifiés.

La clôture documentaire ajoute les preuves publiées et la matrice finale, **sans modification du code depuis `69ef361ad139356c2d1473d825f9231e7610b0e4`**. Le code et le bundle testés restent épinglés à ce SHA ; le commit de documentation ne nécessite pas de nouvelle exécution des tests applicatifs.

**Matrice finale :61 IDs,52 PASS,9 hors périmètre selon arbitrage** (4 décisions remplacées et5 reports), zéro blocage. Chaque ID conserve son statut initial et ses liens code/tests/preuves.

**E07 reste PARTIEL.** Les pages « Choisir un repas » et « Préparer la liste de courses » attendent leur revue. Synchronisation familiale photo/PDF, compte Supabase réel et alertes physiques Safari/iPhone ne sont pas déclarés vérifiés. Aucun backend effectif, migration ou API IA payante ajouté. Mission arrêtée après publication et vérification hébergée.
