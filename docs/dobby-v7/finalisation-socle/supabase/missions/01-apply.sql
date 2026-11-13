-- DOBBY familial uniquement. Exécution manuelle par le propriétaire.
-- Prérequis : socle Famille F09 installé et vérifié, PostgreSQL 17.
-- Nouvelle écriture V3 par intentions ; aucune conversion des crédits existants.
-- Le client reste fermé jusqu'à vérification et recette serveur réelles.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

DO $preflight$
DECLARE helper record;
BEGIN
  IF pg_catalog.to_regprocedure('dobby_socle_private.actor_context(uuid,boolean)') IS NULL
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='dobby_socle_writer'
      AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole) THEN
    RAISE EXCEPTION 'Installer et vérifier le socle familial avant Missions V3';
  END IF;
  IF pg_catalog.to_regprocedure('public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)') IS NOT NULL
    OR pg_catalog.to_regprocedure('public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'Missions V3 déjà présent ou installation partielle : exécuter la vérification, sans réinstaller';
  END IF;
  IF pg_catalog.md5(pg_catalog.pg_get_functiondef('public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)'::regprocedure))
       IS DISTINCT FROM '3a5bc8dc7117925a158e1fd70dc05709'
    OR pg_catalog.md5(pg_catalog.pg_get_functiondef('dobby_runes_private.guard_missions()'::regprocedure))
       IS DISTINCT FROM 'cd0583e218da4cb7d566c12b4ce0194b' THEN
    RAISE EXCEPTION 'Writer ou garde V2 différent du catalogue reçu : aucune modification';
  END IF;
  IF NOT pg_catalog.pg_has_role(current_user,'dobby_missions_v2_writer','SET') THEN
    RAISE EXCEPTION 'Droit SET du writer Missions V2 absent : aucune modification';
  END IF;
  FOR helper IN SELECT * FROM (VALUES
    ('dobby_runes_private.assert_event(jsonb,boolean)','143d7eee03b39cd641adc44d5463c98b'),
    ('dobby_runes_private.assert_ledger(jsonb)','97ca8fc4f7a90da7ab9424d8061eb9c7'),
    ('dobby_runes_private.assert_mission(jsonb)','a1a81757d2fa0083204a79ecd9f50388'),
    ('dobby_runes_private.assert_payload(jsonb)','fd72b697c15961425a22da79c4495d1a'),
    ('dobby_runes_private.event_key(jsonb)','546b184d13d15d74814a2e4a1eee09c1'),
    ('dobby_runes_private.has_native_text(text)','339a898b0c8c47fcb6f2ef0fd168dbb6'),
    ('dobby_runes_private.lock_active_membership(uuid)','fbf50ad8e900c6ca1f360038a8abce37'),
    ('dobby_runes_private.request_user_id()','d6c6cd4743fa2d32d6994d2bf382679c'),
    ('dobby_runes_private.safe_integer(jsonb,text)','0b7cf60ae2d30086d30bf036eae0e8f5'),
    ('dobby_runes_private.same_award(jsonb,jsonb)','e43e606d434d8b1e15fe330d83741f42'),
    ('dobby_runes_private.utf16_length(text)','e2570931d23e3fdbffe397c971df9a31'),
    ('dobby_runes_private.valid_date(text)','1b25324883b40c6d4e62c15c7a565a58')
  ) expected(signature,definition_md5) LOOP
    IF pg_catalog.to_regprocedure(helper.signature) IS NULL OR
      pg_catalog.md5(pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure(helper.signature)))
        IS DISTINCT FROM helper.definition_md5 THEN
      RAISE EXCEPTION 'Helper Missions différent du catalogue reçu : %',helper.signature;
    END IF;
  END LOOP;
END $preflight$;
UPDATE dobby_socle_private.install_state SET missions_client_verified=false WHERE singleton;

GRANT dobby_socle_writer TO CURRENT_USER WITH INHERIT FALSE, SET TRUE;
GRANT CREATE ON SCHEMA public,dobby_socle_private TO dobby_socle_writer;
GRANT USAGE ON SCHEMA dobby_runes_private TO dobby_socle_writer;
GRANT EXECUTE ON FUNCTION dobby_runes_private.assert_event(jsonb,boolean),
  dobby_runes_private.assert_mission(jsonb),dobby_runes_private.event_key(jsonb),
  dobby_runes_private.safe_integer(jsonb,text),dobby_runes_private.valid_date(text),
  dobby_runes_private.utf16_length(text),dobby_runes_private.has_native_text(text)
  TO dobby_socle_writer;
GRANT SELECT ON dobby_runes_private.operations TO dobby_socle_writer;
CREATE POLICY dobby_socle_old_mission_receipts_read ON dobby_runes_private.operations
  FOR SELECT TO dobby_socle_writer USING(EXISTS(SELECT 1 FROM public.dobby_v2_memberships m
    WHERE m.household_id=operations.household_id AND m.user_id=dobby_socle_private.actor() AND m.active));
GRANT USAGE ON SCHEMA dobby_socle_private TO dobby_missions_v2_writer;
GRANT SELECT,INSERT,UPDATE ON public.dobby_v2_modules TO dobby_socle_writer;
GRANT REFERENCES ON public.dobby_v2_memberships,public.dobby_v2_households TO dobby_socle_writer;

-- Existing trigger body is adapted only to recognize the new closed writer.
-- Old V2 remains guarded; direct authenticated INSERT/UPDATE/DELETE stays closed.
CREATE OR REPLACE FUNCTION dobby_runes_private.guard_missions()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $guard$
BEGIN
  IF (CASE TG_OP WHEN 'DELETE' THEN OLD.module='missions'
      WHEN 'INSERT' THEN NEW.module='missions'
      ELSE OLD.module='missions' OR NEW.module='missions' END)
    AND current_user NOT IN ('dobby_missions_v2_writer','dobby_socle_writer') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Écriture Missions dédiée requise';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $guard$;
GRANT EXECUTE ON FUNCTION dobby_runes_private.guard_missions() TO dobby_socle_writer;

-- No API access to the renamed original; its body and owner remain intact.
ALTER FUNCTION public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)
  RENAME TO dobby_missions_v2_write_legacy_socle;
REVOKE ALL ON FUNCTION public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT CREATE ON SCHEMA public TO dobby_missions_v2_writer;
SET LOCAL ROLE dobby_missions_v2_writer;
CREATE FUNCTION public.dobby_missions_v2_write(p_household_id uuid,p_expected_revision bigint,
 p_operation_id uuid,p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $v2_parent$
DECLARE c jsonb;
BEGIN
  c:=dobby_socle_private.actor_context(p_household_id,true);
  IF c->>'category' IS DISTINCT FROM 'parent' THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Modification Missions réservée au parent canonique';
  END IF;
  PERFORM dobby_socle_private.missions_reject_v3_operation(p_household_id,p_operation_id);
  RETURN public.dobby_missions_v2_write_legacy_socle(p_household_id,p_expected_revision,p_operation_id,p_payload);
END $v2_parent$;
REVOKE ALL ON FUNCTION public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb) TO authenticated;
RESET ROLE;
REVOKE CREATE ON SCHEMA public FROM dobby_missions_v2_writer;

-- The family bootstrap already grants the closed writer policies limited to
-- family/missions. Do not add another permissive policy or widen other modules.

SET LOCAL ROLE dobby_socle_writer;
GRANT EXECUTE ON FUNCTION dobby_socle_private.actor_context(uuid,boolean) TO dobby_missions_v2_writer;
CREATE TABLE dobby_socle_private.mission_operations(
  household_id uuid NOT NULL REFERENCES public.dobby_v2_households(id),
  operation_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  expected_revision bigint NOT NULL CHECK(expected_revision BETWEEN 0 AND 9007199254740990),
  applied_revision bigint NOT NULL CHECK(applied_revision BETWEEN 1 AND 9007199254740991),
  request_digest text NOT NULL CHECK(request_digest~'^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  PRIMARY KEY(household_id,operation_id),
  FOREIGN KEY(household_id,actor_id) REFERENCES public.dobby_v2_memberships(household_id,user_id)
);
ALTER TABLE dobby_socle_private.mission_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dobby_socle_private.mission_operations FORCE ROW LEVEL SECURITY;
CREATE POLICY mission_operations_closed_writer ON dobby_socle_private.mission_operations
  TO dobby_socle_writer USING(true) WITH CHECK(true);
REVOKE ALL ON dobby_socle_private.mission_operations FROM PUBLIC,anon,authenticated,service_role;

-- V2 and V3 share the household operation UUID namespace. Only its boolean
-- refusal is exposed to the closed V2 writer, never the new receipts table.
CREATE FUNCTION dobby_socle_private.missions_reject_v3_operation(p_household uuid,p_operation uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $cross_protocol$
DECLARE c jsonb:=dobby_socle_private.actor_context(p_household,false);
BEGIN
  IF c->>'category' IS DISTINCT FROM 'parent' THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Parent canonique requis';
  END IF;
  IF EXISTS(SELECT 1 FROM dobby_socle_private.mission_operations
    WHERE household_id=p_household AND operation_id=p_operation) THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Opération déjà utilisée par le protocole Missions V3';
  END IF;
END $cross_protocol$;
REVOKE ALL ON FUNCTION dobby_socle_private.missions_reject_v3_operation(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION dobby_socle_private.missions_reject_v3_operation(uuid,uuid) TO dobby_missions_v2_writer;

-- UTF-16 big-endian order matches JavaScript < / > even for non-ASCII TEXT IDs.
CREATE FUNCTION dobby_socle_private.missions_id_key(p_value text) RETURNS bytea
LANGUAGE sql IMMUTABLE STRICT SET search_path='' AS $id_key$
 SELECT pg_catalog.decode(coalesce(pg_catalog.string_agg(
   CASE WHEN pg_catalog.ascii(ch)>65535 THEN
     pg_catalog.lpad(pg_catalog.to_hex(55296+(pg_catalog.ascii(ch)-65536)/1024),4,'0')||
     pg_catalog.lpad(pg_catalog.to_hex(56320+(pg_catalog.ascii(ch)-65536)%1024),4,'0')
   ELSE pg_catalog.lpad(pg_catalog.to_hex(pg_catalog.ascii(ch)),4,'0') END,'' ORDER BY n),''),'hex')
 FROM pg_catalog.regexp_split_to_table(p_value,'') WITH ORDINALITY x(ch,n)
 WHERE ch<>''
$id_key$;

CREATE FUNCTION dobby_socle_private.missions_allocations(p_total numeric,p_ids jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $allocations$
DECLARE n bigint; base numeric; remainder numeric; result jsonb;
BEGIN
  PERFORM dobby_runes_private.safe_integer(pg_catalog.to_jsonb(p_total),'Total');
  IF pg_catalog.jsonb_typeof(p_ids) IS DISTINCT FROM 'array'
    OR pg_catalog.jsonb_array_length(p_ids) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Participants explicites requis';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(p_ids) e
    WHERE pg_catalog.jsonb_typeof(e) IS DISTINCT FROM 'string'
      OR NOT dobby_runes_private.has_native_text(e#>>'{}')
      OR pg_catalog.length(e#>>'{}')>120)
    OR (SELECT count(*) FROM pg_catalog.jsonb_array_elements(p_ids)) <>
       (SELECT count(DISTINCT e) FROM pg_catalog.jsonb_array_elements(p_ids) e) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Participants distincts et valides requis';
  END IF;
  n:=pg_catalog.jsonb_array_length(p_ids);base:=pg_catalog.trunc(p_total/n);remainder:=p_total%n;
  SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('memberId',id,
    'amount',base+CASE WHEN rank<=remainder THEN 1 ELSE 0 END) ORDER BY rank)
  INTO result FROM (SELECT e#>>'{}' AS id,
    pg_catalog.row_number() OVER(ORDER BY dobby_socle_private.missions_id_key(e#>>'{}')) AS rank
    FROM pg_catalog.jsonb_array_elements(p_ids) e) x;
  RETURN result;
END $allocations$;

CREATE FUNCTION dobby_socle_private.missions_assert_event(p_event jsonb) RETURNS void
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $assert_event$
DECLARE legacy jsonb; ids jsonb; expected jsonb;
BEGIN
  -- Validate the known historical contract while keeping extension fields in
  -- the stored event unchanged. New events are built by the server below.
  SELECT pg_catalog.jsonb_object_agg(key,value) INTO legacy
  FROM pg_catalog.jsonb_each(p_event)
  WHERE key=ANY(ARRAY['missionId','memberId','effort','amount','date','title','revision',
    'customRunes','eventId','kind','cycle','reverses']);
  IF p_event?'allocations' THEN
    IF pg_catalog.jsonb_typeof(p_event->'memberId') IS DISTINCT FROM 'string'
      OR NOT dobby_runes_private.has_native_text(p_event->>'memberId')
      OR pg_catalog.length(p_event->>'memberId')>120 THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Identifiant canonique de Rune invalide';
    END IF;
    -- V2 limits its member ID to 100 UTF-16 units. Validate its remaining
    -- historical fields without imposing that obsolete limit on V3 TEXT IDs.
    legacy:=legacy||pg_catalog.jsonb_build_object('memberId','v3-canonical-member');
    IF NOT(p_event?'eventId') OR pg_catalog.jsonb_typeof(p_event->'allocations') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Événement réparti versionné requis';
    END IF;
    IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(p_event->'allocations') e
      WHERE pg_catalog.jsonb_typeof(e) IS DISTINCT FROM 'object'
      OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_object_keys(e) k WHERE k NOT IN ('memberId','amount'))) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Allocation invalide';
    END IF;
    SELECT pg_catalog.jsonb_agg(e->'memberId' ORDER BY n) INTO ids
    FROM pg_catalog.jsonb_array_elements(p_event->'allocations') WITH ORDINALITY x(e,n);
    expected:=dobby_socle_private.missions_allocations((p_event->>'amount')::numeric,ids);
    IF expected IS DISTINCT FROM p_event->'allocations'
      OR p_event->>'memberId' IS DISTINCT FROM expected->0->>'memberId' THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Allocation différente du partage déterministe';
    END IF;
  END IF;
  PERFORM dobby_runes_private.assert_event(legacy,true);
END $assert_event$;

CREATE FUNCTION dobby_socle_private.missions_assert_ledger(p_rows jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $ledger$
DECLARE e jsonb; seen jsonb:='{}'; active jsonb:='{}'; totals jsonb:='{}';
 k text; mission text; previous text; expected numeric:=0; cycle numeric;
 award jsonb; part jsonb; amount numeric; member text;
BEGIN
  IF pg_catalog.jsonb_typeof(p_rows) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Historique de Runes invalide';
  END IF;
  FOR e IN SELECT value FROM pg_catalog.jsonb_array_elements(p_rows) LOOP
    PERFORM dobby_socle_private.missions_assert_event(e);
    k:=dobby_runes_private.event_key(e);
    IF seen?k THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Crédit historique dupliqué'; END IF;
    seen:=pg_catalog.jsonb_set(seen,ARRAY[k],e,true);
  END LOOP;
  FOR e IN SELECT value FROM pg_catalog.jsonb_array_elements(p_rows)
    ORDER BY value->>'missionId' COLLATE "C",coalesce((value->>'cycle')::numeric,0),
      CASE WHEN value->>'kind'='reversal' THEN 1 ELSE 0 END LOOP
    mission:=e->>'missionId';cycle:=coalesce((e->>'cycle')::numeric,0);
    IF previous IS DISTINCT FROM mission THEN
      IF award IS NOT NULL THEN active:=pg_catalog.jsonb_set(active,ARRAY[previous],award,true); END IF;
      previous:=mission;expected:=0;award:=NULL;
    END IF;
    IF e->>'kind'='reversal' THEN
      IF award IS NULL OR cycle<>expected-1
        OR e->>'reverses' IS DISTINCT FROM dobby_runes_private.event_key(award)
        OR (e->'memberId') IS DISTINCT FROM award->'memberId'
        OR (e->'effort') IS DISTINCT FROM award->'effort'
        OR (e->'amount') IS DISTINCT FROM award->'amount'
        OR (e->'customRunes') IS DISTINCT FROM award->'customRunes'
        OR (e->'allocations') IS DISTINCT FROM award->'allocations' THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Annulation différente du gain exact';
      END IF;
      award:=NULL;
    ELSE
      IF award IS NOT NULL OR cycle<>expected THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Plusieurs gains actifs ou cycle incomplet';
      END IF;
      award:=e;expected:=expected+1;
    END IF;
  END LOOP;
  IF award IS NOT NULL THEN active:=pg_catalog.jsonb_set(active,ARRAY[previous],award,true); END IF;
  FOR e IN SELECT value FROM pg_catalog.jsonb_each(active) LOOP
    FOR part IN SELECT value FROM pg_catalog.jsonb_array_elements(coalesce(e->'allocations',
      pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('memberId',e->>'memberId','amount',e->'amount')))) LOOP
      member:=part->>'memberId';amount:=coalesce((totals->>member)::numeric,0)+(part->>'amount')::numeric;
      IF amount>9007199254740991 THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Total actif de Runes hors capacité numérique';
      END IF;
      totals:=pg_catalog.jsonb_set(totals,ARRAY[member],pg_catalog.to_jsonb(amount),true);
    END LOOP;
  END LOOP;
  RETURN active;
END $ledger$;

CREATE FUNCTION dobby_socle_private.missions_assert_mission(p_mission jsonb) RETURNS void
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $mission$
DECLARE base jsonb:=p_mission; d jsonb; rules jsonb;
BEGIN
  -- Reuse the real V2 validation for ordinary fields and recurrence history.
  -- V3 adds assignment and native deadline offsets without rewriting old rows.
  IF p_mission?'deadlineOffsetDays' THEN
    IF p_mission->'deadlineOffsetDays'<>'null'::jsonb THEN
      IF dobby_runes_private.safe_integer(p_mission->'deadlineOffsetDays','Délai')>36600 THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Délai de mission invalide';
      END IF;
    END IF;
    IF p_mission?'occurrenceDate' THEN
      IF NOT dobby_runes_private.valid_date(p_mission->>'occurrenceDate') THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Date occurrence invalide';
      END IF;
      IF p_mission->>'due' IS DISTINCT FROM (CASE WHEN p_mission->'deadlineOffsetDays'='null'::jsonb THEN ''
          ELSE ((p_mission->>'occurrenceDate')::date+(p_mission->>'deadlineOffsetDays')::integer)::text END) THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Échéance occurrence incohérente';
      END IF;
      base:=base||pg_catalog.jsonb_build_object('due',p_mission->>'occurrenceDate');
    END IF;
  END IF;
  IF p_mission?'assigneeId' AND (pg_catalog.jsonb_typeof(p_mission->'assigneeId') IS DISTINCT FROM 'string'
    OR pg_catalog.length(p_mission->>'assigneeId')>120) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Identifiant canonique attribué invalide';
  END IF;
  base:=base-'assigneeId';
  IF pg_catalog.jsonb_typeof(base->'recurrence'->'rules')='array' THEN
    SELECT pg_catalog.jsonb_agg(value||pg_catalog.jsonb_build_object('template',(value->'template')-'assigneeId') ORDER BY n)
      INTO rules FROM pg_catalog.jsonb_array_elements(base->'recurrence'->'rules') WITH ORDINALITY x(value,n);
    base:=pg_catalog.jsonb_set(base,'{recurrence,rules}',rules);
  END IF;
  PERFORM dobby_runes_private.assert_mission(base);
  IF p_mission?'allFamily' AND pg_catalog.jsonb_typeof(p_mission->'allFamily') IS DISTINCT FROM 'boolean'
    OR p_mission?'participantVersion' AND p_mission->'participantVersion' IS DISTINCT FROM '1'::jsonb
    OR p_mission?'priority' AND p_mission->>'priority' NOT IN ('normal','urgent') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Attribution ou priorité invalide';
  END IF;
  IF p_mission?'assigneeIds' THEN
    IF pg_catalog.jsonb_typeof(p_mission->'assigneeIds') IS DISTINCT FROM 'array'
      OR pg_catalog.jsonb_array_length(p_mission->'assigneeIds')>200 THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Attribution multiple invalide';
    END IF;
    IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(p_mission->'assigneeIds') e
      WHERE pg_catalog.jsonb_typeof(e) IS DISTINCT FROM 'string'
        OR NOT dobby_runes_private.has_native_text(e#>>'{}') OR pg_catalog.length(e#>>'{}')>120)
      OR (SELECT count(*) FROM pg_catalog.jsonb_array_elements(p_mission->'assigneeIds')) <>
         (SELECT count(DISTINCT e) FROM pg_catalog.jsonb_array_elements(p_mission->'assigneeIds') e) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Attributions distinctes requises';
    END IF;
  END IF;
  FOR d IN SELECT value FROM pg_catalog.jsonb_array_elements(coalesce(p_mission->'recurrence'->'rules','[]')) LOOP
    PERFORM dobby_socle_private.missions_assert_mission(d->'template'||
      pg_catalog.jsonb_build_object('id',p_mission->>'id','due',d->>'start','status','open'));
  END LOOP;
END $mission$;

CREATE FUNCTION dobby_socle_private.missions_assert_payload(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $payload$
DECLARE m jsonb; seen jsonb:='{}'; id text;
BEGIN
  IF pg_catalog.jsonb_typeof(p_payload) IS DISTINCT FROM 'object'
    OR pg_catalog.octet_length(p_payload::text)>262144
    OR p_payload->'runeLedgerVersion' IS DISTINCT FROM '3'::jsonb THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Module Missions V3 invalide ou supérieur à 256 Kio';
  END IF;
  IF pg_catalog.jsonb_typeof(coalesce(p_payload->'manualMissions','[]')) IS DISTINCT FROM 'array'
    OR pg_catalog.jsonb_typeof(coalesce(p_payload->'autoTasks','[]')) IS DISTINCT FROM 'array'
    OR coalesce(p_payload->'runeRequests','[]') IS DISTINCT FROM '[]'::jsonb THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Tableaux Missions confirmés requis';
  END IF;
  FOR m IN SELECT value FROM pg_catalog.jsonb_array_elements(coalesce(p_payload->'manualMissions','[]')) LOOP
    PERFORM dobby_socle_private.missions_assert_mission(m);id:=m->>'id';
    IF seen?id THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Mission dupliquée'; END IF;
    seen:=pg_catalog.jsonb_set(seen,ARRAY[id],'true'::jsonb,true);
  END LOOP;
  RETURN dobby_socle_private.missions_assert_ledger(coalesce(p_payload->'runeCredits','[]'));
END $payload$;

CREATE FUNCTION dobby_socle_private.missions_occurrence_valid(p_mission jsonb,p_missions jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $occurrence$
DECLARE series jsonb; rule jsonb; day date; last_day integer;
BEGIN
  IF NOT(p_mission?'seriesId') THEN RETURN true; END IF;
  SELECT value INTO series FROM pg_catalog.jsonb_array_elements(p_missions) WHERE value->>'id'=p_mission->>'seriesId';
  IF series IS NULL OR series->'recurrence'->'version' IS DISTINCT FROM '1'::jsonb THEN RETURN false; END IF;
  day:=(p_mission->>'occurrenceDate')::date;
  SELECT value INTO rule FROM pg_catalog.jsonb_array_elements(series->'recurrence'->'rules') WITH ORDINALITY x(value,n)
    WHERE value->>'from'<=day::text ORDER BY n DESC LIMIT 1;
  IF rule IS NULL OR rule->>'state' IS DISTINCT FROM 'active' OR day<(rule->>'start')::date THEN RETURN false; END IF;
  IF rule->>'frequency'='daily' THEN RETURN true; END IF;
  IF rule->>'frequency'='weekly' THEN RETURN rule->'weekdays' @> pg_catalog.jsonb_build_array(extract(dow FROM day)::integer); END IF;
  last_day:=extract(day FROM (pg_catalog.date_trunc('month',day::timestamp)+interval '1 month - 1 day'))::integer;
  RETURN extract(day FROM day)::integer=least((rule->>'monthDay')::integer,last_day);
END $occurrence$;

CREATE FUNCTION public.dobby_missions_v3_write(p_household_id uuid,p_expected_revision bigint,
 p_operation_id uuid,p_intent jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $writer$
DECLARE c jsonb; actor uuid; current_row public.dobby_v2_modules%ROWTYPE;
 receipt dobby_socle_private.mission_operations%ROWTYPE; digest text; kind text;
 old_payload jsonb; desired jsonb; incoming jsonb; history jsonb; active jsonb;
 m jsonb; previous jsonb; entry jsonb; award jsonb; allocations jsonb; people jsonb; family_members jsonb;
 id text; k text; request_participants jsonb; declared jsonb; eligible jsonb; selected jsonb;
 total numeric; cycle numeric; stamp text; changed boolean:=true; rev bigint; old_rules jsonb; new_rules jsonb;
 editable text[]:=ARRAY['title','category','assigneeId','assigneeIds','allFamily','participantVersion',
 'priority','deadlineOffsetDays','note','due','effort','customRunes','recurrence'];
BEGIN
  IF p_operation_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision NOT BETWEEN 0 AND 9007199254740990
    OR pg_catalog.jsonb_typeof(p_intent) IS DISTINCT FROM 'object' OR pg_catalog.octet_length(p_intent::text)>262144 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Opération ou intention Missions invalide';
  END IF;
  kind:=p_intent->>'kind';
  IF kind NOT IN ('snapshot','complete','reopen') OR kind IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Intention Missions inconnue';
  END IF;
  c:=dobby_socle_private.actor_context(p_household_id,true);actor:=(c->>'userId')::uuid;
  IF p_household_id IS NULL OR c->>'phase' IS DISTINCT FROM 'active'
    OR c->>'householdId' IS DISTINCT FROM p_household_id::text
    OR c->>'category' NOT IN ('parent','child') OR c->>'category' IS NULL
    OR kind IN ('snapshot','reopen') AND c->>'category'<>'parent' THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Action Missions refusée pour ce profil';
  END IF;
  SELECT payload->'familyMembers' INTO family_members FROM public.dobby_v2_modules
    WHERE household_id=p_household_id AND module='family';
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('dobby-missions-v2:'||p_household_id::text,0));
  SELECT * INTO current_row FROM public.dobby_v2_modules WHERE household_id=p_household_id AND module='missions' FOR UPDATE;
  digest:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_intent::text,'UTF8')),'hex');
  IF EXISTS(SELECT 1 FROM dobby_runes_private.operations
    WHERE household_id=p_household_id AND operation_id=p_operation_id) THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Opération déjà utilisée par le protocole Missions V2';
  END IF;
  SELECT * INTO receipt FROM dobby_socle_private.mission_operations WHERE household_id=p_household_id AND operation_id=p_operation_id;
  IF FOUND THEN
    IF receipt.actor_id<>actor OR receipt.request_digest IS DISTINCT FROM digest OR receipt.expected_revision<>p_expected_revision THEN
      RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Opération Missions réutilisée avec un autre acteur ou contenu';
    END IF;
    IF current_row.household_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='État confirmé devenu indisponible'; END IF;
    RETURN pg_catalog.jsonb_build_object('protocol',3,'replayed',true,
      'operation',pg_catalog.jsonb_build_object('id',p_operation_id,'revision',receipt.applied_revision,'digest',digest),
      'module',pg_catalog.jsonb_build_object('module','missions','payload',current_row.payload,'revision',current_row.revision,'updated_at',current_row.updated_at));
  END IF;
  IF coalesce(current_row.revision,0)<>p_expected_revision THEN
    RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Conflit Missions : relire sans écraser l’intention en attente';
  END IF;
  old_payload:=coalesce(current_row.payload,pg_catalog.jsonb_build_object('autoTasks','[]'::jsonb,'manualMissions','[]'::jsonb,'runeCredits','[]'::jsonb));
  IF old_payload?'runeLedgerVersion' AND old_payload->'runeLedgerVersion' NOT IN ('1'::jsonb,'2'::jsonb,'3'::jsonb) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Version de registre inconnue conservée : mise à jour compatible requise';
  END IF;
  IF coalesce(old_payload->'runeRequests','[]')<>'[]'::jsonb THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Anciennes demandes non confirmées : adoption explicite nécessaire';
  END IF;
  history:=coalesce(old_payload->'runeCredits','[]');
  desired:=old_payload||pg_catalog.jsonb_build_object('runeLedgerVersion',3,'runeRequests','[]'::jsonb);
  active:=dobby_socle_private.missions_assert_payload(desired);
  IF kind='snapshot' THEN
    IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_object_keys(p_intent) x WHERE x NOT IN ('kind','payload'))
      OR pg_catalog.jsonb_typeof(p_intent->'payload') IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Snapshot parent invalide';
    END IF;
    incoming:=p_intent->'payload';
    IF incoming?'runeCredits' AND incoming->'runeCredits' IS DISTINCT FROM history
      OR incoming?'runeRequests' AND incoming->'runeRequests' IS DISTINCT FROM '[]'::jsonb
      OR incoming?'runeLedgerVersion' AND (incoming->'runeLedgerVersion' NOT IN ('1'::jsonb,'2'::jsonb,'3'::jsonb)
        OR (incoming->>'runeLedgerVersion')::numeric<coalesce((old_payload->>'runeLedgerVersion')::numeric,1)) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Aucun crédit ne peut être imposé par snapshot';
    END IF;
    FOR k IN SELECT pg_catalog.jsonb_object_keys(incoming) LOOP
      IF k NOT IN ('autoTasks','manualMissions','runeCredits','runeRequests','runeLedgerVersion')
        AND incoming->k IS DISTINCT FROM old_payload->k THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Extension Missions inconnue conservée';
      END IF;
    END LOOP;
    desired:=desired||incoming||pg_catalog.jsonb_build_object('runeCredits',history,'runeRequests','[]'::jsonb,'runeLedgerVersion',3);
    PERFORM dobby_socle_private.missions_assert_payload(desired);
    FOR previous IN SELECT value FROM pg_catalog.jsonb_array_elements(coalesce(old_payload->'manualMissions','[]')) LOOP
      id:=previous->>'id';m:=NULL;
      SELECT value INTO m FROM pg_catalog.jsonb_array_elements(desired->'manualMissions') WHERE value->>'id'=id;
      IF m IS NULL THEN
        IF previous?'recurrence' OR previous?'seriesId' OR previous->>'status'='done'
          OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(history) e WHERE e->>'missionId'=id) THEN
          RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Mission historique conservée';
        END IF;
        CONTINUE;
      END IF;
      IF coalesce(m->>'status','open') IS DISTINCT FROM coalesce(previous->>'status','open')
        OR m->'completedAt' IS DISTINCT FROM previous->'completedAt'
        OR m->'rewardVersion' IS DISTINCT FROM previous->'rewardVersion' THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Complétion et éligibilité protégées : intention dédiée requise';
      END IF;
      FOR k IN SELECT pg_catalog.jsonb_object_keys(previous) LOOP
        IF NOT(k=ANY(editable)) AND m->k IS DISTINCT FROM previous->k THEN
          RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Champ historique de mission conservé';
        END IF;
      END LOOP;
      IF previous?'recurrence' THEN
        old_rules:=previous->'recurrence'->'rules';new_rules:=m->'recurrence'->'rules';
        IF m->>'due' IS DISTINCT FROM previous->>'due' OR m->'recurrence'->>'seriesId' IS DISTINCT FROM previous->'recurrence'->>'seriesId'
          OR pg_catalog.jsonb_array_length(new_rules)<pg_catalog.jsonb_array_length(old_rules)
          OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(old_rules) WITH ORDINALITY x(value,n)
            WHERE value IS DISTINCT FROM new_rules->((n-1)::integer)) THEN
          RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Règles historiques de récurrence immuables';
        END IF;
      ELSIF previous?'seriesId' AND (m->'seriesId' IS DISTINCT FROM previous->'seriesId'
        OR m->'occurrenceDate' IS DISTINCT FROM previous->'occurrenceDate' OR m->'due' IS DISTINCT FROM previous->'due') THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Occurrence historique immuable';
      END IF;
    END LOOP;
    FOR m IN SELECT value FROM pg_catalog.jsonb_array_elements(desired->'manualMissions') LOOP
      IF NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(coalesce(old_payload->'manualMissions','[]')) x WHERE x->>'id'=m->>'id') THEN
        IF coalesce(m->>'status','open')<>'open' OR NOT dobby_socle_private.missions_occurrence_valid(m,desired->'manualMissions') THEN
          RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Nouvelle mission ou occurrence invalide';
        END IF;
      END IF;
    END LOOP;
  ELSE
    IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_object_keys(p_intent) x
      WHERE x NOT IN ('kind','missionId') AND NOT(kind='complete' AND x='participantIds'))
      OR pg_catalog.jsonb_typeof(p_intent->'missionId') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Seuls occurrence et participants sont autorisés';
    END IF;
    id:=p_intent->>'missionId';
    SELECT value INTO m FROM pg_catalog.jsonb_array_elements(coalesce(desired->'manualMissions','[]')) WHERE value->>'id'=id;
    IF m IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Mission enregistrée absente'; END IF;
    stamp:=pg_catalog.to_char(pg_catalog.clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
    award:=active->id;
    IF kind='complete' THEN
      request_participants:=p_intent->'participantIds';
      -- Computes validation and canonical ordering; allocations are recalculated
      -- with the real mission reward only after candidates are checked.
      allocations:=dobby_socle_private.missions_allocations(0,request_participants);
      SELECT pg_catalog.jsonb_agg(e->'id') INTO people FROM pg_catalog.jsonb_array_elements(family_members) e
        WHERE e->>'memberCategory' IN ('parent','child')
          AND coalesce(e->>'type','') NOT IN ('pet','animal','guardian','baby')
          AND coalesce(e->>'kind','') NOT IN ('pet','animal','guardian','baby');
      declared:=CASE WHEN pg_catalog.jsonb_array_length(coalesce(m->'assigneeIds','[]'))>0 THEN m->'assigneeIds'
        WHEN coalesce(m->>'assigneeId','')<>'' THEN pg_catalog.jsonb_build_array(m->>'assigneeId') ELSE '[]'::jsonb END;
      eligible:=CASE WHEN m->'allFamily'='true'::jsonb OR declared='[]'::jsonb THEN coalesce(people,'[]') ELSE declared END;
      IF c->>'category'='child' AND (NOT(eligible @> pg_catalog.jsonb_build_array(c->>'memberId'))
          OR NOT(request_participants @> pg_catalog.jsonb_build_array(c->>'memberId'))
          OR (m->'allFamily' IS DISTINCT FROM 'true'::jsonb AND declared='[]'::jsonb)) THEN
        RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Mission non attribuée à cet enfant';
      END IF;
      IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(request_participants) p
          WHERE NOT(coalesce(people,'[]') @> pg_catalog.jsonb_build_array(p))
            OR NOT(eligible @> pg_catalog.jsonb_build_array(p))) THEN
        RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Participant non humain, absent ou non attribué';
      END IF;
      IF m?'seriesId' AND (NOT dobby_socle_private.missions_occurrence_valid(m,desired->'manualMissions')
          OR (m->>'occurrenceDate')::date>(pg_catalog.clock_timestamp() AT TIME ZONE 'Europe/Brussels')::date) THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Occurrence non éligible';
      END IF;
      IF coalesce(m->>'status','open')='done' THEN changed:=false;
      ELSE
        IF award IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Gain actif incompatible avec la mission ouverte'; END IF;
        IF m->'rewardVersion'='1'::jsonb THEN
          total:=CASE m->>'effort' WHEN 'light' THEN 10 WHEN 'regular' THEN 25 WHEN 'major' THEN 50 END;
          IF m?'customRunes' THEN total:=dobby_runes_private.safe_integer(m->'customRunes','Récompense'); END IF;
          allocations:=dobby_socle_private.missions_allocations(total,request_participants);
          SELECT count(*) INTO cycle FROM pg_catalog.jsonb_array_elements(history) e WHERE e->>'missionId'=id AND coalesce(e->>'kind','grant')='grant';
          PERFORM dobby_runes_private.safe_integer(pg_catalog.to_jsonb(cycle),'Cycle');
          entry:=pg_catalog.jsonb_build_object('missionId',id,'memberId',allocations->0->>'memberId','effort',m->>'effort',
            'amount',total,'date',stamp,'title',m->>'title','eventId',id||'~'||cycle::bigint::text||'~grant',
            'kind','grant','cycle',cycle,'allocations',allocations,'revision',p_expected_revision+1);
          IF m?'customRunes' THEN entry:=entry||pg_catalog.jsonb_build_object('customRunes',m->'customRunes'); END IF;
          history:=history||pg_catalog.jsonb_build_array(entry);
        END IF;
        m:=m||pg_catalog.jsonb_build_object('status','done','completedAt',stamp);
      END IF;
    ELSE
      IF coalesce(m->>'status','open')='open' THEN changed:=false;
      ELSE
        IF award IS NOT NULL THEN
          cycle:=coalesce((award->>'cycle')::numeric,0);
          entry:=(award-'revision')||pg_catalog.jsonb_build_object('eventId',id||'~'||cycle::bigint::text||'~reversal',
            'kind','reversal','cycle',cycle,'reverses',dobby_runes_private.event_key(award),'date',stamp,'revision',p_expected_revision+1);
          history:=history||pg_catalog.jsonb_build_array(entry);
        END IF;
        m:=m||pg_catalog.jsonb_build_object('status','open','completedAt','');
      END IF;
    END IF;
    SELECT pg_catalog.jsonb_agg(CASE WHEN value->>'id'=id THEN m ELSE value END ORDER BY n) INTO selected
      FROM pg_catalog.jsonb_array_elements(desired->'manualMissions') WITH ORDINALITY x(value,n);
    desired:=desired||pg_catalog.jsonb_build_object('manualMissions',selected,'runeCredits',history);
  END IF;
  active:=dobby_socle_private.missions_assert_payload(desired);
  changed:=changed OR desired IS DISTINCT FROM old_payload;
  FOR m IN SELECT value FROM pg_catalog.jsonb_array_elements(coalesce(desired->'manualMissions','[]')) LOOP
    IF active?(m->>'id') AND coalesce(m->>'status','open')<>'done' THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Gain actif exige une mission terminée';
    END IF;
  END LOOP;
  -- Never sort, normalize or reconstruct confirmed historical credits.
  IF current_row.household_id IS NULL THEN
    INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES(p_household_id,'missions',desired) RETURNING * INTO current_row;
  ELSIF changed THEN
    UPDATE public.dobby_v2_modules SET payload=desired WHERE household_id=p_household_id AND module='missions' RETURNING * INTO current_row;
  END IF;
  rev:=current_row.revision;
  IF changed AND rev<>p_expected_revision+1 THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Révision serveur Missions incohérente';
  END IF;
  INSERT INTO dobby_socle_private.mission_operations(household_id,operation_id,actor_id,expected_revision,applied_revision,request_digest)
    VALUES(p_household_id,p_operation_id,actor,p_expected_revision,rev,digest);
  RETURN pg_catalog.jsonb_build_object('protocol',3,'replayed',false,
    'operation',pg_catalog.jsonb_build_object('id',p_operation_id,'revision',rev,'digest',digest,'changed',changed),
    'module',pg_catalog.jsonb_build_object('module','missions','payload',current_row.payload,'revision',rev,'updated_at',current_row.updated_at));
END $writer$;

CREATE FUNCTION public.dobby_missions_v3_capabilities(p_household_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $capabilities$
DECLARE c jsonb;
BEGIN
  c:=dobby_socle_private.actor_context(p_household_id,false);
  IF p_household_id IS NULL OR c->>'phase' IS DISTINCT FROM 'active'
    OR c->>'householdId' IS DISTINCT FROM p_household_id::text THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Liaison canonique au foyer requise';
  END IF;
  RETURN pg_catalog.jsonb_build_object('protocol',3,'intentVersion',1,'participantVersion',1,
    'ledgerVersions',pg_catalog.jsonb_build_array(1,2,3),'maxPayloadBytes',262144,
    'directWritesBlocked',true,'atomicAllocations',true,'canonicalAuthorization',true,
    'contract','dobby-missions-intents-v3-1',
    'clientVerified',coalesce(c->'permissions'->'canCompleteMissionsV3'='true'::jsonb,false));
END $capabilities$;

REVOKE ALL ON FUNCTION dobby_socle_private.missions_id_key(text),
 dobby_socle_private.missions_allocations(numeric,jsonb),dobby_socle_private.missions_assert_event(jsonb),
 dobby_socle_private.missions_assert_ledger(jsonb),dobby_socle_private.missions_assert_mission(jsonb),
 dobby_socle_private.missions_assert_payload(jsonb),dobby_socle_private.missions_occurrence_valid(jsonb,jsonb)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb),
 public.dobby_missions_v3_capabilities(uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb),
 public.dobby_missions_v3_capabilities(uuid) TO authenticated;
RESET ROLE;
REVOKE CREATE ON SCHEMA public,dobby_socle_private FROM dobby_socle_writer;
GRANT dobby_socle_writer TO CURRENT_USER WITH INHERIT FALSE, SET FALSE;
NOTIFY pgrst,'reload schema';
COMMIT;
