-- LECTURE SEULE, juste après 06 et AVANT le nouveau profil/foyer.
-- Même rôle d'installation, seul projet familial personnel.
-- Renseigner le même foyer confirmé; aucun identifiant Auth n'est affiché.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='30s';
SET LOCAL row_security=off;
DO $verify_fresh$
DECLARE selected_household uuid := NULL::uuid; private_counts jsonb; auth_ids uuid[]; modules jsonb;
BEGIN
  IF selected_household IS NULL THEN RAISE EXCEPTION 'Renseigner le foyer confirmé utilisé dans 06'; END IF;
  IF (SELECT count(*) FROM public.dobby_v2_households)<>1 OR
    NOT EXISTS(SELECT 1 FROM public.dobby_v2_households WHERE id=selected_household) THEN
    RAISE EXCEPTION 'Nombre ou identité des foyers modifiés; ne pas conclure au reset attendu';
  END IF;
  IF (SELECT count(*) FROM public.dobby_v2_memberships)<>2 OR
    (SELECT count(*) FROM public.dobby_v2_memberships WHERE household_id=selected_household AND role='owner' AND NOT active)<>2 OR
    EXISTS(SELECT 1 FROM public.dobby_v2_memberships WHERE active) THEN
    RAISE EXCEPTION 'Les deux seules appartenances V2 doivent être inactives dans le foyer confirmé';
  END IF;
  SELECT array_agg(id ORDER BY id) INTO auth_ids FROM auth.users;
  IF cardinality(auth_ids)<>2 OR auth_ids IS DISTINCT FROM
    (SELECT array_agg(user_id ORDER BY user_id) FROM public.dobby_v2_memberships WHERE household_id=selected_household) THEN
    RAISE EXCEPTION 'Les deux comptes Auth attendus ne sont pas établis';
  END IF;
  SELECT jsonb_object_agg(module,revision) INTO modules FROM public.dobby_v2_modules WHERE household_id=selected_household;
  IF (SELECT count(*) FROM public.dobby_v2_modules)<>6 OR modules IS DISTINCT FROM
    '{"contracts":3,"family":2,"house":1,"menus":2,"missions":2,"recipes":1}'::jsonb OR
    (SELECT payload->'familyMembers' FROM public.dobby_v2_modules WHERE household_id=selected_household AND module='family') IS DISTINCT FROM '[]'::jsonb THEN
    RAISE EXCEPTION 'Modules ou révisions différents du diagnostic; nouvelle vérification nécessaire';
  END IF;
  PERFORM set_config('row_security','on',true);
  SELECT dobby_v7_private.verification_counts() INTO private_counts;
  PERFORM set_config('row_security','off',true);
  IF private_counts IS DISTINCT FROM '{"bindings":0,"pendingProfiles":0,"invitations":0}'::jsonb THEN
    RAISE EXCEPTION 'Le parcours V7 a déjà commencé ou un état privé est apparu; ne pas refaire 06/08';
  END IF;
  IF (SELECT count(*) FROM public.dobby_sync_members)<>2 OR
    (SELECT count(*) FROM public.dobby_sync_members WHERE active)<>2 THEN
    RAISE EXCEPTION 'Les appartenances historiques V1 ont changé; elles ne sont pas concernées par 06';
  END IF;
  PERFORM set_config('dobby.fresh_start_verification',jsonb_build_object(
    'verification','dobby-stitch19-20-fresh-start-v1','readOnly',true,
    'databaseVersion',current_setting('server_version'),'householdId',selected_household,
    'authUsers',2,'householdsPreserved',1,'oldOwnerMemberships',2,'inactiveOldMemberships',2,'globalActiveV2Memberships',0,
    'moduleRows',6,'moduleRevisions',modules,'canonicalMembersInOldHousehold',0,
    'privateV7',private_counts,'legacyV1Memberships',jsonb_build_object('rows',2,'activeRows',2,'untouchedByReset',true),
    'membershipMetadataCheck','06 compare avant/après tous les champs hors active, y compris rôle et joined_at',
    'nextStep','Premier compte : nouveau profil puis nouveau foyer; second compte : nouveau profil puis invitation. Ne pas exécuter 04.')::text,true);
END $verify_fresh$;
SELECT jsonb_pretty(current_setting('dobby.fresh_start_verification')::jsonb) AS fresh_start_verification;
COMMIT;
