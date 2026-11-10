import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
const url=new URL('../onboarding-drafts.mjs',import.meta.url),api=fs.existsSync(url)?await import(url):null;
let metadataQueue=Promise.resolve();function make(options){return api.createDrafts({...options,updateMeta:(key,change)=>{const work=metadataQueue.then(async()=>{const value=change(await options.meta(key));await options.putMeta(key,value);return value;});metadataQueue=work.catch(()=>{});return work;}});}

test('E06 draft resume keeps stable answer IDs and isolates members, users and households',async()=>{
 assert.ok(api,'Native-meta draft adapter exists');const db=new Map();let context={user:'u',household:'h',epoch:1};const options={context:()=>context,meta:async k=>db.get(k),putMeta:async(k,v)=>db.set(k,structuredClone(v))};const a=make(options);await a.load('one');await a.update(d=>{d.house=['A','B'];d.step='onboarding-house';d.index=1;});assert.equal((await a.resume()).memberId,'one');await a.load('two');assert.deepEqual(a.read().house,[]);await a.load('one');assert.deepEqual(a.read().house,['A','B']);const reloaded=make(options);await reloaded.load('one');assert.equal(reloaded.read().index,1);context={...context,user:'other',epoch:2};assert.throws(()=>a.guard(),/contexte/i);await reloaded.load('one');assert.deepEqual(reloaded.read().house,[]);context={...context,household:'other'};await reloaded.load('one');assert.deepEqual(reloaded.read().house,[]);
});
test('E06 failed metadata saves preserve the last draft and foreign/incompatible records are not overwritten',async()=>{
 assert.ok(api,'Native-meta draft adapter exists');let stored=null,deny=false;const a=make({context:()=>({user:'local',household:'local',epoch:0}),meta:async()=>stored,putMeta:async(k,v)=>{if(deny)throw Error('TEST quota');stored=structuredClone(v);}});await a.load(null);await a.update(d=>d.house=['A']);deny=true;await assert.rejects(a.update(d=>d.house.push('B')),/quota/);assert.deepEqual(a.read().house,['A']);deny=false;stored={version:99,owner:{user:'local',household:'local'}};await assert.rejects(a.load(null),/incompatible/i);assert.equal(stored.version,99);
});
test('a delayed draft write cannot replace the active draft after switching member',async()=>{
 assert.ok(api);const db=new Map();let release,startedResolve;const started=new Promise(r=>startedResolve=r);const a=make({context:()=>({user:'u',household:'h',epoch:1}),meta:async k=>db.get(k),putMeta:async(k,v)=>{await new Promise(r=>{release=r;startedResolve();});db.set(k,structuredClone(v));}});await a.load('one');const pending=a.update(d=>{d.house=['D'];});const rejected=assert.rejects(pending,/membre|contexte/i);await started;await a.load('two');release();await rejected;assert.deepEqual(a.read().house,[]);
});

test('two loaded instances cannot erase drafts of distinct members',async()=>{
 const db=new Map(),options={context:()=>({user:'u',household:'h',epoch:1}),meta:async k=>db.get(k),putMeta:async(k,v)=>db.set(k,structuredClone(v))};const a=make(options),b=make(options);await a.load('one');await b.load('two');await a.update(d=>d.house=['A']);await b.update(d=>d.house=['B']);await a.load('one');assert.deepEqual(a.read().house,['A']);
});
