# DOBBY V7 · Mise en service Supabase familiale

Candidat de référence `0f51fb76ffe95f54c5e2b5e4493b2fc149ad39f6`, projet familial `dobby-family-sync`, référence `pqcdkrwljgvgagzwrcmg`. Le lancement couvre deux nouveaux parents, les comptes enfants liés, Missions/Runes et les fichiers familiaux. Santé reste en veille. L’administration privée de l’admission des tiers suit sa propre recette. [Périmètre de mise en service](README.md) · [Administration privée](administration-privee.md)

## 1. Rétablir la visibilité sur le projet

La lecture de management a identifié le projet et renvoyé une liste Edge vide. La liste des migrations et les lectures SQL n’ont fourni aucun inventaire. Un essai HTTP a reçu un refus 403 du tunnel sortant. L’état courant de PostgreSQL, Auth, Storage et des portes de publication reste donc **non attesté**. Les preuves antérieures du socle conservent leur portée et leur date. [Catalogue du socle et preuve historique](../finalisation-socle/CATALOGUE-RECU.md)

L’opérateur ouvre le SQL Editor du projet identifié et valide un `SELECT` minimal. Si ce contrôle échoue, il relève l’horodatage et l’erreur sans identifiants personnels et résout l’accès au projet avant de sélectionner une migration. Dès que l’accès revient, il sauvegarde les résultats de ces lectures internes. Le registre des migrations est à rapprocher du catalogue, car le socle historique a été remis pour exécution manuelle.

```sql
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '3s';

SELECT current_database() AS database_name, current_user AS operator,
       current_setting('server_version') AS postgres_version;

SELECT n.nspname AS schema_name, c.relname AS relation_name,
       pg_get_userbyid(c.relowner) AS owner, c.relrowsecurity AS rls,
       c.relforcerowsecurity AS force_rls
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE (n.nspname,c.relname) IN (
  ('public','dobby_v2_households'),('public','dobby_v2_memberships'),
  ('public','dobby_v2_modules'),('public','dobby_v2_grocery'),
  ('dobby_v7_private','account_links'),('dobby_v7_private','invitations'),
  ('dobby_socle_private','install_state'),('dobby_socle_private','mission_operations'),
  ('dobby_socle_private','rune_reward_surprises'),('dobby_socle_private','recipe_media'),
  ('dobby_health_private','install_state'),('dobby_family_identity_private','member_ids'),
  ('storage','objects'),('storage','buckets'))
ORDER BY 1,2;

SELECT n.nspname AS schema_name,
       format('%s(%s)',p.proname,oidvectortypes(p.proargtypes)) AS routine,
       pg_get_userbyid(p.proowner) AS owner, p.prosecdef AS security_definer,
       p.proconfig AS settings, p.provolatile AS volatility,
       encode(sha256(convert_to(replace(p.prosrc,E'\r\n',E'\n'),'UTF8')),'hex') AS body_sha256,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
       has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE (n.nspname='public' AND p.proname IN (
   'dobby_v2_modules_stamp','dobby_v7_context','dobby_v7_family_capabilities',
   'dobby_v7_create_household','dobby_v7_create_invitation','dobby_v7_accept_invitation',
   'dobby_v7_create_child_invitation','dobby_v7_preview_child_invitation','dobby_v7_accept_child_invitation',
   'dobby_v7_child_module','dobby_v7_child_access_status','dobby_v7_suspend_child_access',
   'dobby_v7_update_magic','dobby_v7_reserve_member_id','dobby_missions_v2_write',
   'dobby_missions_v2_write_legacy_socle','dobby_missions_v3_write','dobby_missions_v3_capabilities',
   'dobby_recipe_media_stage','dobby_recipe_media_missing','dobby_recipe_media_read'))
   OR (n.nspname='dobby_socle_private' AND p.proname IN (
   'actor_context','child_api_ready','child_raw_module_read','child_missions_write_native',
   'child_magic_write_native','missions_lot2_project'))
   OR (n.nspname='dobby_v7_private' AND p.proname='actor')
ORDER BY 1,2;

SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies
WHERE (schemaname,tablename) IN (
  ('public','dobby_v2_modules'),('public','dobby_v2_grocery'),
  ('public','dobby_v2_memberships'),('storage','objects'))
ORDER BY 1,2,3;

SELECT r.rolname,r.rolcanlogin,r.rolsuper,r.rolbypassrls,r.rolcreaterole,
       pg_has_role('postgres',r.oid,'SET') AS postgres_can_set,
       pg_has_role('authenticated',r.oid,'MEMBER') AS browser_member
FROM pg_roles r
WHERE r.rolname IN ('dobby_v7_writer','dobby_socle_writer','dobby_missions_v2_writer')
ORDER BY 1;

SELECT tgname,tgenabled,tgfoid::regprocedure AS routine
FROM pg_trigger
WHERE tgrelid=to_regclass('public.dobby_v2_modules') AND NOT tgisinternal
ORDER BY 1;
ROLLBACK;
```

Après confirmation de la présence des tables, lire aussi `protocol`, `family_api_enabled`, `family_client_verified`, `storage_client_verified`, `child_link_client_verified` et `missions_client_verified` sur la ligne `singleton` de `dobby_socle_private.install_state`, ainsi que `id`, `public`, `file_size_limit` et `allowed_mime_types` de `storage.buckets` pour `dobby-family-files`. Vérifier dans le Dashboard les politiques réellement gérées, l’accessibilité du Data API, le propriétaire effectif de `storage.objects` et la délégation DDL disponible. Vérifier le contrat de `at_home_quantity` en lecture seule. Garder les définitions techniques complètes et toute donnée de compte dans le dossier opérateur privé. [Contrôle Courses](../finalisation-socle/supabase/shopping/04-verify-catalog.sql) · [Diagnostic historique du catalogue](../reserves-techniques/serveur/00-diagnostic-regroupe.sql)

## 2. Attester la sauvegarde et la reprise avant écriture

1. Définir une fenêtre sans écritures DOBBY et relever un point de reprise UTC commun à PostgreSQL et Storage. Suspendre la recette et les traitements pendant la copie. Exporter rôles, schéma, données et historique des migrations selon la méthode Supabase adaptée au plan. Prendre une sauvegarde logique privée si une sauvegarde de plateforme utilisable est indisponible. Inclure les schémas métier privés, le journal Missions/Runes, les reçus, les profils et liaisons, les données Auth nécessaires à la récupération des comptes et les personnalisations des schémas gérés. Contrôler la couverture effective des exports avant de considérer Auth ou les politiques Storage sauvegardés. [Sauvegardes Supabase](https://supabase.com/docs/guides/platform/backups) · [Restauration et schémas gérés](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
2. Copier séparément les **octets** de chaque bucket en service via une interface Storage autorisée. Conserver un manifeste privé par objet avec bucket, chemin, type, taille et SHA-256. Inclure les buckets existants hors périmètre de modification, y compris Santé s’il est présent, dans la sauvegarde de reprise. Les photos privées du lot Catalogue stockées en `bytea` dans `dobby_socle_private.recipe_media`, si ce lot est présent, sont couvertes par PostgreSQL. Les médias éditoriaux publiés avec le client relèvent du paquet de publication. [Médias privés du catalogue](../catalogue-lot3/03-images-recettes.sql) · [Copie des objets Storage](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore#migrating-storage-objects)
3. Restaurer dans un environnement isolé, avec les objets gérés mis en place par la plateforme et les personnalisations SQL remises explicitement. Rétablir les octets par l’interface Storage. Éviter les lignes Storage orphelines ou dupliquées en réconciliant la restauration des métadonnées avec la copie des objets. Comparer décomptes et empreintes, vérifier les propriétaires, les ACL et la RLS. Prouver la connexion et la récupération avec un compte autorisé de recette, l’identité canonique de chaque membre, la lecture des crédits et le téléchargement réel d’un fichier privé. Documenter le point UTC, les versions, la couverture et la durée. Garder les sauvegardes chiffrées et limitées aux opérateurs. Le rapport partage les résultats et les empreintes agrégées.
4. Avec le même rôle DDL que celui prévu pour la fenêtre, répéter sur le clone l’ordre retenu et la suspension fonctionnelle. Consigner l’état initial des portes pour pouvoir rendre leurs valeurs approuvées. Un changement de propriété forcé, un préflight de version refusé ou un test de reprise incomplet arrête la bascule.

## 3. Chaîne SQL exacte et reprise d’un projet déjà installé

Les chemins ci-dessous sont figés au candidat de référence. L’opérateur compare leurs empreintes et **applique uniquement les étapes manquantes et autorisées**. Les scripts à préconditions sont autonomes dans leur transaction. Contrôler chaque version avant de passer à la suivante. Un objet présent dont le propriétaire, les ACL, la RLS, le garde ou le corps ne correspondent pas impose un rapprochement. La présence d’un RPC de même nom ne suffit pas.

| Ordre | Source au candidat | Précondition et effet |
| --- | --- | --- |
| Préexistant | [Stitch Famille 01](../stitch19-20/supabase/01-apply.sql) puis [réparation Auth 11](../stitch19-20/supabase/11-apply-auth-schema-fallback.sql) | Le socle exige les tables V2, les liaisons Stitch et les empreintes de la réparation `actor()` et `dobby_v2_modules_stamp()`. Historique à confirmer, sans réexécuter sur le projet familial. Une source de base absente demande un scénario de restauration ou d’amorçage revu. |
| Socle déjà confirmé à la date de la remise | [Famille 01](../finalisation-socle/supabase/family/01-install-family.sql) → [Missions V3 01](../finalisation-socle/supabase/missions/01-apply.sql) → [Courses 01](../revue-generale/supabase/shopping/01-install.sql) | C’est l’ordre du paquet manuel historique `10`. Préserve les comptes et les droits canoniques, introduit V3 et les reçus, réserve les écritures V2 au parent et ajoute `at_home_quantity`. Vérifier l’installation actuelle sans rejouer `10`. |
| Avant Enfants | [Bucket familial](../../../sql-proposals/dobby-family-files.sql), puis [Famille Storage 03](../finalisation-socle/supabase/family/03-install-storage-policies.sql) | Bucket privé, limite de 10 Mio et politiques du socle. Le paquet historique `11` a déjà attesté les cinq politiques à la date de la remise. Le candidat enfants exige le bucket et ces politiques. Le propriétaire de la table Storage ou sa délégation doit être disponible. |
| 1, si absent et compatible | [Runes lot 1](../runes-lot1/01-etendre-registre-v3.sql) | Sur le socle exact V3. Bonus, corrections et capital calculés avec le registre existant. Avant le lot 2, le writer et les capacités doivent correspondre aux empreintes exigées par son préflight. |
| 2, si absent et compatible | [Runes lot 2](../runes-lot2/02-participations-recompenses.sql) | Sur le lot 1 exact. Participations et validations, récurrence, seuils, récompenses et table privée des surprises. Reconnaître l’état installé par les corps, les droits et la capacité `runesLot2:1` sous un compte autorisé. |
| 3, si absent et compatible | [Comptes enfants 01](../comptes-enfants/01-restrict-child-access.sql) | Sur Famille, Storage et Runes lot 2 exacts. Ajoute la lecture projetée, le statut et la suspension, restreint la lecture brute et le bucket, et enveloppe les writers natifs. Atteste `childAccessProtocol:1`. Conserve la valeur des portes du socle. |
| Indépendant, conditionnel | [Médias privés recettes 03](../catalogue-lot3/03-images-recettes.sql) puis [bilan 04](../catalogue-lot3/04-bilan-medias-prives.sql) | Utilise le writer du socle pour les médias WebP privés et le snapshot Recettes existant. Confirmer l’absence ou la conformité de `recipe_media` et des trois RPC avant intervention, si ce mode de photos est retenu. Les WebP éditoriaux livrés avec le catalogue suivent leur propre chemin. |

Les empreintes SHA-256 des étapes encore candidates à vérifier sont les suivantes.

| Source | SHA-256 |
| --- | --- |
| Runes lot 1 | `44fd6a2418f9696ac180ce7086bc20c502e6f2e45704f3d891d4514a031b4184` |
| Runes lot 2 | `99e8e69a7d2c867ecd511bbb00b218ae5f03c513fa9335806c7ed67d9523a9dc` |
| Comptes enfants 01 | `2f37b959fbbb669e36e5516d720486c631e0db9e8ac0130b243dcf12581dd497` |
| Médias privés recettes 03 | `52a321cf7c54ff24a2ef84a37369d86cfef4321dce09e11133af407d975077b8` |

Les anciens contrôles de corps Famille/Missions s’interprètent au stade pour lequel ils ont été écrits. Après Runes et Enfants, vérifier les fonctions publiques et les corps natifs privés du candidat récent, ainsi que les droits effectifs. Les scripts historiques Stitch de liaison et désactivation, le contrôle métier `30-runtime-rollback.sql` et les scripts `roles-01` restent des références. Leur exécution ne fait pas partie de la reprise.

Le candidat contient la correction `f2ab4ab3` du prédicat `child_raw_module_read`. La résolution du contexte se fait dans le bloc qui traite les refus inter-foyers. Si l’inventaire retrouve le lot Enfants avec un corps antérieur, préparer un correctif ciblé sur cette fonction après comparaison des ACL. L’installateur Enfants refuse une deuxième exécution complète. [Correctif versionné](https://github.com/PortenartCo/dobby-demo/commit/f2ab4ab3)

La Santé reste sur `healthEssentialAvailable:false` dans `essai-stitch-v7/access-config.js`. Si `dobby_health_private.install_state` existe, relever `enabled` et `legacy_closed` sur sa ligne `singleton`, en lecture seule. Un état `enabled:true` demande un arbitrage distinct pour obtenir la fermeture côté serveur avant de déclarer Santé en veille. Garder l’état et les données historiques pendant ce contrôle. Si le registre d’identités ou les ACL Santé sont déjà installés, vérifier leur compatibilité dans le clone. Les migrations et la reprise Santé restent différées. L’administration des tiers et ses quatre installations historiques restent en dehors de la chaîne familiale. [Contrats Enfants](../comptes-enfants/README-SQL.md) · [État serveur et installation Santé](../sante-essentielle/INSTALLATION.md) · [Dossier de l’administration privée](administration-privee.md)

## 4. Recette familiale et ouverture des portes

**Réglages Auth.** Dans le Dashboard, vérifier le fournisseur Email, la confirmation obligatoire et l’inscription native autorisée pour la fenêtre convenue. Conserver la Site URL et l’URL de retour autorisée au format exact `https://portenartco.github.io/dobby-demo/`, sauf domaine de recette explicitement approuvé et déclaré sans caractère générique. Garder le lien natif `ConfirmationURL` dans les modèles. Prévoir un SMTP opérationnel qui livre à toutes les adresses de recette. La messagerie par défaut Supabase est réservée aux adresses des membres de l’équipe du projet et est actuellement limitée à deux messages par heure. Vérifier les quotas et conditions du plan réel avant d’engager les parcours. La clé publique `sb_publishable_` du projet est la seule clé destinée au navigateur. [Réglages DOBBY](../stitch19-20/supabase/DASHBOARD.md) · [Contraintes SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp)

**Deux parents.** Utiliser deux nouvelles adresses et deux profils de navigateur séparés. A s’inscrit, confirme son adresse dans le navigateur d’origine, se connecte et crée le foyer de recette par le flux natif. A envoie l’invitation ordinaire. B s’inscrit et confirme sa propre adresse, puis accepte cette invitation vers le même foyer. Vérifier les deux identités canoniques distinctes, les permissions Parent, la reconnexion et la récupération d’accès. Comparer l’inventaire privé des comptes, appartenances et liaisons historiques avant/après. Les conserver avec leur foyer et leurs données. La création du foyer de recette ne demande ni nettoyage, ni transfert, ni reliaison des anciens profils. Tester ensuite le service Storage réel avec un petit fichier fictif dans le foyer de recette. Parent A écrit, Parent B relit, et un compte extérieur reçoit un refus sur le chemin connu.

**Porte serveur Enfants.** Après comparaison du catalogue, preuve locale sur le candidat et tests Parent/Auth/Storage, confirmer `protocol:2`, `installed:true`, `storagePoliciesPresent:true` et `childAccessProtocol:1` dans `dobby_v7_family_capabilities()`. Une intervention habilitée et approuvée peut alors mettre `family_api_enabled`, `family_client_verified`, `storage_client_verified` et `child_link_client_verified` à `true` sur l’unique ligne `singleton` de `dobby_socle_private.install_state`. Le marqueur de protocole vient du SQL installé. L’opérateur conserve les valeurs avant/après et vérifie que `familyRolesVerified`, `storagePoliciesVerified` et `childAccountLinkVerified` deviennent vrais.

Transaction d’activation Enfants pour la fenêtre approuvée, après le précontrôle et la sauvegarde attestée :

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $activation$
BEGIN
  IF (public.dobby_v7_family_capabilities() @>
      '{"protocol":2,"installed":true,"storagePoliciesPresent":true,"childAccessProtocol":1}'::jsonb) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Catalogue Enfants ou Storage incomplet';
  END IF;
  UPDATE dobby_socle_private.install_state SET family_api_enabled=true,
    family_client_verified=true,storage_client_verified=true,child_link_client_verified=true
  WHERE singleton AND protocol=1;
  IF NOT FOUND OR (public.dobby_v7_family_capabilities() @>
      '{"familyRolesVerified":true,"storagePoliciesVerified":true,"childAccountLinkVerified":true}'::jsonb) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Portes Enfants non confirmées';
  END IF;
END $activation$;
COMMIT;
```

**Porte Missions/Runes.** Activer également `missions_client_verified` après validation du writer exact, des reçus et des contrôles Runes. Sous un foyer canonique, `dobby_missions_v3_capabilities` doit attester `protocol:3`, `runesLot1:1`, `runesLot2:1` et `clientVerified:true`. Le parent active ou récupère le partage du module Missions par son interface native. Les anciennes demandes en attente et les conflits de révision suivent la reprise native. Conserver le registre et les intentions déjà confirmées.

Dans une transaction distincte approuvée, cet `UPDATE ... RETURNING` doit rendre une seule ligne avant validation :

```sql
UPDATE dobby_socle_private.install_state SET missions_client_verified=true
WHERE singleton AND protocol=1 AND family_api_enabled AND family_client_verified
  AND storage_client_verified AND child_link_client_verified
RETURNING missions_client_verified;
```

**Porte client Enfants.** Passer `childAccountsAvailable:true` uniquement sur l’instance de recette contrôlée, puis dans la publication autorisée après la recette. Le client exige alors la capacité serveur du protocole 1 et le contexte canonique. Maintenir `healthEssentialAvailable:false` et `privateAdministrationAvailable:false` pour le lancement familial. L’ouverture serveur s’applique au projet et aux appels API, y compris si le client public garde son drapeau fermé. Réserver cet intervalle à la fenêtre approuvée et contrôler la diffusion des invitations.

**Contrôles finaux.** Deux enfants utilisent chacun leur adresse et une fiche existante. Vérifier l’identité inchangée, l’historique, les refus API et Storage, les événements et fichiers autorisés, E02 parent uniquement, la magie propre et la synchronisation après déconnexion ou changement de compte. Tester Mission historique à attribution unique, participation avec validation parentale, récompense surprise, bonus/correction, opérations concurrentes et refus d’agir pour un autre enfant. Suspendre un enfant de recette, tester avec son ancien JWT et vérifier que le second enfant et les deux parents restent utilisables. Relever les résultats et les écarts avant le GO. [Parcours comptes enfants](../comptes-enfants/README.md) · [Runes lot 2](../runes-lot2/README.md)

## 5. Retour arrière fonctionnel et reprise d’incident

1. En cas de fuite ou de problème enfant, fermer en priorité `child_link_client_verified` côté base et `childAccountsAvailable` côté client. Conserver les restrictions des tables, RPC et fichiers familiaux. Recontrôler les projections, les nouvelles acceptations, la réaction du client et les parcours Parent ordinaires. La porte globale laisse en place les appartenances, qui autorisent encore certaines lectures historiques comme les Courses. Pour couper les droits d’un compte précis, suspendre son appartenance via la fiche Parent ou le RPC autorisé `dobby_v7_suspend_child_access` et vérifier les refus avec le JWT émis avant la suspension. La liaison et l’historique sont conservés. La fermeture d’une porte s’inverse après correction vérifiée et nouveau GO.
2. Préserver le service Parent. Le script historique [Famille 05](../finalisation-socle/supabase/family/05-rollback-suspend.sql) ferme aussi les portes Famille/Storage et l’API Famille. Le réserver à une suspension du socle entier explicitement décidée. Fermer `missions_client_verified` pour neutraliser le chemin client V3 et les écritures V3 des enfants. Le Parent peut encore appeler directement le writer V3 tant que son privilège `EXECUTE` existe. Si l’incident exige de couper les appels directs V3, faire viser et répéter dans le clone la révocation `EXECUTE` du [rollback Missions 03](../finalisation-socle/supabase/missions/03-rollback-conservative.sql) avec les ACL actuelles. Consigner les droits à rendre pour une réouverture. Les anciens RPC V2 des foyers restés V2 suivent leur propre garde. Garder un client de lecture compatible avec le ledger et les événements Runes déjà écrits.
3. Conserver les comptes, profils, invitations consommées, recettes, octets et historiques. Si un fichier a circulé via une URL Storage signée, mesurer sa durée de validité et vérifier l’expiration ou les mécanismes de révocation réellement disponibles. Restaurer le client à partir d’un artefact vérifié seulement si ses ACL et son format de lecture sont compatibles avec l’état de la base. Reprendre l’ancien writer V2 sur un ledger V3/Runes ou retirer les restrictions Storage créerait un nouveau risque.
4. En cas de corruption, restaurer **la base et les octets correspondants** sur l’environnement isolé au point attesté. Comparer cette restauration avec l’état courant et inventorier les opérations postérieures au point de reprise avant de proposer une bascule. Préserver les écritures valides réconciliables. La reprise sur le projet familial exige ensuite une autorisation distincte.
