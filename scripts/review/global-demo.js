/* Browser-only HTTP boundary. Native application writers remain unchanged. */
(()=>{'use strict';
if(window.DobbyGlobalDemo)return;
const prefix='dobby-review-v7-global-20261112|',backendKey=prefix+'backend-v1',project='https://dobby-global-demo.invalid';
const client=new URLSearchParams(top.location.search).get('client')==='B'?'B':'A',household='00000000-0000-4000-8000-000000000010',user='00000000-0000-4000-8000-00000000000'+(client==='A'?'1':'2');
const publishable='sb_publishable_global_simulation_only_123456789',appKey='dobby-v5-familial-preview-20261108',raw=Storage.prototype.__reviewRaw;
if(!raw||!window.DobbyReview)throw Error('Global simulation requires the isolated review runtime.');
const resetKey=prefix+'reset-in-progress';let initializedGeneration=null,reloadRequested=false;
function clearReviewStorage(storage,keep=new Set()){
 const keys=Array.from({length:raw.length.call(storage)},(_,index)=>raw.key.call(storage,index));
 for(const key of keys)if(key?.startsWith(prefix)&&!keep.has(key))raw.removeItem.call(storage,key);
}
function resetPending(){
 if(raw.getItem.call(localStorage,resetKey))return true;
 if(initializedGeneration===null)return false;
 const stored=raw.getItem.call(localStorage,backendKey);return!stored||JSON.parse(stored).generation!==initializedGeneration;
}
// Stop old documents from recreating deleted databases or saving stale timers
// while the reset transaction closes native connections and reloads every tab.
const scopedSet=Storage.prototype.setItem,scopedRemove=Storage.prototype.removeItem,scopedClear=Storage.prototype.clear,scopedOpen=indexedDB.open.bind(indexedDB);
Storage.prototype.setItem=function(...args){if(resetPending())throw Error('Réinitialisation de cet essai en cours.');return scopedSet.apply(this,args);};
Storage.prototype.removeItem=function(...args){if(resetPending())throw Error('Réinitialisation de cet essai en cours.');return scopedRemove.apply(this,args);};
Storage.prototype.clear=function(...args){if(resetPending())throw Error('Réinitialisation de cet essai en cours.');return scopedClear.apply(this,args);};
indexedDB.open=(...args)=>{if(resetPending())throw Error('Réinitialisation de cet essai en cours.');return scopedOpen(...args);};
const clone=value=>JSON.parse(JSON.stringify(value)),canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const digest=value=>JSON.stringify(canonical(value)),today=()=>new Date().toLocaleDateString('en-CA');
const definitions={menus:['planned','shopHistory','shopFinal','shopChoice'],recipes:['customRecipes','tmAdaptations'],missions:['autoTasks','manualMissions','runeCredits'],house:['houseItems','houseLogs'],family:['familyMembers','famContacts','famLists','familyEvents','sharedHealthVisits','sharedFamilyNotes']};
function seed(){
 const initial=window.DobbyReviewConfig.initialState(today()),modules={};
 for(const [module,keys]of Object.entries(definitions)){const payload={};for(const key of keys)payload[key]=clone(initial[key]??[]);if(module==='missions')payload.runeLedgerVersion=1;if(module==='family')payload.familyNotesVersion=1;modules[module]={household_id:household,module,payload,revision:1,updated_at:new Date().toISOString()};}
 modules.contracts={household_id:household,module:'contracts',payload:{contracts:clone(initial.familyDocs)},revision:1,updated_at:new Date().toISOString()};
 return{version:1,generation:1,modules,grocery:[{id:'00000000-0000-4000-8000-000000000100',household_id:household,title:'Carottes',quantity:500,unit:'g',at_home_quantity:0,checked:false,deleted_at:null,import_source_id:null,created_at:'2026-11-12T00:00:00.000Z',updated_at:'2026-11-12T00:00:00.000Z',revision:1}],operations:{},requests:[]};
}
const read=()=>{const stored=raw.getItem.call(localStorage,backendKey);return stored?JSON.parse(stored):seed();},write=state=>raw.setItem.call(localStorage,backendKey,JSON.stringify(state));
const withBackendLock=task=>navigator.locks?.request?navigator.locks.request(backendKey,task):Promise.reject(Error('Simulation A/B indisponible : utilisez localhost ou HTTPS avec Web Locks.'));
const locked=task=>withBackendLock(()=>{if(resetPending())throw Error('Réinitialisation de cet essai en cours.');return task();});
const ready=withBackendLock(async()=>{
 // An active owner finishes before this lock is acquired. A remaining marker
 // therefore belongs to an interrupted document; resume its isolated cleanup.
 const token=raw.getItem.call(localStorage,resetKey);
 if(token){prepareReset(token);channel?.postMessage({type:'prepare',token});const generation=await clearResetStorage();channel?.postMessage({type:'complete',token,generation});}
 if(!raw.getItem.call(localStorage,backendKey))write(seed());
}).then(()=>new Promise((resolve,reject)=>{
 initializedGeneration=read().generation;
 const req=indexedDB.open('dobby-v5-household-preview-v2',1);
 req.onupgradeneeded=()=>{for(const [name,keyPath]of [['items','storageKey'],['meta','id']])if(!req.result.objectStoreNames.contains(name))req.result.createObjectStore(name,{keyPath});};
 req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Fermez les anciens onglets de cette simulation.'));
 req.onsuccess=()=>{const db=req.result,tx=db.transaction(['meta','items'],'readwrite'),state=read(),generation=String(state.generation);
  if(localStorage.getItem('globalFixtureGeneration')!==generation){
   tx.objectStore('items').clear();tx.objectStore('meta').clear();
   const initial=window.DobbyReviewConfig.initialState(today());
   for(const [id,row]of Object.entries(state.modules)){
    if(id==='contracts')initial.familyDocs=clone(row.payload.contracts);
    else for(const key of definitions[id]||[])if(Object.hasOwn(row.payload,key))initial[key]=clone(row.payload[key]);
   }
   localStorage.setItem(appKey,JSON.stringify(initial));
   localStorage.removeItem('reviewActiveMemberId');sessionStorage.removeItem('globalFixtureOffline');
   const modules={};for(const [id,row]of Object.entries(state.modules))modules[id]={active:true,revision:row.revision,synced:id==='missions'||id==='family'?digest(row.payload):JSON.stringify(row.payload),conflict:false,...(id==='missions'?{runeProtocol:true}:id==='family'?{familyProtocol:true}:{})};
   tx.objectStore('meta').put({id:'v2-module-state:'+user+'|'+household,value:modules});
  }
  const metadata={publicKey:publishable,session:{access_token:'fictional-global-'+client,refresh_token:'fictional-global-refresh-'+client,user_id:user,email:'client-'+client.toLowerCase()+'@fictional.example.test',expires_at:Math.floor(Date.now()/1000)+86400},verifiedContext:user+'|'+household,deviceHouseholdId:household};
  for(const [id,value]of Object.entries(metadata))tx.objectStore('meta').put({id,value});
  tx.oncomplete=()=>{localStorage.setItem('globalFixtureGeneration',generation);db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(tx.error||Error('Fictional session initialization failed.'));};
 };
}));
const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','X-Dobby-Simulation':'browser-only'}}),denied=()=>respond({message:'Requête hors du foyer fictif de cette simulation.'},403);
const nativeFetch=window.fetch.bind(window),runesReady=import(new URL('essai-stitch-v5-famille/family-runes-core.mjs',DobbyReview.root).href);
const sha256=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),byte=>byte.toString(16).padStart(2,'0')).join('');
window.fetch=async(input,options={})=>{
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);
 const paths=new Set(['/auth/v1/token','/auth/v1/logout','/rest/v1/dobby_v2_memberships','/rest/v1/dobby_v2_households','/rest/v1/dobby_v2_grocery','/rest/v1/dobby_v2_modules','/rest/v1/rpc/dobby_missions_v2_capabilities','/rest/v1/rpc/dobby_missions_v2_write']);
 if(url.origin!==project||!paths.has(url.pathname))return nativeFetch(input,options);
 await ready;if(resetPending())throw Error('Réinitialisation de cet essai en cours.');if(sessionStorage.getItem('globalFixtureOffline')==='true')throw Error('Simulation hors ligne : modification conservée sur ce client.');
 const method=String(options.method||input?.method||'GET').toUpperCase(),headers=new Headers(options.headers||input?.headers);
 if(headers.get('apikey')!==publishable)return denied();
 if(url.pathname==='/auth/v1/token'&&method==='POST'&&url.searchParams.get('grant_type')==='refresh_token')return respond({access_token:'fictional-global-'+client,refresh_token:'fictional-global-refresh-'+client,expires_in:86400,user:{id:user,email:'client-'+client.toLowerCase()+'@fictional.example.test'}});
 if(headers.get('Authorization')!=='Bearer fictional-global-'+client)return denied();
 if(url.pathname==='/auth/v1/logout'&&method==='POST')return respond({});
 if(url.pathname==='/rest/v1/dobby_v2_memberships'&&method==='GET')return url.searchParams.get('user_id')==='eq.'+user?respond([{household_id:household,user_id:user,active:true}]):denied();
 if(url.pathname==='/rest/v1/dobby_v2_households'&&method==='GET')return url.searchParams.get('id')==='eq.'+household?respond([{id:household}]):denied();
 const body=options.body===undefined?null:JSON.parse(options.body);
 if(url.pathname.startsWith('/rest/v1/rpc/')){
  if(url.pathname.endsWith('/dobby_missions_v2_capabilities')&&method==='GET')return url.searchParams.get('p_household_id')===household?respond({protocol:2,directWritesBlocked:true,maxPayloadBytes:262144,ledgerVersions:[1,2]}):denied();
  if(!url.pathname.endsWith('/dobby_missions_v2_write')||method!=='POST'||body?.p_household_id!==household)return denied();
  return locked(async()=>{
   const state=read(),row=state.modules.missions,operationId=body.p_operation_id,payload=body.p_payload;
   if(typeof operationId!=='string'||!operationId||!payload||!Array.isArray(payload.manualMissions)||!Array.isArray(payload.autoTasks)||!Array.isArray(payload.runeCredits)||!Array.isArray(payload.runeRequests)||!Number.isSafeInteger(body.p_expected_revision))return respond({code:'22023',message:'Opération fictive invalide.'},400);
   const requestDigest=await sha256(digest(payload)),previous=state.operations[operationId];
   state.requests.push({client,method,path:url.pathname,module:'missions',operationId,revision:body.p_expected_revision});
   if(previous){if(previous.digest!==requestDigest)return respond({code:'22023',message:'Identité d’opération réutilisée avec un autre contenu.'},400);write(state);return respond({protocol:2,replayed:true,operation:previous,module:clone(row)});}
   if(row.revision!==body.p_expected_revision){write(state);return respond({code:'40001',message:'Révision fictive périmée.'},500);}
   const revision=row.revision+1,runes=await runesReady;
   try{const credits=runes.mergeCredits(row.payload.runeCredits||[],payload.runeCredits),accepted=runes.acceptRequests(credits,payload.runeRequests,revision);row.payload={...clone(payload),runeRequests:[],runeCredits:accepted,runeLedgerVersion:2};}catch(error){write(state);return respond({code:'22023',message:error.message},400);}
   row.revision=revision;row.updated_at=new Date().toISOString();const operation={id:operationId,revision,digest:requestDigest};state.operations[operationId]=operation;write(state);return respond({protocol:2,replayed:false,operation,module:clone(row)});
  });
 }
 if(method==='POST'?body?.household_id!==household:url.searchParams.get('household_id')!=='eq.'+household)return denied();
 return locked(()=>{
  const state=read(),id=(url.searchParams.get('id')||'').replace(/^eq\./,''),module=(url.searchParams.get('module')||'').replace(/^eq\./,''),revision=(url.searchParams.get('revision')||'').replace(/^eq\./,'');
  state.requests.push({client,method,path:url.pathname,module:module||body?.module||null,id:id||null,revision:revision||null});state.requests=state.requests.slice(-250);
  if(url.pathname==='/rest/v1/dobby_v2_modules'){
   if(method==='GET'){write(state);return respond(url.searchParams.get('limit')==='0'?[]:clone(module?(state.modules[module]?[state.modules[module]]:[]):Object.values(state.modules).map(row=>({module:row.module}))));}
   const target=module||body?.module;
   if(target==='missions'){write(state);return respond({code:'42501',message:'Le registre Missions V2 utilise exclusivement son RPC natif.'},409);}
   if(!Object.hasOwn(state.modules,target)){write(state);return respond({message:'Module fictif inconnu.'},400);}
   if(method==='POST'){write(state);return respond({code:'23505',message:'Module fictif existant.'},409);}
   if(method==='PATCH'){const row=state.modules[target];if(String(row.revision)!==revision){write(state);return respond([]);}row.payload=clone(body.payload);row.revision++;row.updated_at=new Date().toISOString();write(state);return respond([clone(row)]);}
  }else if(url.pathname==='/rest/v1/dobby_v2_grocery'){
   if(method==='GET'){write(state);return respond(url.searchParams.get('limit')==='0'?[]:clone(id?state.grocery.filter(row=>row.id===id):state.grocery));}
   if(method==='POST'){if(state.grocery.some(row=>row.id===body.id)){write(state);return respond({code:'23505',message:'Article fictif existant.'},409);}const row={...body,at_home_quantity:body.at_home_quantity??0,revision:1};state.grocery.push(row);write(state);return respond([clone(row)],201);}
   if(method==='PATCH'){const row=state.grocery.find(row=>row.id===id);if(!row||String(row.revision)!==revision){write(state);return respond([]);}Object.assign(row,body,{revision:row.revision+1,updated_at:new Date().toISOString()});write(state);return respond([clone(row)]);}
  }
  write(state);return respond({message:'Méthode absente de cette simulation.'},405);
 });
};
const native=()=>window.DobbyFamilyUI||window.DobbyFamilyStitchEngine?.win()?.DobbyFamilyUI||window.DobbyCuisineEngine?.win()?.DobbyFamilyUI;
async function sync(){await ready;const api=native();if(!api?.grocery?.read().ready)throw Error('Le client natif démarre encore. Réessayez dans un instant.');await api.grocery.sync();window.DobbyCuisine?.refresh();window.DobbyFamilyStitch?.refresh?.();updateStatus();const result=api.grocery.read();if(result.error)throw Error(result.error);return clone(read());}
function prepareReset(token){if(raw.getItem.call(localStorage,resetKey)===token)clearReviewStorage(sessionStorage);}
function reconcileReset(){
 if(window===top&&!reloadRequested&&initializedGeneration!==null&&!raw.getItem.call(localStorage,resetKey)&&read().generation>initializedGeneration){reloadRequested=true;location.reload();}
}
const channel=typeof BroadcastChannel==='function'?new BroadcastChannel(prefix+'reset'):null;
if(channel)channel.onmessage=event=>{
 const message=event.data;if(!message||typeof message!=='object')return;
 if(message.type==='prepare'&&typeof message.token==='string')prepareReset(message.token);
 // A new document may receive notifications queued by the reset it just
 // recovered. Durable marker/generation, rather than message arrival order,
 // determine whether that document still needs to reload.
 if(message.type==='complete'&&Number.isSafeInteger(message.generation))reconcileReset();
};
// Storage cache updates may reach another renderer after its channel message.
// Reconcile again at the durable update instead of relying on message ordering.
window.addEventListener('storage',event=>{if(event.storageArea===localStorage&&(event.key===backendKey||event.key===resetKey))reconcileReset();});
async function clearResetStorage(){
 const previous=read(),databases=await indexedDB.databases();
 await Promise.all(databases.filter(database=>database.name?.startsWith(prefix)).map(database=>new Promise((resolve,reject)=>{
  const request=IDBFactory.prototype.deleteDatabase.call(indexedDB,database.name);
  request.onsuccess=resolve;request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Fermez les autres onglets de cet essai puis réessayez sa réinitialisation.'));
 })));
 clearReviewStorage(localStorage,new Set([resetKey]));clearReviewStorage(sessionStorage);
 const next=seed();next.generation=previous.generation+1;write(next);raw.removeItem.call(localStorage,resetKey);return next.generation;
}
async function reset(){
 await ready;const token=crypto.randomUUID();raw.setItem.call(localStorage,resetKey,token);prepareReset(token);channel?.postMessage({type:'prepare',token});let generation;
 try{
  generation=await withBackendLock(clearResetStorage);
 }catch(error){if(raw.getItem.call(localStorage,resetKey)===token)raw.removeItem.call(localStorage,resetKey);throw error;}
 channel?.postMessage({type:'complete',token,generation});location.reload();
}
function setOffline(value){sessionStorage.setItem('globalFixtureOffline',Boolean(value)?'true':'false');updateStatus();}
function updateStatus(){const node=document.querySelector('[data-global-status]');if(!node)return;const state=read(),offline=sessionStorage.getItem('globalFixtureOffline')==='true';node.textContent=(offline?'Hors ligne simulé':'Simulation locale')+' · Famille r'+state.modules.family.revision+' · Missions r'+state.modules.missions.revision;const button=document.querySelector('[data-global-offline]');if(button){button.textContent=offline?'Reconnecter':'Hors ligne';button.setAttribute('aria-pressed',String(offline));}}
window.DobbyGlobalDemo=Object.freeze({client,ready,realBackend:false,sync,reset,setOffline,state:async()=>{await ready;return clone(read());},rows:async()=>{await ready;return clone(read().grocery);},requests:async()=>{await ready;return clone(read().requests);}});
if(window===top)document.addEventListener('DOMContentLoaded',()=>{
 void ready.then(()=>{if(resetPending())return;const frame=document.querySelector('#dv7-engine[data-global-engine-src]');if(frame){const source=new URL(frame.dataset.globalEngineSrc,document.baseURI);frame.contentWindow.location.replace(source.href);frame.removeAttribute('data-global-engine-src');}}).catch(error=>alert(error.message));
 const banner=document.querySelector('[data-review-banner]');if(!banner)return;banner.replaceChildren();const label=document.createElement('span');label.textContent='DOBBY V7 · foyer fictif · Client '+client;banner.append(label);
 const controls=document.createElement('div');controls.dataset.globalControls='';for(const other of ['A','B']){const link=document.createElement('a'),url=new URL('essai-stitch-v7/traverse.html',DobbyReview.root);url.searchParams.set('client',other);link.href=url.href;link.textContent='Client '+other;link.target='_blank';link.rel='noopener';if(client===other)link.setAttribute('aria-current','page');controls.append(link);}
 const button=document.createElement('button');button.type='button';button.dataset.globalSync='';button.textContent='Synchroniser';button.onclick=async()=>{button.disabled=true;try{await sync();}catch(error){alert(error.message);}finally{button.disabled=false;}};controls.append(button);banner.append(controls);
 const actions=document.createElement('div');actions.dataset.globalControls='';const offline=document.createElement('button');offline.type='button';offline.dataset.globalOffline='';offline.onclick=async()=>{setOffline(sessionStorage.getItem('globalFixtureOffline')!=='true');if(sessionStorage.getItem('globalFixtureOffline')!=='true')try{await sync();}catch(error){alert(error.message);}};actions.append(offline);
 const restart=document.createElement('button');restart.type='button';restart.dataset.globalReset='';restart.textContent='Réinitialiser A/B';restart.onclick=()=>{if(confirm('Réinitialiser uniquement les données fictives de cet essai, pour A et B ?'))void reset().catch(error=>alert(error.message));};actions.append(restart);banner.append(actions);
 const status=document.createElement('span');status.dataset.globalStatus='';status.setAttribute('aria-live','polite');banner.append(status);updateStatus();
});
})();
