const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const source=new URL('../family-contracts.js',`file://${__filename}`),json=value=>JSON.parse(JSON.stringify(value));
const HH='00000000-0000-4000-8000-000000000010';
function setup(state={}){
 const st={familyDocs:[],familyMembers:[{id:'parent',memberCategory:'parent'}],...state},saved=[],files=new Map(),calls=[];
 const connection={epoch:1,userId:'user',householdId:HH,memberId:'parent'},api={getContext:()=>({...connection}),connectionState:()=>({...connection}),isModuleActive:()=>true,storageFetch:async(method,path,file)=>{calls.push({method,path,file});if(method==='GET')return files.get(path);if(method==='DELETE')files.delete(path);else files.set(path,file);return true;}};
 const env=vm.createContext({st,crypto,Blob,window:{DobbyFamilyUI:api},save:()=>saved.push(json(st)),render:()=>{},houseStore:async(blob,key)=>files.set(key,blob),houseRead:async(key,remove)=>remove?files.delete(key):files.get(key)});
 if(fs.existsSync(source))vm.runInContext(fs.readFileSync(source,'utf8'),env);
 assert.ok(env.window.DobbyFamilyContracts,'native contracts API is loaded');
 return{st,saved,files,calls,connection,api,env,C:env.window.DobbyFamilyContracts};
}
const file=(name='original.pdf')=>Object.assign(new Blob(['%PDF-1.4\nfixture'],{type:'application/pdf'}),{name});
const add=C=>C.save(null,{title:'Assurance',category:'Assurances',contract:{version:1,type:'insurance',notice:{value:2,unit:'months'}}},C.snapshot());

test('native save/reload keeps deep extensions, stable ids and legacy invalid dates',()=>{
 const {C,st,saved}=setup({familyDocs:[{id:'old',title:'Ancien',category:'Contrats',deadline:'31/02/2025',future:{keep:true},contract:{version:1,notice:{value:1,unit:'months',future:'keep'},future:{keep:true}},attachmentName:'old.pdf',attachmentType:'application/pdf'}]});
 C.save('old',{title:'Modifié',deadline:'31/02/2025',contract:{notice:{value:2}}},C.snapshot('old'));
 assert.equal(st.familyDocs[0].deadline,'31/02/2025');assert.equal(st.familyDocs[0].contract.notice.unit,'months');assert.equal(st.familyDocs[0].contract.notice.future,'keep');assert.equal(st.familyDocs[0].attachmentName,'old.pdf');assert.deepEqual(json(st.familyDocs[0].future),{keep:true});
 assert.equal(setup(json(saved.at(-1))).st.familyDocs[0].contract.notice.value,2);
 const id=add(C);assert.equal(typeof id,'string');assert.ok(st.familyDocs.find(x=>x.id===id));
 assert.throws(()=>C.save(id,{deadline:'2026-02-30'},C.snapshot(id)),/date/i);
});

test('edits require current row/context; denied children and failed saves cannot mutate state',()=>{
 const {C,st,env,connection,saved}=setup(),id=add(C),expected=C.snapshot(id);
 assert.throws(()=>C.save(id,{title:'No guard'}),/modifi|version|ouverture/i);
 st.familyDocs[0].note='Concurrent';assert.throws(()=>C.save(id,{title:'Stale'},expected),/modifi|version/i);
 const same=C.snapshot(id);connection.epoch++;assert.throws(()=>C.save(id,{title:'Other context'},same),/modifi|foyer|compte/i);
 const next=C.snapshot(id),before=json(st);env.save=()=>{throw Error('quota');};assert.throws(()=>C.save(id,{title:'Quota'},next),/quota/);assert.deepEqual(json(st),before);
 env.save=()=>{};st.familyMembers[0].memberCategory='child';assert.throws(()=>C.save(id,{title:'Child'},C.snapshot(id)),/enfant|parent|lecture/i);assert.deepEqual(json(st.familyDocs),before.familyDocs);assert.equal(saved.length,1);
});

test('multiple local attachments use native store without uploads and leave legacy blob untouched',async()=>{
 const {C,st,files,calls}=setup({familyDocs:[{id:'old',title:'Ancien',category:'Contrats',attachmentName:'legacy.pdf',attachmentType:'application/pdf'}]}),legacy=file('legacy.pdf');files.set('family-old',legacy);
 const a=await C.addAttachment('old',file(),'contract'),b=await C.addAttachment('old',file('avenant.pdf'),'amendment');
 assert.notEqual(a.id,b.id);assert.equal(st.familyDocs[0].attachments.length,2);assert.equal(calls.length,0);assert.equal(await C.openAttachment('old',a.id),files.get(a.key));assert.equal(await C.openAttachment('old','legacy'),legacy);
 assert.equal(C.attachments('old').length,3);C.save('old',{title:'Edited'},C.snapshot('old'));assert.equal(st.familyDocs[0].attachments.length,2);assert.equal(st.familyDocs[0].attachmentName,'legacy.pdf');
 const replacement=await C.replaceAttachment('old',a.id,file('replacement.pdf'));assert.equal(replacement.supersedes,a.id);assert.equal(st.familyDocs[0].attachments.length,3);assert.equal(await C.openAttachment('old',a.id),files.get(a.key));
 await C.removeAttachment('old',b.id);assert.equal(st.familyDocs[0].attachments.length,2);assert.equal(files.has(b.key),false);assert.equal(files.get('family-old'),legacy);
});

test('explicit upload uses existing storage API, confirms cloud metadata only after success, and retains local piece',async()=>{
 const {C,st,calls,api}=setup(),id=add(C),a=await C.addAttachment(id,file());
 api.storageFetch=async()=>{throw Object.assign(Error('not installed'),{status:404});};await assert.rejects(C.shareAttachment(id,a.id),/not installed/);assert.equal(st.familyDocs[0].attachments[0].cloudPath,undefined);
 api.storageFetch=async(method,path,blob)=>{calls.push({method,path,blob});return true;};const shared=await C.shareAttachment(id,a.id);
 assert.match(shared.cloudPath,new RegExp('^'+HH+'/[a-f0-9-]+\\.pdf$'));assert.equal(calls.length,1);assert.equal(st.familyDocs[0].attachments[0].key,a.key);
 await C.shareAttachment(id,a.id);assert.equal(calls.length,1,'already shared piece is never uploaded twice');
 assert.throws(()=>C.save(id,{attachments:[{...shared,cloudPath:HH+'/forged.pdf'}]},C.snapshot(id)),/pièce|fichier|référence/i);
 const clean=C.mergeImported(st.familyDocs[0],{title:'Import',attachments:[{id:a.id,name:'renamed',key:'house-secret',cloudPath:HH+'/forged.pdf'},{id:'new',name:'new',key:'house-secret',cloudPath:'other/file.pdf'}]});
 assert.equal(clean.attachments[0].key,a.key);assert.equal(clean.attachments[0].cloudPath,shared.cloudPath);assert.equal(clean.attachments[1].key,undefined);assert.equal(clean.attachments[1].cloudPath,undefined);
});

test('async writes reject household, row and role changes and discard only staged files',async()=>{
 for(const change of ['context','row','child']){
  const {C,st,connection,env,files}=setup(),id=add(C),before=json(st);let finish;
  env.houseStore=async(blob,key)=>{files.set(key,blob);await new Promise(resolve=>finish=resolve);};
  const pending=C.addAttachment(id,file());await Promise.resolve();
  if(change==='context')connection.householdId='other';if(change==='row')st.familyDocs[0].title='Concurrent';if(change==='child')st.familyMembers[0].memberCategory='child';finish();
  await assert.rejects(pending,/modifi|foyer|enfant|lecture|parent/i);assert.equal(st.familyDocs[0].attachments,undefined);assert.equal(files.size,0);assert.equal(st.familyDocs[0].title,change==='row'?'Concurrent':before.familyDocs[0].title);
 }
});

test('legacy import handler delegates metadata merge and native form preserves extensions',()=>{
 const source=fs.readFileSync(new URL('../index.html',`file://${__filename}`),'utf8');
 assert.match(source,/else st\.familyDocs\[i\]=\{\.\.\.st\.familyDocs\[i\],\.\.\.d\}/);
 assert.match(source,/DobbyFamilyContracts\.mergeImported\(prior,x\)/);
});

test('whole fiche deletion covers every piece and leaves unrelated files intact',async()=>{
 const {C,st,files,calls}=setup(),id=add(C),a=await C.addAttachment(id,file()),b=await C.addAttachment(id,file('second.pdf'));
 await C.shareAttachment(id,a.id);files.set('unrelated',file('unrelated.pdf'));
 const result=await C.delete(id,C.snapshot(id));assert.equal(st.familyDocs.length,0);assert.equal(files.has(a.key),false);assert.equal(files.has(b.key),false);assert.equal(files.has('unrelated'),true);assert.equal(calls.filter(call=>call.method==='DELETE').length,0);assert.equal(result.sharedCleanupDeferred,true);
});

test('file validation, forged references and child mutation calls cannot touch native stores',async()=>{
 const {C,st,files,calls}=setup(),id=add(C),a=await C.addAttachment(id,file());
 for(const amount of [NaN,Infinity,-1,'100'])assert.throws(()=>C.save(id,{contract:{amount}},C.snapshot(id)),/montant/i);
 await assert.rejects(C.addAttachment(id,new Blob(['plain'],{type:'text/plain'})),/PDF|image/i);
 st.familyMembers[0].memberCategory='child';const before=json(st),count=files.size;
 await assert.rejects(C.addAttachment(id,file()),/parent|lecture/i);await assert.rejects(C.shareAttachment(id,a.id),/parent|lecture/i);await assert.rejects(C.replaceAttachment(id,a.id,file()),/parent|lecture/i);await assert.rejects(C.removeAttachment(id,a.id),/parent|lecture/i);await assert.rejects(C.delete(id,C.snapshot(id)),/parent|lecture/i);
 assert.deepEqual(json(st),before);assert.equal(files.size,count);assert.equal(calls.length,0);
});

test('legacy local and shared slots remain independently readable/removable when they contain different files',async()=>{
 const cloudPath=HH+'/00000000-0000-4000-8000-000000000091.pdf';
 const {C,st,files}=setup({familyDocs:[{id:'old',title:'Legacy',category:'Contrats',attachmentName:'local.pdf',attachmentType:'application/pdf',cloudPath,cloudName:'different-shared.pdf',cloudType:'application/pdf'}]});
 const local=file('local.pdf'),cloud=file('different-shared.pdf');files.set('family-old',local);files.set(cloudPath,cloud);
 assert.equal(C.attachments('old').length,2);assert.equal(await C.openAttachment('old','legacy'),local);assert.equal(await C.openAttachment('old','legacy-cloud'),cloud);
 await C.removeAttachment('old','legacy-cloud');assert.equal(st.familyDocs[0].attachmentName,'local.pdf');assert.equal(st.familyDocs[0].cloudPath,undefined);assert.equal(files.get('family-old'),local);
});

test('a genuinely shared modern piece remains readable when its old local store is unavailable',async()=>{
 const {C,env,files,st}=setup(),id=add(C),a=await C.addAttachment(id,file()),shared=await C.shareAttachment(id,a.id),cloud=files.get(shared.cloudPath);
 env.houseRead=async()=>{throw Error('local database unavailable');};assert.equal(await C.openAttachment(id,a.id),cloud);
 assert.equal(st.familyDocs[0].attachments[0].key,a.key);
});

test('download names remove paths/control characters and match the permitted binary MIME type',async()=>{
 const {C,st,calls}=setup(),id=add(C);
 assert.equal(C.safeDownloadName('Police habitation 2026.pdf','application/pdf'),'Police habitation 2026.pdf');
 assert.equal(C.safeDownloadName('Photo.JPEG','image/jpeg'),'Photo.JPEG');
 assert.equal(C.safeDownloadName('C:\\private\\..\\page.html','application/pdf'),'page.pdf');
 assert.equal(C.safeDownloadName('../../page.html\u0000\u202e','application/pdf'),'page.pdf');
 assert.equal(C.safeDownloadName('.html','image/png'),'document.png');
 assert.throws(()=>C.safeDownloadName('page.html','text/html'),/type|PDF|image/i);
 const piece=await C.addAttachment(id,file('statement.html'));
 assert.equal(piece.name,'statement.pdf');assert.equal(st.familyDocs[0].attachments[0].name,'statement.pdf');assert.equal(calls.length,0);
});

test('quota rejection never deletes shared bytes for a single piece or a whole fiche',async()=>{
 for(const whole of [false,true]){
  const {C,env,files,st,calls}=setup(),id=add(C),a=await C.addAttachment(id,file()),shared=await C.shareAttachment(id,a.id),before=json(st);
  env.save=()=>{throw Error('quota');};
  await assert.rejects(whole?C.delete(id,C.snapshot(id)):C.removeAttachment(id,a.id),/quota/);
  assert.deepEqual(json(st),before);assert.equal(files.has(shared.cloudPath),true);assert.equal(files.has(a.key),true);assert.equal(calls.filter(call=>call.method==='DELETE').length,0);
 }
});

test('shared removal persists metadata first, preserves cloud bytes and truthfully reports distinct physical cleanup',async()=>{
 const {C,env,files,st,calls}=setup(),id=add(C),a=await C.addAttachment(id,file()),shared=await C.shareAttachment(id,a.id);
 const nativeRead=env.houseRead;let release,metadataRemoved=false;
 env.houseRead=async(key,remove)=>{if(remove){metadataRemoved=st.familyDocs[0].attachments.length===0;await new Promise(resolve=>release=resolve);}return nativeRead(key,remove);};
 const pending=C.removeAttachment(id,a.id);await Promise.resolve();
 st.familyDocs[0].note='Concurrent after committed removal';release();const result=await pending;
 assert.equal(metadataRemoved,true);assert.equal(st.familyDocs[0].note,'Concurrent after committed removal');assert.equal(files.has(shared.cloudPath),true);assert.equal(files.has(a.key),false);assert.equal(calls.filter(call=>call.method==='DELETE').length,0);
 assert.equal(result.sharedCleanupDeferred,true);assert.match(result.notice,/serveur.*conservée.*intervention distincte/i);
});

test('native Archives delete of a shared piece-free fiche is guarded before confirmation for a child',async()=>{
 const {C,st,env,api}=setup({familyDocs:[{id:'shared',title:'Shared contract',category:'Contrats'}]}),handlers=[];let confirmed=0,stopped=false;
 env.window.parent={DobbyFamilyStitch:{sharedReadOnly:()=>true}};api.esc=String;
 env.drawDocuments=()=>'';env.docEdit=null;env.docNoteEdit=null;env.docDetail='shared';env.render=()=>{};env.confirm=()=>{confirmed++;return true;};
 env.document={addEventListener:(kind,handler)=>{if(kind==='click')handlers.push(handler);},getElementById:()=>null};
 vm.runInContext(fs.readFileSync(new URL('../family-files.js',`file://${__filename}`),'utf8'),env);
 const button={dataset:{doc:'delete',id:'shared'}},event={target:{closest:selector=>selector==='[data-doc="delete"]'?button:null},preventDefault(){},stopImmediatePropagation(){stopped=true;}};
 for(const handler of handlers){await handler(event);if(stopped)break;}
 if(!stopped&&env.confirm())st.familyDocs=[]; // Original legacy bubble handler.
 assert.equal(stopped,true);assert.equal(confirmed,0);assert.equal(st.familyDocs.length,1);assert.throws(()=>C.assertWritable(),/lecture|parent/i);
});

test('raw legacy shared metadata submit/detach/local picker reject children while private Archives stays writable',async()=>{
 const {env,api}=setup({familyDocs:[{id:'shared',title:'Shared',category:'Contrats'},{id:'private',title:'Private',category:'Factures et achats'}]}),handlers={};
 env.window.parent={DobbyFamilyStitch:{sharedReadOnly:()=>true}};api.esc=String;env.drawDocuments=()=>'';env.docEdit='shared';env.docDetail='shared';env.docNoteEdit=null;
 env.document={addEventListener:(kind,handler)=>{(handlers[kind]||=[]).push(handler);},getElementById:()=>null};
 vm.runInContext(fs.readFileSync(new URL('../family-files.js',`file://${__filename}`),'utf8'),env);
 for(const kind of ['submit','change','click']){
  let stopped=false;const button={dataset:{doc:'detach',id:'shared'}},target=kind==='submit'?{id:'familyDocForm',elements:{namedItem:()=>({value:'Contrats'})}}:kind==='change'?{id:'familyDocFile',closest:()=>null}:{closest:selector=>selector==='[data-doc="detach"]'?button:null};
  const event={target,preventDefault(){},stopImmediatePropagation(){stopped=true;}};
  for(const handler of handlers[kind]){await handler(event);if(stopped)break;}assert.equal(stopped,true,kind+' is guarded');
 }
 env.docEdit='private';let stopped=false;await handlers.submit[0]({target:{id:'familyDocForm',elements:{namedItem:()=>({value:'Factures et achats'})}},preventDefault(){},stopImmediatePropagation(){stopped=true;}});assert.equal(stopped,false);
});

test('retained local-only flag survives edits/imports and rejects file sharing without uploading',async()=>{
 const {C,st,calls}=setup(),id=add(C),a=await C.addAttachment(id,file());st.familyDocs[0].retainedLocalOnly=true;
 C.save(id,{title:'Local edit',retainedLocalOnly:false},C.snapshot(id));assert.equal(st.familyDocs[0].retainedLocalOnly,true);
 assert.equal(C.mergeImported(st.familyDocs[0],{title:'Import edit',retainedLocalOnly:false}).retainedLocalOnly,true);
 await assert.rejects(C.shareAttachment(id,a.id),/copie locale|retirée/i);assert.equal(calls.length,0);
});
