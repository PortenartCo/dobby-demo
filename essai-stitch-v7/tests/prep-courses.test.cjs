/* PREP-01 uses the real E07 adapter and native family writer. No HTTP requests. */
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'../..'),clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
const adapter=fs.readFileSync(path.join(root,'essai-stitch-v7/cuisine-list.js'),'utf8');
const nativeSource=fs.readFileSync(path.join(root,'essai-stitch-v5-famille/family-v2.js'),'utf8');
const nativeScript=nativeSource.replace(/void boot\(\);\s*\}\)\(\);\s*$/,'window.__nativeTest={f,loadItems};})();');
assert.notEqual(nativeScript,nativeSource,'The harness replaces boot, without replacing the writer');

// Serialize real read/modify/write transactions; callbacks may enqueue writes.
function database(rows=new Map()){
 const waiting=[];let active=false;
 function start(){if(active||!waiting.length)return;active=true;const job=waiting.shift(),before=new Map(rows);let ended=false;
  const pump=()=>queueMicrotask(()=>{if(ended)return;if(job.aborted){ended=true;rows.clear();for(const [k,v]of before)rows.set(k,v);job.tx.onabort?.();active=false;start();return;}
   const next=job.requests.shift();if(!next){ended=true;job.tx.oncomplete?.();active=false;start();return;}
   try{next.req.result=next.run();next.req.onsuccess?.();}catch(error){job.tx.error=error;job.aborted=true;}pump();});pump();
 }
 return {rows,transaction(){const job={requests:[],aborted:false},tx=job.tx={error:null,abort(){job.aborted=true;},objectStore(){
   const request=run=>{const req={};job.requests.push({req,run});return req;};return {
    get:key=>request(()=>clone(rows.get(key))),getAll:()=>request(()=>[...rows.values()].map(clone)),
    put:value=>request(()=>{rows.set(value.storageKey,clone(value));return value.storageKey;})};
  }};waiting.push(job);queueMicrotask(start);return tx;}};
}

function setup(options={}){
 let stored=options.stored??null,saveFailure=false,renderFailure=false;
 const box={window:{addEventListener(){}},console,crypto:options.crypto||webcrypto,TextEncoder,URL,URLSearchParams,queueMicrotask,setInterval:()=>0,
  document:{addEventListener(){},getElementById:()=>null,createElement:()=>({}),body:{append(){}}},
  localStorage:{getItem:()=>stored,setItem:(_key,value)=>{stored=value;},removeItem:()=>{stored=null;}},
  st:{page:'home',extras:[],shopHistory:{},shopFinal:{e072:true,id:'list',items:[],imports:[],meals:[]},preparations:[{id:'event',items:[{id:'one',checked:false}]}]},
  key:'native-test-only',custom:[],drawShop:()=>'',categoryOf:()=> 'Divers',fmt:String,
  save(){if(saveFailure)throw Error('TEST storage full');stored=JSON.stringify(box.st);},
  render(){if(renderFailure)throw Error('TEST render failed');}};
 if(stored)box.st=JSON.parse(stored);
 vm.createContext(box);vm.runInContext(adapter,box);
 const E={read:()=>({state:clone(box.st)}),win:()=>box.window,evaluate:(code,p={})=>{box.p=p;return vm.runInContext('(function(){'+code+'})()',box);}};
 return {box,E,M:box.window.DobbyCuisineList,stored:()=>stored,failSave:value=>{saveFailure=value;},failRender:value=>{renderFailure=value;}};
}
async function shared(options={}){
 const x=setup(options);vm.runInContext(nativeScript,x.box);
 const {f}=x.box.window.__nativeTest;f.core=await import('../../essai-stitch-v5-famille/family-core.mjs');
 f.db=options.db||database();f.ready=true;f.context='user-A|house-A';f.householdId='house-A';f.epoch=1;f.homeSupported=true;f.session={user_id:'user-A'};
 return {...x,f,db:f.db,grocery:x.box.window.DobbyFamilyUI.grocery};
}
const values={name:'Farine',qty:0.5,unit:'kg'},token='prep:event:one';

test('local double click and replay retain one exact quantity, unit and unchecked preparation',async()=>{
 const {M,E,box,stored}=setup();const before=clone(box.st.preparations);
 const receipts=await Promise.all([M.addOnce(E,values,token),M.addOnce(E,values,token)]);
 assert.equal(receipts[0].scope,'local');assert.equal(receipts[0].id,receipts[1].id);assert.equal(receipts[0].pending,false);
 const saved=JSON.parse(stored());assert.equal(saved.shopFinal.items.length,1);assert.equal(saved.shopFinal.items[0].qty,0.5);assert.equal(saved.shopFinal.items[0].unit,'kg');assert.equal(saved.shopFinal.items[0].done,false);
 assert.deepEqual(saved.preparations,before);assert.equal((await M.addOnce(E,{...values,qty:9},token)).id,receipts[0].id);assert.equal(box.st.shopFinal.items[0].qty,0.5,'replay does not replace later values');
 const reloaded=setup({stored:stored()});assert.equal((await reloaded.M.addOnce(reloaded.E,values,token)).id,receipts[0].id);assert.equal(reloaded.box.st.shopFinal.items.length,1);
});
test('local deletion and archived receipts suppress resurrection after a fresh list',async()=>{
 const {M,E,box}=setup();const receipt=await M.addOnce(E,values,token);
 await M.remove(E,receipt.id);await M.addOnce(E,values,token);assert.equal(box.st.shopFinal.items.length,0);
 const second=await M.addOnce(E,{name:'Pain',qty:null,unit:''},'prep:event:two');await M.check(E,second.id,true);await M.archive(E);
 box.st.shopFinal=null;const replay=await M.addOnce(E,{name:'Pain',qty:null,unit:''},'prep:event:two');assert.equal(replay.id,second.id);assert.equal(replay.archived,true);assert.equal(box.st.shopFinal.items.length,0);
});
test('local persistence or render failure rolls back both native row and receipt',async()=>{
 for(const fresh of [false,true])for(const phase of ['failSave','failRender']){const x=setup();if(fresh)x.box.st.shopFinal=null;x.box.save();const before=x.stored();x[phase](true);
  await assert.rejects(x.M.addOnce(x.E,values,token),/TEST/);assert.equal(x.stored(),before);assert.equal(JSON.stringify(x.box.st),before);
  x[phase](false);await x.M.addOnce(x.E,values,token);assert.equal(x.box.st.shopFinal.items.length,1);
 }
});
test('a local save without a durable receipt cannot report success',async()=>{
 const x=setup();x.box.save();const before=x.stored();x.box.save=()=>{};
 await assert.rejects(x.M.addOnce(x.E,values,token),/confirmé/);assert.equal(x.stored(),before);assert.equal(x.box.st.shopFinal.items.length,0);
});
test('shared offline queue survives cache reload and never writes a local fallback',async()=>{
 const {M,E,box,f,db}=await shared();const before=clone(box.st);
 const [first,second]=await Promise.all([M.addOnce(E,values,token),M.addOnce(E,values,token)]);
 assert.equal(first.shared,true);assert.equal(first.pending,true);assert.equal(first.conflict,false);assert.equal(first.id,second.id);assert.equal(db.rows.size,1);
 const row=[...db.rows.values()][0];assert.equal(row.quantity,0.5);assert.equal(row.unit,'kg');assert.equal(row.checked,false);assert.deepEqual(clone(box.st),before);
 f.cache.clear();await box.window.__nativeTest.loadItems();assert.equal((await M.addOnce(E,values,token)).id,first.id);assert.equal(db.rows.size,1);
});
test('shared persisted tombstones and conflict receipts survive a stale client cache',async()=>{
 const db=database(),a=await shared({db}),b=await shared({db});const first=await a.M.addOnce(a.E,values,token);
 const key=a.f.context+'|'+first.id,row=db.rows.get(key);db.rows.set(key,{...row,checked:true,deleted_at:'2026-11-12T10:00:00Z',syncState:'clean',quantity:7});
 const tombstone=await b.M.addOnce(b.E,values,token);assert.equal(tombstone.id,first.id);assert.equal(tombstone.archived,true);assert.equal(tombstone.checked,true);assert.equal(db.rows.get(key).quantity,7);assert.equal(db.rows.size,1);
 db.rows.set(key,{...db.rows.get(key),deleted_at:null,syncState:'conflict'});const conflict=await b.M.addOnce(b.E,values,token);assert.equal(conflict.conflict,true);assert.equal(conflict.pending,false);assert.equal(db.rows.get(key).quantity,7);
});
test('native import rejects a scope switch during the deterministic hash without a write',async()=>{
 let resume;const hashing={randomUUID:()=>webcrypto.randomUUID(),subtle:{digest:(...args)=>new Promise(resolve=>{resume=async()=>resolve(await webcrypto.subtle.digest(...args));})}};
 const {grocery,f,db}=await shared({crypto:hashing});const promise=grocery.importRows([{...values,qty:values.qty,token}],f.context);
 assert.equal(typeof resume,'function');f.context='user-B|house-B';f.householdId='house-B';f.epoch++;await resume();await assert.rejects(promise,/foyer.*chang/i);assert.equal(db.rows.size,0);
});
test('native numeric import API stays compatible and addOnce rejects precision loss',async()=>{
 const {grocery,M,E,f,db}=await shared();assert.equal(await grocery.importRows([{name:'Lait',qty:null,unit:'',token:'legacy'}],f.context),1);assert.equal(await grocery.importRows([{name:'Lait',qty:null,unit:'',token:'legacy'}],f.context),0);
 await assert.rejects(M.addOnce(E,{name:'Épices',qty:0.125,unit:'kg'},'prep:event:precise'),/précision|décimal/i);assert.equal(db.rows.size,1);
});
test('equal product names from distinct source items retain both quantities',async()=>{
 for(const x of [setup(),await shared()]){const first=await x.M.addOnce(x.E,values,token),second=await x.M.addOnce(x.E,{...values,qty:2},'prep:event:two');
  assert.notEqual(first.id,second.id);const items=x.M.snapshot(x.E).items;assert.equal(items.reduce((sum,row)=>sum+row.qty*(row.unit==='g'?0.001:1),0),2.5);
 }
});
