-- DOBBY Missions / Runes, lot 1. Migration manuelle, après recette séparée.
-- Dépend de la version exacte du socle Missions V3 (01-apply.sql).
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
    ('dobby_socle_private.missions_assert_payload(jsonb)', 'bcb9834b5236b5d17c0a8e487622727185381b338115e5ca4262576e4d55e36c', false),
    ('public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)', '62185f4fce67d9ec9598a930fd5b661ca6ec8c84c98e3d13cd09289cdef122f1', true),
    ('public.dobby_missions_v3_capabilities(uuid)', 'd713ef392c6556e1bbf27af38a5b62a57b2a330d92c2d344ad361452b3294a57', true)
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

-- Projection des attributions par événement et bénéficiaire. Les crédits
-- anciens et leurs annulations restent validés par le moteur existant.
CREATE FUNCTION dobby_socle_private.missions_lot1_balances(p_rows jsonb, p_active jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $balances$
DECLARE e jsonb; k text; part jsonb; member text; target text; amount numeric;
        previous numeric; rev numeric; last_revision numeric:=0; total numeric;
        awards jsonb:='{}'; totals jsonb:='{}'; parts jsonb;
BEGIN
  FOR e IN SELECT value FROM pg_catalog.jsonb_array_elements(p_rows)
    WHERE coalesce(value->>'kind','grant') NOT IN ('bonus','correction','reversal') LOOP
    SELECT pg_catalog.jsonb_object_agg(p->>'memberId',p->'amount') INTO parts
      FROM pg_catalog.jsonb_array_elements(coalesce(e->'allocations',pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object('memberId',e->>'memberId','amount',e->'amount')))) p;
    k:=dobby_runes_private.event_key(e);
    awards:=pg_catalog.jsonb_set(awards,ARRAY[k],pg_catalog.jsonb_build_object(
      'active',coalesce(dobby_runes_private.event_key(p_active->(e->>'missionId'))=k,false),
      'revision',e->'revision','amounts',parts));
  END LOOP;
  FOR e IN SELECT value FROM pg_catalog.jsonb_array_elements(p_rows) WITH ORDINALITY x(value,n)
    WHERE value->>'kind' IN ('bonus','correction') ORDER BY n LOOP
    k:=e->>'eventId'; member:=e->>'memberId';
    amount:=dobby_runes_private.safe_integer(e->'amount','Montant');
    rev:=dobby_runes_private.safe_integer(e->'revision','Révision');
    IF coalesce(k,'') !~ '^rune:[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
      OR rev<=last_revision
      OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(p_rows) x
        WHERE dobby_runes_private.event_key(x)=k GROUP BY dobby_runes_private.event_key(x) HAVING count(*)>1)
      OR pg_catalog.jsonb_typeof(e->'memberId') IS DISTINCT FROM 'string'
      OR pg_catalog.jsonb_typeof(e->'actorMemberId') IS DISTINCT FROM 'string'
      OR NOT dobby_runes_private.has_native_text(member) OR pg_catalog.length(member)>120
      OR NOT dobby_runes_private.has_native_text(e->>'actorMemberId') OR pg_catalog.length(e->>'actorMemberId')>120
      OR pg_catalog.jsonb_typeof(e->'reason') IS DISTINCT FROM 'string'
      OR NOT dobby_runes_private.has_native_text(e->>'reason') OR pg_catalog.length(e->>'reason')>240
      OR coalesce(e->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$' THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Écriture de Runes invalide';
    END IF;
    last_revision:=rev;
    IF e->>'kind'='bonus' THEN
      IF amount=0 THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Bonus strictement positif requis'; END IF;
      awards:=pg_catalog.jsonb_set(awards,ARRAY[k],pg_catalog.jsonb_build_object(
        'active',true,'revision',rev,'amounts',pg_catalog.jsonb_build_object(member,amount)));
    ELSE
      target:=e->>'targetEventId';
      previous:=dobby_runes_private.safe_integer(e->'previousAmount','Montant précédent');
      IF pg_catalog.jsonb_typeof(e->'targetEventId') IS DISTINCT FROM 'string'
        OR (awards->target->>'revision')::numeric>=rev
        OR (awards #>> ARRAY[target,'amounts',member])::numeric IS DISTINCT FROM previous OR amount=previous THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Correction incohérente avec l’attribution d’origine';
      END IF;
      awards:=pg_catalog.jsonb_set(awards,ARRAY[target,'amounts',member],e->'amount',false);
    END IF;
  END LOOP;
  FOR part IN SELECT value FROM pg_catalog.jsonb_each(awards) WHERE value->'active'='true'::jsonb LOOP
    FOR member,amount IN SELECT key,value::numeric FROM pg_catalog.jsonb_each(part->'amounts') LOOP
      total:=coalesce((totals->>member)::numeric,0)+amount;
      IF total>9007199254740991 THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Total actif de Runes hors capacité numérique';
      END IF;
      totals:=pg_catalog.jsonb_set(totals,ARRAY[member],pg_catalog.to_jsonb(total));
    END LOOP;
  END LOOP;
  RETURN awards;
END $balances$;

CREATE FUNCTION dobby_socle_private.missions_lot1_entry(
 p_intent jsonb,p_operation uuid,p_revision bigint,p_actor text,p_members jsonb,p_awards jsonb
) RETURNS jsonb
LANGUAGE plpgsql SET search_path='' AS $entry$
DECLARE kind text:=p_intent->>'kind'; member text:=p_intent->>'memberId'; reason text:=p_intent->>'reason';
        target text; amount numeric; previous numeric; entry jsonb;
BEGIN
  IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_object_keys(p_intent) k
    WHERE k NOT IN ('kind','memberId','amount','reason') AND NOT(kind='correction' AND k IN ('targetEventId','expectedAmount')))
    OR pg_catalog.jsonb_typeof(p_intent->'memberId') IS DISTINCT FROM 'string'
    OR NOT dobby_runes_private.has_native_text(member) OR pg_catalog.length(member)>120
    OR pg_catalog.jsonb_typeof(p_intent->'reason') IS DISTINCT FROM 'string'
    OR NOT dobby_runes_private.has_native_text(reason) OR pg_catalog.length(reason)>240 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Destinataire ou motif de Runes invalide';
  END IF;
  amount:=dobby_runes_private.safe_integer(p_intent->'amount','Montant');
  entry:=pg_catalog.jsonb_build_object('kind',kind,'eventId','rune:'||p_operation::text,
    'memberId',member,'amount',amount,'reason',reason,'actorMemberId',p_actor,
    'date',pg_catalog.to_char(pg_catalog.clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'revision',p_revision);
  IF kind='bonus' THEN
    IF amount=0 THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Bonus strictement positif requis'; END IF;
    IF NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(p_members) e
      WHERE e->>'id'=member AND e->>'memberCategory'='child'
      AND coalesce(e->>'type','') NOT IN ('pet','animal','guardian','baby')
      AND coalesce(e->>'kind','') NOT IN ('pet','animal','guardian','baby')) THEN
      RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Enfant du foyer requis pour le bonus';
    END IF;
  ELSE
    target:=p_intent->>'targetEventId';
    IF pg_catalog.jsonb_typeof(p_intent->'targetEventId') IS DISTINCT FROM 'string'
      OR NOT dobby_runes_private.has_native_text(target) OR dobby_runes_private.utf16_length(target)>240 THEN
      RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Attribution à corriger invalide';
    END IF;
    previous:=dobby_runes_private.safe_integer(p_intent->'expectedAmount','Montant attendu');
    IF (p_awards->target->'active') IS DISTINCT FROM 'true'::jsonb
      OR (p_awards #>> ARRAY[target,'amounts',member])::numeric IS DISTINCT FROM previous THEN
      RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Attribution à corriger modifiée ou inactive : relire le journal';
    END IF;
    IF previous=amount THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Le montant de l’attribution est inchangé'; END IF;
    entry:=entry||pg_catalog.jsonb_build_object('targetEventId',target,'previousAmount',previous);
  END IF;
  RETURN entry;
END $entry$;
REVOKE ALL ON FUNCTION dobby_socle_private.missions_lot1_balances(jsonb,jsonb),
 dobby_socle_private.missions_lot1_entry(jsonb,uuid,bigint,text,jsonb,jsonb)
 FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION dobby_socle_private.missions_assert_payload(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $payload$
DECLARE m jsonb; seen jsonb:='{}'; id text; history jsonb; mission_credits jsonb; active jsonb;
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
  history:=coalesce(p_payload->'runeCredits','[]');
  IF pg_catalog.jsonb_typeof(history) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Historique de Runes invalide';
  END IF;
  SELECT coalesce(pg_catalog.jsonb_agg(value ORDER BY n),'[]'::jsonb) INTO mission_credits
    FROM pg_catalog.jsonb_array_elements(history) WITH ORDINALITY x(value,n)
    WHERE coalesce(value->>'kind','grant') NOT IN ('bonus','correction');
  active:=dobby_socle_private.missions_assert_ledger(mission_credits);
  IF pg_catalog.jsonb_array_length(history)<>pg_catalog.jsonb_array_length(mission_credits) THEN
    PERFORM dobby_socle_private.missions_lot1_balances(history,active);
  END IF;
  RETURN active;
END $payload$;

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
 'priority','deadlineOffsetDays','note','due','effort','customRunes','recurrence'];
BEGIN
  IF p_operation_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision NOT BETWEEN 0 AND 9007199254740990
    OR pg_catalog.jsonb_typeof(p_intent) IS DISTINCT FROM 'object' OR pg_catalog.octet_length(p_intent::text)>262144 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Opération ou intention Missions invalide';
  END IF;
  kind:=p_intent->>'kind';
  IF kind NOT IN ('snapshot','complete','reopen','bonus','correction') OR kind IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Intention Missions inconnue';
  END IF;
  c:=dobby_socle_private.actor_context(p_household_id,true);actor:=(c->>'userId')::uuid;
  IF p_household_id IS NULL OR c->>'phase' IS DISTINCT FROM 'active'
    OR c->>'householdId' IS DISTINCT FROM p_household_id::text
    OR c->>'category' NOT IN ('parent','child') OR c->>'category' IS NULL
    OR kind<>'complete' AND c->>'category'<>'parent' THEN
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
  IF kind IN ('bonus','correction') THEN
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
    'contract','dobby-missions-intents-v3-1','runesLot1',1,
    'clientVerified',coalesce(c->'permissions'->'canCompleteMissionsV3'='true'::jsonb,false));
END $capabilities$;

RESET ROLE;
REVOKE CREATE ON SCHEMA dobby_socle_private,public FROM dobby_socle_writer;
GRANT dobby_socle_writer TO CURRENT_USER WITH INHERIT FALSE,SET FALSE;
NOTIFY pgrst,'reload schema';
COMMIT;
