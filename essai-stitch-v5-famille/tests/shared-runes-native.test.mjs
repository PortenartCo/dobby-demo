import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import * as core from '../family-missions-core.mjs';
const original=fs.readFileSync(new URL('../family-missions.js',import.meta.url),'utf8');
// Substitute the module loader only; every editor, toggle and delete handler is
// the shipped source, running against the real native domain module.
const source=original.replace(/const core=await import\('[^']+'\);/, 'const core=window.DobbyMissionTestCore;');
assert.notEqual(source,original);
const date='2026-11-11T12:00:00.000Z',clone=x=>structuredClone(x);
const mission=extra=>({id:'native-one',title:'TEST — Mission',category:'Famille',due:'',note:'',status:'open',assigneeId:'member-a',effort:'light',rewardVersion:1,createdAt:date,completedAt:'',...extra});
async function native({v2=true,shared=true,initial=mission()}={}){
 const listeners=new Map(),alerts=[],elements=new Map(),st={page:'family',manualMissions:[initial],runeCredits:[],runeRequests:[],familyMembers:[{id:'member-a',name:'TEST A'},{id:'member-b',name:'TEST B'}],runeSyncRequired:shared};let submit;
 const input=()=>({value:'',addEventListener(){},focus(){}}),form={elements:new Proxy({}, {get:(obj,key)=>obj[key]||(obj[key]=input())}),querySelector:()=>input(),addEventListener:(type,fn)=>{if(type==='submit')submit=fn;}};
 const context={st,crypto:webcrypto,window:{DobbyMissionTestCore:core,DobbySharedRunesV2:{available:()=>v2},DobbyFamilyUI:{esc:String,isModuleConfigured:()=>shared,getContext:()=>shared?{}:null,getModuleStatus:()=>''},addEventListener(){}},
  document:{hidden:false,getElementById:id=>elements.get(id)||null,createElement:()=>({hidden:true,querySelector:()=>form}),body:{append:el=>elements.set(el.id,el)},addEventListener:(type,fn)=>listeners.set(type,fn)},save(){},render(){},console,alert:msg=>alerts.push(msg),confirm:()=>true,setInterval:()=>1,clearInterval(){},FormData:class{constructor(form){this.form=form;}get(key){return this.form.values[key]??'';}}};
 await vm.runInNewContext(source,context,{filename:'family-missions.js'});
 return{st,alerts,click(action,id='native-one'){const button={dataset:{fmsAction:action,id}};listeners.get('click')({target:{closest:()=>button},preventDefault(){},stopImmediatePropagation(){}});},save(values){form.values={missionKey:'native-one',title:st.manualMissions[0].title,category:'Famille',due:'',note:'',assigneeId:st.manualMissions[0].assigneeId,effort:st.manualMissions[0].effort,recurrenceFrequency:'unique',...values};submit({target:{getAttribute:()=> 'fmsForm',values:form.values},preventDefault(){},stopImmediatePropagation(){}});},layer:()=>elements.get('fmsLayer')};
}

test('verified V2 native shared writer queues +10/0/10 and preserves sticky sync instead of confirming offline',async()=>{
 const c=await native();for(const expected of ['done','open','done']){c.click('toggle');assert.equal(c.st.manualMissions[0].status,expected);assert.equal(c.st.runeCredits.length,0);}assert.equal(c.st.runeRequests.length,3);assert.deepEqual(c.st.runeRequests.map(row=>row.eventId||row.missionId),['native-one','native-one~0~reversal','native-one~1~grant']);assert.equal(c.st.runeSyncRequired,true);assert.equal(c.alerts.length,0);
});

test('unavailable server protocol preserves legacy shared reopening guard and all records',async()=>{
 const c=await native({v2:false});c.click('toggle');const before=clone(c.st);c.click('toggle');assert.deepEqual(clone(c.st),before);assert.match(c.alerts.at(-1),/bloquée/);
});

test('shared unconfirmed grant blocks changing beneficiary, reward and deleting before mutation, retains form',async()=>{
 const c=await native();c.click('toggle');const before=clone(c.st);c.click('edit');c.save({assigneeId:'member-b'});assert.deepEqual(clone(c.st),before);assert.match(c.alerts.at(-1),/Synchronisez l’attribution en attente/);assert.equal(c.layer().hidden,false);c.save({effort:'major'});assert.deepEqual(clone(c.st),before);c.click('delete');assert.deepEqual(clone(c.st),before);assert.match(c.alerts.at(-1),/avant de supprimer/);c.save({note:'TEST editable note'});assert.equal(c.st.manualMissions[0].note,'TEST editable note');assert.equal(c.st.runeRequests.length,1);
});

test('confirmed reward permits later beneficiary/amount edit without transferring or rewriting old grant',async()=>{
 const c=await native();c.click('toggle');c.st.runeCredits=core.runes.acceptRequests([],c.st.runeRequests,2);c.st.runeRequests=[];const old=clone(c.st.runeCredits);c.click('edit');c.save({assigneeId:'member-b',effort:'custom',customRunes:'0'});assert.equal(c.st.manualMissions[0].customRunes,0);assert.equal(c.st.manualMissions[0].assigneeId,'member-b');assert.deepEqual(clone(c.st.runeCredits),old);c.click('toggle');assert.equal(c.st.runeRequests[0].amount,10);assert.equal(c.st.runeRequests[0].memberId,'member-a');
});

test('unshared native custom reward and deletion keep their original local behavior',async()=>{
 const c=await native({shared:false,v2:false,initial:mission({customRunes:0})});c.click('toggle');assert.equal(c.st.runeCredits[0].amount,0);c.click('edit');c.save({assigneeId:'member-b',effort:'custom',customRunes:'17'});assert.equal(c.st.manualMissions[0].customRunes,17);c.click('delete');assert.equal(c.st.manualMissions.length,0);assert.equal(c.st.runeCredits[0].amount,0);
});


test('a queued reversal blocks deletion before mutation while a confirmed ordinary deletion retains credits',async()=>{
 const c=await native();c.click('toggle');c.st.runeCredits=core.runes.acceptRequests([],c.st.runeRequests,2);c.st.runeRequests=[];c.click('toggle');const before=clone(c.st);c.click('delete');assert.deepEqual(clone(c.st),before);assert.match(c.alerts.at(-1),/Synchronisez l’attribution en attente avant de supprimer/);c.st.runeCredits=core.runes.acceptRequests(c.st.runeCredits,c.st.runeRequests,3);c.st.runeRequests=[];c.click('delete');assert.equal(c.st.manualMissions.length,0);assert.equal(c.st.runeCredits.length,2);
});


test('shared verified completion rejects an unknown responsible member before creating a poisoned pending status',async()=>{
 const c=await native({initial:mission({assigneeId:'missing-member'})}),before=clone(c.st);c.click('toggle');assert.deepEqual(clone(c.st),before);assert.match(c.alerts.at(-1),/Choisissez un responsable présent dans le foyer/);
});
