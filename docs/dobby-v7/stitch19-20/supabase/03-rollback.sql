-- RETOUR ARRIÈRE MANUEL du code V7 uniquement. Aucun compte/foyer/profil supprimé.
-- Les cinq tables privées, leurs reçus et le secret restent conservés et fermés.
-- Une réactivation nécessite une migration examinée : 01-apply refuse le rejeu.
BEGIN;
SET LOCAL lock_timeout='5s';
DROP TRIGGER IF EXISTS dobby_v7_family_guard ON public.dobby_v2_modules;
DROP FUNCTION IF EXISTS public.dobby_v7_update_member(text,jsonb,bigint,uuid);
DROP FUNCTION IF EXISTS public.dobby_v7_update_magic(text,jsonb,bigint,uuid);
DROP FUNCTION IF EXISTS public.dobby_v7_bind_existing_member(uuid,text,uuid);
DROP FUNCTION IF EXISTS public.dobby_v7_revoke_invitation(uuid);
DROP FUNCTION IF EXISTS public.dobby_v7_accept_invitation(text,uuid);
DROP FUNCTION IF EXISTS public.dobby_v7_preview_invitation(text);
DROP FUNCTION IF EXISTS public.dobby_v7_create_invitation(integer,uuid);
DROP FUNCTION IF EXISTS public.dobby_v7_create_household(text,uuid);
DROP FUNCTION IF EXISTS public.dobby_v7_update_profile(jsonb,bigint);
DROP FUNCTION IF EXISTS public.dobby_v7_context();
DROP POLICY IF EXISTS dobby_v7_family_writer ON public.dobby_v2_modules;
DROP POLICY IF EXISTS dobby_v7_membership_writer ON public.dobby_v2_memberships;
DROP POLICY IF EXISTS dobby_v7_household_writer ON public.dobby_v2_households;
REVOKE SELECT,INSERT ON public.dobby_v2_households,public.dobby_v2_memberships FROM dobby_v7_writer;
REVOKE UPDATE(active) ON public.dobby_v2_memberships FROM dobby_v7_writer;
REVOKE SELECT,INSERT,UPDATE ON public.dobby_v2_modules FROM dobby_v7_writer;
-- Le propriétaire du schéma peut retirer le seul helper accessible au client.
DROP FUNCTION IF EXISTS dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb);
DROP FUNCTION IF EXISTS dobby_v7_private.link_existing_owner(uuid,uuid,text);
DROP FUNCTION IF EXISTS dobby_v7_private.verification_counts();
REVOKE USAGE ON SCHEMA dobby_v7_private FROM authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
