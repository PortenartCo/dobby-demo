// Stock PostgreSQL authority characterization. No Supabase/supautils runtime
// is emulated, and these eight sentinels are NOT the hosted native policies.
import { before,after,test } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from './local-db.mjs';
let db;
const policy=`CREATE POLICY fixture_restrictive ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated USING(false) WITH CHECK(false);`;
const locks='LOCK TABLE storage.objects,storage.buckets IN SHARE ROW EXCLUSIVE MODE;';
const snapshot=()=>db.run(`SELECT jsonb_build_object('objects',(SELECT jsonb_agg(to_jsonb(t)) FROM storage.objects t),'buckets',(SELECT jsonb_agg(to_jsonb(t)) FROM storage.buckets t),'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY policyname) FROM pg_policies p WHERE schemaname='storage'),'relations',(SELECT jsonb_agg(jsonb_build_array(relname,relowner,relacl,relrowsecurity) ORDER BY relname) FROM pg_class WHERE relnamespace='storage'::regnamespace AND relkind='r'));`);
before(()=>{
 db=createDatabase();console.log('LOT5B_STORAGE_AUTHORITY_RUNTIME '+db.version);
 db.run(`CREATE ROLE supabase_storage_admin NOLOGIN NOBYPASSRLS;
 CREATE SCHEMA storage; REVOKE ALL ON SCHEMA storage FROM PUBLIC;
 CREATE TABLE storage.objects(id integer,bucket_id text); CREATE TABLE storage.buckets(id text,public boolean);
 ALTER TABLE storage.objects OWNER TO supabase_storage_admin; ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA storage TO postgres,supabase_storage_admin,authenticated;
 GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects,storage.buckets TO postgres;
 INSERT INTO storage.buckets VALUES('fixture-private',false); INSERT INTO storage.objects VALUES(1,'fixture-private');
 DO $$ BEGIN FOR i IN 1..8 LOOP EXECUTE format('CREATE POLICY fixture_native_%s ON storage.objects USING(true)',i); END LOOP; END $$;`);
});
after(()=>db?.close());
test('DML grants allow the candidate locks but no schema CREATE or table ownership is implied',()=>{
 const value=db.run(`BEGIN; SET ROLE postgres; ${locks}
 SELECT has_schema_privilege(current_user,'storage','CREATE'),pg_has_role(current_user,'supabase_storage_admin','MEMBER'); ROLLBACK;`);
 assert.equal(value,'f|f');
 const before=snapshot(),result=db.raw(`BEGIN; SET ROLE postgres; ${locks} ${policy} ROLLBACK;`);
 assert.notEqual(result.status,0);assert.match(result.stderr,/ERROR:  42501\b/);assert.match(result.stderr,/must be owner/);assert.equal(snapshot(),before);
});
test('granting schema CREATE alone does not authorize policy creation on an existing table',()=>{
 const before=snapshot(),result=db.raw(`BEGIN; GRANT CREATE ON SCHEMA storage TO postgres; SET ROLE postgres; ${policy} ROLLBACK;`);
 assert.notEqual(result.status,0);assert.match(result.stderr,/ERROR:  42501\b/);assert.match(result.stderr,/must be owner/);assert.equal(snapshot(),before);
});
test('the table owner can create a restrictive policy without schema CREATE, then rollback preserves all sentinels',()=>{
 const before=snapshot(),value=db.run(`BEGIN; SET ROLE supabase_storage_admin;
 SELECT has_schema_privilege(current_user,'storage','CREATE'); ${policy}
 SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'; ROLLBACK;`);
 assert.equal(value,'f\n9');assert.equal(snapshot(),before);
});
