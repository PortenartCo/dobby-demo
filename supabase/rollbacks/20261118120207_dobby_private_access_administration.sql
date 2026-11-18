-- Conservative Lot 3 rollback: stop administration/delivery, retain guards,
-- admissions, decisions, authorization/session boundaries and canonical links.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $$ BEGIN
 IF current_user<>'postgres' OR to_regprocedure('public.dobby_access_admin(text,jsonb)') IS NULL THEN
  RAISE EXCEPTION 'Verified installer and installed Lot 3 required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid='dobby_access_writer'::regrole
  AND member=current_user::regrole AND admin_option AND NOT inherit_option AND NOT set_option) THEN
  RAISE EXCEPTION 'Existing closed ADMIN maintenance capability required'; END IF;
END $$;
GRANT dobby_access_writer TO postgres WITH INHERIT TRUE, SET TRUE;
UPDATE dobby_access_private.settings SET administration_enabled=false WHERE singleton;
REVOKE ALL ON FUNCTION public.dobby_access_admin(text,jsonb),public.dobby_access_accept(uuid,jsonb,uuid),
 public.dobby_access_request_family_account(text,text,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT dobby_access_writer TO postgres WITH INHERIT FALSE, SET FALSE;
-- No old ACL/function restoration: free invitation creators remain closed,
-- active existing accounts keep ordinary context/profile/family access.
NOTIFY pgrst,'reload schema';
COMMIT;
