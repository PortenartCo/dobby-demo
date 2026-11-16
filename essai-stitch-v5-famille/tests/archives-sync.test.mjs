import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBackend,makeClient} from './helpers/modules-harness.mjs';
const archive={version:1,archivedAt:'2026-11-13T12:00:00.000Z',updatedAt:'2026-11-13T12:00:00.000Z'};
for(const [module,key] of [['house','houseItems'],['recipes','customRecipes'],['family','famContacts'],['family','sharedFamilyNotes'],['contracts','contracts']]){
 test(`${module}/${key}: status reaches second fixture and old peer omission cannot reactivate`,async()=>{
  const backend=makeBackend(),a=makeClient('a',backend,true),b=makeClient('b',backend),nativeKey=module==='contracts'?'familyDocs':key;
  if(key==='sharedFamilyNotes')a.st[key]=[{id:'note-archive',title:'TEST note',body:'TEST body'}];
  if(!a.st[nativeKey]?.length)a.st[nativeKey]=[{id:'fixture',name:'TEST',title:'TEST'}];
  a.st[nativeKey][0].archive={...archive};
  await a.provider.start();await a.action('activate',module);await b.provider.start();await b.action('activate',module);
  const id=a.st[nativeKey][0].id;assert.deepEqual(JSON.parse(JSON.stringify(b.st[nativeKey].find(x=>x.id===id).archive)),archive);
  const remote=backend.rows.get(module),payload=structuredClone(remote.payload);delete payload[key].find(x=>x.id===id).archive;
  backend.rows.set(module,{...remote,revision:remote.revision+1,payload});await a.provider.sync();
  assert.equal(a.st[nativeKey].find(x=>x.id===id).archive.archivedAt,archive.archivedAt);
  await a.provider.sync();assert.equal(backend.rows.get(module).payload[key].find(x=>x.id===id).archive?.archivedAt,archive.archivedAt,'Preserved status is repaired through the source CAS writer');
 });
}
