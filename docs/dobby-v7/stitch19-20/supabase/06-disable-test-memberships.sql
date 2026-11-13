-- DOBBY familial personnel uniquement. Exécution distante MANUELLE utilisateur.
-- Renseigner le seul NULL avec le foyer confirmé par 05. Aucun identifiant Auth.
-- Deux lignes exactes, aucun DELETE, aucun changement de rôle/schéma/RLS/V1/module.
-- Seulement après le diagnostic réel et la revue de ce script.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
SET LOCAL row_security=off;
DO $fresh_start$
DECLARE
  selected_household uuid := NULL::uuid; -- UUID exact confirmé par le diagnostic 05
  n bigint; affected bigint; private_counts jsonb; before_members jsonb; before_modules jsonb;
  before_auth uuid[]; actor record;
BEGIN
  IF selected_household IS NULL THEN RAISE EXCEPTION 'Renseigner explicitement le foyer de test confirmé par 05'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.dobby_v2_households WHERE id=selected_household) THEN
    RAISE EXCEPTION 'Foyer sélectionné absent; aucune modification';
  END IF;
  -- Même verrou de compte que les RPC V7, avant les verrous de tables.
  FOR actor IN SELECT user_id FROM public.dobby_v2_memberships
    WHERE household_id=selected_household ORDER BY user_id LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('dobby-v7-account:'||actor.user_id::text,0));
  END LOOP;
  LOCK TABLE public.dobby_v2_households IN SHARE MODE;
  LOCK TABLE public.dobby_v2_memberships IN SHARE ROW EXCLUSIVE MODE;
  PERFORM 1 FROM public.dobby_v2_memberships WHERE household_id=selected_household FOR UPDATE;
  LOCK TABLE public.dobby_v2_modules IN SHARE MODE;

  -- Un rôle soumis à RLS ne doit jamais faire passer un compte masqué pour zéro.
  IF (SELECT count(*) FROM public.dobby_v2_households)<>1 THEN
    RAISE EXCEPTION 'Le nombre de foyers a changé; refaire 05, aucun reset global';
  END IF;
  IF (SELECT count(*) FROM public.dobby_v2_memberships)<>2 OR
     (SELECT count(*) FROM public.dobby_v2_memberships WHERE household_id=selected_household AND role='owner' AND active=true)<>2 THEN
    RAISE EXCEPTION 'Attendu exactement deux anciennes appartenances owner actives dans le foyer confirmé';
  END IF;
  IF EXISTS(SELECT 1 FROM public.dobby_v2_memberships WHERE active AND household_id<>selected_household) THEN
    RAISE EXCEPTION 'Un autre foyer actif existe; aucune modification';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.dobby_v2_memberships'::regclass AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Trigger métier sur les appartenances; réexaminer les dépendances avant modification';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.dobby_v2_memberships'::regclass
    AND contype='p' AND pg_get_constraintdef(oid)='PRIMARY KEY (household_id, user_id)')
    OR NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.dobby_v2_memberships'::regclass
      AND attname='active' AND atttypid='boolean'::regtype AND attnotnull AND NOT attisdropped) THEN
    RAISE EXCEPTION 'Schéma des appartenances inattendu; refaire 05';
  END IF;
  SELECT array_agg(id ORDER BY id) INTO before_auth FROM auth.users;
  IF cardinality(before_auth)<>2 OR before_auth IS DISTINCT FROM
    (SELECT array_agg(user_id ORDER BY user_id) FROM public.dobby_v2_memberships WHERE household_id=selected_household) THEN
    RAISE EXCEPTION 'Les deux comptes Auth et les deux appartenances ne correspondent plus exactement';
  END IF;
  IF (SELECT count(*) FROM public.dobby_v2_modules)<>6 OR
    (SELECT jsonb_object_agg(module,revision) FROM public.dobby_v2_modules WHERE household_id=selected_household)
      IS DISTINCT FROM '{"contracts":3,"family":2,"house":1,"menus":2,"missions":2,"recipes":1}'::jsonb OR
    (SELECT payload->'familyMembers' FROM public.dobby_v2_modules WHERE household_id=selected_household AND module='family') IS DISTINCT FROM '[]'::jsonb THEN
    RAISE EXCEPTION 'Les six modules de test ou leurs révisions ont changé; refaire 05';
  END IF;
  IF (SELECT count(*) FROM pg_trigger WHERE tgrelid='public.dobby_v2_modules'::regclass AND tgenabled='O'
    AND tgname IN ('dobby_missions_v2_guard','dobby_v2_modules_stamp_trigger','dobby_v7_family_guard'))<>3 THEN
    RAISE EXCEPTION 'Protections de modules attendues absentes; ne pas poursuivre';
  END IF;
  -- Le helper existant est nécessaire : aucune lecture directe FORCE RLS.
  IF to_regprocedure('dobby_v7_private.verification_counts()') IS NULL THEN
    RAISE EXCEPTION 'Vérification privée V7 absente; installer/vérifier V7 et refaire 05';
  END IF;
  PERFORM set_config('row_security','on',true);
  SELECT dobby_v7_private.verification_counts() INTO private_counts;
  PERFORM set_config('row_security','off',true);
  IF private_counts IS DISTINCT FROM '{"bindings":0,"pendingProfiles":0,"invitations":0}'::jsonb THEN
    RAISE EXCEPTION 'Liaisons, brouillons ou invitations V7 présents; aucune modification';
  END IF;
  SELECT jsonb_agg(to_jsonb(m)-'active' ORDER BY m.user_id) INTO before_members
    FROM public.dobby_v2_memberships m WHERE m.household_id=selected_household;
  SELECT jsonb_agg(to_jsonb(m) ORDER BY m.module) INTO before_modules
    FROM public.dobby_v2_modules m WHERE m.household_id=selected_household;

  UPDATE public.dobby_v2_memberships SET active=false
    WHERE household_id=selected_household AND role='owner' AND active=true;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>2 THEN RAISE EXCEPTION 'Deux lignes exactement étaient attendues; transaction annulée'; END IF;
  IF before_members IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(m)-'active' ORDER BY m.user_id)
      FROM public.dobby_v2_memberships m WHERE m.household_id=selected_household)
    OR before_modules IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.module)
      FROM public.dobby_v2_modules m WHERE m.household_id=selected_household)
    OR before_auth IS DISTINCT FROM (SELECT array_agg(id ORDER BY id) FROM auth.users) THEN
    RAISE EXCEPTION 'Une donnée hors active a changé; transaction annulée';
  END IF;
  PERFORM set_config('dobby.fresh_start_action',jsonb_build_object(
    'action','disable-only-confirmed-test-memberships','householdId',selected_household,'affectedMembershipRows',affected,
    'oldHouseholdActiveRows',(SELECT count(*) FROM public.dobby_v2_memberships WHERE household_id=selected_household AND active),
    'authUsersPreserved',2,'moduleRowsPreserved',6,'moduleRowsUnchanged',true,
    'membershipMetadataUnchanged',true,'rolesAndJoinedAtUnchanged',true,
    'legacyV1Untouched',true,'noDeletion',true)::text,true);
END $fresh_start$;
SELECT jsonb_pretty(current_setting('dobby.fresh_start_action')::jsonb) AS fresh_start_action;
COMMIT;
