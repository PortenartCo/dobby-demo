/* FAM-20 calendar controls exercise dates, month lengths and year boundaries. */
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8863';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 const context=await browser.newContext({viewport:{width:390,height:900},locale:'fr-BE',reducedMotion:'reduce'});await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());const page=await context.newPage();await page.goto(origin+'/essai-stitch-v7/famille.html');await page.waitForFunction(()=>DobbyFamilyStitch?.ready);
 for(const [from,delta,to]of [['2026-11-01',1,'2026-12-01'],['2027-01-31',1,'2027-02-28'],['2028-01-31',1,'2028-02-29'],['2027-12-31',1,'2028-01-31'],['2027-01-31',-1,'2026-12-31']]){
  await page.evaluate(day=>DobbyFamilyStitch.open('agenda',{day}),from);await page.locator('[data-fa-action=agenda-mode][data-mode=month]').click();await page.locator('[data-fa-action=agenda-month-shift][data-delta="'+delta+'"]').click();await page.waitForFunction(day=>document.querySelector('[data-fa-action=agenda-day][aria-pressed=true]')?.dataset.date===day,to);assert.equal(await page.locator('[data-fa-action=agenda-day][aria-pressed=true]').getAttribute('data-date'),to);
 }
 console.log('FAM_AGENDA_MONTH_PASS calendar months, end-of-month clamp, leap year, year boundary, previous month');await context.close();
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
