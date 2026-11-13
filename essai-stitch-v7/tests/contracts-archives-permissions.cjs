const assert=require('node:assert/strict'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 const context=await browser.newContext({viewport:{width:390,height:900}});await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());const page=await context.newPage();
 await page.goto(origin+'/essai-stitch-v7/famille.html#document-library');await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);
 await page.evaluate(()=>DobbyFamilyStitchEngine.evaluate('st.familyMembers=[{id:"fixture-child",name:"Enfant test",memberCategory:"child"}];window.DobbyReview=Object.freeze({demoMemberId:"fixture-child"});st.familyDocs=[{id:"shared-contract",title:"Contrat partagé",category:"Contrats",attachmentName:"original.pdf",attachmentType:"application/pdf"},{id:"private-document",title:"Archive privée",category:"Autre"}];save();'));
 await page.evaluate(()=>DobbyFamilyStitch.open('document-library'));await page.locator('[data-document-rows] [data-record=shared-contract][data-fa-action=rg-doc-open]').click();await page.waitForFunction(()=>DobbyFamilyStitch.view==='contract');assert.match(await page.locator('main').innerText(),/Documents associés/);
 await page.evaluate(()=>DobbyFamilyStitch.open('document',{record:'shared-contract'}));assert.equal(await page.evaluate(()=>DobbyFamilyStitch.sharedReadOnly()),true);
 for(const action of ['rg-doc-edit','rg-doc-delete','rg-doc-detach'])assert.equal(await page.locator('[data-fa-action='+action+']').isDisabled(),true,action+' must be disabled on shared record');
 assert.equal(await page.locator('#rg-doc-file').isDisabled(),true,'Shared file picker disabled');assert.equal(await page.locator('[data-fa-action=rg-doc-download]').isEnabled(),true,'Reading remains available');
 for(const action of ['rg-doc-edit','rg-doc-delete','rg-doc-detach','rg-cloud-toggle','rg-cloud-local','rg-cloud-remove']){
  const error=await page.evaluate(async action=>{const button=document.createElement('button');button.dataset.record='shared-contract';try{await DobbyRegister.act(action,button,{});return null;}catch(error){return error.message;}},action);assert.match(error,/lecture seule/,action+' must be rejected even when dispatched directly');
 }
 await page.evaluate(()=>DobbyFamilyStitch.open('document-edit',{record:'shared-contract'}));assert.equal(await page.locator('main #rg-form').count(),0,'Direct edit route does not mount a shared writer');
 await page.evaluate(()=>DobbyFamilyStitch.open('document',{record:'private-document'}));for(const action of ['rg-doc-edit','rg-doc-delete'])assert.equal(await page.locator('[data-fa-action='+action+']').isEnabled(),true,'Private archive existing controls retained');assert.equal(await page.locator('#rg-doc-file').isEnabled(),true);
 console.log('CONTRACTS_ARCHIVES_PERMISSIONS_PASS');await context.close();
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1});
