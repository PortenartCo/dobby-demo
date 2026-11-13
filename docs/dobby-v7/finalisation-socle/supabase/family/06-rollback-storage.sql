-- Projet familial uniquement. Retour de l'étape Storage séparée.
-- ATTENTION : retirer ces policies retire la protection Enfant des fichiers.
-- Suspendre d'abord les nouveaux accès via 05-rollback-suspend.sql et faire
-- examiner/suspendre les comptes enfants actifs ; ne pas appliquer en routine.
-- Exige le même droit propriétaire géré que l'installation Storage.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $$ BEGIN
 PERFORM 1 FROM dobby_socle_private.install_state WHERE singleton FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'État de suspension absent'; END IF;
 IF EXISTS(SELECT 1 FROM dobby_socle_private.install_state WHERE singleton AND
  (family_api_enabled OR family_client_verified OR storage_client_verified OR child_link_client_verified OR missions_client_verified)) THEN
  RAISE EXCEPTION 'Suspendre les capacités socle avant toute dépose Storage';
 END IF;
 IF EXISTS(SELECT 1 FROM dobby_v7_private.account_links l
  JOIN public.dobby_v2_memberships a ON a.household_id=l.household_id AND a.user_id=l.user_id AND a.active
  LEFT JOIN public.dobby_v2_modules m ON m.household_id=l.household_id AND m.module='family'
  WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(m.payload->'familyMembers','[]')) e
   WHERE e->>'id'=l.member_id AND e->>'memberCategory'='parent')) THEN
  RAISE EXCEPTION 'Dépose refusée : des comptes enfants actifs ou profils liés non Parents exigent encore la protection Storage';
 END IF;
END $$;
DROP POLICY IF EXISTS dobby_socle_parent_update_allow ON storage.objects;
DROP POLICY IF EXISTS dobby_socle_parent_insert ON storage.objects;
DROP POLICY IF EXISTS dobby_socle_parent_update ON storage.objects;
DROP POLICY IF EXISTS dobby_socle_parent_delete ON storage.objects;
DROP POLICY IF EXISTS dobby_socle_canonical_read ON storage.objects;
COMMIT;
