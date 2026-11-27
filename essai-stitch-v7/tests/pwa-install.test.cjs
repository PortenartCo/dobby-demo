const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { createServer } = require('node:http');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright');

let browser;
let server;
let origin;
let workerVersion = 1;
const directory = path.join(__dirname, '..');
const menu = '<main class="rg-menu-page"><h1>Menu</h1><div id="menu-sections"><a href="#other">Rubrique</a></div></main>';

before(async () => {
  server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    if (request.url === '/pwa-sw.js') {
      response.setHeader('Content-Type', 'application/javascript');
      response.end(`
        const version = ${workerVersion};
        self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
        self.addEventListener('message', event => {
          if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
        });
      `);
    } else if (/^\/essai-stitch-v7\/(famille|index)\.html$/.test(request.url)) {
      const family = request.url.endsWith('/famille.html');
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="./pwa-install.css"><script defer src="./pwa-install.js"></script><body data-dv7-screen="${family ? 'famille' : 'taverne'}"${family ? ' data-family-view="menu"' : ''}>${family ? menu : '<main><h1>Repas</h1></main>'}</body></html>`);
    } else if (/^\/essai-stitch-v7\/pwa-install\.(js|css)$/.test(request.url)) {
      const type = request.url.endsWith('.js') ? 'application/javascript' : 'text/css';
      try {
        const file = await readFile(path.join(directory, path.basename(request.url)));
        response.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }).end(file);
      } catch (error) {
        response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
      }
    } else {
      response.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox'],
  });
});

after(async () => {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
});

async function openMenu(page) {
  await page.goto(`${origin}/essai-stitch-v7/famille.html#menu`);
}

function installButton(page) {
  return page.getByRole('button', { name: 'Installer DOBBY', exact: true });
}

test('Safari iPad en affichage ordinateur affiche les étapes Apple sur demande et rend le focus au bouton', async () => {
  const context = await browser.newContext({
    serviceWorkers: 'block',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
    hasTouch: true,
    viewport: { width: 320, height: 550 },
  });
  try {
    const page = await context.newPage();
    await context.addInitScript(() => Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 }));
    await openMenu(page);
    const install = installButton(page);
    const help = page.getByRole('dialog', { name: 'Installer DOBBY' });
    assert.equal(await help.isVisible(), false);
    assert.equal(await page.locator('#menu-sections > *').count(), 1);
    await install.click({ timeout: 1500 });
    assert.match(await help.innerText(), /Partager.*Sur l’écran d’accueil.*Ouvrir comme app web.*Ajouter/s);
    await page.keyboard.press('Escape');
    await help.waitFor({ state: 'hidden' });
    assert.equal(await install.evaluate(button => document.activeElement === button), true);
    await page.locator('main').evaluate((main, layout) => { main.outerHTML = layout; }, menu);
    await install.click();
    await help.getByRole('button', { name: 'Fermer' }).click();
    await help.waitFor({ state: 'hidden' });
  } finally {
    await context.close();
  }
});

test('Chromium ouvre son prompt uniquement au clic et masque l’action après appinstalled', async () => {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  try {
    const page = await context.newPage();
    await openMenu(page);
    const canceled = await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      window.promptCalls = 0;
      event.prompt = async () => { window.promptCalls += 1; return { outcome: 'accepted' }; };
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });
    assert.equal(canceled, true);
    assert.equal(await page.evaluate(() => window.promptCalls), 0);
    await installButton(page).click({ timeout: 1500 });
    assert.equal(await page.evaluate(() => window.promptCalls), 1);
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
    await installButton(page).waitFor({ state: 'hidden' });
  } finally {
    await context.close();
  }
});

test('le menu en mode autonome Apple ignore le prompt Chromium et conserve ses rubriques', async () => {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  try {
    await context.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
    const page = await context.newPage();
    await openMenu(page);
    const prompted = await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      event.prompt = async () => {};
      return !window.dispatchEvent(event);
    });
    assert.equal(prompted, true);
    assert.equal(await installButton(page).count(), 0);
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await page.getByRole('link', { name: 'Rubrique' }).count(), 1);
  } finally {
    await context.close();
  }
});

test('un aperçu de revue ne propose pas d’installation et ne crée pas de service worker', async () => {
  const context = await browser.newContext();
  try {
    await context.addInitScript(() => { window.DobbyReview = {}; });
    const page = await context.newPage();
    await openMenu(page);
    assert.equal(await installButton(page).count(), 0);
    assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0);
  } finally {
    await context.close();
  }
});

test('une mise à jour recharge automatiquement l’onglet qui l’accepte et propose de recharger les autres', async () => {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(`${origin}/essai-stitch-v7/index.html`);
    await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 2500 });
    const worker = await page.evaluate(() => navigator.serviceWorker.controller.scriptURL);
    assert.equal(worker, `${origin}/pwa-sw.js`);
    assert.equal(await page.getByText('Une mise à jour de DOBBY est disponible.').count(), 0);

    workerVersion = 2;
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    const update = page.getByRole('button', { name: 'Mettre à jour' });
    await update.waitFor({ timeout: 5000 });

    const otherPage = await context.newPage();
    await openMenu(otherPage);
    const dismiss = otherPage.getByRole('button', { name: 'Plus tard' });
    await dismiss.click({ timeout: 5000 });
    await dismiss.waitFor({ state: 'hidden' });
    await otherPage.evaluate(() => { window.beforeUpdate = true; });

    await Promise.all([page.waitForEvent('domcontentloaded'), update.click()]);
    assert.equal(await page.getByText('Une mise à jour de DOBBY est disponible.').count(), 0);
    const reload = otherPage.getByRole('button', { name: 'Recharger DOBBY' });
    await reload.waitFor({ timeout: 1800 });
    assert.equal(await otherPage.evaluate(() => window.beforeUpdate), true);
    await Promise.all([otherPage.waitForEvent('domcontentloaded'), reload.click()]);
    assert.equal(await otherPage.evaluate(() => window.beforeUpdate), undefined);
  } finally {
    await context.close();
  }
});
