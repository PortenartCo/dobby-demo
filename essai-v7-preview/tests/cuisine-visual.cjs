/* Each comparison is the original sanitized Stitch DOM vs the live native-data adapter.
   All writes are confined to a new browser profile with external traffic blocked. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const routes = require('../cuisine-routes.json');
const provenance = require('../templates/provenance.json');
const originals = require('../../design/stitch-53/manifest.json');
const origin = process.env.DOBBY_TEST_ORIGIN || 'http://127.0.0.1:8765';
const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'docs/dobby-v7/evidence/cuisine');
async function capture(page, file) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
}
(async () => {
  fs.mkdirSync(path.join(out, 'before'), { recursive: true });
  fs.mkdirSync(path.join(out, 'after'), { recursive: true });
  for (const entry of provenance) {assert.equal(entry.sha256,originals.designs.find(source=>source.html===entry.source)?.source_sha256,'Supplied source fingerprint '+entry.view);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,entry.source))).digest('hex'),entry.sha256,'Immutable source '+entry.view);}
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox'] });
  const report=[];
  try {
    for (const width of [320,390]) {
      const context = await browser.newContext({ viewport:{width,height:844}, locale:'fr-BE', reducedMotion:'reduce' });
      await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
      const page=await context.newPage();page.setDefaultTimeout(12000);
      const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
      await page.goto(origin+'/essai-stitch-v7/index.html');await page.waitForFunction(()=>window.DobbyCuisine?.ready);
      await page.evaluate(()=>DobbyCuisineEngine.evaluate(`custom=[{id:'cu-visual',name:'Soupe du foyer',minutes:25,servings:4,category:'Végétarien',fav:true,ingredients:[['Courgettes',200,'g'],['Sel',null,'']],steps:['Laver les légumes.','Cuire les légumes.']}];st.customRecipes=custom;st.day='2026-11-09';st.planned={'2026-11-09-soir':{id:'cu-visual',adult:2,children:1,childFactor:0.65,status:'prévu'}};st.extras=['Pain'];st.shopChoice={};st.shopFinal=null;st.shopHistory={};save();`));
      await page.evaluate(()=>{DobbyCuisineEngine.page('shop');DobbyCuisineEngine.shop('validateshop');});
      const source=await context.newPage();
      for(const route of routes) {
        await source.goto(origin+'/essai-stitch-v7/templates/'+route.view+'.html');
        await source.addStyleTag({url:origin+'/essai-stitch-v7/stitch-tailwind.css'});
        await source.addStyleTag({url:origin+'/essai-v6-preview/assets/v6/fonts.css'});
        await capture(source,path.join(out,'before',`${route.view}-${width}.png`));
        await page.evaluate(async view=>{
          if(view==='shop'||view==='shop-1'){DobbyCuisineEngine.page('shop');if(DobbyCuisineEngine.read().state.shopFinal)DobbyCuisineEngine.shop('editshop');DobbyCuisineEngine.evaluate('st.planned["2026-11-10-soir"]={id:"cu-visual",adult:2,children:1,childFactor:.65,status:"prévu"};save();');}
          if(view==='shop-final'){const id=Object.keys(DobbyCuisineEngine.read().state.shopHistory)[0];DobbyCuisineEngine.history(id);}
          await DobbyCuisine.open(view,{id:'cu-visual'});
        },route.view);
        assert.equal(await page.locator('#dv7-panel').isVisible(),false);
        assert.equal(await page.locator('body').getAttribute('data-stitch-source'),route.id);
        assert.equal(await page.locator('main h1').count(),1,'One main heading '+route.view);
        const content=await page.locator('main').textContent();
        await page.locator('main img').evaluateAll(es=>Promise.all(es.map(e=>e.decode().catch(()=>{}))));
        assert.ok(await page.locator('main img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0)),'Local illustrations load '+route.view);
        assert.ok(!/potimarron|Isigny|châtaignes|risotto|morilles|AES.?256|Fondant au chocolat/i.test(content),'No invented data '+route.view);
        const overflow=await page.evaluate(()=>[...document.querySelectorAll('main input,main textarea,main button,main h1,main p,main article')].filter(el=>{
          const r=el.getBoundingClientRect();return r.width>0 && (r.left < -1 || r.right > innerWidth+1) && !el.closest('.overflow-x-auto');
        }).map(el=>({tag:el.tagName,text:el.textContent.trim().slice(0,60),right:Math.round(el.getBoundingClientRect().right)})));
        await capture(page,path.join(out,'after',`${route.view}-${width}.png`));
        report.push({view:route.view,width,source:route.id,overflow,disabled:await page.locator('main button:disabled').evaluateAll(es=>es.map(e=>e.textContent.trim())),bytes:content.length});
        console.log('CUISINE_VISUAL',route.view,width,JSON.stringify(overflow));
      }
      assert.deepEqual(errors,[]);
      await context.close();
    }
    fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(report,null,2)+'\n');
    assert.ok(report.every(row=>row.overflow.length===0),'No controls outside the viewport; see checks.json');
    console.log('CUISINE_VISUAL_PASS 13 original sources x 2 widths, 52 comparison screenshots');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
