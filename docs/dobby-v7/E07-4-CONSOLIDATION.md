# DOBBY E07.4 — Consolidation de revue

Branche : `feat/dobby-e074-consolidation-20261111`, worktree indépendant `/workspace/dobby-e074`, depuis le SHA E07.3 testé `c121027e53b335800d1559a39481c774a137a3fa`. Les branches E07.3 et de la revue E01–E06 restent intactes. Aucune fusion applicative sur main.

**E07 reste PARTIEL** : la refonte « Choisir un repas » et « Préparer la liste de courses » est reportée. Photos/PDF familiaux Supabase et vérification physique Safari/iPhone des alertes restent hors périmètre et NON VÉRIFIÉS.

## Code et checkpoints

| Checkpoint | Commit | Changement | Preuves |
|---|---|---|---|
| A | `f108cc7` | Import IA direct, ZIP prioritaire, inconnus enregistrables, liaisons exactes, conservation des originaux et rollback | [Import](E07-4-IMPORT.md) |
| B | `601ecd1` | Fiche simplifiée, méthodes intégrées, calendrier, édition même ID et retrait récupérable | [Fiche](E07-4-FICHE.md), [moteur](E07-4-ENGINE.md) |
| C | `31d5232` | Étapes/ingrédients/images dédiés, minuteurs persistants, fin Stitch et garde du rendu asynchrone | [Cuisson](E07-4-TIMERS.md) |
| D | Commit de code désigné par le manifeste final et les CI ci-dessous | Préférences partagées ON/OFF, effets sur toutes les vues E07, profil isolé, CI et preuves | [Résultats locaux](evidence/e07-4/d-integration/results.json) |

La fiche réutilise le total de durée reconnu par le catalogue, y compris les anciennes métadonnées contradictoires. Le V5 historique reste inchangé ; les amendements minimaux du validateur et du writer dans sa copie familiale sont listés par la fixture E07.4 et vérifiés par la garde d’intégrité native. Les préférences utilisent uniquement `st.stitchPreferences` : effets ON par défaut, son OFF ; un OFF explicite reste conservé. Les vues Taverne, Grimoire, Fiche, Cuisine, Import et Courses utilisent la même ambiance existante et respectent la réduction système des animations.

## Vérifications locales et non-régression

25 suites navigateur ciblées terminées : A/B/C, horloges et writers natifs, E07.3 Taverne/catalogue/favoris/effets, courses E07.2, module familial et frontières E01–E08. Les nouveaux parcours E07 sont vérifiés à320/390/1440px. Les tests purs couvrent les formats V1/V2, ZIP dangereux, liaisons, minuteurs, quota et reprise ; aucun test physique iPhone ni synchronisation réelle n’est revendiqué.

- [Résultats consolidés et empreintes des entrées testées](evidence/e07-4/d-integration/results.json).
- [Parcours du bundle local sans interception ni simulation du moteur](evidence/e07-4/preview-local/results.json) : formulaires, imports JSON/ZIP/photos, TM5, doublons, reload, vrais minuteurs courts, calendrier, retrait/restauration, export, cinq destinations et reset à deux onglets. Zéro requête externe, mutation HTTP ou ressource manquante.
- [Effets : classes et pixels des six vues, trois largeurs, OFF/reload, réduction système et silence automatique](evidence/e07-4/d-integration/effects/results.json).
- [Construction du profil isolé reproductible](evidence/e07-4/d-build-green.txt), [génération des sources/CSS identique](evidence/e07-4/d-reproducible-generation.json).
- [Frontières et main relu avant publication](evidence/e07-4/d-integration/main-current-before-publication.json) :21entrées préexistantes, sources historiques/V5/SQL inchangés. Les quatre racines HTML diffèrent uniquement par les inclusions E07.4 générées.
- [61 décisions et leurs preuves](../MATRICE-E07-4-RESULTATS.csv), [captures avant/après et comparaison Stitch](E07-4-CAPTURES.md).

Le premier parcours de reset du nouveau test a conservé le hash Grimoire après les actions ajoutées, alors que l’assertion reprise d’E07.3 attendait Taverne. Le test revient maintenant explicitement à Taverne avant reset. Seul ce parcours a été rejoué ; les24suites déjà vertes n’ont pas été répétées. Le journal initial reste conservé. Une autre correction déterministe empêche un ancien refresh catalogue de repeindre la Cuisine après une attente d’hydratation.

## CI, publication et fonctionnement hébergé

État de préparation avant commit D : **code modifié et contrôles locaux PASS ; CI du SHA commité, publication et parcours hébergés encore à confirmer**. Les résultats locaux portent sur le code de travail D et ses empreintes, pas sur un SHA faussement présenté comme commité. Le manifeste E07.4 distingue désormais `working-tree` de `committed`.

Les deux workflows existants se déclenchent sur push : Stitch V7 pour les sources et le profil, Sync pour les amendements natifs A/B. Le dispatch E07.4 remplace uniquement les assertions devenues caduques (création manuelle retirée, nouvelle portée des effets et métadonnées enrichies) et conserve la campagne historique. Aucun nouveau workflow.

Publication autorisée : seul `essai-dobby-e07-consolidation-review-20261111/` sera ajouté depuis un checkout distinct sur main, après CI vertes. Les arbres existants seront comparés au parent de publication ; le manifeste, les octets HTTP et les parcours hébergés seront ensuite vérifiés. La matrice conserve B04 en attente de cette preuve jusqu’à vérification effective.

URL prévue : https://portenartco.github.io/dobby-demo/essai-dobby-e07-consolidation-review-20261111/

La section finale sera complétée avec SHA source réellement testé, liens CI, commit de publication, empreintes HTTP et verdict hébergé. Aucun backend effectif, migration Supabase, API IA payante ou synchronisation photo prétendue.
