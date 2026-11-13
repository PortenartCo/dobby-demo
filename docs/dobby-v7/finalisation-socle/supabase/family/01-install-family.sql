-- DOBBY familial uniquement. Exécution MANUELLE par l'utilisateur.
-- Adapté au diagnostic familial reçu le 13 novembre 2026 (PostgreSQL 17.11).
-- Aucune ligne Auth, profil, foyer, mission ou crédit n'est supprimée/réinitialisée.
-- N'active pas les nouvelles capacités clientes : état de publication fermé.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $preflight$
DECLARE expected record; signature regprocedure;
BEGIN
 IF current_user<>'postgres' OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=current_user AND rolcreaterole) THEN
  RAISE EXCEPTION 'Ce lot exige le SQL Editor familial postgres CREATEROLE vérifié';
 END IF;
 IF to_regnamespace('dobby_socle_private') IS NOT NULL OR EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='dobby_socle_writer') THEN
  RAISE EXCEPTION 'Socle déjà présent : vérifier, ne pas réinstaller';
 END IF;
 IF to_regclass('dobby_v7_private.account_links') IS NULL OR to_regprocedure('dobby_v7_private.actor()') IS NULL THEN
  RAISE EXCEPTION 'Socle Stitch installé attendu absent';
 END IF;
 IF md5(pg_get_functiondef('dobby_v7_private.actor()'::regprocedure))<>'b8cefee1f90f53c8bda4132fe4ae3358'
 OR md5(pg_get_functiondef('public.dobby_v2_modules_stamp()'::regprocedure))<>'6e2372696dc78db3a039342f66feadcf' THEN
  RAISE EXCEPTION 'Définitions réparées 11 différentes du diagnostic : arrêter et comparer, ne pas rejouer 11';
 END IF;
 FOR expected IN SELECT * FROM (VALUES
  ('public.dobby_v7_context()','7922dab8995e497b355dd5d137da0d16'),
  ('public.dobby_v7_update_member(text,jsonb,bigint,uuid)','6676da5247e4ab1f05c1576fa44c3a15'),
  ('public.dobby_v7_update_magic(text,jsonb,bigint,uuid)','ceed1e6fe382bd2e23b08daaf171797e'),
  ('public.dobby_v7_create_invitation(integer,uuid)','309388338e84987af96e72e8019d4e36'),
  ('public.dobby_v7_preview_invitation(text)','154652e29a22dee24d115bd38f6a293d'),
  ('public.dobby_v7_accept_invitation(text,uuid)','ffab7280e2346169f2757bb890a7af1b'),
  ('public.dobby_v7_revoke_invitation(uuid)','bbbec0a5446104ebb3bf937d70a4def2'),
  ('public.dobby_v7_bind_existing_member(uuid,text,uuid)','e0a28525f19bc411567fe4e04a80b890'),
  ('dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb)','3e24b733a1d3ef1261e2289c235f7637'),
  ('dobby_v7_private.guard_family()','cead63cad746f92910c5f050b757f3c5')
 ) AS source(signature,md5) LOOP
  signature:=to_regprocedure(expected.signature);
  IF signature IS NULL OR md5(pg_get_functiondef(signature))<>expected.md5 THEN
   RAISE EXCEPTION 'Fonction différente du catalogue confirmé : % ; arrêter sans remplacement',expected.signature;
  END IF;
 END LOOP;
END $preflight$;
CREATE ROLE dobby_socle_writer NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
-- ADMIN reste uniquement au propriétaire SQL Editor ; SET/INHERIT seront fermés.
GRANT dobby_socle_writer TO postgres WITH INHERIT TRUE, SET TRUE;
CREATE SCHEMA dobby_socle_private;
REVOKE ALL ON SCHEMA dobby_socle_private FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE,CREATE ON SCHEMA dobby_socle_private,public TO dobby_socle_writer;
GRANT USAGE ON SCHEMA dobby_v7_private TO dobby_socle_writer;
GRANT EXECUTE ON FUNCTION dobby_v7_private.actor() TO dobby_socle_writer;
CREATE TABLE dobby_socle_private.install_state(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 protocol integer NOT NULL DEFAULT 1 CHECK(protocol=1),
 family_api_enabled boolean NOT NULL DEFAULT true,
 family_client_verified boolean NOT NULL DEFAULT false,
 storage_client_verified boolean NOT NULL DEFAULT false,
 child_link_client_verified boolean NOT NULL DEFAULT false,
 missions_client_verified boolean NOT NULL DEFAULT false,
 installed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO dobby_socle_private.install_state(singleton) VALUES(true);
ALTER TABLE dobby_socle_private.install_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE dobby_socle_private.install_state FORCE ROW LEVEL SECURITY;
GRANT SELECT ON dobby_socle_private.install_state TO dobby_socle_writer;
-- Row-lock privilege on a constant constrained column, never on publication flags.
GRANT UPDATE(protocol) ON dobby_socle_private.install_state TO dobby_socle_writer;
CREATE POLICY socle_writer_read ON dobby_socle_private.install_state FOR SELECT TO dobby_socle_writer USING(true);
CREATE POLICY socle_writer_row_lock ON dobby_socle_private.install_state FOR UPDATE TO dobby_socle_writer USING(true) WITH CHECK(protocol=1);
-- Sauvegardes techniques sur place, jamais retournées ou publiées dans les preuves.
CREATE TABLE dobby_socle_private.family_function_backups(signature text PRIMARY KEY,definition text NOT NULL,definition_md5 text NOT NULL);
INSERT INTO dobby_socle_private.family_function_backups
 SELECT p.oid::regprocedure::text,pg_get_functiondef(p.oid),md5(pg_get_functiondef(p.oid))
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE (n.nspname='public' AND p.proname IN ('dobby_v7_context','dobby_v7_update_member','dobby_v7_update_magic','dobby_v7_create_invitation','dobby_v7_preview_invitation','dobby_v7_accept_invitation','dobby_v7_revoke_invitation','dobby_v7_bind_existing_member','dobby_v2_modules_stamp'))
 OR (n.nspname='dobby_v7_private' AND p.proname IN ('assert_snapshot','guard_family'));
ALTER TABLE dobby_socle_private.family_function_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE dobby_socle_private.family_function_backups FORCE ROW LEVEL SECURITY;
REVOKE ALL ON dobby_socle_private.family_function_backups FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE dobby_v7_private.invitations ADD COLUMN target_member_id text;
ALTER TABLE dobby_v7_private.invitations ADD COLUMN invitation_kind text NOT NULL DEFAULT 'member';
ALTER TABLE dobby_v7_private.invitations ADD CONSTRAINT socle_invitation_target_shape CHECK(
 (invitation_kind='member' AND target_member_id IS NULL) OR
 (invitation_kind='child-account' AND target_member_id IS NOT NULL AND length(target_member_id) BETWEEN 1 AND 120));
CREATE UNIQUE INDEX socle_one_pending_child_invitation ON dobby_v7_private.invitations(household_id,target_member_id)
 WHERE invitation_kind='child-account' AND accepted_by IS NULL AND revoked_at IS NULL;
DO $private_grants$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['pending_profiles','account_links','invitations','operations','install_secret'] LOOP
  EXECUTE format('GRANT SELECT ON dobby_v7_private.%I TO dobby_socle_writer',t);
  EXECUTE format('CREATE POLICY socle_writer ON dobby_v7_private.%I TO dobby_socle_writer USING(true) WITH CHECK(true)',t);
 END LOOP;
END $private_grants$;
GRANT INSERT ON dobby_v7_private.account_links,dobby_v7_private.invitations,dobby_v7_private.operations TO dobby_socle_writer;
GRANT UPDATE ON dobby_v7_private.invitations TO dobby_socle_writer;
GRANT DELETE ON dobby_v7_private.pending_profiles TO dobby_socle_writer;
-- SELECT FOR UPDATE needs UPDATE on at least one column; it never edits this profile.
GRANT UPDATE(profile) ON dobby_v7_private.pending_profiles TO dobby_socle_writer;
GRANT SELECT ON public.dobby_v2_households TO dobby_socle_writer;
GRANT SELECT,INSERT ON public.dobby_v2_memberships TO dobby_socle_writer;
GRANT UPDATE(active) ON public.dobby_v2_memberships TO dobby_socle_writer;
GRANT SELECT,INSERT,UPDATE ON public.dobby_v2_modules TO dobby_socle_writer;
CREATE POLICY socle_household_writer_read ON public.dobby_v2_households FOR SELECT TO dobby_socle_writer USING(true);
CREATE POLICY socle_membership_writer ON public.dobby_v2_memberships TO dobby_socle_writer USING(true) WITH CHECK(true);
CREATE POLICY socle_module_writer ON public.dobby_v2_modules TO dobby_socle_writer USING(module IN ('family','missions')) WITH CHECK(module IN ('family','missions'));

CREATE FUNCTION dobby_socle_private.members(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE a jsonb:=coalesce(p_payload->'familyMembers','[]'::jsonb);
BEGIN
  IF jsonb_typeof(a)<>'array' OR EXISTS(SELECT 1 FROM jsonb_array_elements(a) e
      WHERE jsonb_typeof(e)<>'object' OR jsonb_typeof(e->'id') IS DISTINCT FROM 'string'
         OR length(e->>'id') NOT BETWEEN 1 AND 120)
     OR (SELECT count(*) FROM jsonb_array_elements(a))<>(SELECT count(DISTINCT e->>'id') FROM jsonb_array_elements(a) e) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Membres natifs ambigus : aucune adoption automatique';
  END IF;
  RETURN a;
END $$;

CREATE FUNCTION dobby_socle_private.validate_profile(p_profile jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE k text; v text; p jsonb:='{}'; d date;
BEGIN
  IF jsonb_typeof(p_profile) IS DISTINCT FROM 'object' OR octet_length(p_profile::text)>4096 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Profil invalide';
  END IF;
  FOR k IN SELECT jsonb_object_keys(p_profile) LOOP
    IF k NOT IN ('firstName','lastName','birthdate','avatarId') OR jsonb_typeof(p_profile->k)<>'string' THEN
      RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Champ profil non autorisé';
    END IF;
    v:=btrim(p_profile->>k);
    IF length(v)>80 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Champ profil trop long'; END IF;
    p:=p||jsonb_build_object(k,v);
  END LOOP;
  IF coalesce(p->>'firstName','')='' OR length(concat_ws(' ',p->>'firstName',nullif(p->>'lastName','')))>80 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Prénom et nom requis, maximum 80 caractères';
  END IF;
  v:=p->>'birthdate';
  IF coalesce(v,'')<>'' THEN
    BEGIN d:=v::date;
      IF v!~'^\d{4}-\d{2}-\d{2}$' OR to_char(d,'YYYY-MM-DD')<>v OR d>CURRENT_DATE THEN RAISE EXCEPTION 'date'; END IF;
    EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Date de naissance invalide'; END;
  END IF;
  IF coalesce(p->>'avatarId','')<>'' AND (p->>'avatarId')!~'^portrait-([1-9]|1[0-9]|2[0-4])$' THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Portrait inconnu';
  END IF;
  RETURN p;
END $$;

CREATE FUNCTION dobby_socle_private.patch_profile(p_member jsonb,p_profile jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE p jsonb:=dobby_socle_private.validate_profile(p_profile); m jsonb:=p_member; magic jsonb;
BEGIN
  m:=m||(p-'avatarId');
  IF length(concat_ws(' ',m->>'firstName',nullif(m->>'lastName','')))>80 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Identité finale trop longue'; END IF;
  m:=m||jsonb_build_object('name',concat_ws(' ',m->>'firstName',nullif(m->>'lastName','')));
  IF p?'avatarId' THEN
    magic:=coalesce(m->'magicProfile','{"version":1}'::jsonb);
    IF jsonb_typeof(magic)<>'object' OR magic->'version' IS DISTINCT FROM '1'::jsonb THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Version magique inconnue conservée';
    END IF;
    m:=jsonb_set(m,'{magicProfile}',magic||jsonb_build_object('avatarId',p->>'avatarId'));
  END IF;
  RETURN m;
END $$;

CREATE FUNCTION dobby_socle_private.digest(p_value jsonb) RETURNS bytea
LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT sha256(convert_to(p_value::text,'UTF8')) $$;
CREATE FUNCTION dobby_socle_private.operation(p_actor uuid,p_id uuid,p_kind text,p_request jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r dobby_v7_private.operations%ROWTYPE;
BEGIN
  IF p_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Identifiant opération requis'; END IF;
  SELECT * INTO r FROM dobby_v7_private.operations WHERE actor_id=p_actor AND operation_id=p_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF r.kind<>p_kind OR r.request_digest IS DISTINCT FROM dobby_socle_private.digest(p_request) THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Identifiant opération réutilisé avec un contenu différent';
  END IF;
  RETURN r.result;
END $$;



CREATE FUNCTION dobby_socle_private.receipt(p_actor uuid,p_id uuid,p_kind text,p_request jsonb,p_result jsonb) RETURNS void
LANGUAGE sql SET search_path='' AS $$
  INSERT INTO dobby_v7_private.operations(actor_id,operation_id,kind,request_digest,result)
  VALUES(p_actor,p_id,p_kind,dobby_socle_private.digest(p_request),p_result)
$$;

CREATE FUNCTION dobby_socle_private.lock_actor() RETURNS uuid
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE u uuid:=dobby_v7_private.actor();
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('dobby-v7-account:'||u::text,0));
  RETURN u;
END $$;

CREATE FUNCTION dobby_socle_private.invitation_token(p_actor uuid,p_id uuid) RETURNS text
LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT encode(sha256(secret||sha256(convert_to(p_actor::text||':'||p_id::text,'UTF8'))),'hex')
  FROM dobby_v7_private.install_secret WHERE singleton
$$;

CREATE FUNCTION dobby_socle_private.add_pending_member(p_actor uuid,p_household uuid) RETURNS text
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE p jsonb; m jsonb; a jsonb; row public.dobby_v2_modules%ROWTYPE; id text:='member-'||gen_random_uuid()::text;
BEGIN
  SELECT profile INTO p FROM dobby_v7_private.pending_profiles WHERE user_id=p_actor FOR UPDATE;
  IF p IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Profil personnel requis'; END IF;
  SELECT * INTO row FROM public.dobby_v2_modules WHERE household_id=p_household AND module='family' FOR UPDATE;
  IF row.household_id IS NULL THEN
    INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES(p_household,'family','{}') RETURNING * INTO row;
  END IF;
  a:=dobby_socle_private.members(row.payload);
  m:=dobby_socle_private.patch_profile(jsonb_build_object('id',id,'memberCategory','parent'),p);
  UPDATE public.dobby_v2_modules SET payload=jsonb_set(row.payload,'{familyMembers}',a||jsonb_build_array(m))
  WHERE household_id=p_household AND module='family';
  INSERT INTO dobby_v7_private.account_links(user_id,household_id,member_id) VALUES(p_actor,p_household,id);
  DELETE FROM dobby_v7_private.pending_profiles WHERE user_id=p_actor;
  RETURN id;
END $$;

CREATE FUNCTION dobby_socle_private.actor() RETURNS uuid
LANGUAGE sql STABLE SET search_path='' AS $$ SELECT dobby_v7_private.actor() $$;

CREATE FUNCTION dobby_socle_private.actor_context(p_household uuid,p_lock boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_socle_private.actor(); l dobby_v7_private.account_links%ROWTYPE;
 row public.dobby_v2_modules%ROWTYPE; membership text; profile jsonb; category text; pending jsonb;
 enabled boolean:=false; missions_enabled boolean:=false; target uuid;
BEGIN
 IF p_lock THEN PERFORM dobby_socle_private.lock_actor(); END IF;
 SELECT * INTO l FROM dobby_v7_private.account_links WHERE user_id=u;
 IF NOT FOUND THEN
  IF p_household IS NOT NULL OR p_lock THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Profil canonique actif requis'; END IF;
  IF EXISTS(SELECT 1 FROM public.dobby_v2_memberships WHERE user_id=u AND active) THEN
   RETURN jsonb_build_object('protocol',1,'phase','rejected','userId',u,'reason','existing_member_link_required');
  END IF;
  SELECT pp.profile INTO pending FROM dobby_v7_private.pending_profiles pp WHERE pp.user_id=u;
  RETURN jsonb_build_object('protocol',1,'phase',CASE WHEN pending IS NULL THEN 'profile' ELSE 'household' END,'userId',u,'profile',pending);
 END IF;
 target:=l.household_id;
 IF p_household IS NOT NULL AND p_household<>target THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Accès à un autre foyer refusé'; END IF;
 IF p_lock THEN
  SELECT role INTO membership FROM public.dobby_v2_memberships WHERE household_id=target AND user_id=u AND active FOR SHARE;
  IF membership IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Appartenance inactive'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('dobby-family-socle:'||target::text,0));
  SELECT * INTO row FROM public.dobby_v2_modules WHERE household_id=target AND module='family' FOR UPDATE;
  -- A link or profile may have changed while this request waited for the row.
  SELECT * INTO l FROM dobby_v7_private.account_links WHERE user_id=u;
  IF NOT FOUND OR l.household_id<>target THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Liaison modifiée pendant la requête'; END IF;
 ELSE
  SELECT role INTO membership FROM public.dobby_v2_memberships WHERE household_id=target AND user_id=u AND active;
  SELECT * INTO row FROM public.dobby_v2_modules WHERE household_id=target AND module='family';
 END IF;
 IF membership IS NULL OR row.household_id IS NULL OR EXISTS(SELECT 1 FROM public.dobby_v2_memberships WHERE user_id=u AND active AND household_id<>target) THEN
  IF p_lock THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Appartenance canonique unique requise'; END IF;
  RETURN jsonb_build_object('protocol',1,'phase','rejected','userId',u,'reason','inactive_or_missing_binding');
 END IF;
 SELECT e INTO profile FROM jsonb_array_elements(dobby_socle_private.members(row.payload)) e WHERE e->>'id'=l.member_id;
 category:=profile->>'memberCategory';
 IF profile IS NULL OR category IS NULL OR category NOT IN ('parent','child') THEN
  IF p_lock THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Profil humain actif requis'; END IF;
  RETURN jsonb_build_object('protocol',1,'phase','rejected','userId',u,'reason','inactive_or_missing_binding');
 END IF;
 SELECT family_client_verified AND storage_client_verified,missions_client_verified INTO enabled,missions_enabled FROM dobby_socle_private.install_state WHERE singleton;
 RETURN jsonb_build_object('protocol',1,'phase','active','userId',u,'householdId',target,'memberId',l.member_id,
  'profile',profile,'category',category,'familyRevision',row.revision,
  'permissions',jsonb_build_object('canEdit',category='parent','canMagic',true,
   'canCreate',category='parent' AND (membership='owner' OR enabled),
   'canManageDependents',category='parent' AND (membership='owner' OR enabled),
   'canManageHousehold',category='parent' AND enabled,
   'canCompleteMissionsV3',category IN ('parent','child') AND enabled AND missions_enabled,
   'canInvite',category='parent' AND (membership='owner' OR enabled)),
  'pendingCeremony',NOT(coalesce(profile->'magicProfile'->>'ceremonyStatus','')='complete' OR
   (coalesce(profile->'magicProfile'->>'houseId','') IN ('gryffindor','slytherin','ravenclaw','hufflepuff') AND
    coalesce(profile->'magicProfile'->>'patronusId','') IN ('stag','otter','fox','wolf','cat','owl','horse','hare','swan','lynx','badger','dolphin'))));
END $$;
CREATE FUNCTION dobby_socle_private.is_parent(p_household uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE c jsonb;
BEGIN
 c:=dobby_socle_private.actor_context(p_household,false);
 RETURN c->>'phase'='active' AND c->>'category'='parent';
EXCEPTION WHEN insufficient_privilege OR invalid_text_representation THEN RETURN false;
END $$;
CREATE FUNCTION dobby_socle_private.parent_context(p_household uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c jsonb:=dobby_socle_private.actor_context(p_household,true);
BEGIN
 IF c->>'category' IS DISTINCT FROM 'parent' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Parent canonique du foyer requis'; END IF;
 RETURN c;
END $$;

-- Only catalog-proven endpoint signatures are replaced; RESTRICT never CASCADE.
DROP FUNCTION public.dobby_v7_context() RESTRICT;
CREATE FUNCTION public.dobby_v7_context() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT dobby_socle_private.actor_context(NULL,false) $$;

DROP TRIGGER dobby_v7_family_guard ON public.dobby_v2_modules;
DROP FUNCTION dobby_v7_private.guard_family() RESTRICT;
DROP FUNCTION dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb) RESTRICT;
CREATE FUNCTION dobby_v7_private.assert_snapshot(p_household uuid,p_old jsonb,p_new jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c jsonb:=dobby_socle_private.actor_context(p_household,false); a jsonb:=dobby_socle_private.members(p_old);
 b jsonb:=dobby_socle_private.members(p_new); x jsonb; y jsonb; bound record;
BEGIN
 IF c->>'category' IS DISTINCT FROM 'parent' OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(a) e WHERE e->>'id'=c->>'memberId' AND e->>'memberCategory'='parent') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Snapshot familial réservé au Parent'; END IF;
 -- BEFORE UPDATE already owns familyrow: do not acquire account/HH advisory
 -- after that row (RPCs use the opposite order). Stabilize only membership.
 PERFORM 1 FROM public.dobby_v2_memberships WHERE household_id=p_household AND user_id=(c->>'userId')::uuid AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Appartenance inactive'; END IF;
 -- Linked IDs must survive a full snapshot; identity/profile changes use the
 -- same ID and never silently remove an Auth binding or historical person.
 FOR bound IN SELECT member_id FROM dobby_v7_private.account_links WHERE household_id=p_household LOOP
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(b) e WHERE e->>'id'=bound.member_id) THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Un profil lié ne peut disparaître dans un snapshot';
  END IF;
 END LOOP;
 FOR y IN SELECT e FROM jsonb_array_elements(b) e LOOP
  SELECT e INTO x FROM jsonb_array_elements(a) e WHERE e->>'id'=y->>'id';
  IF x IS NULL AND coalesce(y->>'memberCategory','') NOT IN ('baby','child','pet') THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Un nouveau Parent rejoint par son compte et invitation';
  END IF;
  IF x IS NOT NULL AND x->>'memberCategory' IS DISTINCT FROM y->>'memberCategory' AND
    (x->>'memberCategory'='parent' OR y->>'memberCategory'='parent') THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Statut parental protégé';
  END IF;
  IF y->>'memberCategory'='pet' AND y ? 'magicProfile' AND y->'magicProfile' IS DISTINCT FROM x->'magicProfile' THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Un animal ne reçoit pas de magie';
  END IF;
 END LOOP;
END $$;
CREATE FUNCTION dobby_v7_private.guard_family() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF (CASE WHEN TG_OP='DELETE' THEN OLD.module ELSE NEW.module END)<>'family' THEN
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
 END IF;
 IF current_user IN ('dobby_v7_writer','dobby_socle_writer') OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolsuper) THEN
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Suppression du module familial interdite'; END IF;
 PERFORM dobby_v7_private.assert_snapshot(NEW.household_id,CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE OLD.payload END,NEW.payload);
 RETURN NEW;
END $$;
CREATE TRIGGER dobby_v7_family_guard BEFORE INSERT OR UPDATE OR DELETE ON public.dobby_v2_modules
FOR EACH ROW EXECUTE FUNCTION dobby_v7_private.guard_family();

DROP FUNCTION public.dobby_v7_update_member(text,jsonb,bigint,uuid) RESTRICT;
CREATE FUNCTION public.dobby_v7_update_member(p_member_id text,p_values jsonb,p_expected_revision bigint,p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_socle_private.lock_actor(); c jsonb:=dobby_socle_private.actor_context(NULL,true);
  req jsonb:=jsonb_build_object('memberId',p_member_id,'values',p_values,'revision',p_expected_revision);
  prior jsonb; row public.dobby_v2_modules%ROWTYPE; a jsonb; m jsonb; p jsonb; magic jsonb;
  k text; v text; first_name text; last_name text; d date; structured boolean;
BEGIN
  IF c->>'phase'<>'active' OR c->'permissions'->'canEdit' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Modification du membre refusée'; END IF;
  PERFORM 1 FROM public.dobby_v2_memberships WHERE household_id=(c->>'householdId')::uuid AND user_id=u AND active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Appartenance inactive'; END IF;
  prior:=dobby_socle_private.operation(u,p_operation_id,'update_member',req);
  IF prior IS NOT NULL THEN RETURN jsonb_build_object('protocol',1,'replayed',true,'context',public.dobby_v7_context()); END IF;
  IF p_expected_revision IS NULL OR p_expected_revision<1 OR p_expected_revision>9007199254740990 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Révision attendue invalide'; END IF;
  IF jsonb_typeof(p_values) IS DISTINCT FROM 'object' OR p_values='{}'::jsonb OR octet_length(p_values::text)>16384 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Champs membre invalides'; END IF;
  FOR k IN SELECT jsonb_object_keys(p_values) LOOP
    IF k NOT IN ('name','firstName','lastName','profileFirstName','profileLastName','birthdate','avatar','magicAvatarId','nickname','notes','species','memberCategory','clearBirthdate') OR jsonb_typeof(p_values->k)<>'string' THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Champ membre non autorisé'; END IF;
  END LOOP;
  SELECT * INTO row FROM public.dobby_v2_modules WHERE household_id=(c->>'householdId')::uuid AND module='family' FOR UPDATE;
  IF row.revision<>p_expected_revision THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Conflit de révision Famille : rechargez sans écraser'; END IF;
  a:=dobby_socle_private.members(row.payload);
  SELECT e INTO m FROM jsonb_array_elements(a) e WHERE e->>'id'=p_member_id;
  IF m IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Seul votre profil ou un dépendant non lié est modifiable'; END IF;
  IF (p_values?'firstName' AND p_values?'profileFirstName' AND p_values->>'firstName'<>p_values->>'profileFirstName') OR
     (p_values?'lastName' AND p_values?'profileLastName' AND p_values->>'lastName'<>p_values->>'profileLastName') THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Identité contradictoire'; END IF;
  structured:=p_values ?| ARRAY['firstName','lastName','profileFirstName','profileLastName'];
  IF structured THEN
    first_name:=coalesce(p_values->>'firstName',p_values->>'profileFirstName',m->>'firstName','');
    last_name:=coalesce(p_values->>'lastName',p_values->>'profileLastName',m->>'lastName','');
    p:=dobby_socle_private.validate_profile(jsonb_build_object('firstName',first_name,'lastName',last_name));
    m:=dobby_socle_private.patch_profile(m,p);
  END IF;
  IF p_values?'name' THEN
    v:=btrim(p_values->>'name');
    IF length(v) NOT BETWEEN 1 AND 80 OR (coalesce(m->>'firstName','')<>'' AND v<>concat_ws(' ',m->>'firstName',nullif(m->>'lastName',''))) THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Nom incohérent avec le prénom et le nom structurés'; END IF;
    m:=m||jsonb_build_object('name',v);
  END IF;
  IF p_values?'memberCategory' THEN
    v:=p_values->>'memberCategory';
    IF v NOT IN ('parent','baby','child','pet') OR (v IS DISTINCT FROM m->>'memberCategory' AND (v='parent' OR m->>'memberCategory'='parent')) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Statut parental immuable'; END IF;
    m:=m||jsonb_build_object('memberCategory',v);
  END IF;
  FOREACH k IN ARRAY ARRAY['nickname','notes','species','avatar'] LOOP
    IF p_values?k THEN
      v:=btrim(p_values->>k);
      IF length(v)>(CASE WHEN k='notes' THEN 4000 ELSE 80 END) THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Champ membre trop long'; END IF;
      m:=m||jsonb_build_object(k,v);
    END IF;
  END LOOP;
  IF p_values?'birthdate' THEN
    v:=btrim(p_values->>'birthdate');
    IF v='' AND coalesce(m->>'birthdate','')<>'' AND coalesce(p_values->>'clearBirthdate','')<>'true' THEN
      BEGIN d:=(m->>'birthdate')::date; EXCEPTION WHEN OTHERS THEN v:=m->>'birthdate'; END;
    END IF;
    IF v<>'' AND v IS DISTINCT FROM m->>'birthdate' THEN
      BEGIN d:=v::date;
        IF v!~'^\d{4}-\d{2}-\d{2}$' OR to_char(d,'YYYY-MM-DD')<>v OR d>CURRENT_DATE THEN RAISE EXCEPTION 'date'; END IF;
      EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Date de naissance invalide'; END;
    END IF;
    m:=m||jsonb_build_object('birthdate',v);
  END IF;
  IF p_values?'magicAvatarId' THEN
    IF m->>'memberCategory'='pet' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Un animal ne reçoit pas de profil magique'; END IF;
    v:=p_values->>'magicAvatarId';
    IF v<>'' AND v!~'^portrait-([1-9]|1[0-9]|2[0-4])$' THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Portrait inconnu'; END IF;
    magic:=coalesce(m->'magicProfile','{"version":1}'::jsonb);
    IF jsonb_typeof(magic)<>'object' OR magic->'version' IS DISTINCT FROM '1'::jsonb THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Version magique inconnue conservée'; END IF;
    m:=jsonb_set(m,'{magicProfile}',magic||jsonb_build_object('avatarId',v));
  END IF;
  SELECT jsonb_agg(CASE WHEN e->>'id'=p_member_id THEN m ELSE e END ORDER BY n) INTO a FROM jsonb_array_elements(a) WITH ORDINALITY x(e,n);
  UPDATE public.dobby_v2_modules SET payload=jsonb_set(row.payload,'{familyMembers}',a) WHERE household_id=row.household_id AND module='family' RETURNING * INTO row;
  PERFORM dobby_socle_private.receipt(u,p_operation_id,'update_member',req,jsonb_build_object('revision',row.revision));
  RETURN jsonb_build_object('protocol',1,'replayed',false,'context',public.dobby_v7_context(),'module',jsonb_build_object('module','family','payload',row.payload,'revision',row.revision,'updated_at',row.updated_at));
END $$;

DROP FUNCTION public.dobby_v7_update_magic(text,jsonb,bigint,uuid) RESTRICT;
CREATE FUNCTION public.dobby_v7_update_magic(p_member_id text,p_values jsonb,p_expected_revision bigint,p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_socle_private.lock_actor(); c jsonb:=dobby_socle_private.actor_context(NULL,true);
  req jsonb:=jsonb_build_object('memberId',p_member_id,'values',p_values,'revision',p_expected_revision);
  prior jsonb; row public.dobby_v2_modules%ROWTYPE; a jsonb; m jsonb; magic jsonb; k text; v text; kind text; idkey text; sourcekey text; algorithmkey text;
BEGIN
  IF c->>'phase'<>'active' OR c->'permissions'->'canMagic' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Identité magique vérifiée requise'; END IF;
  PERFORM 1 FROM public.dobby_v2_memberships WHERE household_id=(c->>'householdId')::uuid AND user_id=u AND active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Appartenance inactive'; END IF;
  prior:=dobby_socle_private.operation(u,p_operation_id,'update_magic',req);
  IF prior IS NOT NULL THEN RETURN jsonb_build_object('protocol',1,'replayed',true,'context',public.dobby_v7_context()); END IF;
  IF p_expected_revision IS NULL OR p_expected_revision<1 OR p_expected_revision>9007199254740990 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Révision attendue invalide'; END IF;
  IF jsonb_typeof(p_values) IS DISTINCT FROM 'object' OR p_values='{}'::jsonb OR octet_length(p_values::text)>4096 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Choix magique invalide'; END IF;
  FOR k IN SELECT jsonb_object_keys(p_values) LOOP
    IF k NOT IN ('magicHouseId','magicHouseAlgorithm','magicPatronusId','magicPatronusAlgorithm','magicCeremony') OR jsonb_typeof(p_values->k)<>'string' THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Champ magique interdit'; END IF;
  END LOOP;
  SELECT * INTO row FROM public.dobby_v2_modules WHERE household_id=(c->>'householdId')::uuid AND module='family' FOR UPDATE;
  IF row.revision<>p_expected_revision THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Conflit de révision Famille : rechargez sans écraser'; END IF;
  a:=dobby_socle_private.members(row.payload);
  SELECT e INTO m FROM jsonb_array_elements(a) e WHERE e->>'id'=p_member_id;
  IF m IS NULL OR m->>'memberCategory'='pet' OR (c->>'category'<>'parent' AND p_member_id<>c->>'memberId') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Seul votre profil ou un dépendant non lié est modifiable';
  END IF;
  magic:=coalesce(m->'magicProfile','{"version":1}'::jsonb);
  IF jsonb_typeof(magic)<>'object' OR magic->'version' IS DISTINCT FROM '1'::jsonb THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Version magique inconnue conservée'; END IF;
  FOREACH kind IN ARRAY ARRAY['House','Patronus'] LOOP
    idkey:=lower(left(kind,1))||substr(kind,2)||'Id'; sourcekey:=lower(left(kind,1))||substr(kind,2)||'SelectionSource'; algorithmkey:=lower(left(kind,1))||substr(kind,2)||'AlgorithmVersion';
    IF p_values?('magic'||kind||'Algorithm') AND (NOT p_values?('magic'||kind||'Id') OR p_values->>('magic'||kind||'Algorithm')<>'e06-v1') THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Résultat et version E06 requis ensemble'; END IF;
    IF p_values?('magic'||kind||'Id') THEN
      v:=p_values->>('magic'||kind||'Id');
      IF (kind='House' AND v NOT IN ('gryffindor','slytherin','ravenclaw','hufflepuff')) OR (kind='Patronus' AND v NOT IN ('stag','otter','fox','wolf','cat','owl','horse','hare','swan','lynx','badger','dolphin')) THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Résultat magique inconnu'; END IF;
      magic:=(magic-algorithmkey)||jsonb_build_object(idkey,v,sourcekey,CASE WHEN p_values?('magic'||kind||'Algorithm') THEN 'calculated' ELSE 'manual' END);
      IF p_values?('magic'||kind||'Algorithm') THEN magic:=magic||jsonb_build_object(algorithmkey,'e06-v1'); END IF;
    END IF;
  END LOOP;
  IF p_values?'magicCeremony' AND p_values->>'magicCeremony' NOT IN ('complete','deferred') THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='État de cérémonie inconnu'; END IF;
  magic:=magic||jsonb_build_object('ceremonyStatus',CASE WHEN magic->>'houseId' IN ('gryffindor','slytherin','ravenclaw','hufflepuff') AND magic->>'patronusId' IN ('stag','otter','fox','wolf','cat','owl','horse','hare','swan','lynx','badger','dolphin') THEN 'complete' ELSE 'deferred' END);
  m:=jsonb_set(m,'{magicProfile}',magic);
  SELECT jsonb_agg(CASE WHEN e->>'id'=p_member_id THEN m ELSE e END ORDER BY n) INTO a FROM jsonb_array_elements(a) WITH ORDINALITY x(e,n);
  UPDATE public.dobby_v2_modules SET payload=jsonb_set(row.payload,'{familyMembers}',a) WHERE household_id=row.household_id AND module='family' RETURNING * INTO row;
  PERFORM dobby_socle_private.receipt(u,p_operation_id,'update_magic',req,jsonb_build_object('revision',row.revision));
  RETURN jsonb_build_object('protocol',1,'replayed',false,'context',public.dobby_v7_context(),'module',jsonb_build_object('module','family','payload',row.payload,'revision',row.revision,'updated_at',row.updated_at));
END $$;

-- Holds a shared state-row lock through COMMIT, so suspension cannot pass an
-- already-authorized uncommitted child acceptance and remove its protection.
CREATE FUNCTION dobby_socle_private.assert_child_api_enabled() RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM dobby_socle_private.install_state WHERE singleton AND family_api_enabled FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Rattachement enfant suspendu'; END IF;
END $$;
CREATE FUNCTION dobby_socle_private.create_invitation(p_member_id text,p_expires_in_hours integer,p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c jsonb:=dobby_socle_private.parent_context(); u uuid:=(c->>'userId')::uuid;
 req jsonb:=jsonb_build_object('hours',p_expires_in_hours,'householdId',c->>'householdId','memberId',p_member_id);
 prior jsonb; token text; inv dobby_v7_private.invitations%ROWTYPE; row public.dobby_v2_modules%ROWTYPE;
 target jsonb; name text; kind text:=CASE WHEN p_member_id IS NULL THEN 'member' ELSE 'child-account' END;
BEGIN
 IF p_expires_in_hours IS NULL OR p_expires_in_hours NOT BETWEEN 1 AND 720 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Durée invitation entre 1 et 720 heures'; END IF;
 IF kind='child-account' THEN PERFORM dobby_socle_private.assert_child_api_enabled(); END IF;
 -- Preserve the request digest of previously installed generic invitations.
 IF kind='member' THEN req:=req-'memberId'; END IF;
 prior:=dobby_socle_private.operation(u,p_operation_id,CASE WHEN kind='member' THEN 'create_invitation' ELSE 'create_child_invitation' END,req);
 token:=dobby_socle_private.invitation_token(u,p_operation_id);
 SELECT * INTO row FROM public.dobby_v2_modules WHERE household_id=(c->>'householdId')::uuid AND module='family';
 IF kind='child-account' THEN
  SELECT e INTO target FROM jsonb_array_elements(dobby_socle_private.members(row.payload)) e WHERE e->>'id'=p_member_id;
  IF target IS NULL OR target->>'memberCategory' IS DISTINCT FROM 'child' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Profil enfant existant exact requis'; END IF;
  IF prior IS NULL AND EXISTS(SELECT 1 FROM dobby_v7_private.account_links WHERE household_id=row.household_id AND member_id=p_member_id) THEN RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='Cet enfant possède déjà un compte lié'; END IF;
 END IF;
 IF prior IS NULL THEN
  IF kind='child-account' THEN
   -- Expired targeted links are retained as revoked history, never deleted.
   UPDATE dobby_v7_private.invitations SET revoked_at=clock_timestamp()
    WHERE household_id=row.household_id AND target_member_id=p_member_id AND invitation_kind=kind
     AND accepted_by IS NULL AND revoked_at IS NULL AND expires_at<=clock_timestamp();
  END IF;
  INSERT INTO dobby_v7_private.invitations(id,household_id,created_by,token_hash,expires_at,target_member_id,invitation_kind)
   VALUES(p_operation_id,row.household_id,u,sha256(convert_to(token,'UTF8')),clock_timestamp()+make_interval(hours=>p_expires_in_hours),p_member_id,kind) RETURNING * INTO inv;
  PERFORM dobby_socle_private.receipt(u,p_operation_id,CASE WHEN kind='member' THEN 'create_invitation' ELSE 'create_child_invitation' END,req,jsonb_build_object('invitationId',inv.id));
 ELSE
  SELECT * INTO inv FROM dobby_v7_private.invitations WHERE id=p_operation_id;
  IF inv.household_id IS DISTINCT FROM row.household_id OR inv.target_member_id IS DISTINCT FROM p_member_id OR inv.invitation_kind<>kind THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Reçu invitation incohérent'; END IF;
 END IF;
 SELECT h.name INTO name FROM public.dobby_v2_households h WHERE h.id=inv.household_id;
 RETURN jsonb_build_object('protocol',1,'kind',kind,'invitationId',inv.id,'token',token,'expiresAt',inv.expires_at,
  'targetMemberId',p_member_id,'household',jsonb_build_object('id',inv.household_id,'name',name),
  'inviter',jsonb_build_object('name',c->'profile'->>'name'),'replayed',prior IS NOT NULL);
END $$;
DROP FUNCTION public.dobby_v7_create_invitation(integer,uuid) RESTRICT;
CREATE FUNCTION public.dobby_v7_create_invitation(p_expires_in_hours integer,p_operation_id uuid) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT dobby_socle_private.create_invitation(NULL,p_expires_in_hours,p_operation_id) $$;
CREATE FUNCTION public.dobby_v7_create_child_invitation(p_member_id text,p_expires_in_hours integer,p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_member_id IS NULL OR length(p_member_id) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Identité enfant requise'; END IF;
 RETURN dobby_socle_private.create_invitation(p_member_id,p_expires_in_hours,p_operation_id);
END $$;

CREATE FUNCTION dobby_socle_private.preview_invitation(p_token text,p_kind text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE inv dobby_v7_private.invitations%ROWTYPE; name text; inviter jsonb; profile jsonb; payload jsonb;
BEGIN
 IF p_token IS NULL OR p_token!~'^[0-9a-f]{64}$' THEN RETURN jsonb_build_object('status','invalid'); END IF;
 SELECT * INTO inv FROM dobby_v7_private.invitations WHERE token_hash=sha256(convert_to(p_token,'UTF8'));
 IF NOT FOUND OR inv.invitation_kind<>p_kind OR inv.revoked_at IS NOT NULL OR inv.accepted_by IS NOT NULL THEN RETURN jsonb_build_object('status','invalid'); END IF;
 IF p_kind='child-account' AND NOT EXISTS(SELECT 1 FROM dobby_socle_private.install_state WHERE singleton AND family_api_enabled) THEN RETURN jsonb_build_object('status','unavailable'); END IF;
 SELECT m.payload INTO payload FROM public.dobby_v2_modules m WHERE household_id=inv.household_id AND module='family';
 SELECT e INTO inviter FROM dobby_v7_private.account_links l JOIN public.dobby_v2_memberships a
  ON a.household_id=l.household_id AND a.user_id=l.user_id AND a.active,
  LATERAL jsonb_array_elements(dobby_socle_private.members(payload)) e
  WHERE l.user_id=inv.created_by AND l.household_id=inv.household_id AND e->>'id'=l.member_id AND e->>'memberCategory'='parent';
 IF inviter IS NULL THEN RETURN jsonb_build_object('status','invalid'); END IF;
 IF inv.expires_at<=statement_timestamp() THEN RETURN jsonb_build_object('status','expired'); END IF;
 IF p_kind='child-account' THEN
  SELECT e INTO profile FROM jsonb_array_elements(dobby_socle_private.members(payload)) e WHERE e->>'id'=inv.target_member_id AND e->>'memberCategory'='child';
  IF profile IS NULL OR EXISTS(SELECT 1 FROM dobby_v7_private.account_links WHERE household_id=inv.household_id AND member_id=inv.target_member_id) THEN RETURN jsonb_build_object('status','invalid'); END IF;
 END IF;
 SELECT h.name INTO name FROM public.dobby_v2_households h WHERE h.id=inv.household_id;
 IF name IS NULL THEN RETURN jsonb_build_object('status','invalid'); END IF;
 RETURN jsonb_build_object('status','valid','kind',p_kind,'targetMemberId',inv.target_member_id,
  'household',jsonb_build_object('id',inv.household_id,'name',name),
  'inviter',jsonb_build_object('name',inviter->>'name'),'expiresAt',inv.expires_at);
END $$;
DROP FUNCTION public.dobby_v7_preview_invitation(text) RESTRICT;
CREATE FUNCTION public.dobby_v7_preview_invitation(p_token text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT dobby_socle_private.preview_invitation(p_token,'member') $$;
CREATE FUNCTION public.dobby_v7_preview_child_invitation(p_token text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT dobby_socle_private.preview_invitation(p_token,'child-account') $$;

CREATE FUNCTION dobby_socle_private.accept_invitation(p_token text,p_operation_id uuid,p_kind text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_socle_private.lock_actor(); inv dobby_v7_private.invitations%ROWTYPE;
 req jsonb:=jsonb_build_object('tokenHash',encode(sha256(convert_to(coalesce(p_token,''),'UTF8')),'hex'));
 prior jsonb; c jsonb; row public.dobby_v2_modules%ROWTYPE; inviter jsonb; target jsonb; operation_kind text;
BEGIN
 operation_kind:=CASE WHEN p_kind='member' THEN 'accept_invitation' ELSE 'accept_child_invitation' END;
 prior:=dobby_socle_private.operation(u,p_operation_id,operation_kind,req);
 c:=dobby_socle_private.actor_context(NULL,false);
 IF prior IS NOT NULL THEN
  IF c->>'phase'<>'active' OR c->>'householdId'<>prior->>'householdId' OR
    (p_kind='child-account' AND c->>'memberId' IS DISTINCT FROM prior->>'memberId') THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Appartenance acceptée devenue indisponible';
  END IF;
  RETURN c||jsonb_build_object('replayed',true);
 END IF;
 IF p_token IS NULL OR p_token!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invitation invalide'; END IF;
 -- Locate HH without a row lock, then take the shared family order BEFORE
 -- locking the invitation. Revoke follows exactly the same order.
 SELECT * INTO inv FROM dobby_v7_private.invitations WHERE token_hash=sha256(convert_to(p_token,'UTF8'));
 IF NOT FOUND OR inv.invitation_kind<>p_kind THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invitation invalide'; END IF;
 PERFORM 1 FROM public.dobby_v2_memberships WHERE household_id=inv.household_id AND user_id=inv.created_by AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Invitant non autorisé'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('dobby-family-socle:'||inv.household_id::text,0));
 SELECT * INTO row FROM public.dobby_v2_modules WHERE household_id=inv.household_id AND module='family' FOR UPDATE;
 SELECT * INTO inv FROM dobby_v7_private.invitations WHERE token_hash=sha256(convert_to(p_token,'UTF8')) FOR UPDATE;
 IF NOT FOUND OR inv.invitation_kind<>p_kind OR inv.household_id IS DISTINCT FROM row.household_id THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invitation modifiée ou foyer absent'; END IF;
 c:=dobby_socle_private.actor_context(NULL,false);
 IF inv.accepted_by=u AND c->>'phase'='active' AND c->>'householdId'=inv.household_id::text AND
   (p_kind='member' OR c->>'memberId'=inv.target_member_id) THEN
  PERFORM dobby_socle_private.receipt(u,p_operation_id,operation_kind,req,jsonb_build_object('householdId',inv.household_id,'memberId',c->>'memberId'));
  RETURN c||jsonb_build_object('replayed',true);
 END IF;
 IF inv.revoked_at IS NOT NULL OR inv.accepted_by IS NOT NULL OR inv.expires_at<=clock_timestamp() THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invitation expirée, révoquée ou déjà utilisée'; END IF;
 SELECT e INTO inviter FROM dobby_v7_private.account_links l JOIN public.dobby_v2_memberships a
  ON a.household_id=l.household_id AND a.user_id=l.user_id AND a.active,
  LATERAL jsonb_array_elements(dobby_socle_private.members(row.payload)) e
  WHERE l.user_id=inv.created_by AND l.household_id=inv.household_id AND e->>'id'=l.member_id AND e->>'memberCategory'='parent';
 IF inviter IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Invitant Parent canonique requis'; END IF;
 IF c->>'phase' NOT IN ('profile','household') OR EXISTS(SELECT 1 FROM dobby_v7_private.account_links WHERE user_id=u) OR EXISTS(SELECT 1 FROM public.dobby_v2_memberships WHERE user_id=u AND active) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Compte déjà lié : aucune duplication ou réaffectation';
 END IF;
 IF p_kind='child-account' THEN
  PERFORM dobby_socle_private.assert_child_api_enabled();
  SELECT e INTO target FROM jsonb_array_elements(dobby_socle_private.members(row.payload)) e WHERE e->>'id'=inv.target_member_id;
  IF target IS NULL OR target->>'memberCategory' IS DISTINCT FROM 'child' OR EXISTS(SELECT 1 FROM dobby_v7_private.account_links WHERE household_id=row.household_id AND member_id=inv.target_member_id) THEN
   RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='Profil enfant absent ou déjà lié';
  END IF;
 ELSE
  IF c->>'phase'<>'household' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Profil personnel requis pour invitation générique'; END IF;
 END IF;
 -- No conflict UPDATE: even an inactive existing row requires explicit review.
 INSERT INTO public.dobby_v2_memberships(household_id,user_id,role) VALUES(inv.household_id,u,'member');
 IF p_kind='child-account' THEN
  INSERT INTO dobby_v7_private.account_links(user_id,household_id,member_id) VALUES(u,inv.household_id,inv.target_member_id);
  DELETE FROM dobby_v7_private.pending_profiles WHERE user_id=u;
  -- Family JSON, IDs, avatar, magic, missions, ledger and revision are untouched.
 ELSE
  PERFORM dobby_socle_private.add_pending_member(u,inv.household_id);
 END IF;
 UPDATE dobby_v7_private.invitations SET accepted_by=u,accepted_at=clock_timestamp() WHERE id=inv.id;
 c:=dobby_socle_private.actor_context(inv.household_id,false);
 IF c->>'phase'<>'active' OR (p_kind='child-account' AND c->>'memberId'<>inv.target_member_id) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Rattachement canonique non confirmé'; END IF;
 PERFORM dobby_socle_private.receipt(u,p_operation_id,operation_kind,req,jsonb_build_object('householdId',inv.household_id,'memberId',c->>'memberId'));
 RETURN c||jsonb_build_object('replayed',false);
END $$;
DROP FUNCTION public.dobby_v7_accept_invitation(text,uuid) RESTRICT;
CREATE FUNCTION public.dobby_v7_accept_invitation(p_token text,p_operation_id uuid) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT dobby_socle_private.accept_invitation(p_token,p_operation_id,'member') $$;
CREATE FUNCTION public.dobby_v7_accept_child_invitation(p_token text,p_operation_id uuid) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT dobby_socle_private.accept_invitation(p_token,p_operation_id,'child-account') $$;
DROP FUNCTION public.dobby_v7_revoke_invitation(uuid) RESTRICT;
CREATE FUNCTION public.dobby_v7_revoke_invitation(p_invitation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c jsonb:=dobby_socle_private.parent_context();
BEGIN
 UPDATE dobby_v7_private.invitations SET revoked_at=coalesce(revoked_at,clock_timestamp())
  WHERE id=p_invitation_id AND household_id=(c->>'householdId')::uuid;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Invitation inaccessible'; END IF;
 RETURN jsonb_build_object('protocol',1,'revoked',true);
END $$;
DROP FUNCTION public.dobby_v7_bind_existing_member(uuid,text,uuid) RESTRICT;
CREATE FUNCTION public.dobby_v7_bind_existing_member(p_user_id uuid,p_member_id text,p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Utiliser une invitation enfant ciblée ; aucun rattachement implicite';
END $$;

CREATE FUNCTION dobby_socle_private.can_read(p_household uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE c jsonb;
BEGIN
 c:=dobby_socle_private.actor_context(p_household,false);
 RETURN c->>'phase'='active' AND c->>'category' IN ('parent','child');
EXCEPTION WHEN insufficient_privilege OR invalid_text_representation THEN RETURN false;
END $$;
-- Legacy V1 has no household column: no invented mapping to a V7 household.
CREATE FUNCTION dobby_socle_private.legacy_unlinked() RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_socle_private.actor();
BEGIN
 RETURN NOT EXISTS(SELECT 1 FROM dobby_v7_private.account_links WHERE user_id=u);
EXCEPTION WHEN insufficient_privilege OR invalid_text_representation THEN RETURN false;
END $$;
CREATE FUNCTION public.dobby_v7_family_capabilities() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE c jsonb; s dobby_socle_private.install_state%ROWTYPE; storage_ready boolean;
BEGIN
 BEGIN c:=dobby_socle_private.actor_context(NULL,false); EXCEPTION WHEN insufficient_privilege THEN c:=jsonb_build_object('phase','anonymous'); END;
 SELECT * INTO s FROM dobby_socle_private.install_state WHERE singleton;
 SELECT count(*)=5 INTO storage_ready FROM pg_policy p
  WHERE p.polrelid=(SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='storage' AND c.relname='objects') AND p.polname IN
  ('dobby_socle_parent_insert','dobby_socle_parent_update','dobby_socle_parent_delete','dobby_socle_canonical_read','dobby_socle_parent_update_allow')
  AND ((p.polname='dobby_socle_parent_update_allow' AND p.polpermissive AND p.polcmd='w') OR
   (p.polname<>'dobby_socle_parent_update_allow' AND NOT p.polpermissive))
  AND p.polroles=ARRAY['authenticated'::regrole::oid];
 RETURN jsonb_build_object('protocol',2,'installed',true,'familyRolesAvailable',s.family_api_enabled,
  'childAccountLinkAvailable',s.family_api_enabled,'familyRolesVerified',s.family_client_verified AND s.storage_client_verified AND storage_ready,
  'childAccountLinkVerified',s.child_link_client_verified AND s.family_client_verified AND s.storage_client_verified AND storage_ready,
  'storagePoliciesPresent',storage_ready,'storagePoliciesVerified',storage_ready AND s.storage_client_verified,'canonicalIdentity',c->>'phase'='active','missionsV3Verified',s.missions_client_verified);
END $$;

-- Existing stamp owner/OID/ACL and its V2/old-V7 branches remain unchanged.
DO $stamp$
DECLARE definition text:=pg_get_functiondef('public.dobby_v2_modules_stamp()'::regprocedure); old_piece text:='ELSIF current_user=''dobby_v7_writer'' THEN';
BEGIN
 IF position(old_piece IN definition)=0 OR position('dobby_socle_writer' IN definition)>0 THEN
  RAISE EXCEPTION 'Stamp inattendu, ne pas remplacer sans revue';
 END IF;
 definition:=replace(definition,old_piece,'ELSIF current_user=''dobby_socle_writer'' THEN'||chr(10)||'    NEW.updated_by := dobby_v7_private.actor();'||chr(10)||'  '||old_piece);
 EXECUTE definition;
END $stamp$;

-- Restrictive policies intersect the existing household membership policies.
-- They never grant a new browser table privilege or alter existing reads.
DO $rls$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['dobby_v2_modules','dobby_v2_grocery','dobby_v2_memberships','dobby_v2_households'] LOOP
  EXECUTE format('CREATE POLICY dobby_socle_parent_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(dobby_socle_private.is_parent(%I))',t,CASE WHEN t='dobby_v2_households' THEN 'id' ELSE 'household_id' END);
  EXECUTE format('CREATE POLICY dobby_socle_parent_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING(dobby_socle_private.is_parent(%I)) WITH CHECK(dobby_socle_private.is_parent(%I))',t,CASE WHEN t='dobby_v2_households' THEN 'id' ELSE 'household_id' END,CASE WHEN t='dobby_v2_households' THEN 'id' ELSE 'household_id' END);
  EXECUTE format('CREATE POLICY dobby_socle_parent_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING(dobby_socle_private.is_parent(%I))',t,CASE WHEN t='dobby_v2_households' THEN 'id' ELSE 'household_id' END);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['dobby_v2_modules','dobby_v2_grocery','dobby_v2_households'] LOOP
  EXECUTE format('CREATE POLICY dobby_socle_canonical_read ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING(dobby_socle_private.can_read(%I))',t,CASE WHEN t='dobby_v2_households' THEN 'id' ELSE 'household_id' END);
 END LOOP;
 IF to_regclass('public.dobby_sync_grocery_items') IS NOT NULL THEN
  CREATE POLICY dobby_socle_legacy_unlinked_read ON public.dobby_sync_grocery_items AS RESTRICTIVE FOR SELECT TO authenticated USING(dobby_socle_private.legacy_unlinked());
  CREATE POLICY dobby_socle_legacy_unlinked_insert ON public.dobby_sync_grocery_items AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(dobby_socle_private.legacy_unlinked());
  CREATE POLICY dobby_socle_legacy_unlinked_update ON public.dobby_sync_grocery_items AS RESTRICTIVE FOR UPDATE TO authenticated USING(dobby_socle_private.legacy_unlinked()) WITH CHECK(dobby_socle_private.legacy_unlinked());
  CREATE POLICY dobby_socle_legacy_unlinked_delete ON public.dobby_sync_grocery_items AS RESTRICTIVE FOR DELETE TO authenticated USING(dobby_socle_private.legacy_unlinked());
 END IF;
END $rls$;

-- Restore explicit ownership/EXECUTE allowlists for every new/replaced function.
GRANT CREATE ON SCHEMA dobby_v7_private TO dobby_socle_writer;
DO $ownership$
DECLARE f record;
BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='dobby_socle_private' OR
   (n.nspname='public' AND p.proname IN ('dobby_v7_context','dobby_v7_update_member','dobby_v7_update_magic','dobby_v7_create_invitation','dobby_v7_preview_invitation','dobby_v7_accept_invitation','dobby_v7_revoke_invitation','dobby_v7_bind_existing_member','dobby_v7_create_child_invitation','dobby_v7_preview_child_invitation','dobby_v7_accept_child_invitation','dobby_v7_family_capabilities')) OR
   (n.nspname='dobby_v7_private' AND p.proname IN ('assert_snapshot','guard_family')) LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO dobby_socle_writer',f.signature);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role,dobby_v7_writer,dobby_missions_v2_writer',f.signature);
 END LOOP;
END $ownership$;
GRANT USAGE ON SCHEMA dobby_socle_private TO authenticated,dobby_v7_writer,dobby_missions_v2_writer;
GRANT EXECUTE ON FUNCTION dobby_socle_private.is_parent(uuid),dobby_socle_private.can_read(uuid),dobby_socle_private.legacy_unlinked() TO authenticated;
GRANT EXECUTE ON FUNCTION dobby_socle_private.actor_context(uuid,boolean) TO dobby_missions_v2_writer;
GRANT EXECUTE ON FUNCTION public.dobby_v7_context() TO authenticated,dobby_v7_writer;
GRANT EXECUTE ON FUNCTION dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dobby_v7_update_member(text,jsonb,bigint,uuid),public.dobby_v7_update_magic(text,jsonb,bigint,uuid),
 public.dobby_v7_create_invitation(integer,uuid),public.dobby_v7_accept_invitation(text,uuid),public.dobby_v7_revoke_invitation(uuid),
 public.dobby_v7_create_child_invitation(text,integer,uuid),public.dobby_v7_accept_child_invitation(text,uuid),public.dobby_v7_family_capabilities() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dobby_v7_preview_invitation(text),public.dobby_v7_preview_child_invitation(text),public.dobby_v7_family_capabilities() TO anon,authenticated;
REVOKE CREATE ON SCHEMA public,dobby_v7_private,dobby_socle_private FROM dobby_socle_writer;
REVOKE dobby_socle_writer FROM postgres GRANTED BY postgres;
DO $closure$
BEGIN
 IF pg_has_role('postgres','dobby_socle_writer','SET') OR pg_has_role('postgres','dobby_socle_writer','USAGE') THEN RAISE EXCEPTION 'Writer encore hérité ou SET : transaction annulée'; END IF;
 IF EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid='dobby_socle_writer'::regrole AND member<>'postgres'::regrole) THEN RAISE EXCEPTION 'Membership writer inattendue'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='dobby_socle_writer' AND (rolcanlogin OR rolbypassrls OR rolsuper OR rolcreaterole)) THEN RAISE EXCEPTION 'Writer non fermé'; END IF;
END $closure$;
NOTIFY pgrst,'reload schema';
COMMIT;
