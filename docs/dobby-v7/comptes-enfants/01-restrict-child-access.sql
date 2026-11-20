-- Proposition DOBBY V7. Installer ensemble les restrictions et l'attestation.
-- Les portes de recette existantes restent nécessaires et ne sont pas modifiées.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

DO $preflight$
DECLARE part record; fn pg_catalog.pg_proc%ROWTYPE;
BEGIN
 IF current_user<>'postgres' OR NOT EXISTS(
     SELECT 1 FROM pg_roles WHERE rolname='dobby_socle_writer' AND NOT rolcanlogin
       AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole)
   OR EXISTS(
     SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')
       AND pg_has_role(oid,'dobby_socle_writer','MEMBER'))
   OR to_regprocedure('public.dobby_v7_child_module(uuid,text)') IS NOT NULL
   OR to_regclass('dobby_socle_private.rune_reward_surprises') IS NULL
   OR NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='dobby-family-files' AND public=false)
   OR (SELECT count(*) FROM pg_class WHERE oid IN ('public.dobby_v2_modules'::regclass,'storage.objects'::regclass)
       AND relrowsecurity)<>2
   OR NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.dobby_v2_modules'::regclass
       AND polname='dobby_socle_canonical_read' AND NOT polpermissive AND polcmd='r'
       AND polroles=ARRAY['authenticated'::regrole::oid])
   OR NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='storage.objects'::regclass
       AND polname='dobby_socle_canonical_read' AND NOT polpermissive AND polcmd='r'
       AND polroles=ARRAY['authenticated'::regrole::oid]) THEN
   RAISE EXCEPTION 'Socles Famille, Storage ou Runes lot 2 non reconnus, ou proposition déjà installée';
 END IF;
 FOR part IN SELECT * FROM (VALUES
   ('public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)','dobby_socle_writer','afecb096753bae0b9dce5a7ff5646a14429db5c67aab930097d0af492dc3db26'),
   ('public.dobby_missions_v3_capabilities(uuid)','dobby_socle_writer','3465d0a9fa77472aab25d97dc0309959c41504f05096b2198637e0a00ae5a3f6'),
   ('dobby_socle_private.missions_lot2_project(jsonb,jsonb)','dobby_socle_writer','006f16e6be0147d2c6de4668b665978e906503eda410bd5b6ebaabfe935c0e6a'),
   ('public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)','dobby_missions_v2_writer','6333d63929f68a0555c7a6f8dbe5b07a9d9d0898a349dae54a05c0b2b27e51a5'),
   ('public.dobby_v7_update_magic(text,jsonb,bigint,uuid)','dobby_socle_writer','85ad5a84b972608418a1588586f3f1e95524dece40ce61314a3f167b27949854'),
   ('public.dobby_v7_family_capabilities()','dobby_socle_writer','0f0e67936c337fe832f3562c35625202f452cc9786b3c8f86bae06630c422ce1')
 ) expected(signature,owner_name,body_sha) LOOP
   SELECT * INTO fn FROM pg_proc WHERE oid=to_regprocedure(part.signature);
   IF NOT FOUND OR fn.proowner<>part.owner_name::regrole OR fn.proconfig IS DISTINCT FROM ARRAY['search_path=""']
     OR fn.prosecdef IS DISTINCT FROM (part.signature NOT LIKE 'dobby_socle_private.%')
     OR encode(sha256(convert_to(replace(fn.prosrc,E'\r\n',E'\n'),'UTF8')),'hex') IS DISTINCT FROM part.body_sha THEN
     RAISE EXCEPTION 'Définition ou propriétaire inattendu pour %',part.signature;
   END IF;
 END LOOP;
 IF has_function_privilege('authenticated','public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)','EXECUTE')
   OR has_function_privilege('anon','public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)','EXECUTE')
   OR has_function_privilege('service_role','public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)','EXECUTE') THEN
   RAISE EXCEPTION 'Le writer V2 historique ne doit pas être accessible';
 END IF;
END $preflight$;

GRANT dobby_socle_writer TO CURRENT_USER WITH INHERIT FALSE,SET TRUE;
GRANT CREATE ON SCHEMA dobby_socle_private,public TO dobby_socle_writer;
SET LOCAL ROLE dobby_socle_writer;

-- Les writers natifs conservent propriétaire, reçus, verrouillage et DML.
ALTER FUNCTION public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb) SET SCHEMA dobby_socle_private;
ALTER FUNCTION dobby_socle_private.dobby_missions_v3_write(uuid,bigint,uuid,jsonb) RENAME TO child_missions_write_native;
ALTER FUNCTION public.dobby_v7_update_magic(text,jsonb,bigint,uuid) SET SCHEMA dobby_socle_private;
ALTER FUNCTION dobby_socle_private.dobby_v7_update_magic(text,jsonb,bigint,uuid) RENAME TO child_magic_write_native;
REVOKE ALL ON FUNCTION dobby_socle_private.child_missions_write_native(uuid,bigint,uuid,jsonb),
 dobby_socle_private.child_magic_write_native(text,jsonb,bigint,uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION dobby_socle_private.child_api_ready(p_missions boolean DEFAULT false) RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM dobby_socle_private.install_state WHERE singleton AND family_api_enabled
   AND family_client_verified AND storage_client_verified AND child_link_client_verified
   AND (NOT p_missions OR missions_client_verified));
$$;

-- Includes the original row lock so an in-flight child mutation and closure serialize.
CREATE OR REPLACE FUNCTION dobby_socle_private.assert_child_api_enabled() RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM dobby_socle_private.install_state WHERE singleton AND family_api_enabled
   AND family_client_verified AND storage_client_verified AND child_link_client_verified FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Accès enfant suspendu'; END IF;
END $$;

CREATE FUNCTION dobby_socle_private.child_raw_module_read(p_household uuid,p_module text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE c jsonb;
BEGIN
 c:=dobby_socle_private.actor_context(p_household,false);
 RETURN c->>'phase'='active' AND (c->>'category'='parent' OR
   (c->>'category'='child' AND p_module IN ('menus','recipes') AND dobby_socle_private.child_api_ready()));
EXCEPTION WHEN insufficient_privilege OR invalid_text_representation THEN RETURN false;
END $$;

CREATE FUNCTION dobby_socle_private.child_array(p jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN jsonb_typeof(p)='array' THEN p ELSE '[]'::jsonb END;
$$;
CREATE FUNCTION dobby_socle_private.child_fields(p jsonb, keys text[]) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(jsonb_object_agg(k,p->k),'{}'::jsonb)
 FROM unnest(keys) AS k WHERE jsonb_typeof(p->k) IN ('string','number','boolean','null');
$$;

CREATE FUNCTION dobby_socle_private.child_member_view(p jsonb,p_member text) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT dobby_socle_private.child_fields(p,ARRAY['id','name','firstName','memberCategory','avatar']) ||
   CASE WHEN jsonb_typeof(p->'magicProfile')='object' THEN jsonb_build_object('magicProfile',
     dobby_socle_private.child_fields(p->'magicProfile',ARRAY['version','avatarId','houseId','patronusId'] ||
       CASE WHEN p->>'id'=p_member THEN ARRAY['ceremonyStatus','houseSelectionSource','houseAlgorithmVersion',
         'patronusSelectionSource','patronusAlgorithmVersion'] ELSE ARRAY[]::text[] END))
   ELSE '{}'::jsonb END;
$$;
CREATE FUNCTION dobby_socle_private.child_family_view(p jsonb,p_member text) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT jsonb_build_object(
  'familyMembers',coalesce((SELECT jsonb_agg(dobby_socle_private.child_member_view(value,p_member) ORDER BY n)
    FROM jsonb_array_elements(dobby_socle_private.child_array(p->'familyMembers')) WITH ORDINALITY t(value,n)
    WHERE jsonb_typeof(value->'id')='string'),'[]'::jsonb),
  'familyEvents',coalesce((SELECT jsonb_agg(dobby_socle_private.child_fields(value,
    ARRAY['id','title','date','time','category','person','personId','location']) ORDER BY n)
    FROM jsonb_array_elements(dobby_socle_private.child_array(p->'familyEvents')) WITH ORDINALITY t(value,n)
    WHERE jsonb_typeof(value->'id')='string' AND jsonb_typeof(value->'title')='string'
      AND coalesce(value->>'category','Famille') IN ('Famille','École','Activité','Anniversaire','Déplacement','Autre')
      AND (NOT value?'visibility' OR value->>'visibility' IN ('family','shared','children','restricted'))
      AND (NOT value?'private' OR value->'private'='false'::jsonb)
      AND (NOT value?'visibleToMemberIds' AND value->>'visibility' IS DISTINCT FROM 'restricted' OR
        dobby_socle_private.child_array(value->'visibleToMemberIds') @> jsonb_build_array(p_member))),'[]'::jsonb));
$$;

CREATE FUNCTION dobby_socle_private.child_declared_assignees(p jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN dobby_socle_private.child_array(p->'assigneeIds')<>'[]'::jsonb THEN p->'assigneeIds'
   WHEN jsonb_typeof(p->'assigneeId')='string' AND p->>'assigneeId'<>'' THEN jsonb_build_array(p->>'assigneeId')
   ELSE '[]'::jsonb END;
$$;
CREATE FUNCTION dobby_socle_private.child_assigned(p jsonb,p_member text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT p->'allFamily' IS DISTINCT FROM 'true'::jsonb
   AND dobby_socle_private.child_declared_assignees(p) @> jsonb_build_array(p_member);
$$;
CREATE FUNCTION dobby_socle_private.child_mission_fields(p jsonb,p_member text) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT dobby_socle_private.child_fields(p,ARRAY['id','title','due','category','priority','deadlineOffsetDays',
   'status','createdAt','completedAt','effort','customRunes','rewardVersion','seriesId','occurrenceDate',
   'individualRunes','approvalRequired','participantVersion']) ||
   jsonb_build_object('assigneeId',p_member,'assigneeIds',jsonb_build_array(p_member),
     'childCompletionAllowed',dobby_socle_private.child_declared_assignees(p)=jsonb_build_array(p_member)
       AND p->'individualRunes' IS DISTINCT FROM 'true'::jsonb);
$$;
CREATE FUNCTION dobby_socle_private.child_mission_view(p jsonb,p_member text) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 WITH rules AS (
   SELECT jsonb_agg(dobby_socle_private.child_fields(value,ARRAY['from','start','frequency','state','shortMonth','monthDay']) ||
      jsonb_build_object('weekdays',coalesce((SELECT jsonb_agg(v ORDER BY i)
         FROM jsonb_array_elements(dobby_socle_private.child_array(value->'weekdays')) WITH ORDINALITY x(v,i)
         WHERE jsonb_typeof(v)='number'),'[]'::jsonb),
       'template',dobby_socle_private.child_mission_fields(value->'template',p_member)) ORDER BY n) AS visible
   FROM jsonb_array_elements(dobby_socle_private.child_array(p->'recurrence'->'rules')) WITH ORDINALITY t(value,n)
   WHERE dobby_socle_private.child_assigned(value->'template',p_member)
 )
 SELECT dobby_socle_private.child_mission_fields(p,p_member) ||
   CASE WHEN visible IS NULL THEN '{}'::jsonb
     ELSE jsonb_build_object('recurrence',dobby_socle_private.child_fields(p->'recurrence',ARRAY['version','seriesId']) ||
       jsonb_build_object('rules',visible)) END FROM rules;
$$;

-- Keep the native browser ledger contract. An own allocation becomes a one-member
-- allocation. Number only visible cycles and translate reversal/correction references.
CREATE FUNCTION dobby_socle_private.child_runes_view(p jsonb,p_member text) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 WITH own AS (
   SELECT value,n,coalesce(value->>'eventId',value->>'missionId') AS raw_id,
     CASE WHEN value?'allocations' THEN part->'amount' ELSE value->'amount' END AS own_amount
   FROM jsonb_array_elements(dobby_socle_private.child_array(p)) WITH ORDINALITY t(value,n)
   LEFT JOIN LATERAL (
     SELECT a AS part FROM jsonb_array_elements(dobby_socle_private.child_array(value->'allocations')) a
     WHERE a->>'memberId'=p_member LIMIT 1
   ) a ON true
   WHERE (value?'allocations' AND part IS NOT NULL) OR (NOT value?'allocations' AND value->>'memberId'=p_member)
 ), grants AS (
   SELECT raw_id,value->>'missionId' AS mission,
     row_number() OVER(PARTITION BY value->>'missionId' ORDER BY coalesce((value->>'cycle')::numeric,0),n)-1 AS cycle,
     value?'eventId' AS versioned
   FROM own WHERE coalesce(value->>'kind','grant')='grant'
 ), grant_keys AS (
   SELECT *,CASE WHEN versioned THEN mission||'~'||cycle||'~grant' ELSE mission END AS own_id FROM grants
 ), projected AS (
   SELECT n,CASE
     WHEN value->>'kind' IN ('bonus','correction') THEN
       dobby_socle_private.child_fields(value,ARRAY['eventId','kind','revision','memberId','amount','date','actorMemberId','previousAmount']) ||
       jsonb_build_object('reason',CASE value->>'kind' WHEN 'bonus' THEN 'Bonus de runes' ELSE 'Correction de runes' END) ||
       CASE WHEN value->>'kind'='correction' THEN jsonb_build_object('targetEventId',coalesce(c.own_id,value->>'targetEventId'))
         ELSE '{}'::jsonb END
     ELSE
       dobby_socle_private.child_fields(value,ARRAY['missionId','effort','date','title','revision','customRunes',
         'sourceMissionId','participationId','regularized']) ||
       jsonb_build_object('memberId',p_member,'amount',own_amount) ||
       CASE WHEN value?'eventId' THEN jsonb_build_object('kind',value->'kind','cycle',g.cycle,'eventId',
         CASE WHEN value->>'kind'='reversal' THEN g.mission||'~'||g.cycle||'~reversal' ELSE g.own_id END)
         ELSE '{}'::jsonb END ||
       CASE WHEN value->>'kind'='reversal' THEN jsonb_build_object('reverses',g.own_id) ELSE '{}'::jsonb END ||
       CASE WHEN value?'allocations' THEN jsonb_build_object('allocations',jsonb_build_array(jsonb_build_object('memberId',p_member,'amount',own_amount))) ||
         CASE WHEN value?'customRunes' OR own_amount IS DISTINCT FROM value->'amount' THEN jsonb_build_object('customRunes',own_amount)
           ELSE '{}'::jsonb END ELSE '{}'::jsonb END END AS entry
   FROM own
   LEFT JOIN grant_keys g ON g.raw_id=CASE WHEN value->>'kind'='reversal' THEN value->>'reverses' ELSE own.raw_id END
   LEFT JOIN grant_keys c ON c.raw_id=value->>'targetEventId'
 )
 SELECT coalesce(jsonb_agg(entry ORDER BY n),'[]'::jsonb) FROM projected;
$$;
CREATE FUNCTION dobby_socle_private.child_missions_view(p jsonb,p_member text) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 WITH goal AS (SELECT p->'runeGoals'->p_member AS value)
 SELECT jsonb_build_object(
   'autoTasks','[]'::jsonb,'runeRequests','[]'::jsonb,
   'runeLedgerVersion',coalesce(p->'runeLedgerVersion','1'::jsonb),
   'manualMissions',coalesce((SELECT jsonb_agg(dobby_socle_private.child_mission_view(value,p_member) ORDER BY n)
      FROM jsonb_array_elements(dobby_socle_private.child_array(p->'manualMissions')) WITH ORDINALITY t(value,n)
      WHERE dobby_socle_private.child_assigned(value,p_member)),'[]'::jsonb),
   'runeCredits',dobby_socle_private.child_runes_view(p->'runeCredits',p_member),
   'missionParticipation',coalesce((SELECT jsonb_agg(dobby_socle_private.child_fields(value,
      ARRAY['id','revision','missionId','memberId','action','status','date','actorMemberId','effort','amount','creditId']) ORDER BY n)
      FROM jsonb_array_elements(dobby_socle_private.child_array(p->'missionParticipation')) WITH ORDINALITY t(value,n)
      WHERE value->>'memberId'=p_member),'[]'::jsonb),
   'runeGoals',CASE WHEN jsonb_typeof(goal.value)='object' THEN jsonb_build_object(p_member,
      dobby_socle_private.child_fields(goal.value,ARRAY['id','threshold','mode','unlocked','date'] ||
        CASE WHEN goal.value->>'mode'='announced' THEN ARRAY['title'] ELSE ARRAY[]::text[] END))
      ELSE '{}'::jsonb END,
   'runeRewards',coalesce((SELECT jsonb_agg(dobby_socle_private.child_fields(value,
      ARRAY['id','confirmationId','memberId','threshold','mode','date','revision','actorMemberId']) ||
      jsonb_build_object('title',CASE WHEN value->>'mode'='surprise' THEN 'Récompense mystère' ELSE value->>'title' END) ORDER BY n)
      FROM jsonb_array_elements(dobby_socle_private.child_array(p->'runeRewards')) WITH ORDINALITY t(value,n)
      WHERE value->>'memberId'=p_member),'[]'::jsonb)) FROM goal;
$$;

CREATE FUNCTION dobby_socle_private.child_context_view(c jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path='' AS $$
BEGIN
 IF c->>'phase'='active' AND c->>'category'='child' THEN
   c:=jsonb_set(c,'{profile}',dobby_socle_private.child_member_view(c->'profile',c->>'memberId'));
   IF NOT dobby_socle_private.child_api_ready() THEN
     c:=jsonb_set(jsonb_set(c,'{permissions,canMagic}','false'::jsonb),'{permissions,canCompleteMissionsV3}','false'::jsonb);
   END IF;
 ELSIF c->>'phase'='rejected' AND EXISTS(
   SELECT 1 FROM dobby_v7_private.account_links l
   JOIN public.dobby_v2_memberships m ON m.household_id=l.household_id AND m.user_id=l.user_id
   JOIN public.dobby_v2_modules f ON f.household_id=l.household_id AND f.module='family'
   WHERE l.user_id=(c->>'userId')::uuid AND NOT m.active AND EXISTS(
     SELECT 1 FROM jsonb_array_elements(dobby_socle_private.members(f.payload)) profile
     WHERE profile->>'id'=l.member_id AND profile->>'memberCategory'='child')) THEN
   c:=jsonb_set(c,'{reason}','"child_access_suspended"'::jsonb);
 END IF;
 RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.dobby_v7_context() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT dobby_socle_private.child_context_view(dobby_socle_private.actor_context(NULL,false));
$$;
CREATE OR REPLACE FUNCTION public.dobby_v7_preview_child_invitation(p_token text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN dobby_socle_private.child_api_ready() THEN dobby_socle_private.preview_invitation(p_token,'child-account')
   ELSE jsonb_build_object('status','unavailable') END;
$$;
CREATE OR REPLACE FUNCTION public.dobby_v7_accept_child_invitation(p_token text,p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM dobby_socle_private.assert_child_api_enabled();
 RETURN dobby_socle_private.child_context_view(dobby_socle_private.accept_invitation(p_token,p_operation_id,'child-account'));
END $$;

CREATE FUNCTION public.dobby_v7_child_module(p_household_id uuid,p_module text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE c jsonb:=dobby_socle_private.actor_context(p_household_id,false); result jsonb;
BEGIN
 IF p_household_id IS NULL OR p_module IS NULL OR p_module NOT IN ('family','missions')
   OR c->>'phase' IS DISTINCT FROM 'active' OR c->>'category' IS DISTINCT FROM 'child'
   OR NOT dobby_socle_private.child_api_ready(p_module='missions') THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Lecture enfant canonique du foyer requise';
 END IF;
 SELECT jsonb_build_object('module',module,'revision',revision,'updated_at',updated_at,
   'payload',CASE p_module WHEN 'family' THEN dobby_socle_private.child_family_view(payload,c->>'memberId')
     ELSE dobby_socle_private.child_missions_view(payload,c->>'memberId') END) INTO result
 FROM public.dobby_v2_modules WHERE household_id=p_household_id AND module=p_module;
 RETURN result;
END $$;

CREATE FUNCTION public.dobby_missions_v3_write(p_household_id uuid,p_expected_revision bigint,
 p_operation_id uuid,p_intent jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c jsonb:=dobby_socle_private.actor_context(p_household_id,true); answer jsonb;
 kind text:=p_intent->>'kind'; task jsonb; own text:=c->>'memberId';
BEGIN
 IF c->>'category'='child' THEN
   PERFORM dobby_socle_private.assert_child_api_enabled();
   IF NOT dobby_socle_private.child_api_ready(true) THEN
     RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Accès enfant aux Missions suspendu';
   END IF;
   IF p_household_id IS NULL OR kind IS NULL OR kind NOT IN ('complete','submit','project') THEN
     RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Action Missions refusée pour ce profil';
   END IF;
   IF kind IN ('complete','submit') THEN
     SELECT row INTO task FROM public.dobby_v2_modules m,
       LATERAL jsonb_array_elements(dobby_socle_private.child_array(m.payload->'manualMissions')) row
     WHERE m.household_id=p_household_id AND m.module='missions' AND row->>'id'=p_intent->>'missionId';
     IF task IS NULL OR NOT dobby_socle_private.child_assigned(task,own) OR
       (kind='complete' AND (task->'individualRunes'='true'::jsonb OR
         dobby_socle_private.child_declared_assignees(task)<>jsonb_build_array(own) OR
         p_intent->'participantIds' IS DISTINCT FROM jsonb_build_array(own))) OR
       (kind='submit' AND (p_intent->>'memberId' IS DISTINCT FROM own OR
         task->'individualRunes' IS DISTINCT FROM 'true'::jsonb)) THEN
       RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Action Missions refusée pour ce profil';
     END IF;
   END IF;
 END IF;
 answer:=dobby_socle_private.child_missions_write_native(p_household_id,p_expected_revision,p_operation_id,p_intent);
 IF c->>'category'='child' THEN
   answer:=jsonb_set(answer,'{module,payload}',dobby_socle_private.child_missions_view(answer->'module'->'payload',c->>'memberId'));
 END IF;
 RETURN answer;
END $$;

CREATE FUNCTION public.dobby_v7_update_magic(p_member_id text,p_values jsonb,p_expected_revision bigint,
 p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c jsonb:=dobby_socle_private.actor_context(NULL,true); answer jsonb;
BEGIN
 IF c->>'category'='child' THEN
   PERFORM dobby_socle_private.assert_child_api_enabled();
   IF p_member_id IS DISTINCT FROM c->>'memberId' OR
     (jsonb_typeof(p_values)='object' AND p_values-ARRAY['magicHouseId','magicHouseAlgorithm','magicPatronusId','magicPatronusAlgorithm']<>'{}'::jsonb) THEN
     RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Seules la Maison et le Patronus de cet enfant sont modifiables';
   END IF;
 END IF;
 answer:=dobby_socle_private.child_magic_write_native(p_member_id,p_values,p_expected_revision,p_operation_id);
 IF c->>'category'='child' AND answer?'module' THEN
   answer:=jsonb_set(answer,'{module,payload}',dobby_socle_private.child_family_view(answer->'module'->'payload',c->>'memberId'));
 END IF;
 RETURN answer;
END $$;

CREATE FUNCTION dobby_socle_private.child_target_account(p_home uuid,p_member text) RETURNS uuid
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE u uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.dobby_v2_modules f,
   LATERAL jsonb_array_elements(dobby_socle_private.members(f.payload)) profile
   WHERE f.household_id=p_home AND f.module='family' AND profile->>'id'=p_member
     AND profile->>'memberCategory'='child') THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Fiche enfant canonique du foyer requise';
 END IF;
 SELECT l.user_id INTO u FROM dobby_v7_private.account_links l WHERE l.household_id=p_home AND l.member_id=p_member;
 RETURN u;
END $$;
CREATE FUNCTION public.dobby_v7_child_access_status(p_member_id text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE c jsonb:=dobby_socle_private.actor_context(NULL,false); kid uuid; home uuid;
BEGIN
 IF c->>'phase' IS DISTINCT FROM 'active' OR c->>'category' IS DISTINCT FROM 'parent' THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Parent canonique du foyer requis';
 END IF;
 home:=(c->>'householdId')::uuid;
 kid:=dobby_socle_private.child_target_account(home,p_member_id);
 RETURN jsonb_build_object('linked',kid IS NOT NULL,'active',EXISTS(
   SELECT 1 FROM public.dobby_v2_memberships WHERE household_id=home AND user_id=kid AND active));
END $$;
CREATE FUNCTION public.dobby_v7_suspend_child_access(p_member_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c jsonb:=dobby_socle_private.actor_context(NULL,false); kid uuid; home uuid;
BEGIN
 IF c->>'phase' IS DISTINCT FROM 'active' OR c->>'category' IS DISTINCT FROM 'parent' THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Parent canonique du foyer requis';
 END IF;
 home:=(c->>'householdId')::uuid;
 kid:=dobby_socle_private.child_target_account(home,p_member_id);
 -- The child takes its membership row before the family advisory lock.
 -- Take the same order so an in-flight child write can finish before suspension.
 PERFORM 1 FROM public.dobby_v2_memberships WHERE household_id=home AND user_id=kid FOR NO KEY UPDATE;
 PERFORM dobby_socle_private.parent_context(home);
 IF kid IS DISTINCT FROM dobby_socle_private.child_target_account(home,p_member_id) THEN
   RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Compte enfant lié pendant la suspension : réessayer';
 END IF;
 UPDATE public.dobby_v2_memberships SET active=false WHERE household_id=home AND user_id=kid AND active;
 UPDATE dobby_v7_private.invitations SET revoked_at=clock_timestamp()
   WHERE household_id=home AND target_member_id=p_member_id AND invitation_kind='child-account'
     AND accepted_by IS NULL AND revoked_at IS NULL;
 RETURN jsonb_build_object('linked',kid IS NOT NULL,'active',false);
END $$;

DO $native_updates$
DECLARE body text; marker text;
BEGIN
 -- The parent projects all series. An active child's deterministic projection
 -- may materialize an occurrence only when that particular rule assigns them.
 body:=pg_get_functiondef('dobby_socle_private.missions_lot2_project(jsonb,jsonb)'::regprocedure);
 marker:='DECLARE rows jsonb:=p->''manualMissions'';';
 body:=replace(body,marker,'DECLARE child_context jsonb:=dobby_socle_private.actor_context(NULL,false);'||chr(10)||
   ' rows jsonb:=p->''manualMissions'';');
 marker:='IF rule IS NULL OR rule->>''state''<>''active''';
 body:=replace(body,marker,'IF rule IS NULL OR (child_context->>''category''=''child'' AND NOT '||
   'dobby_socle_private.child_assigned(rule->''template'',child_context->>''memberId'')) OR rule->>''state''<>''active''');
 EXECUTE body;
 body:=pg_get_functiondef('public.dobby_missions_v3_capabilities(uuid)'::regprocedure);
 marker:='coalesce(c->''permissions''->''canCompleteMissionsV3''=''true''::jsonb,false)';
 EXECUTE replace(body,marker,marker||' AND (c->>''category''<>''child'' OR dobby_socle_private.child_api_ready(true))');
 body:=pg_get_functiondef('public.dobby_v7_family_capabilities()'::regprocedure);
 marker:='jsonb_build_object(''protocol'',2,''installed'',true,';
 EXECUTE replace(body,marker,marker||'''childAccessProtocol'',1,');
END $native_updates$;

REVOKE ALL ON FUNCTION dobby_socle_private.child_api_ready(boolean),dobby_socle_private.child_raw_module_read(uuid,text),
 dobby_socle_private.child_array(jsonb),dobby_socle_private.child_fields(jsonb,text[]),
 dobby_socle_private.child_member_view(jsonb,text),dobby_socle_private.child_family_view(jsonb,text),
 dobby_socle_private.child_declared_assignees(jsonb),dobby_socle_private.child_assigned(jsonb,text),
 dobby_socle_private.child_mission_fields(jsonb,text),dobby_socle_private.child_mission_view(jsonb,text),
 dobby_socle_private.child_runes_view(jsonb,text),dobby_socle_private.child_missions_view(jsonb,text),
 dobby_socle_private.child_context_view(jsonb),dobby_socle_private.child_target_account(uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.dobby_v7_child_module(uuid,text),public.dobby_v7_child_access_status(text),
 public.dobby_v7_suspend_child_access(text),public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb),
 public.dobby_v7_update_magic(text,jsonb,bigint,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION dobby_socle_private.child_raw_module_read(uuid,text),
 public.dobby_v7_child_module(uuid,text),public.dobby_v7_child_access_status(text),
 public.dobby_v7_suspend_child_access(text),public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb),
 public.dobby_v7_update_magic(text,jsonb,bigint,uuid) TO authenticated;

RESET ROLE;
CREATE POLICY dobby_child_module_read ON public.dobby_v2_modules AS RESTRICTIVE FOR SELECT TO authenticated
 USING(dobby_socle_private.child_raw_module_read(household_id,module));
ALTER POLICY dobby_socle_canonical_read ON storage.objects
 USING(bucket_id<>'dobby-family-files' OR CASE
   WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
   THEN dobby_socle_private.is_parent(((storage.foldername(name))[1])::uuid) ELSE false END);

CREATE POLICY dobby_child_anonymous_storage_read ON storage.objects AS RESTRICTIVE FOR SELECT TO anon
 USING(bucket_id<>'dobby-family-files');

REVOKE CREATE ON SCHEMA dobby_socle_private,public FROM dobby_socle_writer;
GRANT dobby_socle_writer TO CURRENT_USER WITH INHERIT FALSE,SET FALSE;
NOTIFY pgrst,'reload schema';
COMMIT;
