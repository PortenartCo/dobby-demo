# Bascule future — séquence contrôlée, non exécutée

Le [rapport](RAPPORT.md) conclut NON VALIDÉ pour la mise en service. Ce plan ne fournit aucun mandat de migration. Tous les jalons hébergés restent **NON VÉRIFIÉS**. Le seul projet futur admissible est `pqcdkrwljgvgagzwrcmg` ; aucun projet de remplacement n’est à créer ou utiliser.

## P0 — fermer les inconnues en lecture

Compléter [CONTROLES-LECTURE.md](CONTROLES-LECTURE.md). Réconcilier historique des migrations et catalogue effectif : des anciens scripts peuvent avoir été installés sans historique CLI. Si une candidate est déjà présente, contrôler son état et ses empreintes, sans la rejouer.

Comparer les 27 signatures Lot 2A, propriétaires, ACL effectives, surcharges et entrées supplémentaires ; obtenir les douze définitions Missions manquantes par un canal privé autorisé et vérifier le graphe complet. Comparer Storage aux huit policies et helpers attendus. Un nom ou une version proche n’est pas une correspondance de corps/définition.

Valider PostgreSQL ≥16, les capacités déjà disponibles de l’installateur `postgres` et les memberships ADMIN fermées requises ; le BYPASSRLS fictif du test n’autorise aucune promotion réelle. Définir une voie supportée de visibilité minimale sous RLS pour chacun des deux readers Auth, sans exposer Auth au navigateur. En cas de restriction gérée, décision support/plateforme ou adaptation minimale revue, puis arrêt jusqu’à preuve.

**GO humain H1 :** accepter le diagnostic complété et le paquet SQL/configuration exact. Sans cela, ne pas passer à P1.

## P1 — conservation, restauration et anciennes capacités

- Préparer une sauvegarde **privée**, chiffrée, datée et contrôlée : schémas/définitions, données, rôles/memberships/ACL/RLS, catalogue et état des registres, liaisons canoniques, reçus et journal. Conserver un point cohérent avec les écritures au début de maintenance.
- Sauvegarder séparément les **octets Storage**, métadonnées/références et configuration des buckets. Une [sauvegarde DB Supabase](https://supabase.com/docs/guides/platform/backups) ne sauvegarde pas ces octets. Vérifier comptages/empreintes et restauration sur copie locale fictive avant tout geste irréversible. Aucune sauvegarde hébergée n’a été réalisée par Lot 5A.
- Conserver les configurations Edge/Auth/SMTP et leurs versions avec références aux secrets déjà gérés, sans les extraire ni les publier. Ne pas supposer qu’une restauration DB restaure les déploiements, templates, clés URL ou caches CDN.
- Définir l’UUID propriétaire vérifié et `preservedAccounts`, tableau de deux objets privés `{userId,householdId,memberId}` pour Parent A/B. Confirmer leurs liaisons actives dans `dobby_v7_private.account_links` et `dobby_v2_memberships`, et leur foyer attendu commun ; aucune déduction par e-mail, nom ou premier connecté. Les valeurs réelles et inventaires bruts restent hors Git/CI.
- Geler les émissions de capacités et les accès nécessaires par une maintenance **effective**, pas seulement par retrait de boutons UI. Les producteurs serveur privilégiés et appels directs de signature font partie du gel. Définir une heure `t0` attestée et une méthode de contrôle qui ne journalise aucun bearer.
- Choisir extinction naturelle avec borne complète, invalidation ciblée ou rotation/révocation URL accompagnée de purge. Pour l’attente : `fin >= max(dernière émission + TTL maximal, échéances des caches) + marge contrôlée`. Si `t0`, TTL ou caches sont inconnus, aucune fin d’attente ne peut être déclarée. Si le gel ne peut être obtenu avant installation sans changement technique, préparer ce changement comme paquet de maintenance séparé ; ne pas inventer une fermeture.

**GO humain H2 :** approuver manifeste privé propriétaire/A/B, sauvegarde restaurable, fenêtre et fermeture des entrées. **GO H3 séparé :** approuver tout déplacement/suppression d’objet, rotation/révocation URL et purge, avec impact sur tous les buckets/utilisateurs et preuve de fin. Aucune de ces opérations n’est exécutée ici.

## P2 — intégration Git uniquement après accord

Intégrer #28, puis retarget/recontrôler #29 vers `main`, puis #30, #31 et #32 dans cet ordre. Conserver l’ascendance de la pile ou revoir explicitement les diffs après un éventuel squash ; pas de résolution automatique basée sur la seule simulation Lot 5A. Réexaminer si un HEAD change.

`main` observé : `424ae01815b7392dff1b3e5da9c51f4a734b4140`. Les trois répertoires saisonniers ajoutés restent intacts. Déterminer le chemin canonique à publier et l’origine de confiance ; une copie de revue ancienne ne reçoit pas automatiquement les nouveaux comportements.

Valider aussi le choix d’hébergement de l’issue #19 et du plan #27 : maintien de pages/code publics avec API privées et démo séparée, ou hébergement protégé/dépôt privé. Les gardes d’autorisation ne protègent pas la consultation du code et de l’interface statiques.

**GO humain H4 :** chaque intégration/retarget et le SHA final à recetter. CI pertinente sur ce SHA avant publication ; les CI historiques de #32 ne certifient pas un nouveau commit intégré.

## P3 — ordre SQL et activations, entrées fermées

Les fichiers ci-dessous ont chacun leur transaction. Ce n’est pas une transaction unique couvrant toute la bascule. Vérifier les postconditions après chaque commit et maintenir la maintenance pendant les états intermédiaires. Les fichiers et leurs SHA-256 sont dans PREUVES.json ; **aucun `db push` général ni ancien installateur** ne remplace ce paquet.

| Ordre | Fichier ou opération future | Condition / postcondition |
| --- | --- | --- |
| 1 | `20261117203208_dobby_private_access_foundation.sql` | Registres vides, rôles fermés ; aucun enrôlement automatique d’Auth. |
| 2 | `dobby_access_private.bootstrap(jsonb,uuid)` | Manifeste privé complet, owner et deux comptes existants ; liaison ambiguë/manquante ou registre non vide ⇒ transaction refusée. Ne crée/remplace aucun Auth, profil ou foyer. |
| 3 | Voie Auth autorisée puis `enable_session_guard()` | `USAGE(auth)` et seules colonnes sessions prévues, visibilité RLS prouvée sur sujet/session fictifs contrôlés. Le flag d’activation ne suffit pas à démontrer cette visibilité. |
| 4 | `20261117215619_dobby_private_access_tables_rpc.sql` | Catalogue/owners exacts, ADMIN fermé déjà disponible ; guards métier et fermeture V1. |
| 5 | `20261118112535_dobby_private_access_storage.sql` | Maintenance DDL permise, bucket privé, huit policies/helpers conformes, anciennes capacités/cache traités ; garde native sans nouvelle passerelle. |
| 6 | `20261118120207_dobby_private_access_administration.sql` | Fondation et Lot 2A présents, sources familiales exactes ; ferme les anciennes invitations **non consommées**, conserve celles consommées. Cette conséquence doit être acceptée avant exécution. |
| 7 | Voie Auth autorisée puis `enable_identity_guard()` | Reader distinct, seules colonnes `id,email,email_confirmed_at`, visibilité réelle sous RLS vérifiée ; sessions déjà activées. Cette activation ouvre le chemin admin si les autres conditions sont réunies. Ne pas l’effectuer avant préparation/cohérence du service. |

Les grants/policies Auth nécessaires sont un delta géré distinct : leur possibilité n’est pas démontrée et aucun DDL de contournement n’est fourni. Ne pas retirer RLS, prendre `supabase_auth_admin`, changer un owner ni accorder une table Auth entière. Toute dérive de catalogue impose une adaptation revue, pas une modification d’empreinte pour accepter la cible.

**GO humain H5 :** autorisation explicite du paquet SQL exact, de l’amorçage, des permissions/activations et des effets sur les invitations ouvertes. Rien dans Lot 5A ne vaut ce GO.

## P4 — Edge, Auth et client compatibles, sans ouverture prématurée

Préparer la fonction `dobby-access-admin` et ses helpers à leur SHA approuvé, sans accès technique navigateur. Paramètres serveur exigés par l’entrypoint : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DOBBY_ADMIN_ALLOWED_ORIGINS`, `DOBBY_ADMISSION_REDIRECT_TO`. Vérifier les noms et la disponibilité gérée, jamais copier leurs valeurs dans le dossier.

Faire correspondre l’origine exacte autorisée, le retour d’admission, `site_url` et l’allowlist Auth. Valider les templates invite/magiclink avec `TokenHash`, type fermé et `admission_id`, et la conservation recovery/PKCE. Relever les TTL OTP réels séparément des admissions applicatives de 24 h et des capacités Storage.

Vérifier le mode de validation JWT de la gateway Edge avec les clés effectives du projet puis la validation Auth/propriétaire du handler : aucune recette Kong hébergée n’est disponible et aucun choix aveugle de `verify_jwt` n’est prescrit. Préparer SMTP et son circuit de recette privé sans envoi externe autorisé implicitement. Ne pas déclarer l’envoi « confirmé » sur un état incertain ; reprise explicite avec CAS et nouvelle opération selon le Lot 3.

Coordonner l’activation d’identité et la disponibilité Edge/client sous maintenance ; pas de console ancienne face au nouveau contrat. Aucun accès public pendant la recette intermédiaire.

**GO humain H6 :** déploiement Edge/client, changements Auth/SMTP/templates/origines, activation finale. L’inscription publique hébergée n’est fermée qu’après validation du circuit invitation/récupération ; vérifier alors `disable_signup=true`. Cette fermeture et le premier e-mail externe demandent chacun un accord explicite.

## P5 — recette fictive et retour conservateur

Préparer d’abord une copie locale du catalogue vérifié avec des équivalents fictifs : owner, A/B du même H1, Parent H2, compte non admis et compte suspendu ; fichiers fictifs et bac SMTP privé. Ne pas importer les lignes personnelles dans les preuves ou les fixtures. La copie locale ne remplace pas la recette autorisée du projet personnel.

La prochaine recette doit cibler les différences causales du catalogue/intégration : T01/T06 graphe Missions complet ; T03/T13 invitation, compte existant/non confirmé, callback autre navigateur et résultat incertain ; T05/T07 session et écritures concurrentes ; T08 V1 ; T09 HTTP réel et capacités/cache traités ; T10 conservation UUID/foyer/liaisons et recovery avec signup fermé ; T11 deux onglets/files retenues ; T12 rôle propriétaire sans contenus H2. Ne pas tester suspension/révocation sur les vrais Parents A/B.

Le contrôle A/B avant/après est une attestation privée des mêmes UUID Auth, foyer, `memberId` TEXT, liaisons actives, données/révisions, crédits/magie et droits, puis connexion/refresh/récupération autorisés sans recréation ni réinvitation B. Le bootstrap est privé, transactionnel et non rejouable ; l’incohérence doit interrompre la bascule, pas être « réparée » par nouvel enrôlement.

Exercer sur la copie fictive le **rollback normal** : arrêter console/envois, conserver/reconcilier les tentatives incertaines ; utiliser le rollback conservateur Lot 3 qui ferme l’administration/livraison/acceptation nouvelles, garder les gardes Lots 1/2A/2B, décisions, suspensions, générations et liaisons consommées. Le client compatible doit laisser les actifs ordinaires fonctionner et refuser les non-admis/suspendus. Une réactivation exige toujours ses deux transactions et une nouvelle session.

Les rollbacks techniques Lots 2B et 2A rouvrent respectivement les signatures et les anciennes API/ACL. **Ils ne constituent pas le retour normal en service.** Réservés à une maintenance fermée, autorisée séparément ; ne pas les enchaîner automatiquement. Aucun rollback destructif Lot 1 n’est livré. Une restauration ancienne ne doit pas effacer les décisions/suspensions postérieures avant réouverture. Réactiver une ancienne clé URL n’est pas un rollback neutre : cela peut réhabiliter ses capacités non expirées.

**GO humain H7 :** recette/rollback attestés, traitement Storage achevé, conservation A/B et récupération owner prouvées. **GO H8 distinct :** publication puis ouverture après contrôle des fichiers servis au SHA final. Gates enfants et Missions V3 restent fermées ; aucune ouverture F08/F09 dans ce lot.
