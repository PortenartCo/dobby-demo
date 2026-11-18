import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {start,stop,run,raw,prepare,interactive,as,id,q} from './local-db.mjs';
before(()=>{start();run(prepare()+'COMMIT;');});
after(()=>stop());
const change=(status,revision,op)=>`SELECT public.dobby_access_set_status(${q(id(2))},${q(status)},${revision},${q(id(op))},true);`;
const active=sid=>run(`BEGIN;${as(2,sid)} SELECT dobby_access_private.is_active(); ROLLBACK;`);

test('reactivation boundary is established after commit, never during the suspended interval',async()=>{
 run(`BEGIN;${as(1)}${change('suspended',1,920)}COMMIT;`);
 const owner=interactive();let ended=false;
 try {
  owner.send(`BEGIN;${as(1)}${change('active',2,921)}SELECT 'REACTIVATION_PAUSED';`);
  await owner.waitFor('REACTIVATION_PAUSED');
  assert.equal(run(`SELECT status FROM dobby_access_private.authorizations WHERE user_id=${q(id(2))};`),'suspended');
  run(`INSERT INTO auth.sessions(id,user_id,created_at) VALUES(${q(id(2002))},${q(id(2))},clock_timestamp());`);
  const result=await owner.finish('COMMIT;');ended=true;assert.equal(result.code,0,result.errors);
  assert.equal(active(2002),'f','A session created before the reactivation commit must stay ineligible');
  const sameTransaction=raw(`BEGIN;${as(1)}${change('suspended',3,922)}${change('active',4,923)}
  SELECT public.dobby_access_finalize_reactivation(${q(id(2))},5);ROLLBACK;`);
  assert.notEqual(sameTransaction.status,0);assert.match(sameTransaction.stderr,/ERROR:  55000\b/);
  run(`BEGIN;${as(1)}SELECT public.dobby_access_finalize_reactivation(${q(id(2))},3);COMMIT;`);
  assert.equal(active(1002),'f');assert.equal(active(2002),'f');
  run(`INSERT INTO auth.sessions(id,user_id,created_at) VALUES(${q(id(3002))},${q(id(2))},clock_timestamp());`);
  assert.equal(active(3002),'t');
  const cutoff=run(`SELECT sessions_valid_after FROM dobby_access_private.authorizations WHERE user_id=${q(id(2))};`);
  run(`BEGIN;${as(1)}SELECT public.dobby_access_finalize_reactivation(${q(id(2))},3);COMMIT;`);
  assert.equal(run(`SELECT sessions_valid_after FROM dobby_access_private.authorizations WHERE user_id=${q(id(2))};`),cutoff,'Retry must not revoke the newly eligible session');
 } finally {if(!ended)await owner.finish();}
});
