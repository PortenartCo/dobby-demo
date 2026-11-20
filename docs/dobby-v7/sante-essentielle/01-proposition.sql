-- Proposition DOBBY personnelle. À exécuter en développement isolé ou après GO distinct.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
BEGIN
  IF to_regprocedure('dobby_socle_private.actor_context(uuid,boolean)') IS NULL
     OR to_regprocedure('dobby_v7_private.actor()') IS NULL
     OR to_regprocedure('storage.allow_only_operation(text)') IS NULL
     OR to_regclass('dobby_v7_private.account_links') IS NULL
     OR NOT EXISTS (SELECT FROM pg_class WHERE oid = 'storage.objects'::regclass AND relrowsecurity)
     OR EXISTS (SELECT FROM storage.buckets WHERE id = 'dobby-health-files') THEN
    RAISE EXCEPTION 'Prérequis Santé absents ou bucket déjà présent : vérifier le catalogue.';
  END IF;
END $$;

CREATE ROLE dobby_health_writer NOLOGIN NOINHERIT NOBYPASSRLS;
GRANT dobby_health_writer TO postgres WITH INHERIT FALSE, SET TRUE;
CREATE SCHEMA dobby_health_private;
REVOKE ALL ON SCHEMA dobby_health_private FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE, CREATE ON SCHEMA dobby_health_private, public TO dobby_health_writer;
GRANT USAGE ON SCHEMA dobby_v7_private, dobby_socle_private, storage TO dobby_health_writer;
GRANT EXECUTE ON FUNCTION dobby_v7_private.actor(), dobby_socle_private.actor_context(uuid,boolean) TO dobby_health_writer;
DO $$
BEGIN
  IF NOT has_schema_privilege('dobby_health_writer','dobby_v7_private','USAGE')
     OR NOT has_schema_privilege('dobby_health_writer','dobby_socle_private','USAGE')
     OR NOT has_function_privilege('dobby_health_writer','dobby_v7_private.actor()','EXECUTE')
     OR NOT has_function_privilege('dobby_health_writer','dobby_socle_private.actor_context(uuid,boolean)','EXECUTE') THEN
    RAISE EXCEPTION 'Délégations privées du résolveur Famille manquantes.';
  END IF;
END $$;
GRANT SELECT ON public.dobby_v2_modules TO dobby_health_writer;
CREATE POLICY dobby_health_members_source ON public.dobby_v2_modules
  FOR SELECT TO dobby_health_writer USING (module = 'family');

-- An explicit authorization binds the caregiver account AND its canonical member ID.
-- Administration provisions this table after checking responsibility for this child.
-- Keep the API and downloads closed until the native member lifecycle and routes are verified.
CREATE TABLE dobby_health_private.install_state (
  singleton boolean PRIMARY KEY CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false
);
INSERT INTO dobby_health_private.install_state (singleton) VALUES (true);
ALTER TABLE dobby_health_private.install_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE dobby_health_private.install_state FORCE ROW LEVEL SECURITY;
REVOKE ALL ON dobby_health_private.install_state FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON dobby_health_private.install_state TO dobby_health_writer;
CREATE POLICY dobby_health_state_read ON dobby_health_private.install_state
  FOR SELECT TO dobby_health_writer USING (true);

CREATE TABLE dobby_health_private.caregivers (
  household_id uuid NOT NULL,
  child_member_id text NOT NULL,
  caregiver_user_id uuid NOT NULL,
  caregiver_member_id text NOT NULL,
  PRIMARY KEY (household_id, child_member_id, caregiver_user_id),
  FOREIGN KEY (household_id, caregiver_user_id)
    REFERENCES public.dobby_v2_memberships (household_id, user_id)
);
ALTER TABLE dobby_health_private.caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dobby_health_private.caregivers FORCE ROW LEVEL SECURITY;
REVOKE ALL ON dobby_health_private.caregivers FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON dobby_health_private.caregivers TO dobby_health_writer;
CREATE POLICY dobby_health_caregiver_read ON dobby_health_private.caregivers
  FOR SELECT TO dobby_health_writer USING (caregiver_user_id = (SELECT dobby_v7_private.actor()));

CREATE TABLE dobby_health_private.entries (
  household_id uuid NOT NULL REFERENCES public.dobby_v2_households (id),
  id uuid NOT NULL,
  member_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('profile', 'visit', 'instruction', 'document')),
  fields jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  removed boolean NOT NULL DEFAULT false,
  operation_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  file_path text UNIQUE,
  file_uploader uuid,
  PRIMARY KEY (household_id, id),
  CHECK ((kind = 'document') = (file_path IS NOT NULL AND file_uploader IS NOT NULL))
);
CREATE UNIQUE INDEX dobby_health_one_profile ON dobby_health_private.entries (household_id, member_id)
  WHERE kind = 'profile' AND NOT removed;
CREATE INDEX dobby_health_entries_by_member ON dobby_health_private.entries (household_id, member_id, kind)
  WHERE NOT removed;
ALTER TABLE dobby_health_private.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE dobby_health_private.entries FORCE ROW LEVEL SECURITY;
REVOKE ALL ON dobby_health_private.entries FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON dobby_health_private.entries TO dobby_health_writer;
CREATE POLICY dobby_health_writer_access ON dobby_health_private.entries TO dobby_health_writer USING (true);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('dobby-health-files', 'dobby-health-files', false, 10485760,
        ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
GRANT SELECT (bucket_id, name, metadata) ON storage.objects TO dobby_health_writer;
CREATE POLICY dobby_health_finalize_object ON storage.objects FOR SELECT TO dobby_health_writer
  USING (bucket_id = 'dobby-health-files');

SET LOCAL ROLE dobby_health_writer;

CREATE FUNCTION dobby_health_private.context_for(p_household_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE actor jsonb;
BEGIN
  IF p_household_id IS NULL OR NOT EXISTS (
    SELECT FROM dobby_health_private.install_state WHERE singleton AND enabled
  ) THEN RETURN NULL; END IF;
  actor := dobby_socle_private.actor_context(p_household_id, false);
  IF actor->>'phase' = 'active'
     AND actor->>'householdId' = p_household_id::text
     AND actor->>'userId' = dobby_v7_private.actor()::text
     AND actor->>'category' IN ('parent', 'child') THEN
    RETURN actor;
  END IF;
  RETURN NULL;
EXCEPTION WHEN insufficient_privilege THEN RETURN NULL;
END $$;

CREATE FUNCTION dobby_health_private.members(p_household_id uuid) RETURNS SETOF jsonb
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT member
  FROM public.dobby_v2_modules m
  CROSS JOIN LATERAL jsonb_array_elements(m.payload->'familyMembers') member
  WHERE m.household_id = p_household_id AND m.module = 'family'
$$;

CREATE FUNCTION dobby_health_private.can_manage(p_household_id uuid, p_member_id text, p_actor jsonb)
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT COALESCE(p_actor->>'category' = 'parent' AND EXISTS (
    SELECT FROM dobby_health_private.members(p_household_id) member
    WHERE member->>'id' = p_member_id AND
      ((member->>'memberCategory' = 'parent' AND p_member_id = p_actor->>'memberId') OR
       (member->>'memberCategory' IN ('child', 'baby') AND EXISTS (
        SELECT FROM dobby_health_private.caregivers c
        WHERE c.household_id = p_household_id AND c.child_member_id = p_member_id
          AND c.caregiver_user_id = dobby_v7_private.actor()
          AND c.caregiver_member_id = p_actor->>'memberId'
       )))
  ), false)
$$;

CREATE FUNCTION dobby_health_private.storage_allowed(p_path text, p_upload boolean) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT FROM dobby_health_private.entries e
    WHERE e.file_path = p_path AND e.kind = 'document' AND NOT e.removed
      AND dobby_health_private.can_manage(e.household_id, e.member_id,
                                          dobby_health_private.context_for(e.household_id))
      AND CASE WHEN p_upload THEN (e.fields->>'ready')::boolean = false AND e.file_uploader = dobby_v7_private.actor()
               ELSE (e.fields->>'ready')::boolean END
  )
$$;

CREATE FUNCTION dobby_health_private.read_rows(p_household_id uuid, p_view text, p_member_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor jsonb := dobby_health_private.context_for(p_household_id);
  actor_member text := actor->>'memberId';
  is_child boolean := actor->>'category' = 'child';
  today date := (statement_timestamp() AT TIME ZONE 'Europe/Brussels')::date;
  result jsonb;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Accès Santé refusé'; END IF;
  IF p_view = 'people' AND p_member_id IS NULL THEN
    SELECT jsonb_agg(jsonb_build_object('id', m->>'id', 'name', m->>'name',
                    'category', m->>'memberCategory') ORDER BY m->>'id' IS DISTINCT FROM actor_member, m->>'name') INTO result
    FROM dobby_health_private.members(p_household_id) m
    WHERE (is_child AND m->>'id' = actor_member)
      OR dobby_health_private.can_manage(p_household_id, m->>'id', actor);

  ELSIF p_view = 'private' THEN
    IF NOT dobby_health_private.can_manage(p_household_id, p_member_id, actor) THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Carnet Santé refusé';
    END IF;
    SELECT jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind, 'revision', e.revision,
                    'fields', e.fields, 'path', e.file_path,
                    'canUpload', e.file_uploader = dobby_v7_private.actor()) ORDER BY e.kind, e.fields->>'date', e.id)
      INTO result
    FROM dobby_health_private.entries e
    WHERE e.household_id = p_household_id AND e.member_id = p_member_id AND NOT e.removed;

  ELSIF p_view = 'practical' AND p_member_id IS NULL THEN
    IF NOT is_child THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Vue pratique réservée'; END IF;
    SELECT jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind,
      'date', e.fields->>'date', 'time', e.fields->>'time', 'place', e.fields->>'childPlace',
      'text', e.fields->>'childText') ORDER BY e.fields->>'date', e.fields->>'time', e.id) INTO result
    FROM dobby_health_private.entries e
    WHERE e.household_id = p_household_id AND e.member_id = actor_member AND NOT e.removed
      AND e.fields @> '{"childVisible":true}'::jsonb
      AND (e.kind = 'instruction' OR (e.kind = 'visit'
        AND e.fields @> '{"cancelled":false}'::jsonb AND e.fields->>'date' >= to_char(today, 'YYYY-MM-DD')));

  ELSIF p_view = 'agenda' AND p_member_id IS NULL THEN
    SELECT jsonb_agg(jsonb_build_object('id', e.id, 'date', e.fields->>'date',
        'time', e.fields->>'time') ORDER BY e.fields->>'date', e.fields->>'time', e.id) INTO result
    FROM dobby_health_private.entries e
    WHERE e.household_id = p_household_id AND e.kind = 'visit' AND NOT e.removed
      AND e.fields @> '{"agendaVisible":true,"cancelled":false}'::jsonb
      AND EXISTS (SELECT FROM dobby_health_private.members(p_household_id) member
                  WHERE member->>'id' = e.member_id AND member->>'memberCategory' IN ('parent', 'child', 'baby'))
      AND (NOT is_child OR (e.member_id = actor_member AND e.fields @> '{"childVisible":true}'::jsonb));

  ELSIF p_view = 'reminders' AND p_member_id IS NULL THEN
    SELECT jsonb_agg(jsonb_build_object('id', e.id, 'date', e.fields->>'date',
      'time', e.fields->>'time', 'offset', (e.fields->>'date')::date - today)
      ORDER BY e.fields->>'date', e.fields->>'time', e.id) INTO result
    FROM dobby_health_private.entries e
    WHERE e.household_id = p_household_id AND e.kind = 'visit' AND NOT e.removed
      AND e.fields @> '{"cancelled":false}'::jsonb
      AND ((e.fields->>'date' = to_char(today+1, 'YYYY-MM-DD') AND e.fields @> '{"remindDayBefore":true}'::jsonb)
        OR (e.fields->>'date' = to_char(today, 'YYYY-MM-DD') AND e.fields @> '{"remindSameDay":true}'::jsonb))
      AND ((is_child AND e.member_id = actor_member AND e.fields @> '{"childVisible":true}'::jsonb)
        OR dobby_health_private.can_manage(p_household_id, e.member_id, actor));
  ELSE
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Vue Santé invalide';
  END IF;
  RETURN COALESCE(result, '[]'::jsonb);
END $$;

CREATE FUNCTION dobby_health_private.normalized(p_kind text, supplied jsonb, child_target boolean)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE
  fields jsonb;
  key text;
  value jsonb;
  max_chars integer;
  content_date date;
BEGIN
  fields := CASE p_kind
    WHEN 'profile' THEN '{"information":"","allergies":"","treatments":""}'
    WHEN 'visit' THEN '{"title":"","provider":"","date":"","time":"","location":"","note":"","reference":"",
      "cancelled":false,"childVisible":false,"childPlace":"","childText":"","agendaVisible":false,
      "remindDayBefore":true,"remindSameDay":true}'
    WHEN 'instruction' THEN '{"childVisible":false,"childText":""}'
    WHEN 'document' THEN '{"title":"","mime":""}'
  END;
  IF jsonb_typeof(supplied) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Champs Santé invalides';
  END IF;
  FOR key, value IN SELECT * FROM jsonb_each(supplied) LOOP
    IF NOT (fields ? key) OR jsonb_typeof(fields->key) IS DISTINCT FROM jsonb_typeof(value) THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Champ Santé non autorisé';
    END IF;
    IF jsonb_typeof(value) = 'string' THEN
      max_chars := CASE
        WHEN key IN ('information','allergies','treatments') THEN 4000
        WHEN key IN ('note','childText') THEN 500
        ELSE 160 END;
      IF length(value #>> '{}') > max_chars THEN
        RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Champ Santé trop long';
      END IF;
      value := to_jsonb(btrim(value #>> '{}'));
    END IF;
    fields := jsonb_set(fields, ARRAY[key], value);
  END LOOP;
  IF (fields ? 'title' AND fields->>'title' = '') OR
     (p_kind = 'instruction' AND fields->>'childText' = '') OR
     (NOT child_target AND (p_kind = 'instruction' OR fields @> '{"childVisible":true}'::jsonb)) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Champs Santé incomplets ou visibilité invalide';
  END IF;
  IF p_kind = 'visit' THEN
    IF fields->>'date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR
       fields->>'time' !~ '^$|^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Date ou heure Santé invalide';
    END IF;
    BEGIN
      content_date := (fields->>'date')::date;
    EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Date Santé invalide';
    END;
    IF content_date NOT BETWEEN DATE '2000-01-01' AND DATE '2100-12-31'
       OR to_char(content_date, 'YYYY-MM-DD') <> fields->>'date' THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Date Santé invalide';
    END IF;
  END IF;
  RETURN fields;
END $$;

-- The same household lock is taken by administrative grant changes and Santé writes.
CREATE FUNCTION dobby_health_private.lock_caregiver_changes() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE target uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Retirer et recréer l’autorisation Santé';
  END IF;
  target := CASE WHEN TG_OP = 'DELETE' THEN OLD.household_id ELSE NEW.household_id END;
  PERFORM pg_advisory_xact_lock(hashtextextended('dobby-health-acl:'||target::text, 0));
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION dobby_health_private.write_row(
  p_household_id uuid, p_id uuid, p_member_id text, p_kind text, p_action text,
  p_revision integer, p_operation_id uuid, p_values jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor jsonb;
  category text;
  previous dobby_health_private.entries%ROWTYPE;
  is_existing boolean;
  new_fields jsonb;
  path text;
  extension text;
  result_revision integer;
BEGIN
  actor := dobby_health_private.context_for(p_household_id);
  IF NOT dobby_health_private.can_manage(p_household_id, p_member_id, actor) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Modification Santé refusée';
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('profile','visit','instruction','document')
     OR p_action IS NULL OR p_action NOT IN ('save','remove','finalize')
     OR p_id IS NULL OR p_operation_id IS NULL OR p_revision IS NULL OR p_revision < 0
     OR (p_action = 'finalize' AND p_kind <> 'document')
     OR (p_action <> 'save' AND p_values IS DISTINCT FROM '{}'::jsonb) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Opération Santé invalide';
  END IF;
  -- Maintain the native account, membership and household lock order.
  PERFORM dobby_socle_private.actor_context(p_household_id, true);
  PERFORM pg_advisory_xact_lock(hashtextextended('dobby-health-acl:'||p_household_id::text, 0));
  -- Revalidate once in-flight authorization changes have committed.
  IF NOT dobby_health_private.can_manage(p_household_id, p_member_id,
                                        dobby_health_private.context_for(p_household_id)) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Modification Santé refusée';
  END IF;
  SELECT * INTO previous FROM dobby_health_private.entries WHERE household_id=p_household_id AND id=p_id;
  is_existing := FOUND;
  IF is_existing AND (previous.member_id <> p_member_id OR previous.kind <> p_kind) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Modification Santé refusée';
  END IF;

  IF p_action = 'save' THEN
    SELECT m->>'memberCategory' INTO category FROM dobby_health_private.members(p_household_id) m
    WHERE m->>'id' = p_member_id;
    new_fields := dobby_health_private.normalized(p_kind, p_values, category IN ('baby','child'));
    IF p_kind = 'document' THEN
      extension := CASE new_fields->>'mime'
        WHEN 'application/pdf' THEN 'pdf' WHEN 'image/jpeg' THEN 'jpg'
        WHEN 'image/png' THEN 'png' WHEN 'image/webp' THEN 'webp' END;
      IF extension IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='PDF ou image requis'; END IF;
      path := p_household_id::text||'/'||p_id::text||'.'||extension;
      new_fields := new_fields || '{"ready":false}'::jsonb;
    END IF;
  ELSE
    new_fields := previous.fields;
    IF p_action = 'finalize' THEN new_fields := new_fields || '{"ready":true}'::jsonb; END IF;
  END IF;

  IF is_existing AND previous.operation_id = p_operation_id THEN
    IF previous.actor_id = dobby_v7_private.actor() AND previous.revision = p_revision + 1
       AND previous.fields = new_fields AND previous.removed = (p_action = 'remove') THEN
      RETURN jsonb_build_object('id', p_id, 'revision', previous.revision, 'path', previous.file_path);
    END IF;
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Opération Santé réutilisée';
  END IF;
  IF (NOT is_existing AND (p_revision <> 0 OR p_action <> 'save')) OR
     (is_existing AND (previous.revision <> p_revision OR previous.removed)) THEN
    RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='Cette fiche Santé a changé. Rechargez-la avant de l’enregistrer.';
  END IF;
  IF is_existing AND p_kind = 'document' AND
     (p_action = 'save' OR (p_action = 'finalize' AND (
       previous.file_uploader <> dobby_v7_private.actor() OR previous.fields @> '{"ready":true}'::jsonb OR
       NOT EXISTS (SELECT FROM storage.objects o
         WHERE o.bucket_id='dobby-health-files' AND o.name=previous.file_path
           AND o.metadata->>'mimetype' = previous.fields->>'mime'
           AND o.metadata->>'cacheControl' = 'private, no-store'
           AND CASE WHEN jsonb_typeof(o.metadata->'size') = 'number'
                    THEN (o.metadata->>'size')::numeric BETWEEN 1 AND 10485760
                    ELSE false END)
     ))) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Pièce Santé non confirmée ou non modifiable';
  END IF;
  result_revision := p_revision + 1;
  IF is_existing THEN
    UPDATE dobby_health_private.entries
    SET fields=new_fields, revision=result_revision, operation_id=p_operation_id,
        actor_id=dobby_v7_private.actor(), removed=(p_action='remove')
    WHERE household_id=p_household_id AND id=p_id;
  ELSE
    INSERT INTO dobby_health_private.entries
      (household_id,id,member_id,kind,fields,operation_id,actor_id,file_path,file_uploader)
    VALUES (p_household_id,p_id,p_member_id,p_kind,new_fields,p_operation_id,dobby_v7_private.actor(),path,
            CASE WHEN path IS NOT NULL THEN dobby_v7_private.actor() END);
  END IF;
  RETURN jsonb_build_object('id', p_id, 'revision', result_revision, 'path', COALESCE(path, previous.file_path));
END $$;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA dobby_health_private FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION dobby_health_private.read_rows(uuid,text,text),
  dobby_health_private.write_row(uuid,uuid,text,text,text,integer,uuid,jsonb),
  dobby_health_private.storage_allowed(text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION dobby_health_private.lock_caregiver_changes() TO postgres;

CREATE FUNCTION public.dobby_health_read(p_household_id uuid, p_view text, p_member_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM set_config('response.headers', '[{"Cache-Control":"private, no-store"}]', true);
  RETURN dobby_health_private.read_rows(p_household_id, p_view, p_member_id);
END $$;
CREATE FUNCTION public.dobby_health_write(
  p_household_id uuid, p_id uuid, p_member_id text, p_kind text, p_action text,
  p_revision integer, p_operation_id uuid, p_values jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT dobby_health_private.write_row(p_household_id,p_id,p_member_id,p_kind,p_action,p_revision,p_operation_id,p_values)
$$;

REVOKE ALL ON FUNCTION public.dobby_health_read(uuid,text,text),
  public.dobby_health_write(uuid,uuid,text,text,text,integer,uuid,jsonb) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.dobby_health_read(uuid,text,text),
  public.dobby_health_write(uuid,uuid,text,text,text,integer,uuid,jsonb) TO authenticated;

RESET ROLE;
CREATE TRIGGER dobby_health_lock_caregiver_changes BEFORE INSERT OR UPDATE OR DELETE
  ON dobby_health_private.caregivers FOR EACH ROW
  EXECUTE FUNCTION dobby_health_private.lock_caregiver_changes();
GRANT USAGE ON SCHEMA dobby_health_private TO authenticated;
REVOKE CREATE ON SCHEMA dobby_health_private, public FROM dobby_health_writer;
GRANT dobby_health_writer TO postgres WITH INHERIT FALSE, SET FALSE;

-- Restrictive policies protect this bucket even in the presence of broader
-- permissive policies. Signed URLs and listing have no matching operation.
CREATE POLICY dobby_health_isolate_read ON storage.objects AS RESTRICTIVE FOR SELECT TO PUBLIC
  USING (bucket_id <> 'dobby-health-files' OR current_user IN ('authenticated','dobby_health_writer'));
CREATE POLICY dobby_health_authorize_read ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
  USING (CASE WHEN bucket_id = 'dobby-health-files' THEN
    storage.allow_only_operation('storage.object.get_authenticated') AND
    dobby_health_private.storage_allowed(name, false)
  ELSE true END);
CREATE POLICY dobby_health_isolate_upload ON storage.objects AS RESTRICTIVE FOR INSERT TO PUBLIC
  WITH CHECK (bucket_id <> 'dobby-health-files' OR current_user = 'authenticated');
CREATE POLICY dobby_health_authorize_upload ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (CASE WHEN bucket_id = 'dobby-health-files' THEN
    storage.allow_only_operation('storage.object.upload') AND dobby_health_private.storage_allowed(name, true)
  ELSE true END);
CREATE POLICY dobby_health_isolate_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO PUBLIC
  USING (bucket_id <> 'dobby-health-files') WITH CHECK (bucket_id <> 'dobby-health-files');
CREATE POLICY dobby_health_isolate_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO PUBLIC
  USING (bucket_id <> 'dobby-health-files');

CREATE POLICY dobby_health_storage_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dobby-health-files');
CREATE POLICY dobby_health_storage_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dobby-health-files');

COMMIT;
