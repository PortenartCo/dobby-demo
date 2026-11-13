/* Native local UI, fictional canonical binding only. Every remote request is blocked. */
'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8863';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 const context=await browser.newContext({viewport:{width:390,height:900}}),attempts=[];
 await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():(attempts.push(r.request().url()),r.abort()));
 const page=await context.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/essai-stitch-v7/famille.html');await page.waitForFunction(()=>DobbyFamilyStitch?.ready);
 await page.evaluate(()=>{const E=DobbyFamilyStitchEngine,w=E.win();window.__originalFamilyApi=w.DobbyFamilyUI;E.evaluate('st.familyMembers=[{id:"TEST-CHILD",name:"TEST Child",memberCategory:"parent"}];st.familyEvents=[];st.sharedFamilyNotes=[];window.DobbyReview=undefined;save();');
  window.__role='child';window.__verified=true;
  w.DobbyFamilyUI=Object.freeze({...w.DobbyFamilyUI,
   connectionState:()=>({verified:window.__verified,verifying:false,access:window.__verified?'verified':'cached'}),
   getContext:()=>({identityVerified:window.__verified,userId:'TEST-U',householdId:'TEST-H',memberId:'TEST-CHILD',permissions:{canEdit:true,canMagic:true,canCreate:true,canManageDependents:true}}),
   access:{...w.DobbyFamilyUI.access,state:()=>({authenticated:true,phase:window.__verified?'active':'unavailable',verified:window.__verified,userId:'TEST-U',householdId:'TEST-H',memberId:'TEST-CHILD',profile:{id:'TEST-CHILD',memberCategory:window.__role},permissions:{canEdit:true,canMagic:true,canCreate:true,canManageDependents:true}})}
  });
 });
 await page.evaluate(()=>DobbyFamilyStitch.open('agenda'));assert.equal(await page.locator('[data-fa-action=event-new]').isDisabled(),true,'Canonical child does not acquire parent write controls from the local row');
 await assert.rejects(page.evaluate(()=>DobbyFamilyStitchEngine.saveEvent(null,{title:'TEST forbidden',date:'2026-11-13'})),/lecture seule/);
 await page.evaluate(()=>DobbyFamilyStitch.open('member-detail',{person:'TEST-CHILD'}));assert.equal(await page.locator('[data-fa-action=member-edit]').isDisabled(),true);assert.equal(await page.locator('[data-fa-action=member-magic][data-kind=house]').isDisabled(),false,'Own magic remains available');
 await page.evaluate(()=>{DobbyFamilyStitchEngine.evaluate('st.familyMembers[0].memberCategory="child";');window.__role='parent';return DobbyFamilyStitch.open('member-detail',{person:'TEST-CHILD'});});
 assert.equal(await page.locator('[data-fa-action=member-edit]').isDisabled(),false,'Confirmed parent retains existing own-profile editing despite stale local category');
 assert.equal(await page.getByRole('button',{name:'Donner accès à DOBBY',exact:true}).isDisabled(),true,'Targeted child account API remains gated, including for a parent');
 await page.evaluate(()=>{window.__verified=false;return DobbyFamilyStitch.open('agenda');});assert.equal(await page.locator('[data-fa-action=event-new]').isDisabled(),true,'Incomplete verification does not expose shared write controls');
 await page.evaluate(()=>{window.__verified=true;window.__role=undefined;return DobbyFamilyStitch.open('agenda');});assert.equal(await page.locator('[data-fa-action=event-new]').isDisabled(),true,'Missing server category never falls back to a local parent');
 assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().events.length),0);assert.equal(attempts.some(url=>/supabase|auth\/v1|rest\/v1/.test(url)),false);assert.deepEqual(errors,[]);
 await context.close();console.log('RESERVES_FAMILY_ACCESS_PASS canonical child/parent, stale or incomplete role, own magic, targeted access disabled; fictional local only');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
