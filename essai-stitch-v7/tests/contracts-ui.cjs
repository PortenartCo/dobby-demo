const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
function realPdf(){const stream='BT /F1 18 Tf 36 120 Td (DOBBY - Contrat de test) Tj ET',objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 320 180] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>','<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];let body='%PDF-1.4\n';const offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(body));body+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';}const xref=Buffer.byteLength(body);body+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';return Buffer.from(body);}
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const width of [320,390,768,1024,1440]){
  const context=await browser.newContext({viewport:{width,height:900},locale:'fr-BE'});
  await context.route('**/*',r=>!/^https?:/.test(r.request().url())||r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/essai-stitch-v7/famille.html#contracts');await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);
  const native=(code,payload)=>page.evaluate(({code,payload})=>DobbyFamilyStitchEngine.evaluate(code,payload),{code,payload});
  const open=(view,record=null)=>page.evaluate(({view,record})=>DobbyFamilyStitch.open(view,{record}),{view,record});
  const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Contract screen must fit viewport '+width);
  await native('st.familyDocs=[];st.houseItems=[{id:"boiler",name:"Chaudière"},{id:"lift",name:"Ascenseur"}];save();');await open('contracts');
  assert.equal(await page.locator('main h1').innerText(),'Contrats & Assurances');
  assert.match(await page.locator('main').innerText(),/Retrouvez les contrats, assurances et échéances du foyer\./);
  assert.equal(await page.locator('main img,[data-document-facets]').count(),0);
  assert.match(await page.locator('main').innerText(),/0 éléments enregistrés/);
  await noOverflow();
  await page.getByRole('button',{name:'Ajouter un contrat manuellement',exact:true}).click();await page.waitForFunction(()=>DobbyFamilyStitch.view==='contract-edit');await page.locator('#contractName').waitFor({state:'visible'});
  assert.deepEqual(await page.locator('main form fieldset legend').allTextContents(),['A. Identification','B. Durée et échéances','C. Compléments','D. Documents']);
  await noOverflow();
  await page.locator('#contractName').fill('Entretien des installations');await page.locator('[name=type]').selectOption('maintenance');await page.locator('[name=scope]').selectOption('equipment');
  await page.locator('[name=equipmentIds][value=boiler]').check();await page.locator('[name=equipmentIds][value=lift]').check();
  await page.locator('[name=deadline]').fill('2028-03-31');await page.locator('[name=noticeValue]').fill('1');await page.locator('[name=noticeUnit]').selectOption('months');
  const pdf=realPdf();
  await page.locator('#contract-files').setInputFiles({name:'contrat.pdf',mimeType:'application/pdf',buffer:pdf});
  await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await page.waitForFunction(()=>DobbyFamilyStitch.view==='contract');
  const row=await native('return st.familyDocs.find(d=>d.title==="Entretien des installations");');assert.ok(row?.id);assert.deepEqual(row.contract.equipmentIds,['boiler','lift']);assert.equal(row.contract.amount,null);assert.equal(row.contract.notice.value,1);assert.equal(row.attachments.length,1);
  assert.match(await page.locator('main').innerText(),/29\/02\/2028/);assert.match(await page.locator('main').innerText(),/Chaudière.*Ascenseur/s);
  await noOverflow();
  await page.locator('[data-fa-action=rg-contract-file-open]').first().click();await page.waitForSelector('iframe[data-contract-pdf]');
  assert.ok((await page.locator('iframe[data-contract-pdf]').getAttribute('src')).startsWith('blob:'));
  if(width===390&&process.env.CONTRACTS_CAPTURE_PDF==='1'){const renderer=page.frames().find(frame=>frame.url().startsWith('chrome-extension://'))||await page.waitForEvent('framenavigated',{predicate:frame=>frame.url().startsWith('chrome-extension://')});await renderer.waitForFunction(()=>document.querySelector('pdf-viewer')?.shadowRoot);const path=require('node:path'),fs=require('node:fs'),output=path.resolve(__dirname,'../../docs/dobby-v7/contracts/evidence/pdf-preview-390.png');fs.mkdirSync(path.dirname(output),{recursive:true});await page.locator('#contract-preview').screenshot({path:output});}
  await page.getByRole('button',{name:'Modifier la fiche',exact:true}).click();await page.waitForFunction(()=>DobbyFamilyStitch.view==='contract-edit');await page.locator('[name=provider]').fill('Prestataire réel');await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await page.waitForFunction(()=>DobbyFamilyStitch.view==='contract');
  await page.reload();await page.waitForFunction(()=>DobbyFamilyStitch?.ready);await open('contract',row.id);assert.match(await page.locator('main').innerText(),/Prestataire réel/);
  const saved=await native('return st.familyDocs.find(d=>d.id===p.id);',{id:row.id});assert.equal(saved.attachments.length,1);assert.deepEqual(saved.contract.equipmentIds,['boiler','lift']);
  if(width===390){
   await page.locator('#contract-add-files').setInputFiles({name:'avenant.pdf',mimeType:'application/pdf',buffer:pdf});
   await page.waitForFunction(id=>DobbyFamilyStitchEngine.read().state.familyDocs.find(row=>row.id===id).attachments.length===2,row.id);
   await page.waitForSelector('#contract-add-files',{state:'attached'});
   assert.deepEqual((await native('return st.familyDocs.find(d=>d.id===p.id).attachments.map(a=>a.name);',{id:row.id})),['contrat.pdf','avenant.pdf']);
   page.once('dialog',dialog=>dialog.dismiss());await page.locator('[data-fa-action=rg-contract-file-remove]').first().click();assert.equal(await native('return st.familyDocs.find(d=>d.id===p.id).attachments.length;',{id:row.id}),2);
   await native('const d=st.familyDocs.find(d=>d.id===p.id);d.date="avant 2000";d.deadline="2027-02-30";d.extraLegacy={retained:true};d.contract.effectiveDate="date historique";d.contract.notice.extraLegacy="clause conservée";d.contract.equipmentIds=["boiler","retired"];save();',{id:row.id});
   await open('contract-edit',row.id);assert.match(await page.locator('main').innerText(),/date historique/);assert.match(await page.locator('main').innerText(),/Équipement indisponible \(retired\)/);
   await page.locator('[name=provider]').fill('Modification compatible');await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await page.waitForFunction(()=>DobbyFamilyStitch.view==='contract');
   const legacy=await native('return st.familyDocs.find(d=>d.id===p.id);',{id:row.id});assert.equal(legacy.date,'avant 2000');assert.equal(legacy.deadline,'2027-02-30');assert.equal(legacy.contract.effectiveDate,'date historique');assert.equal(legacy.contract.notice.extraLegacy,'clause conservée');assert.deepEqual(legacy.extraLegacy,{retained:true});assert.deepEqual(legacy.contract.equipmentIds,['boiler','retired']);assert.equal(legacy.attachments.length,2);
   await open('contract-edit',row.id);await page.locator('[name=note]').fill('Saisie non enregistrée');await native('st.familyDocs.find(d=>d.id===p.id).note="Modification concurrente";save();',{id:row.id});await page.evaluate(()=>DobbyFamilyStitch.refresh());
   assert.equal(await page.locator('[name=note]').inputValue(),'Saisie non enregistrée');await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#fa-notice')?.textContent.includes('modifié'));
   assert.equal(await native('return st.familyDocs.find(d=>d.id===p.id).note;',{id:row.id}),'Modification concurrente');
  }
  await open('document-library');assert.ok(await page.locator('#rg-doc-json').count());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  console.log('CONTRACTS_UI_PASS',width);await context.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
