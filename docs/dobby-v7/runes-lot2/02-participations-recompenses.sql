-- DOBBY Missions, Runes et récompenses, lot 2. Migration manuelle, après recette séparée.
-- Dépend de la version exacte du lot 1 Runes (01-etendre-registre-v3.sql).
-- Garde les ACL, la RLS, le writer et les reçus existants. Aucun DML de données métier.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

DO $preflight$
DECLARE expected record; signature regprocedure; routine pg_catalog.pg_proc%ROWTYPE;
BEGIN
  IF current_user<>'postgres' OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles
     WHERE rolname='dobby_socle_writer' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls
       AND NOT rolcreaterole AND NOT rolcreatedb)
     OR pg_catalog.pg_has_role('authenticated','dobby_socle_writer','MEMBER')
     OR pg_catalog.pg_has_role('anon','dobby_socle_writer','MEMBER')
     OR pg_catalog.pg_has_role('service_role','dobby_socle_writer','MEMBER') THEN
    RAISE EXCEPTION 'Socle de sécurité Missions V3 non reconnu';
  END IF;
  IF pg_catalog.to_regclass('dobby_socle_private.mission_operations') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class
        WHERE oid=pg_catalog.to_regclass('dobby_socle_private.mission_operations')
          AND relrowsecurity AND relforcerowsecurity)
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
        WHERE tgrelid='public.dobby_v2_modules'::regclass AND tgname='dobby_missions_v2_guard'
          AND tgenabled IN ('O','A') AND tgfoid=pg_catalog.to_regprocedure('dobby_runes_private.guard_missions()')) THEN
    RAISE EXCEPTION 'Garde Missions ou registre privé des reçus absent';
  END IF;
  FOR expected IN SELECT * FROM (VALUES
    ('public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)', 'cadc710ffa9b798475eadf661b4a237738921a7611e12dfa12a56b85e86f468f', true),
    ('public.dobby_missions_v3_capabilities(uuid)', '78ff1904d819b3845c7dd24fb6e89025346ba12da092026ced82db16b51ccf6b', true)
  ) v(name,body_sha256,definer) LOOP
    signature:=pg_catalog.to_regprocedure(expected.name);
    SELECT * INTO routine FROM pg_catalog.pg_proc WHERE oid=signature;
    IF NOT FOUND OR routine.proowner<>'dobby_socle_writer'::regrole
       OR routine.prosecdef<>expected.definer OR routine.proconfig IS DISTINCT FROM ARRAY['search_path=""']
       OR pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
         pg_catalog.replace(routine.prosrc,E'\r\n',E'\n'),'UTF8')),'hex') IS DISTINCT FROM expected.body_sha256
       OR pg_catalog.has_function_privilege('anon',signature,'EXECUTE')
       OR pg_catalog.has_function_privilege('service_role',signature,'EXECUTE')
       OR pg_catalog.has_function_privilege('authenticated',signature,'EXECUTE')<>expected.definer THEN
      RAISE EXCEPTION 'Définition, propriétaire ou droits Missions inattendus : %',expected.name;
    END IF;
  END LOOP;
END $preflight$;

GRANT dobby_socle_writer TO CURRENT_USER WITH INHERIT FALSE,SET TRUE;
GRANT CREATE ON SCHEMA dobby_socle_private,public TO dobby_socle_writer;
SET LOCAL ROLE dobby_socle_writer;

-- Confidential preparation is isolated from the shared Missions payload.
-- There is no browser table grant. Revealing a reward is a writer transaction.
CREATE TABLE dobby_socle_private.rune_reward_surprises(
  household_id uuid NOT NULL REFERENCES public.dobby_v2_households(id),
  goal_id uuid NOT NULL,
  title text NOT NULL CHECK(pg_catalog.length(title) BETWEEN 1 AND 160),
  PRIMARY KEY(household_id,goal_id)
);
ALTER TABLE dobby_socle_private.rune_reward_surprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE dobby_socle_private.rune_reward_surprises FORCE ROW LEVEL SECURITY;
CREATE POLICY rune_reward_writer ON dobby_socle_private.rune_reward_surprises
  TO dobby_socle_writer USING(true) WITH CHECK(true);
REVOKE ALL ON dobby_socle_private.rune_reward_surprises FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION dobby_socle_private.missions_lot2_child(p_family jsonb,p_member text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $child$
  SELECT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(p_family) p
    WHERE p->>'id'=p_member AND p->>'memberCategory'='child'
      AND coalesce(p->>'type','') NOT IN ('pet','animal','guardian','baby')
      AND coalesce(p->>'kind','') NOT IN ('pet','animal','guardian','baby'))
$child$;

CREATE FUNCTION dobby_socle_private.missions_lot2_participation(
 p jsonb, intent jsonb, op uuid, rev bigint, actor jsonb, family jsonb
) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $participation$
DECLARE m jsonb; last_event jsonb; event jsonb; credit jsonb;
  mission text:=intent->>'missionId'; member text:=intent->>'memberId'; action text:=intent->>'kind';
  note text:=intent->>'note'; status text; amount numeric; effort text;
  history jsonb:=coalesce(p->'missionParticipation','[]'); reward_id text;
  stamp text:=pg_catalog.to_char(pg_catalog.clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  today date:=(pg_catalog.clock_timestamp() AT TIME ZONE 'Europe/Brussels')::date;
  deadline date; occurrence date;
BEGIN
  IF pg_catalog.jsonb_typeof(intent->'memberId') IS DISTINCT FROM 'string'
    OR pg_catalog.jsonb_typeof(intent->'missionId') IS DISTINCT FROM 'string'
    OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_object_keys(intent) k
      WHERE k NOT IN ('kind','missionId','memberId') AND NOT(action IN ('refuse','regularize') AND k='note'))
    OR (intent?'note' AND (pg_catalog.jsonb_typeof(intent->'note') IS DISTINCT FROM 'string' OR pg_catalog.length(note)>240)) THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Intention de participation invalide';
  END IF;
  IF NOT dobby_socle_private.missions_lot2_child(family,member)
    OR (actor->>'category'='child' AND (member IS DISTINCT FROM actor->>'memberId' OR action<>'submit')) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Participation refusée pour ce profil';
  END IF;
  SELECT value INTO m FROM pg_catalog.jsonb_array_elements(p->'manualMissions')
   WHERE value->>'id'=mission;
  IF m IS NULL OR m->'individualRunes' IS DISTINCT FROM 'true'::jsonb
    OR NOT coalesce(m->'assigneeIds','[]') @> pg_catalog.jsonb_build_array(member) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Mission absente ou non assignée à cet enfant';
  END IF;
  occurrence:=coalesce(nullif(m->>'occurrenceDate',''),m->'recurrence'->'rules'->0->>'start')::date;
  IF occurrence>today OR NOT dobby_socle_private.missions_occurrence_valid(m,p->'manualMissions') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Occurrence non éligible';
  END IF;
  deadline:=coalesce(nullif(m->>'due','')::date,occurrence);
  SELECT value INTO last_event FROM pg_catalog.jsonb_array_elements(history) WITH ORDINALITY t(value,n)
    WHERE value->>'missionId'=mission AND value->>'memberId'=member ORDER BY n DESC LIMIT 1;
  status:=coalesce(last_event->>'status','open');
  IF action='submit' THEN
    IF status NOT IN ('open','refused') OR deadline<today THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Participation déjà traitée, en attente ou expirée';
    END IF;
    status:=CASE WHEN m->'approvalRequired'='true'::jsonb THEN 'pending' ELSE 'credited' END;
  ELSIF action IN ('approve','refuse') THEN
    IF status<>'pending' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Validation en attente requise'; END IF;
    status:=CASE WHEN action='approve' THEN 'credited' ELSE 'refused' END;
  ELSIF action='regularize' THEN
    IF status NOT IN ('open','refused') OR deadline IS NULL OR deadline>=today THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Participation expirée sans demande en attente requise';
    END IF;
    status:='credited';
  END IF;
  -- Freeze the award at submission. A late decision cannot change either
  -- the original amount or the right to review a timely submission.
  effort:=coalesce(CASE WHEN action IN ('approve','refuse') THEN last_event->>'effort' END,m->>'effort');
  amount:=CASE WHEN action IN ('approve','refuse') THEN (last_event->>'amount')::numeric
    WHEN m?'customRunes' THEN dobby_runes_private.safe_integer(m->'customRunes','Récompense')
    ELSE CASE effort WHEN 'light' THEN 10 WHEN 'regular' THEN 25 WHEN 'major' THEN 50 END END;
  IF amount IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Barème de participation requis'; END IF;
  event:=pg_catalog.jsonb_build_object('id',op,'revision',rev,'missionId',mission,'memberId',member,
     'action',action,'status',status,'date',stamp,'actorMemberId',actor->>'memberId',
     'effort',effort,'amount',amount);
  IF note IS NOT NULL AND dobby_runes_private.has_native_text(note) THEN
    event:=event||pg_catalog.jsonb_build_object('note',note);
  END IF;
  IF status='credited' THEN
    reward_id:='i2-'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
      pg_catalog.jsonb_build_array(mission,member)::text,'UTF8')),'hex');
    credit:=pg_catalog.jsonb_build_object('missionId',reward_id,'eventId',reward_id||'~0~grant',
      'memberId',member,'effort',effort,'customRunes',amount,'amount',amount,'date',stamp,'title',m->>'title',
      'revision',rev,'kind','grant','cycle',0,'allocations',pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object('memberId',member,'amount',amount)),
      'sourceMissionId',mission,'participationId',op,'actorMemberId',actor->>'memberId',
      'regularized',action='regularize');
    event:=event||pg_catalog.jsonb_build_object('creditId',credit->>'eventId');
    p:=pg_catalog.jsonb_set(p,'{runeCredits}',coalesce(p->'runeCredits','[]')||pg_catalog.jsonb_build_array(credit));
  END IF;
  RETURN pg_catalog.jsonb_set(p,'{missionParticipation}',history||pg_catalog.jsonb_build_array(event));
END $participation$;

-- Uses the authoritative Lot 1 balances including corrections and bonuses.
CREATE FUNCTION dobby_socle_private.missions_lot2_total(awards jsonb,member text) RETURNS numeric
LANGUAGE sql IMMUTABLE SET search_path='' AS $total$
  SELECT coalesce(sum((value->'amounts'->>member)::numeric),0)
  FROM pg_catalog.jsonb_each(awards) WHERE value->'active'='true'::jsonb
$total$;

CREATE FUNCTION dobby_socle_private.missions_lot2_rewards(
 p jsonb,intent jsonb,op uuid,rev bigint,actor jsonb,family jsonb,home uuid,awards jsonb
) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $rewards$
DECLARE goals jsonb:=coalesce(p->'runeGoals','{}'); past jsonb:=coalesce(p->'runeRewards','[]');
  member text:=intent->>'memberId'; action text:=intent->>'kind'; title text:=intent->>'title';
  goal jsonb; mode text:=intent->>'mode'; threshold numeric; current_total numeric; target_goal uuid;
  stamp text:=pg_catalog.to_char(pg_catalog.clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
BEGIN
  IF pg_catalog.jsonb_typeof(intent->'memberId') IS DISTINCT FROM 'string'
    OR NOT dobby_socle_private.missions_lot2_child(family,member)
    OR actor->>'category' IS DISTINCT FROM 'parent' THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Parent vérifié et enfant du foyer requis';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_object_keys(intent) k WHERE k NOT IN ('kind','memberId','title')
      AND NOT(action='reward-set' AND k IN ('mode','threshold'))
      AND NOT(action='reward-confirm' AND k='goalId'))
    OR (intent?'title' AND (pg_catalog.jsonb_typeof(intent->'title') IS DISTINCT FROM 'string'
      OR NOT dobby_runes_private.has_native_text(title) OR pg_catalog.length(title)>160)) THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Intention de récompense invalide';
  END IF;
  current_total:=dobby_socle_private.missions_lot2_total(awards,member);
  goal:=goals->member;
  IF action='reward-set' THEN
    threshold:=dobby_runes_private.safe_integer(intent->'threshold','Seuil');
    IF goal IS NOT NULL OR threshold<=current_total
      OR threshold<=coalesce((SELECT max((value->>'threshold')::numeric)
         FROM pg_catalog.jsonb_array_elements(past) WHERE value->>'memberId'=member),0)
      OR mode IS NULL OR mode NOT IN ('announced','surprise') OR (mode='announced' AND title IS NULL) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Un seul palier actif, supérieur au capital et au dernier seuil';
    END IF;
    goal:=pg_catalog.jsonb_build_object('id',op,'threshold',threshold,'mode',mode,'unlocked',false,'date',stamp);
    IF mode='announced' THEN goal:=goal||pg_catalog.jsonb_build_object('title',title);
    ELSIF title IS NOT NULL THEN
      INSERT INTO dobby_socle_private.rune_reward_surprises(household_id,goal_id,title) VALUES(home,op,title);
    END IF;
    RETURN pg_catalog.jsonb_set(p,'{runeGoals}',pg_catalog.jsonb_set(goals,ARRAY[member],goal));
  END IF;
  IF goal IS NULL OR goal->>'id' IS DISTINCT FROM intent->>'goalId'
    OR current_total<(goal->>'threshold')::numeric THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Récompense absente, verrouillée ou déjà confirmée';
  END IF;
  target_goal:=(goal->>'id')::uuid;
  IF goal->>'mode'='announced' THEN title:=goal->>'title';
  ELSIF title IS NULL THEN
    SELECT s.title INTO title FROM dobby_socle_private.rune_reward_surprises s
      WHERE s.household_id=home AND s.goal_id=target_goal;
  END IF;
  IF title IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Indiquez la récompense surprise à révéler'; END IF;
  RETURN p||pg_catalog.jsonb_build_object('runeGoals',goals-member,'runeRewards',
    past||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('id',target_goal,'confirmationId',op,
      'memberId',member,'threshold',goal->'threshold','mode',goal->'mode','title',title,
      'date',stamp,'revision',rev,'actorMemberId',actor->>'memberId')));
END $rewards$;

CREATE FUNCTION dobby_socle_private.missions_lot2_alerts(p jsonb,awards jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $alerts$
 SELECT CASE WHEN p?'runeGoals' THEN pg_catalog.jsonb_set(p,'{runeGoals}',coalesce((
   SELECT pg_catalog.jsonb_object_agg(key,value||pg_catalog.jsonb_build_object(
     'unlocked',dobby_socle_private.missions_lot2_total(awards,key)>=(value->>'threshold')::numeric))
   FROM pg_catalog.jsonb_each(p->'runeGoals')), '{}'::jsonb)) ELSE p END
$alerts$;

-- Derive native occurrences from the stored series and the Brussels date.
-- A child may request materialization but supplies no date, template or amount.
CREATE FUNCTION dobby_socle_private.missions_lot2_project(p jsonb,intent jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path='' AS $project$
DECLARE rows jsonb:=p->'manualMissions'; series jsonb; rule jsonb; occurrence jsonb;
  day date; n integer; last_day integer; id text; deadline text;
  today date:=(pg_catalog.clock_timestamp() AT TIME ZONE 'Europe/Brussels')::date;
BEGIN
  IF intent IS DISTINCT FROM '{"kind":"project"}'::jsonb THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Projection Missions invalide';
  END IF;
  FOR series IN SELECT value FROM pg_catalog.jsonb_array_elements(rows) WHERE value?'recurrence'
    AND value->'individualRunes'='true'::jsonb LOOP
    FOR n IN 0..30 LOOP
      day:=today-30+n;
      SELECT value INTO rule FROM pg_catalog.jsonb_array_elements(series->'recurrence'->'rules')
        WITH ORDINALITY x(value,i) WHERE value->>'from'<=day::text ORDER BY i DESC LIMIT 1;
      IF rule IS NULL OR rule->>'state'<>'active' OR day<(rule->>'start')::date
        OR day::text=series->'recurrence'->'rules'->0->>'start' THEN CONTINUE; END IF;
      IF rule->>'frequency'='weekly' AND NOT rule->'weekdays' @> pg_catalog.jsonb_build_array(extract(dow FROM day)::integer)
        THEN CONTINUE; END IF;
      IF rule->>'frequency'='monthly' THEN
        last_day:=extract(day FROM (pg_catalog.date_trunc('month',day::timestamp)+interval '1 month - 1 day'))::integer;
        IF extract(day FROM day)::integer<>least(last_day,(rule->>'monthDay')::integer) THEN CONTINUE; END IF;
      END IF;
      id:=series->>'id'||'-r'||pg_catalog.replace(day::text,'-','');
      IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(rows) x WHERE x->>'id'=id) THEN CONTINUE; END IF;
      deadline:=CASE WHEN rule->'template'->'deadlineOffsetDays'='null'::jsonb THEN ''
        ELSE (day+coalesce((rule->'template'->>'deadlineOffsetDays')::integer,0))::text END;
      occurrence:=(rule->'template')||pg_catalog.jsonb_build_object('id',id,'due',deadline,'status','open',
        'seriesId',series->>'id','occurrenceDate',day::text,'createdAt',day::text||'T12:00:00.000Z','completedAt','');
      rows:=rows||pg_catalog.jsonb_build_array(occurrence);
    END LOOP;
  END LOOP;
  RETURN pg_catalog.jsonb_set(p,'{manualMissions}',rows);
END $project$;

REVOKE ALL ON FUNCTION dobby_socle_private.missions_lot2_child(jsonb,text),
 dobby_socle_private.missions_lot2_participation(jsonb,jsonb,uuid,bigint,jsonb,jsonb),
 dobby_socle_private.missions_lot2_total(jsonb,text),
 dobby_socle_private.missions_lot2_rewards(jsonb,jsonb,uuid,bigint,jsonb,jsonb,uuid,jsonb),
 dobby_socle_private.missions_lot2_alerts(jsonb,jsonb),
 dobby_socle_private.missions_lot2_project(jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.dobby_missions_v3_write(p_household_id uuid,p_expected_revision bigint,
 p_operation_id uuid,p_intent jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $writer$
DECLARE c jsonb; actor uuid; current_row public.dobby_v2_modules%ROWTYPE;
 receipt dobby_socle_private.mission_operations%ROWTYPE; digest text; kind text;
 old_payload jsonb; desired jsonb; incoming jsonb; history jsonb; active jsonb;
 m jsonb; previous jsonb; entry jsonb; award jsonb; allocations jsonb; people jsonb; family_members jsonb;
 id text; k text; request_participants jsonb; declared jsonb; eligible jsonb; selected jsonb;
 total numeric; cycle numeric; stamp text; changed boolean:=true; rev bigint; old_rules jsonb; new_rules jsonb;
 editable text[]:=ARRAY['title','category','assigneeId','assigneeIds','allFamily','participantVersion',
 'priority','deadlineOffsetDays','note','due','effort','customRunes','recurrence','approvalRequired','individualRunes'];
BEGIN
  IF p_operation_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision NOT BETWEEN 0 AND 9007199254740990
    OR pg_catalog.jsonb_typeof(p_intent) IS DISTINCT FROM 'object' OR pg_catalog.octet_length(p_intent::text)>262144 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Opération ou intention Missions invalide';
  END IF;
  kind:=p_intent->>'kind';
  IF kind NOT IN ('snapshot','complete','reopen','bonus','correction','submit','approve','refuse','regularize','reward-set','reward-confirm','project') OR kind IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Intention Missions inconnue';
  END IF;
  c:=dobby_socle_private.actor_context(p_household_id,true);actor:=(c->>'userId')::uuid;
  IF p_household_id IS NULL OR c->>'phase' IS DISTINCT FROM 'active'
    OR c->>'householdId' IS DISTINCT FROM p_household_id::text
    OR c->>'category' NOT IN ('parent','child') OR c->>'category' IS NULL
    OR kind NOT IN ('complete','submit','project') AND c->>'category'<>'parent' THEN
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
  IF kind IN ('submit','approve','refuse','regularize') THEN
    desired:=dobby_socle_private.missions_lot2_participation(desired,p_intent,p_operation_id,p_expected_revision+1,c,family_members);
  ELSIF kind='project' THEN
    IF current_row.household_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Partage Missions à activer';
    END IF;
    desired:=dobby_socle_private.missions_lot2_project(desired,p_intent);
    changed:=false;
  ELSIF kind IN ('reward-set','reward-confirm') THEN
    IF current_row.household_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Activez le partage Missions avant de gérer les récompenses';
    END IF;
    desired:=dobby_socle_private.missions_lot2_rewards(desired,p_intent,p_operation_id,p_expected_revision+1,c,
      family_members,p_household_id,dobby_socle_private.missions_lot1_balances(history,active));
  ELSIF kind IN ('bonus','correction') THEN
    IF current_row.household_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Activez le partage Missions avant de gérer les Runes';
    END IF;
    entry:=dobby_socle_private.missions_lot1_entry(p_intent,p_operation_id,p_expected_revision+1,
      c->>'memberId',family_members,dobby_socle_private.missions_lot1_balances(history,active));
    desired:=pg_catalog.jsonb_set(desired,ARRAY['runeCredits'],history||pg_catalog.jsonb_build_array(entry));
  ELSIF kind='snapshot' THEN
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
          OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(coalesce(old_payload->'missionParticipation','[]')) e
            WHERE e->>'missionId'=id)
          OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(history) e WHERE e->>'missionId'=id) THEN
          RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Mission historique conservée';
        END IF;
        CONTINUE;
      END IF;
      IF (previous->'individualRunes'='true'::jsonb AND m->'individualRunes' IS DISTINCT FROM 'true'::jsonb)
        OR (m->'individualRunes'='true'::jsonb AND previous->'individualRunes' IS DISTINCT FROM 'true'::jsonb)
        OR (m->'individualRunes'='true'::jsonb AND EXISTS(
          SELECT 1 FROM pg_catalog.jsonb_array_elements(coalesce(old_payload->'missionParticipation','[]')) e WHERE e->>'missionId'=id)
          AND (m->'assigneeIds' IS DISTINCT FROM previous->'assigneeIds' OR m->'due' IS DISTINCT FROM previous->'due')) THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Mode et attributions historiques de participation conservés';
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
      IF (m?'individualRunes' AND m->'individualRunes' IS DISTINCT FROM 'true'::jsonb)
        OR (m?'approvalRequired' AND (m->'individualRunes' IS DISTINCT FROM 'true'::jsonb
          OR pg_catalog.jsonb_typeof(m->'approvalRequired') IS DISTINCT FROM 'boolean')) THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Mode de validation des participations invalide';
      END IF;
      IF m->'individualRunes'='true'::jsonb AND (m->'allFamily'='true'::jsonb
        OR m->'rewardVersion' IS DISTINCT FROM '1'::jsonb OR pg_catalog.jsonb_array_length(coalesce(m->'assigneeIds','[]'))=0
        OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements_text(m->'assigneeIds') person
          WHERE NOT dobby_socle_private.missions_lot2_child(family_members,person)
            AND NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(coalesce(old_payload->'manualMissions','[]')) old
              WHERE old->>'id'=m->>'id' AND old->'assigneeIds' @> pg_catalog.jsonb_build_array(person)))) THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Choisissez des enfants du foyer pour cette mission';
      END IF;
      IF NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(coalesce(old_payload->'manualMissions','[]')) x WHERE x->>'id'=m->>'id') THEN
        IF coalesce(m->>'status','open')<>'open' OR m->>'id' LIKE 'i2-%'
          OR (m->'individualRunes'='true'::jsonb AND m?'seriesId')
          OR NOT dobby_socle_private.missions_occurrence_valid(m,desired->'manualMissions') THEN
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
    IF m IS NULL OR m->'individualRunes'='true'::jsonb THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Mission absente ou intention de participation individuelle requise';
    END IF;
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
      -- Independent child participation will be handled in lot 2. Until
      -- then a child can only complete their own single-assignee mission.
      IF c->>'category'='child' AND (
          request_participants IS DISTINCT FROM pg_catalog.jsonb_build_array(c->>'memberId')
          OR declared IS DISTINCT FROM request_participants OR m->'allFamily'='true'::jsonb) THEN
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
            'kind','grant','cycle',cycle,'allocations',allocations,'revision',p_expected_revision+1,
            'actorMemberId',c->>'memberId');
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
            'kind','reversal','cycle',cycle,'reverses',dobby_runes_private.event_key(award),'date',stamp,'revision',p_expected_revision+1,
            'actorMemberId',c->>'memberId');
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
  IF desired?'runeGoals' THEN
    desired:=dobby_socle_private.missions_lot2_alerts(desired,dobby_socle_private.missions_lot1_balances(
      coalesce(desired->'runeCredits','[]'),active));
    active:=dobby_socle_private.missions_assert_payload(desired);
  END IF;
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

CREATE OR REPLACE FUNCTION public.dobby_missions_v3_capabilities(p_household_id uuid) RETURNS jsonb
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
    'contract','dobby-missions-intents-v3-1','runesLot1',1,'runesLot2',1,
    'clientVerified',coalesce(c->'permissions'->'canCompleteMissionsV3'='true'::jsonb,false));
END $capabilities$;

RESET ROLE;
REVOKE CREATE ON SCHEMA dobby_socle_private,public FROM dobby_socle_writer;
GRANT dobby_socle_writer TO CURRENT_USER WITH INHERIT FALSE,SET FALSE;
NOTIFY pgrst,'reload schema';
COMMIT;
