# Revue indépendante fresh-start — PASS

Revue en lecture seule de l'instantané final `stitch19-20-fresh-reset-review-v2`, le 12 novembre 2026. Aucun constat nécessitant une modification n'a été identifié dans le périmètre demandé. Aucun SQL distant, appel Supabase, reset Docker ou changement de fichier applicatif n'a été exécuté par le relecteur.

## Intégrité et périmètre

- Les 18 fichiers du manifeste `sha256.json` correspondent à leurs SHA-256 calculés pendant la revue.
- Les copies préparées `06`, `07` et `08` sont strictement identiques à leur modèle après le seul remplacement de `selected_household uuid := NULL::uuid` par l'UUID du foyer confirmé. Aucun identifiant Auth n'est requis ni affiché par ces scripts. Les modèles du dépôt gardent `NULL` et refusent ainsi une exécution non renseignée.
- Les faits de `live-facts.json` correspondent aux gardes : deux comptes Auth, un foyer V2, deux appartenances propriétaires, six modules aux révisions indiquées, registre canonique vide, trois comptes privés V7 à zéro et deux appartenances V1 actives indépendantes.

## Constats vérifiés

1. **Mutation minimale et atomique.** `source/06-disable-test-memberships.sql:79` ne modifie que `active=false` sur les deux anciennes lignes propriétaires du foyer choisi. Le contrôle de cardinalité à la ligne 82 et l'absence de toute autre DML métier évitent une désactivation globale. Les métadonnées d'appartenance hors `active`, les lignes complètes des modules et les identités Auth sont comparées avant/après aux lignes 74–88. Aucun `DELETE`, changement de clé, rôle, schéma, droit, helper ou policy n'est introduit. Les FK vers les appartenances et le foyer demeurent satisfaites.
2. **Gardes contre l'état erroné et la concurrence normale des RPC.** Les gardes `06:30`–`06:72` refusent les comptes, foyers, appartenances, rôles, modules, triggers ou états privés différents. `row_security=off` empêche de confondre des lignes publiques masquées avec un zéro. L'appel privé utilise le helper existant sous `row_security=on` (`06:68`), nécessaire avec les tables privées FORCE RLS. Les verrous de compte reprennent ceux des RPC V7 ; les lignes d'appartenance sont verrouillées avant le verrou SHARE des modules (`06:19`–`06:27`), conformément à l'ordre appartenance puis module du writer Missions. Les délais bornent l'attente et une exception annule la transaction.
3. **Le nouveau parcours est cohérent avec le contexte V7.** `source/01-apply.sql:227` ne rejette un compte non lié que lorsqu'une appartenance V2 active demeure. Après cette désactivation, les comptes sans fiche provisoire retrouvent donc la phase `profile`, puis la création d'un nouveau foyer ou l'acceptation d'une invitation. Le script `04` n'est ni appelé ni nécessaire.
4. **Vérification indépendante en lecture seule.** `source/07-verify-fresh-start.sql:4` utilise une transaction REPEATABLE READ READ ONLY. Il exige les deux anciennes lignes inactives, l'absence de toute appartenance V2 active, les deux Auth attendus, les six modules aux révisions attendues, les compteurs privés nuls et les deux lignes V1 toujours actives (`07:11`–`07:39`). Son JSON ne révèle ni identifiants Auth, profils ni jetons.
5. **Retour arrière limité.** `source/08-rollback-test-memberships.sql:80` ne réactive que les deux anciennes lignes. Les gardes refusent un nouveau foyer ou une autre appartenance, ainsi qu'une fiche provisoire, liaison ou invitation V7 (`08:31`–`08:73`). La comparaison hors `active` et l'exigence de deux lignes modifiées sont conservées (`08:82`–`08:89`).
6. **Mode opératoire conforme.** `source/REPARTIR-FOYER-TEST.md:21`–`:26` impose le seul projet familial, l'exécution manuelle par l'utilisateur de `06` puis `07` avant le parcours et la gestion prudente des anciennes associations locales. Les lignes 7 et 30–34 interdisent le rattachement historique `04`, précisent la limite du retour arrière et distinguent preuve locale et résultat distant.

## Preuves locales examinées

Le journal fourni contient cinq groupes PASS, et les trois hashes SQL inscrits dans le résultat correspondent aux fichiers revus. Les assertions du runner couvrent les refus sans mutation, la conservation complète Auth/V1/foyer/modules et des métadonnées d'appartenance, le retour arrière exact avant bootstrap, puis le parcours des deux comptes fictifs avec création d'un nouveau foyer, invitation et refus d'un retour tardif (`stitch19-20-test-fresh-start.py:29`–`:76`).

Le harness figé exige Docker sans réseau ni port publié (`source/tests/run-local.py:23`–`:24`), exécute les scripts sous l'installateur NOSUPERUSER/NOBYPASSRLS (`:29`–`:40`, `:72`–`:78`) et l'inspection Docker fournie confirme `networkMode: none`. La revue a inspecté ces preuves ; elle n'a pas relancé le harness.

Limites de cette preuve : PostgreSQL local 17.7 contre 17.11 pour le diagnostic réel, table Auth fictive réduite et guard privé Missions explicitement simulé. Aucun module Missions n'est modifié par `06` ou `08`. Le résultat distant reste à établir par l'exécution manuelle utilisateur et le JSON de `07` ; cette revue ne constate aucune désactivation déjà effectuée à distance.
