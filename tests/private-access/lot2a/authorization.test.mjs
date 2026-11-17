import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { catalog, apply } from './catalog.mjs';
import { stop, run, raw, as, id, q, json, prepare, scalar, exercise, denied, interactive, clientDenied } from '../local-db.mjs';

const approved = `INSERT INTO dobby_access_private.authorizations(user_id,status,approved_by,can_create_household)
 VALUES(${q(id(3))},'active',${q(id(1))},false),(${q(id(4))},'active',${q(id(1))},false),(${q(id(6))},'active',${q(id(1))},true);`;
const setup=()=>prepare()+approved;
const digest=`SELECT md5(jsonb_build_array(${[
 'public.dobby_v2_households','public.dobby_v2_memberships','public.dobby_v2_modules','public.dobby_v2_grocery',
 'public.dobby_sync_members','public.dobby_sync_grocery_items','dobby_v7_private.pending_profiles',
 'dobby_v7_private.account_links','dobby_v7_private.invitations','dobby_v7_private.operations','dobby_socle_private.mission_operations',
 'dobby_access_private.authorizations',
].map(t=>`(SELECT jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text) FROM ${t} t)`).join(',')})::text);`;
function reject(sql,user=2,extra='') {
 const out=run(setup()+extra+digest+as(user)+`DO $refuse$ BEGIN
 BEGIN EXECUTE ${q(sql)}; RAISE EXCEPTION 'UNEXPECTED SUCCESS';
 EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'EXPECTED 42501'; END;
 END $refuse$; RESET ROLE;`+digest+'ROLLBACK;').split('\n');
 assert.equal(out[0],out.at(-1),'Denied call changed business/access rows');
}
const suspend=`UPDATE dobby_access_private.authorizations SET status='suspended' WHERE user_id=${q(id(2))};`;
const intent={kind:'snapshot',payload:{}};
const receipt=`INSERT INTO dobby_socle_private.mission_operations(household_id,operation_id,actor_id,expected_revision,applied_revision,request_digest)
 VALUES(${q(id(101))},${q(id(830))},${q(id(2))},11,11,encode(sha256(convert_to(${json(intent)}::text,'UTF8')),'hex'));`;
const replay=`SELECT public.dobby_missions_v3_write(${q(id(101))},11,${q(id(830))},${json(intent)})`;
before(()=>{
 catalog();
 // Executed BEFORE correction, with original public SQL definitions.
 assert.equal(scalar(as(3)+`SELECT count(*) FROM public.dobby_v2_modules;`),'1');
 assert.equal(scalar(as(2)+`SELECT public.dobby_v7_context()->>'phase';`),'active');
 assert.equal(scalar(suspend+as(2)+`SELECT public.dobby_v7_context()->>'phase';`),'active');
 assert.equal(scalar(as(5)+`SELECT count(*) FROM public.dobby_sync_members;`),'1');
 assert.equal(scalar(as(5)+`SELECT count(*) FROM public.dobby_sync_grocery_items;`),'1');
 assert.equal(scalar(receipt+suspend+as(2)+replay+`->>'replayed';`),'true');
 console.log('COUNTER-CONTROLS: unapproved own-family read=1; suspended context=active; suspended V3 replay=true; V1 member=1/article=1');
 apply();
});
after(stop);

test('T02 unapproved Auth account sees zero business rows and cannot invoke context',()=>{
 for(const t of ['dobby_v2_households','dobby_v2_memberships','dobby_v2_modules','dobby_v2_grocery','dobby_sync_members'])
  assert.equal(scalar(as(3)+`SELECT count(*) FROM public.${t};`),'0',t);
 denied(as(3)+`SELECT public.dobby_v7_context();`);
});
test('T01 active two-household reads retain canonical isolation and owner has no extra visibility',()=>{
 for(const [u,hh,count] of [[1,101,2],[2,101,2],[3,102,1],[4,102,1]]) {
  const lines=run(setup()+as(u)+`SELECT count(*),bool_and(household_id=${q(id(hh))}) FROM public.dobby_v2_modules; ROLLBACK;`);
  assert.equal(lines,`${count}|t`);
 }
 reject(`SELECT public.dobby_missions_v3_capabilities(${q(id(102))});`,2);
});
test('T05 suspension closes reads, context and direct mutations with old session',()=>{
 assert.equal(scalar(suspend+as(2)+`SELECT count(*) FROM public.dobby_v2_modules;`),'0');
 reject('SELECT public.dobby_v7_context();',2,suspend);
 reject(`UPDATE public.dobby_v2_modules SET payload=payload WHERE household_id=${q(id(101))} AND module='family';`,2,suspend);
});
test('T08 V1 grocery API is closed, own membership is gated, existing rows retained',()=>{
 denied(as(5)+`SELECT * FROM public.dobby_sync_grocery_items;`);
 assert.equal(scalar(as(5)+`SELECT count(*) FROM public.dobby_sync_members;`),'0');
 assert.equal(scalar(`SELECT count(*) FROM public.dobby_sync_members;`),'1');
 assert.equal(scalar(`SELECT count(*) FROM public.dobby_sync_grocery_items;`),'1');
 const activeV1=`INSERT INTO dobby_access_private.authorizations(user_id,status,approved_by) VALUES(${q(id(5))},'active',${q(id(1))});`;
 assert.equal(scalar(activeV1+as(5)+`SELECT count(*) FROM public.dobby_sync_members;`),'1');
 for(const sql of ['SELECT * FROM public.dobby_sync_grocery_items',"UPDATE public.dobby_sync_grocery_items SET title='BLOCKED'",`INSERT INTO public.dobby_sync_grocery_items(id,title) VALUES(${q(id(504))},'BLOCKED')`]) reject(sql,5,activeV1);
 assert.equal(scalar(activeV1+`UPDATE dobby_access_private.authorizations SET status='suspended' WHERE user_id=${q(id(5))};`+as(5)+`SELECT count(*) FROM public.dobby_sync_members;`),'0');
});
test('T06 original default-argument RPC and explicit arity both reject suspension',()=>{
 reject(`SELECT public.dobby_v7_update_profile('{}'::jsonb);`,2,suspend);
 reject(`SELECT public.dobby_v7_update_profile('{}'::jsonb,NULL);`,2,suspend);
});
test('Minimal privileges: browser cannot adopt writer roles or read private receipts',()=>{
 for(const role of ['dobby_access_writer','dobby_socle_writer','dobby_v7_writer','dobby_missions_v2_writer']) clientDenied(`SET ROLE ${role};`);
 denied(as(2)+`SELECT * FROM dobby_socle_private.mission_operations;`);
 denied(as(2)+`SELECT public.dobby_missions_v2_write_legacy_socle(${q(id(101))},11,${q(id(810))},'{}');`);
});

test('T01 cross-household direct UPDATE affects zero rows; cross-household INSERT is rejected',()=>{
 const rows=run(setup()+as(2)+`WITH changed AS (UPDATE public.dobby_v2_grocery SET title='CROSS' WHERE id=${q(id(503))} RETURNING id) SELECT count(*) FROM changed;
 RESET ROLE; SELECT title,revision FROM public.dobby_v2_grocery WHERE id=${q(id(503))}; ROLLBACK;`);
 assert.equal(rows,'0\nTEST H2|1');
 reject(`INSERT INTO public.dobby_v2_grocery(household_id,title) VALUES(${q(id(102))},'CROSS');`);
});
test('Active profile CAS, native family identity and direct grocery stamps remain functional',()=>{
 const out=run(setup()+as(2)+`SELECT public.dobby_v7_update_profile('{"firstName":"Test","lastName":"Fiction"}',7)->>'memberId';
 UPDATE public.dobby_v2_grocery SET title='TEST UPDATED' WHERE id=${q(id(502))};
 SELECT title,revision,updated_by=${q(id(2))} FROM public.dobby_v2_grocery WHERE id=${q(id(502))};
 SELECT public.dobby_v7_context()->>'familyRevision'; ROLLBACK;`);
 assert.equal(out,'TEST_PARENT_B\nTEST UPDATED|2|t\n8');
 const stale=raw(setup()+as(2)+`SELECT public.dobby_v7_update_profile('{"firstName":"Test"}',6);`);
 assert.match(stale.stderr,/ERROR:  40001\b/);
 reject(`SELECT public.dobby_v7_update_profile('{"firstName":"Child"}',9);`,4);
});
test('Household creation consumes explicit quota once, replay retains the same identity',()=>{
 const out=run(setup()+as(6)+`SELECT public.dobby_v7_update_profile('{"firstName":"Test","lastName":"New"}')->>'phase';
 SELECT public.dobby_v7_create_household('TEST H3',${q(id(820))})->>'replayed';
 SELECT public.dobby_v7_create_household('TEST H3',${q(id(820))})->>'replayed';
 RESET ROLE; SELECT can_create_household FROM dobby_access_private.authorizations WHERE user_id=${q(id(6))};
 SELECT count(*) FROM public.dobby_v2_households; SELECT count(*) FROM dobby_v7_private.account_links WHERE user_id=${q(id(6))}; ROLLBACK;`);
 assert.equal(out,'household\nfalse\ntrue\nf\n3\n1');
 reject(`SELECT public.dobby_v7_create_household('NO QUOTA',${q(id(821))});`,6,`UPDATE dobby_access_private.authorizations SET can_create_household=false WHERE user_id=${q(id(6))};`);
});
test('T06 every reproduced public RPC signature refuses suspended direct calls before native code',()=>{
 const calls=[
  'dobby_v7_context()',"dobby_v7_update_profile('{}',NULL)",`dobby_v7_create_household('TEST',${q(id(841))})`,
  `dobby_v7_create_invitation(24,${q(id(842))})`, `dobby_v7_accept_invitation('bad',${q(id(843))})`,
  `dobby_v7_revoke_invitation(${q(id(844))})`,`dobby_v7_bind_existing_member(${q(id(6))},'TEST',${q(id(845))})`,
  `dobby_v7_update_magic('TEST','{}',7,${q(id(846))})`,`dobby_v7_update_member('TEST','{}',7,${q(id(847))})`,
  `dobby_v7_create_child_invitation('TEST',24,${q(id(848))})`,`dobby_v7_accept_child_invitation('bad',${q(id(849))})`,
  `dobby_missions_v2_write(${q(id(101))},11,${q(id(850))},'{}')`,`dobby_missions_v2_capabilities(${q(id(101))})`,
  `dobby_missions_v3_write(${q(id(101))},11,${q(id(851))},'{}')`,`dobby_missions_v3_capabilities(${q(id(101))})`,
 ];
 for(const call of calls) {
  reject('SELECT public.'+call+';',2,suspend);
  reject('SELECT public.'+call+';',3,`DELETE FROM dobby_access_private.authorizations WHERE user_id=${q(id(3))};`);
 }
 for(const call of ['dobby_socle_private.actor_context(NULL,true)','dobby_socle_private.actor_context(NULL,false)',`dobby_v7_private.assert_snapshot(${q(id(101))},'{}','{}')`]) reject('SELECT '+call+';',2,suspend);
 assert.equal(scalar(suspend+as(2)+`SELECT dobby_socle_private.is_parent(${q(id(101))}),dobby_socle_private.can_read(${q(id(101))}),dobby_socle_private.legacy_unlinked();`),'f|f|f');
});
test('T06 authentic V3 receipt path replays for active account, stops before payload on suspension',()=>{
 assert.equal(scalar(receipt+as(2)+replay+`->>'replayed';`),'true');
 reject(replay+';',2,receipt+suspend);
 assert.equal(scalar(as(2)+`SELECT public.dobby_missions_v3_capabilities(${q(id(101))})->>'protocol';`),'3');
});
test('Native invitations preserve receipts; public and foreign-household previews disclose no family',()=>{
 const sql=setup()+as(2)+`SELECT public.dobby_v7_create_invitation(24,${q(id(860))})->>'replayed';
 SELECT public.dobby_v7_create_invitation(24,${q(id(860))})->>'replayed';
 RESET ROLE; SELECT set_config('test.token',dobby_socle_private.invitation_token(${q(id(2))},${q(id(860))}),true) IS NOT NULL;
 SET LOCAL ROLE anon; SET LOCAL request.jwt.claims='{}'; SELECT public.dobby_v7_preview_invitation(current_setting('test.token'));
 ${as(3)} SELECT public.dobby_v7_preview_invitation(current_setting('test.token'));
 ${as(2)} SELECT public.dobby_v7_preview_invitation(current_setting('test.token'))->>'status';
 RESET ROLE; ${suspend} ${as(2)} SELECT public.dobby_v7_preview_invitation(current_setting('test.token'));
 ROLLBACK;`;
 assert.equal(run(sql),'false\ntrue\nt\n{"status": "invalid"}\n{"status": "invalid"}\nvalid\n{"status": "invalid"}');
 reject(`SELECT public.dobby_v7_create_invitation(24,${q(id(860))});`,2,suspend);
});
test('Anonymous capability output consists only of public flags; admission context remains neutral',()=>{
 const lines=exercise(`SET LOCAL ROLE anon; SELECT public.dobby_v7_family_capabilities(); SELECT public.dobby_access_context();`);
 const flags=JSON.parse(lines[0]);
 assert.equal(flags.canonicalIdentity,false);
 assert.ok(Object.values(flags).every(v=>typeof v==='boolean'||typeof v==='number'));
 assert.equal(JSON.parse(lines[1]).status,'unapproved');
});
test('Native parent/child, bound identity and snapshot invariants still reject forbidden edits',()=>{
 reject(`UPDATE public.dobby_v2_modules SET payload='{"familyMembers":[]}' WHERE household_id=${q(id(101))} AND module='family';`);
 const lines=run(setup()+as(4)+`WITH changed AS (UPDATE public.dobby_v2_grocery SET title='CHILD' WHERE id=${q(id(503))} RETURNING id) SELECT count(*) FROM changed;
 RESET ROLE; SELECT title,revision FROM public.dobby_v2_grocery WHERE id=${q(id(503))}; ROLLBACK;`);
 assert.equal(lines,'0\nTEST H2|1');
 reject(`SELECT public.dobby_missions_v2_write(${q(id(102))},0,${q(id(870))},'{}');`,4);
});
test('T01 the generic module policy covers menus, recipes, house and contracts in both households',()=>{
 const seed=`INSERT INTO public.dobby_v2_modules(household_id,module,payload) SELECT h.id,m,'{"test":"FICTIONAL"}'::jsonb FROM public.dobby_v2_households h CROSS JOIN unnest(ARRAY['menus','recipes','house','contracts']) m;`;
 for(const [u,hh] of [[2,101],[3,102]]) {
  const out=run(setup()+seed+as(u)+`SELECT count(*),bool_and(household_id=${q(id(hh))}) FROM public.dobby_v2_modules WHERE module IN ('menus','recipes','house','contracts');
  WITH changed AS (UPDATE public.dobby_v2_modules SET payload='{}' WHERE household_id<>${q(id(hh))} RETURNING household_id) SELECT count(*) FROM changed; ROLLBACK;`);
  assert.equal(out,'4|t\n0');
 }
});
test('Missions gap is material: authorized V2 capabilities reaches the absent private dependency',()=>{
 denied(as(2)+`SELECT public.dobby_missions_v2_capabilities(${q(id(101))});`,'42883');
 assert.equal(scalar(`SELECT to_regprocedure('dobby_runes_private.request_user_id()') IS NULL;`),'t');
 console.log('NON VERIFIED: full authorized Missions V2/V3 graph; real V2 capability call fails 42883 on absent request_user_id(), no stub');
});
