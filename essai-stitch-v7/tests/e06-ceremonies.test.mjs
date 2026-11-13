import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createDrafts} from '../onboarding-drafts.mjs';

const source=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const realm={window:{}};
vm.runInNewContext(source('../../essai-stitch-v5-famille/family-profile.js'),realm);
vm.runInNewContext(source('../../essai-stitch-v5-famille/family-member-policy.js'),realm);
const M=realm.window.DobbyMagicIdentity,P=realm.window.DobbyFamilyMemberPolicy;
const members=[{id:'self',name:'TEST Profil',memberCategory:'parent'},{id:'other',name:'TEST Autre parent',memberCategory:'parent'},{id:'child',name:'TEST Enfant',memberCategory:'child'}];
const context={demo:false,verified:true,userId:'user',householdId:'home',actorId:'self',memberCategory:'parent',members,permissions:{canEdit:true,canMagic:true,canCreate:true,canManageDependents:false}};

test('server-bound own member gains only explicit permissions; selected actors and other adults remain denied',()=>{
 assert.equal(P.permissions(members[0],context).canEdit,true);
 assert.equal(P.permissions(members[0],context).canMagic,true);
 assert.equal(P.permissions(members[1],context).canMagic,false);
 assert.equal(P.permissions(members[2],context).canEdit,false);
 assert.equal(P.permissions(members[2],{...context,permissions:{...context.permissions,canManageDependents:true}}).canEdit,true);
 for(const invalid of [{verified:false},{userId:null},{householdId:null},{actorId:'missing'},{permissions:{canEdit:false,canMagic:false}}])assert.equal(P.permissions(members[0],{...context,...invalid}).canEdit,false);
 assert.throws(()=>P.assertWrite(members[0],{magicHouseId:'gryffindor'},context),/questionnaires/);
});

test('manual and calculated results have distinct provenance and mixed choices complete without erasing opaque fields',()=>{
 const before={...members[0],opaque:{keep:true},magicProfile:{version:1,houseId:'slytherin',houseAlgorithmVersion:'e06-v1',future:true}};
 const manual=M.patch(before,{magicHouseId:'ravenclaw'});
 assert.equal(manual.magicProfile.houseSelectionSource,'manual');
 assert.equal(manual.magicProfile.houseAlgorithmVersion,undefined);
 const mixed=M.patch(manual,{magicPatronusId:'lynx',magicPatronusAlgorithm:'e06-v1'});
 assert.equal(mixed.magicProfile.patronusSelectionSource,'calculated');
 assert.equal(M.isCeremonyComplete(mixed),true);
 assert.equal(M.isCeremonyComplete({...mixed,magicProfile:{...mixed.magicProfile,patronusId:'missing'}}),false);
 assert.equal(mixed.magicProfile.future,true);assert.equal(mixed.opaque.keep,true);
 assert.equal(before.magicProfile.houseAlgorithmVersion,'e06-v1');
 assert.equal(M.isCeremonyComplete({...members[0],magicProfile:{version:1,houseId:'gryffindor',patronusId:'stag'}}),true,'Historical valid preferences do not need a repeat');
});

test('only the server-bound canonical member is resolved and all 24 real portrait IDs validate',()=>{
 assert.equal(M.linkedMember(members,{memberId:'other'}),null);
 assert.equal(M.linkedMember(members,{identityVerified:true,memberId:'self'}).id,'self');
 assert.equal(M.avatars.length,24);
 for(let n=1;n<=24;n++)assert.equal(M.patch(members[0],{magicAvatarId:'portrait-'+n}).magicProfile.avatarId,'portrait-'+n);
 assert.throws(()=>M.patch(members[0],{magicAvatarId:'portrait-25'}),/Avatar/);
 assert.equal(M.avatars[8].sprite.rows,4);assert.equal(M.avatars[8].sprite.row,0);
});

test('native manual writer validates catalogue IDs and grants its proof-backed form capability, while ordinary form spoofing remains blocked',()=>{
 const html=source('../../essai-stitch-v5-famille/index.html'),start=html.indexOf('let v23MemberEdit=null;'),end=html.indexOf('// No background services',start),handlers={},alerts=[];
 const st={familyMembers:structuredClone(members),famHealth:[],v23HealthMemberId:'self',extraPage:'health'};
 let form;
 const sandbox={window:{...realm.window,DobbyReview:{demoMemberId:'self'}},st,xhealth:()=>'',render(){},xuid:()=> 'test-created',save(){},alert:message=>alerts.push(message),confirm:()=>true,document:{addEventListener:(type,fn)=>handlers[type]=fn,createElement:()=>({}),getElementById(){const current=st.familyMembers.find(m=>m.id===vm.runInContext('v23MemberEdit',ctx));form={id:'v23MemberForm',values:{name:current.name,birthdate:current.birthdate||'',avatar:current.avatar||'👤'},elements:{avatar:{options:[{value:'👤'}],add(){}},birthdate:{}},append(input){this.values[input.name]=input.value;},requestSubmit(){handlers.submit({target:this,preventDefault(){},stopImmediatePropagation(){}});}};return form;}},FormData:class{constructor(node){this.values=node.values;}get(key){return this.values[key]??null;}[Symbol.iterator](){return Object.entries(this.values)[Symbol.iterator]();}},Option:class{},WeakMap,JSON,Object,Array,String};
 const ctx=vm.createContext(sandbox);vm.runInContext(html.slice(start,end),ctx);
 const api=sandbox.window.DobbyFamilyMembers;
 assert.equal(typeof api.saveMagicChoice,'function');
 api.saveMagicChoice('self','house','ravenclaw');
 assert.equal(st.familyMembers[0].magicProfile.houseSelectionSource,'manual');
 assert.throws(()=>api.saveMagicChoice('self','patronus','invented'),/invalide/);
 api.saveMagicChoice('self','patronus','dolphin');api.finishMagicCeremony('self');
 assert.equal(st.familyMembers[0].magicProfile.ceremonyStatus,'complete');
 vm.runInContext('v23MemberEdit="self"',ctx);
 handlers.submit({target:{id:'v23MemberForm',values:{name:'TEST Profil',birthdate:'',avatar:'👤',magicHouseId:'slytherin'}},preventDefault(){},stopImmediatePropagation(){}});
 assert.equal(st.familyMembers[0].magicProfile.houseId,'ravenclaw');assert.match(alerts.at(-1),/questionnaires/);
});

test('gallery selection and intro progress resume per canonical member and completion clears active resume',async()=>{
 const db=new Map(),drafts=createDrafts({context:()=>({user:'user',household:'home',epoch:1}),meta:async key=>db.get(key),updateMeta:async(key,change)=>{const next=change(db.get(key));db.set(key,structuredClone(next));return next;}});
 await drafts.load('self');
 await drafts.update(d=>{d.pending=true;d.step='onboarding-house-intro';d.selection={kind:'house',id:'ravenclaw'};});
 await drafts.load('other');assert.equal(drafts.read().pending,false);
 await drafts.load('self');assert.equal(drafts.read().selection.id,'ravenclaw');
 await drafts.complete();assert.equal(await drafts.resume(),null);assert.equal(drafts.read().pending,false);
});

test('verified native magical and own-profile writes use atomic server adapters before any local form mutation',async()=>{
 const html=source('../../essai-stitch-v5-famille/index.html'),start=html.indexOf('let v23MemberEdit=null;'),end=html.indexOf('const v23OldHealth=xhealth;',start);
 const st={familyMembers:structuredClone(members)},calls=[];
 let bound={verified:true,userId:'user',householdId:'home',memberId:'self',profile:{id:'self',memberCategory:'parent'},familyRevision:17};
 const api={connectionState:()=>({verified:true,verifying:false,access:'verified'}),getContext:()=>({userId:'user',householdId:'home',memberId:'self',identityVerified:true,permissions:{canMagic:true,canEdit:true}}),isModuleActive:()=>false,getModuleStatus:()=>'',access:{state:()=>bound,async updateMagic(args){calls.push(['magic',args]);st.familyMembers[0]=M.patch(st.familyMembers[0],args.values);return'self';},async updateMember(args){calls.push(['member',args]);st.familyMembers[0]=M.patch(st.familyMembers[0],args.values);return'self';}}};
 const native={window:{...realm.window,DobbyFamilyUI:api},DobbyFamilyUI:api,st,crypto:{randomUUID:()=> 'test-operation'},JSON,Object,Array,String};
 const nativeContext=vm.createContext(native);vm.runInContext(html.slice(start,end),nativeContext);native.DobbyFamilyMembers=native.window.DobbyFamilyMembers;
 native.eval=code=>vm.runInContext(code,nativeContext);
 await native.DobbyFamilyMembers.saveMagicChoice('self','house','hufflepuff');
 assert.equal(calls[0][0],'magic');assert.equal(calls[0][1].expectedRevision,17);assert.equal(calls[0][1].values.magicHouseId,'hufflepuff');assert.equal(st.familyMembers[0].magicProfile.houseSelectionSource,'manual');
 bound={...bound,householdId:'wrong'};
 assert.throws(()=>native.DobbyFamilyMembers.saveMagicChoice('self','house','ravenclaw'),/compte connecté/);assert.equal(calls.length,1);
 bound={...bound,householdId:'home'};
 const facade={window:{},document:{getElementById:()=>({contentWindow:native})},crypto:{randomUUID:()=> 'test-member-operation'}};
 vm.runInNewContext(source('../family-engine.js'),facade);
 const id=await facade.window.DobbyFamilyStitchEngine.saveMember('self',{magicAvatarId:'portrait-24'});
 assert.equal(id,'self');assert.equal(calls[1][0],'member');assert.equal(calls[1][1].values.magicAvatarId,'portrait-24');assert.equal(st.familyMembers[0].magicProfile.avatarId,'portrait-24');
 assert.throws(()=>facade.window.DobbyFamilyStitchEngine.saveMember('self',{magicHouseId:'ravenclaw'}),/questionnaires/);assert.equal(calls.length,2);
});
