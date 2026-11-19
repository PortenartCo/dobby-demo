import { spawnSync, spawn } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

export const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const q = x => `'${String(x).replaceAll("'", "''")}'`;
export const json = x => `${q(JSON.stringify(x))}::jsonb`;
export const manifest = {
 ownerUserId: id(1), preservedAccounts: [
  { userId: id(1), householdId: id(101), memberId: 'TEST_PARENT_A' },
  { userId: id(2), householdId: id(101), memberId: 'TEST_PARENT_B' },
 ],
};
const container = `dobby-access-lot1-${process.pid}`;
const dockerEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('DOCKER_')));
const image = 'postgres:17.7@sha256:2006493727bd5277eece187319af1ef82b4cf82cf4fc1ed00da0775b646ac2a4';
let created = false;
function docker(args, input, timeout = 120000) {
 return spawnSync('docker', ['--host', 'unix:///var/run/docker.sock', ...args], {
  input, encoding: 'utf8', timeout, env: dockerEnv, maxBuffer: 4 * 1024 * 1024,
 });
}
function must(result) {
 assert.equal(result.status, 0, result.stderr || result.error?.message);
 return result.stdout.trim();
}
export function raw(sql, login = 'dobby_local_root') {
 assert.ok(['dobby_local_root','dobby_fixture_client'].includes(login));
 return docker(['exec', '-i', container, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
  '-v', 'VERBOSITY=verbose', '-U', login, '-d', 'dobby_access_lot1'], sql);
}
export function run(sql) { return must(raw(sql)); }
export function as(user, session = 1000 + user, extra = {}) {
 return `SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='';
 SET LOCAL request.jwt.claims=${q(JSON.stringify({sub: id(user), session_id: id(session), role: 'authenticated', ...extra}))};`;
}
export function prepare({ seed = true, sessions = true } = {}) {
 let sql = 'BEGIN;';
 if (sessions) sql += `SET LOCAL ROLE supabase_auth_admin;
  GRANT USAGE ON SCHEMA auth TO dobby_access_session_reader;
  GRANT SELECT(id,user_id,created_at,not_after) ON auth.sessions TO dobby_access_session_reader;
  RESET ROLE;`;
 if (seed) sql += `SET LOCAL ROLE postgres;
  DO $$ BEGIN PERFORM dobby_access_private.bootstrap(${json(manifest)},${q(id(901))});
  ${sessions ? 'PERFORM dobby_access_private.enable_session_guard();' : ''} END $$; RESET ROLE;`;
 return sql;
}
export function exercise(sql, options) {
 const output = run(prepare(options) + sql + '\nROLLBACK;');
 return output.split('\n').filter(Boolean);
}
export function scalar(sql, options) { return exercise(sql, options).at(-1); }
export function denied(sql, code = '42501', options) {
 const result = raw(prepare(options) + '\n\\echo DOBBY_CASE_READY\n' + sql + '\nROLLBACK;');
 assert.match(result.stdout, /DOBBY_CASE_READY/, 'Fixture setup failed before the operation under test: '+result.stderr);
 assert.notEqual(result.status, 0, 'Expected SQL refusal, but operation succeeded');
 assert.match(result.stderr, new RegExp(`ERROR:  ${code}\\b`), result.stderr);
}
export function clientDenied(sql) {
 const result = raw('SET ROLE authenticated;'+sql,'dobby_fixture_client');
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/ERROR:  42501\b/);
}
export function businessSnapshotSQL() {
 return `SELECT jsonb_build_object(
 'rows',(SELECT jsonb_object_agg(name,rows) FROM (
 SELECT 'users' name,jsonb_agg(to_jsonb(t) ORDER BY id) rows FROM auth.users t UNION ALL
 SELECT 'sessions',jsonb_agg(to_jsonb(t) ORDER BY id) FROM auth.sessions t UNION ALL
 SELECT 'households',jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.dobby_v2_households t UNION ALL
 SELECT 'memberships',jsonb_agg(to_jsonb(t) ORDER BY user_id) FROM public.dobby_v2_memberships t UNION ALL
 SELECT 'modules',jsonb_agg(to_jsonb(t) ORDER BY household_id,module) FROM public.dobby_v2_modules t UNION ALL
 SELECT 'links',jsonb_agg(to_jsonb(t) ORDER BY user_id) FROM dobby_v7_private.account_links t) x),
 'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname) FROM pg_policies p WHERE schemaname='public'),
 'acl',(SELECT jsonb_agg(jsonb_build_array(c.relname,c.relowner,c.relacl,c.relrowsecurity,c.relforcerowsecurity) ORDER BY c.relname)
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('auth','public','dobby_v7_private') AND c.relkind='r'),
 'functions',(SELECT jsonb_agg(jsonb_build_array(p.oid::regprocedure::text,pg_get_functiondef(p.oid),p.proacl) ORDER BY p.oid)
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('auth','public','dobby_v7_private') AND p.proname NOT LIKE 'dobby_access_%'));`;
}
export function businessSnapshot() { return run(businessSnapshotSQL()); }
export function interactive() {
 const child=spawn('docker',['--host','unix:///var/run/docker.sock','exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','dobby_local_root','-d','dobby_access_lot1'],{env:dockerEnv});
 let output='',errors='';
 child.stdout.on('data',x=>{output+=x;});child.stderr.on('data',x=>{errors+=x;});
 const finished=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>resolve({code,output,errors}));});
 return {send(sql){child.stdin.write(sql+'\n');},async waitFor(marker){
  const deadline=Date.now()+10000;
  while(!output.includes(marker)){assert.equal(child.exitCode,null,errors);assert.ok(Date.now()<deadline,'SQL marker timeout');await new Promise(r=>setTimeout(r,20));}
 },async finish(sql='ROLLBACK;'){if(!child.stdin.destroyed){child.stdin.end(sql+'\n');}return finished;}};
}
export function start({installFoundation=true} = {}) {
 must(docker(['run', '--pull=never', '--rm', '-d', '--name', container, '--label', 'dobby.private-access-test=lot1',
  '--network', 'none', '--tmpfs', '/var/lib/postgresql/data',
  '-e', 'POSTGRES_USER=dobby_local_root', '-e', 'POSTGRES_DB=dobby_access_lot1',
  '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', image]));
 created = true;
 const until = Date.now() + 30000;
 while (Date.now() < until) {
  if (docker(['exec', container, 'cat', '/proc/1/comm'], undefined, 3000).stdout?.trim()==='postgres'
   && raw('SELECT 1;').status === 0) break;
  // A short bounded poll, entirely inside the no-network local fixture.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
 }
 const info = JSON.parse(must(docker(['inspect', container])))[0];
 assert.equal(info.HostConfig.NetworkMode, 'none');
 assert.ok(!info.HostConfig.PortBindings || Object.keys(info.HostConfig.PortBindings).length === 0);
 assert.ok(!info.Mounts.some(x => x.Type === 'bind'));
 run(readFileSync(new URL('./fixtures.sql', import.meta.url), 'utf8'));
 return { ...initializeBusinessCatalog({installFoundation}), version: run('SHOW server_version;'), image };
}

// Compose the published business fixture against actual local GoTrue tables.
// Defaults preserve the original isolated synthetic fixture unchanged.
export function initializeBusinessCatalog({ executeSQL = run, seedAuth = true, captureSnapshot = true, installFoundation = true } = {}) {
 const run = executeSQL;
 // Reuse exact, public legacy table/RLS definitions; do not install the old
 // scripts or their explicitly documented private Missions stub.
 const catalog = readFileSync(resolve(root, 'docs/dobby-v7/stitch19-20/supabase/tests/catalog-fixture.sql'), 'utf8');
 const tables = [...catalog.matchAll(/CREATE TABLE public\.[\s\S]*?;\n(?:(?:ALTER TABLE|GRANT)[^;]+;\n)*/g)].map(x => x[0]);
 assert.equal(tables.length, 6);
 const policies = [...catalog.matchAll(/CREATE POLICY "dobby_(?:sync|v2)_[\s\S]*?;/g)].map(x => x[0]);
 assert.equal(policies.length, 12);
 run('SET ROLE postgres;'+ tables.join('\n') + policies.join('\n') + `
 CREATE SCHEMA dobby_v7_private;
 CREATE TABLE dobby_v7_private.account_links(user_id uuid PRIMARY KEY REFERENCES auth.users(id),
 household_id uuid NOT NULL, member_id text NOT NULL, UNIQUE(household_id,member_id),
 FOREIGN KEY(household_id,user_id) REFERENCES public.dobby_v2_memberships(household_id,user_id));
 ALTER TABLE dobby_v7_private.account_links ENABLE ROW LEVEL SECURITY;
 ALTER TABLE dobby_v7_private.account_links FORCE ROW LEVEL SECURITY;
 CREATE POLICY v7_writer ON dobby_v7_private.account_links TO dobby_v7_writer USING(true) WITH CHECK(true);
 CREATE FUNCTION public.dobby_lot1_fixture_sentinel() RETURNS text LANGUAGE sql SET search_path='' AS $$ SELECT 'unchanged'::text $$;
 RESET ROLE;
 ${seedAuth ? ` INSERT INTO auth.users SELECT (${q(id(1).slice(0,-1))}||i::text)::uuid, 'fixture-'||i||'@example.invalid', now() FROM generate_series(1,6) i;
 INSERT INTO auth.sessions(id,user_id,created_at) SELECT
 ('00000000-0000-4000-8000-'||lpad((1000+i)::text,12,'0'))::uuid,id,clock_timestamp()-interval '1 day' FROM auth.users u CROSS JOIN LATERAL (SELECT right(u.id::text,1)::int i) x;
` : ''}
 INSERT INTO public.dobby_v2_households(id,name) VALUES(${q(id(101))},'TEST H1'),(${q(id(102))},'TEST H2');
 INSERT INTO public.dobby_v2_memberships(household_id,user_id,role) VALUES
 (${q(id(101))},${q(id(1))},'owner'),(${q(id(101))},${q(id(2))},'member'),
 (${q(id(102))},${q(id(3))},'owner'),(${q(id(102))},${q(id(4))},'member');
 INSERT INTO public.dobby_v2_modules(household_id,module,payload,revision) VALUES
 (${q(id(101))},'family','{"familyMembers":[{"id":"TEST_PARENT_A","memberCategory":"parent","magicProfile":{"houseId":"ravenclaw"}},{"id":"TEST_PARENT_B","memberCategory":"parent"}]}',7),
 (${q(id(102))},'family','{"familyMembers":[{"id":"TEST_PARENT_C","memberCategory":"parent"},{"id":"TEST_CHILD","memberCategory":"child"}]}',9),
 (${q(id(101))},'missions','{"runeCredits":[{"id":"TEST_LEDGER","amount":25}]}',11);
 INSERT INTO dobby_v7_private.account_links(user_id,household_id,member_id) VALUES
 (${q(id(1))},${q(id(101))},'TEST_PARENT_A'),(${q(id(2))},${q(id(101))},'TEST_PARENT_B'),
 (${q(id(3))},${q(id(102))},'TEST_PARENT_C'),(${q(id(4))},${q(id(102))},'TEST_CHILD');`);
 const baseline = captureSnapshot ? run(businessSnapshotSQL()) : null;
 const migrationsDir = resolve(root, 'supabase/migrations');
 const migrations = existsSync(migrationsDir) ? readdirSync(migrationsDir).filter(n => n.endsWith('_dobby_private_access_foundation.sql')) : [];
 if(installFoundation)for (const path of migrations) run('SET ROLE postgres;'+ readFileSync(resolve(migrationsDir,path),'utf8'));
 return { baseline, migrations };
}
export function stop() {
 if (created) { must(docker(['rm', '-f', container])); created = false; }
}
