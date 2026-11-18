-- Lot 3 candidate: local-only validation. No Auth grants, real identities,
-- hosted calls, public-signup change or family release activation.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $preflight$
BEGIN
 IF current_user<>'postgres' OR to_regprocedure('dobby_access_private.assert_owner()') IS NULL
  OR to_regprocedure('dobby_access_legacy.public__dobby_v7_accept_invitation(text,uuid)') IS NULL
  OR to_regnamespace('dobby_access_lot3_legacy') IS NOT NULL THEN
  RAISE EXCEPTION 'Verified installer, Lot 1/2A and unapplied Lot 3 required';
 END IF;
 IF EXISTS(SELECT 1 FROM (VALUES
 ('dobby_socle_private.accept_invitation(text,uuid,text)','ca2d468a1b8ec7c4401290f0c0bac3f3'),
 ('dobby_socle_private.create_invitation(text,integer,uuid)','8d86dfd05690f3cd5a695245a0bb405e'),
 ('dobby_socle_private.preview_invitation(text,text)','ab75b223e47ee2b4201fa5f3fb444c14'),
 ('dobby_socle_private.add_pending_member(uuid,uuid)','52b9ed6e79041b6860d6a5d614ed98f1')) r(sig,body)
 LEFT JOIN pg_proc p ON p.oid=to_regprocedure(r.sig)
 WHERE p.oid IS NULL OR md5(p.prosrc)<>r.body OR pg_get_userbyid(p.proowner)<>'dobby_socle_writer') THEN
  RAISE EXCEPTION 'Native family definition/owner drift';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('dobby_access_writer','dobby_socle_writer','dobby_v7_writer')
  AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole)) THEN RAISE EXCEPTION 'Closed writers required'; END IF;
END $preflight$;
GRANT dobby_access_writer,dobby_socle_writer,dobby_v7_writer TO postgres WITH INHERIT TRUE, SET TRUE;
CREATE ROLE dobby_access_identity_reader NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT dobby_access_identity_reader TO postgres WITH INHERIT TRUE, SET TRUE;
CREATE SCHEMA dobby_access_lot3_legacy;
REVOKE ALL ON SCHEMA dobby_access_lot3_legacy FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE,CREATE ON SCHEMA dobby_access_lot3_legacy TO dobby_access_writer,dobby_socle_writer;
GRANT CREATE ON SCHEMA dobby_access_private,public TO dobby_access_writer;
GRANT CREATE ON SCHEMA dobby_socle_private TO dobby_socle_writer;
GRANT USAGE,CREATE ON SCHEMA dobby_access_private TO dobby_access_identity_reader;
ALTER TABLE dobby_access_private.settings ADD COLUMN identity_guard_ready boolean NOT NULL DEFAULT false;
ALTER TABLE dobby_access_private.settings ADD COLUMN child_delivery_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE dobby_access_private.settings ADD COLUMN administration_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE dobby_access_private.admissions ADD COLUMN revision bigint NOT NULL DEFAULT 1 CHECK(revision BETWEEN 1 AND 9007199254740990);
ALTER TABLE dobby_access_private.admissions ADD COLUMN requester_generation bigint NOT NULL DEFAULT 0;
ALTER TABLE dobby_access_private.admissions ADD COLUMN invitation_id uuid;
-- Decision epoch is immutable once assigned. Delivery/recovery never advances
-- it across a suspension/reactivation boundary before an Auth UUID was bound.
ALTER TABLE dobby_access_private.admissions ADD COLUMN approved_at timestamptz;
ALTER TABLE dobby_access_private.admissions ADD CONSTRAINT access_approval_epoch_required
 CHECK(state NOT IN ('approved','delivering','sent','accepted') OR approved_at IS NOT NULL) NOT VALID;
CREATE FUNCTION dobby_access_private.guard_approval_epoch() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF OLD.approved_at IS NOT NULL AND NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Approval decision epoch is immutable'; END IF;
 IF OLD.approved_at IS NULL AND NEW.approved_at IS NOT NULL AND NOT (OLD.state='requested' AND NEW.state='approved') THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Approval epoch requires an actual approval transition'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER access_approval_epoch_immutable BEFORE UPDATE OF approved_at ON dobby_access_private.admissions
 FOR EACH ROW EXECUTE FUNCTION dobby_access_private.guard_approval_epoch();
ALTER TABLE dobby_v7_private.invitations ADD COLUMN admission_id uuid REFERENCES dobby_access_private.admissions(id);
ALTER TABLE dobby_v7_private.invitations ADD COLUMN target_user_id uuid REFERENCES auth.users(id);
-- Existing consumed links are preserved. Only outstanding free bearer links close.
UPDATE dobby_v7_private.invitations SET revoked_at=clock_timestamp()
 WHERE accepted_by IS NULL AND revoked_at IS NULL;
CREATE UNIQUE INDEX access_v7_one_admission ON dobby_v7_private.invitations(admission_id) WHERE admission_id IS NOT NULL;
ALTER TABLE dobby_v7_private.invitations ADD CONSTRAINT access_new_invitation_binding
 CHECK(accepted_by IS NOT NULL OR revoked_at IS NOT NULL OR (admission_id IS NOT NULL AND target_user_id IS NOT NULL));
CREATE TABLE dobby_access_private.operation_receipts(
 actor_id uuid NOT NULL REFERENCES auth.users(id),operation_id uuid NOT NULL,
 command text NOT NULL,request_digest bytea NOT NULL,result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(actor_id,operation_id));
CREATE TABLE dobby_access_private.deliveries(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),admission_id uuid NOT NULL REFERENCES dobby_access_private.admissions(id),
 actor_id uuid NOT NULL REFERENCES auth.users(id),operation_id uuid NOT NULL,
 state text NOT NULL CHECK(state IN ('attempting','sent','uncertain','failed')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(actor_id,operation_id));
DO $tables$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['operation_receipts','deliveries'] LOOP
  EXECUTE format('ALTER TABLE dobby_access_private.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE dobby_access_private.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON dobby_access_private.%I FROM PUBLIC,anon,authenticated,service_role',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON dobby_access_private.%I TO dobby_access_writer',t);
  EXECUTE format('CREATE POLICY access_writer ON dobby_access_private.%I TO dobby_access_writer USING(true) WITH CHECK(true)',t);
 END LOOP;
END $tables$;
CREATE TRIGGER access_receipts_immutable BEFORE UPDATE OR DELETE ON dobby_access_private.operation_receipts
 FOR EACH ROW EXECUTE FUNCTION dobby_access_private.reject_history_mutation();
CREATE TRIGGER access_receipts_no_truncate BEFORE TRUNCATE ON dobby_access_private.operation_receipts
 FOR EACH STATEMENT EXECUTE FUNCTION dobby_access_private.reject_history_mutation();

-- Retain immutable native bodies in a closed schema; keep original API OIDs.
DO $backup$
DECLARE sig text; f record; def text;
BEGIN
 FOREACH sig IN ARRAY ARRAY['public.dobby_access_context()',
 'public.dobby_access_set_status(uuid,text,bigint,uuid,boolean)',
 'dobby_socle_private.create_invitation(text,integer,uuid)',
 'dobby_socle_private.accept_invitation(text,uuid,text)',
 'dobby_socle_private.preview_invitation(text,text)'] LOOP
  SELECT p.*,n.nspname,pg_get_functiondef(p.oid) definition INTO f FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.oid=to_regprocedure(sig);
  def:=replace(f.definition,format('FUNCTION %I.%I(',f.nspname,f.proname),format('FUNCTION dobby_access_lot3_legacy.%I(',f.nspname||'__'||f.proname));
  EXECUTE def;
  EXECUTE format('ALTER FUNCTION dobby_access_lot3_legacy.%I(%s) OWNER TO %I',f.nspname||'__'||f.proname,pg_get_function_identity_arguments(f.oid),pg_get_userbyid(f.proowner));
  EXECUTE format('REVOKE ALL ON FUNCTION dobby_access_lot3_legacy.%I(%s) FROM PUBLIC,anon,authenticated,service_role',f.nspname||'__'||f.proname,pg_get_function_identity_arguments(f.oid));
 END LOOP;
END $backup$;

CREATE FUNCTION dobby_access_private.auth_identity(p_user uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('id',id,'email',lower(btrim(email)),'confirmed',email_confirmed_at IS NOT NULL)
 FROM auth.users WHERE id=p_user
$$;
ALTER FUNCTION dobby_access_private.auth_identity(uuid) OWNER TO dobby_access_identity_reader;
REVOKE ALL ON FUNCTION dobby_access_private.auth_identity(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION dobby_access_private.auth_identity(uuid) TO dobby_access_writer;
-- No managed-schema privilege is granted by this candidate. A separately
-- authorized Auth-schema owner may grant just USAGE(auth), SELECT(id,email,
-- email_confirmed_at), then the verified installer explicitly enables it.
CREATE FUNCTION dobby_access_private.enable_identity_guard() RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF current_user<>'postgres' OR NOT has_schema_privilege('dobby_access_identity_reader','auth','USAGE')
  OR NOT has_column_privilege('dobby_access_identity_reader','auth.users','id','SELECT')
  OR NOT has_column_privilege('dobby_access_identity_reader','auth.users','email','SELECT')
  OR NOT has_column_privilege('dobby_access_identity_reader','auth.users','email_confirmed_at','SELECT') THEN
  RAISE EXCEPTION 'Explicit minimal Auth identity grant required';
 END IF;
 IF has_table_privilege('dobby_access_identity_reader','auth.users','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES')
  OR EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='auth.users'::regclass AND attnum>0 AND NOT attisdropped AND attname NOT IN ('id','email','email_confirmed_at')
   AND has_column_privilege('dobby_access_identity_reader','auth.users',attname,'SELECT,INSERT,UPDATE,REFERENCES')) THEN
  RAISE EXCEPTION 'Auth identity grants exceed reviewed projection';
 END IF;
 UPDATE dobby_access_private.settings SET identity_guard_ready=true WHERE singleton AND session_guard_ready;
 IF NOT FOUND THEN RAISE EXCEPTION 'Session guard and bootstrap required'; END IF;
END $$;
CREATE FUNCTION dobby_access_private.scoped_subject() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE who jsonb:=dobby_access_private.request_identity(); a dobby_access_private.authorizations%ROWTYPE;
BEGIN
 IF who IS NULL OR NOT EXISTS(SELECT 1 FROM dobby_access_private.settings WHERE singleton AND identity_guard_ready AND session_guard_ready AND administration_enabled) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Verified admission session required'; END IF;
 SELECT * INTO a FROM dobby_access_private.authorizations WHERE user_id=(who->>'userId')::uuid;
 IF a.status='suspended' OR a.session_boundary_pending OR NOT dobby_access_private.session_is_live((who->>'userId')::uuid,(who->>'sessionId')::uuid,a.sessions_valid_after) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Admission session unavailable'; END IF;
 RETURN (who->>'userId')::uuid;
END $$;
CREATE FUNCTION dobby_access_private.assert_requester(p_user uuid,p_generation bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM dobby_access_private.authorizations WHERE user_id=p_user AND status='active'
  AND NOT session_boundary_pending AND generation=p_generation FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Family requester no longer authorized'; END IF;
END $$;
CREATE FUNCTION dobby_access_private.lock_admission_actors(p_target uuid,p_requester uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE person uuid;
BEGIN
 FOR person IN SELECT DISTINCT item FROM unnest(ARRAY[p_target,p_requester]) item WHERE item IS NOT NULL ORDER BY item LOOP
  -- Owner assertion already holds SHARE. Never upgrade it while concurrent
  -- owner requests may also hold SHARE. Other requesters need only stability.
  IF person=p_target AND NOT EXISTS(SELECT 1 FROM dobby_access_private.settings WHERE singleton AND owner_user_id=person) THEN
   PERFORM 1 FROM dobby_access_private.authorizations WHERE user_id=person FOR UPDATE;
  ELSE
   PERFORM 1 FROM dobby_access_private.authorizations WHERE user_id=person FOR SHARE;
  END IF;
 END LOOP;
END $$;
CREATE FUNCTION dobby_access_private.child_delivery_ready() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce((SELECT child_delivery_enabled AND administration_enabled FROM dobby_access_private.settings WHERE singleton),false)
$$;
CREATE FUNCTION dobby_access_private.admission_json(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id',id,'email',email,'purpose',purpose,'revision',revision,'state',state,
 'targetUserId',target_user_id,'expiresAt',expires_at,'approvedAt',approved_at,'householdId',household_id,'memberId',member_id,
 'requestedBy',requested_by,'requiresProfile',purpose<>'family-child') FROM dobby_access_private.admissions WHERE id=p_id
$$;
CREATE FUNCTION dobby_access_private.payload_keys(p_value jsonb,p_required text[],p_optional text[] DEFAULT '{}') RETURNS void
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
BEGIN
 IF jsonb_typeof(p_value) IS DISTINCT FROM 'object' OR octet_length(p_value::text)>8192
  OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_value) k WHERE NOT k=ANY(p_required||p_optional))
  OR EXISTS(SELECT 1 FROM unnest(p_required) k WHERE NOT p_value?k OR p_value->k='null'::jsonb) THEN
  RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid closed command payload'; END IF;
END $$;
CREATE FUNCTION dobby_access_private.uuid_value(p_value jsonb,p_key text) RETURNS uuid
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
BEGIN
 IF jsonb_typeof(p_value->p_key) IS DISTINCT FROM 'string' OR (p_value->>p_key)!~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
  RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='UUID field required'; END IF;
 RETURN (p_value->>p_key)::uuid;
END $$;
CREATE FUNCTION dobby_access_private.revision_value(p_value jsonb,p_allow_zero boolean DEFAULT false) RETURNS bigint
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE n numeric;
BEGIN
 IF jsonb_typeof(p_value->'expectedRevision') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Revision required'; END IF;
 n:=(p_value->>'expectedRevision')::numeric;
 IF n<>trunc(n) OR n<(CASE WHEN p_allow_zero THEN 0 ELSE 1 END) OR n>9007199254740990 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid revision'; END IF;
 RETURN n::bigint;
END $$;

-- These family-owned bridges reveal no family contents to metadata writers.
CREATE FUNCTION dobby_socle_private.access_request_target(p_requester uuid,p_household uuid,p_member text,p_require_child_gate boolean DEFAULT false,p_admission uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l dobby_v7_private.account_links%ROWTYPE; row public.dobby_v2_modules%ROWTYPE; parent jsonb; target jsonb;
BEGIN
 SELECT * INTO l FROM dobby_v7_private.account_links WHERE user_id=p_requester;
 IF NOT FOUND OR l.household_id IS DISTINCT FROM p_household OR EXISTS(SELECT 1 FROM public.dobby_v2_memberships WHERE user_id=p_requester AND active AND household_id<>p_household) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Canonical requester household required'; END IF;
 PERFORM 1 FROM public.dobby_v2_memberships WHERE user_id=p_requester AND household_id=p_household AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Active requester membership required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('dobby-family-socle:'||p_household::text,0));
 SELECT * INTO row FROM public.dobby_v2_modules WHERE household_id=p_household AND module='family' FOR UPDATE;
 SELECT e INTO parent FROM jsonb_array_elements(dobby_socle_private.members(row.payload)) e WHERE e->>'id'=l.member_id AND e->>'memberCategory'='parent';
 IF parent IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Canonical Parent requester required'; END IF;
 IF p_member IS NOT NULL THEN
  SELECT e INTO target FROM jsonb_array_elements(dobby_socle_private.members(row.payload)) e WHERE e->>'id'=p_member AND e->>'memberCategory'='child';
  IF target IS NULL OR EXISTS(SELECT 1 FROM dobby_v7_private.account_links WHERE household_id=p_household AND member_id=p_member) THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Exact unlinked child required'; END IF;
  IF p_require_child_gate AND (NOT dobby_access_private.child_delivery_ready() OR NOT EXISTS(SELECT 1 FROM dobby_socle_private.install_state
   WHERE singleton AND family_api_enabled AND family_client_verified AND storage_client_verified AND child_link_client_verified)) THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Child delivery release remains closed'; END IF;
  IF p_require_child_gate AND EXISTS(SELECT 1 FROM dobby_v7_private.invitations
   WHERE household_id=p_household AND target_member_id=p_member AND invitation_kind='child-account'
    AND accepted_by IS NULL AND revoked_at IS NULL AND expires_at>clock_timestamp()
    AND (p_admission IS NULL OR admission_id IS DISTINCT FROM p_admission)) THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Another live child invitation already reserves this target'; END IF;
 END IF;
 RETURN jsonb_build_object('householdId',p_household,'memberId',p_member);
END $$;
CREATE FUNCTION dobby_socle_private.access_request_household(p_requester uuid,p_member text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE h uuid;
BEGIN
 SELECT household_id INTO h FROM dobby_v7_private.account_links WHERE user_id=p_requester;
 IF h IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Canonical Parent required'; END IF;
 PERFORM dobby_socle_private.access_request_target(p_requester,h,p_member,false);
 RETURN h;
END $$;
CREATE FUNCTION dobby_socle_private.access_issue_invitation(p_admission uuid,p_requester uuid,p_target uuid,p_household uuid,p_member text,p_expires timestamptz) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE token text; inv uuid:=p_admission;
BEGIN
 PERFORM dobby_socle_private.access_request_target(p_requester,p_household,p_member,true,p_admission);
 IF p_member IS NOT NULL THEN
  -- Retain expired child invitations as revoked history. The existing unique
  -- partial index intentionally includes expired links until they are revoked.
  UPDATE dobby_v7_private.invitations SET revoked_at=clock_timestamp()
  WHERE household_id=p_household AND target_member_id=p_member AND invitation_kind='child-account'
   AND accepted_by IS NULL AND revoked_at IS NULL AND expires_at<=clock_timestamp();
 END IF;
 token:=dobby_socle_private.invitation_token(p_requester,inv);
 INSERT INTO dobby_v7_private.invitations(id,household_id,created_by,token_hash,expires_at,target_member_id,invitation_kind,admission_id,target_user_id)
 VALUES(inv,p_household,p_requester,sha256(convert_to(token,'UTF8')),p_expires,p_member,CASE WHEN p_member IS NULL THEN 'member' ELSE 'child-account' END,p_admission,p_target)
 ON CONFLICT(id) DO UPDATE SET expires_at=excluded.expires_at
 WHERE dobby_v7_private.invitations.admission_id=p_admission AND dobby_v7_private.invitations.target_user_id=p_target
  AND dobby_v7_private.invitations.accepted_by IS NULL AND dobby_v7_private.invitations.revoked_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Invitation binding cannot be replaced'; END IF;
 RETURN inv;
END $$;
CREATE FUNCTION dobby_socle_private.access_revoke_invitations(p_admission uuid DEFAULT NULL,p_user uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE dobby_v7_private.invitations SET revoked_at=coalesce(revoked_at,clock_timestamp())
 WHERE accepted_by IS NULL AND revoked_at IS NULL AND ((p_admission IS NOT NULL AND admission_id=p_admission)
  OR (p_user IS NOT NULL AND (target_user_id=p_user OR created_by=p_user)));
END $$;
CREATE FUNCTION dobby_socle_private.access_prepare_profile(p_profile jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_socle_private.actor(); p jsonb:=dobby_socle_private.validate_profile(p_profile);
BEGIN
 IF EXISTS(SELECT 1 FROM dobby_v7_private.account_links WHERE user_id=u) OR EXISTS(SELECT 1 FROM public.dobby_v2_memberships WHERE user_id=u AND active) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Already linked account requires explicit review'; END IF;
 INSERT INTO dobby_v7_private.pending_profiles(user_id,profile) VALUES(u,p)
 ON CONFLICT(user_id) DO UPDATE SET profile=excluded.profile;
END $$;
CREATE FUNCTION dobby_socle_private.access_assert_first_household() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_socle_private.lock_actor();
BEGIN
 IF EXISTS(SELECT 1 FROM dobby_v7_private.account_links WHERE user_id=u)
  OR EXISTS(SELECT 1 FROM public.dobby_v2_memberships WHERE user_id=u)
  OR EXISTS(SELECT 1 FROM dobby_v7_private.operations WHERE actor_id=u AND kind='create_household') THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='First household only; existing canonical history requires explicit review'; END IF;
END $$;
-- Only this bridge may use the already checked stored invitation secret.
CREATE FUNCTION dobby_socle_private.access_accept_invitation(p_admission uuid,p_operation uuid,p_kind text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE inv dobby_v7_private.invitations%ROWTYPE; token text;
BEGIN
 SELECT * INTO inv FROM dobby_v7_private.invitations WHERE admission_id=p_admission;
 IF NOT FOUND OR inv.target_user_id IS DISTINCT FROM dobby_socle_private.actor() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Bound invitation required'; END IF;
 token:=dobby_socle_private.invitation_token(inv.created_by,inv.id);
 RETURN dobby_socle_private.accept_invitation(token,p_operation,p_kind);
END $$;
CREATE FUNCTION dobby_socle_private.access_child_ready() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT dobby_access_private.child_delivery_ready() AND EXISTS(SELECT 1 FROM dobby_socle_private.install_state
 WHERE singleton AND family_api_enabled AND family_client_verified AND storage_client_verified AND child_link_client_verified)
$$;

CREATE FUNCTION dobby_access_private.assert_invitation_admission(p_token text,p_kind text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_access_private.scoped_subject(); a dobby_access_private.admissions%ROWTYPE; identity jsonb;
BEGIN
 SELECT ad.* INTO a FROM dobby_access_private.admissions ad WHERE ad.invitation_id IN
  (SELECT dobby_socle_private.access_invitation_admission(p_token,p_kind,u));
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Owner-approved bound invitation required'; END IF;
 IF a.target_user_id IS DISTINCT FROM u OR a.state NOT IN ('sent','accepted') OR a.expires_at<=clock_timestamp()
  OR NOT EXISTS(SELECT 1 FROM dobby_access_private.authorizations WHERE user_id=u AND status='active' AND generation=a.target_generation AND NOT session_boundary_pending) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Admission unavailable'; END IF;
 identity:=dobby_access_private.auth_identity(u);
 IF identity->>'email' IS DISTINCT FROM a.email OR identity->'confirmed' IS DISTINCT FROM 'true'::jsonb
  OR (p_kind='child-account' AND NOT dobby_socle_private.access_child_ready()) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Confirmed admission identity and release required'; END IF;
 PERFORM dobby_access_private.assert_requester(a.requested_by,a.requester_generation);
END $$;
-- Returns only the opaque invitation ID; accepted legacy links remain replayable
-- through native receipts after normal active-session checks.
CREATE FUNCTION dobby_socle_private.access_invitation_admission(p_token text,p_kind text,p_user uuid) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE inv dobby_v7_private.invitations%ROWTYPE;
BEGIN
 SELECT * INTO inv FROM dobby_v7_private.invitations WHERE token_hash=sha256(convert_to(coalesce(p_token,''),'UTF8')) AND invitation_kind=p_kind;
 IF inv.admission_id IS NULL OR inv.target_user_id IS DISTINCT FROM p_user THEN RETURN NULL; END IF;
 RETURN inv.id;
END $$;
CREATE OR REPLACE FUNCTION dobby_socle_private.accept_invitation(p_token text,p_operation_id uuid,p_kind text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM dobby_access_private.assert_invitation_admission(p_token,p_kind);
 RETURN dobby_access_lot3_legacy.dobby_socle_private__accept_invitation(p_token,p_operation_id,p_kind);
END $$;
CREATE OR REPLACE FUNCTION dobby_socle_private.create_invitation(p_member_id text,p_expires_in_hours integer,p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Request a nominative family account for owner approval'; END $$;
CREATE OR REPLACE FUNCTION dobby_socle_private.preview_invitation(p_token text,p_kind text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 BEGIN PERFORM dobby_access_private.assert_invitation_admission(p_token,p_kind);
 EXCEPTION WHEN insufficient_privilege THEN RETURN jsonb_build_object('status','invalid'); END;
 RETURN dobby_access_lot3_legacy.dobby_socle_private__preview_invitation(p_token,p_kind);
END $$;

CREATE FUNCTION public.dobby_access_request_family_account(p_email text,p_kind text,p_member_id text,p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_access_private.assert_active(); h uuid; g bigint; mail text:=lower(btrim(p_email)); a uuid;
 digest bytea; prior dobby_access_private.operation_receipts%ROWTYPE;
BEGIN
 IF p_operation_id IS NULL OR p_kind NOT IN ('family-parent','family-child') OR p_kind IS NULL OR mail IS NULL OR length(mail)>254
  OR mail!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  OR (p_kind='family-parent' AND p_member_id IS NOT NULL) OR (p_kind='family-child' AND (p_member_id IS NULL OR length(p_member_id) NOT BETWEEN 1 AND 120)) THEN
  RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Nominative email and exact family purpose required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('dobby-access-operation:'||u::text||':'||p_operation_id::text,0));
 SELECT generation INTO g FROM dobby_access_private.authorizations WHERE user_id=u;
 h:=dobby_socle_private.access_request_household(u,p_member_id);
 digest:=sha256(convert_to(jsonb_build_array(mail,p_kind,p_member_id,h)::text,'UTF8'));
 SELECT * INTO prior FROM dobby_access_private.operation_receipts WHERE actor_id=u AND operation_id=p_operation_id;
 IF FOUND THEN
  IF prior.command<>'requestFamily' OR prior.request_digest<>digest THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Operation reused with different request'; END IF;
  RETURN prior.result||jsonb_build_object('replayed',true);
 END IF;
 INSERT INTO dobby_access_private.admissions(email,purpose,household_id,member_id,requested_by,requester_generation,expires_at,operation_id)
 VALUES(mail,p_kind,h,p_member_id,u,g,clock_timestamp()+interval '24 hours',p_operation_id) RETURNING id INTO a;
 INSERT INTO dobby_access_private.operation_receipts(actor_id,operation_id,command,request_digest,result)
 VALUES(u,p_operation_id,'requestFamily',digest,jsonb_build_object('admission',dobby_access_private.admission_json(a)));
 RETURN jsonb_build_object('admission',dobby_access_private.admission_json(a),'replayed',false);
END $$;

CREATE OR REPLACE FUNCTION public.dobby_access_context() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb:=dobby_access_lot3_legacy.public__dobby_access_context(); u uuid; ad jsonb;
BEGIN
 BEGIN u:=dobby_access_private.scoped_subject(); EXCEPTION WHEN insufficient_privilege THEN RETURN result||jsonb_build_object('admission',NULL); END;
 SELECT jsonb_build_object('id',id,'purpose',purpose,'state',state,'expiresAt',expires_at,'householdId',household_id,
 'memberId',member_id,'targetMemberId',member_id,'requiresProfile',purpose<>'family-child') INTO ad
 FROM dobby_access_private.admissions WHERE target_user_id=u AND state IN ('sent','accepted') ORDER BY created_at DESC,id DESC LIMIT 1;
 RETURN result||jsonb_build_object('admission',ad);
END $$;
CREATE FUNCTION public.dobby_access_context(p_admission_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb:=dobby_access_lot3_legacy.public__dobby_access_context(); u uuid:=dobby_access_private.scoped_subject(); ad jsonb;
BEGIN
 SELECT jsonb_build_object('id',id,'purpose',purpose,'state',state,'expiresAt',expires_at,'householdId',household_id,
 'memberId',member_id,'targetMemberId',member_id,'requiresProfile',purpose<>'family-child') INTO ad
 FROM dobby_access_private.admissions WHERE id=p_admission_id AND target_user_id=u;
 RETURN result||jsonb_build_object('admission',ad);
END $$;

CREATE FUNCTION public.dobby_access_accept(p_admission_id uuid,p_profile jsonb,p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_access_private.scoped_subject(); a dobby_access_private.admissions%ROWTYPE; identity jsonb;
 authrow dobby_access_private.authorizations%ROWTYPE; req bytea; prior dobby_access_private.operation_receipts%ROWTYPE; result jsonb;
BEGIN
 IF p_admission_id IS NULL OR p_operation_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Admission and operation required'; END IF;
 -- Stable per-account serialization also covers the absence of an auth row.
 PERFORM pg_advisory_xact_lock(hashtextextended('dobby-access-account:'||u::text,0));
 SELECT * INTO a FROM dobby_access_private.admissions WHERE id=p_admission_id AND target_user_id=u;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Own bound admission required'; END IF;
 -- Authorization locks precede admission and all business locks.
 PERFORM dobby_access_private.lock_admission_actors(u,a.requested_by);
 SELECT * INTO authrow FROM dobby_access_private.authorizations WHERE user_id=u;
 IF authrow.status='suspended' OR authrow.session_boundary_pending OR coalesce(authrow.generation,0)<>a.target_generation
  OR a.approved_at IS NULL OR (authrow.sessions_valid_after IS NOT NULL AND a.approved_at<=authrow.sessions_valid_after) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Admission generation unavailable'; END IF;
 IF a.purpose<>'new-household' THEN PERFORM dobby_access_private.assert_requester(a.requested_by,a.requester_generation); END IF;
 SELECT * INTO a FROM dobby_access_private.admissions WHERE id=p_admission_id FOR UPDATE;
 identity:=dobby_access_private.auth_identity(u);
 IF identity IS NULL OR identity->>'email' IS DISTINCT FROM a.email OR identity->'confirmed' IS DISTINCT FROM 'true'::jsonb
  OR a.target_user_id IS DISTINCT FROM u OR a.state NOT IN ('sent','accepted') OR a.approved_by IS NULL OR a.expires_at<=clock_timestamp() THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Confirmed nominative admission required'; END IF;
 IF a.purpose='family-child' AND p_profile IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Existing child profile cannot be replaced'; END IF;
 req:=sha256(convert_to(jsonb_build_array(p_admission_id,p_profile)::text,'UTF8'));
 SELECT * INTO prior FROM dobby_access_private.operation_receipts WHERE actor_id=u AND operation_id=p_operation_id;
 IF FOUND THEN
  IF prior.command<>'accept' OR prior.request_digest<>req THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Operation reused with different request'; END IF;
  IF a.state<>'accepted' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Accepted admission no longer available'; END IF;
  RETURN prior.result||jsonb_build_object('replayed',true);
 END IF;
 IF a.state='accepted' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Admission already consumed; original operation required'; END IF;
 -- This row and pending profile are invisible to other transactions until all
 -- canonical family writes, admission consumption and receipts commit.
 INSERT INTO dobby_access_private.authorizations(user_id,status,approved_by,generation,can_create_household)
 VALUES(u,'active',a.approved_by,a.target_generation,a.purpose='new-household')
 ON CONFLICT(user_id) DO NOTHING;
 IF a.purpose<>'new-household' THEN
  PERFORM dobby_socle_private.access_request_target(a.requested_by,a.household_id,a.member_id,true,a.id);
 ELSE
  PERFORM dobby_socle_private.access_assert_first_household();
 END IF;
 IF a.purpose<>'family-child' THEN PERFORM dobby_socle_private.access_prepare_profile(p_profile); END IF;
 IF a.purpose='new-household' THEN
  -- A new, explicit approval may grant the first quota after a prior pending
  -- suspension/reactivation. The boolean quota cannot multiply; consumed
  -- household receipts and every membership/link were checked above.
  IF authrow.user_id IS NOT NULL THEN
   UPDATE dobby_access_private.authorizations SET can_create_household=true,revision=revision+1,updated_at=clock_timestamp()
   WHERE user_id=u AND status='active' AND generation=a.target_generation AND revision=authrow.revision AND NOT session_boundary_pending
   RETURNING * INTO authrow;
   IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Fresh approval generation changed'; END IF;
  END IF;
  result:=jsonb_build_object('protocol',1,'admissionId',a.id,'accepted',true,'canCreateHousehold',true);
 ELSE
  result:=dobby_socle_private.access_accept_invitation(a.id,p_operation_id,CASE WHEN a.purpose='family-child' THEN 'child-account' ELSE 'member' END);
  result:=jsonb_build_object('protocol',1,'admissionId',a.id,'accepted',true,'householdId',result->>'householdId','memberId',result->>'memberId');
 END IF;
 UPDATE dobby_access_private.admissions SET state='accepted',revision=revision+1,updated_at=clock_timestamp() WHERE id=a.id;
 INSERT INTO dobby_access_private.decisions(actor_user_id,target_user_id,admission_id,action,after_status,authorization_revision,operation_id,request_digest)
 VALUES(u,u,a.id,'accept','active',coalesce(authrow.revision,1),p_operation_id,req);
 INSERT INTO dobby_access_private.operation_receipts(actor_id,operation_id,command,request_digest,result) VALUES(u,p_operation_id,'accept',req,result);
 RETURN result||jsonb_build_object('replayed',false);
END $$;

CREATE OR REPLACE FUNCTION public.dobby_access_set_status(p_user_id uuid,p_status text,p_expected_revision bigint,p_operation_id uuid,p_confirmed boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; actor uuid:=dobby_access_private.assert_owner(); a dobby_access_private.authorizations%ROWTYPE;
 prior dobby_access_private.decisions%ROWTYPE; digest bytea; pending_ids uuid[];
BEGIN
 IF p_expected_revision=0 THEN
  IF p_confirmed IS DISTINCT FROM true OR p_user_id IS NULL OR p_operation_id IS NULL OR p_status IS DISTINCT FROM 'suspended' THEN
   RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Only confirmed suspension of a pending target accepts revision zero'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('dobby-access-account:'||p_user_id::text,0));
  SELECT * INTO a FROM dobby_access_private.authorizations WHERE user_id=p_user_id FOR UPDATE;
  digest:=sha256(convert_to(jsonb_build_object('user',p_user_id,'status',p_status,'revision',p_expected_revision)::text,'UTF8'));
  SELECT * INTO prior FROM dobby_access_private.decisions WHERE actor_user_id=actor AND operation_id=p_operation_id;
  IF FOUND THEN
   IF prior.request_digest<>digest THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Operation reused with different request'; END IF;
   RETURN jsonb_build_object('status',a.status,'revision',a.revision,'replayed',true,'sessionBoundaryPending',a.session_boundary_pending);
  END IF;
  IF a.user_id IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Pending authorization revision conflict'; END IF;
  IF NOT EXISTS(SELECT 1 FROM dobby_access_private.admissions WHERE target_user_id=p_user_id AND state IN ('approved','delivering','sent')) THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Known bound pending target required'; END IF;
  INSERT INTO dobby_access_private.authorizations(user_id,status,approved_by,generation,revision)
  VALUES(p_user_id,'suspended',actor,1,1);
  UPDATE dobby_access_private.admissions SET state='revoked',revision=revision+1,updated_at=clock_timestamp()
  WHERE state IN ('requested','approved','delivering','sent') AND (target_user_id=p_user_id OR requested_by=p_user_id);
  PERFORM dobby_socle_private.access_revoke_invitations(NULL,p_user_id);
  INSERT INTO dobby_access_private.decisions(actor_user_id,target_user_id,action,after_status,authorization_revision,operation_id,request_digest)
  VALUES(actor,p_user_id,'suspend','suspended',1,p_operation_id,digest);
  RETURN jsonb_build_object('status','suspended','revision',1,'replayed',false,'sessionBoundaryPending',false);
 END IF;
 SELECT array_agg(id) INTO pending_ids FROM dobby_access_private.admissions
 WHERE state IN ('requested','approved','delivering','sent') AND (target_user_id=p_user_id OR requested_by=p_user_id);
 result:=dobby_access_lot3_legacy.public__dobby_access_set_status(p_user_id,p_status,p_expected_revision,p_operation_id,p_confirmed);
 IF result->>'status'='suspended' THEN
  IF result->'replayed'='false'::jsonb THEN UPDATE dobby_access_private.admissions SET revision=revision+1 WHERE id=ANY(pending_ids) AND state='revoked'; END IF;
  PERFORM dobby_socle_private.access_revoke_invitations(NULL,p_user_id);
 END IF;
 RETURN result;
END $$;

CREATE FUNCTION dobby_access_private.auth_identity_page(p_after uuid,p_limit integer) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('userId',id,'email',lower(btrim(email)),'confirmed',email_confirmed_at IS NOT NULL) ORDER BY id),'[]'::jsonb)
 FROM (SELECT id,email,email_confirmed_at FROM auth.users WHERE p_after IS NULL OR id>p_after ORDER BY id LIMIT p_limit) s
$$;
ALTER FUNCTION dobby_access_private.auth_identity_page(uuid,integer) OWNER TO dobby_access_identity_reader;
REVOKE ALL ON FUNCTION dobby_access_private.auth_identity_page(uuid,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION dobby_access_private.auth_identity_page(uuid,integer) TO dobby_access_writer;

CREATE FUNCTION public.dobby_access_admin(p_command text,p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=dobby_access_private.assert_owner(); op uuid; aid uuid; uid uuid; did uuid; rev bigint;
 a dobby_access_private.admissions%ROWTYPE; d dobby_access_private.deliveries%ROWTYPE;
 ar dobby_access_private.authorizations%ROWTYPE; prior dobby_access_private.operation_receipts%ROWTYPE;
 digest bytea; result jsonb; mail text; decision text; cursor_id uuid; limit_n integer:=25; arr jsonb; identity jsonb;
 requests_cursor uuid; requests_after timestamptz; request_arr jsonb;
 requester uuid; requester_gen bigint; key text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM dobby_access_private.settings WHERE singleton AND administration_enabled AND identity_guard_ready) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Administration disabled or identity grant pending'; END IF;
 IF p_command NOT IN ('listAccess','listDecisions','invite','decide','revokeAdmission','setStatus','claimDelivery','recordDelivery','failDelivery','resumeDelivery','finalizeReactivation') OR p_command IS NULL THEN
  RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Unknown closed administration command'; END IF;
 IF p_command IN ('listAccess','listDecisions') THEN
  PERFORM dobby_access_private.payload_keys(p_payload,'{}',CASE WHEN p_command='listAccess' THEN ARRAY['cursor','requestsCursor','limit'] ELSE ARRAY['cursor','limit'] END);
  IF p_payload?'cursor' AND p_payload->'cursor'<>'null'::jsonb THEN cursor_id:=dobby_access_private.uuid_value(p_payload,'cursor'); END IF;
  IF p_payload?'limit' THEN
   IF jsonb_typeof(p_payload->'limit') IS DISTINCT FROM 'number' OR (p_payload->>'limit')::numeric<>trunc((p_payload->>'limit')::numeric)
    OR (p_payload->>'limit')::numeric NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid page limit'; END IF;
   limit_n:=(p_payload->>'limit')::integer;
  END IF;
  IF p_command='listAccess' THEN
   IF p_payload?'requestsCursor' AND p_payload->'requestsCursor'<>'null'::jsonb THEN
    requests_cursor:=dobby_access_private.uuid_value(p_payload,'requestsCursor');
    SELECT created_at INTO requests_after FROM dobby_access_private.admissions WHERE id=requests_cursor;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Request cursor unavailable'; END IF;
   END IF;
   arr:=dobby_access_private.auth_identity_page(cursor_id,limit_n);
   SELECT coalesce(jsonb_agg(e||jsonb_build_object('status',coalesce(au.status,'unapproved'),'revision',coalesce(au.revision,0),
    'isOwner',(e->>'userId')::uuid=actor,'canCreateHousehold',coalesce(au.can_create_household,false),
    'admissions',coalesce((SELECT jsonb_agg(dobby_access_private.admission_json(ad.id) ORDER BY ad.created_at DESC) FROM (SELECT id,created_at FROM dobby_access_private.admissions WHERE target_user_id=(e->>'userId')::uuid ORDER BY created_at DESC LIMIT 25) ad),'[]'::jsonb)) ORDER BY e->>'userId'),'[]'::jsonb)
   INTO arr FROM jsonb_array_elements(arr) e LEFT JOIN dobby_access_private.authorizations au ON au.user_id=(e->>'userId')::uuid;
   SELECT coalesce(jsonb_agg(dobby_access_private.admission_json(id) ORDER BY created_at DESC,id DESC),'[]'::jsonb) INTO request_arr
    FROM (SELECT id,created_at FROM dobby_access_private.admissions WHERE target_user_id IS NULL
     AND (requests_cursor IS NULL OR (created_at,id)<(requests_after,requests_cursor)) ORDER BY created_at DESC,id DESC LIMIT limit_n) requests;
   RETURN jsonb_build_object('protocol',1,'items',arr,'requests',request_arr,
    'nextRequestsCursor',CASE WHEN jsonb_array_length(request_arr)=limit_n THEN request_arr->(limit_n-1)->>'id' ELSE NULL END,
    'nextCursor',CASE WHEN jsonb_array_length(arr)=limit_n THEN arr->(limit_n-1)->>'userId' ELSE NULL END);
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'actorUserId',actor_user_id,'targetUserId',target_user_id,'admissionId',admission_id,
   'action',action,'beforeStatus',before_status,'afterStatus',after_status,'revision',authorization_revision,'decidedAt',decided_at) ORDER BY id),'[]'::jsonb)
  INTO arr FROM (SELECT * FROM dobby_access_private.decisions WHERE cursor_id IS NULL OR id>cursor_id ORDER BY id LIMIT limit_n) s;
  RETURN jsonb_build_object('protocol',1,'items',arr,'nextCursor',CASE WHEN jsonb_array_length(arr)=limit_n THEN arr->(limit_n-1)->>'id' ELSE NULL END);
 END IF;
 IF p_command='finalizeReactivation' THEN
  PERFORM dobby_access_private.payload_keys(p_payload,ARRAY['userId','expectedRevision']);
  RETURN public.dobby_access_finalize_reactivation(dobby_access_private.uuid_value(p_payload,'userId'),dobby_access_private.revision_value(p_payload));
 END IF;
 IF p_command='invite' THEN
  PERFORM dobby_access_private.payload_keys(p_payload,ARRAY['email','purpose','operationId']);
 ELSIF p_command='decide' THEN
  PERFORM dobby_access_private.payload_keys(p_payload,ARRAY['admissionId','decision','expectedRevision','operationId']);
 ELSIF p_command='setStatus' THEN
  PERFORM dobby_access_private.payload_keys(p_payload,ARRAY['userId','status','expectedRevision','operationId','confirmed']);
 ELSIF p_command='recordDelivery' THEN
  PERFORM dobby_access_private.payload_keys(p_payload,ARRAY['admissionId','deliveryId','targetUserId','operationId']);
 ELSIF p_command='failDelivery' THEN
  PERFORM dobby_access_private.payload_keys(p_payload,ARRAY['admissionId','deliveryId','operationId','uncertain']);
 ELSIF p_command='resumeDelivery' THEN
  PERFORM dobby_access_private.payload_keys(p_payload,ARRAY['admissionId','expectedRevision','operationId','confirmed']);
 ELSE
  PERFORM dobby_access_private.payload_keys(p_payload,ARRAY['admissionId','expectedRevision','operationId']);
 END IF;
 op:=dobby_access_private.uuid_value(p_payload,'operationId');
 IF p_command='setStatus' THEN
  uid:=dobby_access_private.uuid_value(p_payload,'userId'); rev:=dobby_access_private.revision_value(p_payload,true);
  IF p_payload->'confirmed' IS DISTINCT FROM 'true'::jsonb OR p_payload->>'status' NOT IN ('active','suspended') THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Confirmed status required'; END IF;
  RETURN public.dobby_access_set_status(uid,p_payload->>'status',rev,op,true);
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('dobby-access-operation:'||actor::text||':'||op::text,0));
 digest:=sha256(convert_to(jsonb_build_array(p_command,p_payload-'operationId')::text,'UTF8'));
 SELECT * INTO prior FROM dobby_access_private.operation_receipts WHERE actor_id=actor AND operation_id=op;
 IF FOUND THEN
  IF prior.command<>p_command OR prior.request_digest<>digest THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Operation reused with different request'; END IF;
  aid:=(prior.result->'admission'->>'id')::uuid;
  result:=prior.result||jsonb_build_object('admission',dobby_access_private.admission_json(aid),'replayed',true);
  IF p_command IN ('claimDelivery','resumeDelivery') THEN result:=jsonb_set(result,'{delivery,requiresResume}','true'); END IF;
  RETURN result;
 END IF;
 IF p_command='invite' THEN
  IF jsonb_typeof(p_payload->'email') IS DISTINCT FROM 'string' OR p_payload->>'purpose'<>'new-household' THEN
   RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Family invitation requires a stored Parent request'; END IF;
  mail:=lower(btrim(p_payload->>'email'));
  IF length(mail)>254 OR mail!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Nominative email required'; END IF;
  INSERT INTO dobby_access_private.admissions(email,purpose,requested_by,approved_by,approved_at,state,expires_at,operation_id)
  VALUES(mail,'new-household',actor,actor,clock_timestamp(),'approved',clock_timestamp()+interval '24 hours',op) RETURNING * INTO a;
  INSERT INTO dobby_access_private.decisions(actor_user_id,admission_id,action,operation_id,request_digest)
  VALUES(actor,a.id,'approve',op,digest);
 ELSE
  aid:=dobby_access_private.uuid_value(p_payload,'admissionId');
  SELECT * INTO a FROM dobby_access_private.admissions WHERE id=aid;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Admission unavailable'; END IF;
  -- Lock authorizations before admission/V7. The subject may not yet have an
  -- authorization; its per-account advisory lock matches acceptance.
  IF p_command='recordDelivery' THEN uid:=dobby_access_private.uuid_value(p_payload,'targetUserId'); ELSE uid:=a.target_user_id; END IF;
  IF uid IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended('dobby-access-account:'||uid::text,0)); END IF;
  PERFORM dobby_access_private.lock_admission_actors(uid,a.requested_by);
  SELECT * INTO a FROM dobby_access_private.admissions WHERE id=aid FOR UPDATE;
  IF p_command IN ('decide','revokeAdmission','claimDelivery','resumeDelivery') THEN
   rev:=dobby_access_private.revision_value(p_payload);
   IF a.revision<>rev THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Admission revision conflict'; END IF;
  END IF;
  IF p_command='decide' THEN
   decision:=p_payload->>'decision';
   IF decision NOT IN ('approve','reject') OR a.state<>'requested' THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Requested admission and closed decision required'; END IF;
   IF decision='approve' THEN
    IF a.purpose<>'new-household' THEN
     PERFORM dobby_access_private.assert_requester(a.requested_by,a.requester_generation);
     PERFORM dobby_socle_private.access_request_target(a.requested_by,a.household_id,a.member_id,true,a.id);
    END IF;
    UPDATE dobby_access_private.admissions SET state='approved',approved_by=actor,approved_at=clock_timestamp(),expires_at=clock_timestamp()+interval '24 hours',revision=revision+1,updated_at=clock_timestamp() WHERE id=a.id RETURNING * INTO a;
   ELSE
    UPDATE dobby_access_private.admissions SET state='rejected',revision=revision+1,updated_at=clock_timestamp() WHERE id=a.id RETURNING * INTO a;
   END IF;
   INSERT INTO dobby_access_private.decisions(actor_user_id,target_user_id,admission_id,action,operation_id,request_digest) VALUES(actor,a.target_user_id,a.id,decision,op,digest);
  ELSIF p_command='revokeAdmission' THEN
   IF a.state NOT IN ('requested','approved','delivering','sent') THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Only open admission may be revoked'; END IF;
   UPDATE dobby_access_private.admissions SET state='revoked',revision=revision+1,updated_at=clock_timestamp() WHERE id=a.id RETURNING * INTO a;
   PERFORM dobby_socle_private.access_revoke_invitations(a.id,NULL);
   INSERT INTO dobby_access_private.decisions(actor_user_id,target_user_id,admission_id,action,operation_id,request_digest) VALUES(actor,a.target_user_id,a.id,'revoke',op,digest);
  ELSIF p_command IN ('claimDelivery','resumeDelivery') THEN
   IF a.state NOT IN ('approved','delivering','sent') OR a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Approved unexpired admission required'; END IF;
   IF a.purpose<>'new-household' THEN
    PERFORM dobby_access_private.assert_requester(a.requested_by,a.requester_generation);
    PERFORM dobby_socle_private.access_request_target(a.requested_by,a.household_id,a.member_id,true,a.id);
   END IF;
   SELECT * INTO d FROM dobby_access_private.deliveries WHERE admission_id=a.id ORDER BY created_at DESC,id DESC LIMIT 1;
   IF p_command='claimDelivery' AND d.id IS NOT NULL THEN
    result:=jsonb_build_object('admission',dobby_access_private.admission_json(a.id),'delivery',jsonb_build_object('id',d.id,'attemptId',d.id,'state',d.state,'requiresResume',true));
   ELSE
    IF p_command='resumeDelivery' THEN
     IF p_payload->'confirmed' IS DISTINCT FROM 'true'::jsonb
      OR (d.state='attempting' AND d.created_at>clock_timestamp()-interval '180 seconds') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Explicit outcome or expired delivery lease required'; END IF;
     IF d.state='attempting' THEN UPDATE dobby_access_private.deliveries SET state='uncertain',updated_at=clock_timestamp() WHERE id=d.id; END IF;
     IF a.invitation_id IS NOT NULL THEN
      -- A revoked V7 binding is never resurrected; create another admission.
      RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Bound family delivery requires a fresh approved request'; END IF;
    END IF;
    IF (SELECT count(*) FROM dobby_access_private.deliveries WHERE created_at>clock_timestamp()-interval '10 minutes')>=20 THEN RAISE EXCEPTION USING ERRCODE='54000',MESSAGE='Delivery rate bound reached'; END IF;
    INSERT INTO dobby_access_private.deliveries(admission_id,actor_id,operation_id,state) VALUES(a.id,actor,op,'attempting') RETURNING * INTO d;
    UPDATE dobby_access_private.admissions SET state='delivering',revision=revision+1,updated_at=clock_timestamp() WHERE id=a.id RETURNING * INTO a;
    result:=jsonb_build_object('admission',dobby_access_private.admission_json(a.id),'delivery',jsonb_build_object('id',d.id,'attemptId',d.id,'state',d.state,'requiresResume',false));
   END IF;
  ELSE
   did:=dobby_access_private.uuid_value(p_payload,'deliveryId');
   SELECT * INTO d FROM dobby_access_private.deliveries WHERE id=did AND admission_id=a.id FOR UPDATE;
   IF NOT FOUND OR d.id IS DISTINCT FROM (SELECT id FROM dobby_access_private.deliveries WHERE admission_id=a.id ORDER BY created_at DESC,id DESC LIMIT 1)
    OR a.state NOT IN ('delivering','approved') OR a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Current live delivery attempt required'; END IF;
   IF p_command='failDelivery' THEN
    IF jsonb_typeof(p_payload->'uncertain') IS DISTINCT FROM 'boolean' OR d.state<>'attempting' THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Attempt outcome required'; END IF;
    UPDATE dobby_access_private.deliveries SET state=CASE WHEN (p_payload->>'uncertain')::boolean THEN 'uncertain' ELSE 'failed' END,updated_at=clock_timestamp() WHERE id=d.id RETURNING * INTO d;
    UPDATE dobby_access_private.admissions SET state='approved',revision=revision+1,updated_at=clock_timestamp() WHERE id=a.id RETURNING * INTO a;
   ELSE
    IF d.state NOT IN ('attempting','uncertain') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unrecorded delivery required'; END IF;
    identity:=dobby_access_private.auth_identity(uid);
    SELECT * INTO ar FROM dobby_access_private.authorizations WHERE user_id=uid;
    IF identity IS NULL OR identity->>'email' IS DISTINCT FROM a.email OR ar.status='suspended' OR ar.session_boundary_pending
     OR a.approved_at IS NULL OR (ar.sessions_valid_after IS NOT NULL AND a.approved_at<=ar.sessions_valid_after)
     OR (a.target_user_id IS NOT NULL AND (a.target_user_id<>uid OR a.target_generation<>coalesce(ar.generation,0))) THEN
     RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Current-generation Auth UUID, email and approval epoch required'; END IF;
    IF a.purpose<>'new-household' THEN
     PERFORM dobby_access_private.assert_requester(a.requested_by,a.requester_generation);
     a.invitation_id:=dobby_socle_private.access_issue_invitation(a.id,a.requested_by,uid,a.household_id,a.member_id,a.expires_at);
    END IF;
    UPDATE dobby_access_private.admissions SET state='sent',target_user_id=uid,target_generation=coalesce(ar.generation,0),invitation_id=a.invitation_id,
     revision=revision+1,updated_at=clock_timestamp() WHERE id=a.id RETURNING * INTO a;
    UPDATE dobby_access_private.deliveries SET state='sent',updated_at=clock_timestamp() WHERE id=d.id RETURNING * INTO d;
   END IF;
   result:=jsonb_build_object('admission',dobby_access_private.admission_json(a.id),'delivery',jsonb_build_object('id',d.id,'attemptId',d.id,'state',d.state,'requiresResume',d.state<>'sent'));
  END IF;
 END IF;
 IF result IS NULL THEN result:=jsonb_build_object('admission',dobby_access_private.admission_json(a.id)); END IF;
 INSERT INTO dobby_access_private.operation_receipts(actor_id,operation_id,command,request_digest,result) VALUES(actor,op,p_command,digest,result);
 RETURN result||jsonb_build_object('replayed',false);
END $$;

-- Existing family writers alone keep content access. Metadata writer has only
-- bounded bridges; elevated HTTP client receives no DB execution privileges.
GRANT INSERT ON dobby_v7_private.pending_profiles TO dobby_socle_writer;
GRANT USAGE ON SCHEMA dobby_socle_private TO dobby_access_writer;
DO $functions$
DECLARE f record;
BEGIN
 FOR f IN SELECT p.oid::regprocedure sig,p.proname,n.nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE (n.nspname='dobby_access_private' AND p.proname IN ('enable_identity_guard','scoped_subject','assert_requester','lock_admission_actors','child_delivery_ready','admission_json','payload_keys','uuid_value','revision_value','assert_invitation_admission','guard_approval_epoch'))
  OR (n.nspname='dobby_socle_private' AND p.proname LIKE 'access_%')
  OR (n.nspname='public' AND p.proname IN ('dobby_access_admin','dobby_access_accept','dobby_access_request_family_account','dobby_access_context')) LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO %I',f.sig,CASE WHEN f.nspname='dobby_socle_private' THEN 'dobby_socle_writer' ELSE 'dobby_access_writer' END);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.sig);
 END LOOP;
END $functions$;
GRANT EXECUTE ON FUNCTION dobby_access_private.enable_identity_guard() TO postgres;
GRANT EXECUTE ON FUNCTION dobby_access_private.child_delivery_ready(),dobby_access_private.assert_invitation_admission(text,text) TO dobby_socle_writer;
GRANT EXECUTE ON FUNCTION dobby_socle_private.access_request_household(uuid,text),dobby_socle_private.access_request_target(uuid,uuid,text,boolean,uuid),
 dobby_socle_private.access_issue_invitation(uuid,uuid,uuid,uuid,text,timestamptz),dobby_socle_private.access_revoke_invitations(uuid,uuid),
 dobby_socle_private.access_prepare_profile(jsonb),dobby_socle_private.access_accept_invitation(uuid,uuid,text),dobby_socle_private.access_invitation_admission(text,text,uuid) TO dobby_access_writer;
GRANT EXECUTE ON FUNCTION dobby_socle_private.access_assert_first_household() TO dobby_access_writer;
GRANT EXECUTE ON FUNCTION dobby_socle_private.access_child_ready() TO dobby_access_writer;
GRANT EXECUTE ON FUNCTION public.dobby_access_context() TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dobby_access_context(uuid),public.dobby_access_admin(text,jsonb),public.dobby_access_accept(uuid,jsonb,uuid),
 public.dobby_access_request_family_account(text,text,text,uuid) TO authenticated;
REVOKE CREATE ON SCHEMA public,dobby_access_private FROM dobby_access_writer;
REVOKE CREATE ON SCHEMA dobby_socle_private FROM dobby_socle_writer;
REVOKE CREATE ON SCHEMA dobby_access_private FROM dobby_access_identity_reader;
REVOKE CREATE ON SCHEMA dobby_access_lot3_legacy FROM dobby_access_writer,dobby_socle_writer;
GRANT dobby_access_writer,dobby_socle_writer,dobby_v7_writer,dobby_access_identity_reader TO postgres WITH INHERIT FALSE, SET FALSE;
NOTIFY pgrst,'reload schema';
COMMIT;
