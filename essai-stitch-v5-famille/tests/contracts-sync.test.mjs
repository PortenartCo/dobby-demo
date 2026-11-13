import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBackend,makeClient,HH} from './helpers/modules-harness.mjs';

test('structured contract metadata and multi-file descriptors sync without local keys or binary data',async()=>{
 const backend=makeBackend(),a=makeClient('a',backend,true),b=makeClient('b',backend);
 Object.assign(a.st.familyDocs[0],{future:{source:'kept'},contract:{version:1,type:'insurance',future:{kept:true},binary:new Blob(['private binary'])},attachments:[{id:'piece',name:'original.pdf',type:'application/pdf',size:20,kind:'contract',key:'private-local-key',future:{kept:true},cloudPath:HH+'/00000000-0000-4000-8000-000000000091.pdf'}]});
 await a.provider.start();await a.action('activate','contracts');const payload=backend.rows.get('contracts').payload;
 assert.equal(payload.contractsVersion,1);assert.equal(payload.contracts[0].contract.future.kept,true);assert.equal(payload.contracts[0].future.source,'kept');assert.equal(payload.contracts[0].attachments[0].key,undefined);assert.ok(!JSON.stringify(payload).includes('private-local-key'));
 assert.equal(payload.contracts[0].contract.binary,undefined);
 await b.provider.start();await b.action('activate','contracts');assert.equal(b.st.familyDocs.find(x=>x.id==='contract-1').attachments[0].future.kept,true);
});

test('legacy peer roundtrip preserves new metadata and pieces, restores them to remote, and local keys stay local',async()=>{
 const backend=makeBackend(),a=makeClient('a',backend,true);
 Object.assign(a.st.familyDocs[0],{contract:{version:1,type:'insurance',notice:{value:2,unit:'months'},future:'kept'},future:'kept',attachments:[{id:'piece',name:'local.pdf',type:'application/pdf',size:20,kind:'contract',key:'local-key'}]});
 await a.provider.start();await a.action('activate','contracts');
 const row=backend.rows.get('contracts');backend.rows.set('contracts',{...row,revision:row.revision+1,payload:{contracts:[{id:'contract-1',title:'Edited by old client',category:'Contrats',provider:'Changed'}]}});
 await a.provider.sync();const doc=a.st.familyDocs.find(x=>x.id==='contract-1');assert.equal(doc.title,'Edited by old client');assert.equal(doc.contract.future,'kept');assert.equal(doc.attachments[0].key,'local-key');assert.equal(doc.attachmentName,'secret.pdf');assert.equal(doc.future,'kept');
 await a.provider.sync();assert.equal(backend.rows.get('contracts').payload.contracts[0].contract.future,'kept');assert.equal(backend.rows.get('contracts').payload.contracts[0].attachments[0].key,undefined);
});

test('modern descriptor deletion propagates, unknown deep fields and local legacy/private retention survive',async()=>{
 const backend=makeBackend(),a=makeClient('a',backend,true),b=makeClient('b',backend);
 Object.assign(a.st.familyDocs[0],{contract:{version:1,notice:{value:2,unit:'months',extension:'kept'}},attachments:[{id:'a',name:'one'},{id:'b',name:'two'}]});
 await a.provider.start();await a.action('activate','contracts');await b.provider.start();await b.action('activate','contracts');
 b.st.familyDocs.find(x=>x.id==='contract-1').attachments[0].key='local';
 a.st.familyDocs[0].attachments=a.st.familyDocs[0].attachments.slice(0,1);await a.provider.sync();await b.provider.sync();const doc=b.st.familyDocs.find(x=>x.id==='contract-1');assert.equal(doc.attachments.length,1);assert.equal(doc.attachments[0].key,'local');
 b.st.familyDocs.push({id:'local-piece',title:'Local binary',category:'Contrats',attachments:[{id:'only',name:'only.pdf',key:'local-only'}]});
 await b.action('server','contracts');assert.ok(b.st.familyDocs.find(x=>x.id==='health-doc-1'));assert.ok(b.st.familyDocs.find(x=>x.id==='local-piece'));
});

test('modern shared deletion retains an existing local legacy backup without immediately publishing it again',async()=>{
 const backend=makeBackend(),a=makeClient('a',backend,true);
 await a.provider.start();await a.action('activate','contracts');const row=backend.rows.get('contracts');
 backend.rows.set('contracts',{...row,revision:row.revision+1,payload:{contractsVersion:1,contracts:[]}});
 await a.provider.sync();await a.provider.sync();assert.equal(a.st.familyDocs.find(x=>x.id==='contract-1').attachmentName,'secret.pdf');assert.equal(backend.rows.get('contracts').payload.contracts.length,0);
});

test('an unrelated contract edit never republishes a remotely deleted local backup',async()=>{
 const backend=makeBackend(),a=makeClient('a',backend,true),removed=a.st.familyDocs.find(row=>row.id==='contract-1');
 delete removed.attachmentName;delete removed.attachmentType;removed.attachments=[{id:'local-piece',name:'local.pdf',key:'local-only'}];removed.future={preserved:true};
 a.st.familyDocs.push({id:'other-contract',category:'Contrats',title:'Other contract'});
 await a.provider.start();await a.action('activate','contracts');const row=backend.rows.get('contracts');
 backend.rows.set('contracts',{...row,revision:row.revision+1,payload:{contractsVersion:1,contracts:row.payload.contracts.filter(doc=>doc.id!=='contract-1')}});
 await a.provider.sync();await a.provider.sync();
 const local=a.st.familyDocs.find(doc=>doc.id==='contract-1');assert.equal(local.retainedLocalOnly,true);assert.equal(local.attachments[0].key,'local-only');assert.equal(local.future.preserved,true);
 a.st.familyDocs.find(doc=>doc.id==='other-contract').title='Unrelated edit';await a.provider.sync();
 assert.deepEqual(backend.rows.get('contracts').payload.contracts.map(doc=>doc.id),['other-contract']);
 assert.equal(JSON.stringify(backend.rows.get('contracts').payload).includes('retainedLocalOnly'),false);
});

test('an authoritative modern restoration rejoins its local backup and survives the next unrelated edit',async()=>{
 const backend=makeBackend(),a=makeClient('a',backend,true);a.st.familyDocs.push({id:'other-contract',category:'Contrats',title:'Other'});
 await a.provider.start();await a.action('activate','contracts');const initial=backend.rows.get('contracts'),original=initial.payload.contracts.find(row=>row.id==='contract-1');
 backend.rows.set('contracts',{...initial,revision:initial.revision+1,payload:{contractsVersion:1,contracts:initial.payload.contracts.filter(row=>row.id!=='contract-1')}});await a.provider.sync();
 assert.equal(a.st.familyDocs.find(row=>row.id==='contract-1').retainedLocalOnly,true);
 const withdrawn=backend.rows.get('contracts');backend.rows.set('contracts',{...withdrawn,revision:withdrawn.revision+1,payload:{contractsVersion:1,contracts:[...withdrawn.payload.contracts,{...original,title:'Restored by parent'}]}});await a.provider.sync();
 const restored=a.st.familyDocs.find(row=>row.id==='contract-1');assert.equal(restored.retainedLocalOnly,undefined);assert.equal(restored.attachmentName,'secret.pdf');assert.equal(restored.title,'Restored by parent');
 a.st.familyDocs.find(row=>row.id==='other-contract').title='Unrelated edit';await a.provider.sync();assert.deepEqual(new Set(backend.rows.get('contracts').payload.contracts.map(row=>row.id)),new Set(['contract-1','other-contract']));
});

test('modern shared legacy-file withdrawal propagates without touching the old local binary metadata',async()=>{
 const backend=makeBackend(),a=makeClient('a',backend,true);
 a.st.familyDocs[0].cloudPath=HH+'/00000000-0000-4000-8000-000000000091.pdf';a.st.familyDocs[0].cloudName='shared.pdf';
 await a.provider.start();await a.action('activate','contracts');const row=backend.rows.get('contracts'),doc={...row.payload.contracts[0]};delete doc.cloudPath;delete doc.cloudName;
 backend.rows.set('contracts',{...row,revision:row.revision+1,payload:{contractsVersion:1,contracts:[doc]}});await a.provider.sync();
 const local=a.st.familyDocs.find(x=>x.id==='contract-1');assert.equal(local.cloudPath,undefined);assert.equal(local.attachmentName,'secret.pdf');
});
