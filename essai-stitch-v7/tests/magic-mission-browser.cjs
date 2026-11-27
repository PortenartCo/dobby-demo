/* Verify business cue dispatch against the native writers in the isolated launch demo. */
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const origin = new URL(process.env.DOBBY_GLOBAL_LAUNCH_BASE || 'http://127.0.0.1:8767/');
assert.ok(origin.protocol === 'http:' && origin.hostname === '127.0.0.1' && origin.pathname === '/' &&
  !origin.username && !origin.password && !origin.search && !origin.hash, 'Use the private loopback launch server');
const childId = 'review-enfant-c';
const cues = page => page.evaluate(() => window.dobbyMissionCues);

async function visit(context, file, client, hash = '') {
  const page = await context.newPage();
  await page.goto(new URL(`essai-stitch-v7/${file}?client=${client}${hash}`, origin).href);
  await page.waitForFunction(() => {
    const engine = window.DobbyFamilyStitchEngine?.win();
    return window.DobbyStitchV7?.ready && engine?.DobbyFamilyUI?.access?.state().verified &&
      engine.DobbySharedRunesV3?.readProgress();
  });
  return page;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
    await context.addInitScript(() => {
      if (window !== top) return;
      const relevant = new Set(['confirm', 'notification', 'reward']);
      window.dobbyMissionCues = [];
      let runtime;
      const play = cue => { if (relevant.has(cue)) window.dobbyMissionCues.push(cue); };
      Object.defineProperty(window, 'DobbyMagicAudio', {
        get: () => ({ ...runtime, play }),
        set: value => { runtime = value; },
      });
    });
    const parent = await visit(context, 'famille.html', 'B', '#personal?person=' + childId);
    const child = await visit(context, 'missions.html', 'C');
    assert.deepEqual(await cues(parent), [], 'initial parent read does not ring');
    assert.deepEqual(await cues(child), [], 'initial child read does not ring');

    await child.locator('[data-dv7-complete="review-mission-c"]').click();
    const completion = child.getByRole('dialog', { name: 'Confirmer ma réalisation' });
    assert.deepEqual(await cues(child), [], 'opening the confirmation is still silent');
    await completion.getByRole('button', { name: 'Confirmer la mission', exact: true }).click();
    await completion.waitFor({ state: 'detached' });
    assert.deepEqual(await cues(child), ['confirm']);

    await parent.evaluate(() => DobbyGlobalDemo.sync());
    await parent.waitForFunction(() => window.dobbyMissionCues.includes('notification'));
    await parent.evaluate(async () => { await DobbyGlobalDemo.sync(); await DobbyFamilyStitch.refresh(); });
    assert.deepEqual(await cues(parent), ['notification'], 'a peer unlock sounds once across refreshes');

    await parent.getByRole('button', { name: 'Confirmer la récompense', exact: true }).click();
    const reward = parent.getByRole('dialog', { name: 'Confirmer la récompense', exact: true });
    await reward.getByRole('button', { name: 'Confirmer', exact: true }).click();
    await reward.waitFor({ state: 'detached' });
    assert.deepEqual(await cues(parent), ['notification', 'reward']);
    const payload = await parent.evaluate(async () => (await DobbyGlobalDemo.state()).modules.missions.payload);
    assert.equal(payload.runeRewards.find(row => row.memberId === childId)?.title, 'Choisir le jeu de la soirée');
    console.log('MAGIC_MISSION_BROWSER_PASS 390 native completion, peer notification, parental reward; initial and repeated renders silent');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
