-- FICTIONAL LOCAL fixture reconstructed from the supplied catalog, NOT live data.
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='dobby_missions_v2_writer') THEN CREATE ROLE dobby_missions_v2_writer NOLOGIN; END IF; END $$;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,dobby_missions_v2_writer;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,dobby_missions_v2_writer;
CREATE SCHEMA dobby_runes_private;
GRANT USAGE ON SCHEMA dobby_runes_private TO dobby_missions_v2_writer;
CREATE FUNCTION dobby_runes_private.request_user_id() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT auth.uid() $$;
CREATE TABLE dobby_runes_private.operations(household_id uuid,operation_id uuid,actor_id uuid,expected_revision bigint,applied_revision bigint,request_digest text);
-- The source diagnostic omitted this PRIVATE function; defensive test stub only.
CREATE FUNCTION dobby_runes_private.guard_missions() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF coalesce(NEW.module,OLD.module)='missions' AND current_user<>'dobby_missions_v2_writer' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='fixture: direct Missions write blocked'; END IF;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TABLE public."dobby_sync_members" (
  "user_id" uuid NOT NULL,
  "display_name" text DEFAULT ''::text NOT NULL,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  CONSTRAINT "dobby_sync_members_pkey" PRIMARY KEY (user_id),
  CONSTRAINT "dobby_sync_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public."dobby_sync_members" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public."dobby_sync_members" TO "authenticated";
GRANT REFERENCES ON public."dobby_sync_members" TO "service_role";
GRANT TRIGGER ON public."dobby_sync_members" TO "service_role";
GRANT TRUNCATE ON public."dobby_sync_members" TO "service_role";
CREATE TABLE public."dobby_v2_households" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dobby_v2_households_name_check" CHECK (length(btrim(name)) >= 1 AND length(btrim(name)) <= 120),
  CONSTRAINT "dobby_v2_households_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."dobby_v2_households" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public."dobby_v2_households" TO "authenticated";
GRANT REFERENCES ON public."dobby_v2_households" TO "service_role";
GRANT TRIGGER ON public."dobby_v2_households" TO "service_role";
GRANT TRUNCATE ON public."dobby_v2_households" TO "service_role";
CREATE TABLE public."dobby_v2_memberships" (
  "household_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dobby_v2_memberships_household_id_fkey" FOREIGN KEY (household_id) REFERENCES dobby_v2_households(id),
  CONSTRAINT "dobby_v2_memberships_pkey" PRIMARY KEY (household_id, user_id),
  CONSTRAINT "dobby_v2_memberships_role_check" CHECK (role = ANY (ARRAY['owner'::text, 'member'::text])),
  CONSTRAINT "dobby_v2_memberships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
ALTER TABLE public."dobby_v2_memberships" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public."dobby_v2_memberships" TO "authenticated";
GRANT REFERENCES ON public."dobby_v2_memberships" TO "service_role";
GRANT TRIGGER ON public."dobby_v2_memberships" TO "service_role";
GRANT TRUNCATE ON public."dobby_v2_memberships" TO "service_role";
CREATE TABLE public."dobby_sync_grocery_items" (
  "id" uuid NOT NULL,
  "title" text NOT NULL,
  "quantity" numeric(12,2) DEFAULT 1 NOT NULL,
  "unit" text DEFAULT ''::text NOT NULL,
  "checked" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "revision" bigint DEFAULT 1 NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "dobby_sync_grocery_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "dobby_sync_grocery_items_quantity_check" CHECK (quantity >= 0::numeric),
  CONSTRAINT "dobby_sync_grocery_items_revision_check" CHECK (revision >= 1),
  CONSTRAINT "dobby_sync_grocery_items_title_check" CHECK (length(btrim(title)) >= 1 AND length(btrim(title)) <= 200),
  CONSTRAINT "dobby_sync_grocery_items_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
ALTER TABLE public."dobby_sync_grocery_items" ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public."dobby_sync_grocery_items" TO "authenticated";
GRANT SELECT ON public."dobby_sync_grocery_items" TO "authenticated";
GRANT UPDATE ON public."dobby_sync_grocery_items" TO "authenticated";
GRANT REFERENCES ON public."dobby_sync_grocery_items" TO "service_role";
GRANT TRIGGER ON public."dobby_sync_grocery_items" TO "service_role";
GRANT TRUNCATE ON public."dobby_sync_grocery_items" TO "service_role";
CREATE TABLE public."dobby_v2_grocery" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL,
  "title" text NOT NULL,
  "quantity" numeric(12,2),
  "unit" text DEFAULT ''::text NOT NULL,
  "checked" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "revision" bigint DEFAULT 1 NOT NULL,
  "deleted_at" timestamp with time zone,
  "import_source_id" uuid,
  CONSTRAINT "dobby_v2_grocery_household_id_fkey" FOREIGN KEY (household_id) REFERENCES dobby_v2_households(id),
  CONSTRAINT "dobby_v2_grocery_household_id_import_source_id_key" UNIQUE (household_id, import_source_id),
  CONSTRAINT "dobby_v2_grocery_pkey" PRIMARY KEY (id),
  CONSTRAINT "dobby_v2_grocery_quantity_check" CHECK (quantity IS NULL OR quantity >= 0::numeric),
  CONSTRAINT "dobby_v2_grocery_title_check" CHECK (length(btrim(title)) >= 1 AND length(btrim(title)) <= 200),
  CONSTRAINT "dobby_v2_grocery_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
ALTER TABLE public."dobby_v2_grocery" ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public."dobby_v2_grocery" TO "authenticated";
GRANT SELECT ON public."dobby_v2_grocery" TO "authenticated";
GRANT UPDATE ON public."dobby_v2_grocery" TO "authenticated";
GRANT REFERENCES ON public."dobby_v2_grocery" TO "service_role";
GRANT TRIGGER ON public."dobby_v2_grocery" TO "service_role";
GRANT TRUNCATE ON public."dobby_v2_grocery" TO "service_role";
CREATE TABLE public."dobby_v2_modules" (
  "household_id" uuid NOT NULL,
  "module" text NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "revision" bigint DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid,
  CONSTRAINT "dobby_v2_modules_household_id_fkey" FOREIGN KEY (household_id) REFERENCES dobby_v2_households(id),
  CONSTRAINT "dobby_v2_modules_module_check" CHECK (module = ANY (ARRAY['menus'::text, 'recipes'::text, 'missions'::text, 'house'::text, 'family'::text, 'contracts'::text])),
  CONSTRAINT "dobby_v2_modules_payload_check" CHECK (jsonb_typeof(payload) = 'object'::text AND octet_length(payload::text) <= 262144),
  CONSTRAINT "dobby_v2_modules_pkey" PRIMARY KEY (household_id, module),
  CONSTRAINT "dobby_v2_modules_revision_check" CHECK (revision > 0),
  CONSTRAINT "dobby_v2_modules_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
ALTER TABLE public."dobby_v2_modules" ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public."dobby_v2_modules" TO "authenticated";
GRANT SELECT ON public."dobby_v2_modules" TO "authenticated";
GRANT UPDATE ON public."dobby_v2_modules" TO "authenticated";
GRANT REFERENCES ON public."dobby_v2_modules" TO "service_role";
GRANT TRIGGER ON public."dobby_v2_modules" TO "service_role";
GRANT TRUNCATE ON public."dobby_v2_modules" TO "service_role";
CREATE OR REPLACE FUNCTION public.dobby_missions_v2_capabilities(p_household_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF dobby_runes_private.request_user_id() IS NULL OR NOT EXISTS(SELECT 1 FROM public.dobby_v2_memberships m WHERE m.household_id=p_household_id AND m.user_id=dobby_runes_private.request_user_id() AND m.active) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Appartenance active au foyer requise';
 END IF;
 RETURN pg_catalog.jsonb_build_object('protocol',2,'maxPayloadBytes',262144,'directWritesBlocked',true,'ledgerVersions',pg_catalog.jsonb_build_array(1,2));
END;
$function$
;
CREATE OR REPLACE FUNCTION public.dobby_missions_v2_write(p_household_id uuid, p_expected_revision bigint, p_operation_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.dobby_sync_stamper()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    new.revision := 1;
    new.created_at := now();
  else
    new.revision := old.revision + 1;
    new.created_at := old.created_at;
  end if;
  new.updated_at := clock_timestamp();
  new.updated_by := auth.uid();
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.dobby_v2_grocery_stamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    IF TG_OP = 'UPDATE' THEN

        IF NEW.id IS DISTINCT FROM OLD.id
           OR NEW.household_id IS DISTINCT FROM OLD.household_id
           OR NEW.import_source_id IS DISTINCT FROM OLD.import_source_id
        THEN
            RAISE EXCEPTION
                'Modification interdite de l identité de l article';
        END IF;

        NEW.revision := OLD.revision + 1;
        NEW.created_at := OLD.created_at;

    ELSE
        NEW.revision := 1;
        NEW.created_at := now();
    END IF;

    NEW.updated_at := clock_timestamp();
    NEW.updated_by := auth.uid();

    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.dobby_v2_modules_stamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE TRIGGER dobby_sync_grocery_stamp BEFORE INSERT OR UPDATE ON dobby_sync_grocery_items FOR EACH ROW EXECUTE FUNCTION dobby_sync_stamper();
CREATE TRIGGER dobby_v2_grocery_stamp_trigger BEFORE INSERT OR UPDATE ON dobby_v2_grocery FOR EACH ROW EXECUTE FUNCTION dobby_v2_grocery_stamp();
CREATE TRIGGER dobby_missions_v2_guard BEFORE INSERT OR DELETE OR UPDATE ON dobby_v2_modules FOR EACH ROW EXECUTE FUNCTION dobby_runes_private.guard_missions();
CREATE TRIGGER dobby_v2_modules_stamp_trigger BEFORE INSERT OR UPDATE ON dobby_v2_modules FOR EACH ROW EXECUTE FUNCTION dobby_v2_modules_stamp();
GRANT SELECT ON public.dobby_v2_memberships TO dobby_missions_v2_writer;
GRANT SELECT,INSERT,UPDATE ON public.dobby_v2_modules TO dobby_missions_v2_writer;

CREATE POLICY "dobby_sync_members_self_read" ON public."dobby_sync_members" FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "dobby_v2_households_read" ON public."dobby_v2_households" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM dobby_v2_memberships m
  WHERE ((m.household_id = dobby_v2_households.id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND m.active))));
CREATE POLICY "dobby_missions_writer_membership" ON public."dobby_v2_memberships" FOR SELECT TO "dobby_missions_v2_writer" USING (((user_id = ( SELECT dobby_runes_private.request_user_id() AS request_user_id)) AND active));
CREATE POLICY "dobby_v2_memberships_self" ON public."dobby_v2_memberships" FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "dobby_sync_grocery_members_insert" ON public."dobby_sync_grocery_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM dobby_sync_members m
  WHERE ((m.user_id = ( SELECT auth.uid() AS uid)) AND m.active))));
CREATE POLICY "dobby_sync_grocery_members_read" ON public."dobby_sync_grocery_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM dobby_sync_members m
  WHERE ((m.user_id = ( SELECT auth.uid() AS uid)) AND m.active))));
CREATE POLICY "dobby_sync_grocery_members_update" ON public."dobby_sync_grocery_items" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM dobby_sync_members m
  WHERE ((m.user_id = ( SELECT auth.uid() AS uid)) AND m.active)))) WITH CHECK ((EXISTS ( SELECT 1
   FROM dobby_sync_members m
  WHERE ((m.user_id = ( SELECT auth.uid() AS uid)) AND m.active))));
CREATE POLICY "dobby_v2_grocery_add" ON public."dobby_v2_grocery" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM dobby_v2_memberships m
  WHERE ((m.household_id = dobby_v2_grocery.household_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND m.active))));
CREATE POLICY "dobby_v2_grocery_edit" ON public."dobby_v2_grocery" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM dobby_v2_memberships m
  WHERE ((m.household_id = dobby_v2_grocery.household_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND m.active)))) WITH CHECK ((EXISTS ( SELECT 1
   FROM dobby_v2_memberships m
  WHERE ((m.household_id = dobby_v2_grocery.household_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND m.active))));
CREATE POLICY "dobby_v2_grocery_read" ON public."dobby_v2_grocery" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM dobby_v2_memberships m
  WHERE ((m.household_id = dobby_v2_grocery.household_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND m.active))));
CREATE POLICY "dobby_missions_writer_module_insert" ON public."dobby_v2_modules" FOR INSERT TO "dobby_missions_v2_writer" WITH CHECK (((module = 'missions'::text) AND (EXISTS ( SELECT 1
   FROM dobby_v2_memberships m
  WHERE ((m.household_id = dobby_v2_modules.household_id) AND (m.user_id = ( SELECT dobby_runes_private.request_user_id() AS request_user_id)) AND m.active)))));
CREATE POLICY "dobby_missions_writer_module_read" ON public."dobby_v2_modules" FOR SELECT TO "dobby_missions_v2_writer" USING (((module = 'missions'::text) AND (EXISTS ( SELECT 1
   FROM dobby_v2_memberships m
  WHERE ((m.household_id = dobby_v2_modules.household_id) AND (m.user_id = ( SELECT dobby_runes_private.request_user_id() AS request_user_id)) AND m.active)))));
CREATE POLICY "dobby_missions_writer_module_update" ON public."dobby_v2_modules" FOR UPDATE TO "dobby_missions_v2_writer" USING (((module = 'missions'::text) AND (EXISTS ( SELECT 1
   FROM dobby_v2_memberships m
  WHERE ((m.household_id = dobby_v2_modules.household_id) AND (m.user_id = ( SELECT dobby_runes_private.request_user_id() AS request_user_id)) AND m.active))))) WITH CHECK (((module = 'missions'::text) AND (EXISTS ( SELECT 1
   FROM dobby_v2_memberships m
  WHERE ((m.household_id = dobby_v2_modules.household_id) AND (m.user_id = ( SELECT dobby_runes_private.request_user_id() AS request_user_id)) AND m.active)))));
CREATE POLICY "dobby_v2_modules_insert" ON public."dobby_v2_modules" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM dobby_v2_memberships m
  WHERE ((m.household_id = dobby_v2_modules.household_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND m.active))));
CREATE POLICY "dobby_v2_modules_read" ON public."dobby_v2_modules" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM dobby_v2_memberships m
  WHERE ((m.household_id = dobby_v2_modules.household_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND m.active))));
CREATE POLICY "dobby_v2_modules_update" ON public."dobby_v2_modules" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM dobby_v2_memberships m
  WHERE ((m.household_id = dobby_v2_modules.household_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND m.active)))) WITH CHECK ((EXISTS ( SELECT 1
   FROM dobby_v2_memberships m
  WHERE ((m.household_id = dobby_v2_modules.household_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND m.active))));
