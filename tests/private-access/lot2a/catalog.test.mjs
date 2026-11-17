import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { catalog, apply, candidate } from './catalog.mjs';
import { manifest, routines, tables, policies, inventory } from './inventory.mjs';
import { root, stop, run, raw, q, businessSnapshot } from '../local-db.mjs';

let baseline, snapshot, auth, roles;
const authSQL=`SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relacl::text,a.attname,a.attacl::text) ORDER BY n.nspname,c.relname,a.attnum)
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 WHERE n.nspname='auth';`;
const rolesSQL=`SELECT jsonb_agg(jsonb_build_array(rolname,rolsuper,rolbypassrls,rolcanlogin,rolcreaterole,rolinherit) ORDER BY rolname) FROM pg_roles;`;
const rollback=()=>run('SET ROLE postgres;'+readFileSync(resolve(root,'supabase/rollbacks/20261117215619_dobby_private_access_tables_rpc.sql'),'utf8'));
const normalizedSnapshot=s=>{const x=JSON.parse(s);for(const row of x.acl)row[2]?.sort();return x;};
const normalizedTables=ts=>ts.map(t=>({...t,acl:t.acl===null?null:t.acl.slice(1,-1).split(',').sort()}));
function preflightFails(message) {
 const result=raw('SET ROLE postgres;'+candidate());
 assert.notEqual(result.status,0);assert.match(result.stderr,message);
 assert.equal(run(`SELECT to_regnamespace('dobby_access_legacy') IS NULL;`),'t');
}
before(()=>{
 catalog(); baseline={routines:routines(),tables:tables(),policies:policies()};
 snapshot=businessSnapshot();auth=run(authSQL);roles=run(rolesSQL);
});
after(stop);
test('T06 closed inventory rejects an unreviewed overload atomically',()=>{
 // Deliberately synthetic attack canary, never a substitute for a missing function.
 run(`CREATE FUNCTION public.dobby_v7_context(text) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;`);
 preflightFails(/Unreviewed public routine/);
 run('DROP FUNCTION public.dobby_v7_context(text);');
});
test('Closed inventory rejects exposed definer views and unreviewed body drift',()=>{
 run(`CREATE VIEW public.lot2a_canary_view AS SELECT * FROM public.dobby_v2_modules; GRANT SELECT ON public.lot2a_canary_view TO authenticated;`);
 preflightFails(/Exposed view/);
 run('DROP VIEW public.lot2a_canary_view;');
 run(`CREATE OR REPLACE FUNCTION public.dobby_v7_context() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT '{}'::jsonb $$;`);
 preflightFails(/definition\/owner drift/);
 const saved=JSON.parse(snapshot).functions.find(x=>x[0]==='dobby_v7_context()')[1];
 run(saved);
 run(`ALTER FUNCTION public.dobby_v7_context() SET request.jwt.claims='{}';`);
 preflightFails(/definition\/owner drift/);
 run(`ALTER FUNCTION public.dobby_v7_context() RESET request.jwt.claims;`);
});
test('No implicit role repair: absent maintenance ADMIN blocks the whole migration',()=>{
 run('REVOKE ADMIN OPTION FOR dobby_v7_writer FROM postgres;');
 preflightFails(/maintenance ADMIN/);
 run('GRANT dobby_v7_writer TO postgres WITH ADMIN TRUE, INHERIT FALSE, SET FALSE;');
});
test('Candidate preserves every native policy, owner and business body; inventory is closed',()=>{
 apply();
 assert.deepEqual(policies().filter(p=>p.policyname!=='dobby_access_active'),baseline.policies);
 assert.equal(run(authSQL),auth,'No Auth grant or schema change');
 assert.equal(run(rolesSQL),roles,'No role attribute promotion');
 const after=routines();
 for(const old of baseline.routines) {
  const now=after.find(x=>x.signature===old.signature);assert.ok(now,old.signature);
  assert.equal(now.owner,old.owner,old.signature);
  const entry=manifest().find(m=>m.signature===old.signature);
  if(entry&&!['trigger','closed','public-flags'].includes(entry.kind)) {
   const clone=after.find(x=>x.schema==='dobby_access_legacy'&&x.name===old.schema+'__'+old.name);
   assert.ok(clone,old.signature);assert.equal(clone.bodyMD5,old.bodyMD5);assert.equal(clone.owner,old.owner);
   assert.equal(clone.anon,false);assert.equal(clone.authenticated,false);
  } else assert.equal(now.bodyMD5,old.bodyMD5,old.signature);
  // is_active/assert_active receive only the three closed existing writers.
  if(!['dobby_access_private.is_active()','dobby_access_private.assert_active()'].includes(old.signature)) assert.equal(now.acl,old.acl,old.signature);
 }
 assert.equal(run(`SELECT count(*) FROM pg_auth_members m WHERE roleid IN ('dobby_v7_writer'::regrole,'dobby_socle_writer'::regrole,'dobby_missions_v2_writer'::regrole,'dobby_access_writer'::regrole) AND member='postgres'::regrole AND (inherit_option OR set_option);`),'0');
 const evidence=inventory(baseline);assert.equal(evidence.missingDefinitions.length,12);
 if(process.env.DOBBY_EVIDENCE_DIR) {
  mkdirSync(process.env.DOBBY_EVIDENCE_DIR,{recursive:true});
  writeFileSync(resolve(process.env.DOBBY_EVIDENCE_DIR,'catalogue-local.json'),JSON.stringify(evidence,null,2)+'\n');
 }
 console.log(`INVENTORY: ${manifest().length} classified signatures; ${after.filter(x=>x.schema==='public'&&x.authenticated).length} authenticated public routines; 12 missing private Missions definitions (no stubs)`);
});
test('Rollback drill restores native definitions, ACLs, policies and exact business rows; reapply succeeds',()=>{
 rollback();
 assert.deepEqual(normalizedSnapshot(businessSnapshot()),normalizedSnapshot(snapshot));
 assert.deepEqual(routines(),baseline.routines);
 assert.deepEqual(normalizedTables(tables()),normalizedTables(baseline.tables));
 assert.deepEqual(policies(),baseline.policies);
 assert.equal(run(authSQL),auth);
 apply();
 assert.equal(run(`SELECT count(*) FROM pg_policies WHERE policyname='dobby_access_active';`),'5');
});
