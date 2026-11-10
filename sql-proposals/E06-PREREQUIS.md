# E06 — Proposition de capacités serveur, NON EXÉCUTÉE

Ce document ne crée aucune table, fonction, politique, donnée ni compte. Aucun schéma serveur réel n’a été inspecté avec un compte familial. Les capacités ci-dessous sont absentes des adaptateurs et propositions accessibles ; leur éventuelle existence en production reste à vérifier séparément.

## Réutilisation livrée

Le client natif utilise `/auth/v1/token`, `dobby_v2_memberships`, `dobby_v2_households` et `requireHousehold()`. E06 expose une façade sur ce même login : clé publique déjà configurée, session native, un seul foyer actif, contrôle du foyer reconnu sur cet appareil. Aucune copie de jetons dans les brouillons ou profils. Les métadonnées exposées à E06 ne contiennent ni clé ni jeton.

Le JSON familial conserve `familyMembers` et `magicProfile` via son writer et sa résolution de révision existants. Un e-mail, un prénom, un ordre de liste ou un dernier profil consulté ne constituent jamais une liaison de compte.

## Minimum à faire approuver et vérifier avant implémentation serveur

1. **Création compte/foyer** : parcours Auth officiel et création atomique du foyer + membership, soumis à la configuration réelle des inscriptions et confirmations. Auditer les colonnes existantes et les rôles avant de rédiger du DDL. Ne pas fournir une clé d’administration au navigateur.
2. **Invitation** : génération par un utilisateur autorisé côté serveur, jeton à usage unique (empreinte stockée, expiration), acceptation authentifiée et création de membership atomique. Vérifier révocation, rejeu et mauvais destinataire. Aucun code non vérifié ne déclenche une adhésion côté client.
3. **Association compte–membre** : liaison stable `(user_id, household_id, member_id)` contrôlée côté serveur ; unicité selon le contrat métier à approuver. `member_id` doit correspondre à un membre canonique du payload familial de ce foyer. Le registre étant JSON, ne pas prétendre disposer d’une FK relationnelle vers un membre. La vérification/résolution doit être atomique avec la révision familiale, sans inventer un second registre de membres. Renommer le membre ne rompt pas la liaison ; suppression/révocation l’invalide.
4. **Parent/enfant** : autorisation représentée et contrôlée côté serveur, distincte d’un simple accès au foyer. Ne jamais baser l’autorisation sur `user_metadata` modifiable par le client. Sans ce contrat, E06 ne peut revendiquer une permission parentale effective.
5. **Configuration publique** : fournir une clé publiable autorisée dans la configuration applicative si souhaité. Rien n’est inventé dans le code livré : E06 utilise seulement une clé déjà configurée par le mécanisme natif. La configuration avancée existante reste inchangée.
6. **Coexistence** : tous les writers de membres doivent préserver les extensions d’identité et versions E06, ou une protection serveur/versionnée doit être approuvée. Le client seul ne peut empêcher un ancien writer de supprimer des champs dans JSON.

## Contrôles avant recette à deux comptes

Utiliser un environnement et des comptes de test dédiés, sans données familiales réelles. Vérifier séparément Auth, RLS et droits : fondateur, invité, non-membre, membership révoquée, autre foyer, invitation expirée/rejouée, suppression de membre, modification concurrente, session expirée/hors ligne. Les lectures comme écritures doivent refuser les identifiants d’un autre foyer. Garder le garde-fou natif d’un profil de navigateur distinct par foyer tant que la partition complète du stockage local n’est pas effective.

Une réponse serveur vérifiée pourrait ensuite alimenter le résolveur `DobbyMagicIdentity.linkedMember` et l’entrée directe d’un compte dont le membre a terminé sa cérémonie. Ce raccordement n’est pas simulé dans cette livraison.
