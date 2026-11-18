-- LOT 1: local candidate only. No real UUID, automatic enrollment, Auth mutation,
-- business-policy change or activation of existing runtime/feature gates.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $preflight$
BEGIN
 IF current_user<>'postgres' OR NOT (SELECT rolcreaterole FROM pg_roles WHERE rolname=current_user) THEN
  RAISE EXCEPTION 'Verified postgres installer with CREATEROLE required';
 END IF;
 IF to_regnamespace('dobby_access_private') IS NOT NULL
  OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('dobby_access_writer','dobby_access_session_reader')) THEN
  RAISE EXCEPTION 'Access foundation already present; verify, do not reset';
 END IF;
 IF to_regclass('auth.users') IS NULL OR to_regclass('auth.sessions') IS NULL
  OR to_regclass('dobby_v7_private.account_links') IS NULL
  OR to_regclass('public.dobby_v2_memberships') IS NULL THEN
  RAISE EXCEPTION 'Existing identity/session/family metadata required';
 END IF;
 IF NOT has_column_privilege(current_user,'auth.users','id','REFERENCES') THEN
  RAISE EXCEPTION 'Installer needs existing REFERENCES(id); no managed-schema workaround';
 END IF;
END $preflight$;

CREATE ROLE dobby_access_writer NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE dobby_access_session_reader NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
-- Installer-only membership is inherited within this transaction so ACL changes
-- still have the new owner's grant option after ALTER FUNCTION OWNER.
GRANT dobby_access_writer,dobby_access_session_reader TO postgres WITH INHERIT TRUE, SET TRUE;
CREATE SCHEMA dobby_access_private;
REVOKE ALL ON SCHEMA dobby_access_private FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE,CREATE ON SCHEMA dobby_access_private,public TO dobby_access_writer;
GRANT USAGE,CREATE ON SCHEMA dobby_access_private TO dobby_access_session_reader;

CREATE TABLE dobby_access_private.settings(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 owner_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
 session_guard_ready boolean NOT NULL DEFAULT false,
 installed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE dobby_access_private.authorizations(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id),
 status text NOT NULL CHECK(status IN ('active','suspended')),
 approved_by uuid NOT NULL REFERENCES auth.users(id),
 can_create_household boolean NOT NULL DEFAULT false,
 generation bigint NOT NULL DEFAULT 0 CHECK(generation BETWEEN 0 AND 9007199254740990),
 revision bigint NOT NULL DEFAULT 1 CHECK(revision BETWEEN 1 AND 9007199254740990),
 sessions_valid_after timestamptz,
 session_boundary_pending boolean NOT NULL DEFAULT false,
 reactivation_xid xid8,
 CHECK(NOT session_boundary_pending OR (status='active' AND reactivation_xid IS NOT NULL)),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE dobby_access_private.admissions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL CHECK(length(email) BETWEEN 3 AND 254 AND email=lower(btrim(email)) AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 purpose text NOT NULL CHECK(purpose IN ('new-household','family-parent','family-child')),
 household_id uuid, member_id text CHECK(length(member_id) BETWEEN 1 AND 120),
 requested_by uuid NOT NULL REFERENCES auth.users(id),
 target_user_id uuid REFERENCES auth.users(id),
 target_generation bigint NOT NULL DEFAULT 0 CHECK(target_generation BETWEEN 0 AND 9007199254740990),
 approved_by uuid REFERENCES auth.users(id),
 state text NOT NULL DEFAULT 'requested' CHECK(state IN ('requested','approved','delivering','sent','accepted','rejected','revoked')),
 expires_at timestamptz NOT NULL,
 operation_id uuid NOT NULL DEFAULT gen_random_uuid(),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(requested_by,operation_id),
 CHECK((purpose='new-household' AND household_id IS NULL AND member_id IS NULL)
  OR (purpose='family-parent' AND household_id IS NOT NULL AND member_id IS NULL)
  OR (purpose='family-child' AND household_id IS NOT NULL AND member_id IS NOT NULL)),
 CHECK(state NOT IN ('approved','delivering','sent','accepted') OR approved_by IS NOT NULL)
);
CREATE INDEX access_admissions_target_pending ON dobby_access_private.admissions(target_user_id)
 WHERE state IN ('requested','approved','delivering','sent');
CREATE TABLE dobby_access_private.decisions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_user_id uuid NOT NULL REFERENCES auth.users(id),
 target_user_id uuid REFERENCES auth.users(id),
 admission_id uuid REFERENCES dobby_access_private.admissions(id),
 action text NOT NULL CHECK(action IN ('bootstrap','suspend','reactivate','session-boundary','approve','reject','revoke','accept')),
 before_status text CHECK(before_status IN ('active','suspended')),
 after_status text CHECK(after_status IN ('active','suspended')),
 authorization_revision bigint,
 reason text CHECK(length(reason)<=200),
 operation_id uuid NOT NULL,
 request_digest bytea NOT NULL CHECK(octet_length(request_digest)=32),
 decided_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(actor_user_id,operation_id)
);
DO $tables$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['settings','authorizations','admissions','decisions'] LOOP
  EXECUTE format('ALTER TABLE dobby_access_private.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE dobby_access_private.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON dobby_access_private.%I FROM PUBLIC,anon,authenticated,service_role',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON dobby_access_private.%I TO dobby_access_writer',t);
  EXECUTE format('CREATE POLICY access_writer ON dobby_access_private.%I TO dobby_access_writer USING(true) WITH CHECK(true)',t);
 END LOOP;
END $tables$;

-- Claims are trusted only after a gateway has verified the JWT. SQL tests set
-- fictional claims; this function deliberately ignores all metadata/email roles.
CREATE FUNCTION dobby_access_private.request_identity() RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE claims jsonb; legacy text; subject uuid; sid uuid;
BEGIN
 claims:=coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb);
 legacy:=nullif(current_setting('request.jwt.claim.sub',true),'');
 IF legacy IS NOT NULL AND claims->>'sub' IS NOT NULL AND legacy<>(claims->>'sub') THEN RETURN NULL; END IF;
 subject:=coalesce(claims->>'sub',legacy)::uuid;
 sid:=(claims->>'session_id')::uuid;
 IF subject IS NULL OR sid IS NULL THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('userId',subject,'sessionId',sid);
EXCEPTION WHEN invalid_text_representation THEN RETURN NULL;
END $$;

-- No Auth grant is made here. A managed-schema owner must separately provide
-- only USAGE(auth) + SELECT(id,user_id,created_at,not_after) before activation.
CREATE FUNCTION dobby_access_private.session_is_live(p_user uuid,p_session uuid,p_after timestamptz)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 RETURN EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id=p_session AND s.user_id=p_user
  AND s.created_at<=statement_timestamp()
  AND (p_after IS NULL OR s.created_at>p_after)
  AND (s.not_after IS NULL OR s.not_after>statement_timestamp()));
END $$;
ALTER FUNCTION dobby_access_private.session_is_live(uuid,uuid,timestamptz) OWNER TO dobby_access_session_reader;
REVOKE ALL ON FUNCTION dobby_access_private.session_is_live(uuid,uuid,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION dobby_access_private.session_is_live(uuid,uuid,timestamptz) TO dobby_access_writer;

CREATE FUNCTION dobby_access_private.is_active() RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE who jsonb:=dobby_access_private.request_identity(); a dobby_access_private.authorizations%ROWTYPE;
BEGIN
 IF who IS NULL OR NOT EXISTS(SELECT 1 FROM dobby_access_private.settings WHERE singleton AND session_guard_ready) THEN RETURN false; END IF;
 SELECT * INTO a FROM dobby_access_private.authorizations WHERE user_id=(who->>'userId')::uuid;
 IF NOT FOUND OR a.status<>'active' OR a.session_boundary_pending THEN RETURN false; END IF;
 RETURN dobby_access_private.session_is_live(a.user_id,(who->>'sessionId')::uuid,a.sessions_valid_after);
EXCEPTION WHEN insufficient_privilege OR undefined_column OR undefined_table THEN RETURN false;
END $$;
CREATE FUNCTION dobby_access_private.assert_active() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid;
BEGIN
 IF NOT dobby_access_private.is_active() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Active authorized session required'; END IF;
 u:=(dobby_access_private.request_identity()->>'userId')::uuid;
 -- The locking guard is for writes; is_active() stays usable in SELECT RLS.
 PERFORM 1 FROM dobby_access_private.authorizations WHERE user_id=u AND status='active' FOR SHARE;
 IF NOT FOUND OR NOT dobby_access_private.is_active() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Authorization changed'; END IF;
 RETURN u;
END $$;
CREATE FUNCTION dobby_access_private.assert_owner() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_access_private.assert_active();
BEGIN
 IF NOT EXISTS(SELECT 1 FROM dobby_access_private.settings WHERE singleton AND owner_user_id=u) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='DOBBY owner required';
 END IF;
 RETURN u;
END $$;
CREATE FUNCTION public.dobby_access_context() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE who jsonb:=dobby_access_private.request_identity(); a dobby_access_private.authorizations%ROWTYPE;
 active boolean:=false; owner boolean:=false; state text:='unapproved';
BEGIN
 IF who IS NOT NULL THEN SELECT * INTO a FROM dobby_access_private.authorizations WHERE user_id=(who->>'userId')::uuid; END IF;
 IF a.user_id IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM dobby_access_private.settings WHERE singleton AND session_guard_ready)
   OR NOT dobby_access_private.session_is_live(a.user_id,(who->>'sessionId')::uuid,a.sessions_valid_after) THEN
   RETURN jsonb_build_object('protocol',1,'status','unapproved','isOwner',false,'canCreateHousehold',false,'revision',0);
  END IF;
  IF a.status='suspended' THEN state:='suspended';
  ELSIF dobby_access_private.is_active() THEN
   active:=true; state:='active';
   SELECT owner_user_id=a.user_id INTO owner FROM dobby_access_private.settings WHERE singleton;
  END IF;
 END IF;
 RETURN jsonb_build_object('protocol',1,'status',state,'isOwner',coalesce(owner,false),
  'canCreateHousehold',active AND coalesce(a.can_create_household,false),
  'revision',CASE WHEN active OR state='suspended' THEN a.revision ELSE 0 END);
EXCEPTION WHEN insufficient_privilege OR undefined_column OR undefined_table THEN
 RETURN jsonb_build_object('protocol',1,'status','unapproved','isOwner',false,'canCreateHousehold',false,'revision',0);
END $$;

CREATE FUNCTION dobby_access_private.protect_owner() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_id uuid;
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Owner registry cannot be truncated'; END IF;
 SELECT owner_user_id INTO owner_id FROM dobby_access_private.settings WHERE singleton;
 IF TG_TABLE_NAME='settings' THEN
  IF TG_OP='DELETE' OR (TG_OP='UPDATE' AND NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id) THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Owner registry is immutable';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM dobby_access_private.authorizations WHERE user_id=NEW.owner_user_id AND status='active') THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Active owner authorization required';
  END IF;
 ELSE
  IF TG_OP='UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Authorization identity is immutable';
  END IF;
  IF OLD.user_id=owner_id AND (TG_OP='DELETE' OR NEW.status<>'active'
   OR NEW.sessions_valid_after IS NOT NULL OR NEW.session_boundary_pending OR NEW.reactivation_xid IS NOT NULL) THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Owner cannot be removed or suspended';
  END IF;
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER access_owner_registry_guard BEFORE INSERT OR UPDATE OR DELETE ON dobby_access_private.settings
 FOR EACH ROW EXECUTE FUNCTION dobby_access_private.protect_owner();
CREATE TRIGGER access_owner_authorization_guard BEFORE UPDATE OR DELETE ON dobby_access_private.authorizations
 FOR EACH ROW EXECUTE FUNCTION dobby_access_private.protect_owner();
CREATE TRIGGER access_owner_registry_truncate BEFORE TRUNCATE ON dobby_access_private.settings
 FOR EACH STATEMENT EXECUTE FUNCTION dobby_access_private.protect_owner();
CREATE TRIGGER access_owner_authorization_truncate BEFORE TRUNCATE ON dobby_access_private.authorizations
 FOR EACH STATEMENT EXECUTE FUNCTION dobby_access_private.protect_owner();
CREATE FUNCTION dobby_access_private.reject_history_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Access decisions are append-only'; END $$;
CREATE TRIGGER access_decisions_immutable BEFORE UPDATE OR DELETE ON dobby_access_private.decisions
 FOR EACH ROW EXECUTE FUNCTION dobby_access_private.reject_history_mutation();
CREATE TRIGGER access_decisions_no_truncate BEFORE TRUNCATE ON dobby_access_private.decisions
 FOR EACH STATEMENT EXECUTE FUNCTION dobby_access_private.reject_history_mutation();

CREATE FUNCTION public.dobby_access_set_status(p_user_id uuid,p_status text,p_expected_revision bigint,p_operation_id uuid,p_confirmed boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=dobby_access_private.assert_owner(); a dobby_access_private.authorizations%ROWTYPE;
 prior dobby_access_private.decisions%ROWTYPE; digest bytea;
BEGIN
 IF p_confirmed IS DISTINCT FROM true OR p_user_id IS NULL OR p_operation_id IS NULL
  OR p_status IS NULL OR p_status NOT IN ('active','suspended') OR p_expected_revision IS NULL OR p_expected_revision<1 THEN
  RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Confirmed target, status, revision and operation required';
 END IF;
 IF EXISTS(SELECT 1 FROM dobby_access_private.settings WHERE owner_user_id=p_user_id) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Owner cannot be a status-change target';
 END IF;
 SELECT * INTO a FROM dobby_access_private.authorizations WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Approved target required'; END IF;
 digest:=sha256(convert_to(jsonb_build_object('user',p_user_id,'status',p_status,'revision',p_expected_revision)::text,'UTF8'));
 SELECT * INTO prior FROM dobby_access_private.decisions WHERE actor_user_id=actor AND operation_id=p_operation_id;
 IF FOUND THEN
  IF prior.request_digest IS DISTINCT FROM digest THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Operation reused with different request'; END IF;
  RETURN jsonb_build_object('status',a.status,'revision',a.revision,'replayed',true,'sessionBoundaryPending',a.session_boundary_pending);
 END IF;
 IF a.revision<>p_expected_revision THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Access revision conflict'; END IF;
 IF a.status=p_status THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Actual status transition required'; END IF;
 UPDATE dobby_access_private.authorizations SET status=p_status,revision=revision+1,
  generation=generation+CASE WHEN p_status='suspended' THEN 1 ELSE 0 END,
  can_create_household=false,
  session_boundary_pending=(p_status='active'),
  reactivation_xid=CASE WHEN p_status='active' THEN pg_current_xact_id() ELSE NULL END,
  updated_at=clock_timestamp() WHERE user_id=p_user_id;
 IF p_status='suspended' THEN
  UPDATE dobby_access_private.admissions SET state='revoked',updated_at=clock_timestamp()
   WHERE state IN ('requested','approved','delivering','sent') AND (target_user_id=p_user_id OR requested_by=p_user_id);
 END IF;
 INSERT INTO dobby_access_private.decisions(actor_user_id,target_user_id,action,before_status,after_status,
  authorization_revision,operation_id,request_digest)
 VALUES(actor,p_user_id,CASE WHEN p_status='suspended' THEN 'suspend' ELSE 'reactivate' END,
  a.status,p_status,a.revision+1,p_operation_id,digest);
 RETURN jsonb_build_object('status',p_status,'revision',a.revision+1,'replayed',false,'sessionBoundaryPending',p_status='active');
END $$;

-- Phase 1 commits status=active but remains closed. Phase 2 must run after that
-- transaction: the row lock waits for its commit and the xid check rejects a
-- same-transaction shortcut. This cutoff cannot predate reactivation's commit.
CREATE FUNCTION public.dobby_access_finalize_reactivation(p_user_id uuid,p_expected_revision bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=dobby_access_private.assert_owner(); a dobby_access_private.authorizations%ROWTYPE;
BEGIN
 IF p_user_id IS NULL OR p_expected_revision IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Target and revision required'; END IF;
 IF EXISTS(SELECT 1 FROM dobby_access_private.settings WHERE owner_user_id=p_user_id) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Owner cannot be a reactivation target';
 END IF;
 SELECT * INTO a FROM dobby_access_private.authorizations WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND OR a.status<>'active' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Active reactivation target required'; END IF;
 IF a.revision<>p_expected_revision THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Access revision conflict'; END IF;
 IF NOT a.session_boundary_pending THEN
  RETURN jsonb_build_object('status',a.status,'revision',a.revision,'replayed',true,'sessionBoundaryPending',false);
 END IF;
 IF a.reactivation_xid=pg_current_xact_id() THEN
  RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Reactivation must commit before the session boundary';
 END IF;
 UPDATE dobby_access_private.authorizations SET sessions_valid_after=clock_timestamp(),
  session_boundary_pending=false,reactivation_xid=NULL,updated_at=clock_timestamp() WHERE user_id=p_user_id;
 INSERT INTO dobby_access_private.decisions(actor_user_id,target_user_id,action,before_status,after_status,
  authorization_revision,operation_id,request_digest)
 VALUES(actor,p_user_id,'session-boundary','active','active',a.revision,gen_random_uuid(),
  sha256(convert_to(jsonb_build_object('target',p_user_id,'revision',a.revision,'action','session-boundary')::text,'UTF8')));
 RETURN jsonb_build_object('status','active','revision',a.revision,'replayed',false,'sessionBoundaryPending',false);
END $$;

-- Only the verified installer may invoke these maintenance functions. The
-- INVOKER validator reads canonical metadata with its pre-existing privileges;
-- the runtime writer receives no family, Storage or auth.users SELECT grant.
CREATE FUNCTION dobby_access_private.bootstrap(p_manifest jsonb,p_operation_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE item jsonb; owner_id uuid; u uuid; h uuid; m text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('dobby-access-bootstrap',0));
 IF p_operation_id IS NULL OR jsonb_typeof(p_manifest) IS DISTINCT FROM 'object'
  OR (SELECT count(*) FROM jsonb_object_keys(p_manifest))<>2
  OR jsonb_typeof(p_manifest->'ownerUserId') IS DISTINCT FROM 'string'
  OR jsonb_typeof(p_manifest->'preservedAccounts') IS DISTINCT FROM 'array'
  OR jsonb_array_length(p_manifest->'preservedAccounts')<>2 THEN
  RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Explicit owner and two preserved canonical accounts required';
 END IF;
 owner_id:=(p_manifest->>'ownerUserId')::uuid;
 IF owner_id IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=owner_id) THEN
  RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Verified existing owner required';
 END IF;
 IF (SELECT count(DISTINCT e->>'userId') FROM jsonb_array_elements(p_manifest->'preservedAccounts') e)<>2 THEN
  RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Preserved accounts must be distinct';
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_manifest->'preservedAccounts') LOOP
  IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(item))<>3
   OR jsonb_typeof(item->'userId') IS DISTINCT FROM 'string'
   OR jsonb_typeof(item->'householdId') IS DISTINCT FROM 'string'
   OR jsonb_typeof(item->'memberId') IS DISTINCT FROM 'string' THEN
   RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Exact canonical account mapping required';
  END IF;
  u:=(item->>'userId')::uuid; h:=(item->>'householdId')::uuid; m:=item->>'memberId';
  IF NOT EXISTS(SELECT 1 FROM dobby_v7_private.account_links l JOIN public.dobby_v2_memberships a
   ON a.user_id=l.user_id AND a.household_id=l.household_id
   WHERE l.user_id=u AND l.household_id=h AND l.member_id=m AND a.active)
   OR EXISTS(SELECT 1 FROM public.dobby_v2_memberships WHERE user_id=u AND active AND household_id<>h) THEN
   RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Ambiguous or changed canonical mapping';
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM dobby_access_private.settings) OR EXISTS(SELECT 1 FROM dobby_access_private.authorizations)
  OR EXISTS(SELECT 1 FROM dobby_access_private.decisions) OR EXISTS(SELECT 1 FROM dobby_access_private.admissions) THEN
  RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Bootstrap already performed or registry not empty';
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_manifest->'preservedAccounts') LOOP
  INSERT INTO dobby_access_private.authorizations(user_id,status,approved_by)
   VALUES((item->>'userId')::uuid,'active',owner_id);
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM dobby_access_private.authorizations WHERE user_id=owner_id) THEN
  INSERT INTO dobby_access_private.authorizations(user_id,status,approved_by) VALUES(owner_id,'active',owner_id);
 END IF;
 INSERT INTO dobby_access_private.settings(owner_user_id) VALUES(owner_id);
 INSERT INTO dobby_access_private.decisions(actor_user_id,target_user_id,action,after_status,authorization_revision,operation_id,request_digest)
 VALUES(owner_id,owner_id,'bootstrap','active',1,p_operation_id,sha256(convert_to(p_manifest::text,'UTF8')));
EXCEPTION WHEN invalid_text_representation THEN
 RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Malformed bootstrap identity';
END $$;
CREATE FUNCTION dobby_access_private.enable_session_guard() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE col text; sessions_oid oid; rel record; attr record;
BEGIN
 IF NOT has_schema_privilege('dobby_access_session_reader','auth','USAGE') THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Managed-schema USAGE not available; remain closed';
 END IF;
 SELECT c.oid INTO sessions_oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='auth' AND c.relname='sessions' AND c.relkind='r';
 IF sessions_oid IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Session relation unavailable; remain closed'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='dobby_access_session_reader'
  AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication))
  OR has_schema_privilege('dobby_access_session_reader','auth','CREATE') THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Session reader role is too privileged';
 END IF;
 FOR rel IN SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='auth' AND c.relkind IN ('r','p','v','m','f') LOOP
  IF has_table_privilege('dobby_access_session_reader',rel.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Excess table privileges on managed Auth relation';
  END IF;
  FOR attr IN SELECT attname FROM pg_attribute WHERE attrelid=rel.oid AND attnum>0 AND NOT attisdropped LOOP
   IF has_column_privilege('dobby_access_session_reader',rel.oid,attr.attname,'INSERT,UPDATE,REFERENCES')
    OR (has_column_privilege('dobby_access_session_reader',rel.oid,attr.attname,'SELECT')
     AND (rel.oid<>sessions_oid OR attr.attname NOT IN ('id','user_id','created_at','not_after'))) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Excess column privileges on managed Auth relation';
   END IF;
  END LOOP;
 END LOOP;
 FOREACH col IN ARRAY ARRAY['id','user_id','created_at','not_after'] LOOP
  IF NOT has_column_privilege('dobby_access_session_reader',sessions_oid,col,'SELECT') THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Narrow session column grants not available; remain closed';
  END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM dobby_access_private.settings) THEN
  RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Bootstrap required first';
 END IF;
 UPDATE dobby_access_private.settings SET session_guard_ready=true WHERE singleton;
END $$;

-- Close every function before granting the small explicit API. No default
-- privileges or ACLs of existing functions/tables are changed.
DO $functions$
DECLARE f record;
BEGIN
 FOR f IN SELECT p.oid::regprocedure sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='dobby_access_private' AND p.proname<>'session_is_live' LOOP
  IF f.sig::text<>'dobby_access_private.bootstrap(jsonb,uuid)' THEN
   EXECUTE format('ALTER FUNCTION %s OWNER TO dobby_access_writer',f.sig);
  END IF;
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.sig);
 END LOOP;
END $functions$;
ALTER FUNCTION public.dobby_access_context() OWNER TO dobby_access_writer;
ALTER FUNCTION public.dobby_access_set_status(uuid,text,bigint,uuid,boolean) OWNER TO dobby_access_writer;
ALTER FUNCTION public.dobby_access_finalize_reactivation(uuid,bigint) OWNER TO dobby_access_writer;
REVOKE ALL ON FUNCTION public.dobby_access_context(),public.dobby_access_set_status(uuid,text,bigint,uuid,boolean),public.dobby_access_finalize_reactivation(uuid,bigint) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.dobby_access_context() TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dobby_access_set_status(uuid,text,bigint,uuid,boolean),public.dobby_access_finalize_reactivation(uuid,bigint) TO authenticated;
GRANT USAGE ON SCHEMA dobby_access_private TO anon,authenticated;
GRANT EXECUTE ON FUNCTION dobby_access_private.is_active(),dobby_access_private.assert_active(),dobby_access_private.assert_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION dobby_access_private.enable_session_guard() TO postgres;
REVOKE CREATE ON SCHEMA public,dobby_access_private FROM dobby_access_writer;
REVOKE CREATE ON SCHEMA dobby_access_private FROM dobby_access_session_reader;
-- Keep only ADMIN maintenance, never runtime inheritance or SET ROLE.
GRANT dobby_access_writer,dobby_access_session_reader TO postgres WITH INHERIT FALSE, SET FALSE;
COMMIT;
