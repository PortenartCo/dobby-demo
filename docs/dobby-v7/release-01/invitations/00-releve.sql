-- Relevé restreint à la consigne de fermeture. Aucun identifiant ni corps SQL.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '5s';

SELECT current_user AS operator,
  (SELECT relowner::regrole::text FROM pg_class
    WHERE oid = 'dobby_v7_private.invitations'::regclass) AS table_owner,
  (SELECT jsonb_agg(jsonb_build_array(a.grantee::regrole::text, a.grantor::regrole::text,
      a.privilege_type, a.is_grantable) ORDER BY a.grantee, a.grantor, a.privilege_type)
    FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a
    WHERE c.oid = 'dobby_v7_private.invitations'::regclass) AS table_acl,
  has_table_privilege('dobby_socle_writer','dobby_v7_private.invitations','SELECT') AS writer_table_select,
  has_table_privilege('dobby_socle_writer','dobby_v7_private.invitations','INSERT') AS writer_table_insert,
  has_table_privilege('dobby_socle_writer','dobby_v7_private.invitations','UPDATE') AS writer_table_update,
  has_any_column_privilege('dobby_socle_writer','dobby_v7_private.invitations','INSERT') AS writer_effective_insert,
  has_any_column_privilege('dobby_socle_writer','dobby_v7_private.invitations','UPDATE') AS writer_effective_update,
  (SELECT count(*) FROM dobby_v7_private.invitations
    WHERE accepted_by IS NULL AND revoked_at IS NULL AND expires_at > now()) AS valid_pending,
  (SELECT count(*) FROM dobby_v7_private.account_links) AS canonical_links,
  (SELECT count(*) FROM public.dobby_v2_memberships WHERE active) AS active_memberships,
  (SELECT count(*) FROM dobby_v7_private.operations) AS receipts,
  (SELECT count(*) FROM auth.users u
    WHERE NOT EXISTS (SELECT FROM dobby_v7_private.account_links l WHERE l.user_id = u.id)) AS unlinked_auth,
  (SELECT count(*) FROM auth.users u
    WHERE (u.email_confirmed_at IS NOT NULL OR u.phone_confirmed_at IS NOT NULL)
      AND (u.banned_until IS NULL OR u.banned_until <= now())
      AND NOT EXISTS (SELECT FROM dobby_v7_private.account_links l WHERE l.user_id = u.id)
      AND EXISTS (SELECT FROM dobby_v7_private.pending_profiles p WHERE p.user_id = u.id)
      AND NOT EXISTS (SELECT FROM public.dobby_v2_memberships m WHERE m.user_id = u.id AND m.active))
    AS confirmed_unlinked_with_pending_profile,
  (SELECT jsonb_object_agg(p.oid::regprocedure::text,
      jsonb_build_object('owner', p.proowner::regrole::text,
        'definer', p.prosecdef, 'authenticated', has_function_privilege('authenticated',p.oid,'EXECUTE'),
        'definition_md5', md5(pg_get_functiondef(p.oid)),
        'source_without_cr_md5', md5(replace(p.prosrc,chr(13),''))))
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE (n.nspname = 'public' AND (p.proname ~ '^dobby_v7_(create|accept|preview|revoke).*invitation$'
        OR p.proname = 'dobby_v7_create_household'))
       OR (n.nspname = 'dobby_socle_private' AND p.proname IN ('create_invitation','accept_invitation','preview_invitation')))
    AS invitation_functions;

ROLLBACK;
