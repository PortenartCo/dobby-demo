-- DOBBY Runes V2: repair 42501 "permission denied for schema auth".
-- MANUAL SQL EDITOR ONLY. The V2 migration must ALREADY be installed.
-- No initial migration replay, table/data rewrite or auth-schema grant.
-- Source: 0a8e1ed674bc4abdbfaca29435fa495b19b32df4 (tested code 3ceb14b).
-- Official cause/method: https://supabase.com/kb/troubleshooting/permission-errors-when-granting-custom-roles-access-to-the-auth-schema-9e32e7
-- Full patch: this file is standalone, including both RPC definitions.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SET LOCAL search_path='';

-- Refuse an unexpected installation before replacing any definition. Function
-- Body hashes normalize CRLF to LF only. Spaces, lone CR, blank lines and all
-- other bytes remain significant. Only the listed reviewed bodies are accepted.
DO $preflight$
DECLARE item record; fn record; writer oid;
BEGIN
 SELECT oid INTO writer FROM pg_catalog.pg_roles WHERE rolname='dobby_missions_v2_writer';
 IF writer IS NULL OR EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE oid=writer AND
   (rolcanlogin OR rolinherit OR rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication)) THEN
  RAISE EXCEPTION 'Missing or unsafe Missions V2 writer; no change applied';
 END IF;
 IF pg_catalog.pg_has_role('authenticated','dobby_missions_v2_writer','MEMBER')
 OR pg_catalog.pg_has_role('anon','dobby_missions_v2_writer','MEMBER')
 OR pg_catalog.pg_has_role('dobby_missions_v2_writer','authenticated','MEMBER')
 OR pg_catalog.pg_has_role('dobby_missions_v2_writer','anon','MEMBER') THEN
  RAISE EXCEPTION 'Unexpected client/writer role membership; no change applied';
 END IF;
 IF NOT pg_catalog.has_schema_privilege(writer,'dobby_runes_private','USAGE') THEN
  RAISE EXCEPTION 'Existing private-schema grant missing; review the installed V2 migration';
 END IF;
 FOR item IN SELECT * FROM (VALUES ('public.dobby_v2_modules'),('public.dobby_v2_memberships'),('dobby_runes_private.operations')) AS t(name) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass(item.name) AND relrowsecurity AND relowner<>writer) THEN
   RAISE EXCEPTION 'Missing RLS table or unsafe writer ownership: %',item.name;
  END IF;
 END LOOP;
 -- A pre-existing helper must already be this private reviewed implementation.
 SELECT * INTO fn FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure('dobby_runes_private.request_user_id()');
 IF FOUND AND (fn.prosecdef OR fn.provolatile<>'s'
   OR fn.proconfig IS DISTINCT FROM ARRAY['search_path=""']::text[]
   OR fn.proowner IN(writer,'anon'::regrole,'authenticated'::regrole)
   OR pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.replace(fn.prosrc,E'\r\n',E'\n'),'UTF8')),'hex')<>'f78ddf35693e99f233fcd4edc4e60c2b6a4b586fc7ce2c6c4c81d85eec236321'
   OR EXISTS(SELECT 1 FROM pg_catalog.aclexplode(COALESCE(fn.proacl,pg_catalog.acldefault('f',fn.proowner))) a
      WHERE a.privilege_type='EXECUTE' AND a.grantee NOT IN(fn.proowner,writer))) THEN
  RAISE EXCEPTION 'Existing private claims helper differs in body, owner, attributes or ACL; no change applied';
 END IF;
 FOR item IN SELECT * FROM (VALUES
    ('public.dobby_missions_v2_capabilities(uuid)',ARRAY['84a1f4924bf0babe881ba85a6afb6e0937e0f0d8b1cf1da33b3c2a40905c0b04','be80e28dc03e10ab05615c1fe757c94e606f3128bcc7c14fb1154eeec1d8a02d'],true,true,'s'),
    ('public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)',ARRAY['729e7c32d25513c16ce45153b5c5182d8cf5a9be926ed94e3ae90b8cbd751506','9ab7c1c9bf752900c9433bf6759b57e296139e8b33508309bfec166d99802f45'],true,true,'v'),
    ('dobby_runes_private.lock_active_membership(uuid)',ARRAY['24ab842834f5eef542060483dcda4bcf832658680bfbb9035e3b56dbd38f617a','7f66b4569a016e65db7c504b3441ebd2f7af1219d3ff3a7f003776e4b623a1ff'],false,true,'v'),
    -- One exact installed original stamp variant, supplied and verified by the
    -- user. Its different whitespace is pinned, never generally normalized.
    ('public.dobby_v2_modules_stamp()',ARRAY['95c9c80b4b8a1e85d5c13286b841b2a03143ada42c290a6e67ac3b936b7bac6c','fd9faf1d37bf06f04cacae23a20a6010be9ed9fa1806abca3f4e2d84c8e5a312','66ebec0137d31429243d4ae6bafa21788cef3c2315e18059acb5e1f44744c4d0'],false,false,'v')
 ) AS t(signature,accepted_body_sha256,writer_owned,definer,volatility) LOOP
  SELECT * INTO fn FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure(item.signature);
  IF NOT FOUND THEN RAISE EXCEPTION 'Installed V2 function missing: %',item.signature; END IF;
  IF fn.prosecdef<>item.definer OR fn.provolatile::text<>item.volatility
   OR fn.proconfig IS DISTINCT FROM ARRAY['search_path=""']::text[]
   OR (item.writer_owned AND fn.proowner<>writer)
   OR (NOT item.writer_owned AND fn.proowner IN(writer,'anon'::regrole,'authenticated'::regrole))
   OR NOT (pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.replace(fn.prosrc,E'\r\n',E'\n'),'UTF8')),'hex')=ANY(item.accepted_body_sha256)) THEN
   RAISE EXCEPTION 'Installed function differs from the reviewed original/fix: %. Stop for review; no change applied.',item.signature;
  END IF;
 END LOOP;
 FOR item IN SELECT * FROM (VALUES
    ('dobby_missions_writer_membership','public.dobby_v2_memberships','r','89adf38a9f44b9334146b22e482499a74fa1651de8f0f38133d869e96c70ad3d','315299e8806b85596347f0496c2171b16adcf8f2f7299c047993dc825059c7e2'),
    ('dobby_missions_writer_module_read','public.dobby_v2_modules','r','036f2e07869d787c8438ead1c4c95e09d9d8915457ede459f3f5e4b16e7cb401','563cbe56f7932a9fb3bd8edd12fb8eb8245a2dcfa259fde4d481df3b5703ad17'),
    ('dobby_missions_writer_module_insert','public.dobby_v2_modules','a','3b3601747cbeb677ed98b8036edc0426a1fd010a6d15bb409662d7d1feb349fe','52f6b4ec2b0609bb9cc544844d05d22aab52ba6d2365658feabb9ee652d6085b'),
    ('dobby_missions_writer_module_update','public.dobby_v2_modules','w','dfa49f711ed23888976f3926905e8296db557ae8b9338b543bf4f1bd75ab75ae','3d3ee2fce900dd82ac8e20afeb7e823f8d10ff7cc412e32efe152d1134d30a7d'),
    ('dobby_missions_receipt_read','dobby_runes_private.operations','r','da08669b1f509b1888a0affa6159784fa197db1622a5edd9bc0a342cd1dea5e0','188a20e05d6ff46869f190b610309f0c6e4cf7201caf903c96ae84f5b879d174'),
    ('dobby_missions_receipt_insert','dobby_runes_private.operations','a','220f8f440d8118183826241c8306a7cb026fedeaf8988c0b7444d0f68d6f73aa','42b88968479119dede6f8d30263fd37c7103cedfae6c96784ad9a445c032a6bf')
 ) AS t(name,relation,command,original_sha,fixed_sha) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polname=item.name
    AND polrelid=pg_catalog.to_regclass(item.relation) AND polcmd::text=item.command
    AND polpermissive AND polroles=ARRAY[writer]
    AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.jsonb_build_array(
      pg_catalog.pg_get_expr(polqual,polrelid),pg_catalog.pg_get_expr(polwithcheck,polrelid))::text,'UTF8')),'hex') IN(item.original_sha,item.fixed_sha)) THEN
   RAISE EXCEPTION 'Expected writer-only policy missing or changed: %',item.name;
  END IF;
 END LOOP;
END;
$preflight$;

-- Read only PostgREST-verified request JWT claims; no auth schema dependency.
CREATE OR REPLACE FUNCTION dobby_runes_private.request_user_id()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=''
AS $$
DECLARE claims jsonb;
BEGIN
 claims:=NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb;
 IF pg_catalog.jsonb_typeof(claims->'sub') IS DISTINCT FROM 'string' THEN RETURN NULL; END IF;
 RETURN NULLIF(claims->>'sub','')::uuid;
EXCEPTION WHEN invalid_text_representation THEN RETURN NULL;
END;
$$;

ALTER POLICY dobby_missions_writer_membership ON public.dobby_v2_memberships
USING(user_id=(SELECT dobby_runes_private.request_user_id()) AND active);
ALTER POLICY dobby_missions_writer_module_read ON public.dobby_v2_modules
USING(module='missions' AND EXISTS(SELECT 1 FROM public.dobby_v2_memberships m
 WHERE m.household_id=dobby_v2_modules.household_id AND m.user_id=(SELECT dobby_runes_private.request_user_id()) AND m.active));
ALTER POLICY dobby_missions_writer_module_insert ON public.dobby_v2_modules
WITH CHECK(module='missions' AND EXISTS(SELECT 1 FROM public.dobby_v2_memberships m
 WHERE m.household_id=dobby_v2_modules.household_id AND m.user_id=(SELECT dobby_runes_private.request_user_id()) AND m.active));
ALTER POLICY dobby_missions_writer_module_update ON public.dobby_v2_modules
USING(module='missions' AND EXISTS(SELECT 1 FROM public.dobby_v2_memberships m
 WHERE m.household_id=dobby_v2_modules.household_id AND m.user_id=(SELECT dobby_runes_private.request_user_id()) AND m.active))
WITH CHECK(module='missions' AND EXISTS(SELECT 1 FROM public.dobby_v2_memberships m
 WHERE m.household_id=dobby_v2_modules.household_id AND m.user_id=(SELECT dobby_runes_private.request_user_id()) AND m.active));
ALTER POLICY dobby_missions_receipt_read ON dobby_runes_private.operations
USING(EXISTS(SELECT 1 FROM public.dobby_v2_memberships m
 WHERE m.household_id=operations.household_id AND m.user_id=(SELECT dobby_runes_private.request_user_id()) AND m.active));
ALTER POLICY dobby_missions_receipt_insert ON dobby_runes_private.operations
WITH CHECK(actor_id=(SELECT dobby_runes_private.request_user_id()) AND EXISTS(SELECT 1 FROM public.dobby_v2_memberships m
 WHERE m.household_id=operations.household_id AND m.user_id=(SELECT dobby_runes_private.request_user_id()) AND m.active));

CREATE OR REPLACE FUNCTION dobby_runes_private.lock_active_membership(p_household_id uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF dobby_runes_private.request_user_id() IS NULL THEN RETURN false; END IF;
 PERFORM 1 FROM public.dobby_v2_memberships m
  WHERE m.household_id=p_household_id AND m.user_id=dobby_runes_private.request_user_id() AND m.active FOR SHARE;
 RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.dobby_v2_modules_stamp()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.household_id IS DISTINCT FROM OLD.household_id
      OR NEW.module IS DISTINCT FROM OLD.module THEN
      RAISE EXCEPTION 'Household and module identity cannot be reassigned';
    END IF;
    NEW.revision := OLD.revision + 1;
    NEW.created_at := OLD.created_at;
  ELSE
    NEW.revision := 1;
    NEW.created_at := now();
  END IF;
  NEW.updated_at := clock_timestamp();
  IF current_user='dobby_missions_v2_writer' THEN
    NEW.updated_by := dobby_runes_private.request_user_id();
  ELSE
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.dobby_missions_v2_capabilities(p_household_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF dobby_runes_private.request_user_id() IS NULL OR NOT EXISTS(SELECT 1 FROM public.dobby_v2_memberships m WHERE m.household_id=p_household_id AND m.user_id=dobby_runes_private.request_user_id() AND m.active) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Appartenance active au foyer requise';
 END IF;
 RETURN pg_catalog.jsonb_build_object('protocol',2,'maxPayloadBytes',262144,'directWritesBlocked',true,'ledgerVersions',pg_catalog.jsonb_build_array(1,2));
END;
$$;

CREATE OR REPLACE FUNCTION public.dobby_missions_v2_write(p_household_id uuid,p_expected_revision bigint,p_operation_id uuid,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $$
DECLARE actor uuid:=dobby_runes_private.request_user_id(); old_row public.dobby_v2_modules%ROWTYPE; receipt dobby_runes_private.operations%ROWTYPE;
 request_digest text; next_revision bigint; history jsonb; incoming jsonb; known jsonb:='{}'; pending jsonb:='{}';
 old_missions jsonb:='{}'; missions jsonb:='{}'; active jsonb; r jsonb; prior jsonb; m jsonb; key text; id text;
 desired jsonb; old_rules jsonb; new_rules jsonb; n integer;
BEGIN
 IF actor IS NULL OR p_household_id IS NULL OR p_operation_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Identité et foyer requis'; END IF;
 IF p_expected_revision IS NULL OR p_expected_revision<0 OR p_expected_revision>9007199254740990 THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Révision attendue hors capacité numérique'; END IF;
 -- Holding this row prevents membership deactivation during the authorized write.
 IF NOT dobby_runes_private.lock_active_membership(p_household_id) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Appartenance active au foyer requise'; END IF;
 -- A row does not yet exist during activation. The transaction-scoped household
 -- advisory lock serializes creation AND later writes, without locking other modules.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('dobby-missions-v2:'||p_household_id::text,0));
 request_digest:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_payload::text,'UTF8')),'hex');
 SELECT * INTO old_row FROM public.dobby_v2_modules x WHERE x.household_id=p_household_id AND x.module='missions' FOR UPDATE;
 SELECT * INTO receipt FROM dobby_runes_private.operations x WHERE x.household_id=p_household_id AND x.operation_id=p_operation_id;
 IF FOUND THEN
  IF receipt.actor_id<>actor OR receipt.request_digest IS DISTINCT FROM request_digest OR receipt.expected_revision<>p_expected_revision THEN
   RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Identifiant d’opération réutilisé avec un contenu ou acteur différent';
  END IF;
  IF old_row.household_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='État courant indisponible malgré une confirmation antérieure'; END IF;
  RETURN pg_catalog.jsonb_build_object('protocol',2,'replayed',true,'operation',pg_catalog.jsonb_build_object('id',p_operation_id,'revision',receipt.applied_revision,'digest',receipt.request_digest),'module',pg_catalog.jsonb_build_object('module','missions','payload',old_row.payload,'revision',old_row.revision,'updated_at',old_row.updated_at));
 END IF;
 IF COALESCE(old_row.revision,0)<>p_expected_revision THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Conflit de révision Missions : relisez le foyer sans écraser les opérations en attente'; END IF;
 PERFORM dobby_runes_private.assert_payload(p_payload);
 IF old_row.household_id IS NOT NULL THEN PERFORM dobby_runes_private.assert_payload(old_row.payload); END IF;
 next_revision:=p_expected_revision+1;
 history:=COALESCE(old_row.payload->'runeCredits','[]');incoming:=COALESCE(p_payload->'runeCredits','[]');
 FOR r IN SELECT value FROM pg_catalog.jsonb_array_elements(history) LOOP key:=dobby_runes_private.event_key(r);known:=pg_catalog.jsonb_set(known,ARRAY[key],r,true); END LOOP;
 IF old_row.household_id IS NULL THEN
  -- Controlled initial adoption: preserve native historical IDs and revisions,
  -- including V1 revision0. This is never inferred from an empty local cache.
  history:=incoming;FOR r IN SELECT value FROM pg_catalog.jsonb_array_elements(history) LOOP key:=dobby_runes_private.event_key(r);known:=pg_catalog.jsonb_set(known,ARRAY[key],r,true); END LOOP;
 ELSE
  IF pg_catalog.jsonb_array_length(incoming)<>pg_catalog.jsonb_array_length(history) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Un crédit confirmé ne peut pas être ajouté, retiré ou réécrit directement'; END IF;
  FOR r IN SELECT value FROM pg_catalog.jsonb_array_elements(incoming) LOOP
   key:=dobby_runes_private.event_key(r);IF NOT (known?key) OR known->key IS DISTINCT FROM r THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Un événement confirmé est immuable, date, intitulé et révision compris'; END IF;
  END LOOP;
 END IF;
 FOR r IN SELECT value FROM pg_catalog.jsonb_array_elements(COALESCE(old_row.payload->'manualMissions','[]')) LOOP old_missions:=pg_catalog.jsonb_set(old_missions,ARRAY[r->>'id'],r,true); END LOOP;
 FOR r IN SELECT value FROM pg_catalog.jsonb_array_elements(COALESCE(p_payload->'manualMissions','[]')) LOOP missions:=pg_catalog.jsonb_set(missions,ARRAY[r->>'id'],r,true); END LOOP;
 -- New dated occurrences must belong to a real native series in this snapshot.
 -- Existing orphan occurrences remain historical records. No SQL projection or
 -- rolling date window is added: a legitimate offline occurrence can be old.
 FOR id,m IN SELECT * FROM pg_catalog.jsonb_each(missions) LOOP
  IF NOT (old_missions?id) AND m?'seriesId' THEN
   prior:=missions->(m->>'seriesId');
   IF prior IS NULL OR prior->'recurrence'->'version' IS DISTINCT FROM '1'::jsonb
    OR prior->'recurrence'->>'seriesId' IS DISTINCT FROM m->>'seriesId'
    OR prior->>'id' IS DISTINCT FROM m->>'seriesId' THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Une nouvelle occurrence exige sa série native présente';
   END IF;
  END IF;
 END LOOP;
 -- Series/occurrence identities and all prior rules are historical records.
 FOR id,prior IN SELECT * FROM pg_catalog.jsonb_each(old_missions) LOOP
  m:=missions->id;
  IF prior?'recurrence' THEN
   IF m IS NULL OR m->>'due' IS DISTINCT FROM prior->>'due' OR m->'recurrence'->>'seriesId' IS DISTINCT FROM prior->'recurrence'->>'seriesId' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Une série historique ne peut pas être supprimée ou réidentifiée'; END IF;
   old_rules:=prior->'recurrence'->'rules';new_rules:=m->'recurrence'->'rules';
   IF new_rules IS NULL OR pg_catalog.jsonb_array_length(new_rules)<pg_catalog.jsonb_array_length(old_rules) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Règles historiques de récurrence absentes'; END IF;
   FOR n IN 0..pg_catalog.jsonb_array_length(old_rules)-1 LOOP IF old_rules->n IS DISTINCT FROM new_rules->n THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Les règles de récurrence antérieures sont immuables'; END IF; END LOOP;
  ELSIF prior ?| ARRAY['seriesId','occurrenceDate'] THEN
   IF m IS NULL OR m->'seriesId' IS DISTINCT FROM prior->'seriesId' OR m->'occurrenceDate' IS DISTINCT FROM prior->'occurrenceDate' OR m->'due' IS DISTINCT FROM prior->'due' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Une occurrence historique ne peut pas être supprimée ou réidentifiée'; END IF;
  END IF;
  IF prior?'rewardVersion' AND m IS NOT NULL AND m->'rewardVersion' IS DISTINCT FROM prior->'rewardVersion' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='L’éligibilité historique aux runes ne peut pas être retirée'; END IF;
  IF NOT (prior?'rewardVersion') AND m?'rewardVersion' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Une ancienne mission ne devient pas rétroactivement éligible aux runes'; END IF;
 END LOOP;
 FOR r IN SELECT value FROM pg_catalog.jsonb_array_elements(COALESCE(p_payload->'runeRequests','[]')) LOOP
  key:=dobby_runes_private.event_key(r);
  IF known?key THEN
   IF NOT dobby_runes_private.same_award(known->key,r) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Rejeu d’événement contradictoire'; END IF;
  ELSIF pending?key THEN
   IF NOT dobby_runes_private.same_award(pending->key,r) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Demandes d’événement contradictoires'; END IF;
  ELSE
   pending:=pg_catalog.jsonb_set(pending,ARRAY[key],r,true);
  END IF;
 END LOOP;
 FOR key,r IN SELECT * FROM pg_catalog.jsonb_each(pending) LOOP
  m:=missions->(r->>'missionId');
  IF m IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Une nouvelle demande de runes exige une mission présente'; END IF;
  IF COALESCE(r->>'kind','grant')='grant' THEN
   IF m->'rewardVersion' IS DISTINCT FROM '1'::jsonb OR COALESCE(m->>'assigneeId','')='' OR m->>'assigneeId' IS DISTINCT FROM r->>'memberId' OR m->>'effort' IS DISTINCT FROM r->>'effort' OR m->'customRunes' IS DISTINCT FROM r->'customRunes' THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Le nouveau gain ne correspond pas à la mission ; synchronisez avant de changer ses paramètres';
   END IF;
  END IF;
  history:=history||pg_catalog.jsonb_build_array((r-'revision')||pg_catalog.jsonb_build_object('revision',next_revision));
 END LOOP;
 active:=dobby_runes_private.assert_ledger(history);
 FOR id,m IN SELECT * FROM pg_catalog.jsonb_each(missions) LOOP
  IF active?id AND COALESCE(m->>'status','open')<>'done' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Une mission rouverte exige l’annulation de son gain actif'; END IF;
  prior:=old_missions->id;
  IF COALESCE(m->>'status','open')='done' AND m->'rewardVersion'='1'::jsonb
   AND COALESCE(m->>'assigneeId','')<>'' AND NOT (active?id)
   AND (prior IS NULL OR COALESCE(prior->>'status','open')<>'done') THEN
   RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Une nouvelle complétion éligible exige son gain de runes';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_each(pending) p WHERE p.value->>'missionId'=id)
   AND (COALESCE(m->>'status','open')='done') IS DISTINCT FROM (active?id) THEN
   RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Statut final de mission et cycle de runes incohérents';
  END IF;
 END LOOP;
 SELECT COALESCE(pg_catalog.jsonb_agg(value ORDER BY dobby_runes_private.event_key(value)),'[]') INTO history FROM pg_catalog.jsonb_array_elements(history);
 desired:=pg_catalog.jsonb_build_object('autoTasks',COALESCE(p_payload->'autoTasks','[]'),'manualMissions',COALESCE(p_payload->'manualMissions','[]'),'runeCredits',history,'runeRequests','[]'::jsonb,'runeLedgerVersion',2);
 PERFORM dobby_runes_private.assert_payload(desired);
 IF old_row.household_id IS NULL THEN INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES(p_household_id,'missions',desired) RETURNING * INTO old_row;
 ELSE UPDATE public.dobby_v2_modules SET payload=desired WHERE household_id=p_household_id AND module='missions' RETURNING * INTO old_row; END IF;
 IF old_row.revision<>next_revision THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Révision serveur incohérente'; END IF;
 INSERT INTO dobby_runes_private.operations(household_id,operation_id,actor_id,expected_revision,applied_revision,request_digest) VALUES(p_household_id,p_operation_id,actor,p_expected_revision,next_revision,request_digest);
 RETURN pg_catalog.jsonb_build_object('protocol',2,'replayed',false,'operation',pg_catalog.jsonb_build_object('id',p_operation_id,'revision',next_revision,'digest',request_digest),'module',pg_catalog.jsonb_build_object('module','missions','payload',old_row.payload,'revision',old_row.revision,'updated_at',old_row.updated_at));
END;
$$;

-- No owner, public RPC grant, role membership, trigger or data is replaced.
-- CREATE OR REPLACE preserves the existing function owners and ACLs.
-- The sole new grant is EXECUTE on the minimal private claims reader to writer.
REVOKE ALL ON FUNCTION dobby_runes_private.request_user_id() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION dobby_runes_private.request_user_id() TO dobby_missions_v2_writer;

-- Detect an additional effective policy/helper from a divergent installation.
-- Such an installation needs review, not broad grants or silent policy changes.
DO $postflight$
DECLARE item record; writer oid:='dobby_missions_v2_writer'::regrole;
BEGIN
 FOR item IN
  SELECT pol.polname,c.relname
  FROM pg_catalog.pg_policy pol JOIN pg_catalog.pg_class c ON c.oid=pol.polrelid
  WHERE pol.polrelid IN('public.dobby_v2_modules'::regclass,'public.dobby_v2_memberships'::regclass,'dobby_runes_private.operations'::regclass)
   AND EXISTS(SELECT 1 FROM pg_catalog.unnest(pol.polroles) r(role_oid)
     WHERE CASE WHEN r.role_oid=0 THEN true ELSE pg_catalog.pg_has_role(writer,r.role_oid,'USAGE') END)
   AND (COALESCE(pg_catalog.pg_get_expr(pol.polqual,pol.polrelid),'')||' '||COALESCE(pg_catalog.pg_get_expr(pol.polwithcheck,pol.polrelid),'')) ~ 'auth[.]uid[[:space:]]*[(]'
 LOOP
  RAISE EXCEPTION 'Additional auth-dependent writer policy %.% requires review; entire patch rolled back',item.relname,item.polname;
 END LOOP;
 FOR item IN SELECT p.oid::regprocedure AS signature FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='dobby_runes_private' AND pg_catalog.has_function_privilege(writer,p.oid,'EXECUTE')
   AND p.prosrc ~ 'auth[.]uid[[:space:]]*[(]'
 LOOP
  RAISE EXCEPTION 'Additional auth-dependent private helper % requires review; entire patch rolled back',item.signature;
 END LOOP;
END;
$postflight$;

COMMIT;
-- Then run the separate read-only checks in dobby-shared-runes-v2-auth-42501-checks.sql.
-- Retry the capability GET with a real active-member JWT; do not put any JWT in Git.
