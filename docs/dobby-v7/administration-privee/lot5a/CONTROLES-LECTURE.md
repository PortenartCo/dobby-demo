# Lectures à compléter — aucun appel exécuté sur la base hébergée

Le connecteur a refusé la première lecture de projet. Tous les contrôles de cette page sont **NON VÉRIFIÉS**. Ils ne doivent être utilisés que lorsque l’accès en lecture autorisé au projet personnel aura été rétabli, sans nouveau secret ou autre projet. Un refus doit être conservé comme preuve, pas contourné.

## Projection nécessaire, sans données nominatives

| Objet à lire | Sortie minimale attendue / comparaison |
| --- | --- |
| Projet | Identifiant et nom exactement conformes, état ; versions composants. Ne pas demander les API keys. |
| Migrations | Versions/noms et état appliqué, croisés aux quatre SHA-256 candidats ; catalogue effectif indispensable pour les anciennes installations manuelles. |
| PostgreSQL | Version ≥16, identité de l’installateur, attributs et ADMIN/INHERIT/SET effectifs des seuls rôles concernés. Le rôle de lecture du diagnostic n’a pas à devenir installateur. |
| `auth.sessions` | Types des quatre colonnes, owner/RLS/FORCE RLS, grants effectifs du reader et empreintes des policies qui lui sont applicables ; aucune ligne de session, jeton ou UUID de sujet. |
| `auth.users` | Types `id,email,email_confirmed_at`, grants et RLS du reader d’identité ; **aucun SELECT des valeurs**, aucun `listUsers`/`listAccess`. Vérifier l’absence de droits supplémentaires. |
| SQL familial/Missions | Signatures, defaults, types de retour, owners, ACL, SECURITY DEFINER/search_path, empreintes du corps et de la définition ; 27 signatures classées plus les 12 dépendances absentes de la preuve locale. Définitions nécessaires à une revue de delta uniquement par canal privé autorisé. |
| Storage | Owners/RLS/ACL de `objects`/`buckets`, capacité existante de verrouillage/CREATE POLICY, helpers et huit policies natives, garde éventuelle ; attributs et memberships des rôles navigateur. Ne pas modifier les octets ni les métadonnées. |
| Buckets | Configuration du bucket familial : privé, limite de taille et MIME ; nombre/configuration des autres buckets sans noms d’objets ou chemins personnels. Protocoles S3/TUS et transformations activés, producteurs de signatures recensés. |
| API/Edge | Schémas exposés excluant les schémas privés ; versions et empreintes de la fonction, mode gateway ; existence des variables attendues sous forme de booléens, jamais leurs valeurs. |
| Auth/SMTP | Signup, TTL OTP, origines/retours, conformité des templates, SMTP configuré/TLS et circuit de recette ; projection expurgée, aucun password/token ni adresse nominative. |
| Capacités anciennes | Inventaire des producteurs et TTL maximum attestés, dernière émission, états/identifiants non secrets des clés URL, TTL/cache et capacité de purge. Ne pas lire, créer ou publier les URL/tokens eux-mêmes. |
| Conservation/restauration | Attestation privée owner/A/B et liens existants, sauvegardes disponibles/rétention, couverture DB et octets, procédure exercée. Aucun dump ni manifeste réel dans Git. |

Les colonnes de `pg_auth_members` du paquet exigent PG16+. Le contrôle de version doit précéder toute requête les utilisant. Si les readers n’existent pas encore, leur permission/visibilité future est **non testable à ce stade**, pas implicitement acquise. Les policies ou ACL seuls ne prouvent pas une lecture effective sous RLS : une preuve booléenne sur une session/identité **fictive connue**, dans la future recette autorisée, doit compléter le catalogue. Aucun `SET ROLE` vers un rôle géré ne fait partie du diagnostic.

## Exemples bornés de lectures de métadonnées

Ces SELECT sont des propositions documentaires, non exécutées. Les exécuter dans un contexte déjà autorisé en lecture seule ; ne pas les remplacer par un script de migration.

```sql
SELECT current_user AS diagnostic_role,
       current_setting('server_version') AS postgres_version,
       current_setting('server_version_num')::integer >= 160000 AS syntax_floor_met;

SELECT n.nspname, c.relname, pg_get_userbyid(c.relowner) AS owner,
       c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE (n.nspname='auth' AND c.relname IN ('sessions','users'))
   OR (n.nspname='storage' AND c.relname IN ('objects','buckets'))
ORDER BY n.nspname,c.relname;

SELECT r.rolname, r.rolcanlogin, r.rolsuper, r.rolbypassrls,
       r.rolcreaterole, r.rolcreatedb, r.rolreplication
FROM pg_roles r
WHERE r.rolname IN ('postgres','anon','authenticated','dobby_access_writer',
 'dobby_access_session_reader','dobby_access_identity_reader','dobby_v7_writer',
 'dobby_socle_writer','dobby_missions_v2_writer')
ORDER BY r.rolname;

SELECT n.nspname, c.relname, p.polname, p.polcmd, p.polpermissive,
       md5(jsonb_build_array(p.polroles::text,
         pg_get_expr(p.polqual,p.polrelid),
         pg_get_expr(p.polwithcheck,p.polrelid))::text) AS policy_fingerprint
FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE (n.nspname='auth' AND c.relname IN ('sessions','users'))
   OR (n.nspname='storage' AND c.relname IN ('objects','buckets'))
ORDER BY n.nspname,c.relname,p.polname;
```

Ne pas publier les expressions brutes de policies susceptibles de contenir des identifiants. L’empreinte ci-dessus facilite un comparatif privé sur la même base ; les OID de rôles ne sont pas stables entre bases. Pour une comparaison à la fixture, normaliser les rôles par leurs noms et suivre les références exactes des migrations ; ne pas traiter cette empreinte simplifiée comme le validateur complet des candidates.

Les manifestes de comparaison existent déjà : migration Lot 2A (`access_2a_manifest`, `access_2a_reference`), migration Lot 2B (`access_2b_helpers`, policies temporaires de référence), préflight Lot 3. **Ne pas exécuter ces migrations pour obtenir leur préflight.** Le futur opérateur doit produire une lecture de delta séparée et revue, puis seulement proposer un paquet adapté si nécessaire. Aucun inventaire des migrations, des buckets ou des fonctions du projet n’est prétendu avoir été obtenu ici.
