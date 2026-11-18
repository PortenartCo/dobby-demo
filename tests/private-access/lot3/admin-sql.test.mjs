import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { catalog, apply } from '../lot2a/catalog.mjs';
import { root, run, raw, stop, prepare, as, id, q, json } from '../local-db.mjs';

before(() => {
 catalog(); apply();
 run('SET ROLE postgres;'+readFileSync(resolve(root,'supabase/migrations/20261118120207_dobby_private_access_administration.sql'),'utf8'));
});
after(stop);
function setup() {
 return prepare()+`SET LOCAL ROLE supabase_auth_admin;
 GRANT USAGE ON SCHEMA auth TO dobby_access_identity_reader;
 GRANT SELECT(id,email,email_confirmed_at) ON auth.users TO dobby_access_identity_reader;
 RESET ROLE; SET LOCAL ROLE postgres;
 SELECT dobby_access_private.enable_identity_guard(); RESET ROLE;`;
}
function exercise(sql) { return run(setup()+sql+'ROLLBACK;').split('\n').filter(Boolean); }
function denied(sql, code='42501') {
 const r=raw(setup()+'\n\\echo CASE_READY\n'+sql+'ROLLBACK;');
 assert.match(r.stdout,/CASE_READY/);assert.notEqual(r.status,0,r.stdout);assert.match(r.stderr,new RegExp(`ERROR:  ${code}\\b`),r.stderr);
}
const command=(name,payload)=>`public.dobby_access_admin(${q(name)},${json(payload)})`;
const profile={firstName:'Fictional',lastName:'Adult',avatarId:'portrait-1'};
function delivered() {
 return `${as(1)}
 SELECT ${command('invite',{email:'fixture-5@example.invalid',purpose:'new-household',operationId:id(3001)})} AS invite \\gset
 SELECT :'invite'::jsonb->'admission'->>'id' AS aid \\gset
 SELECT ${command('claimDelivery',{admissionId:id(1),expectedRevision:1,operationId:id(3002)}).replace(json({admissionId:id(1),expectedRevision:1,operationId:id(3002)}),`jsonb_build_object('admissionId',:'aid','expectedRevision',1,'operationId',${q(id(3002))})`)} AS claim \\gset
 SELECT :'claim'::jsonb->'delivery'->>'id' AS did \\gset
 SELECT public.dobby_access_admin('recordDelivery',jsonb_build_object('admissionId',:'aid','deliveryId',:'did','targetUserId',${q(id(5))},'operationId',${q(id(3003))}));`;
}
test('owner-only commands, closed payloads and no content grants',()=>{
 denied(as(2)+`SELECT ${command('listAccess',{})};`);
 denied(as(1)+`SELECT ${command('invite',{email:'fixture-5@example.invalid',purpose:'new-household',operationId:id(3001),householdId:id(102)})};`,'22023');
 const r=exercise(`${as(1)} SELECT ${command('listAccess',{})};`).at(-1);
 assert.ok(JSON.parse(r).items.length>=6);assert.ok(!r.includes('magicProfile'));
 assert.equal(exercise(`SELECT has_table_privilege('dobby_access_writer','public.dobby_v2_modules','SELECT');`).at(-1),'f');
});
test('delivery CAS and replay never silently authorizes or resends',()=>{
 const out=exercise(delivered()+`${as(5)} SELECT public.dobby_access_context(:'aid'::uuid);`);
 assert.equal(JSON.parse(out.at(-1)).status,'unapproved');
 assert.equal(JSON.parse(out.at(-1)).admission.requiresProfile,true);
 const replay=exercise(delivered()+`${as(1)} SELECT public.dobby_access_admin('claimDelivery',jsonb_build_object('admissionId',:'aid','expectedRevision',1,'operationId',${q(id(3002))}));`).at(-1);
 assert.equal(JSON.parse(replay).delivery.requiresResume,true);
});
test('acceptance creates one pending profile atomically then consumes one household right',()=>{
 const out=exercise(delivered()+`${as(5)}
 SELECT public.dobby_access_accept(:'aid'::uuid,${json(profile)},${q(id(3010))});
 SELECT public.dobby_access_accept(:'aid'::uuid,${json(profile)},${q(id(3010))});
 SELECT public.dobby_v7_create_household('Fictional new home',${q(id(3011))});
 SELECT public.dobby_v7_create_household('Fictional new home',${q(id(3011))});
 SELECT public.dobby_access_context();`);
 assert.equal(JSON.parse(out.at(-1)).status,'active');
 assert.equal(JSON.parse(out.at(-1)).canCreateHousehold,false);
 assert.equal(JSON.parse(out.at(-2)).replayed,true);
});
test('different UUID, wrong current email, expired admission and changed operation rejected',()=>{
 denied(delivered()+`${as(6)} SELECT public.dobby_access_accept(:'aid'::uuid,${json(profile)},${q(id(3010))});`);
 denied(delivered()+`RESET ROLE; SET LOCAL ROLE supabase_auth_admin; UPDATE auth.users SET email='changed@example.invalid' WHERE id=${q(id(5))}; RESET ROLE; ${as(5)} SELECT public.dobby_access_accept(:'aid'::uuid,${json(profile)},${q(id(3010))});`);
 denied(delivered()+`RESET ROLE; SET LOCAL ROLE postgres; UPDATE dobby_access_private.admissions SET expires_at=clock_timestamp()-interval '1 second' WHERE id=:'aid'::uuid; RESET ROLE; ${as(5)} SELECT public.dobby_access_accept(:'aid'::uuid,${json(profile)},${q(id(3010))});`);
 denied(delivered()+`${as(5)} SELECT public.dobby_access_accept(:'aid'::uuid,${json(profile)},${q(id(3010))}); SELECT public.dobby_access_accept(:'aid'::uuid,${json({...profile,firstName:'Changed'})},${q(id(3010))});`,'22023');
});
test('free invitation creators close; family request has no Auth or access side effects',()=>{
 denied(as(1)+`SELECT public.dobby_v7_create_invitation(24,${q(id(3100))});`);
 const r=exercise(`${as(1)} SELECT public.dobby_access_request_family_account('new-parent@example.invalid','family-parent',NULL,${q(id(3101))});`).at(-1);
 assert.equal(JSON.parse(r).admission.state,'requested');assert.equal(JSON.parse(r).admission.householdId,id(101));
 denied(as(1)+`SELECT public.dobby_access_request_family_account('new-child@example.invalid','family-child','NOT_IN_H1',${q(id(3102))});`);
});
test('uncertain delivery requires explicit resume; old attempt cannot finalize new attempt',()=>{
 const sql=`${as(1)} SELECT ${command('invite',{email:'fixture-5@example.invalid',purpose:'new-household',operationId:id(3201)})} AS invite \\gset
 SELECT :'invite'::jsonb->'admission'->>'id' AS aid \\gset
 SELECT public.dobby_access_admin('claimDelivery',jsonb_build_object('admissionId',:'aid','expectedRevision',1,'operationId',${q(id(3202))})) AS claim \\gset
 SELECT :'claim'::jsonb->'delivery'->>'id' AS did \\gset
 SELECT public.dobby_access_admin('failDelivery',jsonb_build_object('admissionId',:'aid','deliveryId',:'did','operationId',${q(id(3203))},'uncertain',true));
 SELECT public.dobby_access_admin('resumeDelivery',jsonb_build_object('admissionId',:'aid','expectedRevision',3,'operationId',${q(id(3204))},'confirmed',true));`;
 assert.equal(JSON.parse(exercise(sql).at(-1)).delivery.requiresResume,false);
 denied(sql+`SELECT public.dobby_access_admin('recordDelivery',jsonb_build_object('admissionId',:'aid','deliveryId',:'did','targetUserId',${q(id(5))},'operationId',${q(id(3205))}));`);
});
test('pending known Auth account can be suspended before acceptance without provisional active rights',()=>{
 const sql=delivered()+`${as(1)} SELECT ${command('setStatus',{userId:id(5),status:'suspended',expectedRevision:0,operationId:id(3301),confirmed:true})};`;
 assert.equal(JSON.parse(exercise(sql).at(-1)).status,'suspended');
 denied(sql+`${as(5)} SELECT public.dobby_access_accept(:'aid'::uuid,${json(profile)},${q(id(3302))});`);
 const state=exercise(sql+`RESET ROLE; SELECT jsonb_build_object('status',status,'generation',generation,'canCreate',can_create_household) FROM dobby_access_private.authorizations WHERE user_id=${q(id(5))};`).at(-1);
 assert.deepEqual(JSON.parse(state),{status:'suspended',generation:1,canCreate:false});
});
test('approved parent request uses canonical family writers and preserves requester identity',()=>{
 const sql=`${as(1)} SELECT public.dobby_access_request_family_account('fixture-5@example.invalid','family-parent',NULL,${q(id(3401))}) AS request \\gset
 SELECT :'request'::jsonb->'admission'->>'id' AS aid \\gset
 SELECT public.dobby_access_admin('decide',jsonb_build_object('admissionId',:'aid','decision','approve','expectedRevision',1,'operationId',${q(id(3402))}));
 SELECT public.dobby_access_admin('claimDelivery',jsonb_build_object('admissionId',:'aid','expectedRevision',2,'operationId',${q(id(3403))})) AS claim \\gset
 SELECT :'claim'::jsonb->'delivery'->>'id' AS did \\gset
 SELECT public.dobby_access_admin('recordDelivery',jsonb_build_object('admissionId',:'aid','deliveryId',:'did','targetUserId',${q(id(5))},'operationId',${q(id(3404))}));
 ${as(5)} SELECT public.dobby_access_accept(:'aid'::uuid,${json(profile)},${q(id(3405))});
 SELECT public.dobby_v7_context();`;
 const out=exercise(sql);
 assert.equal(JSON.parse(out.at(-1)).householdId,id(101));
 assert.equal(JSON.parse(out.at(-1)).profile.memberCategory,'parent');
 const created=exercise(sql+`RESET ROLE; SELECT created_by FROM dobby_v7_private.invitations WHERE admission_id=:'aid'::uuid;`).at(-1);
 assert.equal(created,id(1));
});
test('conservative rollback closes administration and keeps existing family context',()=>{
 const rollback=readFileSync(resolve(root,'supabase/rollbacks/20261118120207_dobby_private_access_administration.sql'),'utf8')
  .replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'');
 const out=exercise(`SET LOCAL ROLE postgres; ${rollback}
 SELECT administration_enabled FROM dobby_access_private.settings;
 SELECT has_function_privilege('authenticated','public.dobby_access_admin(text,jsonb)','EXECUTE');
 RESET ROLE; ${as(1)} SELECT public.dobby_v7_context();`);
 assert.equal(out.at(-3),'f');assert.equal(out.at(-2),'f');assert.equal(JSON.parse(out.at(-1)).phase,'active');
});
test('fresh owner approval grants one first-household quota after pending suspension/reactivation',()=>{
 // Separate transactions exercise the real Lot 1 reactivation boundary.
 run(setup()+delivered()+`${as(1)}
 SELECT ${command('setStatus',{userId:id(5),status:'suspended',expectedRevision:0,operationId:id(3501),confirmed:true})};
 SELECT ${command('setStatus',{userId:id(5),status:'active',expectedRevision:1,operationId:id(3502),confirmed:true})}; COMMIT;`);
 run(`BEGIN; ${as(1)} SELECT ${command('finalizeReactivation',{userId:id(5),expectedRevision:2})}; COMMIT;`);
 run(`INSERT INTO auth.sessions(id,user_id,created_at) VALUES(${q(id(10055))},${q(id(5))},clock_timestamp());`);
 const out=run(`BEGIN; ${as(1)}
 SELECT ${command('invite',{email:'fixture-5@example.invalid',purpose:'new-household',operationId:id(3510)})} AS fresh \\gset
 SELECT :'fresh'::jsonb->'admission'->>'id' AS aid \\gset
 SELECT public.dobby_access_admin('claimDelivery',jsonb_build_object('admissionId',:'aid','expectedRevision',1,'operationId',${q(id(3511))})) AS claim \\gset
 SELECT :'claim'::jsonb->'delivery'->>'id' AS did \\gset
 SELECT public.dobby_access_admin('recordDelivery',jsonb_build_object('admissionId',:'aid','deliveryId',:'did','targetUserId',${q(id(5))},'operationId',${q(id(3512))}));
 ${as(5,10055)} SELECT public.dobby_access_context();
 SELECT public.dobby_access_accept(:'aid'::uuid,${json(profile)},${q(id(3513))});
 SELECT public.dobby_access_context();
 SELECT public.dobby_v7_create_household('First after explicit fresh approval',${q(id(3514))});
 SELECT public.dobby_access_context(); ROLLBACK;`).split('\n').filter(Boolean);
 assert.equal(JSON.parse(out.at(-5)).canCreateHousehold,false);
 assert.equal(JSON.parse(out.at(-3)).canCreateHousehold,true);
 assert.equal(JSON.parse(out.at(-1)).canCreateHousehold,false);
});
