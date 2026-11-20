-- DOBBY Santé. Exécuter en postgres après 01-proposition.sql, avant l'activation.
-- Ce verrou ne déplace et ne purge aucune donnée historique.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
BEGIN
  IF current_user <> 'postgres'
     OR (SELECT relowner FROM pg_catalog.pg_class WHERE oid = 'public.dobby_v2_modules'::regclass) <> current_user::regrole
     OR NOT EXISTS (SELECT FROM dobby_health_private.install_state WHERE singleton AND NOT enabled AND NOT legacy_closed) THEN
    RAISE EXCEPTION 'Installer la protection historique en postgres avec Santé fermée.';
  END IF;
END $$;

CREATE FUNCTION dobby_health_private.has_legacy_health(p_payload jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT coalesce(
    (p_payload ? 'sharedHealthVisits' AND p_payload->'sharedHealthVisits' IS DISTINCT FROM '[]'::jsonb)
    OR (p_payload ? 'famHealth' AND p_payload->'famHealth' IS DISTINCT FROM '[]'::jsonb)
    OR p_payload @? '$.contracts[*] ? (@.category == "Santé")', false)
$$;

CREATE FUNCTION dobby_health_private.guard_legacy_activation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.legacy_closed THEN
    IF NEW.legacy_closed IS DISTINCT FROM true THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'La fermeture du partage Santé historique reste acquise.';
    END IF;
    IF NOT NEW.enabled THEN RETURN NEW; END IF;
  ELSIF NEW.legacy_closed IS DISTINCT FROM false THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'La première activation valide ferme le partage Santé historique.';
  ELSIF NOT NEW.enabled THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_class c JOIN pg_catalog.pg_roles r ON r.rolname = current_user
    WHERE c.oid = 'public.dobby_v2_modules'::regclass
      AND (r.rolsuper OR r.rolbypassrls OR (c.relowner = r.oid AND NOT c.relforcerowsecurity))) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Inventaire Santé non vérifiable avec le rôle courant.';
  END IF;
  -- A new snapshot is needed after waiting for writers of old module data.
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION USING ERRCODE = '25001', MESSAGE = 'Activer Santé dans une transaction READ COMMITTED.';
  END IF;
  IF EXISTS (SELECT FROM public.dobby_v2_modules m
    WHERE dobby_health_private.has_legacy_health(m.payload)) THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Activation Santé bloquée par des données Santé historiques dans les modules partagés.';
  END IF;
  IF NOT dobby_health_private.dependencies_ready() THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Activation Santé bloquée : dépendances techniques incomplètes.';
  END IF;
  NEW.legacy_closed := true;
  RETURN NEW;
END $$;

CREATE FUNCTION dobby_health_private.guard_legacy_snapshot() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE legacy_closed boolean;
BEGIN
  IF NOT dobby_health_private.has_legacy_health(NEW.payload) THEN RETURN NEW; END IF;
  -- Hold the singleton row until this write commits. The activation UPDATE
  -- waits here, then checks the committed module data before opening Santé.
  SELECT state.legacy_closed INTO legacy_closed FROM dobby_health_private.install_state state
    WHERE state.singleton FOR SHARE;
  IF legacy_closed IS DISTINCT FROM false THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Données Santé historiques refusées dans les modules partagés après leur fermeture.';
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION dobby_health_private.has_legacy_health(jsonb),
  dobby_health_private.guard_legacy_activation(), dobby_health_private.guard_legacy_snapshot()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER dobby_health_legacy_activation_guard BEFORE INSERT OR UPDATE OF enabled,legacy_closed
  ON dobby_health_private.install_state FOR EACH ROW
  EXECUTE FUNCTION dobby_health_private.guard_legacy_activation();
ALTER TABLE dobby_health_private.install_state ENABLE ALWAYS TRIGGER dobby_health_legacy_activation_guard;

CREATE TRIGGER dobby_health_legacy_snapshot_guard BEFORE INSERT OR UPDATE OF module,payload
  ON public.dobby_v2_modules FOR EACH ROW
  EXECUTE FUNCTION dobby_health_private.guard_legacy_snapshot();
ALTER TABLE public.dobby_v2_modules ENABLE ALWAYS TRIGGER dobby_health_legacy_snapshot_guard;

COMMIT;
