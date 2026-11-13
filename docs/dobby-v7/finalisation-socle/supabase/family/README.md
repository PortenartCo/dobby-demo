# S10/F08/F09 — socle familial et rattachement enfant

**Installation utilisateur confirmée le 13 novembre 2026.** Le lot regroupé `10`, Storage `11` et la vérification `20` ont réussi ; les cinq policies Storage attendues sont présentes. Ne pas rejouer les installations ni le diagnostic. Le [résumé hébergé](../../evidence/hosted-installation-summary.json) décrit ces preuves de catalogue ; les contrôles RPC/RLS et Auth réels restent distincts, avec tous les flags clients fermés.

**État : CODE_DÉVELOPPÉ / TESTS_PASS locaux ; installation réelle non effectuée par l'agent.** Ce lot est adapté au catalogue familial PostgreSQL 17.11 reçu le 13 novembre 2026. Aucun résultat de fixture ne certifie Supabase Auth, les RPC/RLS hébergées ou une recette navigateur réelle.

Le lot ne recrée aucun compte ou foyer. Les liaisons existantes, profils, choix magiques, Missions, crédits et reçus sont conservés. Ne pas rejouer Stitch **01/04/06/11**, ni le lot provisoire `roles-01-apply.sql`.

## Installation et vérification, manuelles

L'ordre du paquet regroupé final prévaut ; la dépendance est **Famille → Missions V3 → vérifications**, avec Courses et Storage séparés. Ne pas activer le client F09/F08 tant que les contrôles serveur de tous les chemins, notamment Missions et Storage, ne sont pas confirmés.

| Fichier | Opération |
|---|---|
| [01-install-family.sql](01-install-family.sql) | Transaction unique : rôle maintenable fermé, helpers canoniques, RPC Famille corrigées, invitation enfant ciblée, restrictions REST et transition de l'ancien dataset V1. Vérifie les empreintes des fonctions remplacées avant tout changement. |
| [02-verify-family.sql](02-verify-family.sql) | Lecture seule : rôle, grants, fermeture privée, gates, propriétaires/empreintes, policies et conservation des réparations 11/Courses. Retour `family_verification`. |
| [03-install-storage-policies.sql](03-install-storage-policies.sql) | Transaction **séparée** : quatre policies restrictives et une permission UPDATE strictement Parent s'ajoutent aux trois policies Storage existantes, sans changer bucket, objet ou contenu. Une erreur de droit annule les cinq créations. |
| [04-verify-storage.sql](04-verify-storage.sql) | Lecture seule : cinq policies, rôles, commandes et expressions. Retour `storage_verification`, sans prétendre au succès d'un upload réel. |
| [05-rollback-suspend.sql](05-rollback-suspend.sql) | Retour fonctionnel conservateur : ferme les nouvelles capacités clientes et les nouvelles acceptations enfant, conserve comptes/liens/profils/historiques et protections d'autorisation. |
| [06-rollback-storage.sql](06-rollback-storage.sql) | Retrait **exceptionnel** des cinq policies candidates. Refuse si les capacités ne sont pas suspendues ou si des enfants liés sont encore actifs. Ce n'est pas le rollback courant ; ne jamais rouvrir leurs écritures de fichiers. |

Si `01` signale une empreinte différente, il s'arrête : ne pas forcer et ne pas rejouer les anciennes migrations. Si le socle existe déjà, fournir le résultat de `02`, sans réinstallation. Le SQL du lot ne contient aucune valeur personnelle à remplacer.

### Droit particulier sur Storage

Le catalogue indique que `storage.objects` appartient au rôle géré `supabase_storage_admin` ; le SQL Editor n'en hérite pas. Supabase peut avoir une délégation gérée, qui ne peut être déduite de ces seules métadonnées. `03` tente donc l'opération dans sa propre transaction. **En cas de refus `42501` / « must be owner » : transmettre l'erreur ; aucune des cinq policies n'est appliquée.** Ne pas modifier le propriétaire de la table, retirer RLS ou accorder un rôle géré. L'étape Dashboard strictement nécessaire sera alors précisée à partir de ce refus. Ni F09 ni F08 ne seront activés avec une protection Storage manquante.

## Autorité canonique et verrous

`dobby_socle_private.actor_context(uuid,boolean)` déduit toujours l'acteur du JWT vérifié, de `account_links`, d'une appartenance active unique et du profil `familyMembers[*].id` **TEXT**. Seule la catégorie explicite `parent/child` autorise l'accès ; âge, `owner/member` et permissions fournies par le client ne créent aucun rôle.

Pour les mutations RPC : advisory du compte compatible V7 → appartenance `FOR SHARE` → advisory familial → ligne `family FOR UPDATE`. Missions V3 prend ensuite son advisory compatible V2 et sa ligne Missions. Acceptation/révocation verrouillent la ligne d'invitation **après** le verrou familial et revalident tout après l'attente. Le guard d'un UPDATE REST déjà détenteur de la ligne ne reprend pas les advisory dans l'ordre inverse.

Chaque parent du foyer peut gérer ses données, y compris le profil d'un autre parent. La catégorie Parent reste protégée ; un snapshot ne peut supprimer silencieusement un profil déjà lié à Auth. Un enfant conserve la consultation partagée et ne peut appeler que sa propre magie, puis la validation Missions éligible par le writer V3 du lot associé. Les mutations REST, l'identité, l'avatar, la catégorie, les invitations, contrats, menus, recettes, Courses et récompenses lui sont refusés. Un animal ne reçoit ni Maison/Patronus ni portrait magique par les RPC corrigées.

Le contexte public garde son protocole 1 et ses champs existants. Les RPC historiques `update_profile` et `create_household`, toujours exécutées par l'ancien writer, continuent à fonctionner ; leurs chemins sont testés après le nouveau guard. Les anciennes invitations génériques gardent leur digest et créent un nouveau profil adulte. L'ancienne liaison incomplète `bind_existing_member` est fermée : le parcours enfant passe exclusivement par une invitation ciblée.

### Ancien dataset V1 non rattaché à un foyer

`dobby_sync_grocery_items` n'a pas de colonne de foyer. Aucun mapping artificiel n'est créé. Un compte **déjà lié canoniquement à V7** ne peut plus lire ou écrire ce dataset global V1 ; ses anciennes lignes V1 et ses appartenances sont conservées. Les usagers V1 non liés gardent leurs policies existantes. Le client V7 et les anciens PATCH **V2** de Courses ne dépendent pas de cette API V1.

## Invitation enfant ciblée : API fermée côté publication

- `public.dobby_v7_create_child_invitation(p_member_id text,p_expires_in_hours integer,p_operation_id uuid)` : parent canonique du foyer, enfant existant exact non lié ; résultat protocole 1, `kind='child-account'`, `targetMemberId`, `invitationId`, jeton, expiration, foyer, invitant et `replayed`.
- `public.dobby_v7_preview_child_invitation(p_token text)` : aperçu anonyme minimal `status`, et seulement si valide `kind`, `targetMemberId`, foyer/invitant/expiration. Le preview générique refuse un jeton enfant.
- `public.dobby_v7_accept_child_invitation(p_token text,p_operation_id uuid)` : compte Auth connecté sans autre lien/appartenance active ; **aucun profil personnel provisoire requis**. Un compte déjà lié à un foyer ne peut pas être réaffecté. Retour contexte actif du **même** enfant, `memberId`, profil intact, révision familiale et `replayed`.

Le rattachement ajoute uniquement l'appartenance et le lien au profil existant, puis consomme l'invitation. Il ne réécrit pas le JSON familial et ne change pas sa révision : avatar, naissance, surnom, magie, extensions, Missions et Runes restent identiques. Les replays exacts ou nouvelles opérations du même compte déjà admis reprennent son contexte ; un autre compte, une cible liée, une expiration ou une révocation sont refusés sans duplication.

Les jetons ne doivent jamais figurer dans Git, logs publics ou compte rendu de recette.

## Rôle fermé et maintenance PG17

Le rôle `dobby_socle_writer` est `NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOBYPASSRLS`. Il n'a ni `CREATE` de schéma, ni USAGE sur Auth, ni appartenance d'un rôle navigateur. Ses fonctions ont `search_path=''`, un propriétaire explicite et une allowlist EXECUTE sans PUBLIC.

Une seule appartenance **ADMIN sans SET/INHERIT** est conservée pour le SQL Editor `postgres`. L'arête temporaire SET/INHERIT créée pour l'installation est révoquée avant COMMIT. Cette maintenance contrôlée évite de reproduire l'impossibilité d'administrer l'ancien writer V7 fermé. Le propriétaire géré Auth et ses droits restent inchangés. La réparation `actor()` et les branches V2/ancien V7 du stamp sont préservées ; seule la branche du nouveau writer est ajoutée.

Les définitions d'avant intervention sont sauvegardées **dans une table privée sur place**, jamais retournées dans les preuves publiques. Le rollback courant est conservateur : il ne prétend pas restaurer automatiquement le propriétaire original V7 inaccessible, et ne retire pas des restrictions qui protègent déjà des comptes enfants. Une restitution structurelle complète exigerait une intervention étudiée avec ces sauvegardes, pas un `CASCADE`.

## Gates et preuves encore indispensables

`public.dobby_v7_family_capabilities()` annonce les capacités installées, mais ses champs de preuve restent fermés par défaut : `familyRolesVerified`, `childAccountLinkVerified`, `storagePoliciesVerified` et l'exception Missions ne deviennent pas vrais à partir de la seule présence d'un fichier SQL. La présence des cinq policies est distinguée par `storagePoliciesPresent`. La création/acceptation enfant verrouille l'état d'activation en `FOR SHARE` jusqu'au COMMIT. La suspension attend ces opérations ; la dépose exceptionnelle Storage verrouille cet état en `FOR UPDATE` avant de vérifier les comptes actifs. Une acceptation autorisée mais non commitée ne peut donc pas passer après le retrait des protections. Le writer ne reçoit UPDATE que sur la colonne `protocol`, contrainte à la constante 1, pour permettre le verrou, jamais sur les flags.

Les flags privés `family_client_verified`, `storage_client_verified`, `child_link_client_verified`, `missions_client_verified` commencent à **false**. Ils ne sont modifiés que par une intervention manuelle après preuves adéquates ; aucun SQL d'activation aveugle n'est inclus ici.

Restent à recevoir : résultats manuels de l'installation/vérification, contrôles Parent/Enfant/inter-foyers sur les RPC/REST réelles et Storage, liaison réelle du même profil et recette Missions V3. Le bouton enfant et le release flag client restent fermés pendant ces checkpoints.

## Tests ciblés réellement exécutés

PostgreSQL **17.7**, conteneur isolé sans réseau ni port, modèle du catalogue réel, définitions privées reçues conservées hors Git, données uniquement fictives. Installation avec connexion **directe** `postgres NOSUPERUSER` : `RESET ROLE` ne peut pas revenir à un superuser caché. Aucun test distant ou ancienne campagne rejouée.

- [14 contrôles Famille](evidence/local-family.json) : propriétaires/grants fermés, identité canonique, anciens RPC profil/foyer, parent non propriétaire, invitation adulte, enfant ciblé sans nouveau profil, révision et crédit historique de 25 préservés, replay/concurrence, refus enfant et autre foyer, lecture partagée, transition V1, expiration/révocation, concurrence UPDATE REST ↔ RPC et CAS.
- [6 contrôles Storage/retour arrière](evidence/local-storage-and-rollback.json) : refus d'ownership et transaction intacte, cas positif **avec ownership local fourni**, Parent CRUD/Enfant lecture/autre foyer refusé, vérifications exactes, suspension conservatrice, barrière réelle avec une acceptation non commitée et refus de retirer les policies avec un compte lié actif non Parent.

Les tests Storage reproduisent exactement les trois policies permissives reçues (read/upload/delete), sans permission UPDATE fictive ; la cinquième policy candidate ajoute seulement l'UPDATE Parent du bucket familial. Ils utilisent une fixture minimale de l'interface gérée `foldername`; ils ne prouvent ni une délégation du SQL Editor hébergé, ni un upload réel. Les empreintes des fichiers testés sont enregistrées dans les preuves JSON ; aucun retour brut confidentiel n'y figure.
