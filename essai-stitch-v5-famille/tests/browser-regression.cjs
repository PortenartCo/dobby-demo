/* All browser regression pages execute unchanged in isolated, offline contexts. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const origin = process.env.DOBBY_TEST_ORIGIN || 'http://127.0.0.1:8765';
const results = [];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const name of ['browser-smoke', 'bootstrap-smoke', 'presentation-smoke']) {
      const context = await browser.newContext({ locale: 'fr-BE', timezoneId: 'Europe/Paris' });
      await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin + '/essai-stitch-v5-famille/tests/' + name + '.html');
      await page.waitForFunction(() => ['PASS', 'FAIL'].includes(document.querySelector('#status')?.dataset.result), {}, { timeout: 25000 });
      const result = await page.locator('#status').evaluate(el => ({ status: el.dataset.result, message: el.textContent }));
      results.push({ name, ...result, errors });
      console.log(name + ': ' + result.message);
      assert.equal(result.status, 'PASS', name);
      assert.deepEqual(errors, [], name + ': no uncaught JavaScript errors');
      await context.close();
    }
  } finally {
    const destination = path.resolve(__dirname, '../../docs/dobby-v6/evidence/browser-results.json');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, JSON.stringify(results, null, 2) + '\n');
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
