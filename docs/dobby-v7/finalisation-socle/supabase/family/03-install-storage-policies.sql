-- Projet familial uniquement. Exécution MANUELLE : étape Storage séparée.
-- PostgreSQL/Supabase peut refuser CREATE POLICY sur la table gérée.
-- En cas de 42501 : toute cette transaction est annulée, transmettre l'erreur.
-- Ne pas changer son owner, ne pas retirer RLS, ne pas accorder un rôle géré.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
 IF to_regclass('storage.objects') IS NULL OR to_regprocedure('dobby_socle_private.is_parent(uuid)') IS NULL THEN RAISE EXCEPTION 'Storage ou socle familial absent'; END IF;
 IF EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname LIKE 'dobby_socle_%') THEN RAISE EXCEPTION 'Policies socle Storage déjà présentes : vérifier, ne pas réinstaller'; END IF;
END $$;
CREATE POLICY dobby_socle_parent_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK(bucket_id<>'dobby-family-files' OR CASE WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN dobby_socle_private.is_parent(((storage.foldername(name))[1])::uuid) ELSE false END);
CREATE POLICY dobby_socle_parent_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
USING(bucket_id<>'dobby-family-files' OR CASE WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN dobby_socle_private.is_parent(((storage.foldername(name))[1])::uuid) ELSE false END)
WITH CHECK(bucket_id<>'dobby-family-files' OR CASE WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN dobby_socle_private.is_parent(((storage.foldername(name))[1])::uuid) ELSE false END);
CREATE POLICY dobby_socle_parent_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
USING(bucket_id<>'dobby-family-files' OR CASE WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN dobby_socle_private.is_parent(((storage.foldername(name))[1])::uuid) ELSE false END);
CREATE POLICY dobby_socle_canonical_read ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
USING(bucket_id<>'dobby-family-files' OR CASE WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN dobby_socle_private.can_read(((storage.foldername(name))[1])::uuid) ELSE false END);
-- The real catalog has read/insert/delete only. Supply the missing UPDATE
-- allow-policy narrowly for a canonical Parent in this exact family bucket.
CREATE POLICY dobby_socle_parent_update_allow ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
USING(bucket_id='dobby-family-files' AND CASE WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN dobby_socle_private.is_parent(((storage.foldername(name))[1])::uuid) ELSE false END
) WITH CHECK(bucket_id='dobby-family-files' AND CASE WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN dobby_socle_private.is_parent(((storage.foldername(name))[1])::uuid) ELSE false END
);
-- No bucket/object/content is changed; existing permissive policies remain.
COMMIT;
