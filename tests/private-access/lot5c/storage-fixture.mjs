// SQL composition fixture, NOT a Storage HTTP proof or managed-owner proof.
import {readFileSync} from 'node:fs';
import {root,run,q} from '../local-db.mjs';
import {resolve} from 'node:path';
export function prepareStorage(){
 const source=readFileSync(resolve(root,'supabase/migrations/20261118112535_dobby_private_access_storage.sql'),'utf8');
 const operation=source.match(/expected_operation text:=\$source\$([\s\S]*?)\$source\$/)[1];
 const any=source.match(/expected_any text:=\$source\$([\s\S]*?)\$source\$/)[1];
 const folder=readFileSync(new URL('./storage-folder.sql',import.meta.url),'utf8');
 run(`SET ROLE postgres; CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,public boolean); CREATE TABLE storage.objects(bucket_id text,name text);
 ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY; ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA storage TO authenticated; GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
 INSERT INTO storage.buckets VALUES('dobby-family-files',false),('fixture-unrelated',false);
 CREATE FUNCTION storage.operation() RETURNS text LANGUAGE plpgsql STABLE AS ${q(operation)};
 CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean LANGUAGE sql STABLE AS ${q(any)};
 ${folder}
 ${source.slice(source.indexOf('CREATE POLICY dobby_family_files_read'),source.indexOf('DO $policies$')).replaceAll('pg_temp.objects','storage.objects')}
 RESET ROLE;`);
}
