const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require('playwright');

const origin = process.env.DOBBY_TEST_ORIGIN || 'http://127.0.0.1:8765';

async function withPage(run) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']
  });
  try {
    const context = await browser.newContext();
    await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
    await context.addInitScript(() => {
      window.__restrictChat = frame => {
        frame.DobbyFamilyUI = {
          ...frame.DobbyFamilyUI,
          childAccessState: () => ({ restricted: true, active: true, memberId: 'speech-fixture-child' })
        };
        frame.dispatchEvent(new frame.CustomEvent('dobby:access-change'));
      };
      const speech = window.__speechBoundary = { microphones: [], spoken: [], current: null };
      window.SpeechRecognition = class {
        constructor() { speech.microphones.push(this); }
        start() { this.onstart?.(); }
        stop() { this.onend?.(); }
        abort() { this.aborted = true; this.onend?.(); }
      };
      window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
        getVoices: () => [{ lang: 'fr-FR', name: 'Voix de test' }],
        speak(message) { speech.spoken.push(message.text); speech.current = message; message.onstart?.(); },
        cancel() { speech.current = null; }
      } });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    await run(page);
  } finally {
    await browser.close();
  }
}

test('V7 stops active speech and suppresses pending draft and history when access changes', () => withPage(async page => {
  await page.goto(origin + '/essai-stitch-v7/famille.html#chat', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#user-input')?.disabled === false);
  await page.locator('#user-input').fill('Repas privé du soir');
  await page.locator('[data-fa-action=rg-chat-send]').click();
  await page.waitForFunction(() => document.querySelector('[data-e02-message=user]'));
  await page.locator('[data-e01-toggle=sound]').click();
  const mic = page.locator('[data-fa-action=rg-chat-voice]');
  await mic.dispatchEvent('pointerdown', { pointerId: 1, button: 0, isPrimary: true });
  await page.evaluate(() => {
    const mic = window.__speechBoundary.microphones.at(-1);
    mic.onresult({ results: [[{ transcript: 'Brouillon dicté parent' }]] });
    window.__lateResult = mic.onresult;
  });
  assert.equal(await page.locator('#user-input').inputValue(), 'Brouillon dicté parent');
  await page.evaluate(() => DobbyChat.act('rg-chat-replay', document.querySelector('[data-fa-action=rg-chat-replay]')));
  assert.equal(await page.evaluate(() => Boolean(window.__speechBoundary.current)), true);
  await page.evaluate(() => {
    window.__restrictChat(DobbyFamilyStitchEngine.win());
    window.__lateResult({ results: [[{ transcript: 'Résultat tardif' }]] });
  });
  assert.equal(await page.evaluate(() => window.__speechBoundary.microphones[0].aborted), true);
  assert.equal(await page.evaluate(() => window.__speechBoundary.current), null);
  assert.doesNotMatch(await page.locator('main').textContent(), /Repas privé du soir|Résultat tardif/);
  assert.equal(await page.evaluate(() => document.querySelector('#user-input')?.value || ''), '');
}));

test('legacy V5 clears the chat and stops the microphone on role change', () => withPage(async page => {
  await page.goto(origin + '/essai-stitch-v5-famille/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.DobbyFamilyUI?.connectionState().ready);
  await page.evaluate(() => go('chat'));
  await page.locator('#v2ChatForm input').evaluate(input => { input.value = 'Repas privé du soir'; input.form.requestSubmit(); });
  await page.getByText('Repas privé du soir', { exact: true }).waitFor();
  await page.locator('[data-v23-mic]').click();
  await page.evaluate(() => {
    const mic = window.__speechBoundary.microphones[0];
    const lateResult = mic.onresult;
    st.page = 'home';
    window.__restrictChat(window);
    lateResult({ results: [[{ transcript: 'Résultat tardif' }]] });
  });
  assert.equal(await page.evaluate(() => window.__speechBoundary.microphones[0].aborted), true);
  assert.doesNotMatch(await page.locator('#screen').textContent(), /Repas privé du soir|Résultat tardif/);
  assert.equal(await page.locator('#v2ChatForm').count(), 0);
  assert.equal(await page.evaluate(() => window.__speechBoundary.spoken.length), 0);
}));
