import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as runes from '../family-runes-core.mjs';

const bridge = fs.readFileSync(new URL('../family-v2.js', import.meta.url), 'utf8');
const modules = fs.readFileSync(new URL('../family-modules.js', import.meta.url), 'utf8');
const script = bridge.replace(
  /void boot\(\);\s*\}\)\(\);\s*$/,
  'window.__dobbyResumeTest = { f, requireHousehold, restoreCachedHousehold };})();'
);
assert.notEqual(script, bridge, 'A test hook must replace the real boot call');

function fakeDb(metaRows) {
  return {
    transaction(storeName) {
      const tx = { oncomplete:null, onerror:null, onabort:null };
      const getStore = () => {
        const backing = storeName === 'meta' ? metaRows : new Map();
        const request = producer => {
          const req = { result:undefined, error:null, onsuccess:null, onerror:null };
          queueMicrotask(() => {
            try {
              req.result = producer();
              req.onsuccess?.();
              tx.oncomplete?.();
            } catch(error) {
              req.error=error;
              req.onerror?.();
              tx.onerror?.();
            }
          });
          return req;
        };
        return {
          get: key => request(() => backing.get(key)),
          getAll: () => request(() => [...backing.values()]),
          put: value => request(() => {backing.set(value.id,value);return value.id;}),
          delete: key => request(() => {backing.delete(key);return undefined;})
        };
      };
      tx.objectStore = getStore;
      return tx;
    }
  };
}
function environment() {
  const userId = '00000000-0000-4000-8000-000000000001';
  const hh = '00000000-0000-4000-8000-000000000010';
  const requests = [];
  let modulesStatus = 200;
  const metaRows=new Map([
    ['verifiedContext',{id:'verifiedContext',value:userId+'|'+hh}],
    ['deviceHouseholdId',{id:'deviceHouseholdId',value:hh}]
  ]);
  const sandbox = {
    st: {page:'home',extraPage:'',planned:{},shopHistory:{},shopFinal:null,shopChoice:{},
      customRecipes:[],tmAdaptations:{},autoTasks:[],houseItems:[],houseLogs:[],
      familyMembers:[],famContacts:[],famLists:[],familyDocs:[],famHealth:[]},
    custom:[],save:()=>{},drawShop:()=>'',render:()=>{},
    queueMicrotask, setInterval:()=>1,clearInterval:()=>{},setTimeout,clearTimeout,
    confirm:()=>true, URL,URLSearchParams,console,
    localStorage:{getItem:()=>null,setItem:()=>{}},
    window:{addEventListener:()=>{},DobbyRunesReady:Promise.resolve(runes)},
    document:{
      addEventListener:()=>{},getElementById:()=>null,
      createElement:()=>({id:'',hidden:false,innerHTML:''}),
      body:{append:()=>{}}
    },
    fetch:async url => {
      const full = String(url);
      requests.push(full);
      let status=200,body=[];
      if (full.includes('/dobby_v2_memberships?')) body=[{household_id:hh}];
      else if(full.includes('/dobby_v2_households?'))body=[{id:hh}];
      else if(full.includes('/dobby_v2_modules?')) {
        status=modulesStatus;
        body=status===200 ? [] : {message:'Module data temporarily unavailable'};
      } else throw Error('Unexpected endpoint: '+full);
      return {ok:status===200,status,text:async()=>JSON.stringify(body)};
    }
  };
  vm.runInNewContext(script,sandbox,{filename:'family-v2.js'});
  vm.runInNewContext(modules,sandbox,{filename:'family-modules.js'});
  const internals=sandbox.window.__dobbyResumeTest;
  internals.f.ready=true;
  internals.f.db=fakeDb(metaRows);
  internals.f.key='sb_publishable_dummy_test_only';
  internals.f.session={user_id:userId,access_token:'test-token',
    refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600};
  return {internals,requests,
    blockModules:code=>{modulesStatus=code;}};
}

test('cached household reinitializes family modules after membership check',async()=>{
  const {internals,requests}=environment();
  await internals.restoreCachedHousehold();
  assert.match(internals.f.provider.html(),/Initialisation du foyer/);
  await internals.requireHousehold();
  const page=internals.f.provider.html();
  assert.match(page,/Activer les 6 modules du foyer/);
  assert.match(page,/Partage désactivé/);
  assert.doesNotMatch(page,/Foyer non connecté/);
  assert.doesNotMatch(page,/Impossible de joindre les modules familiaux/);
  assert.equal(requests.filter(x=>x.includes('dobby_v2_modules?')).length,1);
  await internals.requireHousehold();
  assert.equal(requests.filter(x=>x.includes('dobby_v2_modules?')).length,1,
    'Successful module startup should be idempotent');
});

test('module API unavailability does not masquerade as disconnected household and retries',async()=>{
  const {internals,blockModules,requests}=environment();
  await internals.restoreCachedHousehold();
  blockModules(503);
  await internals.requireHousehold();
  const blocked=internals.f.provider.html();
  assert.match(blocked,/Erreur HTTP 503/);
  assert.match(blocked,/Données locales \(non synchronisées\)/);
  assert.doesNotMatch(blocked,/Foyer non connecté/);
  blockModules(200);
  await internals.requireHousehold();
  assert.match(internals.f.provider.html(),/Activer les 6 modules du foyer/);
  assert.equal(requests.filter(x=>x.includes('dobby_v2_modules?')).length,2);
});
