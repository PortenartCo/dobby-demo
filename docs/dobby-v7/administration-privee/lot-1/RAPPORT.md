# Administration privée DOBBY — Lot 1 local

17 novembre 2026. Réalisation limitée au **Lot 1** de l’[issue #19](https://github.com/PortenartCo/dobby-demo/issues/19), selon la [conception](https://github.com/PortenartCo/dobby-demo/blob/440cc2394c2dd5e9865a9b71fcd17b43e351f034/docs/dobby-v7/administration-privee/CONCEPTION-2026-11-17.md) et le [plan validés](https://github.com/PortenartCo/dobby-demo/blob/440cc2394c2dd5e9865a9b71fcd17b43e351f034/docs/dobby-v7/administration-privee/PLAN-2026-11-17.md). Base de branche : `a637b8f9208a44479ccd87b82ba9d09d66cec75e`, dernier `origin/main` vérifié au démarrage. Aucun AGENTS.md applicable trouvé. Les PR #26/#27 et le chantier saisonnier ne sont pas modifiés.

## Livré

- [Migration additive candidate](../../../../supabase/migrations/20261117203208_dobby_private_access_foundation.sql), créée par `supabase@3.2.0 migration new`. **Aucun UUID réel ni amorçage automatique** : l’installation laisse les registres vides.
- Schéma non exposé `dobby_access_private` : propriétaire unique immuable, autorisations actives/suspendues, admissions nominatives et décisions append-only ; RLS activée/forcée, tables sans grants navigateur.
- Rôles techniques NOLOGIN/NOBYPASSRLS sans privilèges métier ; héritage/SET retirés de l’installateur à la fin de la transaction. ACL des fonctions fermées avant les grants API explicites.
- Prédicats `is_active()`, `assert_active()`, `assert_owner()` ; contexte propre au sujet, refus par défaut, aucun rôle issu d’un e-mail ou de `user_metadata`. `assert_active()` prend le verrou partagé que le Lot 2 devra utiliser avant ses écritures.
- RPC de métadonnées `dobby_access_set_status(uuid,text,bigint,uuid,boolean)` : propriétaire seul, confirmation, CAS, idempotence, suspension atomique avec révocation des admissions ouvertes/droit de création, historique minimal. La réactivation reste fermée jusqu’à `dobby_access_finalize_reactivation(uuid,bigint)`, appelée dans une **transaction séparée** : sa borne ne peut précéder le commit de la décision de réactivation. Un rejeu retourne l’état courant sans déplacer cette borne ni réappliquer une décision ancienne. Le registre et la borne de session du propriétaire sont protégés.
- Amorçage privé, réservé à l’installateur : manifeste explicite du propriétaire et de deux comptes à conserver, comparaison aux liaisons canoniques existantes, transaction annulée si absent/ambigu, refus de rejouer un amorçage. Aucun profil ni foyer créé/remplacé ; aucun autre Auth enrôlé.
- [Contrat TypeScript](../../../../supabase/functions/_shared/dobby-access-contract.ts), [fixture](../../../../tests/private-access/fixtures.sql) et [tests](../../../../tests/private-access/admission.test.mjs). Aucun endpoint Edge ou client d’administration déployable n’est ajouté.

## Preuves exécutées

| Contrôle | Résultat et limites |
|---|---|
| Nouvelle suite DB | **28/28 PASS**, 0 échec/omission. PostgreSQL réel 17.7, conteneurs jetables `--network none`, sans port ni montage hôte. Image épinglée par digest. L’installateur fictif reproduit `postgres NOSUPERUSER BYPASSRLS CREATEROLE`, conformément au test familial public existant ; la migration ne lui accorde jamais BYPASSRLS. Le test SET ROLE utilise une connexion cliente non superuser distincte. |
| Régression native | **444/444 PASS**, 0 échec/omission : suites existantes Sync V1, Sync V2 et famille. Ce sont de nouvelles exécutions locales, distinctes des 83 tests annoncés lors de l’audit précédent. |
| TDD et relecture | RED initial sur l’API absente (`42883`), puis contre-épreuve de fermeture des fonctions de maintenance. La relecture indépendante a conduit à six contre-épreuves RED supplémentaires ; la suite finale passe. Le chemin `bootstrap_apply` a été supprimé : le seul amorçage installateur vérifie le manifeste complet. |
| Conservation | Avant/après migration, **dans la transaction amorcée avant son annulation** et après les tests : mêmes lignes Auth, sessions, foyers, liens TEXT, données/révisions et ledger fictifs ; mêmes ACL/RLS et définitions des objets préexistants modélisés. Les tables et policies publiques sont reprises du catalogue de test déjà publié. `account_links` reproduit aussi FORCE RLS et sa policy writer ; un installateur privé de visibilité canonique est refusé. Aucun stub Missions privé n’est chargé ou utilisé pour conclure. |
| Isolation propriétaire | Le propriétaire applicatif ne lit pas le foyer fictif H2 ; les rôles d’accès n’obtiennent aucun SELECT sur les payloads ou appartenances. Le registre propriétaire, sa suspension/suppression et l’historique sont protégés, y compris contre les DML directs de maintenance testés. |
| Sessions | Session inexistante, mauvais sujet, absence de `session_id`, session expirée, anciens JWT simulés et refresh d’une ancienne session refusés. **Deux connexions réelles à PostgreSQL** créent une session pendant que la réactivation reste non commitée : elle est refusée ensuite. Une session créée après la borne post-commit est acceptée ; finaliser dans la transaction initiale est refusé. Perte d’un grant : refus fermé. Privilèges Auth trop larges : activation refusée. Un contexte à session invérifiable reste neutre. |

Les claims JWT sont **simulés en SQL** ; aucune connexion GoTrue, validation cryptographique JWT, API PostgREST, requête Storage, UI, compte réel ou fichier réel n’est certifié ici. Le modèle Auth local reproduit les colonnes nécessaires, pas toute la plateforme Supabase. Les fonctions métier privées réelles ne sont ni reproduites ni publiées. Le code métier suivi par Git reste inchangé.

## Permissions de sessions : limite de déploiement explicite

La migration **n’accorde aucun droit sur le schéma géré Auth**. Le lecteur technique ne peut être activé qu’après `USAGE(auth)` et `SELECT(id,user_id,created_at,not_after)` sur `auth.sessions`. Pas de SELECT sur `auth.users`, les e-mails ou les secrets de refresh, pas d’écriture Auth. L’activation reste fermée tant que ces droits manquent ; une disparition ultérieure d’un droit est aussi refusée.

Le test démontre ces ACL dans un modèle où le propriétaire fictif du schéma géré peut donner les grants exacts ; les grants de table, de colonnes supplémentaires et d’écriture Auth sont refusés par le contrôle d’activation. Il ne prouve **pas** que l’installateur hébergé possède cette capacité, ni qu’il puisse prendre le rôle géré. La visibilité des liaisons canoniques sous FORCE RLS est également un prérequis : sa présence documentée dans l’ancien modèle installateur n’est pas une nouvelle preuve distante. **Le passage distant reste bloqué** jusqu’à vérification autorisée de ces capacités préexistantes. Ne pas promouvoir un rôle, ajouter BYPASSRLS, changer l’owner Auth ou reproduire un `SET ROLE supabase_auth_admin` de fixture dans un projet réel.

## État des scénarios du plan

| Scénario | État à l’issue du Lot 1 |
|---|---|
| T01 | **PARTIEL PASS** : isolation du foyer et absence de nouveaux droits métier dans le modèle local. Ensemble des tables/RPC/fichiers/API : **EN ATTENTE Lot 2**. |
| T02 | **PARTIEL PASS** : absence d’autorisation refuse les nouveaux prédicats ; pas d’auto-enrôlement des Auth. Fermeture signup et blocage des anciennes API : **EN ATTENTE**. |
| T10 | **PARTIEL PASS** : amorçage des deux identités fictives et conservation vérifiés. Vraies connexions/refresh/récupération et comptes réels : **EN ATTENTE**. |
| T12 | **PARTIEL PASS** : propriétaire exclusif, anti-auto-blocage, ACL, absence d’accès métier supplémentaire et journal vérifiés. Console/API Edge : **EN ATTENTE Lots 3–4**. |
| Suspension/réactivation | **PASS du contrat SQL local** décrit ci-dessus ; application aux anciennes RPC, REST et fichiers : **EN ATTENTE Lot 2**. |
| T03/T04/T06/T07/T08/T09/T11/T13 | **EN ATTENTE**. Admissions stockées et invalidées, mais ni approbation/envoi/consommation, ni rattachement, Storage, concurrence multi-session ou UI nouveaux ne sont livrés. |

**Les nouvelles autorisations ne ferment pas encore les anciennes API.** Aucun helper existant n’est remplacé et aucune policy métier/Storage n’est modifiée. Le Lot 2 doit brancher les guards sur toutes les entrées, y compris les writers privilégiés, les replays, V1 et Storage ; le Lot 3 doit contrôler approbations, UUID/génération, expiration et consommation des admissions. Les flags familiaux/V3 et les inscriptions publiques restent inchangés.

## Choix de réalisation et reprise

Les choix sont consignés : fixture limitée aux définitions publiques disponibles (pas de certification des RPC privées), privilèges hébergés laissés comme prérequis bloquants, installateur fictif conforme au modèle BYPASSRLS déjà documenté sans ajout de ce droit dans la migration, et réactivation en deux phases pour éviter une borne antérieure au commit. Si la seconde phase n’est pas réalisée, l’accès reste fermé ; le futur client du Lot 3 devra attendre sa confirmation. Aucun état ne doit être déverrouillé manuellement pour contourner cette reprise.

Suivre le [préflight](../deploiement/preflight.md), la [vérification locale](../deploiement/verification.md) et le [rollback conservateur](../deploiement/rollback.md). Aucune de ces procédures n’autorise une opération distante. L’environnement de test et tous ses comptes sont fictifs ; le conteneur est supprimé en fin d’exécution. Les manifests réels, catalogues bruts et secrets doivent rester hors du dépôt public.
