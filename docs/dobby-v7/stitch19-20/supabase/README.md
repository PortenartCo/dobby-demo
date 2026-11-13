# Installation familiale manuelle — Stitch 19/20

Ces évolutions reposent sur le diagnostic catalogue transmis par l'utilisateur : PostgreSQL **17.11**, six tables publiques existantes, appartenances V2 `owner/member`, modules JSON natifs et protection Missions déjà installée. **L'utilisateur a exécuté `01-apply.sql` puis transmis la vérification structurelle réussie de `02-verify.sql` le 12 novembre 2026. Ne pas réexécuter `01-apply.sql`.** Codex n'a effectué aucune modification distante SQL/API/MCP. Les contrôles directs distants de Codex sont des lectures publiques anonymes.

## Correctif du refus de connexion — 13 novembre 2026

Les diagnostics utilisateur 09 et 10 ont identifié le droit `USAGE` absent sur le
schéma géré `auth`, que le SQL Editor ne peut pas accorder. La vérification
structurelle initiale ne détectait pas cette restriction. Le
[guide du correctif de connexion](CORRECTIF-CONNEXION.md) décrit les scripts
manuels 11 et 12, leurs validations et le retour arrière 13.

Deux fonctions sont adaptées : le helper privé d'identité reste
`SECURITY INVOKER` sous le propriétaire du schéma, avec exécution fermée, et une
branche V7 est ajoutée au stamp natif. Sa nouvelle empreinte est explicite ; les
branches Missions et habituelle et les autres fonctions restent inchangées.
Les RPC publics conservent leur propriétaire technique fermé. Aucun droit
supplémentaire n'est accordé sur Auth. Après ce correctif, utiliser 12 pour la
vérification ; l'ancien 02 exige le propriétaire initial du helper privé.

L'utilisateur a exécuté 11 puis transmis 12 : deux comptes atteignent la phase
`profile`, sans erreur SQL. Ne pas réexécuter 11. Voir la
[preuve agrégée](evidence/live-user-auth-fix-verification-20261113.json).
La recette authentifiée dans les navigateurs reste à confirmer ; cette simulation
en base ne valide pas les requêtes API.

## État reçu et réglages Auth

La preuve utilisateur est conservée dans
[evidence/live-user-verification-20261112.json](evidence/live-user-verification-20261112.json).
Les dix RPC, cinq tables privées avec RLS forcée et protections historiques sont
présents. Les liaisons/invitations/profils en attente étaient encore à zéro :
cette vérification ne prouve pas une création de compte ou une invitation réelle.

La capture Dashboard fournie ensuite confirme **Site URL** et **une seule Redirect
URL** à `https://portenartco.github.io/dobby-demo/`, sans caractère générique.
L'inscription est active et la confirmation e-mail reste obligatoire, vérifiées
par GET en lecture seule. Voir [DASHBOARD.md](DASHBOARD.md) pour les valeurs exactes.
Les parcours Auth réels restent à tester après publication des sources validées.

## Nouveau départ des deux comptes de test — décision utilisateur

Les deux comptes Auth existants ont servi uniquement aux tests de synchronisation.
**Ne pas utiliser `04-link-existing-owner.sql` pour ces comptes.** Conserver les
comptes Auth et privilégier un foyer propre créé par le nouveau parcours. Si les
anciennes appartenances V2 actives bloquent ce parcours, la remise à zéro sera
limitée au foyer de test explicitement identifié, après diagnostic des dépendances.
L’utilisateur a exécuté le SQL ciblé 06 puis transmis 07 : deux appartenances
inactives, deux comptes Auth conservés, six modules inchangés. Ne pas réexécuter
06 ; voir [le guide de nouveau départ](REPARTIR-FOYER-TEST.md).
Aucune récupération de profil historique n’est nécessaire pour ces deux comptes.

## Ordre d’exécution initial, conservé pour traçabilité

1. Ouvrir **uniquement** le projet personnel `dobby-family-sync`, référence `pqcdkrwljgvgagzwrcmg`. Dans SQL Editor, conserver le diagnostic initial et une sauvegarde habituelle du projet.
2. Copier intégralement [01-apply.sql](01-apply.sql) dans une nouvelle requête et exécuter une fois. Le script forme une transaction; toute erreur annule l'ensemble. Il refuse un schéma V7 déjà présent. Ne pas supprimer une table pour forcer un second passage.
3. Exécuter [02-verify.sql](02-verify.sql), lecture seule. Communiquer le JSON `verification` et les éventuelles erreurs. Exécuter les scripts sous le même rôle d'installation. Les comptes exacts passent par un helper privé en lecture seule, pour éviter les faux zéros dus à RLS forcée. Le résultat n'inclut aucun jeton, secret, adresse électronique ou contenu de profil.
4. Pour un compte historique déjà membre, identifier humainement le compte Auth, le foyer et son profil natif exact. Renseigner les trois valeurs dans [04-link-existing-owner.sql](04-link-existing-owner.sql), puis l'exécuter pour le premier propriétaire. Sans cette liaison, le compte reste volontairement bloqué avec `existing_member_link_required`. Ce script conserve le profil à l'identique. Le propriétaire ainsi lié peut ensuite lier un autre compte déjà membre par `dobby_v7_bind_existing_member`, avec son ID natif explicite.
5. Après vérification structurelle, effectuer la recette avec deux véritables comptes familiaux dans des sessions séparées : premier profil/création de foyer, invitation générée par le propriétaire, aperçu anonyme, acceptation, persistance après reconnexion et refus d'accès croisé. Ne pas communiquer les mots de passe ou jetons d'invitation à Codex. Les comptes existants doivent retrouver leurs profils exacts et leurs résultats magiques déjà acquis.

Les nouveaux comptes utilisent les réglages habituels de confirmation d'e-mail Supabase Auth. La migration ne modifie ni Auth, ni les URL de retour, ni les paramètres de messagerie. Une publication du frontend ne prouve pas l'installation ou la recette réelle de ces RPC.

## Modèle ajouté

La personne finale reste exclusivement dans `public.dobby_v2_modules`, module `family`, clé `payload.familyMembers`. Aucun second annuaire de profils finaux n'est créé. `dobby_v7_private` contient seulement cinq tables : brouillon personnel avant foyer, liaison compte ↔ ID natif, invitations à empreinte, reçus d'opération, secret technique de génération. Le brouillon est supprimé dans la transaction qui le rattache au membre canonique.

Une liaison de compte est unique; l'ID du membre est du **texte**, jamais supposé UUID. Aucune reprise par nom, ordre ou valeur fictive. Les appartenances historiques non liées restent visibles dans leurs tables d'origine mais ne donnent pas une identité canonique supposée. Les nouveaux adultes entrent par création/invitation; les enfants/bébés/animaux restent des personnes distinctes. Un bébé ou animal ne peut pas recevoir une liaison de connexion.

Les propriétaires parents vérifiés peuvent inviter et gérer leurs dépendants **non liés**; les autres adultes modifient seulement leur profil. Un enfant déjà lié peut confirmer sa propre magie, sans modifier son identité. Une autre personne liée reste protégée, même face au propriétaire.

Les fonctions publiques sont `SECURITY DEFINER` sous un rôle dédié **NOLOGIN/NOBYPASSRLS**, jamais sous `postgres`; `search_path=''`, noms qualifiés, contrôle `auth.uid()` et droits EXECUTE explicites. Le rôle n'est accordé à aucun compte après installation. Le script fonctionne avec un installateur PostgreSQL 17 `NOSUPERUSER/CREATEROLE/NOBYPASSRLS`, propriétaire des objets V2 et habilité sur le schéma public/Auth. Un rôle créateur temporaire et des droits `CREATE`, `SET/INHERIT` temporaires permettent les transferts de propriété; ils sont intégralement retirés avant `COMMIT`. Cette séquence retire aussi l'appartenance ADMIN automatiquement créée par PostgreSQL 17. Les tables privées ont RLS forcée et aucun accès direct `anon/authenticated/service_role`. Seul l'aperçu opaque d'invitation est exécutable anonymement. Deux helpers privés `SECURITY DEFINER` ne sont exécutables que par l'installateur : comptes agrégés pour la vérification en lecture seule et liaison historique explicitement choisie pour `04`. Aucune policy de maintenance permanente, aucun accès client aux tables ni appartenance writer ne sont ajoutés.

Le trigger familial supplémentaire refuse le remplacement/suppression d'un profil lié par un ancien writer de snapshot. Il conserve les dépendants natifs non liés modifiables par le propriétaire parent canoniquement lié et vérifié. Un propriétaire non lié ou lié à un enfant ne peut pas contourner cette règle avec un snapshot. Les writers V7 modifient un membre ciblé dans la dernière ligne verrouillée, préservent les champs JSON inconnus et utilisent le stamp V2 existant. Les modifications du profil déjà lié, de membre et de magie exigent la révision attendue; un conflit `40001` nécessite une relecture, sans réécriture automatique d'un vieux snapshot.

## Contrat RPC

| RPC | Paramètres | Résultat principal |
| --- | --- | --- |
| `dobby_v7_context` | aucun | `protocol:1`, phase `profile/household/active/rejected`, `userId`, puis `householdId/memberId/profile/familyRevision/permissions/pendingCeremony` si actif |
| `dobby_v7_update_profile` | `p_profile` : `firstName`, `lastName?`, `birthdate?`, `avatarId?`; `p_expected_revision` requis si lié, omis pour brouillon | contexte relu; brouillon avant foyer, patch ciblé avec CAS ensuite |
| `dobby_v7_create_household` | `p_name`, `p_operation_id` UUID | foyer, appartenance propriétaire, membre et liaison créés atomiquement |
| `dobby_v7_create_invitation` | `p_expires_in_hours` entier 1–720, `p_operation_id` UUID | `invitationId`, `token`, `expiresAt`, noms réels du foyer/invitant |
| `dobby_v7_preview_invitation` | `p_token` | un seul statut `valid/expired/invalid`; foyer/invitant seulement si valide |
| `dobby_v7_accept_invitation` | `p_token`, `p_operation_id` UUID | appartenance membre, personne canonique et liaison atomiques |
| `dobby_v7_revoke_invitation` | `p_invitation_id` UUID | révocation du seul foyer propriétaire |
| `dobby_v7_bind_existing_member` | `p_user_id` UUID, `p_member_id` texte, `p_operation_id` UUID | liaison explicite d'un compte déjà actif dans le foyer, sans copie ni modification du profil |
| `dobby_v7_update_member` | `p_member_id`, `p_values`, `p_expected_revision`, `p_operation_id` | patch natif ciblé, contexte et module Famille courant |
| `dobby_v7_update_magic` | mêmes arguments que `update_member` | patch magique ciblé, contexte et module Famille courant |

`update_profile` conserve les champs optionnels omis et recalcule `name` à partir de l'identité finale fusionnée. Le frontend transmet la révision affichée à l'ouverture du formulaire; un rafraîchissement ultérieur ne doit pas remplacer cette révision. Le brouillon avant foyer reste sans révision et ne crée ni membre canonique ni foyer.

`update_member` accepte les champs natifs `name`, `firstName/lastName` ou `profileFirstName/profileLastName`, `birthdate`, `avatar`, `magicAvatarId`, `nickname`, `notes`, `species`, `memberCategory`, `clearBirthdate`. Il refuse les champs Maison/Patronus et toute promotion/dégradation parentale. Les anciennes dates invalides sont conservées sauf effacement explicite.

`update_magic` accepte seulement `magicHouseId`, `magicHouseAlgorithm`, `magicPatronusId`, `magicPatronusAlgorithm`, `magicCeremony`. Les 4 Maisons, 12 Patronus et la version `e06-v1` sont validés. Sans champ Algorithm, la source est **manual** et l'ancienne version calculée est retirée. Avec ce champ, la source déclarée est **calculated**. Le moteur natif reste responsable des questions et du calcul E06 : SQL valide le catalogue et la forme de cette provenance, **ne recalcule pas le questionnaire et ne constitue pas une attestation du calcul client**. Une provenance magique ne confère aucun privilège. Les deux IDs valides déterminent la fin de la cérémonie; les profils historiques déjà complets ne sont pas réécrits au login.

Les appels réutilisent leur UUID en cas de réponse réseau perdue. Un UUID réutilisé avec un autre contenu est refusé. Le token d'invitation est dérivé d'un secret privé aléatoire et de l'acteur/opération à longueur fixe : un rejeu retrouve le même token sans le stocker en clair. Aucun token ne figure dans le JSON de vérification ni dans les reçus. Une invitation est à usage unique. Une invitation expirée/révoquée ne donne jamais une nouvelle appartenance; le rejeu d'une acceptation déjà réussie restitue seulement le contexte de la même appartenance encore active. Révoquer une invitation ne retire pas un membre déjà admis.

## Retour arrière

Exécuter manuellement [03-rollback.sql](03-rollback.sql) pour retirer les dix RPC, le seul trigger familial ajouté et les trois policies publiques du writer et les trois helpers privés accessibles au client ou à l'installateur. Les triggers/stamps/policies Missions existants restent présents. Les comptes Auth, foyers, appartenances, membres canoniques, résultats et cinq tables privées sont conservés. Les tables privées restent fermées; aucun compte ne reçoit le rôle writer. Retirer aussi l'usage frontend de ces RPC. Une réactivation demande une migration examinée, car `01-apply` refuse les objets conservés.

## Preuves locales et limites

Commande : `python docs/dobby-v7/stitch19-20/supabase/tests/run-local.py --reset`. Elle exige le container Docker dédié `dobby-stitch1920-pg-20261112`, sans réseau ni port, et reconstruit **uniquement sa base de test** `dobby_stitch1920_test`. Aucun hôte distant n'est configurable. `catalog-fixture.sql` reconstruit le catalogue fourni, avec comptes et données entièrement fictifs. Les résultats et empreintes sont dans `/workspace/scratch/stitch19-20-sql-local/`.

Douze groupes de tests passent sur PostgreSQL **17.7** : installation/vérification sous un installateur `NOSUPERUSER/CREATEROLE/NOBYPASSRLS`, fermeture des appartenances et droits temporaires, brouillon et création concurrente, invitations/rejeux, expiration/révocation/isolation RLS, protection snapshots et CAS, writer de membre, CAS du profil lié et conservation du nom omis, concurrence de deux comptes et d'une invitation, annulation atomique après erreur, script réel de liaison historique/rejeu/refus de réaffectation, comptes de vérification non nuls exacts, autorisation parent/enfant des snapshots, rollback conservateur. La base de test finit avec V7 retiré par le rollback testé.

Le diagnostic fourni n'inclut pas le corps privé `dobby_runes_private.guard_missions()` ni ses helpers. La fixture utilise pour ce seul guard un stub défensif annoncé. Les définitions publiques Missions et stamp sont comparées avant/après, aucun objet Missions n'est modifié par la migration, et les écritures Missions directes restent refusées dans la fixture. Cela ne certifie pas les fonctions privées distantes, l'API PostgREST réelle, les deux comptes réels, l'e-mail Auth ou le déploiement. La recette manuelle et son retour utilisateur restent nécessaires.
