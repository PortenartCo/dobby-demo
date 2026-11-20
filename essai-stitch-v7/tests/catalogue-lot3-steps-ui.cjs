/* End-to-end synthetic ZIPs. All routes outside localhost are blocked. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8776';
const evidence=process.env.DOBBY_CATALOGUE_EVIDENCE;
const fixture=process.env.DOBBY_CATALOGUE_FIXTURE;
const digest=bytes=>createHash('sha256').update(Buffer.from(bytes)).digest('hex');

async function importZip(page,variant){
 const archive=fs.readFileSync(path.join(fixture,variant+'.zip')).toString('base64');
 return page.evaluate(async base64=>{
  const E=DobbyCuisineEngine,bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
  const plan=await DobbyRecipeImport.prepare(new File([bytes],'steps.zip'),{E});
  if(plan.entries[0].errors.length)throw Error(plan.entries[0].errors.join(' '));
  const {ids:[id]}=await DobbyRecipeImport.commit(plan,{0:'add'},{E});
  const entry=plan.entries[0];
  return {id,cover:entry.media.sha256,originalBytes:entry.mediaList.reduce((sum,item)=>sum+item.sourceBytes,0),
   webpBytes:entry.mediaList.reduce((sum,item)=>sum+item.bytes.length,0),media:entry.mediaList.length};
 },archive);
}
async function imageHash(locator){
 await locator.waitFor();
 const data=await locator.evaluate(async img=>{
  await img.decode();
  const response=await fetch(img.src);
  return {type:response.headers.get('Content-Type'),bytes:[...new Uint8Array(await response.arrayBuffer())]};
 });
 assert.match(data.type,/image\/webp/i);
 return digest(data.bytes);
}
async function screenshot(page,name){
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(evidence)await page.screenshot({path:path.join(evidence,name+'.png')});
}
async function cook(page,id,method,count){
 await page.evaluate(id=>DobbyCuisine.open('recipe',{id}),id);
 await page.locator(method==='tm5'?'#mode-tm5-btn':'#mode-trad-btn').click();
 await page.evaluate(()=>DobbyCuisine.open('cook'));
 const hero=page.locator('[data-e074-step-hero]');
 const expected=await page.evaluate(({id,method})=>DobbyCuisineEngine.read().recipes.find(row=>row.id===id)
  .importDetails.stepDetails.filter(item=>item.method===method).map(item=>item.images[0].sha256),{id,method});
 assert.equal(expected.length,count);
 for(let i=0;i<count;i++){
  if(i)await page.locator('[data-cu-action=e074-cook-next]').click();
  await hero.getByText('Étape '+(i+1)+'/'+count).waitFor();
  assert.equal(await hero.locator('img').count(),1);
  assert.equal(await imageHash(hero.locator('img')),expected[i],method+' '+i);
 }
}

(async()=>{
 assert.ok(fixture,'DOBBY_CATALOGUE_FIXTURE est requis.');
 if(evidence)fs.mkdirSync(evidence,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const proof=[];
 try{
  for(const width of [320,390,1440]){
   const context=await browser.newContext({viewport:{width,height:900},locale:'fr-BE',reducedMotion:'reduce'});
   await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(origin+'/essai-stitch-v7/');
   await page.waitForFunction(()=>window.DobbyCuisine?.ready);
   const variants={};
   for(const [key,count] of [['six',6],['diet',12],['classic',6]]){
    const data=await importZip(page,key);
    variants[key]=data;
    assert.equal(data.media,key==='classic'?9:count+1);
    assert.ok(data.webpBytes<data.originalBytes);
    await page.evaluate(id=>DobbyCuisine.open('recipe',{id}),data.id);
    assert.equal(await imageHash(page.locator('.e074-cover img')),data.cover);
    await cook(page,data.id,'classic',count);
    if(key!=='classic')await screenshot(page,key==='six'?'etape-6-'+width:'etape-12-'+width);
    if(key==='classic'){
     await cook(page,data.id,'tm5',2);
     await screenshot(page,'tm5-etape-2-'+width);
    }
   }
   await page.reload();
   await page.waitForFunction(()=>window.DobbyCuisine?.ready);
   await page.evaluate(id=>DobbyCuisine.open('recipe',{id}),variants.diet.id);
   assert.equal(await imageHash(page.locator('.e074-cover img')),variants.diet.cover);
   if(width===320){
    // Force the browser's MIME fallback. Import must stop before any native write.
    const data=await page.evaluate(async base64=>{
     const E=DobbyCuisineEngine,before=E.evaluate('return JSON.stringify(custom)');
     const canvas=HTMLCanvasElement.prototype,encode=canvas.toBlob;
     canvas.toBlob=function(callback){callback(new Blob(['unsupported'],{type:'image/png'}));};
     try{
      const plan=await DobbyRecipeImport.prepare(new File([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],'steps.zip'),{E});
      let refused=false;try{await DobbyRecipeImport.commit(plan,{0:'replace'},{E});}catch{refused=true;}
      return {errors:plan.entries[0].errors,refused,stable:E.evaluate('return JSON.stringify(custom)')===before};
     }finally{canvas.toBlob=encode;}
    },fs.readFileSync(path.join(fixture,'six.zip')).toString('base64'));
    assert.match(data.errors.join(' '),/Encodage WebP indisponible/);
    assert.ok(data.refused&&data.stable);
   }
   assert.deepEqual(errors,[]);
   proof.push({width,variants,status:'PASS'});
   await context.close();
   console.log('CATALOGUE_STEPS_UI_PASS',width,'6/6, 12/12, TM5 2/2, WebP et reload');
  }
 }finally{
  await browser.close();
  if(evidence)fs.writeFileSync(path.join(evidence,'rendu-etapes-fictives.json'),JSON.stringify(proof,null,2)+'\n');
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
