-- DOBBY familial. Exécution manuelle et indépendante de l'activation Santé.
-- Conserver le registre lors d'une suspension ou restauration fonctionnelle.
-- Transaction du rôle de plateforme, propriétaire effectif des opérations DDL.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = current_user AND rolsuper) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Le rôle de plateforme est requis pour les propriétaires Famille fermés.';
  END IF;
  IF to_regprocedure('dobby_v7_private.actor()') IS NULL
     OR to_regprocedure('dobby_socle_private.actor_context(uuid,boolean)') IS NULL
     OR to_regprocedure('dobby_socle_private.members(jsonb)') IS NULL
     OR NOT EXISTS (
       SELECT FROM pg_trigger
       WHERE tgrelid = 'public.dobby_v2_modules'::regclass
         AND tgname = 'dobby_v7_family_guard'
         AND tgfoid = to_regprocedure('dobby_v7_private.guard_family()')
         AND tgenabled IN ('O', 'A') AND NOT tgisinternal
     ) THEN
    RAISE EXCEPTION 'Socle Famille canonique requis.';
  END IF;
  IF EXISTS (
    SELECT FROM pg_auth_members
    WHERE roleid IN ('dobby_v7_writer'::regrole, 'dobby_socle_writer'::regrole)
      AND (inherit_option OR set_option)
  ) THEN
    RAISE EXCEPTION 'Délégation persistante des rôles d’écriture Famille.';
  END IF;
END $$;

LOCK TABLE public.dobby_v2_modules IN SHARE ROW EXCLUSIVE MODE;

CREATE ROLE dobby_family_identity_writer NOLOGIN NOINHERIT NOBYPASSRLS;

CREATE SCHEMA dobby_family_identity_private;
REVOKE ALL ON SCHEMA dobby_family_identity_private FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE, CREATE ON SCHEMA dobby_family_identity_private TO dobby_family_identity_writer;
GRANT USAGE ON SCHEMA dobby_family_identity_private TO authenticated, dobby_v7_writer, dobby_socle_writer;
GRANT USAGE ON SCHEMA dobby_v7_private, dobby_socle_private TO dobby_family_identity_writer;
GRANT EXECUTE ON FUNCTION dobby_v7_private.actor(), dobby_socle_private.actor_context(uuid,boolean),
  dobby_socle_private.members(jsonb) TO dobby_family_identity_writer;

-- No foreign key with cascading deletion: a disappearing household or family
-- must never make one of its existing identifiers eligible for reuse.
CREATE TABLE dobby_family_identity_private.member_ids (
  household_id uuid NOT NULL,
  member_id text NOT NULL CHECK (length(member_id) BETWEEN 1 AND 120),
  state text NOT NULL CHECK (state IN ('reserved', 'active', 'retired')),
  issuer uuid,
  PRIMARY KEY (household_id, member_id),
  CHECK ((state = 'reserved') = (issuer IS NOT NULL))
);

INSERT INTO dobby_family_identity_private.member_ids (household_id, member_id, state)
SELECT m.household_id, e.value->>'id', 'active'
FROM public.dobby_v2_modules m
CROSS JOIN LATERAL jsonb_array_elements(dobby_socle_private.members(m.payload)) e
WHERE m.module = 'family';

-- Reserve all still identifiable historical identities, including an unused
-- targeted invitation whose member was removed before this installation.
INSERT INTO dobby_family_identity_private.member_ids (household_id, member_id, state)
SELECT household_id, member_id, 'retired' FROM dobby_v7_private.account_links
UNION
SELECT household_id, target_member_id, 'retired'
FROM dobby_v7_private.invitations WHERE target_member_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE dobby_family_identity_private.member_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE dobby_family_identity_private.member_ids FORCE ROW LEVEL SECURITY;
REVOKE ALL ON dobby_family_identity_private.member_ids FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON dobby_family_identity_private.member_ids TO dobby_family_identity_writer;
GRANT UPDATE (state, issuer) ON dobby_family_identity_private.member_ids TO dobby_family_identity_writer;
CREATE POLICY dobby_family_identity_runtime ON dobby_family_identity_private.member_ids
  TO dobby_family_identity_writer USING (true) WITH CHECK (true);

SET LOCAL ROLE dobby_family_identity_writer;

CREATE FUNCTION dobby_family_identity_private.reserve_id(p_household_id uuid, p_actor uuid) RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  INSERT INTO dobby_family_identity_private.member_ids (household_id, member_id, state, issuer)
  VALUES (p_household_id, 'member-v7-' || gen_random_uuid()::text, 'reserved', p_actor)
  RETURNING member_id
$$;

CREATE FUNCTION dobby_family_identity_private.reserve_for_parent(p_household_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := dobby_v7_private.actor();
  context jsonb := dobby_socle_private.actor_context(p_household_id, false);
BEGIN
  IF p_household_id IS NULL
     OR context->>'phase' IS DISTINCT FROM 'active'
     OR context->>'householdId' IS DISTINCT FROM p_household_id::text
     OR context->>'userId' IS DISTINCT FROM actor::text
     OR context->>'category' IS DISTINCT FROM 'parent'
     OR context->'permissions'->'canCreate' IS DISTINCT FROM 'true'::jsonb THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Création du membre non autorisée.';
  END IF;
  RETURN dobby_family_identity_private.reserve_id(p_household_id, actor);
END $$;

CREATE FUNCTION dobby_family_identity_private.guard_family() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  before_members jsonb := '[]';
  after_members jsonb := '[]';
  home uuid;
  identity text;
  actor uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.module = 'family' OR NEW.module = 'family')
     AND (OLD.household_id, OLD.module) IS DISTINCT FROM (NEW.household_id, NEW.module) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Déplacement du registre Famille interdit.';
  END IF;
  IF TG_OP <> 'INSERT' AND OLD.module = 'family' THEN
    home := OLD.household_id;
    before_members := dobby_socle_private.members(OLD.payload);
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.module = 'family' THEN
    home := NEW.household_id;
    after_members := dobby_socle_private.members(NEW.payload);
  END IF;
  IF home IS NULL OR before_members = after_members THEN RETURN NULL; END IF;

  -- An AFTER trigger only runs for the effective branch of a native upsert.
  -- PostgreSQL serializes changes to the same family row before this check.
  FOR identity IN
    SELECT e.value->>'id' FROM jsonb_array_elements(after_members) e
    EXCEPT
    SELECT e.value->>'id' FROM jsonb_array_elements(before_members) e
  LOOP
    IF actor IS NULL THEN actor := dobby_v7_private.actor(); END IF;
    UPDATE dobby_family_identity_private.member_ids
    SET state = 'active', issuer = NULL
    WHERE household_id = home AND member_id = identity AND state = 'reserved' AND issuer = actor;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Identité de membre indisponible. Créez un nouveau profil.';
    END IF;
  END LOOP;

  UPDATE dobby_family_identity_private.member_ids
  SET state = 'retired', issuer = NULL
  WHERE household_id = home AND member_id IN (
    SELECT e.value->>'id' FROM jsonb_array_elements(before_members) e
    EXCEPT
    SELECT e.value->>'id' FROM jsonb_array_elements(after_members) e
  );
  RETURN NULL;
END $$;

CREATE FUNCTION dobby_family_identity_private.guard_truncate() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Suppression en bloc du registre Famille interdite.';
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA dobby_family_identity_private FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION dobby_family_identity_private.reserve_id(uuid,uuid) TO dobby_v7_writer, dobby_socle_writer;
GRANT EXECUTE ON FUNCTION dobby_family_identity_private.reserve_for_parent(uuid) TO authenticated;
RESET ROLE;

CREATE FUNCTION public.dobby_v7_reserve_member_id(p_household_id uuid) RETURNS text
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT dobby_family_identity_private.reserve_for_parent(p_household_id)
$$;
REVOKE ALL ON FUNCTION public.dobby_v7_reserve_member_id(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dobby_v7_reserve_member_id(uuid) TO authenticated;

-- Both native onboarding paths still create the same parent profile and account
-- binding. Replace only the allocation expression and retain owner, ACL and OID.
DO $$
DECLARE
  target regprocedure;
  definition text;
  original text := $source$id text:='member-'||gen_random_uuid()::text;$source$;
  replacement text := 'id text:=dobby_family_identity_private.reserve_id(p_household,p_actor);';
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'dobby_v7_private.add_pending_member(uuid,uuid)'::regprocedure,
    'dobby_socle_private.add_pending_member(uuid,uuid)'::regprocedure
  ] LOOP
    definition := pg_get_functiondef(target);
    IF (length(definition) - length(replace(definition, original, ''))) <> length(original) THEN
      RAISE EXCEPTION 'Allocation native Famille différente du socle attendu : %', target;
    END IF;
    EXECUTE replace(definition, original, replacement);
  END LOOP;
END $$;

CREATE TRIGGER dobby_family_identity_lifecycle AFTER INSERT OR UPDATE OR DELETE ON public.dobby_v2_modules
FOR EACH ROW EXECUTE FUNCTION dobby_family_identity_private.guard_family();
ALTER TABLE public.dobby_v2_modules ENABLE ALWAYS TRIGGER dobby_family_identity_lifecycle;
CREATE TRIGGER dobby_family_identity_no_truncate BEFORE TRUNCATE ON public.dobby_v2_modules
FOR EACH STATEMENT EXECUTE FUNCTION dobby_family_identity_private.guard_truncate();
ALTER TABLE public.dobby_v2_modules ENABLE ALWAYS TRIGGER dobby_family_identity_no_truncate;

REVOKE CREATE ON SCHEMA dobby_family_identity_private FROM dobby_family_identity_writer;

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_auth_members
    WHERE roleid = 'dobby_family_identity_writer'::regrole OR member = 'dobby_family_identity_writer'::regrole
  ) THEN
    RAISE EXCEPTION 'Rôles d’écriture Famille insuffisamment isolés.';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
