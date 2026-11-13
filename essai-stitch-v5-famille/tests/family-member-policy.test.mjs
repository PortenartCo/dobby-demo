import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const realm={window:{}};
vm.runInNewContext(source('family-profile.js'),realm);
vm.runInNewContext(source('family-member-policy.js'),realm);
const P=realm.window.DobbyFamilyMemberPolicy,M=realm.window.DobbyMagicIdentity;
const members=[{id:'parent-a',name:'TEST Parent A',memberCategory:'parent'},{id:'parent-b',name:'TEST Parent B',memberCategory:'parent'},{id:'child',name:'TEST Enfant',memberCategory:'child'},{id:'baby',name:'TEST Bébé',memberCategory:'baby'},{id:'pet',name:'TEST Animal',memberCategory:'pet'},{id:'legacy',name:'TEST Ancien',future:{keep:true}}];
const context=(actorId,demo=true)=>({actorId,demo,members});
const row=id=>members.find(member=>member.id===id);

test('FAM15 denies real writes even when a locally selected actor claims to be a parent',()=>{
 const result=P.permissions(row('child'),context('parent-a',false));
 assert.equal(result.canEdit,false);assert.equal(result.canMagic,false);assert.equal(result.canCreate,false);
 assert.throws(()=>P.assertWrite(row('child'),{notes:'TEST'},context('parent-a',false)),/compte connecté/);
});
test('V7 F09 explicit fictional parent can edit the complete current household',()=>{
 for(const id of ['parent-a','parent-b','child','baby','pet','legacy'])assert.equal(P.permissions(row(id),context('parent-a')).canEdit,true,id);
 assert.equal(P.permissions({id:'foreign',memberCategory:'child'},context('parent-a')).canEdit,false);
 assert.equal(P.permissions(null,context('parent-a')).canCreate,true);
 for(const memberCategory of ['baby','child','pet'])assert.doesNotThrow(()=>P.assertWrite(null,{memberCategory},context('parent-a')));
 for(const memberCategory of ['parent','adult',''])assert.throws(()=>P.assertWrite(null,{memberCategory},context('parent-a')),/création directe/);
 assert.throws(()=>P.assertWrite(row('child'),{memberCategory:'parent'},context('parent-a')),/statut parental/);
 assert.throws(()=>P.assertWrite(row('parent-a'),{memberCategory:'child'},context('parent-a')),/statut parental/);
});
test('FAM15 children only have own confirmed magical results; babies and pets have no autonomous writes',()=>{
 assert.equal(P.permissions(row('child'),context('child')).canMagic,true);
 assert.equal(P.permissions(row('parent-a'),context('child')).canMagic,false);
 assert.throws(()=>P.assertWrite(row('child'),{magicHouseId:'slytherin',magicHouseAlgorithm:'e06-v1'},context('child')),/questionnaires/);
 assert.doesNotThrow(()=>P.assertWrite(row('child'),{name:row('child').name,magicHouseId:'slytherin',magicHouseAlgorithm:'e06-v1'},context('child'),{magicResult:true}));
 assert.throws(()=>P.assertWrite(row('child'),{notes:'TEST hors périmètre',magicHouseId:'slytherin'},context('child'),{magicResult:true}),/questionnaires/);
 for(const id of ['baby','pet']){const result=P.permissions(row(id),context(id));assert.equal(result.canEdit,false);assert.equal(result.canMagic,false);assert.equal(result.canCreate,false);}
});
test('FAM10/12 preserves opaque fields and old single names; canonical E05 fields remain the single structured identity',()=>{
 const legacy={...row('legacy'),id:'test',avatar:'🐉',magicProfile:{version:1,houseId:'slytherin',houseAlgorithmVersion:'e06-v1',future:true}};
 const untouched=P.prepare(legacy,{notes:'TEST Mémoire',nickname:'TEST Surnom'},M.patch);
 assert.equal(untouched.name,legacy.name);assert.equal(untouched.firstName,undefined);assert.equal(untouched.future.keep,true);assert.equal(untouched.magicProfile.future,true);assert.equal(untouched.magicProfile.houseAlgorithmVersion,'e06-v1');assert.equal(untouched.avatar,'🐉');
 const changed=P.prepare(untouched,{firstName:'TEST Camille',lastName:'Fictive',notes:'TEST Rituel',species:'chat',memberCategory:'pet'},M.patch);
 assert.equal(changed.name,'TEST Camille Fictive');assert.equal(changed.firstName,'TEST Camille');assert.equal(changed.lastName,'Fictive');assert.equal(changed.notes,'TEST Rituel');assert.equal(changed.nickname,'TEST Surnom');assert.equal(changed.species,'chat');assert.equal(changed.profileFirstName,undefined);
 assert.throws(()=>P.prepare(changed,{name:'TEST autre identité'},M.patch),/cohérence/);
 assert.throws(()=>P.prepare(changed,{firstName:'TEST Camille',profileFirstName:'Autre'},M.patch),/contredisent/);
 assert.equal(P.prepare(changed,{profileFirstName:'TEST Alex',profileLastName:'Fictive'},M.patch).firstName,'TEST Alex');
});
test('FAM11 keeps categories explicit and reports Cuisine eligibility without changing portion state',()=>{
 assert.equal(P.category({...row('baby'),birthdate:'2000-01-01'}),'baby');
 assert.equal(P.category({name:'TEST Parent',birthdate:'1980-01-01'}),null);
 assert.equal(P.mealEligibility(row('baby')),'excluded');assert.equal(P.mealEligibility(row('pet')),'excluded');assert.equal(P.mealEligibility(row('child')),'child');assert.equal(P.mealEligibility(row('legacy')),'unknown');
 assert.throws(()=>P.prepare(row('child'),{memberCategory:'adult'},M.patch),/Catégorie/);
});
test('native date input cannot silently erase a preexisting unrepresentable birthdate',()=>{
 const legacy={...row('child'),birthdate:'2026-02-30'};
 assert.equal(P.prepare(legacy,{birthdate:''},M.patch).birthdate,'2026-02-30');
 assert.equal(P.prepare(legacy,{birthdate:'',clearBirthdate:'true'},M.patch).birthdate,'');
 assert.throws(()=>P.prepare(row('child'),{birthdate:'2026-02-30'},M.patch),/Date/);
 assert.equal(P.prepare(legacy,{birthdate:'2026-02-28'},M.patch).birthdate,'2026-02-28');
});

// Execute the actual native handler, with no iframe facade, DOM click gating,
// local storage, fetch or backend. All records and personas are fictional.
function nativeHarness(actorId=null,demo=false){
 const html=source('index.html'),start=html.indexOf('let v23MemberEdit=null;'),end=html.indexOf('// No background services',start),handlers={},alerts=[];
 const st={familyMembers:structuredClone(members),famHealth:[],v23HealthMemberId:'parent-a',extraPage:'health'};
 const sandbox={window:{...realm.window,...(demo?{DobbyReview:{demoMemberId:actorId}}:{})},st,xhealth:()=>'',render(){},xuid:()=> 'test-created',save(){sandbox.saves++;},saves:0,alert:message=>alerts.push(message),confirm:()=>true,document:{addEventListener:(type,fn)=>handlers[type]=fn},FormData:class{constructor(form){this.values=form.values;}get(key){return this.values[key]??null;}[Symbol.iterator](){return Object.entries(this.values)[Symbol.iterator]();}},WeakMap,JSON,Object,Array,String};
 const ctx=vm.createContext(sandbox);vm.runInContext(html.slice(start,end),ctx);
 const select=id=>vm.runInContext('v23MemberEdit='+JSON.stringify(id)+';',ctx);
 const submit=(id,values)=>{select(id||'new');handlers.submit({target:{id:'v23MemberForm',values},preventDefault(){},stopImmediatePropagation(){}});};
 const remove=id=>vm.runInContext('v23MemberAction({dataset:{v23Member:"delete",id:'+JSON.stringify(id)+'}})',ctx);
 return{st,alerts,submit,remove,get saves(){return sandbox.saves;},ctx};
}
test('native direct submission and delete enforce FAM15 without the presentation facade',()=>{
 for(const[actor,demo,target]of [[null,false,'child'],['child',true,'child'],['baby',true,'baby'],['pet',true,'pet']]){
  const h=nativeHarness(actor,demo),before=JSON.stringify(h.st.familyMembers);
  h.submit(target,{name:'TEST Changement interdit',birthdate:'',avatar:'👤',notes:'TEST'});
  h.remove(target);assert.equal(JSON.stringify(h.st.familyMembers),before);assert.equal(h.saves,0);assert.equal(h.alerts.length,2);
 }
 const spoof=nativeHarness('child',true),before=JSON.stringify(spoof.st.familyMembers);
 spoof.submit('child',{name:'TEST Enfant',birthdate:'',avatar:'👤',magicHouseId:'slytherin',magicHouseAlgorithm:'e06-v1'});
 assert.equal(JSON.stringify(spoof.st.familyMembers),before);assert.equal(spoof.saves,0,'Algorithm tags alone cannot grant E06 write capability');
});
test('FAM13 native parent cannot manually assign own or dependent House/Patronus results',()=>{
 for(const id of ['parent-a','child'])for(const values of [{magicHouseId:'slytherin'},{magicPatronusId:'otter',magicPatronusAlgorithm:'e06-v1'},{magicCeremony:'complete'}]){
  const h=nativeHarness('parent-a',true),before=JSON.stringify(h.st.familyMembers);
  h.submit(id,{name:row(id).name,birthdate:'',avatar:'👤',...values});
  assert.equal(JSON.stringify(h.st.familyMembers),before);assert.equal(h.saves,0,'Only recomputed E06 may assign results, even for a parent');assert.match(h.alerts[0],/questionnaires/);
 }
});
test('native direct allowed save preserves unknown fields and refuses direct adult creation',()=>{
 const h=nativeHarness('parent-a',true);h.st.familyMembers.find(x=>x.id==='child').opaque={keep:'TEST'};
 h.submit('child',{name:'TEST Camille Fictive',firstName:'TEST Camille',lastName:'Fictive',nickname:'TEST Petit',memberCategory:'child',notes:'TEST souvenir',species:'',birthdate:'',avatar:'🐉'});
 const saved=h.st.familyMembers.find(x=>x.id==='child');assert.equal(saved.id,'child');assert.equal(saved.firstName,'TEST Camille');assert.equal(saved.notes,'TEST souvenir');assert.equal(saved.opaque.keep,'TEST');assert.equal(h.saves,1);
 h.submit(null,{name:'TEST Parent neuf',memberCategory:'parent'});assert.equal(h.st.familyMembers.length,members.length);
 h.submit(null,{name:'TEST Animal neuf',firstName:'TEST Animal neuf',lastName:'',memberCategory:'pet',notes:'TEST animal',species:'chat'});assert.equal(h.st.familyMembers.length,members.length+1);assert.equal(h.st.familyMembers.at(-1).species,'chat');
 h.remove('test-created');assert.equal(h.st.familyMembers.length,members.length);
});
test('native save and delete failures restore the existing members and health references',()=>{
 const h=nativeHarness('parent-a',true),before=JSON.stringify(h.st);
 vm.runInContext('save=()=>{throw Error("TEST storage full")}',h.ctx);
 h.submit('child',{name:'TEST Nouveau nom',birthdate:'',avatar:'👤'});assert.equal(JSON.stringify(h.st),before);
 h.remove('child');assert.equal(JSON.stringify(h.st),before);
 h.submit(null,{name:'TEST animal',memberCategory:'pet'});assert.equal(JSON.stringify(h.st),before);
});
test('medical write permission resolves canonical or unique legacy attribution, and checks both sides of reassignment',()=>{
 const own={personId:'parent-a',person:'TEST Parent A'},other={personId:'parent-b',person:'TEST Parent B'},child={personId:'child',person:'TEST Enfant'};
 for(const actor of [null,'child','baby','pet']){const h=nativeHarness(actor,!!actor);h.ctx.medical=child;assert.equal(vm.runInContext('v23HealthPermissions(medical,false).canEdit',h.ctx),false);}
 const h=nativeHarness('parent-a',true);h.ctx.previous=other;h.ctx.next=child;
 assert.doesNotThrow(()=>vm.runInContext('v23AssertHealthWrite(previous,next,false)',h.ctx));
 h.ctx.previous=child;h.ctx.next=other;assert.doesNotThrow(()=>vm.runInContext('v23AssertHealthWrite(previous,next,false)',h.ctx));
 for(const medical of [own,other,child,{person:'TEST Enfant'}]){h.ctx.medical=medical;assert.equal(vm.runInContext('v23HealthPermissions(medical,false).canEdit',h.ctx),true);}
 for(const medical of [{personId:'missing',person:'TEST Enfant'},{person:'TEST Inconnu'}]){h.ctx.medical=medical;assert.equal(vm.runInContext('v23HealthPermissions(medical,true).canEdit',h.ctx),false);}
 h.ctx.medical={person:'Foyer'};assert.equal(vm.runInContext('v23HealthPermissions(medical,true).canEdit',h.ctx),true);assert.equal(vm.runInContext('v23HealthPermissions(medical,false).canEdit',h.ctx),false);
 h.st.familyMembers.push({id:'duplicate',name:'TEST Enfant',memberCategory:'child'});h.ctx.medical={person:'TEST Enfant'};assert.equal(vm.runInContext('v23HealthPermissions(medical,false).canEdit',h.ctx),false);
});

test('reserves: native member context carries the server category without inferring it from owner or registry role',()=>{
 const h=nativeHarness(),binding={verified:true,userId:'TEST-U',householdId:'TEST-H',memberId:'child',profile:{id:'child',memberCategory:'child'}};
 const api={connectionState:()=>({verified:true,verifying:false,access:'verified'}),access:{state:()=>binding},getContext:()=>({identityVerified:true,userId:'TEST-U',householdId:'TEST-H',memberId:'child',permissions:{canEdit:true,canMagic:true,canCreate:true,canManageDependents:true}})};
 h.ctx.window.DobbyFamilyUI=api;h.st.familyMembers.find(m=>m.id==='child').memberCategory='parent';
 const child=vm.runInContext('v23MemberPermissions("child")',h.ctx);assert.equal(child.canEdit,false);assert.equal(child.canCreate,false);assert.equal(child.canMagic,true);
 delete binding.profile.memberCategory;const missing=vm.runInContext('v23MemberPermissions("child")',h.ctx);assert.equal(missing.canEdit,false);assert.equal(missing.canMagic,false);
 binding.profile.memberCategory='parent';h.st.familyMembers.find(m=>m.id==='child').memberCategory='child';const parent=vm.runInContext('v23MemberPermissions("child")',h.ctx);assert.equal(parent.canEdit,true);
 delete binding.profile.id;const incomplete=vm.runInContext('v23MemberPermissions("child")',h.ctx);assert.equal(incomplete.canEdit,false);assert.equal(incomplete.canMagic,false);
});
