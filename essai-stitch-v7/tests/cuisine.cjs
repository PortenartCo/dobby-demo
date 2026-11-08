/* Cuisine acceptance: real source templates, real V5 writers, ephemeral browser profile. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const origin = process.env.DOBBY_TEST_ORIGIN || 'http://127.0.0.1:8765';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-BE', reducedMotion: 'reduce' });
    await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
    const page = await context.newPage();
    page.on('dialog', dialog => dialog.accept());
    await page.goto(origin + '/essai-stitch-v7/index.html');
    await page.waitForFunction(() => window.DobbyCuisine?.ready === true, {}, { timeout: 15000 });
    await page.locator('[data-cu-action="pick"]').first().click();
    await page.waitForFunction(() => document.body.dataset.cuisineView === 'pick');
    assert.equal(await page.locator('#dv7-panel').isVisible(), false, 'Cuisine never opens the V5 panel');
    await page.locator('[data-cu-recipe="pasta"]').click();
    await page.locator('[data-cu-action="save-meal"]').click();
    await page.waitForFunction(() => document.body.dataset.cuisineView === 'taverne');
    assert.ok(await page.locator('[data-cu-recipe="pasta"]').count());
    console.log('CUISINE_PATH_PASS');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
