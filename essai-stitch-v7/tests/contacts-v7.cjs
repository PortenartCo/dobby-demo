/* Real Chromium journeys over native forms/storage; fictional data only. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const base=process.env.DOBBY_CONTACTS_BASE||'http://127.0.0.1:8765/';
const out=process.env.DOBBY_CONTACTS_EVIDENCE||path.join(require('node:os').tmpdir(),'dobby-contacts-evidence');
fs.mkdirSync(out,{recursive:true});
const legacy={id:'legacy-contact-fixed',name:'DÉMO — Ancien contact',role:'Proche',phone:'',email:'',note:'Ancienne note',customMetadata:{keep:true}};
const values={name:'DÉMO — Clinique Érable',category:'Santé',role:'Pédiatrie',phone:'+32 2 000 00 00',email:'erable@example.test',address:'12 rue des Nuages\n1000 Bruxelles',note:'Données fictives uniquement.\nAccueil sur rendez-vous.'};
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{for(const width of (process.env.DOBBY_CONTACTS_WIDTHS||'320,390,768,1440').split(',').map(Number)){
 const context=await browser.newContext({viewport:{width,height:900},locale:'fr-BE',timezoneId:'Europe/Paris',reducedMotion:'reduce'});
 const errors=[];await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 const p=await context.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.dismiss());
 const open=(view,options={})=>p.evaluate(({view,options})=>DobbyFamilyStitch.open(view,options),{view,options});
 const contacts=()=>p.evaluate(()=>DobbyFamilyStitchEngine.read().contacts);
 const list=async()=>{await p.waitForFunction(()=>DobbyFamilyStitch.view==='contacts');await p.locator('#contactSearchInput').waitFor();};
 const detail=()=>p.locator('[data-contact-detail]');
 await p.goto(new URL('essai-stitch-v7/famille.html#contacts',base).href);await p.waitForFunction(()=>window.DobbyFamilyStitch?.ready);
 await p.evaluate(row=>DobbyFamilyStitchEngine.evaluate('st.famContacts=[p.row];save();',{row}),legacy);await open('contacts');
 // The visible validated label was previously unbound/disabled by the shell.
 const add=p.getByRole('button',{name:'+ Inscrire un nouveau contact',exact:true});assert.equal(await add.count(),1);assert.equal(await add.isEnabled(),true,'Validated add button must be wired');
 await add.click();await p.locator('#rg-form').waitFor();
 assert.equal(await p.locator('#rg-form input,#rg-form select,#rg-form textarea').count(),7);
 assert.equal(await p.locator('#rg-form :required').count(),1);
 assert.deepEqual(await p.locator('#contact-category option').allTextContents(),['Sans catégorie','Famille','Proches','Santé','École','Artisan','Services','Autre']);
 await p.getByRole('button',{name:'Enregistrer',exact:true}).click();assert.equal((await contacts()).length,1,'Required name blocks empty submission');
 for(const [name,value]of Object.entries(values)){const f=p.locator('#rg-form [name="'+name+'"]');if(name==='category')await f.selectOption(value);else await f.fill(value);}
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Form stays inside the viewport');
 await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:path.join(out,'form-'+width+'.png'),fullPage:true});
 await p.getByRole('button',{name:'Enregistrer',exact:true}).click();await list();
 const saved=(await contacts()).find(r=>r.name===values.name);assert.ok(saved?.id);for(const [key,value]of Object.entries(values))assert.equal(saved[key],value,key+' is persisted');
 assert.deepEqual((await contacts()).find(r=>r.id===legacy.id),legacy);
 assert.equal(await p.locator('#contactsContainer [data-fa-action="rg-contact-edit"],#contactsContainer [data-fa-action="rg-contact-delete"]').count(),0);
 for(const query of ['erable','sante','pediatrie','+32 2','erable@example.test','Bruxelles']){await p.locator('#contactSearchInput').fill(query);assert.equal(await p.locator('[data-fa-action="rg-contact-open"]').count(),1,'Search '+query);}
 await p.locator('#contactSearchInput').fill('AUCUN RÉSULTAT');assert.equal(await p.locator('[data-fa-action="rg-contact-open"]').count(),0);
 await p.locator('#contactSearchInput').fill('');
 const card=p.locator('[data-fa-action="rg-contact-open"][data-record="'+saved.id+'"]');await card.click({position:{x:8,y:8}});await detail().waitFor();
 for(const value of Object.values(values))assert.ok((await detail().textContent()).includes(value),'Detail includes '+value);
 assert.equal(await p.locator('[data-contact-detail] a[href^="tel:"]').count(),1);assert.equal(await p.locator('[data-contact-detail] a[href^="mailto:"]').count(),1);
 assert.equal(new URL(await p.locator('[data-contact-detail] a[href^="https://www.google.com/maps"]').getAttribute('href')).searchParams.get('query'),values.address);
 const archivesAvailable=await p.evaluate(()=>!!window.DobbyArchivesUI&&!!DobbyFamilyStitchEngine.win().DobbyArchiveSources);
 assert.equal(await p.getByRole('button',{name:'Archiver',exact:true}).count(),archivesAvailable?1:0,'Archive action follows the available native Archives module');
 await p.getByRole('button',{name:'Modifier',exact:true}).click();await p.locator('#rg-form').waitFor();
 for(const [name,value]of Object.entries(values))assert.equal(await p.locator('#rg-form [name="'+name+'"]').inputValue(),value);
 await p.locator('#contact-role').fill('Médecine familiale');await p.getByRole('button',{name:'Enregistrer',exact:true}).click();await list();
 await p.reload();await p.waitForFunction(()=>window.DobbyFamilyStitch?.ready);await list();
 assert.equal((await contacts()).find(r=>r.id===saved.id).role,'Médecine familiale');
 // Card behaves as a native button across its entire surface and keyboard.
 await p.locator('[data-fa-action="rg-contact-open"][data-record="'+legacy.id+'"]').focus();await p.keyboard.press('Enter');await detail().waitFor();
 assert.equal(await detail().locator('dt').count(),3,'Empty optional fields are hidden (name, role, notes remain)');
 await p.getByRole('button',{name:'Modifier',exact:true}).click();await p.locator('#contact-name').fill('DÉMO — Héritage conservé');
 await p.getByRole('button',{name:'Enregistrer',exact:true}).click();await list();assert.deepEqual((await contacts()).find(r=>r.id===legacy.id).customMetadata,legacy.customMetadata);
 await p.locator('[data-fa-action="rg-contact-open"][data-record="'+saved.id+'"]').click();await detail().waitFor();
 await p.getByRole('button',{name:'Supprimer',exact:true}).click();assert.ok((await contacts()).some(r=>r.id===saved.id),'Cancel deletion keeps the row');
 p.removeAllListeners('dialog');p.on('dialog',d=>d.accept());await p.getByRole('button',{name:'Supprimer',exact:true}).click();await list();assert.ok(!(await contacts()).some(r=>r.id===saved.id));
 await add.click();await p.locator('#contact-name').fill('Abandonné');await p.getByRole('button',{name:'Annuler',exact:true}).click();await list();
 await add.click();assert.equal(await p.locator('#contact-name').inputValue(),'','Cancel discards the draft');await p.getByRole('button',{name:'Annuler',exact:true}).click();await list();
 const content=await p.locator('main').textContent();for(const removed of ['Note bienveillante','LOCAL','Tous (','Prestataire fictif','Ajouter un contact','Répertoire Familial DOBBY','Revenir au carnet','Enregistrement','Gérer le foyer','Synchroniser le module','Foyer non connecté','Cercle familial'])assert.ok(!content.toLocaleLowerCase('fr').includes(removed.toLocaleLowerCase('fr')),'Removed '+removed);
 assert.equal(await p.locator('main input[type=search]').count(),1);assert.equal(await p.locator('#contactSearchInput').getAttribute('placeholder'),'Rechercher');
 assert.equal(await p.locator('nav:visible').count(),1);assert.deepEqual(await p.locator('nav:visible a').evaluateAll(links=>links.map(a=>a.getAttribute('aria-label'))),['Accueil','Tâches','Repas','Courses','Famille','Menu']);
 const bounds=await p.evaluate(()=>{const img=document.querySelector('[data-contact-hero] img'),add=document.querySelector('[data-fa-action="rg-contact-new"]'),nav=document.querySelector('nav[data-e01-chrome]');return{overflow:document.documentElement.scrollWidth>innerWidth,img:img?.complete&&img.naturalWidth===1376,fit:img&&getComputedStyle(img).objectFit,addFont:parseFloat(getComputedStyle(add).fontSize),navBottom:nav?.getBoundingClientRect().bottom};});
 assert.equal(bounds.overflow,false);assert.equal(bounds.img,true);assert.equal(bounds.fit,'contain');assert.ok(bounds.addFont>=16);assert.ok(bounds.navBottom<=902);
 await p.screenshot({path:path.join(out,'list-'+width+'.png'),fullPage:true});
 // Facade guard still rejects writes for a read-only family profile.
 assert.match(await p.evaluate(()=>{const original=DobbyFamilyStitch;window.DobbyFamilyStitch={...original,sharedReadOnly:()=>true};try{DobbyFamilyStitchEngine.saveContact(null,{name:'Interdit'});return 'WRITTEN';}catch(e){return e.message;}finally{window.DobbyFamilyStitch=original;}}),/lecture seule/);
 assert.deepEqual(errors,[]);console.log('CONTACTS_V7_PASS',width,'CRUD, reload, search, full card, legacy, cancel, permissions, dock, responsive');await context.close();
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
