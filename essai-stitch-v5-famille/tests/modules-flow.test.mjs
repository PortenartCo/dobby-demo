import test from 'node:test';
import assert from 'node:assert/strict';

import {makeBackend,makeClient,HH} from './helpers/modules-harness.mjs';
const MODULES=['menus','recipes','missions','house','family','contracts'];
const clone=x=>JSON.parse(JSON.stringify(x));

test('two accounts activate all six modules and receive a shared update without exposing health or attachments',async()=>{
  const backend=makeBackend(),a=makeClient('user-a',backend,true),b=makeClient('user-b',backend,false);
  await a.provider.start();
  for (const name of MODULES) await a.action('activate',name);
  assert.equal(backend.rows.size,6);
  const family=backend.rows.get('family').payload;
  assert.equal(Object.hasOwn(family,'famHealth'),false);
  const house=backend.rows.get('house').payload;
  assert.equal(Object.hasOwn(house,'houseDocs'),false);
  const contract=backend.rows.get('contracts').payload;
  assert.equal(contract.contracts.length,1);
  assert.equal(contract.contracts[0].title,'Électricité');
  assert.equal(Object.hasOwn(contract.contracts[0],'attachmentName'),false);
  assert.equal(JSON.stringify(contract).includes('secret.pdf'),false);
  assert.equal(JSON.stringify(contract).includes('Document médical'),false);
  await b.provider.start();
  assert.match(b.provider.html(),/Récupérer les modules partagés \(6\)/);
  await b.action('join-family');
  assert.doesNotMatch(b.provider.html(),/Récupérer les modules partagés \(6\)/);
  assert.ok(b.localBackups >= 6);
  assert.ok(b.st.planned['2026-11-08-soir']);
  assert.equal(b.st.familyDocs.find(x=>x.id==='contract-1')?.attachmentName,'');
  assert.equal(b.st.famHealth.length,1);
  assert.match(a.provider.html(),/Retirer les trois repas d’exemple/);
  await a.action('remove-demo','menus');
  assert.equal(Object.keys(a.st.planned).length,0);
  assert.equal(Object.keys(backend.rows.get('menus').payload.planned).length,0);
  assert.equal(backend.rows.get('menus').revision,2);
  assert.ok(a.localBackups > 0);
  await b.provider.sync();
  assert.equal(Object.keys(b.st.planned).length,0);
  a.st.autoTasks.push({key:'f001',title:'Changer le filtre',state:'open',due:'2026-11-20'});
  await a.provider.sync();
  assert.equal(backend.rows.get('missions').revision,2);
  await b.provider.sync();
  assert.equal(b.st.autoTasks.length,1);
  assert.equal(b.st.autoTasks[0].key,'f001');
  a.st.familyEvents.push({
    id:'fp-family-1',title:'Sortie famille',category:'Famille',date:'2026-11-14',
    time:'10:00',person:'',location:'',note:''
  });
  await a.provider.sync();
  assert.equal(backend.rows.get('family').revision,2);
  await b.provider.sync();
  assert.equal(b.st.familyEvents.length,1);
  assert.equal(b.st.familyEvents[0].title,'Sortie famille');
  a.st.manualMissions.push({
    id:'fm-test-1',title:'Sortir les poubelles',status:'open',
    due:'2026-11-18',category:'Maison',assigneeId:'',note:''
  });
  await a.provider.sync();
  assert.equal(backend.rows.get('missions').payload.manualMissions.length,1);
  await b.provider.sync();
  assert.equal(b.st.manualMissions[0].title,'Sortir les poubelles');
  assert.equal(b.st.manualMissions[0].status,'open');

  a.st.familyDocs.push(
    {id:'doc-shared',title:'Facture familiale',category:'Factures et achats',
      sharedToHousehold:true,cloudPath:HH+'/00000000-0000-4000-8000-000000000091.pdf',
      cloudName:'facture.pdf',cloudType:'application/pdf',cloudSize:1024},
    {id:'doc-local',title:'Note privée locale',category:'Factures et achats',note:'PRIVATE'},
    {id:'doc-health',title:'Bilan médical',category:'Santé',
      note:'MEDICAL_PRIVATE'},
    {id:'doc-health-shared',title:'Ordonnance choisie',category:'Santé',
      sharedToHousehold:true,note:'MEDICAL_SHARED'}
  );
  await a.provider.sync();
  const sharedDocs=backend.rows.get('contracts').payload.contracts;
  assert.ok(sharedDocs.find(x=>x.id==='doc-shared'));
  assert.equal(sharedDocs.some(x=>x.id==='doc-local'),false);
  assert.equal(sharedDocs.some(x=>x.id==='doc-health'),false);
  assert.ok(sharedDocs.find(x=>x.id==='doc-health-shared'));
  assert.equal(JSON.stringify(sharedDocs).includes('MEDICAL_PRIVATE'),false);
  assert.equal(JSON.stringify(sharedDocs).includes('PRIVATE'),false);
  await b.provider.sync();
  assert.equal(b.st.familyDocs.find(x=>x.id==='doc-shared')?.cloudName,'facture.pdf');
  assert.equal(b.st.familyDocs.find(x=>x.id==='doc-shared')?.cloudPath,
    HH+'/00000000-0000-4000-8000-000000000091.pdf');
  assert.ok(b.st.familyDocs.find(x=>x.id==='health-doc-1'));
  assert.equal(b.st.familyDocs.some(x=>x.id==='doc-health'),false);
  assert.equal(b.st.familyDocs.find(x=>x.id==='doc-health-shared')?.note,'MEDICAL_SHARED');
  a.st.sharedHealthVisits.push({
    id:'fh-test-1',title:'Rendez-vous médical choisi',date:'2026-11-19',
    time:'14:30',person:'Enfant',provider:'Centre médical',location:'',note:''
  });
  await a.provider.sync();
  assert.equal(backend.rows.get('family').payload.sharedHealthVisits.length,1);
  assert.equal(JSON.stringify(backend.rows.get('family').payload).includes('private medical appointment'),false);
  await b.provider.sync();
  assert.equal(b.st.sharedHealthVisits[0].title,'Rendez-vous médical choisi');
  assert.equal(b.st.famHealth[0].name,'private medical appointment');

  assert.equal(JSON.stringify(backend.rows.get('family').payload).includes('private medical appointment'),false);
  assert.match(b.provider.html(),/Partagé · à jour/);
});

test('verified Santé cutover retains historical device rows through cleanup and ordinary module writes',async()=>{
  const backend=makeBackend();
  let enabled=false,verified=false;
  const a=makeClient('a',backend,true,true,{window:{
    DobbyHealthLegacyClosed:()=>verified,
    async DobbyVerifyHealthLegacyClosure(){verified=enabled;return verified;}
  }});
  const historicalVisit={id:'old-visit',title:'TEST historic appointment'};
  const historicalDocument={id:'old-document',title:'TEST historic document',category:'Santé',sharedToHousehold:true,attachmentName:'retained.pdf'};
  a.st.sharedHealthVisits.push(historicalVisit);
  a.st.familyDocs.push(historicalDocument);
  await a.provider.start();
  await a.action('activate','family');await a.action('activate','contracts');
  assert.equal(backend.rows.get('family').payload.sharedHealthVisits[0].id,'old-visit');
  assert.ok(backend.rows.get('contracts').payload.contracts.some(row=>row.id==='old-document'));

  // Represent the explicit maintenance step before the server opens Santé.
  const family=backend.rows.get('family'),contracts=backend.rows.get('contracts');
  backend.rows.set('family',{...family,revision:family.revision+1,payload:{...family.payload,sharedHealthVisits:[]}});
  backend.rows.set('contracts',{...contracts,revision:contracts.revision+1,payload:{...contracts.payload,contracts:contracts.payload.contracts.filter(row=>row.id!=='old-document')}});
  enabled=true;
  await a.provider.sync();
  assert.equal(a.provider.isActive('family'),true);
  assert.equal(a.provider.isActive('contracts'),true);
  assert.deepEqual(a.st.sharedHealthVisits,[historicalVisit]);
  assert.deepEqual(a.st.familyDocs.find(row=>row.id==='old-document'),historicalDocument);
  assert.equal(a.st.famHealth[0].id,'medical-1');

  a.st.famContacts.push({id:'contact',name:'TEST ordinary contact'});
  a.st.familyDocs.find(row=>row.id==='contract-1').title='TEST ordinary contract';
  await a.provider.sync();
  assert.equal(backend.rows.get('family').payload.famContacts[0].id,'contact');
  assert.equal(Object.hasOwn(backend.rows.get('family').payload,'sharedHealthVisits'),false);
  assert.equal(backend.rows.get('contracts').payload.contracts[0].title,'TEST ordinary contract');
  assert.equal(backend.rows.get('contracts').payload.contracts.some(row=>row.id==='old-document'),false);
  assert.deepEqual(a.st.sharedHealthVisits,[historicalVisit]);
  assert.deepEqual(a.st.familyDocs.find(row=>row.id==='old-document'),historicalDocument);

  const current=backend.rows.get('family');
  backend.rows.set('family',{...current,payload:{...current.payload,sharedHealthVisits:[{id:'unexpected-remote'}]}});
  a.st.famContacts.push({id:'unsent',name:'TEST local until review'});
  await a.provider.sync();
  assert.equal(backend.rows.get('family').payload.sharedHealthVisits[0].id,'unexpected-remote');
  assert.equal(backend.rows.get('family').payload.famContacts.length,1);
  assert.deepEqual(a.st.sharedHealthVisits,[historicalVisit]);
});

test('a release-configured client preserves local Santé history before its first successful proof',async()=>{
  const backend=makeBackend(),publisher=makeClient('publisher',backend);
  publisher.st.sharedHealthVisits.push({id:'remote-history',title:'TEST older shared value'});
  publisher.st.familyDocs.push({id:'local-health-doc',title:'TEST older shared metadata',category:'Santé',sharedToHousehold:true});
  await publisher.provider.start();
  await publisher.action('activate','family');await publisher.action('activate','contracts');
  const reader=makeClient('reader',backend,false,true,{window:{
    DobbyHealthLegacyClosed:()=>false,
    DobbyVerifyHealthLegacyClosure:async()=>false
  }});
  const historicalVisit={id:'local-history',title:'TEST original history'};
  const historicalDocument={id:'local-health-doc',title:'TEST original document',category:'Santé',sharedToHousehold:true,attachmentName:'private-local.pdf'};
  reader.st.sharedHealthVisits.push(historicalVisit);
  reader.st.familyDocs.push(historicalDocument);
  await reader.provider.start();
  await reader.action('join-family');
  assert.deepEqual(reader.st.sharedHealthVisits,[historicalVisit]);
  assert.deepEqual(reader.st.familyDocs.find(row=>row.id==='local-health-doc'),historicalDocument);
  assert.equal(backend.rows.get('family').payload.sharedHealthVisits[0].id,'remote-history');
  assert.equal(backend.rows.get('contracts').payload.contracts[0].title,'TEST older shared metadata');
  reader.provider.reset();publisher.provider.reset();
});

test('simultaneous module edits create a conflict, not a lost update',async()=>{
  const backend=makeBackend(),a=makeClient('a',backend),b=makeClient('b',backend);
  await a.provider.start(); await b.provider.start();
  await a.action('activate','missions');await b.action('activate','missions');
  a.st.autoTasks.push({key:'from-a',title:'Premier ajout'});
  b.st.autoTasks.push({key:'from-b',title:'Second ajout'});
  await a.provider.sync();
  await b.provider.sync();
  assert.equal(backend.rows.get('missions').revision,2);
  assert.equal(backend.rows.get('missions').payload.autoTasks[0].key,'from-a');
  assert.match(b.provider.html(),/Conflit à résoudre/);
  await b.action('server','missions');
  assert.equal(b.st.autoTasks[0].key,'from-a');
  assert.equal(backend.rows.get('missions').revision,2);
});

test('missing modules backend does not activate sharing',async()=>{
  const backend=makeBackend();
  backend.authorized=async()=>{const error=Error('Not found');error.status=404;throw error;};
  const c=makeClient('a',backend);
  await c.provider.start();
  assert.doesNotMatch(c.provider.html(),/data-fm-action="activate"/);
});

test('customized or actual meal plans are never offered for automated demo deletion', async() => {
  const backend=makeBackend(), c=makeClient('user-a',backend,true);
  await c.provider.start();
  c.st.planned['2026-11-10-soir']={id:'custom',people:3,status:'prévu'};
  assert.doesNotMatch(c.provider.html(),/Retirer les trois repas d’exemple/);
});


test('a fresh household activates all six modules with one consent and excludes demo meals',async()=>{
  const backend=makeBackend(), a=makeClient('user-a',backend,true);
  await a.provider.start();
  assert.match(a.provider.html(),/Activer les 6 modules du foyer/);
  await a.action('activate-all');
  assert.equal(a.prompts.length,1);
  assert.equal(backend.rows.size,6);
  assert.equal(Object.keys(backend.rows.get('menus').payload.planned).length,0);
  assert.equal(Object.keys(a.st.planned).length,0);
  assert.ok(a.localBackups > 0);
  assert.doesNotMatch(a.provider.html(),/Activer les 6 modules du foyer/);
  for (const name of MODULES) assert.ok(backend.rows.has(name));
  assert.equal(JSON.stringify(backend.rows.get('family').payload).includes('private medical appointment'),false);
  assert.equal(JSON.stringify(backend.rows.get('house').payload).includes('warranty'),false);
  assert.equal(JSON.stringify(backend.rows.get('contracts').payload).includes('secret.pdf'),false);
  const b=makeClient('user-b',backend,false);
  await b.provider.start();
  await b.action('join-family');
  assert.equal(b.prompts.length,1);
  assert.equal(backend.rows.size,6);
});

test('refusing group activation does not publish data or remove example meals',async()=>{
  const backend=makeBackend(),a=makeClient('user-a',backend,true,false);
  await a.provider.start();
  await a.action('activate-all');
  assert.equal(a.prompts.length,1);
  assert.equal(backend.rows.size,0);
  assert.equal(Object.keys(a.st.planned).length,3);
  assert.equal(a.localBackups,0);
});
