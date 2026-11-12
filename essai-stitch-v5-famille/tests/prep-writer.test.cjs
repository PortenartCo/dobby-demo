const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const source=new URL('../family-preparations.js',`file://${__filename}`),agendaSource=new URL('../family-agenda.js',`file://${__filename}`);
const json=value=>JSON.parse(JSON.stringify(value));
const row=(label='Gourde')=>({label,qty:1,unit:'pièce',done:false});
function setup(state={}){
 const st={familyEvents:[{id:'event-1',title:'Sortie',date:'2026-11-12',category:'Famille'}],...state},saved=[];
 const ctx=vm.createContext({st,crypto,window:{},save:()=>saved.push(json(st)),render:()=>{}});
 if(fs.existsSync(source))vm.runInContext(fs.readFileSync(source,'utf8'),ctx);
 assert.ok(ctx.window.DobbyFamilyPreparations,'the native preparations API is loaded');
 return{st,saved,ctx,P:ctx.window.DobbyFamilyPreparations};
}
function add(P,name='Sortie',items=[row()]){return P.saveTemplate(null,{name,items},P.read().snapshot);}
function snapshot(P,eventId='event-1',templateId){const t=templateId||add(P).savedId;P.stageEvent(eventId,t);return P.read().eventPreparations.find(r=>r.eventId===eventId);}

test('template CRUD uses stable identities and preserves unknown row and item metadata',()=>{
 const {P,st,saved}=setup(),created=add(P),id=created.savedId,itemId=created.templates[0].items[0].id;
 assert.ok(id&&itemId);assert.equal(saved.length,1);st.familyPreparationTemplates[0].future={kept:true};st.familyPreparationTemplates[0].items[0].future='kept';
 const values={name:'Sortie modifiée',items:[{...row('Gourde métal'),id:itemId,qty:'0.25'}]};P.saveTemplate(id,values,P.read().snapshot);
 assert.equal(st.familyPreparationTemplates[0].id,id);assert.equal(st.familyPreparationTemplates[0].items[0].id,itemId);assert.equal(st.familyPreparationTemplates[0].items[0].qty,.25);assert.equal(st.familyPreparationTemplates[0].items[0].future,'kept');assert.deepEqual(st.familyPreparationTemplates[0].future,{kept:true});
 const copy=P.duplicateTemplate(id,P.read().snapshot);assert.notEqual(copy.savedId,id);assert.notEqual(copy.templates[1].items[0].id,itemId);assert.deepEqual(json(copy.templates[1].future),{kept:true});
 P.deleteTemplate(id,P.read().snapshot);assert.equal(st.familyPreparationTemplates.length,1);assert.equal(st.familyPreparationTemplates[0].id,copy.savedId);
 const detached=P.read();detached.templates[0].name='No mutation';assert.notEqual(st.familyPreparationTemplates[0].name,'No mutation');
});

test('event snapshot copies independent item IDs and progress survives template edit and deletion',()=>{
 const {P,st,saved}=setup(),template=add(P),id=template.savedId,event=snapshot(P,'event-1',id),itemId=event.items[0].id;
 assert.equal(saved.length,1,'staging joins the native event transaction without a second save');assert.notEqual(itemId,template.templates[0].items[0].id);
 P.saveEventItems('event-1',[{...event.items[0],done:true}],P.read().snapshot);const current=P.read().eventPreparations[0];
 P.saveTemplate(id,{name:'Autre',items:[row('Autre objet')]},P.read().snapshot);P.deleteTemplate(id,P.read().snapshot);
 assert.equal(st.familyEventPreparations[0].items[0].label,'Gourde');assert.equal(st.familyEventPreparations[0].items[0].done,true);assert.equal(st.familyEventPreparations[0].items[0].id,itemId);
 P.stageEvent('event-1','');assert.deepEqual(json(st.familyEventPreparations[0]),json(current));assert.throws(()=>P.stageEvent('event-1','different'),/exist|remplac|conserv/i);
});

test('stale template and checklist edits reject without losing concurrent content or caller drafts',()=>{
 const {P,st}=setup(),created=add(P),old=P.read().snapshot;st.familyPreparationTemplates[0].name='Autre appareil';
 const values={name:'Mon brouillon',items:[row()]};assert.throws(()=>P.saveTemplate(created.savedId,values,old),/modifi/i);assert.throws(()=>P.deleteTemplate(created.savedId,old),/modifi/i);assert.throws(()=>P.duplicateTemplate(created.savedId,old),/modifi/i);assert.equal(values.name,'Mon brouillon');assert.equal(st.familyPreparationTemplates[0].name,'Autre appareil');
 const event=snapshot(P,'event-1',created.savedId),before=P.read().snapshot;st.familyEventPreparations[0].items[0].done=true;assert.throws(()=>P.saveEventItems('event-1',event.items,before),/modifi/i);assert.equal(st.familyEventPreparations[0].items[0].done,true);
});

test('identical registry data cannot authorize a draft after an account, household or epoch switch',()=>{
 for(const changed of ['epoch','userId','householdId']){
  const {P,st,ctx,saved}=setup(),connection={epoch:1,userId:'actor-a',householdId:'household-a'};
  ctx.window.DobbyFamilyUI={connectionState:()=>({...connection}),getContext:()=>({userId:connection.userId,householdId:connection.householdId})};
  const created=add(P),event=snapshot(P,'event-1',created.savedId),expected=P.read().snapshot,before=json(st),saveCount=saved.length;
  connection[changed]=changed==='epoch'?2:'changed';
  assert.throws(()=>P.saveTemplate(created.savedId,{name:'Stale draft',items:[]},expected),/modifi|foyer|compte/i);
  assert.throws(()=>P.saveTemplate(null,{name:'Stale new draft',items:[]},expected),/modifi|foyer|compte/i);
  assert.throws(()=>P.deleteTemplate(created.savedId,expected),/modifi|foyer|compte/i);
  assert.throws(()=>P.duplicateTemplate(created.savedId,expected),/modifi|foyer|compte/i);
  assert.throws(()=>P.saveEventItems('event-1',event.items,expected),/modifi|foyer|compte/i);
  assert.deepEqual(json(st),before);assert.equal(saved.length,saveCount);
 }
});

test('context-only clients reject switched household drafts and local mode remains writable',()=>{
 const {P,st,ctx}=setup();let context={userId:'actor-a',householdId:'household-a'};
 ctx.window.DobbyFamilyUI={getContext:()=>context};const expected=P.read().snapshot;context={...context,householdId:'household-b'};
 assert.throws(()=>P.saveTemplate(null,{name:'Stale draft',items:[]},expected),/modifi|foyer|compte/i);assert.equal(st.familyPreparationTemplates,undefined);
 ctx.window.DobbyFamilyUI={connectionState:()=>({epoch:3,userId:null,householdId:null}),getContext:()=>null};
 assert.ok(add(P).savedId);
});

test('new item extensions are copied without sharing caller objects and duplicates retain version one',()=>{
 const {P,st}=setup(),input={...row(),future:{source:'retained'}},created=add(P,'Metadata',[input]);
 assert.deepEqual(json(created.templates[0].items[0]).future,{source:'retained'});input.future.source='caller edit';
 assert.equal(st.familyPreparationTemplates[0].items[0].future.source,'retained');
 const duplicated=P.duplicateTemplate(created.savedId,P.read().snapshot);assert.equal(duplicated.templates[1].version,1);assert.deepEqual(json(duplicated.templates[1].items[0].future),{source:'retained'});
 const event=snapshot(P,'event-1',created.savedId);P.saveEventItems('event-1',[...event.items,{...row('Autre objet'),future:{event:'retained'}}],P.read().snapshot);
 assert.deepEqual(json(st.familyEventPreparations[0].items[1].future),{event:'retained'});
});

test('unknown protocol, invalid registries and unsupported rows block every write without changing data',()=>{
 const invalid=[{familyPreparationsVersion:2},{familyPreparationTemplates:null},{familyEventPreparations:{}},{familyPreparationTemplates:[{id:'x',version:2,name:'Future',items:[]}]},{familyEventPreparations:[{id:'x',eventId:'different',version:1,templateId:'x',items:[]}]},{familyPreparationTemplates:[{id:'x',version:1,name:'Valid',items:[{id:'a',...row(),qty:.001}]}]}];
 for(const state of invalid){const {P,st,saved}=setup(state),before=json(st);assert.throws(()=>P.saveTemplate(null,{name:'New',items:[]},''));assert.deepEqual(json(st),before);assert.equal(saved.length,0);}
});

test('validation rejects invalid required fields, duplicate ids, excessive items and unsupported precision',()=>{
 const {P,st,saved}=setup();
 const bad=[{name:' ',items:[]},{name:'x'.repeat(141),items:[]},{name:'Valid',items:[row(' ')]},{name:'Valid',items:[row('x'.repeat(201))]},{name:'Valid',items:[{...row(),unit:'x'.repeat(41)}]},{name:'Valid',items:[{...row(),qty:-1}]},{name:'Valid',items:[{...row(),qty:1000000}]},{name:'Valid',items:[{...row(),qty:.001}]},{name:'Valid',items:[{...row(),qty:'1e2'}]},{name:'Valid',items:[{...row(),done:true}]},{name:'Valid',items:[{...row(),id:'same'},{...row(),id:'same'}]},{name:'Valid',items:Array.from({length:201},()=>row())}];
 for(const values of bad)assert.throws(()=>P.saveTemplate(null,values,P.read().snapshot),JSON.stringify(values));
 assert.equal(st.familyPreparationTemplates,undefined);assert.equal(saved.length,0);
 const out=add(P,'Valide',[{...row(),qty:0},{...row(),qty:999999},{...row(),qty:null}]);assert.deepEqual(json(out.templates[0].items.map(x=>x.qty)),[0,999999,null]);
});

test('save failure rolls back native registries including initially absent fields',()=>{
 const {P,st,ctx}=setup();ctx.save=()=>{throw Error('quota');};assert.throws(()=>add(P),/quota/);assert.equal(st.familyPreparationTemplates,undefined);
 ctx.save=()=>{};const created=add(P);snapshot(P,'event-1',created.savedId);const before=json(st);ctx.save=()=>{throw Error('quota');};
 assert.throws(()=>P.saveTemplate(created.savedId,{name:'Changed',items:[]},P.read().snapshot),/quota/);assert.throws(()=>P.deleteTemplate(created.savedId,P.read().snapshot),/quota/);assert.throws(()=>P.duplicateTemplate(created.savedId,P.read().snapshot),/quota/);assert.throws(()=>P.saveEventItems('event-1',[],P.read().snapshot),/quota/);assert.deepEqual(json(st),before);
});

test('numeric quantities never admit tiny fractional values beyond native precision',()=>{
 const {P}=setup();for(const qty of [0.0000000001,1.0000000001,NaN,Infinity])assert.throws(()=>add(P,'Quantité',[{...row(),qty}]));
 assert.equal(add(P,'Centimes',[{...row(),qty:.29}]).templates[0].items[0].qty,.29);
});

async function agendaSetup(state={}){
 const result=setup(state),{ctx,st}=result,listeners={},elements={},alerts=[];
 const activeForm={values:{},getAttribute:key=>key==='id'?'fpEventForm':null,addEventListener:(kind,handler)=>{activeForm[kind]=handler;}};
 const layer={hidden:true,querySelector:selector=>selector==='#fpEventForm'?activeForm:{focus(){}}};
 Object.defineProperty(layer,'innerHTML',{set(value){layer.html=value;activeForm.values.id=value.match(/name="id" value="([^"]*)"/)?.[1]||'';}});
 ctx.document={getElementById:id=>elements[id]||null,createElement:()=>layer,body:{append(value){elements[value.id]=value;}},addEventListener:(kind,handler)=>{listeners[kind]=handler;}};
 ctx.alert=message=>alerts.push(String(message));ctx.confirm=()=>true;ctx.FormData=class{constructor(form){this.form=form;}get(key){return this.form.values[key]??null;}};
 ctx.__agendaCore=await import('../family-agenda-core.mjs');st.page='none';
 await vm.runInContext(fs.readFileSync(agendaSource,'utf8').replace("await import('./family-agenda-core.mjs?v=20261108-7')",'__agendaCore'),ctx);
 function click(action,id){listeners.click({target:{closest:()=>({dataset:{fpAction:action,id}})},preventDefault(){},stopImmediatePropagation(){}});}
 function submit(values={}){activeForm.values={...activeForm.values,title:'Sortie',date:'2026-11-12',time:'',category:'Famille',person:'',location:'',note:'',...values};activeForm.submit({target:activeForm,preventDefault(){},stopImmediatePropagation(){}});}
 return{...result,click,submit,alerts,layer};
}

test('native event submit persists event and independent preparation together, while failure keeps draft open',async()=>{
 const {P,st,ctx,saved,click,submit,alerts,layer}=await agendaSetup(),created=add(P);click('new');const before=json(st);ctx.save=()=>{throw Error('quota');};submit({preparationTemplateId:created.savedId});
 assert.equal(alerts.at(-1),'quota');assert.deepEqual(json(st),before);assert.equal(layer.hidden,false);
 ctx.save=()=>saved.push(json(st));submit({preparationTemplateId:created.savedId});assert.equal(st.familyEvents.length,2);assert.equal(st.familyEventPreparations.length,1);assert.equal(st.familyEventPreparations[0].eventId,st.familyEvents[1].id);assert.equal(saved.length,2);assert.equal(saved[1].familyEventPreparations.length,1);assert.equal(layer.hidden,true);
});

test('native event edits preserve progress and deletion rolls back both records if persistence fails',async()=>{
 const {P,st,ctx,click,submit,alerts}=await agendaSetup();snapshot(P);st.familyEventPreparations[0].items[0].done=true;click('edit','event-1');submit({title:'Nouvelle date',date:'2026-11-13',preparationTemplateId:''});assert.equal(st.familyEventPreparations[0].items[0].done,true);
 const before=json(st);ctx.save=()=>{throw Error('quota');};click('delete','event-1');assert.equal(alerts.at(-1),'quota');assert.deepEqual(json(st),before);
 ctx.save=()=>{};click('delete','event-1');assert.equal(st.familyEvents.length,0);assert.equal(st.familyEventPreparations.length,0);
});
