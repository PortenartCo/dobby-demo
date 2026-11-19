// Recovery drill. All pg tools run in owned containers on network none.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { catalog } from '../lot2a/catalog.mjs';
import { start, stop, run, as, id, json, q, manifest } from '../local-db.mjs';
import { prepareStorage } from './storage-fixture.mjs';
import { buildArtifacts } from '../../../supabase/compatibility/lot5b/build-variants.mjs';
import { verifyState } from '../../../supabase/compatibility/lot5b/v7-preserved-state.mjs';
import { reviewAssembly } from '../../../supabase/integration/lot5c/build.mjs';

const database = 'dobby_access_lot1';
const source = 'dobby-access-lot1-' + process.pid;
const sourceLogin = 'dobby_local_root';
const restoreLogin = sourceLogin;
const dockerenv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('DOCKER_')));
const image = 'postgres:17.7@sha256:2006493727bd5277eece187319af1ef82b4cf82cf4fc1ed00da0775b646ac2a4';
const assembly = reviewAssembly();
const packageId = JSON.parse(assembly['manifest.json']).packageId;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let archiveDirectory;

function docker(args, input, timeout = 30_000) {
 return spawnSync('docker', ['--host', 'unix:///var/run/docker.sock', ...args], {
  env: dockerenv, input, timeout, maxBuffer: 16 * 1024 * 1024
 });
}
function strict(result, operation) {
 // Print no dump bytes or COPY rows on failure.
 assert.equal(result.status, 0, operation + ' failed' + (result.error ? ' (' + result.error.code + ')' : ''));
 return result.stdout;
}
const command = (container, args, input) => docker(['exec', '-i', container, ...args], input);
const sql = (container, login, statement, db = database) =>
 command(container, ['psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', login, '-d', db], statement);
const evaluate = (container, login, statement) => strict(sql(container, login, statement), 'Inspect database').toString().trim();

const appSchemas = "n.nspname IN ('public','auth','storage') OR left(n.nspname,6)='dobby_'";
// Compare catalogue by qualified names, leaving stored OIDs in both journals intact.
const catalogueSnapshot = `
SET search_path='';
WITH metadata(kind, item) AS (
 SELECT 'schema', jsonb_build_array(n.nspname,pg_get_userbyid(n.nspowner),n.nspacl::text)
 FROM pg_namespace n WHERE ${appSchemas}
 UNION ALL
 SELECT 'relation',jsonb_build_array(n.nspname,c.relname,c.relkind,pg_get_userbyid(c.relowner),coalesce(c.relacl,acldefault((CASE WHEN c.relkind='S' THEN 's' ELSE 'r' END)::"char",c.relowner))::text,c.relrowsecurity,c.relforcerowsecurity)
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE (${appSchemas}) AND c.relkind IN ('r','p','S','v','m')
 UNION ALL
 SELECT 'column',jsonb_build_array(n.nspname,c.relname,a.attname,a.attacl::text,format_type(a.atttypid,a.atttypmod),a.attnotnull)
 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE (${appSchemas}) AND c.relkind IN ('r','p','v','m') AND a.attnum>0 AND NOT a.attisdropped
 UNION ALL
 SELECT 'function',jsonb_build_array(p.oid::regprocedure::text,pg_get_userbyid(p.proowner),p.proacl::text,md5(pg_get_functiondef(p.oid)))
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (${appSchemas}) AND p.prokind IN ('f','p','w')
 UNION ALL
 SELECT 'policy',jsonb_build_array(schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check)
 FROM pg_policies WHERE schemaname IN (SELECT n.nspname FROM pg_namespace n WHERE ${appSchemas})
 UNION ALL
 SELECT 'trigger',jsonb_build_array(n.nspname,c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid))
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE (${appSchemas}) AND NOT t.tgisinternal
 UNION ALL
 SELECT 'constraint',jsonb_build_array(n.nspname,c.relname,k.conname,k.convalidated,pg_get_constraintdef(k.oid,true))
 FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE (${appSchemas})
 UNION ALL
 SELECT 'role',jsonb_build_array(rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls)
 FROM pg_roles WHERE rolname !~ '^pg_'
 UNION ALL
 SELECT 'membership',jsonb_build_array(pg_get_userbyid(roleid),pg_get_userbyid(member),pg_get_userbyid(grantor),admin_option,inherit_option,set_option)
 FROM pg_auth_members
 UNION ALL
 SELECT 'default_acl',jsonb_build_array(pg_get_userbyid(defaclrole),n.nspname,defaclobjtype,defaclacl::text)
 FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
)
SELECT kind, encode(sha256(convert_to(jsonb_agg(item ORDER BY item::text)::text,'UTF8')),'hex') FROM metadata GROUP BY kind ORDER BY kind;`;
const rowSnapshot = `
SET TIME ZONE 'UTC';
SET search_path='';
SELECT format(
 'SELECT %L, count(*), encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,''[]''),''UTF8'')),''hex'') FROM %I.%I AS t;',
 n.nspname||'.'||c.relname,n.nspname,c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE (${appSchemas}) AND c.relkind='r'
ORDER BY n.nspname,c.relname \\gexec`;

function archive(name, bytes) {
 const path = join(archiveDirectory, name);
 writeFileSync(path, bytes, { mode: 0o600, flag: 'wx' });
 return () => {
  const restored = readFileSync(path);
  assert.equal(hash(restored), hash(bytes), 'Archive checksum mismatch');
  return restored;
 };
}

async function restoreClone(label, verify) {
 const roles = archive(label + '-roles.sql',
  strict(command(source, ['pg_dumpall', '--roles-only', '--no-role-passwords', '-U', sourceLogin]), 'Export roles'));
 const payload = archive(label + '-db.dump',
  strict(command(source, ['pg_dump', '-Fc', '-U', sourceLogin, '-d', database]), 'Export database'));
 const target = 'dobby-restore-' + randomUUID().slice(0, 12);
 try {
  strict(docker(['run', '--pull=never', '--rm', '-d', '--name', target,
   '--label', 'dobby.private-access-test=lot5c-restore', '--network', 'none',
   '--tmpfs', '/var/lib/postgresql/data', '-e', 'POSTGRES_USER=' + restoreLogin,
   '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', image], undefined, 45_000), 'Start recovery cluster');
  const deadline = Date.now() + 30_000;
  let ready = false;
  while (Date.now() < deadline) {
   const pidOne = command(target, ['cat', '/proc/1/comm']).stdout?.toString().trim();
   if (pidOne === 'postgres' && sql(target, restoreLogin, 'SELECT 1;', 'postgres').status === 0) {
    ready = true;
    break;
   }
   await new Promise(resolve => setTimeout(resolve, 150));
  }
  assert.ok(ready, 'Recovery cluster ready');
  // The clone allocates new OIDs. The source journal and the archives are never patched.
  strict(sql(target, restoreLogin, 'CREATE SCHEMA fixture_oid_offset;', 'postgres'), 'Offset clone OIDs');
  // initdb already created the source's fixture administrator. Keep its
  // attributes and all membership grantors. Skip only its duplicate CREATE.
  const roleSql = roles().toString('utf8');
  const bootstrapRole = 'CREATE ROLE ' + sourceLogin + ';\n';
  assert.equal(roleSql.split(bootstrapRole).length, 2);
  const restoredRoles = command(target, ['psql', '-X', '-q', '-1', '-v', 'ON_ERROR_STOP=1', '-U', restoreLogin, '-d', 'postgres'], roleSql.replace(bootstrapRole, ''));
  if (restoredRoles.status !== 0) console.error(restoredRoles.stderr.toString().split('\n').filter(line => line.startsWith('ERROR:')));
  strict(restoredRoles, 'Restore roles');
  strict(command(target, ['createdb', '-U', restoreLogin, '-O', 'postgres', database]), 'Create empty target database');
  strict(command(target, ['pg_restore', '--exit-on-error', '--single-transaction', '-U', restoreLogin, '-d', database], payload()), 'Restore database');
  const expected = evaluate(source, sourceLogin, catalogueSnapshot);
  const actual = evaluate(target, restoreLogin, catalogueSnapshot);
  if (actual !== expected) {
   const detail = catalogueSnapshot.slice(0,catalogueSnapshot.lastIndexOf('SELECT kind, encode'))+
    "SELECT kind,item FROM metadata WHERE kind IN ('relation','constraint') ORDER BY kind,item::text;";
   const initial = new Set(evaluate(source,sourceLogin,detail).split('\n'));
   const restored = new Set(evaluate(target,restoreLogin,detail).split('\n'));
   console.log('Fixture catalogue differences', [...initial].filter(x=>!restored.has(x)), [...restored].filter(x=>!initial.has(x)));
  }
  assert.equal(actual,expected,'Catalogue, ACLs, RLS and roles');
  const snapshot = evaluate(source, sourceLogin, rowSnapshot);
  assert.equal(evaluate(target, restoreLogin, rowSnapshot), snapshot, 'All fixture rows, including Auth and Storage metadata');
  await verify(target, snapshot);
  console.log('LOT5C_LOGICAL_RESTORE', label, snapshot.split('\n').length, 'table digests and catalogue match');
 } finally {
  if (docker(['inspect', target]).status === 0) strict(docker(['rm', '-f', target]), 'Remove owned recovery cluster');
 }
}

before(() => {
 archiveDirectory = mkdtempSync(join(tmpdir(), 'dobby-restore-'));
 catalog({ startDatabase: () => start({ installFoundation: false }) });
 run(`REVOKE dobby_v7_writer FROM postgres;
 ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
 ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;
 SET ROLE supabase_auth_admin;
 GRANT SELECT(id,email,email_confirmed_at) ON auth.users TO postgres;
 GRANT SELECT(id,user_id,created_at,not_after) ON auth.sessions TO postgres;
 RESET ROLE;`);
 prepareStorage();
 run(`INSERT INTO storage.objects VALUES('dobby-family-files',${q(id(101) + '/fictional.pdf')});`);
});
after(() => {
 try { stop(); } finally {
  if (archiveDirectory) rmSync(archiveDirectory, { recursive: true, force: true });
 }
});

const accountCheck = `SELECT count(*) FROM auth.users u JOIN dobby_v7_private.account_links l ON l.user_id=u.id
 JOIN public.dobby_v2_memberships m ON m.user_id=u.id AND m.household_id=l.household_id
 WHERE m.active AND l.household_id=${q(id(101))} AND (l.user_id,l.member_id) IN
 ((${q(id(1))},'TEST_PARENT_A'),(${q(id(2))},'TEST_PARENT_B'));`;

test('logical recovery before installation preserves canonical accounts and the preinstallation catalogue', async () => {
 await restoreClone('preinstallation', target => {
  assert.equal(evaluate(target, restoreLogin, accountCheck), '2');
  assert.equal(evaluate(target, restoreLogin, "SELECT to_regnamespace('dobby_access_private') IS NULL;"), 't');
  assert.equal(evaluate(target, restoreLogin, 'BEGIN READ ONLY;'+as(2)+"SELECT public.dobby_v7_context()->>'memberId';ROLLBACK;"), 'TEST_PARENT_B');
 });
});

function privateInput() {
 return `CREATE TEMP TABLE dobby5c_input(manifest jsonb,operation_id uuid,project_ref text,package_id text,
 maintenance_confirmed boolean,backup_verified boolean,signed_storage_resolved boolean,open_administration boolean,
 probe_user uuid,probe_session uuid,probe_email_sha256 text);
 INSERT INTO dobby5c_input VALUES(${json(manifest)},${q(id(9550))},'pqcdkrwljgvgagzwrcmg',${q(packageId)},true,true,true,true,
 ${q(id(2))},${q(id(1002))},encode(sha256(convert_to('fixture-2@example.invalid','UTF8')),'hex'));`;
}

test('assembled logical recovery preserves both journals but new OIDs block postflight and rollback', async () => {
 const missions = buildArtifacts()['missions.preflight.sql'];
 // Same in-memory limitation as package.test.mjs. No private function stub.
 const partial = assembly['10-install.sql'].replaceAll(missions, '-- Fictional fixture omits unavailable Missions metadata.');
 assert.notEqual(partial, assembly['10-install.sql']);
 run('SET ROLE postgres;'+privateInput()+partial);
 assert.match(run('SET ROLE postgres;'+assembly['30-postflight.sql']), /LOT5C_METADATA_INTACT/);
 const journalOid = "SELECT 'dobby_access_v7_gate.check_access()'::regprocedure::oid;";
 const journalRows = `SELECT md5((SELECT jsonb_agg(to_jsonb(j) ORDER BY key) FROM dobby_access_legacy.v7_gate_state j)::text),
 md5((SELECT to_jsonb(j) FROM dobby_access_legacy.lot5c_state j)::text);`;
 const flags = 'SELECT session_guard_ready,identity_guard_ready,administration_enabled,child_delivery_enabled FROM dobby_access_private.settings;';
 await restoreClone('installed-closed', (target, snapshot) => {
  assert.equal(evaluate(target, restoreLogin, accountCheck), '2');
  assert.notEqual(evaluate(target, restoreLogin, journalOid), run(journalOid));
  assert.equal(evaluate(target, restoreLogin, journalRows), run(journalRows));
  assert.equal(evaluate(target, restoreLogin, flags), 'f|f|f|f');
  for (const name of ['30-postflight.sql','80-stop-admin.sql','90-close.sql']) {
   const result = sql(target, restoreLogin, 'SET ROLE postgres;'+assembly[name]);
   assert.notEqual(result.status, 0, name + ' must reject changed OIDs');
   assert.match(result.stderr.toString(), /Lot5C installed definition\/owner\/ACL drift/);
  }
  const v7 = sql(target, restoreLogin, "BEGIN READ ONLY; SET LOCAL ROLE postgres; SET LOCAL search_path='';" + verifyState + "ROLLBACK;");
  assert.notEqual(v7.status, 0, 'V7 state alone also rejects the clone');
  assert.match(v7.stderr.toString(), /Unexpected V7 installed state/);
  assert.equal(evaluate(target, restoreLogin, rowSnapshot), snapshot);
  console.log('LOT5C_OID_REFUSAL postflight and both review-source rollbacks rejected; original journal digests intact');
 });
});
