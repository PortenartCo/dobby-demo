const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
const json=x=>JSON.parse(JSON.stringify(x));
function setup(){
 const connection={epoch:1,userId:'fixture-parent',householdId:'fixture-home',memberId:'parent',identityVerified:true},st={familyMembers:[{id:'parent',memberCategory:'parent'}],familyDocs:[{id:'same',title:'TEST contrat',category:'Contrats',deadline:'2025-01-01',attachments:[{id:'pdf',key:'private-key'}],opaque:{keep:1}}],houseItems:[{id:'same',name:'TEST équipement',opaque:{keep:2}}],houseLogs:[{id:'log',itemId:'same'}],houseDocs:[{id:'piece',itemId:'same'}],customRecipes:[{id:'recipe',name:'TEST recette',ingredients:[{name:'Farine'}]}],planned:{'2026-11-14-midi':{id:'recipe'}},famContacts:[{id:'contact',name:'TEST contact'}],familyNotes:[{id:'local',title:'TEST local',body:'Privé'}],sharedFamilyNotes:[{id:'shared',title:'TEST partagé',body:'Foyer'}]};
 let writes=0;const window={DobbyFamilyUI:{getContext:()=>({...connection}),connectionState:()=>({...connection}),isModuleActive:()=>false}};
 const env=vm.createContext({window,st,custom:st.customRecipes,crypto,save:()=>{writes++},render:()=>{}});
 vm.runInContext(fs.readFileSync(new URL('../family-contracts.js',`file://${__filename}`),'utf8'),env);
 const file=new URL('../family-archives.js',`file://${__filename}`);if(fs.existsSync(file))vm.runInContext(fs.readFileSync(file,'utf8'),env);
 assert.ok(window.DobbyArchiveSources,'native source lifecycle must be loaded');return {A:window.DobbyArchiveSources,st,connection,env,writes:()=>writes};
}
test('confirmed archive/restore preserves source identities, extensions, pieces, logs and plans',()=>{
 for(const [source,id]of [['documents','same'],['equipment','same'],['recipes','recipe'],['contacts','contact'],['localNotes','local'],['sharedNotes','shared']]){
  const {A,st,writes}=setup(),before=json(st),row=A.get(source,id),snapshot=A.snapshot(source,id);
  assert.equal(A.change(source,id,true,{expected:snapshot}),false);assert.deepEqual(json(st),before);assert.equal(writes(),0);
  assert.equal(A.change(source,id,true,{confirmed:true,expected:snapshot}),true);assert.ok(A.get(source,id).archive.archivedAt);assert.equal(A.get(source,id).id,id);
  const archived=json(st),count=writes();assert.equal(A.change(source,id,true,{confirmed:true,expected:snapshot}),false);assert.deepEqual(json(st),archived);assert.equal(writes(),count);
  assert.equal(A.change(source,id,false,{confirmed:true,expected:A.snapshot(source,id)}),true);
  const restored=json(A.get(source,id));delete restored.archive;assert.deepEqual(restored,json(row));
  for(const key of ['planned','houseDocs','houseLogs'])assert.deepEqual(json(st[key]),before[key]);
 }
});
test('stale row/context, denied child, missing source and failed local save cannot report success',()=>{
 for(const mutation of ['row','home','logout','child','quota']){
  const {A,st,connection,env}=setup(),expected=A.snapshot('equipment','same');
  if(mutation==='row')st.houseItems[0].name='Concurrent';if(mutation==='home')connection.householdId='different';if(mutation==='logout'){connection.userId=null;connection.epoch++;}if(mutation==='child')st.familyMembers[0].memberCategory='child';if(mutation==='quota')env.save=()=>{throw Error('quota')};
  const before=json(st);assert.throws(()=>A.change('equipment','same',true,{confirmed:true,expected}),/modifi|foyer|lecture|parent|quota|session/i);assert.deepEqual(json(st),before);
 }
 const {A}=setup();assert.throws(()=>A.change('equipment','missing',false,{confirmed:true,expected:'old'}),/introuvable|disponible/i);assert.throws(()=>A.get('payments','x'),/source/i);
});
test('old objects are active; derived list searches accents/types/source and sorts stably without duplicates',()=>{
 const {A,st}=setup();assert.equal(A.list().length,0);const before=json(st);A.list();assert.deepEqual(json(st),before);
 for(const [source,id]of [['equipment','same'],['documents','same']])A.change(source,id,true,{confirmed:true,expected:A.snapshot(source,id)});
 st.familyDocs[0].archive.archivedAt='2026-11-12T12:00:00.000Z';st.houseItems[0].archive.archivedAt='2026-11-13T12:00:00.000Z';
 assert.deepEqual(json(A.list().map(x=>x.source)),['equipment','documents']);assert.equal(A.list('EQUIPEMENT').length,1);assert.equal(A.list('contrats').length,1);assert.equal(A.list('TEST').length,2);
});
test('unverified identity, duplicate identities and another household are refused without exposing archive metadata',()=>{
 const {A,st,connection,env}=setup();connection.identityVerified=false;
 assert.throws(()=>A.change('equipment','same',true,{confirmed:true,expected:A.snapshot('equipment','same')}),/identité|session|vérifi/i);
 connection.identityVerified=true;env.window.DobbyFamilyUI.isModuleActive=()=>true;
 A.change('equipment','same',true,{confirmed:true,expected:A.snapshot('equipment','same')});connection.householdId='other';assert.equal(A.list().length,0);assert.throws(()=>A.get('equipment','same'),/introuvable|accès/i);
 connection.householdId='fixture-home';st.houseItems.push({...st.houseItems[0]});assert.throws(()=>A.change('equipment','same',false,{confirmed:true,expected:'old'}),/identité|ambigu/i);
});
