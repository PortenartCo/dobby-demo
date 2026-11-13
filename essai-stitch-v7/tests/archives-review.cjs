/* Causal regressions from independent review; fictional local data only. */
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 const context=await b.newContext({viewport:{width:390,height:900}});await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
 for(const scenario of ['planned','instructions','isolation','selection'].filter(name=>!process.env.DOBBY_ARCHIVE_REVIEW_CASE||name===process.env.DOBBY_ARCHIVE_REVIEW_CASE)){
  const p=await context.newPage();await p.goto(origin+'/essai-stitch-v7/index.html');await p.waitForFunction(()=>DobbyCuisine?.ready);
  await p.evaluate(()=>DobbyCuisineEngine.evaluate('const r=JSON.parse(JSON.stringify(BASE[0]));r.id="review-archive";r.name="TEST recette conservée";r.archive={version:1,archivedAt:new Date().toISOString()};custom=[r];st.customRecipes=custom;st.planned={[todayISO()+"-soir"]:{id:r.id,people:2,status:"prévu"}};st.famContacts=[{id:"denied",name:"SECRET_OTHER_HOME",note:"SECRET_NOTE",archive:{version:1,archivedAt:new Date().toISOString(),householdId:"other-home"}}];save();'));
  if(scenario==='planned'){await p.evaluate(()=>DobbyCuisine.open('taverne'));assert.ok((await p.locator('[data-e07-dinner]').innerText()).includes('TEST recette conservée'));assert.ok(await p.locator('[data-e07-dinner] [data-cu-action=recipe][data-id=review-archive]').count());}
  if(scenario==='instructions'){await p.evaluate(()=>DobbyCuisine.open('recipe',{id:'review-archive'}));assert.equal(await p.locator('#tab-btn-steps').isEnabled(),true);await p.locator('#tab-btn-steps').click();await p.locator('#tab-content-steps').waitFor({state:'visible'});assert.ok((await p.locator('#tab-content-steps').innerText()).includes('Lavez les légumes'));assert.equal(await p.locator('#mode-trad-btn').isEnabled(),true);assert.equal(await p.locator('[data-cu-action=edit-recipe]').isDisabled(),true);}
  if(scenario==='isolation'){
   await p.goto(origin+'/essai-stitch-v7/famille.html#contact-edit?record=denied');await p.waitForFunction(()=>DobbyFamilyStitch?.ready);assert.ok(!(await p.locator('main').innerText()).includes('SECRET_'));assert.equal(await p.locator('#contact-name').count(),0);
   const error=await p.evaluate(()=>{try{DobbyFamilyStitchEngine.saveContact('denied',{name:'Forged',id:'denied'});return null;}catch(e){return e.message;}});assert.match(error,/introuvable|accès|foyer/i);assert.equal(await p.evaluate(()=>DobbyFamilyStitchEngine.read().state.famContacts[0].name),'SECRET_OTHER_HOME');
   const raw=await p.evaluate(()=>DobbyFamilyStitchEngine.evaluate('st.extraPage="contacts:edit:denied";render();const form=document.getElementById("xContactForm");form.elements.name.value="Raw forged";form.requestSubmit();return st.famContacts[0].name;'));assert.equal(raw,'SECRET_OTHER_HOME','Native form handler also refuses the denied source');
   await p.evaluate(()=>DobbyFamilyStitchEngine.evaluate('custom[0].archive.householdId="other-home";save();'));await p.goto(origin+'/essai-stitch-v7/index.html#recipe?id=review-archive');await p.waitForFunction(()=>DobbyCuisine?.ready);assert.ok(!(await p.locator('main').innerText()).includes('TEST recette conservée'));
  }
  if(scenario==='selection'){const error=await p.evaluate(()=>{try{DobbyCuisineEngine.choose({id:'review-archive',date:'2030-01-02',slot:'midi',adult:2,children:0});return null;}catch(e){return e.message;}});assert.match(error,/archiv|retirée/i);}
  await p.close();console.log('ARCHIVES_REVIEW_PASS',scenario);
 }
 await context.close();
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
