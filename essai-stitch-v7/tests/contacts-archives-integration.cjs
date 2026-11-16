/* Integrated native Contacts/Archives acceptance. Disposable fictional profiles. */
'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
const contact={id:'integrated-contact',name:'DÉMO — Contact intégré',category:'Artisan',role:'Menuiserie',phone:'+32 2 000 00 00',email:'atelier@example.test',address:'12 rue Fictive\n1000 Bruxelles',note:'DÉMO — Notes conservées',opaque:{keep:true}};
const archived={id:'integrated-archived',name:'DÉMO — Ancien contact',archive:{version:1,archivedAt:'2026-11-01T12:00:00Z'}};
const foreign={id:'integrated-foreign',name:'DÉMO — Autre foyer',archive:{version:1,archivedAt:null,householdId:'other-fictional-household'}};
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const width of (process.env.DOBBY_CONTACTS_WIDTHS||'320,390,768,1440').split(',').map(Number)){
  const context=await browser.newContext({viewport:{width,height:900},locale:'fr-BE',reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const p=await context.newPage(),errors=[];p.setDefaultTimeout(10000);p.on('pageerror',error=>errors.push(error.message));p.on('dialog',dialog=>dialog.dismiss());
  const ready=()=>p.waitForFunction(()=>window.DobbyFamilyStitch?.ready&&!document.documentElement.classList.contains('dv7-loading'));
  const native=(code,values={})=>p.evaluate(({code,values})=>DobbyFamilyStitchEngine.evaluate(code,values),{code,values});
  const open=(view,values={})=>p.evaluate(({view,values})=>DobbyFamilyStitch.open(view,values),{view,values});
  const records=()=>native('return st.famContacts;'),current=async()=> (await records()).find(row=>row.id===contact.id);
  await p.goto(origin+'/essai-stitch-v7/famille.html#contacts');await ready();
  await native('st.familyDocs=[];st.houseItems=[];st.familyNotes=[];st.sharedFamilyNotes=[];st.familyMembers=[];st.famContacts=p.rows;custom=[];st.customRecipes=custom;save();',{rows:[contact,archived,foreign]});
  await open('contacts');await p.locator('#contactSearchInput').waitFor();
  assert.deepEqual(await p.locator('[data-fa-action=rg-contact-open]').evaluateAll(nodes=>nodes.map(node=>node.dataset.record)),[contact.id],'Native list excludes archived and inaccessible contacts');
  await p.locator('#contactSearchInput').fill('Ancien');assert.equal(await p.locator('[data-fa-action=rg-contact-open]').count(),0,'Searching never reveals archived contacts');
  await p.locator('#contactSearchInput').fill('');await p.locator('[data-fa-action=rg-contact-open]').click();await p.locator('[data-contact-detail]').waitFor();
  assert.equal(await p.getByRole('button',{name:'Archiver',exact:true}).count(),1,'One native archive action on the contact detail');
  await p.getByRole('button',{name:'Archiver',exact:true}).click();await p.getByRole('button',{name:'Annuler',exact:true}).click();assert.deepEqual(await current(),contact,'Cancel preserves the full contact');
  await p.getByRole('button',{name:'Archiver',exact:true}).click();await p.getByRole('button',{name:'Confirmer l’archivage',exact:true}).click();
  await p.locator('[data-archive-row][data-record='+contact.id+']').waitFor();assert.ok((await current()).archive.archivedAt);
  await open('contacts');await p.locator('#contactSearchInput').waitFor();assert.equal(await p.locator('[data-fa-action=rg-contact-open]').count(),0,'Archived contact leaves its native list');
  await open('documents');await p.locator('[data-archive-row][data-record='+contact.id+'] [data-fa-action=archive-open]').click();await p.locator('[data-contact-detail]').waitFor();
  assert.equal(await p.locator('[data-archive-detail-tools]').count(),1);assert.equal(await p.locator('#rg-form').count(),0);
  for(const value of Object.values(contact).filter(value=>typeof value==='string'&&value!==contact.id))assert.ok((await p.locator('[data-contact-detail]').textContent()).includes(value),'Archived detail retains '+value);
  for(const action of ['rg-contact-edit','rg-contact-delete'])assert.equal(await p.locator('[data-fa-action='+action+']:visible:not([disabled])').count(),0,'Archived contact has no writable '+action);
  assert.match(await p.evaluate(id=>{try{DobbyFamilyStitchEngine.saveContact(id,{name:'Interdit'});return 'WRITTEN';}catch(error){return error.message;}},contact.id),/archiv|lecture seule/i);
  await open('contact-edit',{record:contact.id,mode:'edit'});await p.locator('[data-contact-detail]').waitFor();assert.equal(await p.locator('#rg-form').count(),0,'Direct edit route retains archived read-only detail');
  const restore=p.locator('[data-archive-detail-tools] [data-fa-action=archive-reactivate]');await restore.click();await p.getByRole('button',{name:'Annuler',exact:true}).click();assert.ok((await current()).archive.archivedAt);
  await restore.click();await p.getByRole('button',{name:'Confirmer la réactivation',exact:true}).click();await p.waitForFunction(id=>DobbyFamilyStitchEngine.read().contacts.find(row=>row.id===id)?.archive.archivedAt===null,contact.id);
  const after=await current();delete after.archive;assert.deepEqual(after,contact,'Reactivation retains all seven fields and unknown metadata');assert.equal((await records()).filter(row=>row.id===contact.id).length,1);
  await open('contacts');await p.locator('[data-fa-action=rg-contact-open][data-record='+contact.id+']').waitFor();
  await p.reload();await ready();assert.equal(await p.locator('[data-fa-action=rg-contact-open]').count(),1);assert.deepEqual(errors,[]);
  console.log('CONTACTS_ARCHIVES_INTEGRATION_PASS',width,'filter, cancel, native archive, read-only detail, reactivation, metadata, reload');await context.close();
 }
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1});
