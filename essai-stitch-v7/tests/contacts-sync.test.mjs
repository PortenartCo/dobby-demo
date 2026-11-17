import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBackend,makeClient} from '../../essai-stitch-v5-famille/tests/helpers/modules-harness.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
const contact={id:'contacts-fixed',name:'DÉMO — Atelier',category:'Artisan',role:'Menuiserie',phone:'+32 0 000',email:'atelier@example.test',address:'12 rue Fictive\nVille Démo',note:'Fictif',legacyMetadata:{retained:true}};
async function pair(){const backend=makeBackend(),a=makeClient('a',backend),b=makeClient('b',backend);await a.provider.start();await a.action('activate','family');await b.provider.start();await b.action('activate','family');return{backend,a,b};}
test('native family payload transfers all seven contact fields and metadata between clients',async()=>{
 const {backend,a,b}=await pair();a.st.famContacts=[clone(contact)];await a.provider.sync();assert.deepEqual(backend.rows.get('family').payload.famContacts,[contact]);await b.provider.sync();assert.deepEqual(clone(b.st.famContacts),[contact]);
 b.st.famContacts[0].address='Nouvelle adresse fictive';await b.provider.sync();await a.provider.sync();assert.equal(a.st.famContacts[0].address,'Nouvelle adresse fictive');assert.equal(a.st.famContacts[0].id,contact.id);assert.deepEqual(clone(a.st.famContacts[0].legacyMetadata),contact.legacyMetadata);
 a.st.famContacts=[];await a.provider.sync();await b.provider.sync();assert.deepEqual(clone(b.st.famContacts),[]);
});
test('native pending contacts survive offline reload, then sync without duplicate IDs',async()=>{
 const {backend,a}=await pair(),online=backend.authorized;backend.authorized=async()=>{throw Error('offline');};a.st.famContacts=[clone(contact)];await a.provider.sync();assert.match(a.provider.statusFor('family'),/locales/);
 const reload=makeClient('a',backend,false,true,{state:clone(a.st),metadata:a.metadata});backend.authorized=online;await reload.provider.start();await reload.provider.sync();await reload.provider.sync();assert.deepEqual(backend.rows.get('family').payload.famContacts,[contact]);
});
test('conflicting contact edits retain both versions until the native resolution action',async()=>{
 const {backend,a,b}=await pair();a.st.famContacts=[clone(contact)];await a.provider.sync();await b.provider.sync();a.st.famContacts[0].role='Version A';b.st.famContacts[0].role='Version B';await a.provider.sync();await b.provider.sync();assert.equal(backend.rows.get('family').payload.famContacts[0].role,'Version A');assert.equal(b.st.famContacts[0].role,'Version B');assert.match(b.provider.statusFor('family'),/Conflit/);await b.action('server','family');assert.equal(b.st.famContacts[0].role,'Version A');
});
