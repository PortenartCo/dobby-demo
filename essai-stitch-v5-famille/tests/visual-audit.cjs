/* Run against a local HTTP server. Uses an ephemeral browser profile, never a real household. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const before = process.argv.includes('--before');
const evidence = path.resolve(__dirname, '../../docs/dobby-v6/evidence', before ? 'before' : 'after');
const origin = process.env.DOBBY_TEST_ORIGIN || 'http://127.0.0.1:8765';
const reports = [];
(async () => {
  fs.mkdirSync(evidence, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    // Local preview only: no Supabase, Apple, or other external writes/reads in this audit.
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(origin) || (before && /https:\/\/(lh3.googleusercontent.com|fonts.googleapis.com|fonts.gstatic.com)\//.test(url))) return route.continue();
      return route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin + '/essai-stitch-v5-famille/index.html');
    await page.waitForFunction(() => window.DobbyFamilyHealth && typeof go === 'function');
    if (!before) await page.waitForFunction(() => window.DobbyPresentation?.version === 6);
    async function inspect(name, screenshot = true) {
      await page.evaluate(() => document.fonts.ready);
      const report = await page.evaluate(() => ({
        width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        headingCount: document.querySelectorAll('#screen h1').length,
        nav: [...document.querySelectorAll('.nav button')].map(x => (x.querySelector('.dv6-nav-label') || x).textContent.trim()),
        heroCount: document.querySelectorAll('#screen .dv6-hero').length,
        overflow: [...document.querySelectorAll('#screen *, [role="dialog"] *')].filter(el => {
          const r = el.getBoundingClientRect();
          return r.width && (r.right > innerWidth + 1 || r.left < -1) && getComputedStyle(el).position !== 'absolute';
        }).slice(0, 8).map(el => el.tagName + '.' + el.className),
      }));
      reports.push({ name, ...report });
      if (screenshot) await page.screenshot({ path: path.join(evidence, name + '.png'), fullPage: true });
      if (!before) {
        assert.equal(report.scrollWidth, report.width, name + ': horizontal overflow');
        assert.equal(report.overflow.length, 0, name + ': overflowing elements ' + report.overflow.join(', '));
        assert.equal(report.headingCount, 1, name + ': one page heading');
      }
    }
    for (const width of before ? [390, 430] : [320, 390, 430, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of ['plan', 'home', 'missions', 'family']) {
        await page.evaluate(route => go(route), route);
        await inspect(route + '-' + width);
        if (!before) {
          const report = reports.at(-1);
          assert.equal(report.heroCount, 1, route + ': common hero');
          assert.deepEqual(report.nav, ['Traverse', 'Missions', 'Taverne', 'Famille']);
          const hero = await page.locator('.dv6-hero img').evaluate(img => ({ loaded: img.complete && img.naturalWidth > 0, fit: getComputedStyle(img).objectFit }));
          assert.ok(hero.loaded, route + ': local illustration loaded');
          assert.equal(hero.fit, 'contain', route + ': preserve the complete illustration');
        }
      }
    }
    for (const width of before ? [390] : [320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of ['recipes', 'pick', 'shop', 'documents', 'house', 'chat', 'menu', 'import', 'batch']) {
        await page.evaluate(route => go(route), route);
        await inspect(route + '-' + width, !before && width === 390);
      }
      for (const extra of ['contacts', 'lists', 'health', 'contracts', 'search', 'smart-import', 'contacts:edit', 'health:edit']) {
        await page.evaluate(extra => { st.detail = null; st.extraPage = extra; render(); }, extra);
        await inspect(extra.replace(':', '-') + '-' + width, !before && width === 390);
      }
      await page.evaluate(() => go('documents'));
      await page.locator('[data-doc="new"]').click();
      await inspect('document-form-' + width);
      await page.evaluate(() => go('missions'));
      await page.locator('[data-fms-action="new"]').click();
      await inspect('mission-form-' + width);
      await page.locator('[data-fms-action="close"]').first().click();
      await page.evaluate(() => go('family'));
      await page.locator('[data-fp-action="new"]').click();
      await inspect('agenda-form-' + width);
      await page.locator('[data-fp-action="close"]').first().click();
      // The shared medical editor intentionally requires an activated household.
      // Its real connected authorization is outside this offline visual audit.
    }
    if (!before) assert.deepEqual(errors, [], 'No uncaught browser errors');
    fs.writeFileSync(path.join(evidence, 'audit.json'), JSON.stringify({ before, errors, reports }, null, 2) + '\n');
    console.log((before ? 'BASELINE' : 'PASS') + ' — ' + reports.length + ' viewport/view checks; ' + errors.length + ' uncaught errors');
    await context.close();
  } finally {
    fs.writeFileSync(path.join(evidence, 'audit.json'), JSON.stringify({ before, reports }, null, 2) + '\n');
    await browser.close();
  }
})().catch(err => { console.error(err); process.exitCode = 1; });
