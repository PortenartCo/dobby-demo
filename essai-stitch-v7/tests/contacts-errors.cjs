/* Native failure/retry and actual family-profile gate, fictional browser storage. */
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const base=process.env.DOBBY_CONTACTS_BASE||'http://127.0.0.1:8765/';
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
const c=await b.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'});await c.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.dismiss());
await p.goto(new URL('essai-stitch-v7/famille.html#contacts',base).href);await p.waitForFunction(()=>DobbyFamilyStitch?.ready);
const engine=(code,values={})=>p.evaluate(({code,values})=>DobbyFamilyStitchEngine.evaluate(code,values),{code,values});
const row={id:'fixed',name:'DÉMO — École',category:'Ancienne catégorie',address:'Ancienne adresse',role:'Accueil',note:'Ancienne note'};
await engine('st.famContacts=[p.row];save();',{row});await p.evaluate(()=>DobbyFamilyStitch.open('contact-edit',{record:'fixed'}));
assert.equal(await p.locator('#contact-category').inputValue(),row.category);
await p.locator('#contact-name').fill('Ma saisie');await engine('st.famContacts[0].note="Reçu du foyer";save();');
await p.getByRole('button',{name:'Enregistrer',exact:true}).click();await p.locator('#fa-notice').waitFor();assert.match(await p.locator('#fa-notice').textContent(),/modifié/);assert.equal(await p.locator('#contact-name').inputValue(),'Ma saisie');assert.equal(await engine('return st.famContacts[0].note;'),'Reçu du foyer');
await p.locator('[data-fa-action=dismiss]').click();await p.evaluate(()=>DobbyFamilyStitch.open('contact-edit',{record:'fixed'}));
await p.locator('#contact-name').fill('DÉMO — Nouvelle saisie');
// Fail the storage boundary after the native hidden form has been mounted.
await p.evaluate(()=>DobbyFamilyStitchEngine.contactForm('fixed'));
await engine('window.__contactStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==="dobby-v5-familial-preview-20261108"&&JSON.parse(v).famContacts?.[0]?.name==="DÉMO — Nouvelle saisie")throw Error("TEST quota");return window.__contactStorageSet.call(this,k,v);};');
await p.getByRole('button',{name:'Enregistrer',exact:true}).click();await p.locator('#fa-notice').waitFor();assert.equal(await p.locator('#contact-name').inputValue(),'DÉMO — Nouvelle saisie');assert.equal(await engine('return st.famContacts[0].name;'),row.name,'Storage failure rolls back the registry');
await engine('Storage.prototype.setItem=window.__contactStorageSet;delete window.__contactStorageSet;');await p.locator('[data-fa-action=dismiss]').click();await p.getByRole('button',{name:'Enregistrer',exact:true}).click();await p.waitForFunction(()=>DobbyFamilyStitch.view==='contacts');
assert.equal(await engine('return st.famContacts.length;'),1,'Retry keeps one stable ID');assert.equal(await engine('return st.famContacts[0].category;'),row.category);
await p.locator('[data-fa-action=rg-contact-open]').click();await p.locator('[data-contact-detail]').waitFor();
await p.reload();await p.waitForFunction(()=>DobbyFamilyStitch?.ready);await p.locator('[data-contact-detail]').waitFor();assert.match(p.url(),/mode=read/);
// A restored browser-history draft must keep its original concurrency baseline.
await p.getByRole('button',{name:'Modifier',exact:true}).click();await p.locator('#contact-name').fill('DÉMO — Brouillon local');await p.evaluate(()=>DobbyFamilyStitch.open('contacts'));await engine('st.famContacts[0].name="DÉMO — Reçu distant";save();');
await p.goBack();await p.locator('#rg-form').waitFor();assert.equal(await p.locator('#contact-name').inputValue(),'DÉMO — Brouillon local');await p.getByRole('button',{name:'Enregistrer',exact:true}).click();await p.locator('#fa-notice').waitFor({timeout:3000});assert.equal(await engine('return st.famContacts[0].name;'),'DÉMO — Reçu distant','Restored draft must not overwrite remote edits');assert.equal(await p.locator('#contact-name').inputValue(),'DÉMO — Brouillon local');await p.locator('[data-fa-action=dismiss]').click();await p.evaluate(()=>DobbyFamilyStitch.open('contact-edit',{record:'fixed',mode:'read'}));
// Failed native deletion must retain both memory and stored data before retry.
await engine('window.__contactStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==="dobby-v5-familial-preview-20261108"&&JSON.parse(v).famContacts?.length===0)throw Error("TEST delete quota");return window.__contactStorageSet.call(this,k,v);};');
p.removeAllListeners('dialog');p.on('dialog',d=>d.accept());await p.getByRole('button',{name:'Supprimer',exact:true}).click();await p.locator('#fa-notice').waitFor();assert.equal(await engine('return st.famContacts.length;'),1,'Failed deletion restores native memory');
await engine('Storage.prototype.setItem=window.__contactStorageSet;delete window.__contactStorageSet;');await p.locator('[data-fa-action=dismiss]').click();
// A dependent profile uses the existing demo identity path, not a bypass of the UI gate.
await engine('st.familyMembers.push({id:"contacts-child",name:"DÉMO — Enfant",memberCategory:"child"});window.__contactReview=window.DobbyReview;window.DobbyReview={demoMemberId:"contacts-child"};save();');
await p.evaluate(()=>DobbyFamilyStitch.open('contacts'));assert.equal(await p.getByRole('button',{name:'+ Inscrire un nouveau contact',exact:true}).isDisabled(),true);await p.locator('[data-fa-action=rg-contact-open]').click();await p.locator('[data-contact-detail]').waitFor();assert.equal(await p.getByRole('button',{name:'Modifier',exact:true}).isDisabled(),true);assert.equal(await p.getByRole('button',{name:'Supprimer',exact:true}).isDisabled(),true);
assert.match(await p.evaluate(()=>{try{DobbyFamilyStitchEngine.saveContact('fixed',{name:'Interdit'});return 'WRITTEN';}catch(e){return e.message;}}),/lecture seule/);
assert.match(await p.evaluate(()=>{try{DobbyFamilyStitchEngine.deleteContact('fixed');return 'DELETED';}catch(e){return e.message;}}),/lecture seule/);
assert.deepEqual(errors,[]);console.log('CONTACTS_ERRORS_PASS stale edit, quota rollback/retry, legacy category, detail reload, dependent read-only gate');await c.close();
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
