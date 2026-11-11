-- PROPOSAL ONLY. Apply only after the documented backup/review, never from a browser.
-- Extends the existing personal DOBBY database; no Portenart project is a test target.
-- PostgreSQL 15+ / Supabase. The JSON Missions payload is the ONLY rune ledger.
BEGIN;

DO $migration$
BEGIN
  IF to_regclass('public.dobby_v2_modules') IS NULL
     OR to_regclass('public.dobby_v2_memberships') IS NULL THEN
    RAISE EXCEPTION 'Apply and verify the existing DOBBY modules schema first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='dobby_missions_v2_writer') THEN
    CREATE ROLE dobby_missions_v2_writer NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  ELSIF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='dobby_missions_v2_writer'
    AND (rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit)) THEN
    RAISE EXCEPTION 'Unsafe existing dobby_missions_v2_writer role; manual review required';
  END IF;
  IF pg_catalog.pg_has_role('authenticated','dobby_missions_v2_writer','MEMBER')
     OR pg_catalog.pg_has_role('anon','dobby_missions_v2_writer','MEMBER') THEN
    RAISE EXCEPTION 'Client roles must not be members of the Missions writer role';
  END IF;
  -- Only the privileged migration operator receives SET ROLE/ownership ability.
  EXECUTE pg_catalog.format('GRANT dobby_missions_v2_writer TO %I', current_user);
END;
$migration$;

CREATE SCHEMA IF NOT EXISTS dobby_runes_private;
REVOKE ALL ON SCHEMA dobby_runes_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA dobby_runes_private TO dobby_missions_v2_writer;
GRANT USAGE ON SCHEMA public,auth TO dobby_missions_v2_writer;
GRANT EXECUTE ON FUNCTION auth.uid() TO dobby_missions_v2_writer;
GRANT SELECT ON public.dobby_v2_memberships TO dobby_missions_v2_writer;
GRANT SELECT,INSERT,UPDATE ON public.dobby_v2_modules TO dobby_missions_v2_writer;

-- Receipts contain NO copy of the ledger or balance. They bind an immutable
-- operation ID to its actor, expected revision, request digest and applied revision.
CREATE TABLE IF NOT EXISTS dobby_runes_private.operations (
  household_id uuid NOT NULL REFERENCES public.dobby_v2_households(id),
  operation_id uuid NOT NULL,
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  expected_revision bigint NOT NULL CHECK(expected_revision BETWEEN 0 AND 9007199254740990),
  applied_revision bigint NOT NULL CHECK(applied_revision BETWEEN 1 AND 9007199254740991),
  request_digest text NOT NULL CHECK(request_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  PRIMARY KEY(household_id,operation_id)
);
ALTER TABLE dobby_runes_private.operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dobby_runes_private.operations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON dobby_runes_private.operations TO dobby_missions_v2_writer;

DROP POLICY IF EXISTS dobby_missions_writer_membership ON public.dobby_v2_memberships;
CREATE POLICY dobby_missions_writer_membership ON public.dobby_v2_memberships
FOR SELECT TO dobby_missions_v2_writer
USING(user_id=(SELECT auth.uid()) AND active);
DROP POLICY IF EXISTS dobby_missions_writer_module_read ON public.dobby_v2_modules;
CREATE POLICY dobby_missions_writer_module_read ON public.dobby_v2_modules
FOR SELECT TO dobby_missions_v2_writer
USING(module='missions' AND EXISTS(SELECT 1 FROM public.dobby_v2_memberships m
 WHERE m.household_id=dobby_v2_modules.household_id AND m.user_id=(SELECT auth.uid()) AND m.active));
DROP POLICY IF EXISTS dobby_missions_writer_module_insert ON public.dobby_v2_modules;
CREATE POLICY dobby_missions_writer_module_insert ON public.dobby_v2_modules
FOR INSERT TO dobby_missions_v2_writer
WITH CHECK(module='missions' AND EXISTS(SELECT 1 FROM public.dobby_v2_memberships m
 WHERE m.household_id=dobby_v2_modules.household_id AND m.user_id=(SELECT auth.uid()) AND m.active));
DROP POLICY IF EXISTS dobby_missions_writer_module_update ON public.dobby_v2_modules;
CREATE POLICY dobby_missions_writer_module_update ON public.dobby_v2_modules
FOR UPDATE TO dobby_missions_v2_writer
USING(module='missions' AND EXISTS(SELECT 1 FROM public.dobby_v2_memberships m
 WHERE m.household_id=dobby_v2_modules.household_id AND m.user_id=(SELECT auth.uid()) AND m.active))
WITH CHECK(module='missions' AND EXISTS(SELECT 1 FROM public.dobby_v2_memberships m
 WHERE m.household_id=dobby_v2_modules.household_id AND m.user_id=(SELECT auth.uid()) AND m.active));
DROP POLICY IF EXISTS dobby_missions_receipt_read ON dobby_runes_private.operations;
CREATE POLICY dobby_missions_receipt_read ON dobby_runes_private.operations
FOR SELECT TO dobby_missions_v2_writer
USING(EXISTS(SELECT 1 FROM public.dobby_v2_memberships m
 WHERE m.household_id=operations.household_id AND m.user_id=(SELECT auth.uid()) AND m.active));
DROP POLICY IF EXISTS dobby_missions_receipt_insert ON dobby_runes_private.operations;
CREATE POLICY dobby_missions_receipt_insert ON dobby_runes_private.operations
FOR INSERT TO dobby_missions_v2_writer
WITH CHECK(actor_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.dobby_v2_memberships m
 WHERE m.household_id=operations.household_id AND m.user_id=(SELECT auth.uid()) AND m.active));

-- A row lock needs UPDATE privilege in PostgreSQL. This narrow helper performs
-- no UPDATE and grants the writer no membership mutation privilege. It is owned
-- by the migration operator and executable only through the dedicated writer.
CREATE OR REPLACE FUNCTION dobby_runes_private.lock_active_membership(p_household_id uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF auth.uid() IS NULL THEN RETURN false; END IF;
 PERFORM 1 FROM public.dobby_v2_memberships m
  WHERE m.household_id=p_household_id AND m.user_id=auth.uid() AND m.active FOR SHARE;
 RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION dobby_runes_private.safe_integer(v jsonb,label text)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE SET search_path=''
AS $$
DECLARE n numeric;
BEGIN
 IF pg_catalog.jsonb_typeof(v) IS DISTINCT FROM 'number' THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE=label||' : entier numérique requis';
 END IF;
 n:=(v#>>'{}')::numeric;
 IF n<0 OR n>9007199254740991 OR n<>pg_catalog.trunc(n) THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE=label||' : hors capacité numérique native';
 END IF;
 RETURN n;
END;
$$;
-- JavaScript limits count UTF-16 code units, not PostgreSQL code points.
CREATE OR REPLACE FUNCTION dobby_runes_private.utf16_length(v text)
RETURNS integer LANGUAGE sql IMMUTABLE STRICT SET search_path=''
AS $$SELECT COALESCE(pg_catalog.sum(CASE WHEN chars.ch='' THEN 0 WHEN pg_catalog.ascii(chars.ch)>65535 THEN 2 ELSE 1 END),0)::integer
 FROM pg_catalog.regexp_split_to_table(v,'') AS chars(ch)$$;
CREATE OR REPLACE FUNCTION dobby_runes_private.has_native_text(v text)
RETURNS boolean LANGUAGE sql IMMUTABLE STRICT SET search_path=''
AS $$SELECT pg_catalog.translate(v,E' \t\n\r\f'||U&'\000B\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF','')<>''$$;
CREATE OR REPLACE FUNCTION dobby_runes_private.valid_date(v text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=''
AS $$
BEGIN
 IF v IS NULL OR v !~ '^\d{4}-\d{2}-\d{2}$' THEN RETURN false; END IF;
 RETURN pg_catalog.to_char(v::date,'YYYY-MM-DD')=v;
EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RETURN false;
END;
$$;
CREATE OR REPLACE FUNCTION dobby_runes_private.event_key(v jsonb)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=''
AS $$SELECT COALESCE(v->>'eventId',v->>'missionId')$$;
CREATE OR REPLACE FUNCTION dobby_runes_private.same_award(a jsonb,b jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=''
AS $$SELECT (a-'date'-'title'-'revision')=(b-'date'-'title'-'revision')$$;

CREATE OR REPLACE FUNCTION dobby_runes_private.assert_event(v jsonb,confirmed boolean)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path=''
AS $$
DECLARE expected numeric; cycle numeric; instant timestamptz;
BEGIN
 IF pg_catalog.jsonb_typeof(v) IS DISTINCT FROM 'object' THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Historique de runes non pris en charge';
 END IF;
 IF EXISTS(
   SELECT 1 FROM pg_catalog.jsonb_object_keys(v) k
   WHERE k<>ALL(ARRAY['missionId','memberId','effort','amount','date','title','revision','customRunes','eventId','kind','cycle','reverses'])) THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Historique de runes non pris en charge';
 END IF;
 IF pg_catalog.jsonb_typeof(v->'missionId') IS DISTINCT FROM 'string' OR (v->>'missionId') !~ '^[A-Za-z0-9_-]{1,80}$'
 OR pg_catalog.jsonb_typeof(v->'memberId') IS DISTINCT FROM 'string' OR NOT dobby_runes_private.has_native_text(v->>'memberId')
 OR dobby_runes_private.utf16_length(v->>'memberId')>100
 OR pg_catalog.jsonb_typeof(v->'title') IS DISTINCT FROM 'string' OR NOT dobby_runes_private.has_native_text(v->>'title')
 OR dobby_runes_private.utf16_length(v->>'title')>140
 OR pg_catalog.jsonb_typeof(v->'date') IS DISTINCT FROM 'string'
 OR (v->>'date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$' THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Bénéficiaire, mission, date ou intitulé de runes invalide';
 END IF;
 BEGIN
  instant:=(v->>'date')::timestamptz;
  IF NOT pg_catalog.isfinite(instant)
   OR pg_catalog.to_char(instant AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') IS DISTINCT FROM v->>'date' THEN
   RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Date de runes invalide ou non canonique';
  END IF;
 EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Date de runes invalide';
 END;
 expected:=CASE v->>'effort' WHEN 'light' THEN 10 WHEN 'regular' THEN 25 WHEN 'major' THEN 50 ELSE NULL END;
 IF expected IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Niveau d’effort invalide'; END IF;
 IF v?'customRunes' THEN expected:=dobby_runes_private.safe_integer(v->'customRunes','Récompense personnalisée'); END IF;
 IF dobby_runes_private.safe_integer(v->'amount','Récompense')<>expected THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Valeur de récompense invalide';
 END IF;
 IF v ?| ARRAY['eventId','kind','cycle','reverses'] THEN
  cycle:=dobby_runes_private.safe_integer(v->'cycle','Cycle');
  IF (v->>'kind') NOT IN ('grant','reversal') OR v->>'kind' IS NULL
   OR pg_catalog.jsonb_typeof(v->'eventId') IS DISTINCT FROM 'string'
   OR v->>'eventId' IS DISTINCT FROM (v->>'missionId')||'~'||cycle::bigint::text||'~'||(v->>'kind') THEN
   RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Identité d’événement de runes invalide';
  END IF;
  IF v->>'kind'='reversal' THEN
   IF pg_catalog.jsonb_typeof(v->'reverses') IS DISTINCT FROM 'string' OR v->>'reverses'='' THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Référence d’annulation invalide';
   END IF;
  ELSIF v?'reverses' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Référence d’annulation inattendue'; END IF;
 ELSIF v?'customRunes' THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='La récompense personnalisée exige un événement versionné';
 END IF;
 IF confirmed THEN PERFORM dobby_runes_private.safe_integer(v->'revision','Confirmation');
 ELSIF v?'revision' THEN PERFORM dobby_runes_private.safe_integer(v->'revision','Révision de demande'); END IF;
END;
$$;

-- Returns active grant map, including zero-valued grants: SUM>0 is never used to
-- decide whether an event exists. Historical grants/reversals remain untouched.
CREATE OR REPLACE FUNCTION dobby_runes_private.assert_ledger(rows jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=''
AS $$
DECLARE e jsonb; k text; seen jsonb:='{}'; active jsonb:='{}'; totals jsonb:='{}';
 mission text; previous text:=NULL; expected numeric:=0; c numeric; grant_row jsonb:=NULL; n numeric; member text;
BEGIN
 IF pg_catalog.jsonb_typeof(rows) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Historique de runes invalide'; END IF;
 FOR e IN SELECT value FROM pg_catalog.jsonb_array_elements(rows) LOOP
  PERFORM dobby_runes_private.assert_event(e,true); k:=dobby_runes_private.event_key(e);
  IF seen?k THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Événement confirmé dupliqué'; END IF;
  seen:=pg_catalog.jsonb_set(seen,ARRAY[k],e,true);
 END LOOP;
 FOR e IN SELECT value FROM pg_catalog.jsonb_array_elements(rows)
   ORDER BY value->>'missionId',COALESCE((value->>'cycle')::numeric,0),CASE WHEN value->>'kind'='reversal' THEN 1 ELSE 0 END LOOP
  mission:=e->>'missionId';c:=COALESCE((e->>'cycle')::numeric,0);
  IF previous IS DISTINCT FROM mission THEN
   IF grant_row IS NOT NULL THEN active:=pg_catalog.jsonb_set(active,ARRAY[previous],grant_row,true); END IF;
   previous:=mission;expected:=0;grant_row:=NULL;
  END IF;
  IF e->>'kind'='reversal' THEN
   IF grant_row IS NULL OR c<>expected-1
      OR e->>'reverses' IS DISTINCT FROM dobby_runes_private.event_key(grant_row)
      OR (e->'memberId') IS DISTINCT FROM (grant_row->'memberId')
      OR (e->'effort') IS DISTINCT FROM (grant_row->'effort')
      OR (e->'amount') IS DISTINCT FROM (grant_row->'amount')
      OR (e->'customRunes') IS DISTINCT FROM (grant_row->'customRunes') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Annulation sans gain exact correspondant';
   END IF;
   grant_row:=NULL;
  ELSE
   IF grant_row IS NOT NULL OR c<>expected THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Historique incomplet ou plusieurs gains actifs';
   END IF;
   grant_row:=e;expected:=expected+1;
  END IF;
 END LOOP;
 IF grant_row IS NOT NULL THEN active:=pg_catalog.jsonb_set(active,ARRAY[previous],grant_row,true); END IF;
 FOR e IN SELECT value FROM pg_catalog.jsonb_each(active) LOOP
  member:=e->>'memberId';n:=COALESCE((totals->>member)::numeric,0)+(e->>'amount')::numeric;
  IF n>9007199254740991 THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Le total actif de runes dépasse la capacité numérique du modèle'; END IF;
  totals:=pg_catalog.jsonb_set(totals,ARRAY[member],pg_catalog.to_jsonb(n),true);
 END LOOP;
 RETURN active;
END;
$$;

CREATE OR REPLACE FUNCTION dobby_runes_private.assert_mission(v jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path=''
AS $$
DECLARE r jsonb; t jsonb; d jsonb; last_from text:=''; stopped boolean:=false; n numeric;
BEGIN
 IF pg_catalog.jsonb_typeof(v) IS DISTINCT FROM 'object'
 OR pg_catalog.jsonb_typeof(v->'id') IS DISTINCT FROM 'string' OR (v->>'id') !~ '^[A-Za-z0-9_-]{1,80}$'
 OR pg_catalog.jsonb_typeof(v->'title') IS DISTINCT FROM 'string' OR NOT dobby_runes_private.has_native_text(v->>'title') OR dobby_runes_private.utf16_length(v->>'title')>140
 OR COALESCE(v->>'status','open') NOT IN ('open','done')
 OR COALESCE(v->>'category','Famille') NOT IN ('Famille','Maison','Administratif','Autre')
 OR (v?'assigneeId' AND (pg_catalog.jsonb_typeof(v->'assigneeId') IS DISTINCT FROM 'string' OR dobby_runes_private.utf16_length(v->>'assigneeId')>100))
 OR (COALESCE(v->>'due','')<>'' AND NOT dobby_runes_private.valid_date(v->>'due')) THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Mission familiale invalide';
 END IF;
 IF v?'rewardVersion' AND v->'rewardVersion' IS DISTINCT FROM '1'::jsonb THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Version de récompense incompatible'; END IF;
 IF v ?| ARRAY['effort','rewardVersion','customRunes'] THEN
  IF v->>'effort' NOT IN ('light','regular','major') OR v->>'effort' IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Effort de mission invalide'; END IF;
  IF v?'customRunes' THEN PERFORM dobby_runes_private.safe_integer(v->'customRunes','Récompense personnalisée'); END IF;
 END IF;
 IF v ?| ARRAY['seriesId','occurrenceDate'] THEN
  IF v?'recurrence' OR pg_catalog.jsonb_typeof(v->'seriesId') IS DISTINCT FROM 'string' OR (v->>'seriesId') !~ '^[A-Za-z0-9_-]{1,70}$'
   OR NOT dobby_runes_private.valid_date(v->>'occurrenceDate')
   OR v->>'id' IS DISTINCT FROM (v->>'seriesId')||'-r'||pg_catalog.replace(v->>'occurrenceDate','-','')
   OR v->>'due' IS DISTINCT FROM v->>'occurrenceDate' THEN
   RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Identité d’occurrence incompatible';
  END IF;
 END IF;
 IF v?'recurrence' THEN
  r:=v->'recurrence';
  IF pg_catalog.jsonb_typeof(r) IS DISTINCT FROM 'object' OR r->'version' IS DISTINCT FROM '1'::jsonb OR r->>'seriesId' IS DISTINCT FROM v->>'id'
   OR pg_catalog.jsonb_typeof(r->'rules') IS DISTINCT FROM 'array' OR pg_catalog.jsonb_array_length(r->'rules') NOT BETWEEN 1 AND 200 THEN
   RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Série de missions incompatible';
  END IF;
  FOR d IN SELECT value FROM pg_catalog.jsonb_array_elements(r->'rules') LOOP
   IF stopped OR pg_catalog.jsonb_typeof(d) IS DISTINCT FROM 'object'
    OR NOT dobby_runes_private.valid_date(d->>'from') OR NOT dobby_runes_private.valid_date(d->>'start')
    OR d->>'from'<last_from OR d->>'frequency' NOT IN ('daily','weekly','monthly') OR d->>'frequency' IS NULL
    OR d->>'state' NOT IN ('active','paused','stopped') OR d->>'state' IS NULL OR d->>'shortMonth' IS DISTINCT FROM 'last-day'
    OR pg_catalog.jsonb_typeof(d->'weekdays') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Règle de récurrence invalide ou série arrêtée';
   END IF;
   FOR t IN SELECT value FROM pg_catalog.jsonb_array_elements(d->'weekdays') LOOP
    n:=dobby_runes_private.safe_integer(t,'Jour de semaine');IF n>6 THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Jour de semaine invalide'; END IF;
   END LOOP;
   IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_array_elements(d->'weekdays'))<>(SELECT pg_catalog.count(DISTINCT value) FROM pg_catalog.jsonb_array_elements(d->'weekdays'))
    OR d->>'frequency'='weekly' AND pg_catalog.jsonb_array_length(d->'weekdays')=0 THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Jours de semaine invalides'; END IF;
   n:=dobby_runes_private.safe_integer(d->'monthDay','Jour du mois');IF n<1 OR n>31 THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Jour du mois invalide'; END IF;
   t:=d->'template';IF pg_catalog.jsonb_typeof(t) IS DISTINCT FROM 'object' OR t ?| ARRAY['recurrence','seriesId','occurrenceDate'] THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Modèle de récurrence invalide'; END IF;
   PERFORM dobby_runes_private.assert_mission(t||pg_catalog.jsonb_build_object('id',v->>'id','due',d->>'start','status','open'));
   last_from:=d->>'from';stopped:=d->>'state'='stopped';
  END LOOP;
 END IF;
END;
$$;

CREATE OR REPLACE FUNCTION dobby_runes_private.assert_payload(v jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path=''
AS $$
DECLARE r jsonb; seen jsonb:='{}'; k text; active jsonb;
BEGIN
 IF pg_catalog.jsonb_typeof(v) IS DISTINCT FROM 'object' THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Payload Missions objet requis';
 END IF;
 IF pg_catalog.octet_length(v::text)>262144
 OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_object_keys(v) f WHERE f<>ALL(ARRAY['autoTasks','manualMissions','runeCredits','runeRequests','runeLedgerVersion'])) THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Payload Missions invalide ou supérieur à 256 Kio ; historique conservé';
 END IF;
 IF v?'runeLedgerVersion' AND v->'runeLedgerVersion' NOT IN ('1'::jsonb,'2'::jsonb) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Version du registre incompatible'; END IF;
 IF pg_catalog.jsonb_typeof(COALESCE(v->'manualMissions','[]')) IS DISTINCT FROM 'array'
 OR pg_catalog.jsonb_typeof(COALESCE(v->'autoTasks','[]')) IS DISTINCT FROM 'array'
 OR pg_catalog.jsonb_typeof(COALESCE(v->'runeCredits','[]')) IS DISTINCT FROM 'array'
 OR pg_catalog.jsonb_typeof(COALESCE(v->'runeRequests','[]')) IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Tableaux Missions ou historique invalides';
 END IF;
 FOR r IN SELECT value FROM pg_catalog.jsonb_array_elements(COALESCE(v->'manualMissions','[]')) LOOP
  PERFORM dobby_runes_private.assert_mission(r);k:=r->>'id';
  IF seen?k THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Identifiant de mission dupliqué'; END IF;seen:=pg_catalog.jsonb_set(seen,ARRAY[k],r,true);
 END LOOP;
 active:=dobby_runes_private.assert_ledger(COALESCE(v->'runeCredits','[]'));
 FOR r IN SELECT value FROM pg_catalog.jsonb_array_elements(COALESCE(v->'runeRequests','[]')) LOOP PERFORM dobby_runes_private.assert_event(r,false); END LOOP;
 IF v->'runeLedgerVersion'='1'::jsonb AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(COALESCE(v->'runeCredits','[]')) AS item(value) WHERE item.value ?| ARRAY['eventId','customRunes']) THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Un historique V2 ne peut pas être annoncé V1';
 END IF;
END;
$$;

CREATE OR REPLACE FUNCTION dobby_runes_private.guard_missions()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
BEGIN
 IF (CASE WHEN TG_OP='DELETE' THEN OLD.module='missions'
          WHEN TG_OP='INSERT' THEN NEW.module='missions'
          ELSE OLD.module='missions' OR NEW.module='missions' END)
    AND current_user<>'dobby_missions_v2_writer' THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Protocole Missions V2 requis : écriture directe incompatible refusée. Mettez DOBBY à jour.';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
DROP TRIGGER IF EXISTS dobby_missions_v2_guard ON public.dobby_v2_modules;
CREATE TRIGGER dobby_missions_v2_guard BEFORE INSERT OR UPDATE OR DELETE ON public.dobby_v2_modules
FOR EACH ROW EXECUTE FUNCTION dobby_runes_private.guard_missions();

CREATE OR REPLACE FUNCTION public.dobby_missions_v2_capabilities(p_household_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.dobby_v2_memberships m WHERE m.household_id=p_household_id AND m.user_id=auth.uid() AND m.active) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Appartenance active au foyer requise';
 END IF;
 RETURN pg_catalog.jsonb_build_object('protocol',2,'maxPayloadBytes',262144,'directWritesBlocked',true,'ledgerVersions',pg_catalog.jsonb_build_array(1,2));
END;
$$;

CREATE OR REPLACE FUNCTION public.dobby_missions_v2_write(p_household_id uuid,p_expected_revision bigint,p_operation_id uuid,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $$
DECLARE actor uuid:=auth.uid(); old_row public.dobby_v2_modules%ROWTYPE; receipt dobby_runes_private.operations%ROWTYPE;
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

-- No externally callable helper or receipt-table endpoint is introduced.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA dobby_runes_private FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA dobby_runes_private TO dobby_missions_v2_writer;
GRANT CREATE ON SCHEMA public TO dobby_missions_v2_writer;
ALTER FUNCTION public.dobby_missions_v2_capabilities(uuid) OWNER TO dobby_missions_v2_writer;
ALTER FUNCTION public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb) OWNER TO dobby_missions_v2_writer;
REVOKE CREATE ON SCHEMA public FROM dobby_missions_v2_writer;
REVOKE ALL ON FUNCTION public.dobby_missions_v2_capabilities(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dobby_missions_v2_capabilities(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb) TO authenticated;

-- Existing rows are checked, never rewritten or migrated into a second ledger.
DO $preflight$
DECLARE row record;
BEGIN
 FOR row IN SELECT household_id,payload FROM public.dobby_v2_modules WHERE module='missions' LOOP
  PERFORM dobby_runes_private.assert_payload(row.payload);
 END LOOP;
END;
$preflight$;

COMMIT;
