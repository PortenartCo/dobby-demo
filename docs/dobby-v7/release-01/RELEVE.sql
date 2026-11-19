-- Relevé agrégé du socle DOBBY à exécuter uniquement sous un accès lecture seule.
-- Aucun export de lignes Auth, de corps SQL, d'identifiant, de lien ou d'objet.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '5s';

WITH canonical_adults AS (
  SELECT l.user_id, l.household_id, l.member_id
  FROM dobby_v7_private.account_links AS l
  JOIN public.dobby_v2_memberships AS m
    ON (m.user_id, m.household_id) = (l.user_id, l.household_id) AND m.active
  JOIN auth.users AS u ON u.id = l.user_id
    AND u.email_confirmed_at IS NOT NULL
    AND (u.banned_until IS NULL OR u.banned_until < now())
  JOIN public.dobby_v2_modules AS f ON f.household_id = l.household_id AND f.module = 'family'
  WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(f.payload->'familyMembers') = 'array' THEN f.payload->'familyMembers' ELSE '[]'::jsonb END
    ) AS member
    WHERE member->>'id' = l.member_id AND member->>'memberCategory' = 'parent'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.dobby_v2_memberships AS other
    WHERE other.user_id = l.user_id AND other.active AND other.household_id <> l.household_id
  )
), homes AS (
  SELECT household_id FROM canonical_adults GROUP BY household_id
  HAVING count(DISTINCT user_id) = 2 AND count(DISTINCT member_id) = 2
)
SELECT current_setting('server_version') AS postgres_version,
  (SELECT count(*) FROM dobby_v7_private.account_links) AS account_links,
  (SELECT count(DISTINCT user_id) FROM canonical_adults) AS confirmed_canonical_adults,
  (SELECT count(*) FROM homes) AS households_with_two_canonical_adults,
  (SELECT array_agg(DISTINCT module ORDER BY module) FROM public.dobby_v2_modules
    WHERE household_id IN (SELECT household_id FROM homes)) AS existing_modules,
  to_regnamespace('dobby_access_private') IS NULL AS admin_absent,
  has_function_privilege('authenticated','public.dobby_v7_context()','EXECUTE') AS context_executable,
  has_function_privilege('authenticated','public.dobby_missions_v2_capabilities(uuid)','EXECUTE') AS v2_capability_executable,
  has_function_privilege('authenticated','public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)','EXECUTE') AS v2_write_executable,
  EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'dobby-family-files' AND NOT public) AS family_bucket_private,
  EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.dobby_v2_grocery'::regclass
    AND attname = 'at_home_quantity' AND NOT attisdropped) AS grocery_availability,
  (SELECT count(*) FROM dobby_v7_private.invitations
    WHERE accepted_by IS NULL AND revoked_at IS NULL AND expires_at > now()) AS outstanding_unconsumed_invitations,
  (SELECT count(*) FROM auth.users
    WHERE email_confirmed_at IS NULL AND confirmation_sent_at IS NOT NULL) AS pending_email_confirmations,
  (SELECT family_api_enabled FROM dobby_socle_private.install_state WHERE singleton) AS family_api_enabled,
  (SELECT missions_client_verified IS TRUE FROM dobby_socle_private.install_state WHERE singleton) AS missions_v3_client_verified,
  (SELECT child_link_client_verified IS TRUE FROM dobby_socle_private.install_state WHERE singleton) AS child_link_client_verified,
  (SELECT storage_client_verified IS TRUE FROM dobby_socle_private.install_state WHERE singleton) AS storage_client_verified;

SELECT p.proname, p.proowner::regrole::text AS owner,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_exec,
  has_function_privilege('postgres', p.oid, 'EXECUTE WITH GRANT OPTION') AS postgres_grant_option,
  pg_has_role('postgres', p.proowner, 'USAGE') AS postgres_owner_usage,
  pg_has_role('postgres', p.proowner, 'SET') AS postgres_owner_set,
  EXISTS (
    SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) AS acl
    WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
  ) AS public_exec
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname ~ '^dobby_v7_(create|accept|preview).*invitation$'
ORDER BY p.proname;

ROLLBACK;
