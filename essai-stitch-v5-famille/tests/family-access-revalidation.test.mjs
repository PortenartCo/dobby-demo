import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBackend,makeClient,HH} from './helpers/modules-harness.mjs';

const clone=value=>JSON.parse(JSON.stringify(value));
const member={id:'canonical-parent',name:'TEST — Canonical parent',memberCategory:'parent'};
const permissions={canEdit:true,canMagic:true,canCreate:true,canManageDependents:true,canInvite:true};
const binding=()=>({phase:'active',authenticated:true,identityVerified:true,userId:'a',householdId:HH,
 memberId:member.id,profile:clone(member),permissions:{...permissions},familyRevision:4});
const metadata=client=>clone([...client.metadata.entries()]);
async function setup(t){
 const backend=makeBackend(),connection={verified:true,verifying:false,epoch:1},context={userId:'a',householdId:HH};
 backend.rows.set('family',{household_id:HH,module:'family',revision:4,payload:{familyMembers:[clone(member)],
  famContacts:[],famLists:[],familyEvents:[],sharedHealthVisits:[],sharedFamilyNotes:[{id:'memo-1',title:'TEST — Memo',body:'Original'}],familyNotesVersion:1,
  familyPreparationTemplates:[{id:'prep-1',name:'TEST — Preparation',version:1,items:[]}],familyEventPreparations:[],familyPreparationsVersion:1}});
 const client=makeClient('a',backend,false,true,{api:{getContext:()=>({...context}),connectionState:()=>({...connection})}});
 t.after(()=>client.provider.reset());await client.provider.start();await client.provider.adoptVerifiedFamily(binding());
 return {backend,client,connection,context};
}
function assertUnchanged(client,before){assert.deepEqual(clone(client.st),before.local);assert.deepEqual(metadata(client),before.metadata);assert.equal(client.localBackups,before.backups);}
const remember=client=>({local:clone(client.st),metadata:metadata(client),backups:client.localBackups});

test('pending memo and PREP recovery revalidates identity with a fresh GET, retaining the native CAS base until sync',async t=>{
 for(const key of ['sharedFamilyNotes','familyPreparationTemplates']){
  const {backend,client}=await setup(t);client.st[key][0].offlineEdit='TEST — Pending after reload';
  const reloaded=makeClient('a',backend,false,true,{state:clone(client.st),metadata:[...client.metadata.entries()],api:{connectionState:()=>({verified:true,verifying:false,epoch:2})}});
  t.after(()=>reloaded.provider.reset());await reloaded.provider.start();const before=remember(reloaded);backend.journal.length=0;
  assert.equal(typeof reloaded.provider.revalidateExistingFamily,'function');
  assert.equal(await reloaded.provider.revalidateExistingFamily(binding()),true);assertUnchanged(reloaded,before);
  assert.equal(backend.journal.length,1);assert.equal(backend.journal[0].method,'GET');assert.match(backend.journal[0].path,/module=eq\.family/);
  await reloaded.provider.sync();assert.equal(backend.rows.get('family').revision,5);
  assert.equal(backend.rows.get('family').payload[key][0].offlineEdit,'TEST — Pending after reload');
  assert.equal(backend.journal.filter(row=>row.method==='PATCH').length,1);assert.match(backend.journal.find(row=>row.method==='PATCH').path,/revision=eq\.4/);
 }
});
test('read-only revalidation preserves an ordinary CAS conflict and permits only its existing explicit resolution path',async t=>{
 const {backend,client}=await setup(t);client.st.sharedFamilyNotes[0].body='TEST — Local pending';backend.rows.get('family').revision++;
 backend.rows.get('family').payload.sharedFamilyNotes[0].body='TEST — Remote confirmed';await client.provider.sync();
 assert.match(client.provider.statusFor('family'),/Conflit/);const before=remember(client);backend.journal.length=0;
 assert.equal(await client.provider.revalidateExistingFamily({...binding(),familyRevision:5}),true);assertUnchanged(client,before);
 await client.provider.sync();assert.equal(backend.journal.some(row=>row.method!=='GET'),false,'A canonical binding does not auto-drain a conflict');
 await client.action('local','family');assert.equal(backend.rows.get('family').payload.sharedFamilyNotes[0].body,'TEST — Local pending');assert.equal(backend.rows.get('family').revision,6);
 assert.ok(client.prompts.some(text=>/modifications locales/i.test(text)),'The existing explicit native choice is required');
});
test('clean and inactive family registries retain the normal adoption path',async t=>{
 const {backend,client}=await setup(t);backend.journal.length=0;
 assert.equal(await client.provider.revalidateExistingFamily(binding()),false);assert.equal(backend.journal.length,0);
 backend.rows.get('family').payload.familyMembers[0].name='TEST — Updated server profile';backend.rows.get('family').revision++;
 await client.provider.adoptVerifiedFamily(binding());assert.equal(client.st.familyMembers[0].name,'TEST — Updated server profile');
 const fresh=makeClient('a',backend,false,true,{api:{connectionState:()=>({verified:true,verifying:false,epoch:2})}});t.after(()=>fresh.provider.reset());await fresh.provider.start();backend.journal.length=0;
 assert.equal(await fresh.provider.revalidateExistingFamily(binding()),false);assert.equal(backend.journal.length,0);assert.deepEqual(fresh.st.familyMembers,[]);
});
test('pending local role fields never authorize revalidation over a different canonical server category',async t=>{
 const {backend,client}=await setup(t);client.st.familyMembers[0].memberCategory='parent';client.st.sharedFamilyNotes[0].body='TEST — Pending';
 backend.rows.get('family').payload.familyMembers[0].memberCategory='child';const before=remember(client);backend.journal.length=0;
 await assert.rejects(client.provider.revalidateExistingFamily(binding()),/membre|catégorie|canonique/i);assertUnchanged(client,before);assert.equal(backend.journal.some(row=>row.method!=='GET'),false);
});
test('incomplete, foreign or discordant canonical candidates cannot revalidate pending data',async t=>{
 for(const change of [value=>{value.userId='other';},value=>{value.householdId='other';},value=>{value.memberId='';},value=>{delete value.profile;},
  value=>{value.profile.id='other';},value=>{delete value.profile.memberCategory;},value=>{value.profile.memberCategory='pet';},
  value=>{value.authenticated=false;},value=>{value.phase='unavailable';},value=>{value.identityVerified=false;},value=>{delete value.permissions;}]){
  const {backend,client}=await setup(t);client.st.sharedFamilyNotes[0].body='TEST — Pending';const before=remember(client),candidate=binding();change(candidate);backend.journal.length=0;
  await assert.rejects(client.provider.revalidateExistingFamily(candidate),/membre|canonique|vérifi|contexte|foyer/i);assertUnchanged(client,before);assert.equal(backend.journal.length,0);
 }
});
test('missing, ambiguous or incompatible remote registries leave pending state and metadata intact',async t=>{
 for(const variant of ['missing','ambiguous','other-member','other-household','other-module','protocol']){
  const {backend,client}=await setup(t);client.st.sharedFamilyNotes[0].body='TEST — Pending';const row=backend.rows.get('family');
  if(variant==='missing')backend.rows.delete('family');
  if(variant==='ambiguous')row.payload.familyMembers.push(clone(member));
  if(variant==='other-member')row.payload.familyMembers[0].id='other';
  if(variant==='other-household')row.household_id='other';
  if(variant==='other-module')row.module='other';
  if(variant==='protocol')delete row.payload.familyPreparationsVersion;
  const before=remember(client);backend.journal.length=0;
  await assert.rejects(client.provider.revalidateExistingFamily(binding()),/membre|registre|canonique|version|foyer|préparation/i,variant);assertUnchanged(client,before);assert.equal(backend.journal.some(row=>row.method!=='GET'),false);
 }
});
test('HTTP 403 and 404 during canonical revalidation retain pending edits without establishing a replacement',async t=>{
 for(const status of [403,404]){
  const {backend,client}=await setup(t);client.st.sharedFamilyNotes[0].body='TEST — Pending';const before=remember(client);
  backend.authorized=async()=>{throw Object.assign(Error('TEST — Refused remote registry'),{status});};
  await assert.rejects(client.provider.revalidateExistingFamily(binding()),error=>error.status===status);assertUnchanged(client,before);
 }
});
test('owner, household, epoch or provider generation changes during the fresh GET reject the stale result',async t=>{
 for(const variant of ['user','household','epoch','generation']){
  const {backend,client,connection,context}=await setup(t);client.st.sharedFamilyNotes[0].body='TEST — Pending';const before=remember(client);
  const authorized=backend.authorized;let release,entered;const started=new Promise(resolve=>{entered=resolve;});
  backend.authorized=async(...args)=>{const result=await authorized(...args);entered();await new Promise(resolve=>{release=resolve;});return result;};
  const pending=client.provider.revalidateExistingFamily(binding());await started;
  if(variant==='user')context.userId='other';if(variant==='household')context.householdId='other';if(variant==='epoch')connection.epoch++;
  if(variant==='generation')client.provider.reset();release();
  await assert.rejects(pending,/contexte|foyer|vérifi|membre/i,variant);assert.deepEqual(clone(client.st),before.local);assert.deepEqual(metadata(client),before.metadata);assert.equal(client.localBackups,before.backups);
 }
});
test('disabling family while its identity GET is pending prevents that result from restoring a binding',async t=>{
 const {backend,client}=await setup(t);client.st.sharedFamilyNotes[0].body='TEST — Pending';const authorized=backend.authorized;
 let release,entered;const started=new Promise(resolve=>{entered=resolve;});
 backend.authorized=async(...args)=>{const result=await authorized(...args);entered();await new Promise(resolve=>{release=resolve;});return result;};
 const pending=client.provider.revalidateExistingFamily(binding());await started;await client.action('disable','family');const disabled=remember(client);release();
 await assert.rejects(pending,/contexte|foyer|vérifi|membre/i);assertUnchanged(client,disabled);assert.equal(client.provider.isConfigured('family'),false);assert.equal(backend.journal.some(row=>row.method!=='GET'),false);
});
