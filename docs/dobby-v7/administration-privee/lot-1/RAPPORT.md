# Administration privée DOBBY — Lot 1 local

17 novembre 2026. Réalisation limitée au **Lot 1** de l’[issue #19](https://github.com/PortenartCo/dobby-demo/issues/19), selon la [conception](https://github.com/PortenartCo/dobby-demo/blob/440cc2394c2dd5e9865a9b71fcd17b43e351f034/docs/dobby-v7/administration-privee/CONCEPTION-2026-11-17.md) et le [plan validés](https://github.com/PortenartCo/dobby-demo/blob/440cc2394c2dd5e9865a9b71fcd17b43e351f034/docs/dobby-v7/administration-privee/PLAN-2026-11-17.md). Base de branche : `a637b8f9208a44479ccd87b82ba9d09d66cec75e`, dernier `origin/main` vérifié au démarrage. Aucun AGENTS.md applicable trouvé. Les PR #26/#27 et le chantier saisonnier ne sont pas modifiés.

## Livré

- [Migration additive candidate](../../../../supabase/migrations/20261117203208_dobby_private_access_foundation.sql), créée par `supabase@3.2.0 migration new`. **Aucun UUID réel ni amorçage automatique** : l’installation laisse les registres vides.
- Schéma non exposé `dobby_access_private` : propriétaire unique immuable, autorisations actives/suspendues, admissions nominatives et décisions append-only ; RLS activée/forcée, tables sans grants navigateur.
- Rôles techniques NOLOGIN/NOBYPASSRLS sans privilèges métier ; héritage/SET retirés de l’installateur à la fin de la transaction. ACL des fonctions fermées avant les grants API explicites.
- Prédicats `is_active()`, `assert_active()`, `assert_owner()` ; contexte propre au sujet, refus par défaut, aucun rôle issu d’un e-mail ou de `user_metadata`. `assert_active()` prend le verrou partagé que le Lot 2 devra utiliser avant ses écritures.
- RPC de métadonnées `dobby_access_set_status(uuid,text,bigint,uuid,boolean)` : propriétaire seul, confirmation, CAS, idempotence, suspension atomique avec révocation des admissions ouvertes/droit de création, historique minimal. Seul ce chemin propriétaire peut réactiver ; il impose une session créée **après** la réactivation. Un rejeu retourne l’état courant sans réappliquer une décision ancienne.
- Amorçage privé, réservé à l’installateur : manifeste explicite du propriétaire et de deux comptes à conserver, comparaison aux liaisons canoniques existantes, transaction annulée si absent/ambigu, refus de rejouer un amorçage. Aucun profil ni foyer créé/remplacé ; aucun autre Auth enrôlé.
- [Contrat TypeScript](../../../../supabase/functions/_shared/dobby-access-contract.ts), [fixture](../../../../tests/private-access/fixtures.sql) et [tests](../../../../tests/private-access/admission.test.mjs). Aucun endpoint Edge ou client d’administration déployable n’est ajouté.

## Preuves exécutées

| Contrôle | Résultat et limites |
|---|---|
| Nouvelle suite DB | **23/23 PASS**, 0 échec/omission. PostgreSQL réel 17.7, conteneur jetable `--network none`, sans port ni montage hôte. Image épinglée par digest. L’installateur est `postgres NOSUPERUSER NOBYPASSRLS CREATEROLE` ; le test SET ROLE utilise une connexion cliente non superuser distincte. |
| Régression native | **444/444 PASS**, 0 échec/omission : suites existantes Sync V1, Sync V2 et famille. Ce sont de nouvelles exécutions locales, distinctes des 83 tests annoncés lors de l’audit précédent. |
| TDD | Échec observé avant implémentation sur l’API absente (`42883`). Une contre-épreuve supplémentaire a détecté l’accès PUBLIC à une fonction de maintenance avant correction des ACL ; le client direct est désormais refusé. |
| Conservation | Avant/après migration et après les tests annulés : mêmes lignes Auth, sessions, foyers, liens TEXT, données/révisions et ledger fictifs ; mêmes ACL/RLS et définitions des objets préexistants modélisés. Les tables et policies publiques sont reprises du catalogue de test déjà publié. Aucun stub Missions privé n’est chargé ou utilisé pour conclure. |
| Isolation propriétaire | Le propriétaire applicatif ne lit pas le foyer fictif H2 ; les rôles d’accès n’obtiennent aucun SELECT sur les payloads ou appartenances. Le registre propriétaire, sa suspension/suppression et l’historique sont protégés, y compris contre les DML directs de maintenance testés. |
| Sessions | Session inexistante, mauvais sujet, absence de `session_id`, session expirée, anciens JWT simulés et refresh d’une ancienne session refusés. Une session créée pendant la suspension reste refusée après réactivation ; une session créée après est acceptée. Perte d’un grant de lecture : refus fermé. |

Les claims JWT sont **simulés en SQL** ; aucune connexion GoTrue, validation cryptographique JWT, API PostgREST, requête Storage, UI, compte réel ou fichier réel n’est certifié ici. Le modèle Auth local reproduit les colonnes nécessaires, pas toute la plateforme Supabase. Les fonctions métier privées réelles ne sont ni reproduites ni publiées. Le code métier suivi par Git reste inchangé.

## Permissions de sessions : limite de déploiement explicite

La migration **n’accorde aucun droit sur le schéma géré Auth**. Le lecteur technique ne peut être activé qu’après `USAGE(auth)` et `SELECT(id,user_id,created_at,not_after)` sur `auth.sessions`. Pas de SELECT sur `auth.users`, les e-mails ou les secrets de refresh, pas d’écriture Auth. L’activation reste fermée tant que ces droits manquent ; une disparition ultérieure d’un droit est aussi refusée.

Le test démontre ces ACL dans un modèle où le propriétaire fictif du schéma géré peut donner les grants exacts. Il ne prouve **pas** que l’installateur du projet hébergé possède cette capacité, ni qu’il puisse prendre le rôle géré. **Le passage distant reste bloqué** jusqu’à une vérification autorisée des permissions et d’un moyen légitime de les fournir. Ne pas essayer de promouvoir un rôle, d’utiliser BYPASSRLS, de changer l’owner Auth ou de reproduire un `SET ROLE supabase_auth_admin` de fixture dans un projet réel.

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

## Reprise

Suivre le [préflight](../deploiement/preflight.md), la [vérification locale](../deploiement/verification.md) et le [rollback conservateur](../deploiement/rollback.md). Aucune de ces procédures n’autorise une opération distante. L’environnement de test et tous ses comptes sont fictifs ; le conteneur est supprimé en fin d’exécution. Les manifests réels, catalogues bruts et secrets doivent rester hors du dépôt public.
