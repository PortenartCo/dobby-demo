const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const source=new URL('../family-house.js',`file://${__filename}`),json=value=>JSON.parse(JSON.stringify(value));
function setup(state={}){
 const st={houseItems:[],houseLogs:[],houseDocs:[],familyMembers:[{id:'parent',memberCategory:'parent'}],...state},saved=[],files=new Map();
 const connection={epoch:1,userId:'user',householdId:'home',memberId:'parent',access:'verified',identityVerified:true},live={...connection,permissions:{canEdit:true}};
 const api={getContext:()=>({...live}),connectionState:()=>({...connection})};
 const env=vm.createContext({st,crypto,Blob,Uint8Array,window:{DobbyFamilyUI:api},save:()=>saved.push(json(st)),render:()=>{},houseStore:async(blob,key)=>{files.set(key,blob);},houseRead:async(key,remove)=>remove?files.delete(key):files.get(key)});
 if(fs.existsSync(source))vm.runInContext(fs.readFileSync(source,'utf8'),env);
 assert.ok(env.window.DobbyFamilyHouse,'native Maison writer exists');
 return{st,saved,files,connection,live,api,env,H:env.window.DobbyFamilyHouse};
}
const plan=(id='flue')=>({id,title:id,lastKnownDate:'2024-02-29',interval:{value:12,unit:'months'},nextDateOverride:''});
const add=H=>H.save(null,{name:'Chaudière',maintenancePlans:[plan(),{...plan('boiler'),interval:{value:36,unit:'months'}}]},H.snapshot());
const file=(name='original.pdf')=>Object.assign(new Blob(['%PDF-1.4\nfixture'],{type:'application/pdf'}),{name});

test('native edits preserve IDs, unknown metadata, legacy dates and document references after reload',async()=>{
 const {H,st,saved,env}=setup({houseItems:[{id:'old',name:'Ancien',purchased:'31/02/2024',interval:'12',lastMaintenance:'2024-02-29',future:{kept:true},serialNumber:'AB-12'}],houseDocs:[{id:'legacy',itemId:'old',name:'original.pdf'}]});
 assert.equal(await env.window.DobbyHouseReady,H);H.save('old',{name:'Modifié',purchased:'31/02/2024',manufacturerReference:'REF'},H.snapshot('old'));
 assert.equal(st.houseItems[0].id,'old');assert.equal(st.houseItems[0].purchased,'31/02/2024');assert.equal(st.houseItems[0].serialNumber,'AB-12');assert.deepEqual(json(st.houseItems[0].future),{kept:true});assert.equal(st.houseDocs[0].id,'legacy');
 assert.equal(setup(saved.at(-1)).st.houseItems[0].manufacturerReference,'REF');assert.equal(st.houseLogs.length,0);
});

test('full program edits preserve nested extensions and removal requires explicit confirmation with history detachment',()=>{
 const {H,st}=setup(),id=add(H);st.houseItems[0].maintenancePlans[0].interval.page=4;st.houseItems[0].maintenancePlans[0].future={kept:true};
 H.save(id,{maintenancePlans:[{...plan(),title:'Ramonage'},plan('boiler')]},H.snapshot(id));
 assert.equal(st.houseItems[0].maintenancePlans[0].interval.page,4);assert.equal(st.houseItems[0].maintenancePlans[0].future.kept,true);
 const logId=H.saveLog(id,null,{planId:'flue',date:'2025-01-31',description:'Effectué'},H.snapshot(id));st.houseDocs.push({id:'proof',itemId:id,planId:'flue',logId:logId,name:'proof.pdf'});
 assert.throws(()=>H.save(id,{maintenancePlans:[plan('boiler')]},H.snapshot(id)),/confirm|historique/i);
 H.save(id,{maintenancePlans:[plan('boiler')]},{snapshot:H.snapshot(id),confirmPlanRemoval:true});
 assert.equal(st.houseLogs[0].planId,null);assert.equal(st.houseLogs[0].formerPlanId,'flue');assert.equal(st.houseDocs[0].formerPlanId,'flue');assert.equal(st.houseDocs[0].logId,logId);assert.equal(st.houseLogs[0].description,'Effectué');
});

test('intervention edits and removal keep old unclassified logs and linked documents recoverable',()=>{
 const {H,st}=setup(),id=add(H);st.houseLogs.push({id:'legacy',itemId:id,date:'date ancienne',note:'Conserver',future:9});
 const logId=H.saveLog(id,null,{planId:'boiler',date:'2025-03-31',type:'Révision',description:'Travaux',provider:'Artisan',amount:99,notes:'Note'},H.snapshot(id));
 assert.equal(st.houseItems[0].maintenancePlans[0].lastKnownDate,'2024-02-29');assert.equal(st.houseLogs.find(x=>x.id===logId).performed,true);
 H.saveLog(id,'legacy',{note:'Modifié'},H.snapshot(id));assert.equal(st.houseLogs[0].date,'date ancienne');assert.equal(st.houseLogs[0].future,9);assert.equal(st.houseLogs[0].planId,undefined);
 st.houseDocs.push({id:'proof',itemId:id,logId,name:'proof.pdf'});H.deleteLog(id,logId,H.snapshot(id));assert.equal(st.houseLogs.length,1);assert.equal(st.houseDocs[0].logId,null);assert.equal(st.houseDocs[0].formerLogId,logId);
});

test('all mutations reject stale rows, changed context, child actors and read-only permissions',async()=>{
 const {H,st,connection,live,env,files}=setup(),id=add(H),expected=H.snapshot(id);st.houseLogs.push({id:'new',itemId:id,date:'2025-01-01',note:'Concurrent'});
 assert.throws(()=>H.save(id,{name:'Stale'},expected),/modifi|version/i);assert.throws(()=>H.save(null,{name:'No snapshot'}),/modifi|version/i);
 const current=H.snapshot(id);connection.epoch++;assert.throws(()=>H.save(id,{name:'Scope'},current),/modifi|foyer/i);
 for(const mode of ['child','denied','unverified','readonly']){
  st.familyMembers[0].memberCategory=mode==='child'?'child':'parent';live.permissions.canEdit=mode!=='denied';connection.identityVerified=mode!=='unverified';live.identityVerified=mode!=='unverified';env.window.parent={DobbyFamilyStitch:{sharedReadOnly:()=>mode==='readonly'}};
  const token=H.snapshot(id);assert.throws(()=>H.save(id,{name:'Forbidden'},token),/parent|lecture|vérifi|autorisé/i);assert.throws(()=>H.saveLog(id,null,{date:'2025-01-01',note:'Forbidden'},token),/parent|lecture|vérifi|autorisé/i);await assert.rejects(H.addDocuments(id,[file()],{},token),/parent|lecture|vérifi|autorisé/i);await assert.rejects(H.delete(id,token),/parent|lecture|vérifi|autorisé/i);
 }
 assert.equal(st.houseItems[0].name,'Chaudière');assert.equal(files.size,0);
});

test('validation rejects bad dates, amounts, foreign program IDs and malformed intervals before mutation',()=>{
 const {H,st}=setup(),id=add(H),other=H.save(null,{name:'Other',maintenancePlans:[plan('other-plan')]},H.snapshot()),before=json(st);
 for(const values of [{name:''},{purchased:'2026-02-30'},{maintenancePlans:[{...plan(),interval:{value:0,unit:'months'}}]},{maintenancePlans:[{...plan(),interval:{value:1.5,unit:'years'}}]},{maintenancePlans:[plan('other-plan')]}]) assert.throws(()=>H.save(id,values,H.snapshot(id)),/nom|date|programme|fréquence|identit/i);
 for(const values of [{date:'2026-02-30',note:'Bad'},{date:'2026-01-01',planId:'other-plan',note:'Bad'},{date:'2026-01-01',amount:-1,note:'Bad'},{date:'2026-01-01',amount:'10',note:'Bad'}]) assert.throws(()=>H.saveLog(id,null,values,H.snapshot(id)),/date|programme|montant/i);
 assert.ok(other);assert.deepEqual(json(st),before);
});

test('failed native saves roll back equipment, logs, plan detachments and document metadata',async()=>{
 const {H,st,env,files}=setup(),id=add(H),logId=H.saveLog(id,null,{planId:'flue',date:'2025-01-01',note:'Proof'},H.snapshot(id));
 const [docId]=await H.addDocuments(id,[file()],{planId:'flue',logId},H.snapshot(id)),before=json(st);env.save=()=>{throw Error('quota');};
 assert.throws(()=>H.save(id,{maintenancePlans:[]},{snapshot:H.snapshot(id),confirmPlanRemoval:true}),/quota/);assert.throws(()=>H.saveLog(id,logId,{note:'Change'},H.snapshot(id)),/quota/);assert.throws(()=>H.deleteLog(id,logId,H.snapshot(id)),/quota/);await assert.rejects(H.removeDocument(docId,H.snapshot(id)),/quota/);await assert.rejects(H.delete(id,H.snapshot(id)),/quota/);await assert.rejects(H.addDocuments(id,[file()],{},H.snapshot(id)),/quota/);
 assert.deepEqual(json(st),before);assert.equal(files.size,1);assert.ok(files.has(docId));
});

test('multiple local documents retain native IDs, validate binary type and open legacy bytes without network',async()=>{
 const {H,st,files}=setup({houseItems:[{id:'old',name:'Old'}],houseDocs:[{id:'legacy-doc',itemId:'old',name:'legacy.pdf'}]}),old=file('legacy.pdf');files.set('legacy-doc',old);
 const ids=await H.addDocuments('old',[file('first.pdf'),file('second.pdf')],[{kind:'Facture'},{kind:'Manuel'}],H.snapshot('old'));
 assert.equal(st.houseDocs.length,3);assert.equal(ids.length,2);assert.equal(await H.openDocument('legacy-doc'),old);assert.equal(await H.openDocument(ids[1]),files.get(ids[1]));assert.equal(st.houseDocs[1].localOnly,true);
 await assert.rejects(H.addDocuments('old',[Object.assign(new Blob(['<html>bad</html>'],{type:'application/pdf'}),{name:'fake.pdf'})],{},H.snapshot('old')),/PDF|type|contenu/i);
 await assert.rejects(H.addDocuments('old',[Object.assign(new Blob(['x'],{type:'text/html'}),{name:'bad.html'})],{},H.snapshot('old')),/PDF|image|type/i);
 await assert.rejects(H.addDocuments('old',[new Blob([new Uint8Array(10485761)],{type:'application/pdf'})],{},H.snapshot('old')),/10 Mo|taille/i);
 await H.removeDocument(ids[0],H.snapshot('old'));assert.equal(files.has(ids[0]),false);assert.equal(files.get('legacy-doc'),old);
});

test('async document staging rejects scope, row, permission and role changes then cleans only staged IDs',async()=>{
 for(const change of ['scope','row','permission','child']){
  const {H,st,connection,live,env,files}=setup(),id=add(H),old=file('old.pdf');files.set('unrelated',old);let release;
  env.houseStore=async(blob,key)=>{files.set(key,blob);await new Promise(resolve=>release=resolve);};
  const pending=H.addDocuments(id,[file()],{},H.snapshot(id));while(!release)await new Promise(resolve=>setImmediate(resolve));
  if(change==='scope')connection.householdId='other';if(change==='row')st.houseItems[0].notes='Concurrent';if(change==='permission')live.permissions.canEdit=false;if(change==='child')st.familyMembers[0].memberCategory='child';release();
  await assert.rejects(pending,/modifi|foyer|parent|lecture/i);assert.equal(st.houseDocs.length,0);assert.equal(files.size,1);assert.equal(files.get('unrelated'),old);
 }
});

test('document reads reject a context switch before returning local contents',async()=>{
 const {H,st,env,connection,files}=setup(),id=add(H),[docId]=await H.addDocuments(id,[file()],{},H.snapshot(id));let release;
 env.houseRead=async key=>{await new Promise(resolve=>release=resolve);return files.get(key);};const pending=H.openDocument(docId);await Promise.resolve();connection.epoch++;release();await assert.rejects(pending,/foyer|modifi/i);assert.equal(st.houseDocs.length,1);
});

test('confirmed bulk import adds atomically, updates additively and preserves old history, plans, sources and files',async()=>{
 const {H,st,files,saved}=setup(),id=add(H),logId=H.saveLog(id,null,{planId:'flue',date:'2025-01-01',note:'Old'},H.snapshot(id));st.houseItems[0].sources=[{id:'old-source',url:'https://old.example'}];st.houseItems[0].equipmentImportKeys=['prior'];st.houseItems[0].maintenancePlans[0].future={kept:true};
 const beforeSaves=saved.length,result=await H.importEquipment([{action:'update',targetId:id,values:{name:'Updated',equipmentImportKeys:['new'],sources:[{id:'new-source',url:'https://new.example'}],maintenancePlans:[{...plan(),title:'Updated plan'}]},documents:[{path:'documents/manual.pdf',kind:'Manuel',sourceRefs:['new-source']}]},{action:'add',values:{name:'New',serialNumber:'SERIAL',maintenancePlans:[]}},{action:'skip',values:{name:''}}],new Map([['documents/manual.pdf',file()]]),H.registrySnapshot());
 assert.equal(saved.length,beforeSaves+1);assert.deepEqual(json(result).map(x=>x.status),['updated','added','skipped']);assert.equal(st.houseItems.length,2);assert.equal(st.houseItems[0].id,id);assert.equal(st.houseItems[0].maintenancePlans.length,2);assert.equal(st.houseItems[0].maintenancePlans[0].future.kept,true);assert.equal(st.houseLogs[0].id,logId);assert.equal(st.houseItems[0].sources.length,2);assert.deepEqual(json(st.houseItems[0].equipmentImportKeys),['prior','new']);assert.equal(st.houseDocs[0].sourceRefs[0],'new-source');assert.ok(files.has(result[0].documentIds[0]));
});

test('bulk validation, second staged-file failure, quota and asynchronous context changes leave registry unchanged',async()=>{
 for(const mode of ['invalid','store','quota','context','registry']){
  const {H,st,env,connection,files}=setup(),id=add(H),before=json(st),entries=[{action:'update',targetId:id,values:{name:'Changed'},documents:[{path:'documents/a.pdf'}]},{action:'add',values:{name:mode==='invalid'?'':'New'},documents:[{path:'documents/b.pdf'}]}];let count=0;
  env.houseStore=async(blob,key)=>{files.set(key,blob);if(++count===2&&mode==='store')throw Error('storage unavailable');if(mode==='context')connection.epoch++;if(mode==='registry')st.houseItems.push({id:'concurrent',name:'Concurrent'});};if(mode==='quota')env.save=()=>{throw Error('quota');};
  await assert.rejects(H.importEquipment(entries,new Map([['documents/a.pdf',file()],['documents/b.pdf',file()]]),H.registrySnapshot()),/nom|storage|quota|modifi|foyer/i);
  assert.equal(st.houseItems[0].name,before.houseItems[0].name);assert.equal(st.houseItems.length,mode==='registry'?2:1);assert.equal(st.houseDocs.length,0);assert.equal(st.houseLogs.length,0);assert.equal(files.size,0);
 }
});

test('a source-backed program with unknown frequency imports without an invented quantity or unit',async()=>{
 const {H,st}=setup();await H.importEquipment([{action:'add',values:{name:'Filtre',maintenancePlans:[{id:'filter',title:'Vérifier filtre',interval:{value:null,unit:null},sourceRefs:['manual-1']}]}}],new Map(),H.registrySnapshot());
 assert.deepEqual(json(st.houseItems[0].maintenancePlans[0].interval),{value:null,unit:null});assert.equal(st.houseLogs.length,0);
});

test('canonical child and unverified bindings cannot inherit a parent grant from editable local member data',()=>{
 for(const mode of ['canonical-child','cached','stale-bound']){
  const {H,st,api,connection}=setup(),id=add(H),before=json(st);
  api.access={state:()=>({verified:mode!=='stale-bound',userId:'user',householdId:'home',memberId:'parent',profile:{memberCategory:mode==='canonical-child'?'child':'parent'},permissions:{canEdit:true}})};
  if(mode==='cached')connection.access='cached';
  assert.throws(()=>H.save(id,{name:'Escalated'},H.snapshot(id)),/parent|vérifi|lecture|autorisé/i);assert.deepEqual(json(st),before);
 }
});

test('structured interventions retain the native backup note field and reject an empty intervention',()=>{
 const {H,st}=setup(),id=add(H),logId=H.saveLog(id,null,{date:'2025-01-01',planId:'flue',type:'Entretien',description:'Nettoyage',notes:'Complément'},H.snapshot(id));
 assert.equal(st.houseLogs.find(log=>log.id===logId).note,'Entretien');
 H.saveLog(id,logId,{type:'Révision',description:'Autres travaux'},H.snapshot(id));assert.equal(st.houseLogs.find(log=>log.id===logId).note,'Entretien','native historical note survives a structured edit');
 assert.throws(()=>H.saveLog(id,null,{date:'2025-01-01',type:' ',description:'',note:''},H.snapshot(id)),/nature|intervention|description/i);
});

test('native backup note compatibility bounds fallback summaries without discarding the structured description',()=>{
 const {H,st}=setup(),id=add(H),description='a'.repeat(3000),logId=H.saveLog(id,null,{date:'2025-01-01',description,note:null},H.snapshot(id));
 const log=st.houseLogs.find(row=>row.id===logId);assert.equal(log.note,'a'.repeat(2000));assert.equal(log.description,description);
 assert.throws(()=>H.saveLog(id,null,{date:'2025-01-01',note:'x'.repeat(2001)},H.snapshot(id)),/note|2000|intervention/i);
});

test('equipment deletion refuses existing contract references and preserves every native blob',async()=>{
 const {H,st,files}=setup(),id=add(H),[docId]=await H.addDocuments(id,[file()],{},H.snapshot(id));
 st.familyDocs=[{id:'contract',contract:{version:1,equipmentIds:[id,'other']}}];const before=json(st);
 await assert.rejects(H.delete(id,H.snapshot(id)),/contrat|association/i);assert.deepEqual(json(st),before);assert.ok(files.has(docId));
 st.familyDocs[0].contract.equipmentIds=['other'];await H.delete(id,H.snapshot(id));assert.equal(st.houseItems.length,0);assert.equal(st.houseDocs.length,0);assert.equal(files.size,0);assert.deepEqual(json(st.familyDocs[0].contract.equipmentIds),['other']);
});
