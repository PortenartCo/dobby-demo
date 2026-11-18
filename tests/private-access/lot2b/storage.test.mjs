// Real local HTTP/file evidence. Auth rows/JWTs are fictional, not GoTrue proof.
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { startStorage, stopStorage, unrelatedBucket } from './local-storage.mjs';
import { nativeTransport, familyBucket } from './native-transport.mjs';
import { root, id, q, as, interactive } from '../local-db.mjs';

let fixture, parent, owner, other, child, unapproved, oldDownload, oldUpload;
let sequence = 40000;
const h1 = id(101), h2 = id(102);
const source = `${h1}/source.pdf`, foreign = `${h2}/child-readable.pdf`;
const originalBytes = '%PDF-1.4\nFICTIONAL LOCAL STORAGE DOCUMENT\n';
const phase = process.env.DOBBY_LOT2B_PHASE ?? 'green';
assert.ok(['red', 'green'].includes(phase));
const proofs = [];
const migrationName = () => {
 const found = readdirSync(resolve(root, 'supabase/migrations')).filter(n => n.endsWith('_dobby_private_access_storage.sql'));
 assert.equal(found.length, 1, 'Exactly one Lot 2B candidate expected'); return found[0];
};
const migration = () => readFileSync(resolve(root, 'supabase/migrations', migrationName()), 'utf8');
const rollback = () => readFileSync(resolve(root, 'supabase/rollbacks', migrationName()), 'utf8');
const sql = statement => fixture.sql(statement);
const ok = (response, label) => { assert.ok(response.ok, `${label}: HTTP ${response.status}`); return response; };
const denied = (response, label) => {
 assert.ok(!response.ok && [400, 401, 403, 404].includes(response.status), `${label}: expected authorization refusal, got HTTP ${response.status}`);
 return response;
};
function signedPath(response) {
 const value = response.data?.signedURL ?? response.data?.signedUrl ?? response.data?.url;
 assert.ok(typeof value === 'string', 'Signing baseline must return a capability');
 const path = new URL(value, fixture.url);
 assert.equal(path.origin, fixture.url); return path.pathname + path.search;
}
function setStatus(status) {
 const revision = sql(`SELECT revision FROM dobby_access_private.authorizations WHERE user_id=${q(id(2))};`);
 sql(`BEGIN;${as(1)}SELECT public.dobby_access_set_status(${q(id(2))},${q(status)},${revision},${q(id(++sequence))},true);COMMIT;`);
}
function reactivate() {
 setStatus('active');
 const revision = sql(`SELECT revision FROM dobby_access_private.authorizations WHERE user_id=${q(id(2))};`);
 sql(`BEGIN;${as(1)}SELECT public.dobby_access_finalize_reactivation(${q(id(2))},${revision});COMMIT;`);
 const session = ++sequence;
 sql(`INSERT INTO auth.sessions(id,user_id,created_at) VALUES(${q(id(session))},${q(id(2))},clock_timestamp());`);
 return nativeTransport(fixture, fixture.token(2, session));
}
const policies = () => sql(`SELECT jsonb_agg(jsonb_build_array(polname,polcmd,polpermissive,polroles::text,pg_get_expr(polqual,polrelid),pg_get_expr(polwithcheck,polrelid)) ORDER BY polname) FROM pg_policy WHERE polrelid='storage.objects'::regclass;`);
const authState = () => sql(`SELECT jsonb_build_object('rows',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM auth.sessions s),'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY policyname) FROM pg_policies p WHERE schemaname='auth'),'roles',(SELECT jsonb_agg(jsonb_build_array(rolname,rolsuper,rolbypassrls,rolcanlogin,rolcreaterole) ORDER BY rolname) FROM pg_roles));`);
const privileges = () => sql(`SELECT jsonb_build_object(
 'relations',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relowner,c.relacl::text,c.relrowsecurity,c.relforcerowsecurity) ORDER BY n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid IN ('storage.objects'::regclass,'storage.buckets'::regclass,'auth.sessions'::regclass)),
 'columns',(SELECT jsonb_agg(jsonb_build_array(attrelid::regclass::text,attname,attacl::text) ORDER BY attrelid,attnum) FROM pg_attribute WHERE attrelid IN ('storage.objects'::regclass,'storage.buckets'::regclass,'auth.sessions'::regclass) AND attnum>0 AND NOT attisdropped),
 'schemas',(SELECT jsonb_agg(jsonb_build_array(nspname,nspowner,nspacl::text) ORDER BY nspname) FROM pg_namespace WHERE nspname IN ('auth','storage','dobby_access_private','dobby_access_legacy','dobby_socle_private')),
 'memberships',(SELECT jsonb_agg(jsonb_build_array(roleid,member,grantor,admin_option,inherit_option,set_option) ORDER BY roleid,member,grantor) FROM pg_auth_members));`);
const objects = () => sql('SELECT jsonb_agg(to_jsonb(o) ORDER BY bucket_id,name) FROM storage.objects o;');
function preflightRefused(pattern) {
 const result = fixture.raw(migration());
 assert.notEqual(result.status, 0, 'Expected atomic candidate refusal');
 assert.match(result.stderr, pattern);
 assert.equal(sql("SELECT count(*) FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname='dobby_access_storage_native';"), '0');
}

before(async () => {
 fixture = await startStorage();
 sql(`INSERT INTO dobby_access_private.authorizations(user_id,status,approved_by)
 VALUES(${q(id(3))},'active',${q(id(1))}),(${q(id(4))},'active',${q(id(1))});`);
 owner = nativeTransport(fixture, 1); parent = nativeTransport(fixture, 2);
 other = nativeTransport(fixture, 3); child = nativeTransport(fixture, 4); unapproved = nativeTransport(fixture, 5);
 ok(await parent.upload(source, originalBytes), 'Seed fictional H1 bytes through HTTP');
 ok(await other.upload(foreign, '%PDF-1.4\nFICTIONAL H2\n'), 'Seed fictional H2 bytes through HTTP');
 ok(await parent.upload('other.pdf', '%PDF-1.4\nOTHER BUCKET\n', { bucket: unrelatedBucket }), 'Seed unrelated bucket through HTTP');
 oldDownload = signedPath(ok(await parent.sign(source), 'Baseline download signing'));
 const upload = signedPath(ok(await parent.signUpload(`${h1}/old-signed-upload.pdf`), 'Baseline upload signing'));
 oldUpload = new URL(upload, fixture.url).searchParams.get('token');
 assert.ok(oldUpload, 'Baseline upload token exists');
 if (phase === 'green') {
  const beforePolicies = JSON.parse(policies()); const beforeAuth = authState(), beforePrivileges = privileges();
  sql(migration());
  assert.deepEqual(JSON.parse(policies()).filter(p => p[0] !== 'dobby_access_storage_native'), beforePolicies);
  assert.equal(authState(), beforeAuth, 'Candidate changes no Auth rows, policies or role attributes');
  assert.equal(privileges(), beforePrivileges, 'Candidate preserves table/column/schema ACLs, owners, RLS and role memberships');
 }
}, { timeout: 120000 });
after(async () => {
 try {
  if (fixture && process.env.DOBBY_EVIDENCE_DIR) {
   mkdirSync(process.env.DOBBY_EVIDENCE_DIR, { recursive: true });
   writeFileSync(resolve(process.env.DOBBY_EVIDENCE_DIR, 'storage-local.json'), JSON.stringify({
    phase, runtime: fixture.info, proofs,
    notEstablished: ['hosted Auth/session permissions', 'real GoTrue login/refresh', 'in-flight cancellation', 'hosted Storage inventory and old capability extinction', 'S3/TUS/rendering protocols'],
   }, null, 2) + '\n');
  }
 } finally { await stopStorage(); }
});

test('new signed capabilities are denied even to an active Parent', async () => {
 denied(await parent.sign(source), 'New signed download');
 denied(await parent.signUpload(`${h1}/new-signed-upload.pdf`), 'New signed upload');
 const many = await parent.signMany([source]);
 if (many.ok) {
  assert.ok(Array.isArray(many.data) && many.data.length === 1);
  assert.ok(many.data.every(item => item.error && !item.signedURL && !item.signedUrl && !item.url), 'Batch signing may return HTTP 200 but must issue no capability');
 } else denied(many, 'Batch signing');
 proofs.push({ scenario: 'active-signing', result: 'single/batch/upload minting refused; batch payload inspected' });
});

test('real Storage keeps normal Parent upload, upsert, copy, move, GET, list and deletion functional', async () => {
 const name = `${h1}/normal.pdf`, copy = `${h1}/copy.pdf`, moved = `${h1}/moved.pdf`;
 ok(await parent.upload(name, '%PDF-1.4\nFIRST\n'), 'New upload');
 ok(await parent.upload(name, '%PDF-1.4\nUPSERT\n', { upsert: true }), 'Upsert');
 ok(await parent.update(name, '%PDF-1.4\nUPDATED\n'), 'Update existing bytes');
 assert.equal(ok(await parent.download(name), 'Authenticated GET').text, '%PDF-1.4\nUPDATED\n');
 ok(await parent.info(name), 'Authenticated metadata'); ok(await parent.head(name), 'Authenticated HEAD');
 ok(await parent.copy(name, copy), 'Copy'); ok(await parent.move(copy, moved), 'Move');
 assert.equal(ok(await parent.download(moved), 'Moved bytes').text, '%PDF-1.4\nUPDATED\n');
 denied(await parent.download(copy), 'Old moved path');
 const listed = ok(await parent.list(h1), 'List').data;
 assert.ok(listed.some(x => x.name === 'normal.pdf')); assert.ok(listed.some(x => x.name === 'moved.pdf'));
 ok(await parent.removeOne(moved), 'Delete single object');
 ok(await parent.remove([name]), 'Delete object batch');
 denied(await parent.download(name), 'Deleted physical object');
 proofs.push({ scenario: 'normal-native-operations', result: 'actual bytes read back after update/copy/move; deleted path inaccessible' });
});

test('family and Parent/Enfant restrictions remain effective, including for the DOBBY owner', async () => {
 denied(await parent.download(foreign), 'H1 cannot read H2'); denied(await owner.download(foreign), 'DOBBY owner cannot read H2');
 denied(await other.download(source), 'H2 cannot read H1'); denied(await unapproved.download(source), 'Unapproved cannot read H1');
 denied(await parent.upload(`${h2}/foreign.pdf`, originalBytes), 'Cross-family upload');
 denied(await parent.upload('malformed-family/file.pdf', originalBytes), 'Malformed family path');
 denied(await parent.copy(source, `${h2}/cross-copy.pdf`), 'Cross-family copy destination');
 denied(await parent.move(source, `${h2}/cross-move.pdf`), 'Cross-family move destination');
 denied(await parent.copy('other.pdf', `${h2}/cross-bucket-copy.pdf`, unrelatedBucket, familyBucket), 'Mixed-bucket foreign destination copy');
 denied(await parent.move('other.pdf', `${h2}/cross-bucket-move.pdf`, unrelatedBucket, familyBucket), 'Mixed-bucket foreign destination move');
 denied(await parent.copy(foreign, 'foreign-copy.pdf', familyBucket, unrelatedBucket), 'Mixed-bucket foreign source copy');
 denied(await parent.move(foreign, 'foreign-move.pdf', familyBucket, unrelatedBucket), 'Mixed-bucket foreign source move');
 assert.equal(ok(await parent.download(source), 'Failed move preserves source').text, originalBytes);
 assert.equal(ok(await child.download(foreign), 'Canonical child can read its family').text, '%PDF-1.4\nFICTIONAL H2\n');
 denied(await child.upload(`${h2}/child-write.pdf`, originalBytes), 'Child upload');
 denied(await child.update(foreign, originalBytes), 'Child update');
 denied(await child.copy(foreign, `${h2}/child-copy.pdf`), 'Child copy');
 denied(await child.move(foreign, `${h2}/child-move.pdf`), 'Child move');
 const removed = await child.remove([foreign]);
 if (removed.ok) assert.deepEqual(removed.data, [], 'Child deletion must affect no object'); else denied(removed, 'Child delete');
 ok(await other.download(foreign), 'Child deletion leaves bytes intact');
 proofs.push({ scenario: 'family-roles', result: 'two-household isolation and child read-only preserved; administrative identity adds no content access' });
});

test('an unapproved Auth user with a canonical family link still cannot read its own family files', async () => {
 sql(`DELETE FROM dobby_access_private.authorizations WHERE user_id=${q(id(4))};`);
 try {
  denied(await child.download(foreign), 'Canonical membership without DOBBY approval');
  const list = await child.list(h2);
  if (list.ok) assert.deepEqual(list.data, []); else denied(list, 'Unapproved own-family list');
 } finally {
  sql(`INSERT INTO dobby_access_private.authorizations(user_id,status,approved_by) VALUES(${q(id(4))},'active',${q(id(1))});`);
 }
 ok(await child.download(foreign), 'Approval restores permitted child read');
 proofs.push({ scenario: 'unapproved-linked-account', result: 'canonical own-family membership and a valid JWT alone confer no file access' });
});

test('private public routes, unsigned direct SQL operations and invalid session JWTs fail closed', async () => {
 const anonymous = nativeTransport(fixture, fixture.anonToken);
 denied(await anonymous.request('GET', `/object/public/${familyBucket}/${source}`), 'Private bucket public route');
 denied(await parent.request('PUT', `/bucket/${familyBucket}`, { json: { public: true } }), 'Browser cannot publish private bucket');
 assert.equal(sql(`SELECT public FROM storage.buckets WHERE id=${q(familyBucket)};`), 'f', 'Browser bucket update leaves family bucket private');
 denied(await nativeTransport(fixture, fixture.token(2, 999999)).download(source), 'Missing session');
 denied(await nativeTransport(fixture, fixture.token(2, 1001)).download(source), 'Session belongs to another user');
 denied(await nativeTransport(fixture, fixture.token(2, 1002, { exp: 1 })).download(source), 'Expired cryptographic JWT');
 denied(await nativeTransport(fixture, 'invalid-local-token').download(source), 'Malformed cryptographic JWT');
 sql(`INSERT INTO auth.sessions(id,user_id,created_at,not_after) VALUES(${q(id(1999))},${q(id(2))},clock_timestamp()-interval '1 hour',clock_timestamp()-interval '1 minute');`);
 denied(await nativeTransport(fixture, fixture.token(2, 1999)).download(source), 'Expired server-side session');
 assert.equal(sql(`BEGIN;${as(2)}SELECT count(*) FROM storage.objects WHERE bucket_id=${q(familyBucket)};ROLLBACK;`).split('\n').at(-1), '0', 'Missing storage.operation fails closed');
 for (const operation of ['storage.object.sign', 'storage.object.list_v2', 'unreviewed.operation']) {
  assert.equal(sql(`BEGIN;${as(2)}SET LOCAL storage.operation=${q(operation)};SELECT count(*) FROM storage.objects WHERE bucket_id=${q(familyBucket)};ROLLBACK;`).split('\n').at(-1), '0', 'Unreviewed operation fails closed');
 }
 proofs.push({ scenario: 'identity-and-direct-paths', result: 'private public route, missing/wrong/expired sessions, invalid/expired JWT, missing SQL operation all refused' });
});

test('committed suspension refuses old-JWT operations while other buckets remain governed by their own policy', async () => {
 setStatus('suspended');
 try {
  denied(await parent.download(source), 'GET after suspension'); denied(await parent.info(source), 'Metadata after suspension'); denied(await parent.head(source), 'HEAD after suspension');
  const list = await parent.list(h1);
  if (list.ok) assert.deepEqual(list.data, [], 'Suspended list must disclose no names'); else denied(list, 'Suspended list');
  const before = objects();
  denied(await parent.upload(`${h1}/suspended.pdf`, originalBytes), 'Suspended upload');
  denied(await parent.upload(source, originalBytes, { upsert: true }), 'Suspended upsert');
  denied(await parent.update(source, originalBytes), 'Suspended update');
  denied(await parent.copy(source, `${h1}/suspended-copy.pdf`), 'Suspended copy');
  denied(await parent.move(source, `${h1}/suspended-move.pdf`), 'Suspended move');
  const removed = await parent.remove([source]);
  if (removed.ok) assert.deepEqual(removed.data, [], 'Suspended deletion affects zero objects'); else denied(removed, 'Suspended delete');
  denied(await parent.removeOne(source), 'Suspended single delete');
  denied(await parent.sign(source), 'Suspended signing'); denied(await parent.signUpload(`${h1}/suspended-signed-upload.pdf`), 'Suspended upload signing');
  assert.equal(objects(), before, 'Denied operations preserve object metadata exactly');
  assert.equal(ok(await parent.download('other.pdf', unrelatedBucket), 'Unrelated bucket existing permission').text, '%PDF-1.4\nOTHER BUCKET\n');
  ok(await parent.upload('other-after-suspension.pdf', originalBytes, { bucket: unrelatedBucket }), 'Unrelated bucket write policy unchanged');
  assert.equal(ok(await owner.download(source), 'Authorized other family member still reads').text, originalBytes);
 } finally {
  const old = parent; parent = reactivate();
  denied(await old.download(source), 'Old session remains refused after reactivation');
  assert.equal(ok(await parent.download(source), 'New post-boundary session restored').text, originalBytes);
 }
 proofs.push({ scenario: 'committed-suspension-reactivation', result: 'old JWT refused for all normal family operations; no metadata change; old session stays denied after two-phase reactivation; unrelated bucket policy preserved' });
});

test('pre-issued download and upload capabilities survive suspension: measured residual, never a revocation success', async () => {
 setStatus('suspended');
 try {
  assert.equal(ok(await parent.signedDownload(oldDownload), 'Old signed download persists').text, originalBytes);
  ok(await parent.signedUpload(`${h1}/old-signed-upload.pdf`, oldUpload, '%PDF-1.4\nOLD SIGNED UPLOAD\n'), 'Old signed upload persists');
  denied(await parent.download(`${h1}/old-signed-upload.pdf`), 'Suspended authenticated reader remains refused');
  assert.equal(ok(await owner.download(`${h1}/old-signed-upload.pdf`), 'Existing capability wrote physical bytes').text, '%PDF-1.4\nOLD SIGNED UPLOAD\n');
 } finally { parent = reactivate(); }
 proofs.push({ scenario: 'pre-issued-bearers', result: 'download URL AND unused signed upload token still work after suspension; deployment blocked until old capabilities expire or are extinguished separately', revocationAchieved: false });
});

test('maintenance lock excludes policy replacement before rollback fingerprint verification', async () => {
 const script = rollback(), boundary = script.indexOf('DO $verify$');
 assert.ok(boundary > 0);
 const installer = interactive(); let replacement;
 try {
  installer.send(script.slice(0, boundary) + '\n\\echo MAINTENANCE_LOCK_HELD');
  await installer.waitFor('MAINTENANCE_LOCK_HELD');
  replacement = fixture.raw("BEGIN; SET LOCAL lock_timeout='150ms'; ALTER POLICY dobby_access_storage_native ON storage.objects USING(true); COMMIT;");
 } finally { await installer.finish('ROLLBACK;'); }
 if (replacement.status === 0) {
  sql('DROP POLICY dobby_access_storage_native ON storage.objects;'); sql(migration());
 }
 assert.notEqual(replacement.status, 0, 'Concurrent replacement must be blocked before fingerprint verification');
 assert.match(replacement.stderr, /55P03/);
 proofs.push({ scenario: 'maintenance-serialization', result: 'second SQL connection cannot replace the policy while rollback is paused before fingerprint verification' });
});

test('candidate preflight rejects public bucket, altered policies and broad permissive additions atomically', () => {
 sql(rollback());
 sql('ALTER ROLE authenticated BYPASSRLS;');
 try { preflightRefused(/browser|bypass|role|RLS/i); } finally {
  if (sql("SELECT count(*) FROM pg_policy WHERE polname='dobby_access_storage_native' AND polrelid='storage.objects'::regclass;") === '1') sql(rollback());
  sql('ALTER ROLE authenticated NOBYPASSRLS;');
 }
 // Temporarily reverse only the synthetic role edge, avoiding a role cycle.
 // Restore the service's original SET capability before the next HTTP call.
 sql('REVOKE authenticated FROM supabase_storage_admin; GRANT supabase_storage_admin TO authenticated WITH INHERIT FALSE, SET TRUE;');
 try { preflightRefused(/browser|own|role|RLS/i); } finally {
  sql('REVOKE supabase_storage_admin FROM authenticated; GRANT authenticated TO supabase_storage_admin WITH INHERIT FALSE, SET TRUE;');
 }
 sql(`CREATE POLICY lot2b_bucket_publish_canary ON storage.buckets FOR UPDATE TO authenticated USING(id=${q(familyBucket)}) WITH CHECK(id=${q(familyBucket)});`);
 try { preflightRefused(/policy|polic|unreviewed/i); } finally { sql('DROP POLICY lot2b_bucket_publish_canary ON storage.buckets;'); }
 sql(`UPDATE storage.buckets SET public=true WHERE id=${q(familyBucket)};`);
 try { preflightRefused(/private|privé|bucket/i); } finally { sql(`UPDATE storage.buckets SET public=false WHERE id=${q(familyBucket)};`); }
 sql('ALTER POLICY dobby_family_files_read ON storage.objects USING(true);');
 try { preflightRefused(/policy|polic|catalog|drift/i); } finally {
  const source = readFileSync(resolve(root, 'sql-proposals/dobby-family-files.sql'), 'utf8');
  const definition = source.match(/CREATE POLICY dobby_family_files_read[\s\S]*?;/)[0];
  sql('DROP POLICY dobby_family_files_read ON storage.objects;' + definition);
 }
 const folderDefinition = sql("SELECT pg_get_functiondef('storage.foldername(text)'::regprocedure);");
 const parts = folderDefinition.split('$function$'); assert.equal(parts.length, 3);
 sql(parts[0] + `$function$\nBEGIN RETURN ARRAY[${q(h1)}]::text[]; END\n$function$` + parts[2]);
 try { preflightRefused(/helper|folder|definition|drift/i); } finally {
  if (sql("SELECT count(*) FROM pg_policy WHERE polname='dobby_access_storage_native' AND polrelid='storage.objects'::regclass;") === '1') sql(rollback());
  sql(folderDefinition);
 }
 sql('CREATE POLICY lot2b_broad_canary ON storage.objects FOR SELECT TO authenticated USING(true);');
 try { preflightRefused(/policy|polic|catalog|unreviewed|unexpected/i); } finally { sql('DROP POLICY lot2b_broad_canary ON storage.objects;'); }
 sql(`CREATE POLICY lot2b_one_sided_canary ON storage.objects FOR ALL TO authenticated WITH CHECK(bucket_id=${q(unrelatedBucket)});`);
 try { preflightRefused(/policy|polic|catalog|unreviewed|unexpected|unbounded/i); } finally {
  if (sql("SELECT count(*) FROM pg_policy WHERE polname='dobby_access_storage_native' AND polrelid='storage.objects'::regclass;") === '1') sql(rollback());
  sql('DROP POLICY lot2b_one_sided_canary ON storage.objects;');
 }
 const deniedOwner = fixture.raw('SET ROLE postgres;' + migration());
 assert.notEqual(deniedOwner.status, 0); assert.match(deniedOwner.stderr, /42501|must be owner|permission denied/i);
 assert.equal(sql("SELECT count(*) FROM pg_policy WHERE polname='dobby_access_storage_native' AND polrelid='storage.objects'::regclass;"), '0');
 sql(migration());
 proofs.push({ scenario: 'preflight', result: 'public bucket, native-policy drift, broad extra policy and managed-table DDL denial all abort atomically' });
});

test('rollback refuses tampering, restores exact policies and preserves actual bytes; candidate reapplies', async () => {
 const candidatePolicies = policies(), beforeAuth = authState(), beforeObjects = objects(), beforePrivileges = privileges();
 sql('ALTER POLICY dobby_access_storage_native ON storage.objects USING(true);');
 const tampered = fixture.raw(rollback());
 assert.notEqual(tampered.status, 0); assert.match(tampered.stderr, /policy|polic|drift|definition|modified/i);
 // Restore the exact candidate definition through its documented rollback guard.
 sql('DROP POLICY dobby_access_storage_native ON storage.objects;'); sql(migration());
 assert.equal(policies(), candidatePolicies);
 sql(rollback());
 assert.equal(objects(), beforeObjects); assert.equal(authState(), beforeAuth);
 assert.equal(privileges(), beforePrivileges, 'Rollback preserves table/column/schema ACLs, owners, RLS and memberships');
 const baseline = JSON.parse(candidatePolicies).filter(p => p[0] !== 'dobby_access_storage_native');
 assert.deepEqual(JSON.parse(policies()), baseline);
 assert.equal(ok(await parent.download(source), 'Rollback preserves bytes').text, originalBytes);
 const reopened = await parent.sign(source); ok(reopened, 'Rollback reopens baseline signing'); signedPath(reopened);
 sql(migration());
 assert.equal(policies(), candidatePolicies);
 assert.equal(ok(await parent.download(source), 'Reapply preserves bytes').text, originalBytes);
 denied(await parent.sign(source), 'Reapply closes signing again');
 proofs.push({ scenario: 'rollback-reapply', result: 'tampered policy rejected; original policies, Auth, rows and file bytes preserved; rollback reopens signing; reapply closes it' });
});
