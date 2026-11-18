'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

async function createPage(browser,origin,width=390){
 const context=await browser.newContext({viewport:{width,height:900},locale:'fr-BE',timezoneId:'Europe/Brussels',reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[],requests=[],violations=[];
 page.setDefaultTimeout(20000);
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{const url=new URL(request.url());requests.push({origin:url.origin,path:url.pathname,method:request.method()});});
 await context.addInitScript(()=>document.addEventListener('securitypolicyviolation',event=>{(window.__lot4CspViolations??=[]).push({directive:event.effectiveDirective,blocked:event.blockedURI.split('?')[0]});}));
 return {context,page,errors,requests,violations,width,origin};
}
async function native(page,operation,...args){
 return page.evaluate(async({operation,args})=>{
  const api=window.DobbyFamilyStitchEngine.win().DobbyFamilyUI;
  if(operation==='state')return api.access.state();
  if(operation==='context')return api.getContext();
  if(operation==='admin')return api.access.admin(...args);
  if(operation==='requestFamilyAccount')return api.access.requestFamilyAccount(...args);
  throw Error('Unknown proof helper operation');
 },{operation,args});
}
async function ready(page,{verified=true}={}){
 await page.waitForFunction(()=>window.DobbyStitchV7?.ready && document.querySelector('#dv7-engine')?.contentWindow?.DobbyFamilyUI?.connectionState()?.ready);
 if(new URL(page.url()).pathname.endsWith('/famille.html'))await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);
 if(verified)await page.waitForFunction(()=>document.querySelector('#dv7-engine')?.contentWindow?.DobbyFamilyUI?.access?.state().verified===true);
}
async function open(fixture,view='salon',persona=1){
 await fixture.page.goto(`${fixture.origin}/fixture-${persona}/essai-stitch-v7/famille.html#${view}`);
 await ready(fixture.page,{verified:persona!==4});
 return fixture;
}
async function view(fixture,name){
 await fixture.page.evaluate(name=>window.DobbyFamilyStitch.open(name),name);
 await fixture.page.locator(`main[data-admin-view="${name}"]`).waitFor();
 await fixture.page.waitForFunction(()=>!document.querySelector('[data-admin-loading]'));
}
async function capture(fixture,out,name){
 await fixture.page.evaluate(()=>window.scrollTo(0,0));
 await fixture.page.evaluate(()=>document.fonts.ready);
 assert.equal(await fixture.page.locator('body>header[data-e01-chrome]').count(),1,'Complete V7 header is present');
 assert.equal(await fixture.page.locator('[data-e01-destination]').count(),6,'Six permanent destinations are preserved');
 const geometry=await fixture.page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,header:document.querySelector('body>header[data-e01-chrome]').getBoundingClientRect().toJSON(),banner:document.querySelector('[data-lot4-fixture-banner]').getBoundingClientRect().toJSON()}));
 assert.ok(geometry.scrollWidth<=geometry.width,'The actual V7 page must not overflow horizontally');
 assert.ok(geometry.header.top>=geometry.banner.bottom,'Preview banner must not obscure V7 header');
 fs.mkdirSync(out,{recursive:true});
 const file=path.join(out,`${name}-${fixture.width}.png`);
 await fixture.page.screenshot({path:file,fullPage:false});
 return {file:path.basename(file),width:fixture.width,geometry};
}
function assertClean(fixture){
 assert.deepEqual(fixture.errors,[],'Full application has no uncaught page errors');
 assert.deepEqual([...new Set(fixture.requests.filter(request=>request.origin!==fixture.origin).map(request=>request.origin))],[],'Interactive preview never contacts a hosted service');
}
module.exports={createPage,native,ready,open,view,capture,assertClean};
