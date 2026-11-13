import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBackend,makeClient,HH} from './helpers/modules-harness.mjs';
const member={id:'local-native-text-id',name:'Camille',firstName:'Camille',opaque:{keep:true},magicProfile:{version:1,houseId:'ravenclaw'}};
const binding={userId:'a',householdId:HH,memberId:member.id,identityVerified:true};
function setup(t,options={}){const backend=makeBackend();backend.rows.set('family',{household_id:HH,module:'family',revision:4,payload:{familyMembers:[structuredClone(member)],famContacts:[],famLists:[],familyEvents:[],sharedHealthVisits:[],sharedFamilyNotes:[],familyNotesVersion:1,familyPreparationTemplates:[],familyEventPreparations:[],familyPreparationsVersion:1}});const api={connectionState:()=>({verified:true,verifying:false,epoch:1,...options.connection}),...options.api};const client=makeClient('a',backend,false,true,{api,state:options.state});t.after(()=>client.provider.reset());return{backend,client};}
test('verified canonical adoption reads into the native family snapshot and resumes without uploading',async t=>{
 const {backend,client}=setup(t);await client.provider.start();assert.equal(typeof client.provider.adoptVerifiedFamily,'function','Provider must expose native verified adoption');await client.provider.adoptVerifiedFamily(binding);
 assert.deepEqual(JSON.parse(JSON.stringify(client.st.familyMembers)),[member]);assert.equal(client.localBackups,1);assert.equal(client.provider.isActive('family'),true);assert.equal(backend.journal.some(x=>x.method!=='GET'),false);
 const reloaded=makeClient('a',backend,false,true,{api:{connectionState:()=>({verified:true,verifying:false,epoch:1})},state:structuredClone(client.st),metadata:[...client.metadata.entries()]});t.after(()=>reloaded.provider.reset());await reloaded.provider.start();await reloaded.provider.adoptVerifiedFamily(binding);assert.deepEqual(JSON.parse(JSON.stringify(reloaded.st.familyMembers)),[member]);assert.equal(backend.rows.get('family').revision,4);
});
test('adoption refuses pending local member edits rather than overwriting or uploading them',async t=>{
 const {backend,client}=setup(t);await client.provider.start();assert.equal(typeof client.provider.adoptVerifiedFamily,'function');await client.provider.adoptVerifiedFamily(binding);client.st.familyMembers[0].name='Pending local edit';
 await assert.rejects(client.provider.adoptVerifiedFamily(binding),/attente|conflit|local/i);assert.equal(client.st.familyMembers[0].name,'Pending local edit');assert.equal(backend.rows.get('family').payload.familyMembers[0].name,'Camille');assert.equal(backend.journal.some(x=>x.method!=='GET'),false);
});
test('adoption rejects a missing canonical person or unverified household before changing local data',async t=>{
 for(const variant of ['missing','unverified','other-household']){const {client}=setup(t,variant==='unverified'?{connection:{verified:false}}:{});await client.provider.start();assert.equal(typeof client.provider.adoptVerifiedFamily,'function');await assert.rejects(client.provider.adoptVerifiedFamily({...binding,...(variant==='missing'?{memberId:'missing'}:variant==='other-household'?{householdId:'other'}:{})}),/membre|vérifi|contexte|foyer/i);assert.deepEqual(client.st.familyMembers,[]);assert.equal(client.localBackups,0);}
});
const clone=value=>JSON.parse(JSON.stringify(value));
const rememberedNote={id:'memo-1',title:'Remembered memo',body:'Keep this',futureNote:{keep:true}};
const rememberedTemplate={id:'prep-1',name:'Remembered template',version:1,items:[],futureTemplate:{keep:true}};
const familyState=client=>clone(client.metadata.get('v2-module-state:a|'+HH).family);
function withRegistries(backend){Object.assign(backend.rows.get('family').payload,{sharedFamilyNotes:[clone(rememberedNote)],familyPreparationTemplates:[clone(rememberedTemplate)],futureFamily:{keep:['opaque',1]}});}
test('adoption rejects dropped or unknown remembered extension protocols and retains the recovery metadata',async t=>{
 for(const variant of ['memo-downgrade','preparation-downgrade','all-downgrade','unknown-memo','unknown-preparation']){
  const {backend,client}=setup(t);withRegistries(backend);await client.provider.start();await client.provider.adoptVerifiedFamily(binding);
  const local=clone(client.st),before=familyState(client),backups=client.localBackups,row=backend.rows.get('family');
  if(variant==='memo-downgrade'||variant==='all-downgrade'){delete row.payload.sharedFamilyNotes;delete row.payload.familyNotesVersion;}
  if(variant==='preparation-downgrade'||variant==='all-downgrade'){delete row.payload.familyPreparationTemplates;delete row.payload.familyEventPreparations;delete row.payload.familyPreparationsVersion;}
  if(variant==='unknown-memo')row.payload.familyNotesVersion=2;
  if(variant==='unknown-preparation')row.payload.familyPreparationsVersion=2;
  row.revision++;
  await assert.rejects(client.provider.adoptVerifiedFamily(binding),/registre|version|incompatible|conservée/i,variant);
  assert.deepEqual(clone(client.st),local,variant);assert.equal(client.localBackups,backups,variant);
  const after=familyState(client);for(const key of ['active','revision','synced','familyProtocol','preparationsProtocol'])assert.deepEqual(after[key],before[key],variant+': '+key);
  assert.equal(after.conflict.familyProtocol,true,variant);assert.equal(after.conflict.remote.revision,row.revision,variant);assert.match(client.provider.statusFor('family'),/Conflit/,variant);assert.equal(client.provider.isActive('family'),false,variant);
  assert.equal(backend.journal.some(x=>x.method!=='GET'),false,variant);
 }
});
test('verified adoption retains opaque remembered fields dropped by an older peer, including on the next CAS sync',async t=>{
 const {backend,client}=setup(t);withRegistries(backend);await client.provider.start();await client.provider.adoptVerifiedFamily(binding);
 const row=backend.rows.get('family');delete row.payload.futureFamily;row.payload.familyMembers[0].name='Remote canonical name';row.revision++;
 await client.provider.adoptVerifiedFamily(binding);
 assert.equal(client.st.familyMembers[0].name,'Remote canonical name');assert.deepEqual(JSON.parse(familyState(client).synced).futureFamily,{keep:['opaque',1]});
 client.st.sharedFamilyNotes[0].body='Native local update';await client.provider.sync();
 assert.deepEqual(backend.rows.get('family').payload.futureFamily,{keep:['opaque',1]});assert.equal(backend.rows.get('family').payload.sharedFamilyNotes[0].body,'Native local update');assert.equal(backend.rows.get('family').revision,6);
});
test('adoption keeps pending offline memo and preparation edits without changing acknowledged metadata',async t=>{
 for(const key of ['sharedFamilyNotes','familyPreparationTemplates']){
  const {backend,client}=setup(t);withRegistries(backend);await client.provider.start();await client.provider.adoptVerifiedFamily(binding);
  const before=familyState(client),backups=client.localBackups;client.st[key][0].offlineEdit='Retain pending data';const local=clone(client.st);
  await assert.rejects(client.provider.adoptVerifiedFamily(binding),/attente|conflit|local/i);
  assert.deepEqual(clone(client.st),local);assert.deepEqual(familyState(client),before);assert.equal(client.localBackups,backups);assert.match(client.provider.statusFor('family'),/locales/);assert.equal(backend.journal.some(x=>x.method!=='GET'),false);
 }
});
test('a protocol downgrade cannot establish a verified access binding or erase canonical registries',async t=>{
 const {createFamilyAccess}=await import('../family-access.mjs');
 const {backend,client}=setup(t);withRegistries(backend);await client.provider.start();let bound=false;
 const access=createFamilyAccess({snapshot:()=>({ready:true,configured:true,userId:'a',householdId:HH,epoch:1,verified:true}),
  clearBinding:()=>{bound=false;},notify(){},rpc:async()=>({protocol:1,phase:'active',userId:'a',householdId:HH,memberId:member.id,profile:clone(member),permissions:{canEdit:true},familyRevision:backend.rows.get('family').revision}),
  bind:async context=>{await client.provider.adoptVerifiedFamily({...context,identityVerified:true});bound=true;}});
 await access.refresh();assert.equal(bound,true);assert.equal(access.state().verified,true);
 const row=backend.rows.get('family');for(const key of ['sharedFamilyNotes','familyNotesVersion','familyPreparationTemplates','familyEventPreparations','familyPreparationsVersion'])delete row.payload[key];row.revision++;
 await assert.rejects(access.refresh(),/registre|conservée/i);assert.equal(bound,false);assert.equal(access.state().verified,false);assert.equal(access.state().memberId,null);assert.equal(access.state().phase,'unavailable');
 assert.deepEqual(clone(client.st.sharedFamilyNotes),[rememberedNote]);assert.deepEqual(clone(client.st.familyPreparationTemplates),[rememberedTemplate]);
});
