import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createScoring} from '../onboarding-scoring.mjs';
import {createDrafts} from '../onboarding-drafts.mjs';
const cfg=JSON.parse(fs.readFileSync(new URL('../data/onboarding-scoring-v1.json',import.meta.url)));
const old=JSON.parse(fs.readFileSync(new URL('../../design/e06/references/scoring/dobby-e06-scoring-v1.json',import.meta.url)));
const context={user:'TEST-u',household:'TEST-h',epoch:1};
function fixture(raw){let saved=structuredClone(raw),writes=0;return {options:{context:()=>context,algorithmVersion:'e06-v2',meta:async()=>saved,updateMeta:async(k,change)=>{const next=change(saved);saved=structuredClone(next);writes++;return next;}},read:()=>structuredClone(saved),writes:()=>writes};}
const draft=(extra={})=>({step:'onboarding-house-result',index:5,house:['A','C','B','D','A','B'],patronus:[],identity:{firstName:'TEST'},done:{house:false,patronus:false},opaque:{keep:17},...extra});
const envelope=d=>({version:1,algorithmVersion:'e06-v1',owner:{user:context.user,household:context.household},active:{memberId:'m',step:d.step},drafts:{'member:m':d},opaqueEnvelope:true});

test('integrated q2 loads the exact approved copy and maps deliberate planning, adaptation, improvisation and consultation',()=>{
 const q=cfg.house.questions[1];assert.equal(q.id,'q2');assert.equal(q.title,'Une salle capricieuse');
 assert.equal(q.prompt,'Tu dois organiser une soirée dans une salle du château. Mais la salle choisie disparaît et réapparaît de manière imprévisible. Comment réagis-tu ?');
 assert.deepEqual(q.answers.map(a=>a.text),['Modifier la date en attendant que la situation se calme.','Trouver une autre salle.',"Conserver l'idée initiale : ces disparitions feront partie du spectacle !","Attendre l'avis du corps enseignant."]);
 assert.deepEqual(q.answers.map(a=>[a.id,a.primary,a.secondary]),[['A','anticipation','investigation'],['B','action','anticipation'],['C','action','investigation'],['D','lien','anticipation']]);
 assert.equal(cfg.house.baseQuestionCount,6);assert.equal(cfg.house.questions.length,7);assert.deepEqual(cfg.house.questions.filter(q=>q.id!=='q2'),old.house.questions.filter(q=>q.id!=='q2'));assert.deepEqual(cfg.patronus,old.patronus);
 const s=createScoring(cfg);assert.equal(s.version,'e06-v2');assert.equal(s.versionFor('house'),'e06-v2');assert.equal(s.versionFor('patronus'),'e06-v1');assert.equal(s.acceptsVersion('house','e06-v1'),true);assert.equal(s.acceptsVersion('house','e06-v2'),true);assert.equal(s.acceptsVersion('patronus','e06-v1'),true);assert.equal(s.acceptsVersion('house','future'),false);
});

test('revised scoring stays deterministic, reaches all four houses, and leaves Patronus rules unchanged',()=>{
 const s=createScoring(cfg),v1=createScoring(old),houses=new Set();for(let n=0;n<4096;n++){const answers=Array.from({length:6},(_,q)=>'ABCD'[(n>>q*2)&3]);for(const extra of [undefined,'A','B','C','D']){const result=s.house(answers,extra);assert.deepEqual(s.house(answers,extra),result);if(result.result)houses.add(result.result);}}
 assert.equal(houses.size,4);for(let n=0;n<1024;n++){const answers=Array.from({length:5},(_,q)=>'ABCD'[(n>>q*2)&3]);for(const extra of [undefined,'A','B','C','D'])assert.deepEqual(s.patronus(answers,extra),v1.patronus(answers,extra));}
});

test('old unconfirmed q2 is archived, requires an explicit new answer, and no read rewrites native metadata',async()=>{
 const original=envelope(draft()),f=fixture(original),a=createDrafts(f.options);await a.load('m');const current=a.read();assert.equal(current.house[1],null);assert.deepEqual(current.house.filter((_,i)=>i!==1),original.drafts['member:m'].house.filter((_,i)=>i!==1));assert.equal(current.index,1);assert.equal(current.step,'onboarding-house');assert.match(current.scoringNotice,/question.*changé/i);assert.deepEqual(current.scoringHistory['e06-v1'],original.drafts['member:m']);assert.deepEqual(f.read(),original);assert.equal(f.writes(),0);
 await a.update(d=>{d.house[1]='D';delete d.scoringNotice;});assert.equal(f.read().algorithmVersion,'e06-v2');assert.deepEqual(f.read().drafts['member:m'].scoringHistory['e06-v1'],original.drafts['member:m']);assert.equal(f.read().opaqueEnvelope,true);assert.equal(f.read().drafts['member:m'].opaque.keep,17);
 const b=createDrafts(f.options);await b.load('m');assert.equal(b.read().house[1],'D');assert.equal(b.read().scoringNotice,undefined);assert.equal(b.read().index,1);
});

test('old confirmed answers/results and untouched drafts survive adoption of the new version',async()=>{
 const d=draft({house:[],patronus:['A','B'],done:{house:true,patronus:false},step:'onboarding-patronus',index:1});const original=envelope(d),f=fixture(original),a=createDrafts(f.options);await a.load('m');assert.deepEqual(a.read(),d);assert.deepEqual(f.read(),original);await a.update(v=>v.patronus.push('C'));assert.equal(a.read().done.house,true);assert.equal(a.read().scoringHistory,undefined);assert.deepEqual(f.read().drafts['member:m'].patronus,['A','B','C']);
 const noQ2=draft({house:['A'],step:'onboarding-house',index:0}),g=fixture(envelope(noQ2)),b=createDrafts(g.options);await b.load('m');assert.deepEqual(b.read(),noQ2);
});

test('future draft versions remain blocked without an overwrite',async()=>{
 const original={...envelope(draft()),algorithmVersion:'e06-future'},f=fixture(original),a=createDrafts(f.options);await assert.rejects(a.load('m'),/incompatible/i);assert.deepEqual(f.read(),original);assert.equal(f.writes(),0);
});

test('native engine loading and finishing a previously confirmed v1 profile does not recalculate or replace its results',async()=>{
 const scoring=createScoring(cfg),d=draft({house:[],patronus:[],done:{house:true,patronus:true},step:'onboarding-final',index:0});let record=structuredClone(d),writes=[];
 const member={id:'m',name:'TEST historique',avatar:'🌿',opaque:7,magicProfile:{version:1,houseId:'slytherin',patronusId:'swan',houseAlgorithmVersion:'e06-v1',patronusAlgorithmVersion:'e06-v1',ceremonyStatus:'complete'}};
 const original=structuredClone(member),store={load:async()=>record,read:()=>structuredClone(record),guard(){},update:async fn=>{fn(record);return structuredClone(record);},get memberId(){return'm';}};
 const ui={connectionState:()=>({ready:true}),meta:async()=>null,getModuleStatus:()=>''};
 const engine={win:()=>({DobbyFamilyUI:ui}),read:()=>({members:[member]}),saveMember:(id,values)=>{writes.push(structuredClone(values));if(values.magicCeremony)member.magicProfile.ceremonyStatus=values.magicCeremony;}};
 const source=fs.readFileSync(new URL('../onboarding-engine.js',import.meta.url),'utf8').replace(/ const ready=Promise\.all\([^\n]+/," const ready=Promise.resolve().then(()=>{S=TEST_SCORING;store=TEST_STORE;});");
 const sandbox={window:{DobbyFamilyStitchEngine:engine,DobbyRegister:{until:async f=>assert.ok(f())}},TEST_SCORING:scoring,TEST_STORE:store};vm.runInNewContext(source,sandbox);const g=sandbox.window.DobbyOnboardingEngine;await g.load('m');assert.deepEqual(member,original);assert.equal(writes.length,0);await g.finish();assert.deepEqual(member,original);assert.equal(writes.length,1);assert.equal(writes[0].magicCeremony,'complete');assert.equal(writes[0].magicHouseId,undefined);assert.equal(writes[0].magicPatronusId,undefined);
 record.house=['A','A','A','A','A','A'];record.done.house=false;await g.confirm('house');assert.equal(writes[1].magicHouseAlgorithm,'e06-v2');assert.ok(writes[1].magicHouseId);assert.equal(record.done.house,true);
 record.patronus=['A','A','A','A','A','A'];record.done.patronus=false;await g.confirm('patronus');assert.equal(writes[2].magicPatronusAlgorithm,'e06-v1');assert.ok(writes[2].magicPatronusId);assert.equal(record.done.patronus,true);
});

test('native profile accepts house v2 confirmation, preserves historical attributions, and keeps unknown versions blocked',()=>{
 const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../../essai-stitch-v5-famille/family-profile.js',import.meta.url),'utf8'),sandbox);const p=sandbox.window.DobbyMagicIdentity;
 const member={id:'m',name:'TEST',opaque:{retain:true},magicProfile:{version:1,houseId:'slytherin',houseAlgorithmVersion:'e06-v1',patronusId:'swan',patronusAlgorithmVersion:'e06-v1',future:'keep'}};
 const updated=p.patch(member,{magicHouseId:'ravenclaw',magicHouseAlgorithm:'e06-v2'});assert.equal(updated.magicProfile.houseAlgorithmVersion,'e06-v2');assert.equal(updated.magicProfile.patronusAlgorithmVersion,'e06-v1');assert.equal(updated.magicProfile.future,'keep');assert.equal(updated.opaque.retain,true);assert.equal(member.magicProfile.houseAlgorithmVersion,'e06-v1');assert.equal(p.linkedMember([member]),null);
 assert.throws(()=>p.patch(member,{magicHouseId:'ravenclaw',magicHouseAlgorithm:'future'}),/version/i);assert.throws(()=>p.patch(member,{magicPatronusId:'swan',magicPatronusAlgorithm:'e06-v2'}),/version/i);
});


test('frozen V1 QA answer vectors still reach the named four Houses in V2; changed distribution is explicit',()=>{
 const qa=JSON.parse(fs.readFileSync(new URL('../../design/e06/references/scoring/qa-results.json',import.meta.url))),s=createScoring(cfg);
 for(const [label,example]of Object.entries(qa.house.one_reachable_example_each)){
  const ids=example.q1_to_q6.map((n,i)=>cfg.house.questions[i].answers[n].id),extra=example.q7===null?undefined:cfg.house.questions[6].answers[example.q7].id;
  assert.equal(s.house(ids,extra).result,label);
 }
 const distribution=Object.fromEntries(cfg.house.labels.map(x=>[x,0]));
 for(let n=0;n<4096;n++){const ids=Array.from({length:6},(_,q)=>'ABCD'[(n>>q*2)&3]);for(const extra of 'ABCD')distribution[s.house(ids,extra).result]++;}
 // Counts cross-checked using the independent historical Python rule functions
 // with only the newly approved q2 axes supplied, without modifying their source.
 assert.deepEqual(distribution,{gryffondor:4646,serpentard:4505,serdaigle:3830,poufsouffle:3403});
});
