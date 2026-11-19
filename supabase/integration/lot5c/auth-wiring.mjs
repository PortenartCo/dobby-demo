// Composition of the reviewed bridge, not a new Auth architecture.
export const sessionBody='\n SELECT dobby_access_auth_bridge.session_is_live(p_user,p_session,p_after)\n';
export function wiring(){return `
GRANT dobby_access_writer,dobby_access_session_reader,dobby_access_identity_reader TO postgres WITH INHERIT TRUE, SET TRUE;
GRANT CREATE ON SCHEMA dobby_access_private TO dobby_access_writer,dobby_access_session_reader,dobby_access_identity_reader;
CREATE OR REPLACE FUNCTION dobby_access_private.session_is_live(p_user uuid,p_session uuid,p_after timestamptz)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $wire$${sessionBody}$wire$;
CREATE OR REPLACE FUNCTION dobby_access_private.auth_identity(p_user uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $wire$
 SELECT dobby_access_auth_bridge.auth_identity(p_user)
$wire$;
CREATE OR REPLACE FUNCTION dobby_access_private.auth_identity_page(p_after uuid,p_limit integer)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $wire$
 SELECT dobby_access_auth_bridge.auth_identity_page(p_after,p_limit)
$wire$;
-- Existing activator signatures/owners/ACL retained. Only installer can call.
-- A controlled positive canary proves visibility, not ACLs alone.
CREATE OR REPLACE FUNCTION dobby_access_private.enable_session_guard() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $wire$
DECLARE u uuid:=nullif(current_setting('dobby5c.probe_user',true),'')::uuid;
 s uuid:=nullif(current_setting('dobby5c.probe_session',true),'')::uuid;
BEGIN
 IF u IS NULL OR s IS NULL OR NOT coalesce(dobby_access_private.session_is_live(u,s,NULL),false)
  OR coalesce(dobby_access_private.session_is_live(NULL,s,NULL),true) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Controlled live-session bridge probe required';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM dobby_access_private.settings WHERE singleton) THEN RAISE EXCEPTION 'Bootstrap required'; END IF;
 UPDATE dobby_access_private.settings SET session_guard_ready=true WHERE singleton;
END $wire$;
CREATE OR REPLACE FUNCTION dobby_access_private.enable_identity_guard() RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $wire$
DECLARE u uuid:=nullif(current_setting('dobby5c.probe_user',true),'')::uuid; result jsonb;
 expected text:=nullif(current_setting('dobby5c.probe_email_sha256',true),'');
BEGIN
 IF current_user<>'postgres' OR u IS NULL OR expected IS NULL THEN RAISE EXCEPTION 'Controlled identity bridge probe required'; END IF;
 result:=dobby_access_auth_bridge.auth_identity(u);
 IF result->>'id' IS DISTINCT FROM u::text OR result->'confirmed' IS DISTINCT FROM 'true'::jsonb
  OR encode(sha256(convert_to(result->>'email','UTF8')),'hex') IS DISTINCT FROM expected THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Controlled confirmed-identity bridge probe required';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM dobby_access_private.settings WHERE singleton AND session_guard_ready) THEN RAISE EXCEPTION 'Live-session activation required first'; END IF;
 UPDATE dobby_access_private.settings SET identity_guard_ready=true WHERE singleton;
END $wire$;
REVOKE CREATE ON SCHEMA dobby_access_private FROM dobby_access_writer,dobby_access_session_reader,dobby_access_identity_reader;
GRANT dobby_access_writer,dobby_access_session_reader,dobby_access_identity_reader TO postgres WITH INHERIT FALSE, SET FALSE;
`;}
