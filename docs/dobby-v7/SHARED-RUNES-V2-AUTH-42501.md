# DOBBY Runes V2 — correctif ciblé 42501 du 11 novembre 2026

Branche indépendante : `fix/dobby-runes-v2-auth-42501-20261111`.
Worktree : `/workspace/dobby-runes-v2-auth-42501`.
Base exacte : `0a8e1ed674bc4abdbfaca29435fa495b19b32df4`, dont le code initial testé est `3ceb14bbf76c7534f6862a7cb1921c894ea3f325`. Aucun `AGENTS.md` applicable trouvé dans cette base ou ses répertoires parents.

## Cause et méthode officielle

L'utilisateur a confirmé que la migration V2 est installée et que le GET de capacité retourne HTTP 403 / PostgreSQL `42501`, « permission denied for schema auth ». Aucun accès au projet `pqcdkrwljgvgagzwrcmg` n'a été effectué pendant cette correction, même en lecture.

La [fiche officielle Supabase sur les rôles personnalisés et le schéma auth](https://supabase.com/kb/troubleshooting/permission-errors-when-granting-custom-roles-access-to-the-auth-schema-9e32e7), consultée le 11 novembre 2026, décrit exactement ce problème : l'opérateur `postgres` ne possède pas l'option de délégation sur ce schéma protégé. Un GRANT peut donc produire un avertissement sans fournir l'accès attendu. Son option 2 recommande un lecteur privé des claims de requête, sans `SECURITY DEFINER` ni accès au schéma `auth`. [Contexte des erreurs 42501](https://supabase.com/kb/troubleshooting/database-api-42501-errors).

Le correctif lit uniquement l'UUID `sub` de `request.jwt.claims`, vérifiés et installés par PostgREST. L'exemple Supabase comprend aussi un fallback legacy ; cette variante DOBBY choisit exclusivement le JSON moderne et refuse une identité absente, vide, non textuelle ou malformée, et ignore un ancien GUC contradictoire. Ce lecteur ne vérifie pas cryptographiquement le JWT : cette frontière reste PostgREST. Aucun identifiant de profil, paramètre client ou `user_metadata` ne donne une autorisation.

## Livraison SQL

- **Installation V2 déjà existante : [SQL correctif autonome complet](../../sql-proposals/dobby-shared-runes-v2-auth-42501.sql).** Copier ce seul fichier dans SQL Editor, sans rejouer la migration initiale.
- **Après installation : [SQL de contrôles complet, en lecture seule](../../sql-proposals/dobby-shared-runes-v2-auth-42501-checks.sql).**
- **Installations futures uniquement : [script de référence corrigé](../../sql-proposals/dobby-shared-runes-v2.sql).**

Le patch est une transaction unique, avec délais locaux de verrouillage et d'exécution. Il ne crée ni table, registre, API publique supplémentaire ou rôle ; il ne modifie aucune ligne, mission, rune ou reçu. La seule nouvelle permission est l'exécution du lecteur privé par le writer. Propriétaires, attributs des rôles, appartenances, grants existants et triggers restent conservés.

| Chemin sous writer | Correction |
|---|---|
| Six politiques : membership, lecture/insertion/mise à jour Missions, lecture/insertion reçus | Identité obtenue par le lecteur privé ; conditions de foyer actif inchangées |
| `lock_active_membership(uuid)` | Même verrou `FOR SHARE`, même propriétaire opérateur, identité lue sans `auth` |
| RPC `dobby_missions_v2_capabilities(uuid)` | Même contrôle d'appartenance et même réponse, sans appel `auth.uid()` |
| RPC `dobby_missions_v2_write(uuid,bigint,uuid,jsonb)` | Seule initialisation de l'acteur remplacée ; CAS, verrous, validateurs, digest et reçus identiques |
| Trigger invoker `dobby_v2_modules_stamp()` | Branche writer vers le lecteur privé ; branche des autres rôles conservant `auth.uid()` |

Les FK existantes vers `auth.users` restent intactes ; leur contrôle interne ne demande pas un accès direct à ce schéma pour le writer. Le helper est `STABLE SECURITY INVOKER SET search_path=''`, privé et sans exécution `PUBLIC`, `anon` ou `authenticated`. Les deux RPC publics restent détenus par le writer, en `SECURITY DEFINER`, sans élargir leurs droits d'exécution. Le writer reste NOLOGIN, NOINHERIT, sans SUPERUSER, BYPASSRLS ou appartenance à `authenticated`.

Le précontrôle compare les corps des quatre fonctions remplacées et les expressions des six politiques à la version initiale revue ou à ce correctif. Un helper déjà présent doit correspondre au corps, propriétaire, attributs et ACL attendus. Une politique supplémentaire dépendant d'`auth.uid()` effective pour le writer fait annuler toute la transaction. Ces contrôles empêchent d'écraser silencieusement une adaptation locale.

Les empreintes des expressions RLS sont vérifiées sous `search_path=''` et testées sur PostgreSQL 17.11. Une autre définition, modification de mise en forme du corps ou différence de déparsing d'une version PostgreSQL peut faire refuser le précontrôle : arrêter et examiner l'objet nommé, sans retirer la protection ni ajouter de privilèges. Le schéma hébergé n'a pas été interrogé ici.

## Tests PostgreSQL locaux

Environnement : image officielle PostgreSQL 17.11 figée par digest, conteneur dédié `dobby-runes-v2-test-20261111-auth-42501`, label distinct, réseau `none`, aucun port exposé, stockage temporaire. L'ancien conteneur et les autres worktrees restent intacts. Les requêtes clientes utilisent l'authenticator fictif non-superuser ; les claims sont des fixtures, sans Supabase Auth/PostgREST hébergé.

- **19/19 scénarios ciblés PASS**, [résultats](evidence/shared-runes-v2/auth-42501/results.json). Installation immuable d'origine dans la fixture, données V1 et reçu déjà créés ; suppression réelle de `USAGE auth` et de l'exécution `auth.uid()` pour writer ; reproduction `42501` avant patch. Puis application du seul correctif, sans réexécution de la migration initiale.
- Refus des identités absentes/invalides, rôle anon, non-membre, autre foyer et membre inactif ; succès d'un membre actif, acteur et `updated_by` provenant du JSON moderne malgré un GUC legacy différent.
- Rejeu d'un reçu antérieur, CAS, immutabilité, garde contre les écritures Missions V1 et refus de l'accès client aux helpers/reçus/rôle writer.
- INSERT/UPDATE des cinq autres modules, révisions et stamp `auth.uid()` inchangés ; conservation exacte des données, rôles et ACL existants à l'installation et à la réapplication du patch.
- Rollback DDL/ACL injecté, divergences de fonction/helper/policy refusées sans écrasement, réapplication idempotente. Les contrôles SQL complets passent dans une transaction en lecture seule : [sortie](evidence/shared-runes-v2/auth-42501/checks.log).
- Opérateur SQL Editor fictif non-superuser, sans BYPASSRLS, CREATEROLE ou accès `auth` : droits de propriétaire et appartenance de maintenance déjà établis dans la fixture, puis patch réappliqué et capacité/écriture réussies sans changement supplémentaire de droits par le patch.
- **51/51 scénarios PostgreSQL historiques PASS**, dont les quatre scénarios de concurrence et les contrôles de rollback/sauvegarde-restauration : [résultats](evidence/shared-runes-v2/auth-42501/postgres/results.json), [verrous et concurrence](evidence/shared-runes-v2/auth-42501/postgres/concurrency.json).
- **10/10 tests client natif → PostgreSQL PASS**, dont reprise, rejeu après COMMIT et préservation des dates V1 : [résultats](evidence/shared-runes-v2/auth-42501/client-postgres/results.json). Les anciens fichiers de preuve restent inchangés.

**80 contrôles locaux PASS, aucun échec.** [Bilan et empreintes des trois fichiers SQL](evidence/shared-runes-v2/auth-42501/verification.json). Le patch testé a pour SHA-256 `fc72c5550fccc8d5568071fa4d40b8faa2b447ba51a566b0e129a610e6fab34d`. Aucune campagne navigateur ni CI GitHub n’a été lancée pour ce correctif SQL ; les sources applicatives et la maquette sont inchangées.

Commandes reproductibles et garde d'isolation : [README des tests](../../tests/shared-runes-v2/README.md). Les deux suites historiques testent séparément la référence future sur des données fictives ; elles n'exécutent aucune migration sur le projet hébergé.

## Contrôles manuels après installation

1. Utiliser l'opérateur propriétaire/membre déjà autorisé par la migration installée. Exécuter uniquement le patch complet. S'il refuse une divergence, conserver ce refus et examiner l'objet indiqué ; ne pas ajouter `USAGE auth`, `authenticated`, SUPERUSER ou BYPASSRLS.
2. Exécuter le fichier de contrôles en lecture seule : corps corrigés reconnus, helper privé invoker/stable, RPC toujours détenus par writer, RLS et triggers présents, aucune modification de membre/reçu autorisée au writer. L'absence de `USAGE auth` pour writer est normale et doit rester compatible.
3. Comparer les nombres de modules/révisions/reçus avec les relevés et sauvegardes antérieurs. Le patch ne les modifie pas.
4. Recharger le pilote pour renouveler sa sonde de capacité. Avec le JWT réel d'un membre actif, le GET `dobby_missions_v2_capabilities` doit répondre avec `protocol:2`, `maxPayloadBytes:262144`, `directWritesBlocked:true`, `ledgerVersions:[1,2]`, sans erreur de schéma `auth`.
5. Vérifier les refus anon/non-membre/inactif et les lectures des autres modules. Ne pas placer de JWT, mot de passe ou clé dans Git. La recette d'écriture réelle et les deux comptes familiaux restent distincts des fixtures livrées.

**Statut : correctif testé localement ; installation et validation Supabase hébergée non effectuées.** Aucune fusion, publication Pages, modification d'interface, Cuisine/Courses ou autre branche. L'exécution dans SQL Editor reste manuelle.
