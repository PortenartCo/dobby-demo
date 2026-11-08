import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const implementation = fs.readFileSync(new URL('../family-modules.js', import.meta.url), 'utf8');
const clone = x => JSON.parse(JSON.stringify(x));
const MODULES = ['menus','recipes','missions','house','family','contracts'];
const HH = '00000000-0000-4000-8000-000000000010';

function makeBackend() {
  const rows = new Map();
  const journal = [];
  async function authorized(user, method, path, body) {
    journal.push({user,method,path});
    if (method === 'GET' && path.includes('select=module&limit=1')) return [];
    const params = new URLSearchParams(path.split('?')[1]);
    const household = (params.get('household_id') || '').replace(/^eq\./,'');
    const module = (params.get('module') || '').replace(/^eq\./,'');
    if (method === 'GET') return rows.has(module) ? [clone(rows.get(module))] : [];
    if (method === 'POST') {
      if (!MODULES.includes(body.module) || body.household_id !== HH) throw Error('Invalid household write');
      if (rows.has(body.module)) throw Error('Duplicate module');
      const record = {household_id:HH,module:body.module,payload:clone(body.payload),revision:1};
      rows.set(body.module, record);
      return [clone(record)];
    }
    if (method === 'PATCH') {
      const existing = rows.get(module);
      if (!existing || household !== HH || Number((params.get('revision') || '').replace(/^eq\./,'')) !== existing.revision) {
        return [];
      }
      const next = {...existing,payload:clone(body.payload),revision:existing.revision+1};
      rows.set(module,next);
      return [clone(next)];
    }
    throw Error('Unexpected method ' + method);
  }
  return {rows,journal,authorized};
}

function makeClient(uid, backend, seeded = false) {
  const metadata = new Map();
  let handler, provider, changes = 0, localBackups = 0;
  const st = {
    page:'family',
    planned: seeded ? {
      '2026-11-08-soir':{id:'chicken',people:4,status:'prévu'},
      '2026-11-10-soir':{id:'pasta',people:4,status:'prévu'},
      '2026-11-12-midi':{id:'toast',people:2,status:'prévu'}
    }:{},
    demoInitialized:seeded,
    shopHistory:{},shopFinal:null,shopChoice:{},
    customRecipes:[],tmAdaptations:{},
    autoTasks:[],
    houseItems:[],houseLogs:[],houseDocs:[{id:'pdf-1',name:'warranty'}],
    familyMembers:[],famContacts:[],famLists:[],
    famHealth:[{id:'medical-1',name:'private medical appointment'}],
    familyDocs:[
      ...(seeded?[{id:'contract-1',category:'Contrats',title:'Électricité',provider:'Exemple',attachmentName:'secret.pdf',attachmentType:'application/pdf'}]:[]),
      {id:'health-doc-1',category:'Santé',title:'Document médical'}
    ]
  };
  const api = {
    getContext:() => ({userId:uid,householdId:HH}),
    authorized:(method,path,body) => backend.authorized(uid,method,path,body),
    meta:async key=>metadata.get(key) ?? null,
    putMeta:async(key,value)=>{metadata.set(key,clone(value));},
    esc:String,showMessage:()=>{},repaint:()=>{},openModal:()=>{},
    registerModules:ref=>{provider=ref;}
  };
  const env = {
    st,window:{DobbyFamilyUI:api},
    document:{addEventListener:(type,fn)=>{if(type==='click') handler=fn;}},
    save:()=>{changes++;},render:()=>{},confirm:()=>true,
    localStorage:{setItem:()=>{localBackups++;}},
    setTimeout,clearTimeout,console
  };
  vm.runInNewContext(implementation,env,{filename:'family-modules.js',timeout:2500});
  assert.ok(provider);
  return {
    st,provider,metadata,
    get changes(){return changes;},
    get localBackups(){return localBackups;},
    async action(action,module) {
      const target = {dataset:{fmAction:action,module},closest:()=>target};
      const event = {target,preventDefault(){},stopImmediatePropagation(){}};
      await handler(event);
    }
  };
}

test('two accounts activate all six modules and receive a shared update without exposing health or attachments',async()=>{
  const backend=makeBackend(),a=makeClient('user-a',backend,true),b=makeClient('user-b',backend,false);
  await a.provider.start();
  await b.provider.start();
  for (const name of MODULES) await a.action('activate',name);
  assert.equal(backend.rows.size,6);
  const family=backend.rows.get('family').payload;
  assert.equal(Object.hasOwn(family,'famHealth'),false);
  const house=backend.rows.get('house').payload;
  assert.equal(Object.hasOwn(house,'houseDocs'),false);
  const contract=backend.rows.get('contracts').payload;
  assert.equal(contract.contracts.length,1);
  assert.equal(contract.contracts[0].title,'Électricité');
  assert.equal(Object.hasOwn(contract.contracts[0],'attachmentName'),false);
  assert.equal(JSON.stringify(contract).includes('secret.pdf'),false);
  assert.equal(JSON.stringify(contract).includes('Document médical'),false);
  for (const name of MODULES) await b.action('activate',name);
  assert.ok(b.st.planned['2026-11-08-soir']);
  assert.equal(b.st.familyDocs.find(x=>x.id==='contract-1')?.attachmentName,'');
  assert.equal(b.st.famHealth.length,1);
  assert.match(a.provider.html(),/Retirer les trois repas d’exemple/);
  await a.action('remove-demo','menus');
  assert.equal(Object.keys(a.st.planned).length,0);
  assert.equal(Object.keys(backend.rows.get('menus').payload.planned).length,0);
  assert.equal(backend.rows.get('menus').revision,2);
  assert.ok(a.localBackups > 0);
  await b.provider.sync();
  assert.equal(Object.keys(b.st.planned).length,0);
  a.st.autoTasks.push({key:'f001',title:'Changer le filtre',state:'open',due:'2026-11-20'});
  await a.provider.sync();
  assert.equal(backend.rows.get('missions').revision,2);
  await b.provider.sync();
  assert.equal(b.st.autoTasks.length,1);
  assert.equal(b.st.autoTasks[0].key,'f001');
  assert.match(b.provider.html(),/Partagé · à jour/);
});

test('simultaneous module edits create a conflict, not a lost update',async()=>{
  const backend=makeBackend(),a=makeClient('a',backend),b=makeClient('b',backend);
  await a.provider.start(); await b.provider.start();
  await a.action('activate','missions');await b.action('activate','missions');
  a.st.autoTasks.push({key:'from-a',title:'Premier ajout'});
  b.st.autoTasks.push({key:'from-b',title:'Second ajout'});
  await a.provider.sync();
  await b.provider.sync();
  assert.equal(backend.rows.get('missions').revision,2);
  assert.equal(backend.rows.get('missions').payload.autoTasks[0].key,'from-a');
  assert.match(b.provider.html(),/Conflit à résoudre/);
  await b.action('server','missions');
  assert.equal(b.st.autoTasks[0].key,'from-a');
  assert.equal(backend.rows.get('missions').revision,2);
});

test('missing modules backend does not activate sharing',async()=>{
  const backend=makeBackend();
  backend.authorized=async()=>{const error=Error('Not found');error.status=404;throw error;};
  const c=makeClient('a',backend);
  await c.provider.start();
  assert.doesNotMatch(c.provider.html(),/data-fm-action="activate"/);
});

test('customized or actual meal plans are never offered for automated demo deletion', async() => {
  const backend=makeBackend(), c=makeClient('user-a',backend,true);
  await c.provider.start();
  c.st.planned['2026-11-10-soir']={id:'custom',people:3,status:'prévu'};
  assert.doesNotMatch(c.provider.html(),/Retirer les trois repas d’exemple/);
});
