/* Generated-preview asset only: fictional HTTP responses, never a real backend. */
(()=>{'use strict';
if(window.DobbySharedHomeDemo)return;
const prefix='dobby-review-e07-p02-shared-home-20261112|',backendKey=prefix+'backend-v1';
const client=new URLSearchParams(top.location.search).get('client')==='B'?'B':'A';
const household='00000000-0000-4000-8000-000000000010';
const user='00000000-0000-4000-8000-00000000000'+(client==='A'?'1':'2');
const project='https://pqcdkrwljgvgagzwrcmg.supabase.co';
const publishable='sb_publishable_shared_home_simulation_only_123456789';
const raw=Storage.prototype.__reviewRaw;
if(!raw||!window.DobbyReview)throw Error('Shared-home fixture requires the isolated review runtime.');
const clone=value=>JSON.parse(JSON.stringify(value));
const seed=()=>({version:1,generation:1,rows:[{id:'00000000-0000-4000-8000-000000000100',household_id:household,title:'Carottes',quantity:500,unit:'g',at_home_quantity:0,checked:false,deleted_at:null,import_source_id:null,created_at:'2026-11-12T00:00:00.000Z',updated_at:'2026-11-12T00:00:00.000Z',revision:1}],requests:[]});
const read=()=>{const stored=raw.getItem.call(localStorage,backendKey);return stored?JSON.parse(stored):seed();};
const write=value=>raw.setItem.call(localStorage,backendKey,JSON.stringify(value));
// Fail closed if Web Locks cannot serialize CAS across the fictional A/B tabs.
// Localhost and HTTPS in current Chromium support this browser-only fixture.
const locked=task=>navigator.locks?.request?navigator.locks.request(backendKey,task):Promise.reject(Error('Cette simulation A/B nécessite Web Locks : utilisez localhost ou HTTPS dans un navigateur récent.'));
const ready=locked(()=>{if(!raw.getItem.call(localStorage,backendKey))write(seed());}).then(()=>new Promise((resolve,reject)=>{
 const req=indexedDB.open('dobby-v5-household-preview-v2',1);
 req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('items'))db.createObjectStore('items',{keyPath:'storageKey'});if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta',{keyPath:'id'});};
 req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Fermez les anciens onglets de cette simulation.'));
 req.onsuccess=()=>{const db=req.result,tx=db.transaction(['meta','items'],'readwrite'),generation=String(read().generation||1);
  if(localStorage.getItem('sharedHomeFixtureGeneration')!==generation)tx.objectStore('items').clear();
  const metadata={publicKey:publishable,session:{access_token:'fictional-shared-home-'+client,refresh_token:'fictional-shared-home-refresh-'+client,user_id:user,email:'client-'+client.toLowerCase()+'@fictional.example.test',expires_at:Math.floor(Date.now()/1000)+86400},verifiedContext:user+'|'+household,deviceHouseholdId:household};
  for(const [id,value]of Object.entries(metadata))tx.objectStore('meta').put({id,value});
  tx.oncomplete=()=>{localStorage.setItem('sharedHomeFixtureGeneration',generation);db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(tx.error||Error('Fictional session initialization failed.'));};
 };
}));
const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','X-Dobby-Simulation':'browser-only'}});
const denied=()=>respond({message:'Requête hors du foyer fictif de cette simulation.'},403);
const nativeFetch=window.fetch.bind(window);
window.fetch=async(input,options={})=>{
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);
 const paths=new Set(['/auth/v1/token','/auth/v1/logout','/rest/v1/dobby_v2_memberships','/rest/v1/dobby_v2_households','/rest/v1/dobby_v2_grocery']);
 if(url.origin!==project||!paths.has(url.pathname))return nativeFetch(input,options);
 await ready;
 const method=String(options.method||input?.method||'GET').toUpperCase(),headers=new Headers(options.headers||input?.headers);
 if(headers.get('apikey')!==publishable)return denied();
 if(url.pathname==='/auth/v1/token'&&method==='POST'&&url.searchParams.get('grant_type')==='refresh_token')return respond({access_token:'fictional-shared-home-'+client,refresh_token:'fictional-shared-home-refresh-'+client,expires_in:86400,user:{id:user,email:'client-'+client.toLowerCase()+'@fictional.example.test'}});
 if(headers.get('Authorization')!=='Bearer fictional-shared-home-'+client)return denied();
 if(url.pathname==='/auth/v1/logout'&&method==='POST')return respond({});
 if(url.pathname==='/rest/v1/dobby_v2_memberships'&&method==='GET')return url.searchParams.get('user_id')==='eq.'+user?respond([{household_id:household,user_id:user,active:true}]):denied();
 if(url.pathname==='/rest/v1/dobby_v2_households'&&method==='GET')return url.searchParams.get('id')==='eq.'+household?respond([{id:household}]):denied();
 if(url.pathname!=='/rest/v1/dobby_v2_grocery')return denied();
 const body=options.body===undefined?null:JSON.parse(options.body);
 if(method==='POST'?body?.household_id!==household:url.searchParams.get('household_id')!=='eq.'+household)return denied();
 return locked(()=>{
  const state=read(),id=(url.searchParams.get('id')||'').replace(/^eq\./,''),revision=(url.searchParams.get('revision')||'').replace(/^eq\./,'');
  state.requests.push({client,method,path:url.pathname,select:url.searchParams.get('select'),id:id||null,revision:revision||null});state.requests=state.requests.slice(-100);
  if(method==='GET'){write(state);return respond(url.searchParams.get('limit')==='0'?[]:clone(id?state.rows.filter(row=>row.id===id):state.rows));}
  if(method==='POST'){
   if(state.rows.some(row=>row.id===body.id)){write(state);return respond({code:'23505',message:'Duplicate fictional grocery row.'},409);}
   const row={...body,at_home_quantity:body.at_home_quantity??0,revision:1};state.rows.push(row);write(state);return respond([clone(row)],201);
  }
  if(method==='PATCH'){
   const row=state.rows.find(row=>row.id===id);
   if(!row||String(row.revision)!==revision){write(state);return respond([]);}
   // Mirror the standard optimistic revision check used by the native writer.
   Object.assign(row,body,{revision:row.revision+1,updated_at:new Date().toISOString()});write(state);return respond([clone(row)]);
  }
  write(state);return respond({message:'Method absent from this simulation.'},405);
 });
};
const native=()=>window.DobbyFamilyUI||window.DobbyCuisineEngine?.win()?.DobbyFamilyUI;
async function sync(){await ready;const api=native();if(!api?.grocery?.read().ready)throw Error('Le client natif démarre encore. Réessayez dans un instant.');await api.grocery.sync();window.DobbyCuisine?.refresh();updateStatus();}
const resetChannel=window===top&&typeof BroadcastChannel==='function'?new BroadcastChannel(prefix+'fixture-reset'):null;
if(resetChannel)resetChannel.onmessage=event=>{if(event.data==='complete')location.reload();};
async function reset(){await ready;await locked(()=>{const previous=read(),next=seed();next.generation=(previous.generation||1)+1;next.rows[0].revision=Math.max(0,...previous.rows.map(row=>row.revision))+1;write(next);});resetChannel?.postMessage('complete');location.reload();}
function updateStatus(){const node=document.querySelector('[data-shared-status]');if(!node)return;const row=read().rows.find(x=>!x.deleted_at);node.textContent=row?`${row.title} : besoin ${row.quantity} ${row.unit} · maison ${row.at_home_quantity} ${row.unit} · révision simulée ${row.revision}`:'Aucun article dans le foyer fictif.';}
window.DobbySharedHomeDemo=Object.freeze({client,ready,realBackend:false,sync,rows:async()=>{await ready;return clone(read().rows);},requests:async()=>{await ready;return clone(read().requests);},reset});
if(window===top)document.addEventListener('DOMContentLoaded',()=>{
 const banner=document.querySelector('[data-review-banner]');if(!banner)return;
 banner.replaceChildren();const label=document.createElement('span');label.dataset.sharedLabel='';label.textContent='Simulation navigateur · foyer fictif · Client '+client;banner.append(label);
 const controls=document.createElement('div');controls.dataset.sharedControls='';
 for(const other of ['A','B']){const link=document.createElement('a');const href=new URL('essai-stitch-v7/index.html',DobbyReview.root);href.searchParams.set('client',other);href.hash='shop';link.href=href.href;link.textContent='Client '+other;link.target='_blank';link.rel='noopener';link.title='Ouvrir le client fictif '+other+' dans un autre onglet';if(client===other)link.setAttribute('aria-current','page');controls.append(link);}
 const button=document.createElement('button');button.type='button';button.dataset.sharedSync='';button.textContent='Synchroniser';button.onclick=async()=>{button.disabled=true;try{await sync();}catch(error){alert(error.message);}finally{button.disabled=false;}};controls.append(button);
 const restart=document.createElement('button');restart.type='button';restart.textContent='Repartir de zéro';restart.onclick=()=>{if(confirm('Réinitialiser uniquement le panier fictif A/B ? Les deux onglets seront rechargés.'))void reset().catch(error=>alert(error.message));};controls.append(restart);banner.append(controls);
 const status=document.createElement('span');status.dataset.sharedStatus='';status.setAttribute('aria-live','polite');banner.append(status);updateStatus();
 const note=document.createElement('span');note.style.fontSize='10px';note.textContent='Aucun compte réel · backend simulé local · synchroniser l’autre onglet après modification';banner.append(note);
 setInterval(updateStatus,1000);
});
})();
