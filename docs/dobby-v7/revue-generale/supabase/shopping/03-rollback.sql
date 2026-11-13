-- MANUAL ONLY. Safe rollback is application rollback, retaining additive data.
-- Restore the previous tested application version; leave this column in place.
-- Old client PATCH omits at_home_quantity and preserves its values.
-- No DROP COLUMN: removal would destroy family availability and pending queues.
BEGIN READ ONLY;
SELECT column_name,data_type,is_nullable,column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='dobby_v2_grocery' AND column_name='at_home_quantity';
SELECT 'rollback_application_only_keep_availability_data' AS rollback_instruction;
COMMIT;
-- If 01-install fails before COMMIT, PostgreSQL rolls back its whole transaction.
