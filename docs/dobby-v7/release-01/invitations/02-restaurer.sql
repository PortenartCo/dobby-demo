-- RELEASE-01. Retour arrière manuel de 01-fermer.sql après validation humaine.
-- Comparer le catalogue courant à la preuve de fermeture avant de lancer ce fichier.
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL search_path = pg_catalog;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

LOCK TABLE dobby_v7_private.invitations IN EXCLUSIVE MODE;

DO $preflight$
DECLARE
  target regclass := 'dobby_v7_private.invitations'::regclass;
  writer regrole := 'dobby_socle_writer'::regrole;
BEGIN
  IF current_user <> 'postgres' OR
    NOT EXISTS (SELECT FROM pg_class WHERE oid = target AND relowner = current_user::regrole)
  THEN
    RAISE EXCEPTION 'Propriétaire postgres requis pour rétablir les ACL de invitations';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE oid = writer AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls)
    OR NOT has_table_privilege(writer, target, 'SELECT')
    OR has_any_column_privilege(writer, target, 'INSERT')
    OR has_any_column_privilege(writer, target, 'UPDATE')
  THEN
    RAISE EXCEPTION 'État fermé attendu absent. Aucun droit rétabli';
  END IF;
END $preflight$;

GRANT INSERT, UPDATE ON TABLE dobby_v7_private.invitations TO dobby_socle_writer;

DO $verify$
BEGIN
  IF NOT has_table_privilege('dobby_socle_writer','dobby_v7_private.invitations','INSERT')
    OR NOT has_table_privilege('dobby_socle_writer','dobby_v7_private.invitations','UPDATE')
    OR has_any_column_privilege('dobby_socle_writer','dobby_v7_private.invitations','INSERT WITH GRANT OPTION')
    OR has_any_column_privilege('dobby_socle_writer','dobby_v7_private.invitations','UPDATE WITH GRANT OPTION')
  THEN
    RAISE EXCEPTION 'ACL effective inattendue après GRANT. Transaction annulée';
  END IF;
END $verify$;

COMMIT;
