/* FAM-01: real Family templates, canonical preferences and painted ambience. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const origin = process.env.DOBBY_TEST_ORIGIN || 'http://127.0.0.1:8863';
const out = path.resolve(process.env.DOBBY_FAM_EVIDENCE || path.join(__dirname, '../../docs/dobby-v7/evidence/fam01-24'), 'effects');
const baseline = process.env.FAM01_CAPTURE_BASELINE === '1';
const coreViews = ['salon', 'members', 'member-edit', 'agenda', 'memos', 'memo-edit'];
const extraViews = ['health', 'health-person', 'health-history', 'medical-edit', 'contacts', 'personal', 'menu'];
fs.mkdirSync(out, { recursive: true });
async function changedPixels(page, before, after) {
 return page.evaluate(async ([before, after]) => {
  const load = data => new Promise((resolve, reject) => {
   const image = new Image(); image.onload = () => resolve(image); image.onerror = reject;
   image.src = 'data:image/png;base64,' + data;
  });
  const [one, two] = await Promise.all([load(before), load(after)]);
  const canvas = document.createElement('canvas'); canvas.width = one.width; canvas.height = one.height;
  const context = canvas.getContext('2d'); context.drawImage(one, 0, 0);
  const a = context.getImageData(0, 0, one.width, one.height).data;
  context.clearRect(0, 0, one.width, one.height); context.drawImage(two, 0, 0);
  const b = context.getImageData(0, 0, two.width, two.height).data;
  let changed = 0;
  for (let index = 0; index < a.length; index += 4) {
   if (Math.abs(a[index] - b[index]) + Math.abs(a[index + 1] - b[index + 1]) + Math.abs(a[index + 2] - b[index + 2]) > 15) changed++;
  }
  return changed;
 }, [before.toString('base64'), after.toString('base64')]);
}
(async () => {
 const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
 const results = [];
 try {
  for (const width of [320, 390, 1440]) {
   const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'fr-BE', reducedMotion: 'no-preference' });
   await context.route('**/*', route => {
    const url = route.request().url();
    if (baseline && /family-review-effects\.(js|css)/.test(url)) return route.abort();
    return url.startsWith(origin + '/') ? route.continue() : route.abort();
   });
   await context.addInitScript(() => { window.__fam01Audio = 0; window.AudioContext = class { constructor() { window.__fam01Audio++; } }; });
   const page = await context.newPage(); page.setDefaultTimeout(15000);
   const errors = []; page.on('pageerror', error => errors.push(error.message));
   const ready = () => page.waitForFunction(() => window.DobbyFamilyStitch?.ready && window.DobbyStitchV7?.ready);
   const native = code => page.evaluate(code => DobbyFamilyStitchEngine.evaluate(code), code);
   const toggle = () => page.locator('body > header [data-e01-toggle=effects]');
   const ambient = () => page.locator('#fam01-ambience,#e013-ambience');
   const business = () => native('return JSON.stringify({members:st.familyMembers,events:st.familyEvents,notes:st.sharedFamilyNotes,localNotes:st.famNotes,planned:st.planned,missions:st.manualMissions});');
   await page.goto(origin + '/essai-stitch-v7/famille.html'); await ready();
   assert.equal(await toggle().getAttribute('aria-pressed'), 'true', 'No saved effects preference defaults to ON');
   assert.equal(await native('return st.stitchPreferences?.effects;'), undefined, 'Default ON does not manufacture another stored preference');
   const before = await business();
   const views = [];
   for (const view of [...coreViews, ...extraViews]) {
    await page.evaluate(view => DobbyFamilyStitch.open(view, { person: null, record: null, mode: 'new' }), view);
    await page.waitForFunction(view => document.body.dataset.familyView === view, view);
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].filter(image => image.src).map(image => image.decode().catch(() => {}))); });
    await page.waitForTimeout(250);
    if (await toggle().getAttribute('aria-pressed') !== 'true') await toggle().click();
    await page.waitForFunction(() => !document.querySelector('.magic-sparkle-dot'));
    const count = await ambient().locator('.e013-particle').count();
    const states = await ambient().locator('.e013-particle').evaluateAll(nodes => nodes.map(node => ({ opacity: Number(getComputedStyle(node).opacity), animation: getComputedStyle(node).animationName })));
    if (!baseline) {
     assert.equal(count, 22, view + ' reuses 22 native E01 motes');
     assert.equal(await ambient().count(), 1, view + ' has one ambience layer');
     assert.ok(states.some(state => state.opacity > .1 && state.animation === 'e013-drift'), view + ' particles are painted and animated');
    }
    const frozen = await page.addStyleTag({ content: '#fam01-ambience .e013-particle,#e013-ambience .e013-particle{animation-play-state:paused!important}' });
    const clip = await page.evaluate(() => { const rect = document.body.getBoundingClientRect(); return { x: Math.max(0, Math.round(rect.left)), y: 130, width: Math.min(innerWidth, Math.floor(rect.width)), height: 500 }; });
    const on = await page.screenshot({ clip });
    await toggle().click();
    const off = await page.screenshot({ clip });
    const changed = await changedPixels(page, on, off);
    await frozen.evaluate(node => node.remove());
    if (coreViews.includes(view)) {
     fs.writeFileSync(path.join(out, `${baseline ? 'baseline-' : ''}${view}-on-${width}.png`), on);
     fs.writeFileSync(path.join(out, `${baseline ? 'baseline-' : ''}${view}-off-${width}.png`), off);
    }
    if (!baseline) {
     assert.ok(changed > 30, view + ' ON/OFF changes painted main content pixels: ' + changed);
     assert.equal(await ambient().count(), 0, view + ' OFF removes ambient nodes');
     if (await page.locator('.fa-enter').count()) assert.equal(await page.locator('.fa-enter').first().evaluate(node => getComputedStyle(node).animationName), 'none', 'OFF stops Family entry effects');
     assert.equal(await page.locator('body > header').count(), 1);
     assert.equal(await page.locator('body > nav').count(), 1);
    }
    views.push({ view, particles: count, changedPixels: changed });
    console.log(baseline ? 'FAM01_BASELINE_VIEW' : 'FAM01_EFFECTS_VIEW', width, view, 'particles=' + count, 'changedPixels=' + changed);
   }
   if (baseline) {
    results.push({ width, views }); await context.close(); continue;
   }
   await page.reload(); await ready();
   assert.equal(await toggle().getAttribute('aria-pressed'), 'false', 'Explicit OFF survives reload');
   for (const view of coreViews) {
    await page.evaluate(view => DobbyFamilyStitch.open(view, { person: null, record: null, mode: 'new' }), view);
    assert.equal(await toggle().getAttribute('aria-pressed'), 'false', view + ' keeps the shared OFF preference');
    assert.equal(await ambient().count(), 0);
   }
   await toggle().click();
   await page.waitForFunction(() => !!document.querySelector('#fam01-ambience'));
   const moving = await page.locator('#fam01-ambience .e013-particle').first().evaluate(node => getComputedStyle(node).transform);
   await page.waitForTimeout(180);
   assert.notEqual(await page.locator('#fam01-ambience .e013-particle').first().evaluate(node => getComputedStyle(node).transform), moving, 'Native CSS particles actually move');
   await page.evaluate(() => { for (let index = 0; index < 10; index++) DobbyFamilyReviewEffects.mount(); });
   assert.equal(await ambient().count(), 1, 'Repeated mounts do not duplicate particles');
   assert.equal(await ambient().locator('.e013-particle').count(), 22);
   await page.emulateMedia({ reducedMotion: 'reduce' });
   await page.waitForFunction(() => !document.querySelector('#fam01-ambience,#e013-ambience'));
   assert.equal(await native('return st.stitchPreferences.effects;'), true, 'Reduced motion preserves the saved ON preference');
   assert.equal(await toggle().getAttribute('aria-pressed'), 'true');
   assert.match(await toggle().getAttribute('aria-description'), /réduites/);
   assert.equal(await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length), 0, 'Reduced motion leaves no running Family animations');
   for (const view of coreViews) {
    await page.evaluate(view => DobbyFamilyStitch.open(view, { person: null, record: null, mode: 'new' }), view);
    assert.equal(await ambient().count(), 0, view + ' respects reduced motion after template replacement');
    assert.equal(await toggle().getAttribute('aria-pressed'), 'true');
   }
   await page.screenshot({ path: path.join(out, `reduced-motion-${width}.png`) });
   await page.emulateMedia({ reducedMotion: 'no-preference' });
   await page.waitForFunction(() => !!document.querySelector('#fam01-ambience'));
   await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
   assert.ok(await ambient().locator('.e013-particle').evaluateAll(nodes => nodes.every(node => getComputedStyle(node).animationPlayState === 'paused')), 'Hidden document pauses all Family ambience');
   await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
   await page.evaluate(() => DobbyFamilyStitch.open('chat'));
   await page.waitForFunction(() => !!document.querySelector('#e013-ambience'));
   assert.equal(await ambient().count(), 1, 'Chat keeps only the existing canonical ambience');
   await page.evaluate(() => DobbyFamilyStitch.open('members'));
   await page.waitForFunction(() => !!document.querySelector('#fam01-ambience'));
   assert.equal(await ambient().count(), 1, 'Returning from Chat restores only the Family extension');
   const geometry = await page.locator('#fam01-ambience').evaluate(node => { const bounds = node.getBoundingClientRect(), body = document.body.getBoundingClientRect(); return { left: bounds.left, right: bounds.right, bodyLeft: body.left, bodyRight: body.right, pointer: getComputedStyle(node).pointerEvents, overflow: document.documentElement.scrollWidth }; });
   assert.equal(geometry.pointer, 'none'); assert.equal(geometry.overflow, width);
   assert.ok(geometry.left >= geometry.bodyLeft - 1 && geometry.right <= geometry.bodyRight + 1, 'Ambience stays inside the native Family viewport');
   assert.equal(await business(), before, 'Effects never alter Family records, notes, meal or mission data');
   assert.equal(await page.evaluate(() => __fam01Audio), 0, 'No automatic audio');
   assert.deepEqual(errors, []);
   results.push({ width, views, defaultOn: true, offPersists: true, reducedMotion: true, sharedPreferenceOnly: true, chatUsesNativeLayer: true, householdDataUntouched: true });
   await context.close(); console.log('FAM01_EFFECTS_PASS', width);
  }
  fs.writeFileSync(path.join(out, baseline ? 'baseline-results.json' : 'results.json'), JSON.stringify(results, null, 2) + '\n');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
