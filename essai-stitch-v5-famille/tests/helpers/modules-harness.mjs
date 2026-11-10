import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as runes from '../../family-runes-core.mjs';
const implementation = fs.readFileSync(new URL('../../family-modules.js', import.meta.url), 'utf8');
const clone = x => JSON.parse(JSON.stringify(x));
const MODULES = ['menus','recipes','missions','house','family','contracts'];
export const HH = '00000000-0000-4000-8000-000000000010';

export function makeBackend() {
  const rows = new Map();
  const journal = [];
  async function authorized(user, method, path, body) {
    journal.push({user,method,path});
    if (method === 'GET' && path.includes('select=module&limit=1')) return [];
    const params = new URLSearchParams(path.split('?')[1]);
    const household = (params.get('household_id') || '').replace(/^eq\./,'');
    const module = (params.get('module') || '').replace(/^eq\./,'');
    if (method === 'GET' && !params.has('module'))
      return [...rows.values()].map(row => ({module:row.module}));
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

export function makeClient(uid, backend, seeded = false, accept = true, options = {}) {
  const metadata = new Map(options.metadata||[]);
  let handler, provider, changes = 0, localBackups = 0;
  const prompts = [];
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
    autoTasks:[],manualMissions:[],
    houseItems:[],houseLogs:[],houseDocs:[{id:'pdf-1',name:'warranty'}],
    familyMembers:[],famContacts:[],famLists:[],familyEvents:[],sharedHealthVisits:[],
    famHealth:[{id:'medical-1',name:'private medical appointment'}],
    familyDocs:[
      ...(seeded?[{id:'contract-1',category:'Contrats',title:'Électricité',provider:'Exemple',attachmentName:'secret.pdf',attachmentType:'application/pdf'}]:[]),
      {id:'health-doc-1',category:'Santé',title:'Document médical'}
    ]
  };
  Object.assign(st,options.state||{});
  const api = {
    getContext:() => ({userId:uid,householdId:HH}),
    authorized:(method,path,body) => backend.authorized(uid,method,path,body),
    meta:async key=>metadata.get(key) ?? null,
    putMeta:async(key,value)=>{metadata.set(key,clone(value));},
    esc:String,showMessage:()=>{},repaint:()=>{},openModal:()=>{},
    registerModules:ref=>{provider=ref;}
  };
  const env = {
    st, custom:st.customRecipes, window:{DobbyFamilyUI:api,DobbyRunesReady:Promise.resolve(runes)},
    document:{addEventListener:(type,fn)=>{if(type==='click') handler=fn;}},
    save:()=>{changes++;},render:()=>{},confirm:(msg)=>{prompts.push(msg);return accept;},
    localStorage:{setItem:()=>{localBackups++;}},
    setTimeout,clearTimeout,console
  };
  vm.runInNewContext(implementation,env,{filename:'family-modules.js',timeout:2500});
  assert.ok(provider);
  return {
    st,provider,metadata,prompts,
    get changes(){return changes;},
    get localBackups(){return localBackups;},
    async action(action,module) {
      const target = {dataset:{fmAction:action,module},closest:()=>target};
      const event = {target,preventDefault(){},stopImmediatePropagation(){}};
      await handler(event);
    }
  };
}

