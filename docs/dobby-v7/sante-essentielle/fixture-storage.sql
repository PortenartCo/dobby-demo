CREATE SCHEMA storage;
CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean, file_size_limit integer, allowed_mime_types text[]);
CREATE TABLE storage.objects(bucket_id text REFERENCES storage.buckets, name text, metadata jsonb, PRIMARY KEY(bucket_id,name));
CREATE FUNCTION storage.allow_only_operation(operation text) RETURNS boolean LANGUAGE sql STABLE AS
  $$ SELECT COALESCE(current_setting('storage.test.operation',true) = operation,false) $$;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated;
-- Deliberately broad permissive policy to exercise the bucket's restrictive guards.
CREATE POLICY fixture_storage_legacy ON storage.objects USING(true) WITH CHECK(true);
INSERT INTO storage.buckets VALUES('other', 'other', true, NULL, NULL);
