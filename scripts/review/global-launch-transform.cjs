/* Derive the launch fixture from the existing global review without altering older bundles. */
'use strict';
function replace(source, marker, content) {
  if (source.split(marker).length !== 2) throw Error(`Source globale héritée modifiée près de ${marker.slice(0, 85)}`);
  return source.replace(marker, () => content);
}
function between(source, start, end, content) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b <= a) throw Error(`Source globale héritée modifiée près de ${start}`);
  return source.slice(0, a) + content + source.slice(b);
}
function config(source) {
  source = between(source, ' const selectedKey=', ' window.DobbyReviewConfig=Object.freeze({', `
 const scenario=window.DobbyGlobalScenario;
 const selectedKey=scenario.namespace+'selected-client';
 const url=new URL(top.location.href);
 const code=url.searchParams.get('client')||sessionStorage.getItem(selectedKey);
 const client=scenario.profiles.some(profile=>profile.code===code)?code:'A';
 if(window===top){
   sessionStorage.setItem(selectedKey,client);
   if(url.searchParams.get('client')!==client){url.searchParams.set('client',client);history.replaceState(history.state,'',url.href);}
 }
`);
  source = between(source, "  version:'V7-GLOBAL'", '  initialState(day){', `
  version:'V7-GLOBAL-LAUNCH',client,storagePrefix:scenario.namespace+'client-'+client+'|',demoMemberId:null,
  label:'DOBBY V7 · Démonstration',
  info:'Foyer fictif, sessions et échanges simulés sur cet appareil.',
`);
  source = replace(source, '   return{demoInitialized:true', '   const initial={demoInitialized:true');
  return replace(source, 'famHealth:[],sharedHealthVisits:[]};\n  }', `famHealth:[],sharedHealthVisits:[]};
   initial.familyMembers=scenario.profiles.map(profile=>({
     id:profile.memberId,name:profile.name,firstName:profile.firstName,lastName:'Démo',
     memberCategory:profile.role,avatar:profile.avatar,
     magicProfile:{version:1,houseId:profile.houseId,patronusId:profile.patronusId,avatarId:profile.avatarId},
   }));
   initial.manualMissions.push(...scenario.missions.map(mission=>({...mission,due:day,status:'open',rewardVersion:1})));
   initial.houseItems=[JSON.parse(JSON.stringify(scenario.equipment))];
   initial.famContacts=[{...scenario.contact}];
   return initial;
  }`);
}
function review(source) {
  source = replace(source, 'if(!localStorage.getItem(key)){', 'if(!window.DobbyGlobalLaunch&&!localStorage.getItem(key)){');
  source = replace(source, "localStorage.clear();sessionStorage.clear();for(const db",
    "if(window.DobbyGlobalLaunch)return window.DobbyGlobalDemo.reset();localStorage.clear();sessionStorage.clear();for(const db");
  return replace(source, "navigator.sendBeacon=()=>false;", `navigator.sendBeacon=()=>false;
const localNavigation=input=>{
 const url=new URL(input,location.href);
 return url.origin===root.origin&&(url.pathname.startsWith(root.pathname)||url.protocol==='blob:');
};
const openWindow=window.open.bind(window);
window.open=(input='',...args)=>localNavigation(input)?openWindow(input,...args):null;
function guardNavigation(event){
 const link=event.target.closest?.('a[href]');
 if(link&&!localNavigation(link.href))event.preventDefault();
}
document.addEventListener('click',guardNavigation,true);
document.addEventListener('auxclick',guardNavigation,true);`);
}
function demo(source) {
  if (!source.includes('function seed()')) throw Error('Source globale héritée modifiée près du scénario initial');
  source = between(source, "const prefix='dobby-review-v7-global-20261112|'", 'const respond=', `
const config=window.DobbyReviewConfig,scenario=window.DobbyGlobalScenario;
const client=config.client,profile=scenario.profiles.find(actor=>actor.code===client);
const household=scenario.household.id,user=profile.userId,project='https://dobby-global-demo.invalid';
const publishable='sb_publishable_global_simulation_only_123456789';
const clone=value=>JSON.parse(JSON.stringify(value));
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const digest=value=>JSON.stringify(canonical(value));
const definitions={menus:['planned','shopHistory','shopFinal','shopChoice'],recipes:['customRecipes','tmAdaptations'],missions:['autoTasks','manualMissions','runeCredits'],house:['houseItems','houseLogs'],family:['familyMembers','famContacts','famLists','familyEvents','sharedHealthVisits','sharedFamilyNotes','familyPreparationTemplates','familyEventPreparations']};
const {goal}=scenario;
function seed(day=new Date().toLocaleDateString('en-CA'),generation=1){
 const initial=config.initialState(day),modules={},stamp=day+'T00:00:00.000Z';
 for(const [module,keys] of Object.entries(definitions)){
  const payload=Object.fromEntries(keys.map(key=>[key,clone(initial[key]??[])]));
  // The dormant historical field is empty, matching the native initial snapshot.
  // Omitting it would look like an unsaved edit when another parent advances the revision.
  if(module==='family') Object.assign(payload,{familyNotesVersion:1,familyPreparationsVersion:1});
  if(module==='missions') Object.assign(payload,{runeLedgerVersion:3,runeRequests:[],missionParticipation:[],runeRewards:[],
    runeGoals:{[goal.memberId]:{id:goal.id,threshold:goal.threshold,mode:'announced',unlocked:false,title:goal.title,date:stamp}}});
  if(module==='house') payload.houseVersion=1;
  modules[module]={household_id:household,module,payload,revision:1,updated_at:stamp};
 }
 modules.contracts={household_id:household,module:'contracts',payload:{contractsVersion:1,contracts:clone(initial.familyDocs)},revision:1,updated_at:stamp};
 const grocery=scenario.grocery.map(item=>({...item,household_id:household,at_home_quantity:0,checked:false,deleted_at:null,
   import_source_id:null,created_at:stamp,updated_at:stamp,revision:1}));
 return {version:1,generation,day,household,modules,grocery,suspended:{C:false,D:false},operations:{},requests:[]};
}
function prepare(state){
 if(profile.role==='child') return {snapshot:{day:state.day,demoInitialized:true,planned:{},familyMembers:[]},modules:{}};
 const snapshot=config.initialState(state.day),modules={};
 for(const [id,row] of Object.entries(state.modules)){
  if(id==='contracts') snapshot.familyDocs=clone(row.payload.contracts);
  else for(const key of definitions[id]) if(Object.hasOwn(row.payload,key)) snapshot[key]=clone(row.payload[key]);
  if(id==='missions') Object.assign(snapshot,clone(row.payload));
  modules[id]={active:true,revision:row.revision,synced:['missions','family'].includes(id)?digest(row.payload):JSON.stringify(row.payload),
   conflict:false,...(id==='missions'?{runeProtocol:3}:id==='family'?{familyProtocol:true,preparationsProtocol:true}:{})};
 }
 return {snapshot,modules};
}
const newSession=()=>({key:publishable,access_token:'fictional-global-'+client,refresh_token:'fictional-global-refresh-'+client,
 user_id:user,email:profile.email,expires_at:Math.floor(Date.now()/1000)+86400});
const lifecycle=window.DobbyGlobalLifecycle.create({seed,client,session:newSession(),prepare});
const {read,write,ready,pending:resetPending}=lifecycle;
const ensureOnline=()=>{if(lifecycle.isOffline())throw Error('Simulation hors ligne : modification conservée sur ce navigateur.');};
const locked=task=>lifecycle.locked(async()=>{
 ensureOnline();
 return await lifecycle.sessionClosed()?denied():task();
});
`);
  source = between(source, ' const paths=new Set(', ' const method=String(', `
 if(url.origin!==project)return nativeFetch(input,options);
 await ready;
 if(resetPending())throw Error('Réinitialisation de la démonstration en cours.');
 ensureOnline();
`);
  source = between(source, " if(url.pathname==='/auth/v1/token'", " if(method==='POST'?body?.household_id", `
 const body=options.body===undefined?null:JSON.parse(options.body);
 const fixtureSuspended=async()=> (await lifecycle.latest()).suspended[client]===true;
 if(url.pathname==='/auth/v1/token'&&method==='POST'&&url.searchParams.get('grant_type')==='refresh_token'){
  const session=newSession();
  if(await fixtureSuspended()||await lifecycle.sessionClosed()||body?.refresh_token!==session.refresh_token)return denied();
  return respond({access_token:session.access_token,refresh_token:session.refresh_token,expires_in:86400,user:{id:user,email:profile.email}});
 }
 if(headers.get('Authorization')!=='Bearer fictional-global-'+client||lifecycle.signedOut())return denied();
 if(url.pathname==='/auth/v1/logout'&&method==='POST')return respond({});
 if(url.pathname.startsWith('/rest/v1/rpc/'))return locked(async()=>{
  const state=read(),before=JSON.stringify(state);
  const result=await window.DobbyGlobalRoles.handle({client,method,url,body,state,household,user,profile,respond,denied});
  if(JSON.stringify(state)!==before)write(state);
  return result||respond({message:'Ce service n’est pas reproduit dans la démonstration.'},404);
 });
 if(await fixtureSuspended()||await lifecycle.sessionClosed())return denied();
 if(url.pathname==='/rest/v1/dobby_v2_memberships'&&method==='GET')return url.searchParams.get('user_id')==='eq.'+user?respond([{household_id:household,user_id:user,active:true}]):denied();
 if(url.pathname==='/rest/v1/dobby_v2_households'&&method==='GET')return url.searchParams.get('id')==='eq.'+household?respond([{id:household,name:scenario.household.name}]):denied();
 if(profile.role==='child'&&(method!=='GET'||url.pathname==='/rest/v1/dobby_v2_modules'&&!['eq.menus','eq.recipes'].includes(url.searchParams.get('module'))))return denied();
 if(!['/rest/v1/dobby_v2_grocery','/rest/v1/dobby_v2_modules'].includes(url.pathname))return denied();
`);
  source = replace(source,
    "const nativeFetch=window.fetch.bind(window),runesReady=import(new URL('essai-stitch-v5-famille/family-runes-core.mjs',DobbyReview.root).href);\nconst sha256=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),byte=>byte.toString(16).padStart(2,'0')).join('');",
    'const nativeFetch=window.fetch.bind(window);');
  // Let the existing grocery cycle verify the account and drain native queues.
  source = replace(source, 'await api.grocery.sync();window.DobbyCuisine?.refresh();window.DobbyFamilyStitch?.refresh?.();',
    'await api.grocery.sync();await refreshSyncedView();');
  source = replace(source, 'updateStatus();const result=api.grocery.read();', 'lifecycle.notify();const result=api.grocery.read();');
  source = replace(source, 'if(result.error)throw Error(result.error);return clone(read());}', 'if(result.error)throw Error(result.error);return visibleState();}');
  return between(source, 'function prepareReset(', '})();', `
function currentActor(){
 const state=native()?.access.state();
 return state?.verified&&state.memberId===profile.memberId&&state.userId===user&&!lifecycle.signedOut()&&read().suspended[client]!==true;
}
async function refreshSyncedView(){
 window.DobbyCuisine?.refresh();
 const family=window.DobbyFamilyStitch,requested=location.hash.slice(1).split('?')[0];
 if(currentActor()&&family?.ready&&family.handles(requested)&&document.body.dataset.familyView!==requested){
  // Native verification may temporarily replace the view while retaining its URL.
  // Reuse the native route and permission check once the same actor is confirmed.
  await family.accessChanged();
 }else await family?.refresh?.();
}
async function visibleState(){
 const state=await lifecycle.latest();
 if(profile.role==='parent'&&currentActor()&&!await lifecycle.sessionClosed())return state;
 return {version:state.version,generation:state.generation,day:state.day};
}
async function profiles(){
 await ready;
 const {suspended}=await lifecycle.latest();
 return scenario.profiles.map(({code,name,role})=>({code,name,role,suspended:suspended[code]===true}));
}
async function setSuspended(code,value){
 await ready;
 const target=scenario.profiles.find(actor=>actor.code===code&&actor.role==='child');
 const api=native();
 const assertParent=()=>{
  if(!target||profile.role!=='parent'||!currentActor()||!api?.access.state().permissions?.canManageDependents||lifecycle.isOffline())
   throw Error('Utilisez une session parent active en ligne dans la simulation.');
 };
 assertParent();
 if(value===true) await api.access.suspendChildAccess(target.memberId);
 else if(value===false) await lifecycle.locked(async()=>{
  if(await lifecycle.sessionClosed())throw Error('Cette session parent est fermée.');
  assertParent();
  const state=read();state.suspended[code]=false;write(state);
 });
 else throw Error('État du compte fictif invalide.');
 lifecycle.notify();
}
window.DobbyGlobalDemo=Object.freeze({client,ready,realBackend:false,sync,profiles,setSuspended,
 reset:lifecycle.reset,resetPending,setOffline:lifecycle.setOffline,isOffline:lifecycle.isOffline,selectClient:lifecycle.selectClient,
 signedOut:lifecycle.signedOut,endSession:lifecycle.endSession,startSession:lifecycle.startSession,
 state:async()=>{await ready;return visibleState();},rows:async()=>{await ready;return currentActor()?(await lifecycle.latest()).grocery:[];},
 requests:async()=>{await ready;return currentActor()?(await lifecycle.latest()).requests.filter(request=>request.client===client):[];}});
if(window===top)document.addEventListener('DOMContentLoaded',()=>{
 void ready.then(()=>{
  if(resetPending())return;
  const frame=document.querySelector('#dv7-engine[data-global-engine-src]');
  if(frame){frame.contentWindow.location.replace(new URL(frame.dataset.globalEngineSrc,document.baseURI).href);frame.removeAttribute('data-global-engine-src');}
 }).catch(error=>{const status=document.querySelector('[data-global-status]');if(status)status.textContent=error.message;});
});
`);
}
function nativeResource(path, source) {
  if (path === 'essai-stitch-v7/chrome.js') {
    return replace(source, "document.addEventListener('click',async event=>{",
      "document.addEventListener('click',async event=>{\n if(event.target.closest?.('[data-review-banner],#dobby-global-panel'))return;");
  }
  if (path === 'essai-stitch-v7/cuisine-e074.js') {
    return replace(source, 'function leaveEditor(){const ui=c.ui;', 'function leaveEditor(){if(!c)return;const ui=c.ui;');
  }
  return source;
}
module.exports = { config, demo, review, nativeResource };
