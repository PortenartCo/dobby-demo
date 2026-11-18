# Lot 3 — contrat serveur candidat

Base obligatoire : PR #30, `24ab5b7944c34c9f29ede5867f4715111b5c2f47`.
Migration additionnelle : `20261118120207_dobby_private_access_administration.sql`.
Développement et recette locaux uniquement ; aucun réglage hébergé ni flag familial de production activé.

## Administration

RPC propriétaire `dobby_access_admin(p_command text,p_payload jsonb)` : session active et UUID propriétaire vérifiés à chaque appel, également hors Edge. Toutes les clés sont fermées, les UUID typés et les révisions entières sûres. Aucune table/route arbitraire, secret, JWT ou contenu familial n'est retourné.

| Commande | Payload JSON exact |
| --- | --- |
| `listAccess`, `listDecisions` | `{cursor?:uuid|null,limit?:1..100}` |
| `invite` | `{email,purpose:"new-household",operationId}` |
| `decide` | `{admissionId,decision:"approve"|"reject",expectedRevision,operationId}` |
| `revokeAdmission` | `{admissionId,expectedRevision,operationId}` |
| `setStatus` | `{userId,status:"active"|"suspended",expectedRevision,operationId,confirmed:true}` |
| `claimDelivery` | `{admissionId,expectedRevision,operationId}` |
| `recordDelivery` | `{admissionId,deliveryId,targetUserId,operationId}` |
| `failDelivery` | `{admissionId,deliveryId,operationId,uncertain:boolean}` |
| `resumeDelivery` | `{admissionId,expectedRevision,operationId,confirmed:true}` |
| `finalizeReactivation` (interne) | `{userId,expectedRevision}` |

Pour un UUID Auth déjà lié à une admission mais sans autorisation, `setStatus` accepte uniquement une suspension explicite avec `expectedRevision:0`. Il crée directement une ligne suspendue (génération/révision 1), révoque les admissions et liens ouverts, et n’accorde aucun droit provisoire. Les autorisations existantes conservent leur CAS à partir de 1.

Le statut conserve le résultat du Lot 1 : `{status,revision,replayed,sessionBoundaryPending}`. Après réactivation, l'Edge appelle `finalizeReactivation` dans **une seconde requête/transaction**, avec la révision retournée. Ce second appel ne change pas la révision. Aucun ancien droit ou lien n'est restauré.

Les mutations d'admission retournent `{admission,replayed}` ; `admission` est une projection `{id,email,purpose,revision,state,targetUserId,expiresAt,householdId,memberId,requestedBy,requiresProfile}`. États exacts : `requested|approved|delivering|sent|accepted|rejected|revoked`. Les listes retournent `{protocol:1,items,nextCursor}` ; `listAccess` ajoute `requests` pour les demandes sans cible Auth. Les pages sont bornées à 100 comptes et 25 admissions récentes par compte. Aucune liste ne contient de jeton V7, lien Auth, mot de passe ou `user_metadata`.

Les commandes de livraison retournent `{admission,delivery:{id,attemptId,state,requiresResume},replayed}`. `id` et `attemptId` désignent le même UUID durable. Le premier claim retourne `requiresResume:false` et commit `attempting` **avant** l'action Auth. Tout rejeu de claim impose `requiresResume:true`, sans nouvel envoi. L'Edge doit employer des `operationId` distincts pour décision, claim, résultat et échec. Un rejeu de décision peut retourner la révision courante : ne pas recalculer un claim déjà commencé avec le même identifiant et une révision différente.

Une réponse Auth perdue ou un échec d'enregistrement produit `uncertain`. Seul `resumeDelivery`, confirmé et protégé par CAS, ouvre une nouvelle tentative. Une tentative `attempting` interrompue devient reprenable après **180 secondes**, au-delà du budget réseau maximal du worker. La reprise explicite est aussi possible si la décision a été enregistrée mais aucun claim n'a commencé. Aucun rejeu automatique n'envoie de message. Une ancienne tentative ne peut finaliser une tentative plus récente. Une invitation familiale déjà liée requiert une nouvelle demande approuvée pour une nouvelle livraison ; aucun lien révoqué n'est ressuscité.

Un compte existant est retrouvé par Auth Admin puis reçoit une connexion avec `create_user:false`, ou utilise sa connexion ordinaire. Un nouveau compte passe par `inviteUserByEmail` après décision. Le SQL vérifie que l'UUID retourné par Auth appartient à l'e-mail courant de l'admission ; il ne se fie pas aux revendications e-mail ou aux métadonnées client. L'envoi confirmé reste distinct de l'admission consommée.

## Utilisateur et callback

`dobby_access_request_family_account(p_email text,p_kind text,p_member_id text,p_operation_id uuid)` accepte `family-parent` avec membre NULL ou `family-child` avec identifiant enfant existant exact. Le foyer provient exclusivement du lien canonique du Parent connecté. Résultat `{admission,replayed}` ; aucun compte Auth ni jeton utilisable n'est créé. Une invitation familiale propriétaire doit approuver cette demande enregistrée ; aucun foyer arbitraire ne peut être fourni à `invite`.

`dobby_access_context()` préserve les champs Lot 1 et ajoute `admission:null|{id,purpose,state,expiresAt,householdId,memberId,targetMemberId,requiresProfile}` pour le seul sujet. La surcharge `dobby_access_context(p_admission_id uuid)` filtre également sur le sujet authentifié. Un compte sans autorisation peut uniquement lire cette admission bornée avec une session Auth réelle vivante.

`dobby_access_accept(p_admission_id uuid,p_profile jsonb,p_operation_id uuid)` exige UUID lié, e-mail Auth courant confirmé, approbation, expiration, génération et session valides. `p_profile` contient les champs V7 `firstName,lastName,birthdate,avatarId` pour un adulte ; il vaut **NULL** pour un enfant existant. Résultat `{protocol:1,accepted:true,admissionId,replayed}` avec `canCreateHousehold:true` pour un nouveau foyer ou `householdId,memberId` pour une liaison familiale. La session reste bornée avant cette confirmation ; le contexte métier et l'adoption native viennent après.

Activation, profil personnel, écritures canoniques V7, admission et reçus sont une seule transaction. Aucun droit actif provisoire n'est commité. L'enfant conserve son identifiant, JSON familial, crédits/magie et révision. Un ancien compte lié n'est pas déplacé. Les replays revérifient suspension, génération et demandeur avant tout reçu. L'ancien créateur libre V7 refuse ; les anciennes invitations non consommées sont révoquées, les consommées restent conservées.

## Privilèges, gates et reprise

`dobby_access_writer` n'a aucun grant de lecture/écriture sur les payloads familiaux ni Storage. Les bridges `access_*` des writers familiaux vérifient le Parent enregistré et ne retournent que des identifiants opaques. Aucun JWT de demandeur n'est fabriqué. Les verrous d'autorisation précèdent les admissions et verrous métier ; l'acceptation stabilise aussi l'autorisation du demandeur contre sa suspension.

Le nouveau rôle fermé `dobby_access_identity_reader` n'obtient **aucun grant Auth** dans la migration. Le propriétaire autorisé du schéma géré doit séparément accorder seulement USAGE(auth) et SELECT(id,email,email_confirmed_at), puis l'installateur vérifié appelle `dobby_access_private.enable_identity_guard()`. Tout manque de permission est un blocage à signaler. Le gardien de session du Lot 1 reste requis. Les fixtures locales peuvent accorder ces seuls droits sur leurs comptes fictifs.

L'enfant nécessite en plus `settings.child_delivery_enabled=true` et les vérifications serveur famille/Storage/enfant ; le nouveau gate reste **false par défaut**. Les constantes publiées `FAMILY_FEATURE_RELEASE` restent fermées. Une fixture locale isolée peut ouvrir ses propres flags pour la recette, jamais ceux de production.

Le rollback fourni ferme les commandes et livraisons, conserve autorisations, suspensions, générations, décisions et gardes, et ne rouvre ni inscriptions ni invitations libres. La reprise nécessite une inspection locale de l'admission et de la dernière tentative, puis une reprise propriétaire explicite. Les réserves du Lot 2B (anciens liens signés et visibilité RLS des sessions Auth) restent applicables.
