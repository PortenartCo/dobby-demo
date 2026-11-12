-- DOBBY familial uniquement. À exécuter MANUELLEMENT par l'utilisateur.
-- Projet attendu : dobby-family-sync / pqcdkrwljgvgagzwrcmg.
-- Transaction additive : aucune personne existante n'est liée ou remplacée.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $preflight$
BEGIN
  IF to_regclass('public.dobby_v2_households') IS NULL
     OR to_regclass('public.dobby_v2_memberships') IS NULL
     OR to_regclass('public.dobby_v2_modules') IS NULL THEN
    RAISE EXCEPTION 'Schéma familial V2 absent : ne pas appliquer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.dobby_v2_modules'::regclass
      AND tgname='dobby_missions_v2_guard' AND NOT tgisinternal AND tgenabled='O')
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.dobby_v2_modules'::regclass
      AND tgname='dobby_v2_modules_stamp_trigger' AND NOT tgisinternal AND tgenabled='O') THEN
    RAISE EXCEPTION 'Protections Missions/stamp attendues absentes : diagnostic à refaire';
  END IF;
  IF to_regnamespace('dobby_v7_private') IS NOT NULL
     OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('dobby_v7_writer','dobby_v7_installer_tmp')) THEN
    RAISE EXCEPTION 'Objets V7 déjà présents : utiliser 02-verify.sql, ne pas rejouer aveuglément';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.dobby_v2_memberships'::regclass
      AND conname='dobby_v2_memberships_role_check'
      AND pg_get_constraintdef(oid) LIKE '%owner%member%') THEN
    RAISE EXCEPTION 'Rôles V2 inattendus : diagnostic à refaire';
  END IF;
END $preflight$;

-- PostgreSQL 17 automatically grants creator ADMIN through the bootstrap role;
-- that grant cannot be revoked by a managed non-superuser. Create through a
-- transaction-only role, then drop that role to remove its automatic membership.
DO $installer$
DECLARE installer name:=current_user;
BEGIN
  CREATE ROLE dobby_v7_installer_tmp NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB CREATEROLE NOREPLICATION NOBYPASSRLS;
  EXECUTE format('GRANT dobby_v7_installer_tmp TO %I WITH INHERIT TRUE, SET TRUE',installer);
  SET LOCAL ROLE dobby_v7_installer_tmp;
  CREATE ROLE dobby_v7_writer NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  EXECUTE format('GRANT dobby_v7_writer TO %I WITH ADMIN TRUE, INHERIT TRUE, SET TRUE',installer);
  EXECUTE format('SET LOCAL ROLE %I',installer);
END $installer$;
CREATE SCHEMA dobby_v7_private;
REVOKE ALL ON SCHEMA dobby_v7_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public, auth, dobby_v7_private TO dobby_v7_writer;
GRANT EXECUTE ON FUNCTION auth.uid() TO dobby_v7_writer;
GRANT CREATE ON SCHEMA public,dobby_v7_private TO dobby_v7_writer;

CREATE TABLE dobby_v7_private.pending_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile jsonb NOT NULL CHECK (jsonb_typeof(profile)='object'),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE dobby_v7_private.account_links (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid NOT NULL,
  member_id text NOT NULL CHECK (length(member_id) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (household_id, member_id),
  FOREIGN KEY (household_id,user_id) REFERENCES public.dobby_v2_memberships(household_id,user_id)
);
CREATE TABLE dobby_v7_private.invitations (
  id uuid PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES public.dobby_v2_households(id),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  token_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((accepted_by IS NULL) = (accepted_at IS NULL))
);
CREATE TABLE dobby_v7_private.operations (
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  operation_id uuid NOT NULL,
  kind text NOT NULL,
  request_digest bytea NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(actor_id,operation_id)
);
CREATE TABLE dobby_v7_private.install_secret (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  secret bytea NOT NULL CHECK(octet_length(secret)=32)
);
INSERT INTO dobby_v7_private.install_secret(singleton,secret)
VALUES(true,sha256(convert_to(gen_random_uuid()::text||gen_random_uuid()::text,'UTF8')));

DO $tables$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pending_profiles','account_links','invitations','operations','install_secret'] LOOP
    EXECUTE format('ALTER TABLE dobby_v7_private.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE dobby_v7_private.%I FORCE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON dobby_v7_private.%I FROM PUBLIC,anon,authenticated,service_role',t);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON dobby_v7_private.%I TO dobby_v7_writer',t);
    EXECUTE format('CREATE POLICY v7_writer ON dobby_v7_private.%I TO dobby_v7_writer USING(true) WITH CHECK(true)',t);
  END LOOP;
END $tables$;
-- The NOLOGIN role has no direct grants to browser roles and no Missions policy.
GRANT SELECT,INSERT ON public.dobby_v2_households,public.dobby_v2_memberships TO dobby_v7_writer;
-- PostgreSQL row locks require UPDATE on at least one column; no RPC mutates it.
GRANT UPDATE(active) ON public.dobby_v2_memberships TO dobby_v7_writer;
GRANT SELECT,INSERT,UPDATE ON public.dobby_v2_modules TO dobby_v7_writer;
CREATE POLICY dobby_v7_household_writer ON public.dobby_v2_households TO dobby_v7_writer USING(true) WITH CHECK(true);
CREATE POLICY dobby_v7_membership_writer ON public.dobby_v2_memberships TO dobby_v7_writer USING(true) WITH CHECK(true);
CREATE POLICY dobby_v7_family_writer ON public.dobby_v2_modules TO dobby_v7_writer USING(module='family') WITH CHECK(module='family');

CREATE FUNCTION dobby_v7_private.actor() RETURNS uuid
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE u uuid:=auth.uid();
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Connexion requise'; END IF;
  RETURN u;
END $$;
CREATE FUNCTION dobby_v7_private.lock_actor() RETURNS uuid
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE u uuid:=dobby_v7_private.actor();
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('dobby-v7-account:'||u::text,0));
  RETURN u;
END $$;
CREATE FUNCTION dobby_v7_private.digest(p_value jsonb) RETURNS bytea
LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT sha256(convert_to(p_value::text,'UTF8')) $$;
CREATE FUNCTION dobby_v7_private.operation(p_actor uuid,p_id uuid,p_kind text,p_request jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r dobby_v7_private.operations%ROWTYPE;
BEGIN
  IF p_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Identifiant opération requis'; END IF;
  SELECT * INTO r FROM dobby_v7_private.operations WHERE actor_id=p_actor AND operation_id=p_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF r.kind<>p_kind OR r.request_digest IS DISTINCT FROM dobby_v7_private.digest(p_request) THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Identifiant opération réutilisé avec un contenu différent';
  END IF;
  RETURN r.result;
END $$;
CREATE FUNCTION dobby_v7_private.receipt(p_actor uuid,p_id uuid,p_kind text,p_request jsonb,p_result jsonb) RETURNS void
LANGUAGE sql SET search_path='' AS $$
  INSERT INTO dobby_v7_private.operations(actor_id,operation_id,kind,request_digest,result)
  VALUES(p_actor,p_id,p_kind,dobby_v7_private.digest(p_request),p_result)
$$;
CREATE FUNCTION dobby_v7_private.members(p_payload jsonb) RETURNS jsonb
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
CREATE FUNCTION dobby_v7_private.validate_profile(p_profile jsonb) RETURNS jsonb
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
CREATE FUNCTION dobby_v7_private.patch_profile(p_member jsonb,p_profile jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE p jsonb:=dobby_v7_private.validate_profile(p_profile); m jsonb:=p_member; magic jsonb;
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

CREATE FUNCTION public.dobby_v7_context() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_v7_private.actor(); l dobby_v7_private.account_links%ROWTYPE;
  r text; p jsonb; a jsonb; rev bigint; category text; manage boolean;
BEGIN
  SELECT * INTO l FROM dobby_v7_private.account_links WHERE user_id=u;
  IF FOUND THEN
    SELECT role INTO r FROM public.dobby_v2_memberships WHERE household_id=l.household_id AND user_id=u AND active;
    SELECT payload,revision INTO p,rev FROM public.dobby_v2_modules WHERE household_id=l.household_id AND module='family';
    IF r IS NULL OR p IS NULL THEN RETURN jsonb_build_object('protocol',1,'phase','rejected','userId',u,'reason','inactive_or_missing_binding'); END IF;
    a:=dobby_v7_private.members(p);
    SELECT e INTO p FROM jsonb_array_elements(a) e WHERE e->>'id'=l.member_id;
    IF p IS NULL OR (p->>'memberCategory') IN ('baby','pet') THEN
      RETURN jsonb_build_object('protocol',1,'phase','rejected','userId',u,'reason','inactive_or_missing_binding');
    END IF;
    category:=p->>'memberCategory'; manage:=r='owner' AND category='parent';
    RETURN jsonb_build_object('protocol',1,'phase','active','userId',u,'householdId',l.household_id,
      'memberId',l.member_id,'profile',p,'familyRevision',rev,
      'permissions',jsonb_build_object('canEdit',category='parent','canMagic',category IN ('parent','child'),
        'canCreate',manage,'canManageDependents',manage,'canInvite',manage),
      'pendingCeremony',NOT(coalesce(p->'magicProfile'->>'ceremonyStatus','')='complete' OR
        (coalesce(p->'magicProfile'->>'houseId','') IN ('gryffindor','slytherin','ravenclaw','hufflepuff') AND
         coalesce(p->'magicProfile'->>'patronusId','') IN ('stag','otter','fox','wolf','cat','owl','horse','hare','swan','lynx','badger','dolphin'))));
  END IF;
  IF EXISTS(SELECT 1 FROM public.dobby_v2_memberships WHERE user_id=u AND active) THEN
    RETURN jsonb_build_object('protocol',1,'phase','rejected','userId',u,'reason','existing_member_link_required');
  END IF;
  SELECT profile INTO p FROM dobby_v7_private.pending_profiles WHERE user_id=u;
  RETURN jsonb_build_object('protocol',1,'phase',CASE WHEN p IS NULL THEN 'profile' ELSE 'household' END,'userId',u,'profile',p);
END $$;

CREATE FUNCTION public.dobby_v7_update_profile(p_profile jsonb,p_expected_revision bigint DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_v7_private.lock_actor(); p jsonb:=dobby_v7_private.validate_profile(p_profile);
  c jsonb:=public.dobby_v7_context(); row public.dobby_v2_modules%ROWTYPE; a jsonb; m jsonb;
BEGIN
  IF c->>'phase'='rejected' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Liaison existante à vérifier manuellement'; END IF;
  IF c->>'phase'='active' THEN
    IF c->'permissions'->'canEdit' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Modification du profil refusée'; END IF;
    PERFORM 1 FROM public.dobby_v2_memberships WHERE household_id=(c->>'householdId')::uuid AND user_id=u AND active FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Appartenance inactive'; END IF;
    SELECT * INTO row FROM public.dobby_v2_modules WHERE household_id=(c->>'householdId')::uuid AND module='family' FOR UPDATE;
    IF p_expected_revision IS NULL OR p_expected_revision<1 OR p_expected_revision>9007199254740990 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Révision attendue requise pour un profil lié'; END IF;
    IF row.revision IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Conflit de révision : rechargez le foyer'; END IF;
    a:=dobby_v7_private.members(row.payload);
    SELECT e INTO m FROM jsonb_array_elements(a) e WHERE e->>'id'=c->>'memberId';
    m:=dobby_v7_private.patch_profile(m,p);
    SELECT jsonb_agg(CASE WHEN e->>'id'=c->>'memberId' THEN m ELSE e END ORDER BY n) INTO a FROM jsonb_array_elements(a) WITH ORDINALITY x(e,n);
    UPDATE public.dobby_v2_modules SET payload=jsonb_set(row.payload,'{familyMembers}',a) WHERE household_id=row.household_id AND module='family';
  ELSE
    INSERT INTO dobby_v7_private.pending_profiles(user_id,profile) VALUES(u,p)
    ON CONFLICT(user_id) DO UPDATE SET profile=excluded.profile,updated_at=clock_timestamp();
  END IF;
  RETURN public.dobby_v7_context();
END $$;

CREATE FUNCTION dobby_v7_private.add_pending_member(p_actor uuid,p_household uuid) RETURNS text
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE p jsonb; m jsonb; a jsonb; row public.dobby_v2_modules%ROWTYPE; id text:='member-'||gen_random_uuid()::text;
BEGIN
  SELECT profile INTO p FROM dobby_v7_private.pending_profiles WHERE user_id=p_actor FOR UPDATE;
  IF p IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Profil personnel requis'; END IF;
  SELECT * INTO row FROM public.dobby_v2_modules WHERE household_id=p_household AND module='family' FOR UPDATE;
  IF row.household_id IS NULL THEN
    INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES(p_household,'family','{}') RETURNING * INTO row;
  END IF;
  a:=dobby_v7_private.members(row.payload);
  m:=dobby_v7_private.patch_profile(jsonb_build_object('id',id,'memberCategory','parent'),p);
  UPDATE public.dobby_v2_modules SET payload=jsonb_set(row.payload,'{familyMembers}',a||jsonb_build_array(m))
  WHERE household_id=p_household AND module='family';
  INSERT INTO dobby_v7_private.account_links(user_id,household_id,member_id) VALUES(p_actor,p_household,id);
  DELETE FROM dobby_v7_private.pending_profiles WHERE user_id=p_actor;
  RETURN id;
END $$;
CREATE FUNCTION public.dobby_v7_create_household(p_name text,p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_v7_private.lock_actor(); name text:=btrim(p_name); req jsonb:=jsonb_build_object('name',name);
  prior jsonb; h uuid:=gen_random_uuid(); c jsonb;
BEGIN
  IF name IS NULL OR length(name) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Nom de foyer requis'; END IF;
  prior:=dobby_v7_private.operation(u,p_operation_id,'create_household',req);
  c:=public.dobby_v7_context();
  IF prior IS NOT NULL THEN
    IF c->>'phase'<>'active' OR c->>'householdId'<>prior->>'householdId' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Appartenance initiale devenue indisponible'; END IF;
    RETURN c||jsonb_build_object('replayed',true);
  END IF;
  IF c->>'phase'<>'household' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Profil sans foyer et sans liaison existante requis'; END IF;
  INSERT INTO public.dobby_v2_households(id,name) VALUES(h,name);
  INSERT INTO public.dobby_v2_memberships(household_id,user_id,role) VALUES(h,u,'owner');
  PERFORM dobby_v7_private.add_pending_member(u,h);
  c:=public.dobby_v7_context();
  PERFORM dobby_v7_private.receipt(u,p_operation_id,'create_household',req,jsonb_build_object('householdId',h));
  RETURN c||jsonb_build_object('replayed',false);
END $$;

CREATE FUNCTION dobby_v7_private.owner_context() RETURNS jsonb
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c jsonb:=public.dobby_v7_context();
BEGIN
  IF c->>'phase'<>'active' OR c->'permissions'->'canInvite' IS DISTINCT FROM 'true'::jsonb THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Propriétaire parent vérifié requis';
  END IF;
  PERFORM 1 FROM public.dobby_v2_memberships WHERE household_id=(c->>'householdId')::uuid
    AND user_id=dobby_v7_private.actor() AND active AND role='owner' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Propriétaire actif requis'; END IF;
  RETURN c;
END $$;
CREATE FUNCTION dobby_v7_private.invitation_token(p_actor uuid,p_id uuid) RETURNS text
LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT encode(sha256(secret||sha256(convert_to(p_actor::text||':'||p_id::text,'UTF8'))),'hex')
  FROM dobby_v7_private.install_secret WHERE singleton
$$;
CREATE FUNCTION public.dobby_v7_create_invitation(p_expires_in_hours integer,p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_v7_private.lock_actor(); c jsonb:=dobby_v7_private.owner_context();
  req jsonb:=jsonb_build_object('hours',p_expires_in_hours,'householdId',c->>'householdId'); prior jsonb;
  token text; inv dobby_v7_private.invitations%ROWTYPE; name text;
BEGIN
  IF p_expires_in_hours IS NULL OR p_expires_in_hours NOT BETWEEN 1 AND 720 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Durée invitation entre 1 et 720 heures'; END IF;
  prior:=dobby_v7_private.operation(u,p_operation_id,'create_invitation',req);
  token:=dobby_v7_private.invitation_token(u,p_operation_id);
  IF prior IS NULL THEN
    INSERT INTO dobby_v7_private.invitations(id,household_id,created_by,token_hash,expires_at)
    VALUES(p_operation_id,(c->>'householdId')::uuid,u,sha256(convert_to(token,'UTF8')),clock_timestamp()+make_interval(hours=>p_expires_in_hours)) RETURNING * INTO inv;
    PERFORM dobby_v7_private.receipt(u,p_operation_id,'create_invitation',req,jsonb_build_object('invitationId',inv.id));
  ELSE SELECT * INTO inv FROM dobby_v7_private.invitations WHERE id=p_operation_id; END IF;
  SELECT h.name INTO name FROM public.dobby_v2_households h WHERE h.id=inv.household_id;
  RETURN jsonb_build_object('protocol',1,'invitationId',inv.id,'token',token,'expiresAt',inv.expires_at,
    'household',jsonb_build_object('id',inv.household_id,'name',name),
    'inviter',jsonb_build_object('name',c->'profile'->>'name'),'replayed',prior IS NOT NULL);
END $$;
CREATE FUNCTION public.dobby_v7_preview_invitation(p_token text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE inv dobby_v7_private.invitations%ROWTYPE; name text; inviter text;
BEGIN
  IF p_token IS NULL OR p_token!~'^[0-9a-f]{64}$' THEN RETURN jsonb_build_object('status','invalid'); END IF;
  SELECT * INTO inv FROM dobby_v7_private.invitations WHERE token_hash=sha256(convert_to(p_token,'UTF8'));
  IF NOT FOUND OR inv.revoked_at IS NOT NULL OR inv.accepted_by IS NOT NULL THEN RETURN jsonb_build_object('status','invalid'); END IF;
  IF NOT EXISTS(SELECT 1 FROM public.dobby_v2_memberships WHERE household_id=inv.household_id AND user_id=inv.created_by AND active AND role='owner') THEN RETURN jsonb_build_object('status','invalid'); END IF;
  IF inv.expires_at<=statement_timestamp() THEN RETURN jsonb_build_object('status','expired'); END IF;
  SELECT h.name INTO name FROM public.dobby_v2_households h WHERE h.id=inv.household_id;
  SELECT e->>'name' INTO inviter FROM dobby_v7_private.account_links l
    JOIN public.dobby_v2_modules m ON m.household_id=l.household_id AND m.module='family'
    CROSS JOIN LATERAL jsonb_array_elements(dobby_v7_private.members(m.payload)) e
    WHERE l.user_id=inv.created_by AND l.household_id=inv.household_id AND e->>'id'=l.member_id;
  IF name IS NULL OR coalesce(inviter,'')='' THEN RETURN jsonb_build_object('status','invalid'); END IF;
  RETURN jsonb_build_object('status','valid','household',jsonb_build_object('id',inv.household_id,'name',name),'inviter',jsonb_build_object('name',inviter),'expiresAt',inv.expires_at);
END $$;
CREATE FUNCTION public.dobby_v7_accept_invitation(p_token text,p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_v7_private.lock_actor(); inv dobby_v7_private.invitations%ROWTYPE;
  req jsonb:=jsonb_build_object('tokenHash',encode(sha256(convert_to(coalesce(p_token,''),'UTF8')),'hex'));
  prior jsonb; c jsonb;
BEGIN
  prior:=dobby_v7_private.operation(u,p_operation_id,'accept_invitation',req);
  c:=public.dobby_v7_context();
  IF prior IS NOT NULL THEN
    IF c->>'phase'<>'active' OR c->>'householdId'<>prior->>'householdId' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Appartenance acceptée devenue indisponible'; END IF;
    RETURN c||jsonb_build_object('replayed',true);
  END IF;
  IF p_token IS NULL OR p_token!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invitation invalide'; END IF;
  SELECT * INTO inv FROM dobby_v7_private.invitations WHERE token_hash=sha256(convert_to(p_token,'UTF8')) FOR UPDATE;
  IF NOT FOUND OR inv.revoked_at IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invitation invalide'; END IF;
  IF inv.accepted_by=u AND c->>'phase'='active' AND c->>'householdId'=inv.household_id::text THEN
    PERFORM dobby_v7_private.receipt(u,p_operation_id,'accept_invitation',req,jsonb_build_object('householdId',inv.household_id));
    RETURN c||jsonb_build_object('replayed',true);
  END IF;
  IF inv.accepted_by IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invitation déjà utilisée'; END IF;
  IF inv.expires_at<=clock_timestamp() THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invitation expirée'; END IF;
  PERFORM 1 FROM public.dobby_v2_memberships WHERE household_id=inv.household_id AND user_id=inv.created_by AND active AND role='owner' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Invitant non autorisé'; END IF;
  IF c->>'phase'<>'household' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Un compte déjà membre doit être lié explicitement, sans duplication'; END IF;
  INSERT INTO public.dobby_v2_memberships(household_id,user_id,role) VALUES(inv.household_id,u,'member');
  PERFORM dobby_v7_private.add_pending_member(u,inv.household_id);
  UPDATE dobby_v7_private.invitations SET accepted_by=u,accepted_at=clock_timestamp() WHERE id=inv.id;
  PERFORM dobby_v7_private.receipt(u,p_operation_id,'accept_invitation',req,jsonb_build_object('householdId',inv.household_id));
  RETURN public.dobby_v7_context()||jsonb_build_object('replayed',false);
END $$;
CREATE FUNCTION public.dobby_v7_revoke_invitation(p_invitation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_v7_private.lock_actor(); c jsonb:=dobby_v7_private.owner_context();
BEGIN
  UPDATE dobby_v7_private.invitations SET revoked_at=coalesce(revoked_at,clock_timestamp())
  WHERE id=p_invitation_id AND household_id=(c->>'householdId')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Invitation non accessible'; END IF;
  RETURN jsonb_build_object('protocol',1,'revoked',true);
END $$;

-- Existing native people are bound only by an explicit owner-selected native ID.
-- Initial legacy owner bootstrapping is a separate manual SQL step in README.md.
CREATE FUNCTION public.dobby_v7_bind_existing_member(p_user_id uuid,p_member_id text,p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_v7_private.lock_actor(); c jsonb:=dobby_v7_private.owner_context();
  req jsonb:=jsonb_build_object('userId',p_user_id,'memberId',p_member_id,'householdId',c->>'householdId');
  p jsonb; prior jsonb;
BEGIN
  prior:=dobby_v7_private.operation(u,p_operation_id,'bind_existing_member',req);
  IF prior IS NOT NULL THEN RETURN prior||jsonb_build_object('replayed',true); END IF;
  PERFORM 1 FROM public.dobby_v2_memberships WHERE household_id=(c->>'householdId')::uuid AND user_id=p_user_id AND active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Compte cible non membre actif du foyer'; END IF;
  IF EXISTS(SELECT 1 FROM public.dobby_v2_memberships WHERE user_id=p_user_id AND active AND household_id<>(c->>'householdId')::uuid) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Compte multi-foyers : liaison à examiner'; END IF;
  SELECT payload INTO p FROM public.dobby_v2_modules WHERE household_id=(c->>'householdId')::uuid AND module='family' FOR UPDATE;
  SELECT e INTO p FROM jsonb_array_elements(dobby_v7_private.members(p)) e WHERE e->>'id'=p_member_id;
  IF p IS NULL OR coalesce(p->>'memberCategory','') NOT IN ('parent','child') THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Membre natif admissible absent'; END IF;
  INSERT INTO dobby_v7_private.account_links(user_id,household_id,member_id) VALUES(p_user_id,(c->>'householdId')::uuid,p_member_id);
  DELETE FROM dobby_v7_private.pending_profiles WHERE user_id=p_user_id;
  prior:=jsonb_build_object('protocol',1,'memberId',p_member_id,'userId',p_user_id,'householdId',c->>'householdId');
  PERFORM dobby_v7_private.receipt(u,p_operation_id,'bind_existing_member',req,prior);
  RETURN prior||jsonb_build_object('replayed',false);
END $$;

CREATE FUNCTION dobby_v7_private.assert_snapshot(p_household uuid,p_old jsonb,p_new jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_v7_private.actor(); a jsonb:=dobby_v7_private.members(p_old);
  b jsonb:=dobby_v7_private.members(p_new); x jsonb; y jsonb; role text; l record;
BEGIN
  IF a=b THEN RETURN; END IF;
  SELECT m.role INTO role FROM public.dobby_v2_memberships m WHERE household_id=p_household AND user_id=u AND active FOR SHARE;
  IF role IS DISTINCT FROM 'owner' OR NOT EXISTS(
    SELECT 1 FROM dobby_v7_private.account_links link, jsonb_array_elements(a) member
    WHERE link.user_id=u AND link.household_id=p_household
      AND member->>'id'=link.member_id AND member->>'memberCategory'='parent') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Membres : écriture serveur ou propriétaire vérifié requis'; END IF;
  FOR l IN SELECT member_id FROM dobby_v7_private.account_links WHERE household_id=p_household LOOP
    SELECT e INTO x FROM jsonb_array_elements(a) e WHERE e->>'id'=l.member_id;
    SELECT e INTO y FROM jsonb_array_elements(b) e WHERE e->>'id'=l.member_id;
    IF x IS DISTINCT FROM y THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Profil lié protégé : utilisez le writer V7, rechargez le foyer'; END IF;
  END LOOP;
  -- Raw snapshots can manage unbound dependents, never create/change an adult.
  FOR x IN SELECT e FROM jsonb_array_elements(a) e WHERE coalesce(e->>'memberCategory','') NOT IN ('baby','child','pet') LOOP
    SELECT e INTO y FROM jsonb_array_elements(b) e WHERE e->>'id'=x->>'id';
    IF x IS DISTINCT FROM y THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Autre adulte ou profil historique protégé'; END IF;
  END LOOP;
  FOR y IN SELECT e FROM jsonb_array_elements(b) e LOOP
    SELECT e INTO x FROM jsonb_array_elements(a) e WHERE e->>'id'=y->>'id';
    IF x IS NULL AND coalesce(y->>'memberCategory','') NOT IN ('baby','child','pet') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Les comptes rejoignent par invitation'; END IF;
    IF x IS NOT NULL AND x->>'memberCategory' IS DISTINCT FROM y->>'memberCategory' AND y->>'memberCategory'='parent' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Promotion parentale interdite'; END IF;
  END LOOP;
END $$;
CREATE FUNCTION dobby_v7_private.guard_family() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF coalesce(NEW.module,OLD.module)<>'family' THEN RETURN coalesce(NEW,OLD); END IF;
  IF current_user='dobby_v7_writer' OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolsuper) THEN RETURN coalesce(NEW,OLD); END IF;
  IF TG_OP='DELETE' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Suppression du module familial interdite'; END IF;
  PERFORM dobby_v7_private.assert_snapshot(NEW.household_id,CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE OLD.payload END,NEW.payload);
  RETURN NEW;
END $$;
GRANT USAGE ON SCHEMA dobby_v7_private TO authenticated;
GRANT EXECUTE ON FUNCTION dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb) TO authenticated;
CREATE TRIGGER dobby_v7_family_guard BEFORE INSERT OR UPDATE OR DELETE ON public.dobby_v2_modules
FOR EACH ROW EXECUTE FUNCTION dobby_v7_private.guard_family();

-- Own / explicitly authorized dependent magic; never replaces a full snapshot.
CREATE FUNCTION public.dobby_v7_update_magic(p_member_id text,p_values jsonb,p_expected_revision bigint,p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_v7_private.lock_actor(); c jsonb:=public.dobby_v7_context();
  req jsonb:=jsonb_build_object('memberId',p_member_id,'values',p_values,'revision',p_expected_revision);
  prior jsonb; row public.dobby_v2_modules%ROWTYPE; a jsonb; m jsonb; magic jsonb; k text; v text; kind text; idkey text; sourcekey text; algorithmkey text;
BEGIN
  IF c->>'phase'<>'active' OR c->'permissions'->'canMagic' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Identité magique vérifiée requise'; END IF;
  PERFORM 1 FROM public.dobby_v2_memberships WHERE household_id=(c->>'householdId')::uuid AND user_id=u AND active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Appartenance inactive'; END IF;
  prior:=dobby_v7_private.operation(u,p_operation_id,'update_magic',req);
  IF prior IS NOT NULL THEN RETURN jsonb_build_object('protocol',1,'replayed',true,'context',public.dobby_v7_context()); END IF;
  IF p_expected_revision IS NULL OR p_expected_revision<1 OR p_expected_revision>9007199254740990 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Révision attendue invalide'; END IF;
  IF jsonb_typeof(p_values) IS DISTINCT FROM 'object' OR p_values='{}'::jsonb OR octet_length(p_values::text)>4096 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Choix magique invalide'; END IF;
  FOR k IN SELECT jsonb_object_keys(p_values) LOOP
    IF k NOT IN ('magicHouseId','magicHouseAlgorithm','magicPatronusId','magicPatronusAlgorithm','magicCeremony') OR jsonb_typeof(p_values->k)<>'string' THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Champ magique interdit'; END IF;
  END LOOP;
  SELECT * INTO row FROM public.dobby_v2_modules WHERE household_id=(c->>'householdId')::uuid AND module='family' FOR UPDATE;
  IF row.revision<>p_expected_revision THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Conflit de révision Famille : rechargez sans écraser'; END IF;
  a:=dobby_v7_private.members(row.payload);
  SELECT e INTO m FROM jsonb_array_elements(a) e WHERE e->>'id'=p_member_id;
  IF m IS NULL OR (p_member_id<>c->>'memberId' AND (c->'permissions'->'canManageDependents' IS DISTINCT FROM 'true'::jsonb OR coalesce(m->>'memberCategory','') NOT IN ('baby','child','pet') OR EXISTS(SELECT 1 FROM dobby_v7_private.account_links WHERE household_id=row.household_id AND member_id=p_member_id))) THEN
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
  PERFORM dobby_v7_private.receipt(u,p_operation_id,'update_magic',req,jsonb_build_object('revision',row.revision));
  RETURN jsonb_build_object('protocol',1,'replayed',false,'context',public.dobby_v7_context(),'module',jsonb_build_object('module','family','payload',row.payload,'revision',row.revision,'updated_at',row.updated_at));
END $$;

CREATE FUNCTION public.dobby_v7_update_member(p_member_id text,p_values jsonb,p_expected_revision bigint,p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=dobby_v7_private.lock_actor(); c jsonb:=public.dobby_v7_context();
  req jsonb:=jsonb_build_object('memberId',p_member_id,'values',p_values,'revision',p_expected_revision);
  prior jsonb; row public.dobby_v2_modules%ROWTYPE; a jsonb; m jsonb; p jsonb; magic jsonb;
  k text; v text; first_name text; last_name text; d date; structured boolean;
BEGIN
  IF c->>'phase'<>'active' OR c->'permissions'->'canEdit' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Modification du membre refusée'; END IF;
  PERFORM 1 FROM public.dobby_v2_memberships WHERE household_id=(c->>'householdId')::uuid AND user_id=u AND active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Appartenance inactive'; END IF;
  prior:=dobby_v7_private.operation(u,p_operation_id,'update_member',req);
  IF prior IS NOT NULL THEN RETURN jsonb_build_object('protocol',1,'replayed',true,'context',public.dobby_v7_context()); END IF;
  IF p_expected_revision IS NULL OR p_expected_revision<1 OR p_expected_revision>9007199254740990 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Révision attendue invalide'; END IF;
  IF jsonb_typeof(p_values) IS DISTINCT FROM 'object' OR p_values='{}'::jsonb OR octet_length(p_values::text)>16384 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Champs membre invalides'; END IF;
  FOR k IN SELECT jsonb_object_keys(p_values) LOOP
    IF k NOT IN ('name','firstName','lastName','profileFirstName','profileLastName','birthdate','avatar','magicAvatarId','nickname','notes','species','memberCategory','clearBirthdate') OR jsonb_typeof(p_values->k)<>'string' THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Champ membre non autorisé'; END IF;
  END LOOP;
  SELECT * INTO row FROM public.dobby_v2_modules WHERE household_id=(c->>'householdId')::uuid AND module='family' FOR UPDATE;
  IF row.revision<>p_expected_revision THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Conflit de révision Famille : rechargez sans écraser'; END IF;
  a:=dobby_v7_private.members(row.payload);
  SELECT e INTO m FROM jsonb_array_elements(a) e WHERE e->>'id'=p_member_id;
  IF m IS NULL OR (p_member_id<>c->>'memberId' AND (c->'permissions'->'canManageDependents' IS DISTINCT FROM 'true'::jsonb OR coalesce(m->>'memberCategory','') NOT IN ('baby','child','pet') OR EXISTS(SELECT 1 FROM dobby_v7_private.account_links WHERE household_id=row.household_id AND member_id=p_member_id))) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Seul votre profil ou un dépendant non lié est modifiable'; END IF;
  IF (p_values?'firstName' AND p_values?'profileFirstName' AND p_values->>'firstName'<>p_values->>'profileFirstName') OR
     (p_values?'lastName' AND p_values?'profileLastName' AND p_values->>'lastName'<>p_values->>'profileLastName') THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Identité contradictoire'; END IF;
  structured:=p_values ?| ARRAY['firstName','lastName','profileFirstName','profileLastName'];
  IF structured THEN
    first_name:=coalesce(p_values->>'firstName',p_values->>'profileFirstName',m->>'firstName','');
    last_name:=coalesce(p_values->>'lastName',p_values->>'profileLastName',m->>'lastName','');
    p:=dobby_v7_private.validate_profile(jsonb_build_object('firstName',first_name,'lastName',last_name));
    m:=dobby_v7_private.patch_profile(m,p);
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
    v:=p_values->>'magicAvatarId';
    IF v<>'' AND v!~'^portrait-([1-9]|1[0-9]|2[0-4])$' THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Portrait inconnu'; END IF;
    magic:=coalesce(m->'magicProfile','{"version":1}'::jsonb);
    IF jsonb_typeof(magic)<>'object' OR magic->'version' IS DISTINCT FROM '1'::jsonb THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Version magique inconnue conservée'; END IF;
    m:=jsonb_set(m,'{magicProfile}',magic||jsonb_build_object('avatarId',v));
  END IF;
  SELECT jsonb_agg(CASE WHEN e->>'id'=p_member_id THEN m ELSE e END ORDER BY n) INTO a FROM jsonb_array_elements(a) WITH ORDINALITY x(e,n);
  UPDATE public.dobby_v2_modules SET payload=jsonb_set(row.payload,'{familyMembers}',a) WHERE household_id=row.household_id AND module='family' RETURNING * INTO row;
  PERFORM dobby_v7_private.receipt(u,p_operation_id,'update_member',req,jsonb_build_object('revision',row.revision));
  RETURN jsonb_build_object('protocol',1,'replayed',false,'context',public.dobby_v7_context(),'module',jsonb_build_object('module','family','payload',row.payload,'revision',row.revision,'updated_at',row.updated_at));
END $$;

-- Minimal manual maintenance capabilities; EXECUTE belongs only to the installer.
-- The closed writer remains ungranted after installation. Clients cannot call these.
CREATE FUNCTION dobby_v7_private.link_existing_owner(selected_user uuid,selected_household uuid,selected_member text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p jsonb; prior dobby_v7_private.account_links%ROWTYPE;
BEGIN
  IF selected_user IS NULL OR selected_household IS NULL OR coalesce(selected_member,'')='' THEN
    RAISE EXCEPTION 'Renseigner explicitement les trois identifiants vérifiés';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('dobby-v7-account:'||selected_user::text,0));
  PERFORM 1 FROM public.dobby_v2_memberships WHERE household_id=selected_household
    AND user_id=selected_user AND active AND role='owner' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ce compte n''est pas propriétaire actif de ce foyer'; END IF;
  IF (SELECT count(*) FROM public.dobby_v2_memberships WHERE user_id=selected_user AND active)<>1 THEN
    RAISE EXCEPTION 'Compte multi-foyers : examen explicite nécessaire';
  END IF;
  SELECT payload INTO p FROM public.dobby_v2_modules WHERE household_id=selected_household AND module='family' FOR UPDATE;
  SELECT e INTO p FROM jsonb_array_elements(dobby_v7_private.members(p)) e WHERE e->>'id'=selected_member;
  IF p IS NULL OR p->>'memberCategory' IS DISTINCT FROM 'parent' THEN RAISE EXCEPTION 'Profil natif parent exact absent'; END IF;
  SELECT * INTO prior FROM dobby_v7_private.account_links WHERE user_id=selected_user;
  IF FOUND THEN
    IF prior.household_id IS DISTINCT FROM selected_household OR prior.member_id IS DISTINCT FROM selected_member THEN
      RAISE EXCEPTION 'Une autre liaison existe : aucune réaffectation automatique';
    END IF;
  ELSE
    INSERT INTO dobby_v7_private.account_links(user_id,household_id,member_id)
      VALUES(selected_user,selected_household,selected_member);
  END IF;
  DELETE FROM dobby_v7_private.pending_profiles WHERE user_id=selected_user;
END $$;
CREATE FUNCTION dobby_v7_private.verification_counts() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT jsonb_build_object('bindings',(SELECT count(*) FROM dobby_v7_private.account_links),
    'pendingProfiles',(SELECT count(*) FROM dobby_v7_private.pending_profiles),
    'invitations',(SELECT count(*) FROM dobby_v7_private.invitations))
$$;

-- Every definer is the dedicated NOLOGIN/NOBYPASSRLS writer, never postgres.
-- Explicit EXECUTE allowlist; no default PUBLIC callable helper or secret API.
DO $ownership$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='dobby_v7_private' OR (n.nspname='public' AND p.proname LIKE 'dobby_v7_%') LOOP
    EXECUTE format('ALTER FUNCTION %s OWNER TO dobby_v7_writer',f.signature);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.signature);
  END LOOP;
END $ownership$;
-- Altering a function owner requires the new owner to have schema CREATE.
-- No CREATE capability remains after migration.
REVOKE CREATE ON SCHEMA public,dobby_v7_private FROM dobby_v7_writer;
GRANT EXECUTE ON FUNCTION dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dobby_v7_context(),public.dobby_v7_update_profile(jsonb,bigint),
  public.dobby_v7_create_household(text,uuid),public.dobby_v7_create_invitation(integer,uuid),
  public.dobby_v7_accept_invitation(text,uuid),public.dobby_v7_revoke_invitation(uuid),
  public.dobby_v7_bind_existing_member(uuid,text,uuid),public.dobby_v7_update_magic(text,jsonb,bigint,uuid),
  public.dobby_v7_update_member(text,jsonb,bigint,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dobby_v7_preview_invitation(text) TO anon,authenticated;
DO $close_installer$ BEGIN
  EXECUTE format('GRANT EXECUTE ON FUNCTION dobby_v7_private.link_existing_owner(uuid,uuid,text),dobby_v7_private.verification_counts() TO %I',current_user);
  EXECUTE format('REVOKE dobby_v7_writer FROM %I GRANTED BY dobby_v7_installer_tmp',current_user);
  DROP ROLE dobby_v7_installer_tmp;
END $close_installer$;
NOTIFY pgrst,'reload schema';
COMMIT;
