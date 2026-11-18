// Reconstruct definitions, never execute an old installer or its private stubs.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { root, run, start, id, q } from '../local-db.mjs';

export const paths = {
 v1: 'essai-sync-v1/schema-review.sql',
 v2: 'sql-proposals/dobby-v2-grocery-shared-home.sql',
 modules: 'sql-proposals/dobby-v2-modules.sql',
 catalog: 'docs/dobby-v7/stitch19-20/supabase/tests/catalog-fixture.sql',
 v7: 'docs/dobby-v7/stitch19-20/supabase/01-apply.sql',
 repair: 'docs/dobby-v7/stitch19-20/supabase/11-apply-auth-schema-fallback.sql',
 family: 'docs/dobby-v7/finalisation-socle/supabase/family/01-install-family.sql',
 missions: 'docs/dobby-v7/finalisation-socle/supabase/missions/01-apply.sql',
};
export const sources = Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,readFileSync(resolve(root,p),'utf8')]));
const functions = s => [...s.matchAll(/CREATE (?:OR REPLACE )?FUNCTION\s+([\w.]+)\s*\([\s\S]*?\bAS\s+(\$\w*\$)[\s\S]*?\2\s*;/gi)].map(m=>({name:m[1],sql:m[0].replace(/^CREATE FUNCTION/i,'CREATE OR REPLACE FUNCTION')}));
const table = (s,name) => {
 const text=s.slice(s.indexOf('CREATE TABLE '+name));
 assert.ok(text.startsWith('CREATE TABLE '+name),name);
 return text.slice(0,text.indexOf(';')+1);
};
const block = (s,tag) => {
 const start=s.indexOf('DO $'+tag+'$');const end=s.indexOf('END $'+tag+'$;',start);
 assert.ok(start>=0&&end>start,tag);return s.slice(start,end+('END $'+tag+'$;').length);
};
export const candidate = () => readFileSync(resolve(root,'supabase/migrations',readdirSync(resolve(root,'supabase/migrations')).find(x=>x.endsWith('_dobby_private_access_tables_rpc.sql'))),'utf8');
export function apply(executeSQL = run) { return executeSQL('SET ROLE postgres;'+candidate()); }
export function catalog({ startDatabase = start, executeSQL = run } = {}) {
 const run = executeSQL;
 const info=startDatabase();
 run(`CREATE ROLE dobby_socle_writer NOLOGIN NOINHERIT NOBYPASSRLS;
 CREATE ROLE dobby_missions_v2_writer NOLOGIN NOINHERIT NOBYPASSRLS;
 -- Synthetic maintenance capability, not a runtime grant or a hosted assertion.
 GRANT dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer TO postgres WITH ADMIN TRUE, INHERIT TRUE, SET TRUE;
 SET ROLE postgres;
 CREATE SCHEMA dobby_socle_private; CREATE SCHEMA dobby_runes_private;
 GRANT USAGE ON SCHEMA public,dobby_v7_private TO dobby_v7_writer,dobby_socle_writer;
 GRANT USAGE ON SCHEMA public,dobby_socle_private TO dobby_socle_writer,dobby_missions_v2_writer,dobby_v7_writer;
 GRANT USAGE ON SCHEMA dobby_runes_private TO dobby_socle_writer,dobby_missions_v2_writer;
 ALTER TABLE dobby_v7_private.account_links ADD COLUMN created_at timestamptz NOT NULL DEFAULT clock_timestamp();
 ${['pending_profiles','invitations','operations','install_secret'].map(t=>table(sources.v7,'dobby_v7_private.'+t)).join('\n')}
 ${block(sources.v7,'tables').replace("EXECUTE format('CREATE POLICY v7_writer", "EXECUTE format('CREATE POLICY fixture_v7_writer")}
 INSERT INTO dobby_v7_private.install_secret VALUES(true,sha256(convert_to('LOCAL FICTIONAL SECRET','UTF8')));
 ${table(sources.family,'dobby_socle_private.install_state')}
 ${table(sources.family,'dobby_socle_private.family_function_backups')}
 ALTER TABLE dobby_socle_private.family_function_backups ENABLE ROW LEVEL SECURITY;
 ALTER TABLE dobby_socle_private.family_function_backups FORCE ROW LEVEL SECURITY;
 REVOKE ALL ON dobby_socle_private.family_function_backups FROM PUBLIC,anon,authenticated,service_role;
 INSERT INTO dobby_socle_private.install_state(singleton) VALUES(true);
 ALTER TABLE dobby_socle_private.install_state ENABLE ROW LEVEL SECURITY;
 ALTER TABLE dobby_socle_private.install_state FORCE ROW LEVEL SECURITY;
 GRANT SELECT,UPDATE(protocol) ON dobby_socle_private.install_state TO dobby_socle_writer;
 CREATE POLICY socle_writer_read ON dobby_socle_private.install_state TO dobby_socle_writer USING(true) WITH CHECK(protocol=1);
 ${sources.family.slice(sources.family.indexOf('ALTER TABLE dobby_v7_private.invitations ADD COLUMN'),sources.family.indexOf('DO $private_grants$'))}
 ${block(sources.family,'private_grants')}
 ${sources.family.slice(sources.family.indexOf('GRANT INSERT ON dobby_v7_private.account_links'),sources.family.indexOf('CREATE FUNCTION dobby_socle_private.members'))}
 ${sources.v7.slice(sources.v7.indexOf('GRANT SELECT,INSERT ON public.dobby_v2_households'),sources.v7.indexOf('CREATE FUNCTION dobby_v7_private.actor'))}
 ${table(sources.catalog,'dobby_runes_private.operations')}
 ALTER TABLE dobby_runes_private.operations ENABLE ROW LEVEL SECURITY;
 ALTER TABLE dobby_runes_private.operations FORCE ROW LEVEL SECURITY;
 GRANT SELECT ON dobby_runes_private.operations TO dobby_socle_writer;
 CREATE POLICY dobby_socle_old_mission_receipts_read ON dobby_runes_private.operations FOR SELECT TO dobby_socle_writer USING(true);
 ${table(sources.missions,'dobby_socle_private.mission_operations')}
 ALTER TABLE dobby_socle_private.mission_operations ENABLE ROW LEVEL SECURITY;
 ALTER TABLE dobby_socle_private.mission_operations FORCE ROW LEVEL SECURITY;
 GRANT SELECT,INSERT ON dobby_socle_private.mission_operations TO dobby_socle_writer;
 CREATE POLICY mission_operations_closed_writer ON dobby_socle_private.mission_operations TO dobby_socle_writer USING(true) WITH CHECK(true);
 RESET ROLE;`);
 // The *real* latest Missions guard is public. Its private validators are not.
 // Do not load request_user_id() or guard_missions() from catalog-fixture.sql.
 const native=functions(sources.catalog).filter(f=>f.name.startsWith('public.'));
 for (const f of native) {
  let sql=f.sql;
  if(f.name==='public.dobby_v2_modules_stamp') {
   const old='  ELSE\n    NEW.updated_by := auth.uid();';
   assert.ok(sql.includes(old),'Expected published stamp repair anchor');
   sql=sql.replace(old,`  ELSIF current_user='dobby_socle_writer' THEN\n    NEW.updated_by := dobby_v7_private.actor();\n  ELSIF current_user='dobby_v7_writer' THEN\n    NEW.updated_by := dobby_v7_private.actor();\n  ELSE\n    NEW.updated_by := auth.uid();`);
  }
  run('SET ROLE postgres;'+sql);
 }
 for(const f of functions(sources.v7)) run('SET ROLE postgres;'+f.sql);
 for(const f of functions(sources.family)) run('SET ROLE postgres;'+f.sql);
 run(`SET ROLE postgres; ALTER FUNCTION public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb) RENAME TO dobby_missions_v2_write_legacy_socle;`);
 for(const f of functions(sources.missions)) run('SET ROLE postgres;'+f.sql);
 run(`SET ROLE postgres;
 -- Exact documented Auth-schema fallback variant (11-apply-auth-schema-fallback.sql).
 CREATE OR REPLACE FUNCTION dobby_v7_private.actor() RETURNS uuid LANGUAGE plpgsql STABLE SET search_path='' AS $$
 DECLARE u uuid:=coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid;
 BEGIN IF u IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Authentification requise'; END IF; RETURN u; END $$;
 ${block(sources.family,'rls')}
 CREATE TRIGGER dobby_v7_family_guard BEFORE INSERT OR UPDATE OR DELETE ON public.dobby_v2_modules FOR EACH ROW EXECUTE FUNCTION dobby_v7_private.guard_family();
 ${[...sources.catalog.matchAll(/CREATE TRIGGER[^;]+;/g)].map(x=>x[0]).join('\n')}
 DO $$ DECLARE f record; target text; BEGIN
 FOR f IN SELECT p.oid,p.oid::regprocedure sig,n.nspname,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('dobby_v7_private','dobby_socle_private','dobby_runes_private') OR (n.nspname='public' AND p.proname LIKE 'dobby_%' AND p.proname NOT LIKE 'dobby_access_%' AND p.proname NOT LIKE 'dobby_lot1_%') LOOP
 target:=CASE WHEN f.nspname='dobby_socle_private' OR f.proname IN ('assert_snapshot','guard_family') OR f.proname IN (${functions(sources.family).filter(f=>f.name.startsWith('public.')).map(f=>q(f.name.split('.')[1])).join(',')},'dobby_missions_v3_write','dobby_missions_v3_capabilities') THEN 'dobby_socle_writer'
 WHEN f.nspname='dobby_v7_private' AND f.proname<>'actor' OR f.proname IN ('dobby_v7_create_household','dobby_v7_update_profile') THEN 'dobby_v7_writer'
 WHEN f.proname LIKE 'dobby_missions_v2_%' THEN 'dobby_missions_v2_writer' ELSE 'postgres' END;
 EXECUTE format('GRANT CREATE ON SCHEMA %I TO %I',f.nspname,target);
 EXECUTE format('ALTER FUNCTION %s OWNER TO %I',f.sig,target);
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.sig);
 END LOOP; END $$;
 GRANT USAGE ON SCHEMA dobby_v7_private,dobby_socle_private TO authenticated;
 GRANT EXECUTE ON FUNCTION dobby_v7_private.actor() TO dobby_v7_writer,dobby_socle_writer;
 GRANT EXECUTE ON FUNCTION dobby_socle_private.is_parent(uuid),dobby_socle_private.can_read(uuid),dobby_socle_private.legacy_unlinked(),dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb) TO authenticated;
 GRANT EXECUTE ON FUNCTION dobby_socle_private.actor_context(uuid,boolean),dobby_socle_private.missions_reject_v3_operation(uuid,uuid) TO dobby_missions_v2_writer;
 GRANT EXECUTE ON FUNCTION public.dobby_v7_context() TO dobby_v7_writer;
 DO $$ DECLARE f record; BEGIN FOR f IN SELECT oid::regprocedure sig FROM pg_proc WHERE pronamespace='public'::regnamespace AND (proname LIKE 'dobby_v7_%' OR proname LIKE 'dobby_missions_%') AND proname NOT IN ('dobby_missions_v2_write_legacy_socle','dobby_v7_bind_existing_member') LOOP EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.sig); END LOOP; END $$;
 GRANT EXECUTE ON FUNCTION public.dobby_v7_preview_invitation(text),public.dobby_v7_preview_child_invitation(text),public.dobby_v7_family_capabilities() TO anon;
 REVOKE CREATE ON SCHEMA public,dobby_v7_private,dobby_socle_private,dobby_runes_private FROM dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer;
 RESET ROLE;
 GRANT dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer TO postgres WITH INHERIT FALSE, SET FALSE;
 DROP FUNCTION public.dobby_lot1_fixture_sentinel();
 INSERT INTO public.dobby_sync_members(user_id,display_name) VALUES(${q(id(5))},'TEST V1');
 INSERT INTO public.dobby_sync_grocery_items(id,title) VALUES(${q(id(501))},'TEST V1 PRESERVED');
 INSERT INTO public.dobby_v2_grocery(id,household_id,title) VALUES(${q(id(502))},${q(id(101))},'TEST H1'),(${q(id(503))},${q(id(102))},'TEST H2');
 `);
 return info;
}
