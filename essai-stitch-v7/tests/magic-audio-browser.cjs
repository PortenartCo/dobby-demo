/* Chromium runs the native V7 pages, native Web Audio and fictional local fixtures. */
'use strict';

const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { parseArgs } = require('node:util');
const { chromium } = require('playwright');

const { values } = parseArgs({ options: { width: { type: 'string', default: '390' } } });
const width = Number(values.width);
assert.ok([320, 390, 768, 1440].includes(width), 'Use --width=320, 390, 768, or 1440');
const base = new URL(process.env.DOBBY_TEST_ORIGIN || 'http://127.0.0.1:8765/');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) && base.protocol === 'http:' &&
  !base.username && !base.password && !base.search && !base.hash, 'The browser recipe requires a loopback origin');
if (!base.pathname.endsWith('/')) base.pathname += '/';
const evidence = process.env.DOBBY_MAGIC_AUDIO_EVIDENCE;
const cueNames = ['confirm', 'reward', 'transition', 'notification', 'timer'];
const routes = ['traverse.html', 'missions.html', 'index.html#taverne', 'index.html#shop', 'famille.html#salon', 'famille.html#menu'];
const labels = ['Accueil', 'Tâches', 'Repas', 'Courses', 'Famille', 'Menu'];
const at = page => page.evaluate(() => window.__magicAudioProbe);
const cuePath = name => new URL(`essai-stitch-v7/assets/audio/${name}.wav`, base).pathname;

function installActorFixture() {
  if (window === top || !location.pathname.endsWith('/essai-stitch-v5-famille/index.html')) return;
  let actor, native;
  Object.defineProperty(window, 'DobbyFamilyUI', { configurable: true, get: () => native, set(api) {
    native = Object.freeze({ ...api, connectionState() {
      return { ...api.connectionState(), ...actor };
    }, childAccessState() {
      return actor?.userId === 'fixture-audio-child' ? { restricted: true, active: true, memberId: 'fixture-audio-child' } : api.childAccessState();
    } });
  } });
  window.__switchMagicAudioActor = (userId, epoch) => {
    actor = { userId, householdId: userId ? 'fixture-audio-household' : null, epoch };
    window.dispatchEvent(new CustomEvent('dobby:account-change'));
  };
}

function installAudioProbe() {
  const observed = { contexts: [], sources: [], oscillators: 0, vibrations: [], lifecycle: [], gestures: [] };
  const byContext = new WeakMap(), bySource = new WeakMap();
  window.__magicAudioProbe = observed;
  const Native = window.AudioContext;
  if (!Native) return;
  window.AudioContext = class extends Native {
    constructor(...args) {
      super(...args);
      const entry = { states: [this.state], resumes: [], rate: this.sampleRate };
      byContext.set(this, entry);
      observed.contexts.push(entry);
      this.addEventListener('statechange', () => entry.states.push(this.state));
    }
    resume() {
      byContext.get(this).resumes.push({ at: performance.now(), activated: navigator.userActivation.isActive });
      return super.resume();
    }
    createOscillator() {
      observed.oscillators++;
      return super.createOscillator();
    }
  };
  const start = AudioBufferSourceNode.prototype.start;
  const stop = AudioBufferSourceNode.prototype.stop;
  const bufferCue = new WeakMap();
  const responseBytes = new WeakMap();
  const arrayBuffer = Response.prototype.arrayBuffer;
  Response.prototype.arrayBuffer = async function (...args) {
    const result = await arrayBuffer.apply(this, args);
    const cue = /\/assets\/audio\/([a-z]+)\.wav$/.exec(this.url)?.[1];
    if (cue) responseBytes.set(result, cue);
    return result;
  };
  const decode = BaseAudioContext.prototype.decodeAudioData;
  BaseAudioContext.prototype.decodeAudioData = function (bytes, ...args) {
    const cue = responseBytes.get(bytes);
    const result = decode.call(this, bytes, ...args);
    if (cue) void result.then(buffer => bufferCue.set(buffer, cue), () => {});
    return result;
  };
  AudioBufferSourceNode.prototype.start = function (...args) {
    const result = start.apply(this, args);
    const buffer = this.buffer;
    let peak = 0, squares = 0, samples = 0;
    for (let index = 0; index < (buffer?.numberOfChannels || 0); index++) {
      for (const value of buffer.getChannelData(index)) {
        peak = Math.max(peak, Math.abs(value));
        squares += value * value;
        samples++;
      }
    }
    const entry = { cue: bufferCue.get(buffer), startTime: performance.now(), duration: buffer?.duration,
      peak, rms: Math.sqrt(squares / Math.max(1, samples)), loop: this.loop, context: this.context.state,
      stopped: [], ended: false };
    observed.sources.push(entry);
    bySource.set(this, entry);
    this.addEventListener('ended', () => { entry.ended = true; }, { once: true });
    queueMicrotask(() => window.dispatchEvent(new CustomEvent('test-magic-audio-start', { detail: entry.cue })));
    return result;
  };
  AudioBufferSourceNode.prototype.stop = function (...args) {
    const result = stop.apply(this, args);
    bySource.get(this)?.stopped.push(performance.now());
    return result;
  };
  const vibrate = navigator.vibrate?.bind(navigator);
  Object.defineProperty(navigator, 'vibrate', { configurable: true, value(pattern) {
    observed.vibrations.push({ pattern, at: performance.now(), hidden: document.hidden });
    return vibrate ? vibrate(pattern) : false;
  } });
  const lifecycle = event => observed.lifecycle.push({ type: event.type, trusted: event.isTrusted,
    persisted: event.persisted ?? null, hidden: document.hidden });
  for (const name of ['pagehide', 'pageshow']) window.addEventListener(name, lifecycle);
  document.addEventListener('visibilitychange', lifecycle);
  for (const type of ['click', 'keydown']) document.addEventListener(type, event => {
    observed.gestures.push({ type, trusted: event.isTrusted, userActivation: navigator.userActivation.isActive });
  }, true);
}

async function ready(page, route) {
  await page.waitForFunction(route => {
    if (!window.DobbyStitchV7?.ready || document.documentElement.classList.contains('dv7-loading')) return false;
    const state = document.body.dataset;
    const [file, view] = (route || '').split('#');
    if (view) return state.familyView === view || state.cuisineView === view;
    return !file || location.pathname.endsWith('/' + file);
  }, route);
}

async function open(page, route) {
  await page.goto(new URL('essai-stitch-v7/' + route, base).href);
  await ready(page, route);
}

function toggle(page, name) {
  return page.locator(`body > header [data-e01-toggle="${name}"]`);
}

async function shot(page, name) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, `${name}: no horizontal overflow`);
  if (evidence) await page.screenshot({ path: join(evidence, `${width}-${name}.png`), scale: 'css' });
}

async function expectSilence(page, before, reason) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const after = await at(page);
  assert.equal(after.sources.length, before.sources.length, reason);
  assert.equal(after.oscillators, before.oscillators, reason);
  assert.equal(after.vibrations.length, before.vibrations.length, reason);
}

async function waitCue(page, name, before = 0) {
  await page.waitForFunction(({ name, before }) => window.__magicAudioProbe.sources.slice(before).some(row => row.cue === name),
    { name, before }, { timeout: 4500 });
  const audio = await at(page);
  const source = audio.sources.slice(before).find(item => item.cue === name);
  assert.equal(source.context, 'running');
  assert.equal(source.loop, false);
  assert.ok(source.duration > 0 && source.duration < 5, `${name} is a short decoded WAV`);
  assert.ok(source.peak > 0 && source.rms > 0 && source.peak <= 1, `${name} contains a real PCM signal with unclipped samples`);
  assert.equal(audio.contexts.length, 1, 'One real audio context per document');
  return source;
}

async function waitQuiet(page) {
  await page.waitForFunction(() => window.__magicAudioProbe.sources.every(row => row.ended));
}

async function playFromGesture(page, cue, keyboard = false) {
  const button = page.locator('#test-magic-audio-cue');
  await page.evaluate(cue => {
    document.getElementById('test-magic-audio-cue')?.remove();
    const control = document.createElement('button');
    control.id = 'test-magic-audio-cue';
    control.type = 'button';
    control.textContent = 'Sonde audio locale';
    control.style.cssText = 'position:fixed;bottom:110px;left:12px;z-index:99999;min-height:44px';
    control.onclick = event => window.DobbyMagicAudio.play(cue, event);
    document.body.append(control);
  }, cue);
  if (keyboard) {
    await button.focus();
    await page.keyboard.press('Enter');
  } else {
    await button.click();
  }
  await button.evaluate(node => node.remove());
}

async function verifyIndependentControls(page, report) {
  await open(page, routes[0]);
  assert.equal(await page.evaluate(() => typeof window.DobbyMagicAudio?.play), 'function', 'The native pages load the shared WAV engine');
  assert.equal(await toggle(page, 'effects').getAttribute('aria-pressed'), 'true');
  assert.equal(await toggle(page, 'sound').getAttribute('aria-pressed'), 'false');
  await page.locator('#e013-ambience').waitFor();
  assert.equal((await at(page)).contexts.length, 0, 'No AudioContext on a fresh Sound OFF page');
  assert.equal(report.wav.length, 0, 'No clip fetched without consent');
  await shot(page, 'effets-actifs-son-coupe');

  await toggle(page, 'sound').click();
  await waitCue(page, 'confirm');
  await waitQuiet(page);
  assert.equal(await toggle(page, 'effects').getAttribute('aria-pressed'), 'true');
  const enabled = await at(page);
  await toggle(page, 'effects').click();
  assert.equal(await toggle(page, 'effects').getAttribute('aria-pressed'), 'false');
  assert.equal(await toggle(page, 'sound').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#e013-ambience, .magical-ripple, .magic-sparkle-dot').count(), 0);
  await expectSilence(page, enabled, 'The visual switch never plays a cue or vibrates');
  await shot(page, 'son-actif-effets-coupes');

  await toggle(page, 'sound').click();
  assert.equal(await toggle(page, 'sound').getAttribute('aria-pressed'), 'false');
  await expectSilence(page, enabled, 'Muting is silent');
  const before = await at(page);
  await playFromGesture(page, 'notification');
  await expectSilence(page, before, 'A trusted action cannot bypass Sound OFF');
  await toggle(page, 'effects').click();
  await page.locator('#e013-ambience').waitFor();
  await expectSilence(page, before, 'Visual effects can run with Sound OFF');
  await toggle(page, 'sound').click();
  await waitCue(page, 'confirm', before.sources.length);
  await page.reload();
  await ready(page, routes[0]);
  assert.equal(await toggle(page, 'sound').getAttribute('aria-pressed'), 'true', 'The native preference survives reload');
  const reloaded = await at(page);
  assert.equal(reloaded.contexts.length, 0, 'Reload on Sound ON still needs a new gesture');
  await page.evaluate(() => DobbyMagicAudio.play('reward', new MouseEvent('click')));
  await expectSilence(page, reloaded, 'An untrusted event cannot unlock sound');
  report.independence = true;
}

async function verifyClips(page, report) {
  const clips = {};
  for (const cue of cueNames) {
    const before = await at(page);
    await playFromGesture(page, cue, cue === 'reward');
    clips[cue] = await waitCue(page, cue, before.sources.length);
    await waitQuiet(page);
  }
  assert.equal((await at(page)).oscillators, 0, 'No generic oscillator beep remains');
  for (const name of cueNames) assert.ok(report.wav.some(row => row.path === cuePath(name) && !row.range), `${name} fetched locally without Range`);
  report.clips = clips;
}

async function verifyLifecycle(page, report) {
  await page.evaluate(() => DobbyFamilyStitchEngine.win().__switchMagicAudioActor('fixture-audio-parent-a', 1));
  let before = await at(page);
  await page.evaluate(() => {
    window.addEventListener('test-magic-audio-start', () => {
      for (const [name, value] of [['hidden', true], ['visibilityState', 'hidden']]) {
        Object.defineProperty(document, name, { configurable: true, get: () => value });
      }
      document.dispatchEvent(new Event('visibilitychange'));
    }, { once: true });
  });
  await playFromGesture(page, 'transition');
  await waitCue(page, 'transition', before.sources.length);
  await page.waitForFunction(() => window.__magicAudioProbe.sources.at(-1).stopped.length > 0);
  await waitQuiet(page);
  before = await at(page);
  await playFromGesture(page, 'timer');
  await expectSilence(page, before, 'No sound or vibration while the document is hidden');
  await page.evaluate(() => {
    delete document.hidden;
    delete document.visibilityState;
    document.dispatchEvent(new Event('visibilitychange'));
    DobbyMagicAudio.play('notification');
  });
  await expectSilence(page, before, 'Returning from the background does not arm audio');

  await page.evaluate(() => window.addEventListener('test-magic-audio-start', () =>
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })), { once: true }));
  await playFromGesture(page, 'transition');
  await waitCue(page, 'transition', before.sources.length);
  await page.waitForFunction(() => window.__magicAudioProbe.sources.at(-1).stopped.length > 0);
  await waitQuiet(page);
  before = await at(page);
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    DobbyMagicAudio.play('notification');
  });
  await expectSilence(page, before, 'Returning to a cached page needs another trusted gesture');

  await page.evaluate(() => window.addEventListener('test-magic-audio-start', () =>
    DobbyFamilyStitchEngine.win().__switchMagicAudioActor('fixture-audio-parent-b', 2), { once: true }));
  await playFromGesture(page, 'transition');
  await waitCue(page, 'transition', before.sources.length);
  await page.waitForFunction(() => window.__magicAudioProbe.sources.at(-1).stopped.length > 0);
  await waitQuiet(page);
  before = await at(page);
  await page.evaluate(() => DobbyMagicAudio.play('reward'));
  await expectSilence(page, before, 'Changing the fictional account cancels previous activation');
  await playFromGesture(page, 'reward');
  await waitCue(page, 'reward', before.sources.length);
  await waitQuiet(page);
  before = await at(page);
  await page.evaluate(() => window.addEventListener('test-magic-audio-start', () =>
    DobbyFamilyStitchEngine.win().__switchMagicAudioActor('fixture-audio-child', 3), { once: true }));
  await playFromGesture(page, 'transition');
  await waitCue(page, 'transition', before.sources.length);
  await page.waitForFunction(() => window.__magicAudioProbe.sources.at(-1).stopped.length > 0 && DobbyStitchV7.childAccess().restricted);
  await waitQuiet(page);
  before = await at(page);
  await page.evaluate(() => DobbyMagicAudio.play('notification'));
  await expectSilence(page, before, 'The child cannot inherit the previous account activation');
  report.lifecycle = { trace: await at(page), actors: ['fixture-parent-a', 'fixture-parent-b', 'fixture-child'] };
}

async function verifyPaletteAndDock(page, report) {
  await open(page, 'famille.html#settings-magic');
  const ornament = page.getByRole('switch', { name: 'Décorations saisonnières', exact: true });
  const effects = page.getByRole('switch', { name: 'Effets magiques', exact: true });
  const sound = page.getByRole('switch', { name: 'Sons', exact: true });
  assert.equal(await sound.getAttribute('aria-checked'), 'true');
  await ornament.waitFor();
  const before = await at(page);
  await ornament.click();
  await expectSilence(page, before, 'Seasonal settings are silent with Sound ON');
  await ornament.click();
  await effects.click();
  await expectSilence(page, before, 'Independent controls do not emit sounds');
  assert.equal(await ornament.getAttribute('aria-checked'), 'true');
  assert.equal(await effects.getAttribute('aria-checked'), 'false');
  await shot(page, 'reglages-independants');

  for (const [index, label] of labels.entries()) {
    const dock = page.locator('body > nav');
    assert.deepEqual(await dock.locator('[data-e01-destination]').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label'))), labels);
    const before = await at(page);
    await dock.getByRole('link', { name: label, exact: true }).click();
    await ready(page, routes[index]);
    assert.equal(await page.locator(`body > nav [data-e01-destination="${index}"]`).getAttribute('aria-current'), 'page');
    assert.equal(await toggle(page, 'sound').getAttribute('aria-pressed'), 'true');
    assert.equal(await toggle(page, 'effects').getAttribute('aria-pressed'), 'false');
    await page.waitForFunction(() => document.documentElement.dataset.seasonalTheme === 'christmas');
    assert.equal(await page.locator('[data-seasonal-header]').count(), 1);
    if (index === 3 || index === 5) {
      await waitCue(page, 'transition', before.sources.length);
      await waitQuiet(page);
    } else {
      assert.equal((await at(page)).sources.length, 0, 'Loading a destination and applying its palette are silent');
    }
    report.destinations.push(label);
    await shot(page, `palette-${index + 1}`);
  }
  const active = await at(page);
  await page.locator('body > nav').getByRole('link', { name: 'Menu', exact: true }).click();
  await expectSilence(page, active, 'Re-selecting the active rubric is silent');
}

async function verifyMission(page, report) {
  await open(page, routes[1]);
  await page.evaluate(() => {
    const E = DobbyFamilyStitchEngine;
    E.evaluate(`
      st.familyMembers = [{id: 'fixture-audio-member', name: 'TEST — Parent fictif', memberCategory: 'parent', avatar: '🦊'}];
      st.manualMissions = [{id: 'fixture-audio-mission', title: 'TEST — Mission audio fictive', category: 'Famille',
        assigneeIds: ['fixture-audio-member'], participantVersion: 1, due: todayISO(), status: 'open',
        effort: 'regular', rewardVersion: 1}];
      save();
    `);
    DobbyStitchV7.refresh();
  });
  await page.locator('[data-dv7-complete="fixture-audio-mission"]').click();
  const dialog = page.getByRole('dialog', { name: 'Qui a réellement participé ?' });
  await dialog.getByRole('checkbox', { name: 'TEST — Parent fictif', exact: true }).check();
  assert.equal((await at(page)).sources.length, 0, 'Opening and filling the confirmation are silent');
  await dialog.getByRole('button', { name: 'Confirmer la mission', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
  const result = await page.evaluate(() => {
    const E = DobbyFamilyStitchEngine;
    return { state: E.read().state.manualMissions.find(row => row.id === 'fixture-audio-mission').status,
      runes: E.rewardSummary('fixture-audio-member').total };
  });
  assert.deepEqual(result, { state: 'done', runes: 25 });
  await waitCue(page, 'confirm');
  await waitQuiet(page);
  assert.equal((await at(page)).sources.filter(row => row.cue === 'confirm').length, 1);
  await page.locator('[data-e03-status="done"]').click();
  await page.locator('[data-e03-card="fixture-audio-mission"]').waitFor();
  await shot(page, 'mission-confirmee');
  report.nativeMission = result;
}

async function verifyTimer(page, report) {
  await open(page, 'index.html#recipes');
  const id = 'audio-fixture-timer';
  await page.evaluate(id => DobbyCuisineEngine.evaluate('custom.push(p.row);save();', { row: {
    id, name: 'TEST — Minuteur fictif', minutes: 1, servings: 2, category: 'Végétarien', emoji: '🥕',
    ingredients: [['Carotte', 1, '']], steps: ['Cuire pendant 2 secondes.'],
  } }), id);
  await page.evaluate(id => DobbyCuisine.open('cook', { id }), id);
  await page.locator('[data-e074-cook]').waitFor();
  await page.locator('[data-cu-action="e074-timer-add"]').click();
  const timer = page.locator('[data-e074-timer]');
  await timer.waitFor();
  await timer.locator('[data-cu-action="e074-timer-toggle"]').click();
  // The seasonal fixture freezes Date without freezing browser audio or animation clocks.
  await page.clock.setFixedTime(new Date('2026-12-25T12:00:03Z'));
  await timer.getByRole('status').getByText('Terminé', { exact: true }).waitFor();
  await waitCue(page, 'timer');
  await waitQuiet(page);
  const after = await at(page);
  assert.equal(after.sources.filter(source => source.cue === 'timer').length, 1);
  await shot(page, 'minuteur-termine');
  report.nativeTimer = true;

  await page.evaluate(id => DobbyCuisine.open('recipe', { id }), id);
  await page.locator('[data-cu-action="e074-plan"]').click();
  const planning = page.getByRole('dialog', { name: 'Calendrier de planification' });
  await planning.locator('[data-cu-action="e074-plan-slot"][data-slot="midi"]').first().click();
  const before = await at(page);
  await planning.getByRole('button', { name: 'Confirmer ce repas', exact: true }).click();
  await planning.waitFor({ state: 'detached' });
  await waitCue(page, 'confirm', before.sources.length);
  assert.ok(await page.evaluate(id => Object.values(DobbyCuisineEngine.read().state.planned).some(meal => meal.id === id), id));
  report.nativeMeal = true;
}

async function verifyPerformance(page, report) {
  await open(page, routes[0]);
  await toggle(page, 'effects').click();
  await page.locator('#e013-ambience').waitFor();
  const stats = await page.evaluate(() => new Promise(resolve => {
    const gaps = [];
    let start = 0, last = 0;
    function record(now) {
      if (!start) start = now;
      if (last) gaps.push(now - last);
      last = now;
      if (now - start < 1000) requestAnimationFrame(record);
      else {
        const durations = gaps.sort((a, b) => a - b);
        resolve({ frames: durations.length, medianMs: durations[Math.floor(durations.length / 2)],
          over50ms: durations.filter(ms => ms > 50).length });
      }
    }
    requestAnimationFrame(record);
  }));
  const nodes = await page.evaluate(() => {
    for (let index = 0; index < 20; index++) DobbyChrome.apply();
    return { layers: document.querySelectorAll('#e013-ambience').length,
      particles: document.querySelectorAll('.e013-particle').length,
      seasonalHeaders: document.querySelectorAll('[data-seasonal-header]').length };
  });
  assert.ok(stats.frames >= 10 && Number.isFinite(stats.medianMs));
  assert.equal(nodes.layers, 1);
  assert.ok(nodes.particles > 0 && nodes.particles <= 24);
  assert.equal(nodes.seasonalHeaders, 1);
  const before = await at(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#e013-ambience').waitFor({ state: 'detached' });
  assert.equal(await page.locator('[data-seasonal-header]').count(), 1, 'Reduced motion keeps the static palette');
  await expectSilence(page, before, 'Reduced motion does not alter Sound or vibrate');
  assert.equal(await toggle(page, 'sound').getAttribute('aria-pressed'), 'true');
  await playFromGesture(page, 'confirm', true);
  await waitCue(page, 'confirm', before.sources.length);
  assert.equal(await page.locator('#e013-ambience, .magical-ripple, .magic-sparkle-dot').count(), 0);
  report.performance = { ...stats, ...nodes };
  await shot(page, 'mouvements-reduits');
}

(async () => {
  if (evidence) await mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: [
    '--no-sandbox', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost, EXCLUDE [::1]',
  ] });
  const report = { width, browser: browser.version(), checks: [], destinations: [], wav: [],
    blockedLegacyAssets: {}, external: [], errors: [] };
  try {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'fr-BE', reducedMotion: 'no-preference', serviceWorkers: 'block' });
    await context.addInitScript(installActorFixture);
    await context.addInitScript(installAudioProbe);
    await context.route('**/*', route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || !['GET', 'HEAD'].includes(request.method())) {
        const legacyFont = request.resourceType() === 'stylesheet' && url.origin === 'https://fonts.googleapis.com' && url.pathname === '/css2';
        const legacyImage = request.resourceType() === 'image' && url.origin === 'https://lh3.googleusercontent.com' && url.pathname.startsWith('/aida-public/');
        if (request.method() === 'GET' && (legacyFont || legacyImage)) {
          report.blockedLegacyAssets[url.origin] = (report.blockedLegacyAssets[url.origin] || 0) + 1;
        } else {
          report.external.push({ method: request.method(), origin: url.origin, path: url.pathname });
        }
        return route.abort();
      }
      if (cueNames.some(name => url.pathname === cuePath(name))) report.wav.push({ path: url.pathname, range: request.headers().range || null });
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => report.errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-12-25T12:00:00Z'));
    for (const [label, run] of [
      ['Indépendance du son et des effets', verifyIndependentControls],
      ['Cinq signaux PCM joués par WebAudio', verifyClips],
      ['Masquage, retour et compte fictif', verifyLifecycle],
      ['Palette saisonnière et six rubriques', verifyPaletteAndDock],
      ['Mission native confirmée et crédit de runes', verifyMission],
      ['Fin de minuteur et repas planifié par les contrôles natifs', verifyTimer],
      ['Cadence, limites et mouvements réduits', verifyPerformance],
    ]) {
      report.current = label;
      console.log('MAGIC_AUDIO_CHECK', width, label);
      await run(page, report);
      report.checks.push(label);
    }
    assert.deepEqual(report.external, []);
    assert.deepEqual(report.errors, []);
    report.status = 'PASS';
    console.log('MAGIC_AUDIO_BROWSER_PASS', width);
    await context.close();
  } catch (error) {
    report.status = 'FAIL';
    report.failure = error.message;
    throw error;
  } finally {
    await browser.close();
    if (evidence) await writeFile(join(evidence, `${width}-resultats.json`), JSON.stringify(report, null, 2) + '\n');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
