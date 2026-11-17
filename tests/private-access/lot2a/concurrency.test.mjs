import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { catalog, apply } from './catalog.mjs';
import { stop, run, raw, as, id, q, prepare, interactive } from '../local-db.mjs';

before(()=>{catalog();apply();run(prepare()+'COMMIT;');});
after(stop);
async function waiting(name) {
 const deadline=Date.now()+8000;
 while(Date.now()<deadline) {
  if(run(`SELECT count(*) FROM pg_stat_activity WHERE application_name=${q(name)} AND wait_event_type='Lock';`)==='1') return;
  await new Promise(r=>setTimeout(r,30));
 }
 assert.fail('Expected a PostgreSQL lock wait for '+name);
}
let sequence=9000;
// Browser cannot SELECT the authorization registry: revisions are supplied by
// the fictional test's trusted setup, exactly as a future bounded owner API will.
function status(status) {
 const revision=run(`SELECT revision FROM dobby_access_private.authorizations WHERE user_id=${q(id(2))};`);
 return as(1)+`SELECT public.dobby_access_set_status(${q(id(2))},${q(status)},${revision},${q(id(++sequence))},true);`;
}
function renew() {
 run('BEGIN;'+status('active')+'COMMIT;');
 const revision=run(`SELECT revision FROM dobby_access_private.authorizations WHERE user_id=${q(id(2))};`);
 run('BEGIN;'+as(1)+`SELECT public.dobby_access_finalize_reactivation(${q(id(2))},${revision}); COMMIT;`);
 const session=++sequence+6000;
 run(`INSERT INTO auth.sessions(id,user_id,created_at) VALUES(${q(id(session))},${q(id(2))},clock_timestamp());`);
 return session;
}
function value() {return run(`SELECT title,revision FROM public.dobby_v2_grocery WHERE id=${q(id(502))};`);}
function write(kind,session,label) {
 return as(2,session)+(kind==='RPC'
  ? `SELECT public.dobby_v7_update_profile('{"firstName":${JSON.stringify(label)}}',(SELECT revision FROM public.dobby_v2_modules WHERE household_id=${q(id(101))} AND module='family'));`
  : `UPDATE public.dobby_v2_grocery SET title=${q(label)} WHERE id=${q(id(502))};`);
}
for(const kind of ['RPC','DIRECT UPDATE']) test(`T07 ${kind}: writer-first commits before suspension; suspension-first prevents mutation`,async()=>{
 let session=kind==='RPC'?1002:renew();
 const profile=()=>run(`SELECT e->>'firstName',m.revision FROM public.dobby_v2_modules m CROSS JOIN LATERAL jsonb_array_elements(m.payload->'familyMembers') e WHERE household_id=${q(id(101))} AND module='family' AND e->>'id'='TEST_PARENT_B';`);
 const initial=kind==='RPC'?profile():value();
 const writer=interactive(),suspender=interactive();
 try {
  writer.send(`SET application_name='lot2a-writer'; BEGIN;`+write(kind,session,'TEST BEFORE')+`\n\\echo WRITER_LOCKED`);
  await writer.waitFor('WRITER_LOCKED');
  suspender.send(`SET application_name='lot2a-suspender'; BEGIN;`+status('suspended')+`\n\\echo SUSPENDED`);
  await waiting('lot2a-suspender');
  assert.equal((await writer.finish('COMMIT;')).code,0);
  const committed=kind==='RPC'?profile():value();
  assert.equal(committed,`TEST BEFORE|${Number(initial.split('|')[1])+1}`,'Writer-first must really mutate its target and increment the native revision');
  await suspender.waitFor('SUSPENDED');
  assert.equal((await suspender.finish('COMMIT;')).code,0);
 } finally {await writer.finish();await suspender.finish();}
 const before=value();
 const old=raw('BEGIN;'+write(kind,session,'SHOULD NOT EXIST')+'COMMIT;');
 assert.match(old.stderr,/ERROR:  42501\b/);
 assert.equal(value(),before);
 session=renew();
 // Old sessions stay denied after reactivation even though status is active.
 const stale=raw('BEGIN;'+write(kind,1002,'STALE SESSION')+'COMMIT;');
 assert.match(stale.stderr,/ERROR:  42501\b/);
 const first=interactive(),late=interactive();
 const familyBefore=run(`SELECT payload,revision FROM public.dobby_v2_modules WHERE household_id=${q(id(101))} AND module='family';`);
 try {
  first.send(`SET application_name='lot2a-suspender-first'; BEGIN;`+status('suspended')+`\n\\echo STATUS_PENDING`);
  await first.waitFor('STATUS_PENDING');
  late.send(`SET application_name='lot2a-late-writer'; BEGIN;`+write(kind,session,'SHOULD NOT EXIST')+`\n\\echo LATE_WRITE`);
  await waiting('lot2a-late-writer');
  assert.equal((await first.finish('COMMIT;')).code,0);
  const result=await late.finish('COMMIT;');
  assert.notEqual(result.code,0);assert.match(result.errors,/42501|Authorization changed/);
 } finally {await first.finish();await late.finish();}
 assert.equal(value(),before);
 assert.equal(run(`SELECT payload,revision FROM public.dobby_v2_modules WHERE household_id=${q(id(101))} AND module='family';`),familyBefore);
 console.log(`T07 ${kind}: observed Lock waits in both orders; post-suspension rows/revisions unchanged`);
});
test('T07 direct snapshot validator locks authorization before its native membership lock',async()=>{
 const session=renew();
 const validator=interactive(),suspender=interactive();
 try {
  validator.send(`SET application_name='lot2a-validator'; BEGIN;`+as(2,session)+`
  SELECT dobby_v7_private.assert_snapshot(${q(id(101))},
   (SELECT payload FROM public.dobby_v2_modules WHERE household_id=${q(id(101))} AND module='family'),
   (SELECT payload FROM public.dobby_v2_modules WHERE household_id=${q(id(101))} AND module='family'));
  \\echo VALIDATOR_LOCKED`);
  await validator.waitFor('VALIDATOR_LOCKED');
  suspender.send(`SET application_name='lot2a-validator-suspender'; BEGIN;`+status('suspended')+`\n\\echo SUSPENDED`);
  await waiting('lot2a-validator-suspender');
  assert.equal((await validator.finish('COMMIT;')).code,0);
  await suspender.waitFor('SUSPENDED');
  assert.equal((await suspender.finish('COMMIT;')).code,0);
 } finally {await validator.finish();await suspender.finish();}
 console.log('T07 direct assert_snapshot: suspension observed waiting for authorization before native membership lock release');
});
