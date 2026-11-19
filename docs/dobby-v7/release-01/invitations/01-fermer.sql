-- RELEASE-01. Exécution manuelle après validation humaine du point de reprise.
-- Aucun déploiement automatique. PostgreSQL 17, sous le propriétaire postgres.
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL search_path = pg_catalog;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

-- Exclut les mutations en cours et les SELECT FOR UPDATE. Les lectures simples restent possibles.
LOCK TABLE dobby_v7_private.invitations IN EXCLUSIVE MODE;

DO $preflight$
DECLARE
  target regclass := 'dobby_v7_private.invitations'::regclass;
  writer regrole := 'dobby_socle_writer'::regrole;
BEGIN
  IF current_user <> 'postgres' OR
    NOT EXISTS (SELECT FROM pg_class WHERE oid = target AND relowner = current_user::regrole)
  THEN
    RAISE EXCEPTION 'Propriétaire postgres requis pour modifier les ACL de invitations';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE oid = writer AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls)
    OR NOT has_table_privilege(writer, target, 'SELECT')
  THEN
    RAISE EXCEPTION 'Writer ou lecture de invitations différents du relevé';
  END IF;
  IF (SELECT count(*) FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a
      WHERE c.oid = target AND a.grantee = writer AND a.grantor = current_user::regrole
      AND a.privilege_type IN ('INSERT','UPDATE') AND NOT a.is_grantable) <> 2
  THEN
    RAISE EXCEPTION 'Les deux grants directs sans délégation sont requis';
  END IF;
  IF EXISTS (SELECT FROM pg_attribute c CROSS JOIN LATERAL aclexplode(c.attacl) a
    WHERE c.attrelid = target AND a.grantee = writer AND a.privilege_type IN ('INSERT','UPDATE'))
  THEN
    RAISE EXCEPTION 'Grant de colonne direct inattendu. Aucun droit révoqué';
  END IF;
  IF EXISTS (SELECT FROM dobby_v7_private.invitations
    WHERE accepted_by IS NULL AND revoked_at IS NULL AND expires_at > clock_timestamp())
  THEN
    RAISE EXCEPTION 'Invitation valide en attente. Arrêter avant révocation des droits';
  END IF;
END $preflight$;

REVOKE INSERT, UPDATE ON TABLE dobby_v7_private.invitations FROM dobby_socle_writer RESTRICT;

DO $verify$
BEGIN
  IF NOT has_table_privilege('dobby_socle_writer','dobby_v7_private.invitations','SELECT')
    OR has_any_column_privilege('dobby_socle_writer','dobby_v7_private.invitations','INSERT')
    OR has_any_column_privilege('dobby_socle_writer','dobby_v7_private.invitations','UPDATE')
  THEN
    RAISE EXCEPTION 'ACL effective inattendue après REVOKE. Transaction annulée';
  END IF;
END $verify$;

COMMIT;
