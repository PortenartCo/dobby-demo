import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBackend,makeClient} from './helpers/modules-harness.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
const note=(title='TEST memo')=>({id:'memo-test',title,body:'TEST content',tags:'test'});
async function pair(){const backend=makeBackend(),a=makeClient('a',backend),b=makeClient('b',backend);await a.provider.start();await a.action('activate','family');await b.provider.start();await b.action('activate','family');return{backend,a,b};}
test('shared memo create/read/update/delete propagates without publishing legacy notes or private health',async()=>{
 const {backend,a,b}=await pair();a.st.familyNotes=[{id:'private',body:'NEVER_SHARE'}];a.st.sharedFamilyNotes=[note()];await a.provider.sync();
 assert.equal(backend.rows.get('family').payload.familyNotesVersion,1);assert.equal(backend.rows.get('family').payload.sharedFamilyNotes[0].title,'TEST memo');
 assert.ok(!JSON.stringify(backend.rows.get('family').payload).includes('NEVER_SHARE'));assert.ok(!Object.hasOwn(backend.rows.get('family').payload,'famHealth'));
 await b.provider.sync();assert.equal(b.st.sharedFamilyNotes[0].id,'memo-test');b.st.sharedFamilyNotes[0].body='Edited';await b.provider.sync();await a.provider.sync();assert.equal(a.st.sharedFamilyNotes[0].body,'Edited');
 a.st.sharedFamilyNotes=[];await a.provider.sync();await b.provider.sync();assert.deepEqual(clone(b.st.sharedFamilyNotes),[]);assert.equal(a.st.familyNotes[0].id,'private');
});
test('concurrent edits use module conflict, retaining both copies until explicit resolution and backup',async()=>{
 const {backend,a,b}=await pair();a.st.sharedFamilyNotes=[note()];await a.provider.sync();await b.provider.sync();a.st.sharedFamilyNotes[0].body='A';b.st.sharedFamilyNotes[0].body='B';await a.provider.sync();await b.provider.sync();
 assert.equal(backend.rows.get('family').payload.sharedFamilyNotes[0].body,'A');assert.equal(b.st.sharedFamilyNotes[0].body,'B');assert.match(b.provider.statusFor('family'),/Conflit/);await b.action('server','family');assert.equal(b.st.sharedFamilyNotes[0].body,'A');assert.ok(b.localBackups>0);
});
test('offline memo remains pending across a client reload, then synchronizes',async()=>{
 const {backend,a}=await pair(),online=backend.authorized;backend.authorized=async()=>{throw Error('offline');};a.st.sharedFamilyNotes=[note()];await a.provider.sync();assert.match(a.provider.statusFor('family'),/locales/);
 const reload=makeClient('a',backend,false,true,{state:clone(a.st),metadata:a.metadata});backend.authorized=online;await reload.provider.start();await reload.provider.sync();assert.equal(backend.rows.get('family').payload.sharedFamilyNotes[0].id,'memo-test');
});
test('old payload and unknown family extensions survive a write; absent fields do not clear existing data',async()=>{
 const {backend,a}=await pair(),row=backend.rows.get('family');row.payload.futureFamily={nested:['retained']};delete row.payload.sharedFamilyNotes;delete row.payload.familyNotesVersion;row.revision++;
 // Use a fresh client that has never acknowledged the memo protocol.
 const c=makeClient('c',backend,false,true,{state:{familyNotes:[{id:'old-local',body:'private'}],famContacts:[{id:'local-contact'}]}});await c.provider.start();await c.action('activate','family');c.st.sharedFamilyNotes=[note()];await c.provider.sync();
 assert.deepEqual(backend.rows.get('family').payload.futureFamily,{nested:['retained']});assert.equal(c.st.familyNotes[0].id,'old-local');assert.ok(Array.isArray(backend.rows.get('family').payload.familyMembers));
});
test('activation and joining preserve new offline memos alongside remote memos, with local notes excluded',async()=>{
 for(const action of ['activate','join-family','activate-all']){const {backend}=await pair();backend.rows.get('family').payload.sharedFamilyNotes=[note('Remote')];const c=makeClient('c',backend,false,true,{state:{sharedFamilyNotes:[{...note('Offline'),id:'offline'}],familyNotes:[{id:'legacy',body:'private'}]}});await c.provider.start();await c.action(action,'family');await c.provider.sync();assert.deepEqual(new Set(backend.rows.get('family').payload.sharedFamilyNotes.map(x=>x.id)),new Set(['memo-test','offline']),action);assert.equal(c.st.familyNotes[0].id,'legacy');}
});
test('an old client dropping the memo extension is detected and local acknowledged copy is retained',async()=>{
 const {backend,a,b}=await pair();a.st.sharedFamilyNotes=[note()];await a.provider.sync();await b.provider.sync();const row=backend.rows.get('family');delete row.payload.sharedFamilyNotes;delete row.payload.familyNotesVersion;row.payload.familyMembers=[{id:'old-client-member'}];row.revision++;
 await b.provider.sync();assert.equal(b.st.sharedFamilyNotes[0].id,'memo-test');assert.match(b.provider.statusFor('family'),/Conflit/);const rev=row.revision;await b.action('server','family');assert.equal(backend.rows.get('family').revision,rev,'Generic server chooser must not silently discard the retained memo registry');assert.equal(b.st.sharedFamilyNotes[0].id,'memo-test');
 await b.action('family-recover','family');assert.equal(backend.rows.get('family').payload.sharedFamilyNotes[0].id,'memo-test');assert.equal(backend.rows.get('family').payload.familyMembers[0].id,'old-client-member');
});
test('edits during PATCH are not falsely acknowledged or replaced',async()=>{
 const {backend,a}=await pair(),original=backend.authorized;let release,started;const entered=new Promise(r=>started=r),gate=new Promise(r=>release=r);backend.authorized=async(...args)=>{if(args[1]==='PATCH'){started();await gate;}return original(...args);};a.st.sharedFamilyNotes=[note('Sent')];const sending=a.provider.sync();await entered;a.st.sharedFamilyNotes[0].title='Typed during PATCH';release();await sending;
 assert.equal(a.st.sharedFamilyNotes[0].title,'Typed during PATCH');assert.match(a.provider.statusFor('family'),/locales/);backend.authorized=original;await a.provider.sync();assert.equal(backend.rows.get('family').payload.sharedFamilyNotes[0].title,'Typed during PATCH');
});
test('invalid memo payload blocks before replacing any other family fields',async()=>{
 const {backend,a}=await pair(),row=backend.rows.get('family');row.payload={...row.payload,familyMembers:[{id:'should-not-apply'}],familyNotesVersion:1,sharedFamilyNotes:'broken'};row.revision++;await a.provider.sync();assert.deepEqual(a.st.familyMembers,[]);assert.notEqual(a.provider.statusFor('family'),'Partagé · à jour');
});
test('a rival write between GET and PATCH loses CAS and keeps the local memo pending in conflict',async()=>{
 const {backend,a}=await pair(),original=backend.authorized;a.st.sharedFamilyNotes=[note('Local')];let raced=false;backend.authorized=async(...args)=>{if(args[1]==='PATCH'&&!raced){raced=true;const row=backend.rows.get('family');row.revision++;row.payload.sharedFamilyNotes=[{...note('Rival'),body:'Other device'}];}return original(...args);};await a.provider.sync();assert.equal(backend.rows.get('family').payload.sharedFamilyNotes[0].title,'Rival');assert.equal(a.st.sharedFamilyNotes[0].title,'Local');assert.match(a.provider.statusFor('family'),/Conflit/);
});
