-- Retour arrière CONSERVATEUR : suspend les nouvelles capacités clientes/F08.
-- Ne détruit aucune liaison ni invitation consommée, aucun profil ou historique.
-- Conserve les RPC corrigées et policies restrictives pour ne pas rouvrir les
-- anciennes autorisations enfant. Ce n'est pas une restitution de l'owner V7.
BEGIN;
SET LOCAL lock_timeout='5s';
UPDATE dobby_socle_private.install_state SET family_api_enabled=false,
 family_client_verified=false,storage_client_verified=false,child_link_client_verified=false,missions_client_verified=false WHERE singleton;
SELECT jsonb_build_object('rollback','suspend-socle-family-v1','newChildAcceptanceDisabled',true,
 'clientFlagsClosed',true,'accountLinksAndProfilesPreserved',true,'permissionsHardeningRetained',true,
 'originalV7OwnerRestored',false) AS rollback_result;
COMMIT;
