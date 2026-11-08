-- Dobby personnel : un seul espace de fichiers par foyer, 10 Mo par fichier.
-- À exécuter UNIQUEMENT dans le projet Supabase personnel Dobby.
-- Aucune table métier créée, aucun rôle supplémentaire, aucun document existant déplacé.
BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dobby-family-files', 'dobby-family-files', false, 10485760,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id='dobby-family-files' AND public=false
      AND file_size_limit <= 10485760
  ) THEN
    RAISE EXCEPTION 'Le bucket Dobby doit rester privé et limité à 10 Mo.';
  END IF;
END;
$$;

DROP POLICY IF EXISTS dobby_family_files_read ON storage.objects;
CREATE POLICY dobby_family_files_read
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id='dobby-family-files' AND
  EXISTS (
    SELECT 1 FROM public.dobby_v2_memberships m
    WHERE m.active=true
      AND m.user_id=(SELECT auth.uid())
      AND m.household_id::text=(storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS dobby_family_files_upload ON storage.objects;
CREATE POLICY dobby_family_files_upload
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id='dobby-family-files' AND
  EXISTS (
    SELECT 1 FROM public.dobby_v2_memberships m
    WHERE m.active=true
      AND m.user_id=(SELECT auth.uid())
      AND m.household_id::text=(storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS dobby_family_files_delete ON storage.objects;
CREATE POLICY dobby_family_files_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id='dobby-family-files' AND
  EXISTS (
    SELECT 1 FROM public.dobby_v2_memberships m
    WHERE m.active=true
      AND m.user_id=(SELECT auth.uid())
      AND m.household_id::text=(storage.foldername(name))[1]
  )
);

COMMIT;

SELECT
  b.id,
  b.public AS accessible_publiquement,
  b.file_size_limit AS limite_octets,
  (SELECT count(*) FROM pg_policies p
   WHERE p.schemaname='storage'
     AND p.tablename='objects'
     AND p.policyname IN ('dobby_family_files_read','dobby_family_files_upload','dobby_family_files_delete')
  ) AS politiques
FROM storage.buckets b
WHERE b.id='dobby-family-files';
