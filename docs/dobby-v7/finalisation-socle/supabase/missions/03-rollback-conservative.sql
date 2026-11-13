-- Retour arrière conservateur, à exécuter MANUELLEMENT dans le projet familial.
-- Fermer aussi le gate frontend avant cette opération. Aucun crédit ni reçu
-- n'est supprimé, converti, redistribué ou réécrit, y compris après usage V3.
BEGIN;
SET LOCAL lock_timeout='5s';
UPDATE dobby_socle_private.install_state SET missions_client_verified=false WHERE singleton;
GRANT dobby_socle_writer TO CURRENT_USER WITH INHERIT FALSE, SET TRUE;
SET LOCAL ROLE dobby_socle_writer;
REVOKE EXECUTE ON FUNCTION public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb),
 public.dobby_missions_v3_capabilities(uuid) FROM authenticated,anon,PUBLIC,service_role;
RESET ROLE;
GRANT dobby_socle_writer TO CURRENT_USER WITH INHERIT FALSE, SET FALSE;
NOTIFY pgrst,'reload schema';
COMMIT;
-- Conserver les fonctions, garde V2, wrapper parent et receipts. L'ancien V2
-- refuse un foyer dont le payload est V3 : ne pas contourner cette protection.
-- Après ce rollback, les foyers déjà V3 restent lisibles mais les mutations
-- Missions sont suspendues jusqu'à une nouvelle intervention compatible.
