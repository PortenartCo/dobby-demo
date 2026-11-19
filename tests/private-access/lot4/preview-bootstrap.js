/* Test-only envelope. Loaded by the loopback preview server, never by production. */
(() => {
 'use strict';
 const persona = /^\/fixture-([134])\//.exec(location.pathname)?.[1] || '1';
 const namespace = 'dobby-lot4-preview-__DOBBY_LOT4_PREVIEW_INSTANCE__-' + persona + '|';
 const raw = {getItem:Storage.prototype.getItem,setItem:Storage.prototype.setItem,removeItem:Storage.prototype.removeItem,key:Storage.prototype.key,length:Object.getOwnPropertyDescriptor(Storage.prototype,'length').get};
 const keys = store => Array.from({length:raw.length.call(store)},(_,index)=>raw.key.call(store,index)).filter(key=>key?.startsWith(namespace));
 Storage.prototype.getItem=function(key){return raw.getItem.call(this,namespace+key);};
 Storage.prototype.setItem=function(key,value){return raw.setItem.call(this,namespace+key,value);};
 Storage.prototype.removeItem=function(key){return raw.removeItem.call(this,namespace+key);};
 Storage.prototype.key=function(index){return keys(this)[index]?.slice(namespace.length)||null;};
 Storage.prototype.clear=function(){for(const key of keys(this))raw.removeItem.call(this,key);};
 Object.defineProperty(Storage.prototype,'length',{get(){return keys(this).length;}});
 // Native cross-tab listeners consume logical keys. Preserve real browser
 // storage events while keeping this envelope's personas mutually isolated.
 window.addEventListener('storage',event=>{
  if(typeof event.key!=='string')return;
  if(!event.key.startsWith(namespace)){event.stopImmediatePropagation();return;}
  Object.defineProperty(event,'key',{value:event.key.slice(namespace.length)});
 },{capture:true});
 // Real recipient links must arrive signed out in their separate browser.
 // Read only the presence of a bounded callback, never persist its bearer.
 if(new URL(location.href).searchParams.has('admission_id')){sessionStorage.setItem('fixture-signed-out','true');localStorage.setItem('__fixture-session-seeded','true');}
 const explicitLogin=new URL(location.href).searchParams.get('fixture_login')==='1'&&!new URL(location.href).searchParams.has('admission_id');
 if(explicitLogin){const clean=new URL(location.href);clean.searchParams.delete('fixture_login');history.replaceState(history.state,'',clean.pathname+clean.search+clean.hash);sessionStorage.removeItem('fixture-signed-out');}
 const open=indexedDB.open.bind(indexedDB),remove=indexedDB.deleteDatabase.bind(indexedDB);
 indexedDB.open=(name,...args)=>open(namespace+name,...args);
 indexedDB.deleteDatabase=name=>remove(namespace+name);
 window.DobbyPublicConfig=Object.freeze({projectRef:'pqcdkrwljgvgagzwrcmg',publicKey:'sb_publishable_lot4_fictional_loopback_only'});
 const seedLocal=()=>{
  const key='dobby-v5-familial-preview-20261108';
  if(localStorage.getItem(key))return;
  localStorage.setItem(key,JSON.stringify({demoInitialized:true,day:new Date().toISOString().slice(0,10),planned:{},customRecipes:[{id:'lot4-soup',name:'DÉMO — Soupe du potager',emoji:'🥣',minutes:25,servings:2,category:'Végétarien',fav:true,ingredients:[['Carottes',300,'g']],steps:['Préparer les légumes.','Cuire et mixer.'],source:'Données fictives Lot 4',reviewed:false}],extras:[],shopFinal:null,shopHistory:{},shopChoice:{},familyMembers:[],familyEvents:[],manualMissions:[],autoTasks:[],runeCredits:[],runeRequests:[],familyDocs:[],houseItems:[],familyNotes:[{id:'lot4-local-note',title:'DÉMO — Note locale à conserver',body:'Brouillon fictif non synchronisé.'}],famContacts:[],famHealth:[],sharedHealthVisits:[]}));
 };
 seedLocal();
 window.__fixtureReady=window.parent!==window?window.parent.__fixtureReady:(async()=>{
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('dobby-v5-household-preview-v2',1);request.onupgradeneeded=()=>{request.result.createObjectStore('items',{keyPath:'storageKey'});request.result.createObjectStore('meta',{keyPath:'id'});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  const existing=await new Promise((resolve,reject)=>{const tx=db.transaction('meta'),request=tx.objectStore('meta').get('session');request.onsuccess=()=>resolve(request.result?.value);request.onerror=()=>reject(request.error);});
  if(explicitLogin || !existing && !localStorage.getItem('__fixture-session-seeded') && sessionStorage.getItem('fixture-signed-out')!=='true'){
   const response=await fetch('/__fixture/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({number:Number(persona)})});
   if(!response.ok)throw Error('Le compte fictif local est indisponible.');
   const login=await response.json();
   await new Promise((resolve,reject)=>{const tx=db.transaction('meta','readwrite'),store=tx.objectStore('meta');store.put({id:'session',value:{access_token:login.access_token,refresh_token:login.refresh_token,expires_at:Math.floor(Date.now()/1000)+login.expires_in,user_id:login.user.id,email:login.user.email,localSessionId:crypto.randomUUID()}});store.put({id:'publicKey',value:window.DobbyPublicConfig.publicKey});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
   localStorage.setItem('__fixture-session-seeded','true');
  }
  db.close();
 })();
 if(window!==window.top)return;
 document.addEventListener('DOMContentLoaded',()=>{
  const style=document.createElement('style');
  style.textContent='html body{padding-top:44px!important;--e01-top:116px}html body>header[data-e01-chrome]{top:44px!important}[data-lot4-fixture-banner]{position:fixed;top:0;left:0;right:0;z-index:20000;height:44px!important;min-height:0!important;display:flex;align-items:center;justify-content:center;gap:8px;padding:4px 8px;box-sizing:border-box;background:#24140e;color:#ffdda1;border-bottom:1px solid #d49b42;font:11px/1.2 sans-serif}[data-lot4-fixture-banner] a{color:inherit;padding:5px;text-decoration:underline}[data-lot4-fixture-banner] select{height:32px!important;min-height:0!important;color:#ffdda1;background:#392519;border:1px solid #96723d;border-radius:5px;padding:4px;max-width:145px;font:11px sans-serif}';
  document.head.append(style);
  const banner=document.createElement('aside');banner.dataset.lot4FixtureBanner='';
  const label=document.createElement('strong');label.textContent='APERÇU LOCAL FICTIF';banner.append(label);
  const select=document.createElement('select');select.setAttribute('aria-label','Profil fictif isolé');
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=sessionStorage.getItem('fixture-signed-out')==='true'?'Invité fictif':'Changer de profil';placeholder.selected=true;placeholder.disabled=true;select.append(placeholder);
  for(const [value,text]of [['1','Propriétaire · H1'],['3','Parent · H2'],['4','Non approuvé']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
  select.onchange=()=>location.assign('/fixture-'+select.value+'/essai-stitch-v7/famille.html?fixture_login=1#salon');banner.append(select);
  const info=document.createElement('a');info.href='/__fixture';info.textContent='Infos';banner.append(info);
  document.body.prepend(banner);
 });
})();
