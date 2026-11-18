// LOCAL, fictional integration fixture. Storage owns and migrates its own real
// schema; all object bytes travel through the unmodified Storage HTTP service.
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { spawnSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { catalog, apply } from '../lot2a/catalog.mjs';
import { root, run, raw, id, q, prepare, as, stop } from '../local-db.mjs';

export const storageImage = 'supabase/storage-api:v1.89.12@sha256:8526956cb462e9f7d392e9848ec77133b2769982ed614e9753cc687e8e4339a6';
export const familyBucket = 'dobby-family-files';
export const unrelatedBucket = 'lot2b-unrelated';
const database = `dobby-access-lot1-${process.pid}`;
const suffix = `${process.pid}-${randomBytes(6).toString('hex')}`;
const network = `dobby-lot2b-net-${suffix}`;
const storage = `dobby-lot2b-storage-${suffix}`;
// Match local-db.mjs: never follow an inherited remote Docker endpoint/context.
const dockerEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('DOCKER_')));
let databaseAttempted = false;
let networkCreated = false;
let storageCreated = false;
let active;
let secrets = [];
let relay;
const relayedProcesses = new Set();

function sanitized(value) {
 let text = String(value ?? '');
 for (const secret of secrets) text = text.replaceAll(secret, '[LOCAL TEST SECRET REDACTED]');
 return text;
}
function docker(args, { input, env = {}, timeout = 120000 } = {}) {
 return spawnSync('docker', ['--host', 'unix:///var/run/docker.sock', ...args], {
  input, env: { ...dockerEnv, ...env }, encoding: 'utf8', timeout,
  maxBuffer: 4 * 1024 * 1024,
 });
}
function must(result, operation) {
 assert.equal(result.status, 0, `${operation}: ${sanitized(result.stderr || result.error?.message)}`);
 return result.stdout.trim();
}
function inspect(name) { return JSON.parse(must(docker(['inspect', name]), 'Inspect owned fixture resource'))[0]; }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Some managed Docker daemons deliberately do not publish ports on an internal
// network. This transport still makes a real HTTP request to the unmodified
// Storage server. Only this module's fixed container and fixed loopback server
// can be reached. JWTs, signed URLs and bytes travel over stdin/stdout, not argv.
const execHttpScript = `
import {request as httpRequest} from 'node:http';
let input='';
for await (const part of process.stdin) input+=part;
const request=JSON.parse(input);
if(!request.path.startsWith('/')||request.path.startsWith('//'))throw Error('Invalid local path');
const url=new URL(request.path,'http://127.0.0.1:5000');
if(url.origin!=='http://127.0.0.1:5000')throw Error('Invalid local origin');
const body=Buffer.from(request.body,'base64');
const headers={...Object.fromEntries(request.headers),'content-length':String(body.length)};
await new Promise((resolve,reject)=>{
 const client=httpRequest(url,{method:request.method,headers,agent:false,
 signal:AbortSignal.timeout(12000)},async response=>{
  try{
   const chunks=[];for await(const part of response)chunks.push(part);
   process.stdout.write(JSON.stringify({status:response.statusCode,headers:Object.entries(response.headers),
    body:Buffer.concat(chunks).toString('base64')}));resolve();
  }catch(error){reject(error);}
 });
 client.on('error',reject);client.end(body);
});`;

function execHttp(request) {
 return new Promise((resolve, reject) => {
  const child = spawn('docker', ['--host', 'unix:///var/run/docker.sock', 'exec', '-i', storage,
   'node', '--input-type=module', '-e', execHttpScript], { env: dockerEnv, stdio: ['pipe', 'pipe', 'pipe'] });
  relayedProcesses.add(child);
  let output = '', errors = '';
  const timeout = setTimeout(() => child.kill('SIGKILL'), 15000);
  child.stdout.on('data', part => { output += part; if (output.length > 32 * 1024 * 1024) child.kill('SIGKILL'); });
  child.stderr.on('data', part => { if (errors.length < 16384) errors += part; });
  child.once('error', reject);
  child.once('close', code => {
   clearTimeout(timeout); relayedProcesses.delete(child);
   if (code !== 0) { reject(new Error(`Local Docker HTTP transport failed: ${sanitized(errors)}`)); return; }
   try { resolve(JSON.parse(output)); } catch { reject(new Error('Invalid local Docker HTTP transport response')); }
  });
  // A failed docker exec may close stdin before the payload is written.
  child.stdin.on('error', () => {});
  child.stdin.end(JSON.stringify(request));
 });
}

async function startRelay() {
 relay = createServer(async (incoming, outgoing) => {
  try {
   const chunks = [];
   let length = 0;
   for await (const part of incoming) {
    length += part.length;
    assert.ok(length <= 12 * 1024 * 1024, 'Local fixture request too large');
    chunks.push(part);
   }
   const headers = Object.entries(incoming.headers).filter(([name]) =>
    !['host', 'connection', 'transfer-encoding', 'content-length'].includes(name));
   const result = await execHttp({ method: incoming.method, path: incoming.url, headers,
    body: Buffer.concat(chunks).toString('base64') });
   outgoing.writeHead(result.status, Object.fromEntries(result.headers));
   outgoing.end(Buffer.from(result.body, 'base64'));
  } catch {
   // Never echo a request's bearer, signed URL or file bytes in diagnostics.
   outgoing.writeHead(502, { 'content-type': 'application/json' });
   outgoing.end('{"error":"Local Storage HTTP relay failed"}');
  }
 });
 await new Promise((resolve, reject) => {
  relay.once('error', reject);
  relay.listen(0, '127.0.0.1', resolve);
 });
 return `http://127.0.0.1:${relay.address().port}`;
}
function activeFor(user = 1) {
 return run(`BEGIN;${as(user)}SELECT dobby_access_private.is_active();ROLLBACK;`).split('\n').filter(Boolean).at(-1);
}

function publishedPolicies(path, prefix, count) {
 const source = readFileSync(resolve(root, path), 'utf8');
 const policies = [...source.matchAll(/CREATE POLICY\s+([a-zA-Z0-9_]+)[\s\S]*?;/g)]
  .filter(match => match[1].startsWith(prefix)).map(match => match[0]);
 assert.equal(policies.length, count, `Unexpected published Storage policy catalog in ${path}`);
 return policies.join('\n');
}

/** Remove only resources this module successfully created. Safe after setup failure. */
export async function stopStorage() {
 active = undefined;
 const errors = [];
 if (relay) {
  for (const child of relayedProcesses) child.kill('SIGKILL');
  relay.closeAllConnections();
  await new Promise(resolve => relay.close(resolve));
  relay = undefined;
 }
 if (storageCreated) {
  const present = docker(['inspect', storage]);
  if (present.status === 0) {
   const result = docker(['rm', '-f', storage]);
   if (result.status !== 0) errors.push(sanitized(result.stderr));
  }
  storageCreated = false;
 }
 if (databaseAttempted) {
  try { stop(); } catch (error) { errors.push(sanitized(error.message)); }
  databaseAttempted = false;
 }
 if (networkCreated) {
  const result = docker(['network', 'rm', network]);
  if (result.status !== 0) errors.push(sanitized(result.stderr));
  networkCreated = false;
 }
 secrets = [];
 assert.equal(errors.length, 0, errors.join('\n'));
}

/**
 * Requires the two digest-pinned images to be present locally. No implicit pull,
 * bind mount, hosted endpoint, persistent volume, GoTrue, or real account.
 */
export async function startStorage() {
 assert.ok(!databaseAttempted && !networkCreated && !storageCreated, 'Storage fixture already started');
 const key = randomBytes(48).toString('base64url');
 secrets = [key];
 const sign = claims => {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ aud: 'authenticated', iat: now, exp: now + 3600, ...claims })).toString('base64url');
  const body = `${header}.${payload}`;
  const jwt = `${body}.${createHmac('sha256', key).update(body).digest('base64url')}`;
  secrets.push(jwt);
  return jwt;
 };
 const serviceToken = sign({ role: 'service_role' });
 const anonToken = sign({ role: 'anon' });
 try {
  const imageInfo = inspect(storageImage);
  assert.ok(imageInfo.RepoDigests.includes(`supabase/storage-api@${storageImage.split('@')[1]}`), 'Storage image digest mismatch');
  databaseAttempted = true;
  const databaseInfo = catalog();
  apply();

  // This extra RLS policy is a fixture capability, never candidate Auth DDL.
  // First demonstrate why narrow column grants do not bypass Auth RLS.
  run('SET ROLE supabase_auth_admin; ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY; RESET ROLE;');
  run(prepare() + 'COMMIT;');
  const narrowGrantsWithRls = activeFor();
  assert.equal(narrowGrantsWithRls, 'f', 'Auth RLS should hide sessions despite narrow column SELECT grants');
  run(`SET ROLE supabase_auth_admin;
   CREATE POLICY dobby_lot2b_fixture_session_reader ON auth.sessions
   FOR SELECT TO dobby_access_session_reader USING(true);
   RESET ROLE;`);
  const fixtureOwnerPolicy = activeFor();
  assert.equal(fixtureOwnerPolicy, 't', 'Explicit fixture Auth-owner policy should make seeded session visible');

  // Dedicated local service login owns Storage, not any business/Auth table.
  // Real Storage migrations create the schema's tables, indexes and functions.
  run(`CREATE ROLE supabase_storage_admin LOGIN NOINHERIT NOCREATEROLE NOBYPASSRLS;
   GRANT CREATE ON DATABASE dobby_access_lot1 TO supabase_storage_admin;
   GRANT anon,authenticated,service_role TO supabase_storage_admin WITH INHERIT FALSE, SET TRUE;
   CREATE SCHEMA storage AUTHORIZATION supabase_storage_admin;
   ALTER ROLE supabase_storage_admin SET search_path=storage,public;
   SET ROLE supabase_storage_admin;
   GRANT USAGE ON SCHEMA storage TO postgres,anon,authenticated,service_role;
   ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON TABLES TO postgres,anon,authenticated,service_role;
   ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT EXECUTE ON FUNCTIONS TO postgres,anon,authenticated,service_role;
   ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON SEQUENCES TO postgres,anon,authenticated,service_role;
   RESET ROLE;`);

  must(docker(['network', 'create', '--internal', '--label', 'dobby.private-access-test=lot2b', network]), 'Create isolated Storage network');
  networkCreated = true;
  // Docker's special "none" network must be detached before attaching the
  // private bridge. Only the database created by this process is touched.
  must(docker(['network', 'disconnect', 'none', database]), 'Detach owned database from none network');
  must(docker(['network', 'connect', '--alias', 'database', network, database]), 'Connect owned database to isolated Storage network');
  const env = {
   AUTH_JWT_SECRET: key, ANON_KEY: anonToken, SERVICE_KEY: serviceToken,
   DATABASE_URL: 'postgres://supabase_storage_admin@database:5432/dobby_access_lot1',
   DATABASE_SEARCH_PATH: 'storage,public', DB_INSTALL_ROLES: 'false',
   DB_SUPER_USER: 'supabase_storage_admin', DB_ALLOW_MIGRATION_REFRESH: 'false',
   STORAGE_BACKEND: 'file', FILE_STORAGE_BACKEND_PATH: '/var/lib/storage',
   GLOBAL_S3_BUCKET: 'local-fixture-bytes', TENANT_ID: 'lot2b-fictional', REGION: 'local',
   FILE_SIZE_LIMIT: '10485760', ENABLE_IMAGE_TRANSFORMATION: 'false',
   S3_PROTOCOL_ENABLED: 'false', PG_QUEUE_ENABLE: 'false',
   LOG_LEVEL: 'error', SERVER_PORT: '5000', SERVER_HOST: '0.0.0.0',
  };
  const serviceFailure = reason => {
   const logs = docker(['logs', '--tail', '30', storage]);
   return new Error(`${reason}: ${sanitized(logs.stdout + logs.stderr)}`);
  };
  // Values enter docker through its inherited environment, never CLI arguments.
  // Keep a failed process inspectable until stopStorage() removes it, so a
  // startup error can report sanitized service logs rather than disappear.
  must(docker(['create', '--pull=never', '--name', storage,
   '--label', 'dobby.private-access-test=lot2b', '--network', network,
   '--publish', '127.0.0.1::5000', '--tmpfs', '/var/lib/storage:rw,mode=1777',
   ...Object.keys(env).flatMap(name => ['-e', name]), storageImage], { env }), 'Create real local Storage API');
  storageCreated = true;
  must(docker(['start', storage]), 'Start real local Storage API');
  const container = inspect(storage);
  const isolation = JSON.parse(must(docker(['network', 'inspect', network]), 'Inspect isolated Storage network'))[0];
  assert.equal(isolation.Internal, true);
  assert.equal(container.Mounts.some(mount => mount.Type === 'bind'), false);
  const databaseContainer = inspect(database);
  assert.equal(databaseContainer.Mounts.some(mount => mount.Type === 'bind'), false);
  assert.deepEqual(Object.keys(databaseContainer.NetworkSettings.Networks), [network]);
  assert.ok(!databaseContainer.HostConfig.PortBindings || Object.keys(databaseContainer.HostConfig.PortBindings).length === 0);
  assert.ok(databaseContainer.HostConfig.Tmpfs['/var/lib/postgresql/data'] !== undefined);
  assert.ok(container.HostConfig.Tmpfs['/var/lib/storage'] !== undefined);
  assert.deepEqual(Object.keys(container.NetworkSettings.Networks), [network]);
  assert.deepEqual(Object.values(isolation.Containers).map(value => value.Name).sort(), [database, storage].sort());
  const binding = container.NetworkSettings.Ports?.['5000/tcp'];
  if (!container.State.Running) throw serviceFailure(`Local Storage exited (state ${container.State.Status}, exit ${container.State.ExitCode})`);
  let url;
  if (binding) {
   assert.equal(binding.length, 1);
   assert.equal(binding[0].HostIp, '127.0.0.1');
   assert.match(binding[0].HostPort, /^\d+$/);
   url = `http://127.0.0.1:${binding[0].HostPort}`;
  } else { url = await startRelay(); }
  const request = async (path, options = {}) => {
   assert.ok(typeof path === 'string' && path.startsWith('/') && !path.startsWith('//'), 'Only local Storage paths are permitted');
   const target = new URL(path, url);
   assert.equal(target.origin, url, 'Storage request must remain on the owned loopback endpoint');
   return fetch(target, { ...options, redirect: 'error', signal: options.signal ?? AbortSignal.timeout(10000) });
  };
  let ready = false;
  let lastStatus = 'no HTTP response';
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
   try {
    const response = await request('/status', { signal: AbortSignal.timeout(1500) });
    lastStatus = `HTTP ${response.status}`;
    await response.arrayBuffer();
    if (response.ok) { ready = true; break; }
   } catch (error) { lastStatus = error.code || error.cause?.code || error.name; }
   if (docker(['inspect', storage]).status !== 0) break;
   await sleep(100);
  }
  if (!ready) {
   throw serviceFailure(`Local Storage did not become healthy (${lastStatus})`);
  }
  assert.equal(run("SELECT c.relowner::regrole::text FROM pg_class c WHERE c.oid='storage.objects'::regclass;"), 'supabase_storage_admin');
  assert.equal(run("SELECT relrowsecurity FROM pg_class WHERE oid='storage.objects'::regclass;"), 't');

  // Reconstruct only the 3 original policies and 5 published socle policies.
  // The old installer and its bucket/transaction blocks are never replayed.
  run(publishedPolicies('sql-proposals/dobby-family-files.sql', 'dobby_family_files_', 3));
  run(publishedPolicies('docs/dobby-v7/finalisation-socle/supabase/family/03-install-storage-policies.sql', 'dobby_socle_', 5));
  run(`CREATE POLICY dobby_lot2b_unrelated_canary ON storage.objects
   FOR ALL TO authenticated USING(bucket_id=${q(unrelatedBucket)}) WITH CHECK(bucket_id=${q(unrelatedBucket)});`);
  for (const bucket of [familyBucket, unrelatedBucket]) {
   const response = await request('/bucket', {
    method: 'POST', headers: { authorization: `Bearer ${serviceToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ id: bucket, name: bucket, public: false, file_size_limit: 10485760,
     allowed_mime_types: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] }),
   });
   assert.ok(response.ok, `Create fictional bucket ${bucket}: HTTP ${response.status}: ${sanitized(await response.text())}`);
  }
  const info = {
   postgres: { version: databaseInfo.version, image: databaseInfo.image },
   storage: { version: 'v1.89.12', image: storageImage, imageId: imageInfo.Id,
    backend: 'file', schemaCreatedBy: 'unmodified Storage API migrations',
    migrations: JSON.parse(run('SELECT json_agg(name ORDER BY id) FROM storage.migrations;')) },
   isolation: { internalNetwork: true, publishAddress: '127.0.0.1', bindMounts: false,
    databaseData: 'tmpfs', objectBytes: 'tmpfs', ownedNetwork: network,
    transport: relay ? 'loopback HTTP relay via docker exec to real container HTTP; internal network port publication unavailable' : 'direct loopback Docker published port' },
   auth: { synthetic: true, verification: 'HS256 verified by real Storage API; random run-only signing key; process memory and ephemeral container environment until teardown',
    gotrueRunning: false, realAccounts: false, sessionRlsEnabled: true,
    narrowGrantsWithRls: narrowGrantsWithRls === 't', fixtureOwnerPolicy: fixtureOwnerPolicy === 't',
    limitation: 'Synthetic auth.sessions and locally signed JWTs do not establish hosted GoTrue/Auth compatibility. Narrow session column grants alone return false under RLS. The fixture Auth owner explicitly adds dobby_lot2b_fixture_session_reader; no candidate Auth policy, owner, grant or managed role change is implied.' },
  };
  active = { url, request, info, serviceToken, anonToken, sql: run, raw,
   token: (userNumber, sessionNumber = 1000 + userNumber, extra = {}) => sign({ role: 'authenticated', sub: id(userNumber), session_id: id(sessionNumber), ...extra }) };
  return active;
 } catch (error) {
  const message = sanitized(error.message);
  try { await stopStorage(); } catch (cleanup) {
   throw new AggregateError([new Error(message), cleanup], 'Local Storage setup and cleanup failed');
  }
  throw new Error(message);
 }
}
