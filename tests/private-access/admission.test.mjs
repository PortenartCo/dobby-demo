import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, stop, run, scalar, exercise, denied, clientDenied, as, q, id, json, manifest, businessSnapshot, businessSnapshotSQL } from './local-db.mjs';

let db;
before(() => { db = start(); });
after(() => { try { if (db) assert.equal(businessSnapshot(), db.baseline, 'Pre-existing Auth/business rows, ACLs, RLS and functions must be unchanged'); } finally { stop(); } });
const context = user => `${as(user)} SELECT public.dobby_access_context();`;
const change = (user,status,revision=1,operation=910,confirmed=true) =>
 `SELECT public.dobby_access_set_status(${q(id(user))},${q(status)},${revision},${q(id(operation))},${confirmed});`;
const seedOther = `INSERT INTO dobby_access_private.authorizations(user_id,status,approved_by) VALUES(${q(id(3))},'active',${q(id(1))});`;

test('T02: no bootstrap means no authorization and no owner', () => {
 assert.deepEqual(JSON.parse(scalar(context(1),{seed:false,sessions:false})),{protocol:1,status:'unapproved',isOwner:false,canCreateHousehold:false,revision:0});
});
test('T10: a missing/ambiguous bootstrap manifest aborts, never enrolls all Auth accounts', () => {
 for (const value of [null,{}, {...manifest,preservedAccounts:[]},{...manifest,preservedAccounts:[manifest.preservedAccounts[0],manifest.preservedAccounts[0]]},
  {...manifest,preservedAccounts:[manifest.preservedAccounts[0],{...manifest.preservedAccounts[1],memberId:'WRONG'}]}]) {
  denied(`SET LOCAL ROLE postgres; SELECT dobby_access_private.bootstrap(${json(value)},${q(id(901))});`,'22023',{seed:false});
 }
 assert.equal(run('SELECT count(*) FROM dobby_access_private.authorizations;'),'0');
});
test('T10: controlled bootstrap preserves the two canonical identities and all business state', () => {
 const output=exercise(`SELECT count(*) FROM dobby_access_private.authorizations; ${context(1)}`);
 assert.equal(output[0],'2');
 assert.deepEqual(JSON.parse(output.at(-1)),{protocol:1,status:'active',isOwner:true,canCreateHousehold:false,revision:1});
 assert.deepEqual(JSON.parse(scalar(context(2))),{protocol:1,status:'active',isOwner:false,canCreateHousehold:false,revision:1});
 assert.equal(scalar(`RESET ROLE; ${businessSnapshotSQL()}`),db.baseline,'Business state must be unchanged while bootstrap is still in effect');
});
test('T02: every other existing Auth account stays unapproved', () => {
 for(const n of [3,4,5,6]) assert.equal(JSON.parse(scalar(context(n))).status,'unapproved');
});
test('T12: user_metadata, forged email and claimed admin role do not grant owner rights', () => {
 denied(`${as(2,1002,{email:'owner@example.invalid',user_metadata:{admin:true,owner:true},app_metadata:{role:'owner'}})} SELECT dobby_access_private.assert_owner();`);
});
test('T12: anonymous/no session/malformed or mismatched identity fail closed', () => {
 assert.equal(JSON.parse(scalar(`SET LOCAL ROLE anon; SELECT public.dobby_access_context();`)).isOwner,false);
 for(const claims of [{sub:id(1)}, {sub:'bad',session_id:id(1001)}, {sub:id(1),session_id:'bad'}, {sub:id(1),session_id:id(1002)}]) {
  assert.equal(JSON.parse(scalar(`SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims=${q(JSON.stringify(claims))}; SELECT public.dobby_access_context();`)).isOwner,false);
 }
 assert.equal(scalar(`${as(1)} SET LOCAL request.jwt.claim.sub=${q(id(2))}; SELECT dobby_access_private.is_active();`),'f');
 assert.equal(scalar(`SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims='invalid-json'; SELECT dobby_access_private.is_active();`),'f');
});
test('T12: browser roles cannot select/insert/update/delete private metadata or assume technical roles', () => {
 for(const statement of ['SELECT * FROM dobby_access_private.settings','INSERT INTO dobby_access_private.settings(owner_user_id) VALUES('+q(id(2))+')',
  "UPDATE dobby_access_private.authorizations SET status='active'",'DELETE FROM dobby_access_private.decisions']) denied(`${as(2)} ${statement};`);
 clientDenied('SET ROLE dobby_access_writer;');
 denied(`${as(2)} SELECT dobby_access_private.bootstrap(${json(manifest)},${q(id(903))});`);
 denied(`${as(2)} SELECT dobby_access_private.enable_session_guard();`);
});
test('T12: bootstrap apply and session maintenance cannot be called by a direct non-superuser client', () => {
 clientDenied(`BEGIN; SELECT dobby_access_private.bootstrap(${json(manifest)},${q(id(902))}); ROLLBACK;`);
 clientDenied('SELECT dobby_access_private.enable_session_guard();');
});
test('T10: no installer-callable apply path can omit canonical validation', () => {
 denied(`SET LOCAL ROLE postgres; SELECT dobby_access_private.bootstrap_apply(${json({ownerUserId:id(1),preservedAccounts:[]})},${q(id(902))});`,'42883',{seed:false});
});
test('T10: FORCE RLS blocks bootstrap when the installer lacks pre-existing canonical visibility', () => {
 denied(`ALTER ROLE postgres NOBYPASSRLS; SET LOCAL ROLE postgres; SELECT dobby_access_private.bootstrap(${json(manifest)},${q(id(902))});`,'22023',{seed:false});
});
test('T01/T12: application owner never receives other household payload privileges', () => {
 assert.equal(scalar(`${as(1)} SELECT count(*) FROM public.dobby_v2_modules WHERE household_id=${q(id(102))};`),'0');
 for(const role of ['dobby_access_writer','dobby_access_session_reader']) {
  assert.equal(scalar(`SELECT has_table_privilege(${q(role)},'public.dobby_v2_modules','SELECT') OR has_table_privilege(${q(role)},'public.dobby_v2_memberships','SELECT');`),'f');
 }
});
test('T12: another household parent cannot control statuses or elect itself owner', () => {
 denied(`${seedOther}${as(3)} ${change(2,'suspended')}`);
});
test('T12: owner suspension and owner registry deletion/reassignment are forbidden', () => {
 denied(`${as(1)} ${change(1,'suspended')}`);
 for(const sql of [`UPDATE dobby_access_private.settings SET owner_user_id=${q(id(2))}`,'DELETE FROM dobby_access_private.settings',
  `UPDATE dobby_access_private.authorizations SET status='suspended' WHERE user_id=${q(id(1))}`,
  `DELETE FROM dobby_access_private.authorizations WHERE user_id=${q(id(1))}`,'TRUNCATE dobby_access_private.settings','TRUNCATE dobby_access_private.authorizations CASCADE']) denied(sql+';');
 denied(`UPDATE dobby_access_private.authorizations SET sessions_valid_after=now()+interval '100 years' WHERE user_id=${q(id(1))};`);
});
test('suspension needs confirmation and the current revision', () => {
 denied(`${as(1)} ${change(2,'suspended',1,910,false)}`,'22023');
 denied(`${as(1)} ${change(2,'suspended',99)}`,'40001');
});
test('suspension refuses still-valid SQL JWT claims immediately without deleting family data', () => {
 const outputs=exercise(`${as(1)} ${change(2,'suspended')} ${as(2)} SELECT dobby_access_private.is_active(); SELECT public.dobby_access_context();`);
 assert.equal(outputs.at(-2),'f'); assert.equal(JSON.parse(outputs.at(-1)).status,'suspended');
 denied(`${as(1)} ${change(2,'suspended')} ${as(2)} SELECT dobby_access_private.assert_active();`);
});
test('suspension revokes only pending admissions of the affected generation and unused creation grants', () => {
 const output=scalar(`UPDATE dobby_access_private.authorizations SET can_create_household=true WHERE user_id=${q(id(2))};
 INSERT INTO dobby_access_private.admissions(id,email,purpose,requested_by,target_user_id,state,approved_by,expires_at)
 VALUES(${q(id(801))},'invite@example.invalid','new-household',${q(id(1))},${q(id(2))},'approved',${q(id(1))},now()+interval '1 day'),
 (${q(id(802))},'retained@example.invalid','new-household',${q(id(1))},${q(id(2))},'accepted',${q(id(1))},now()+interval '1 day');
 ${as(1)} ${change(2,'suspended')} RESET ROLE;
 SELECT jsonb_build_array((SELECT generation FROM dobby_access_private.authorizations WHERE user_id=${q(id(2))}),
 (SELECT can_create_household FROM dobby_access_private.authorizations WHERE user_id=${q(id(2))}),
 (SELECT state FROM dobby_access_private.admissions WHERE id=${q(id(801))}),
 (SELECT state FROM dobby_access_private.admissions WHERE id=${q(id(802))}));`);
 assert.deepEqual(JSON.parse(output),[1,false,'revoked','accepted']);
});
test('reactivation remains closed until a separately committed session boundary', () => {
 const output=exercise(`${as(1)} ${change(2,'suspended')} RESET ROLE;
 INSERT INTO auth.sessions(id,user_id,created_at) VALUES(${q(id(2002))},${q(id(2))},clock_timestamp());
 ${as(1)} ${change(2,'active',2,911)} ${as(2)} SELECT dobby_access_private.is_active();
 ${as(2,2002)} SELECT dobby_access_private.is_active(); RESET ROLE;
 INSERT INTO auth.sessions(id,user_id,created_at) VALUES(${q(id(3002))},${q(id(2))},clock_timestamp()+interval '1 microsecond');
 ${as(2,3002)} SELECT dobby_access_private.is_active();`);
 assert.deepEqual(output.slice(-3),['f','f','f']);
});
test('refresh claims cannot rescue an old or deleted session', () => {
 assert.equal(scalar(`${as(1)} ${change(2,'suspended')} ${change(2,'active',2,911)} ${as(2,1002,{iat:9999999999})} SELECT dobby_access_private.is_active();`),'f');
 assert.equal(scalar(`DELETE FROM auth.sessions WHERE id=${q(id(1002))}; ${as(2)} SELECT dobby_access_private.is_active();`),'f');
 assert.equal(scalar(`UPDATE auth.sessions SET not_after=now()-interval '1 minute' WHERE id=${q(id(1002))}; ${as(2)} SELECT dobby_access_private.is_active();`),'f');
});
test('idempotent decision replay never returns an obsolete active state or reapplies a suspension', () => {
 const output=exercise(`${as(1)} ${change(2,'suspended')} ${change(2,'suspended')} ${change(2,'active',2,911)} ${change(2,'suspended')} RESET ROLE;
 SELECT count(*) FROM dobby_access_private.decisions WHERE action IN ('suspend','reactivate');`);
 assert.equal(JSON.parse(output[1]).replayed,true);
 assert.equal(JSON.parse(output[3]).status,'active'); assert.equal(output.at(-1),'2');
 denied(`${as(1)} ${change(2,'suspended')} ${change(2,'active',1,910)}`,'22023');
});
test('decision history is append-only even through a direct privileged write', () => {
 for(const query of ["UPDATE dobby_access_private.decisions SET action='suspend'",'DELETE FROM dobby_access_private.decisions','TRUNCATE dobby_access_private.decisions']) denied(query+';');
});
test('session permission activation fails closed without exact managed-schema column grants', () => {
 denied('SET LOCAL ROLE postgres; SELECT dobby_access_private.enable_session_guard();','42501',{sessions:false});
 assert.equal(scalar(`${as(1)} SELECT dobby_access_private.is_active();`,{sessions:false}),'f');
});
test('session readiness rejects excessive Auth columns, table privileges and writes', () => {
 for(const grant of ['GRANT SELECT ON auth.sessions','GRANT SELECT(refresh_token_hash) ON auth.sessions',
  'GRANT UPDATE(user_id) ON auth.sessions','GRANT SELECT(email) ON auth.users','GRANT INSERT ON auth.sessions']) {
  denied(`SET LOCAL ROLE supabase_auth_admin; ${grant} TO dobby_access_session_reader; RESET ROLE;
  SET LOCAL ROLE postgres; SELECT dobby_access_private.enable_session_guard();`);
 }
});
test('a suspended context reveals no status or revision for an invalid session', () => {
 for(const sid of [1001,9999]) {
  const value=JSON.parse(scalar(`${as(1)} ${change(2,'suspended')} ${as(2,sid)} SELECT public.dobby_access_context();`));
  assert.equal(value.status,'unapproved');assert.equal(value.revision,0);
 }
});
test('session reader can read no refresh token or Auth email and cannot write Auth', () => {
 assert.equal(scalar(`SELECT has_column_privilege('dobby_access_session_reader','auth.sessions','refresh_token_hash','SELECT')
 OR has_table_privilege('dobby_access_session_reader','auth.sessions','UPDATE')
 OR has_table_privilege('dobby_access_session_reader','auth.users','SELECT');`),'f');
});
test('session checks fail closed if a previously granted column is revoked', () => {
 assert.equal(scalar(`SET LOCAL ROLE supabase_auth_admin;
 REVOKE SELECT(created_at) ON auth.sessions FROM dobby_access_session_reader;
 RESET ROLE; ${as(1)} SELECT dobby_access_private.is_active();`),'f');
});
test('technical roles are closed after installation and service_role has no metadata API', () => {
 assert.equal(scalar(`SELECT bool_and(NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole)
 FROM pg_roles WHERE rolname IN ('dobby_access_writer','dobby_access_session_reader');`),'t');
 assert.equal(scalar(`SELECT pg_has_role('postgres','dobby_access_writer','USAGE')
 OR pg_has_role('postgres','dobby_access_writer','SET')
 OR has_schema_privilege('dobby_access_writer','public','CREATE')
 OR has_schema_privilege('dobby_access_writer','dobby_access_private','CREATE');`),'f');
 denied('SET LOCAL ROLE service_role; SELECT * FROM dobby_access_private.authorizations;');
});
test('T10: bootstrap is a single explicit operation, not a rerunnable reset', () => {
 denied(`SET LOCAL ROLE postgres; SELECT dobby_access_private.bootstrap(${json(manifest)},${q(id(999))});`,'55000');
});
