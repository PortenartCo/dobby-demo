'use strict';
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');

const bridge = readFileSync(resolve(__dirname, '../bridge.js'), 'utf8');

async function setup(initial = {}) {
  class Element {
    constructor() { this.dataset = {}; this.children = []; }
    addEventListener(type, callback) { this[type] = callback; }
    setAttribute() {}
    append(node) { this.children.push(node); }
    replaceWith(node) { notices.set(this.id, node); }
    remove() { notices.delete(this.id); }
  }
  const notices = new Map(), cues = [], listener = new Map();
  let actor = { userId: 'parent-a', householdId: 'family', memberId: 'person-a', epoch: 1, identityVerified: true };
  let progress = { category: 'parent', entries: [], goals: {}, ...initial };
  const main = new Element();
  main.before = notice => notices.set(notice.id, notice);
  const engine = {
    document: { getElementById: () => new Element() },
    DobbyFamilyHealth: {}, DobbyFamilyAgenda: {}, DobbyFamilyMissions: { available: true },
    DobbyFamilyUI: {
      connectionState: () => actor,
      getContext: () => actor,
      childAccessState: () => ({ restricted: false, active: false, memberId: null }),
    },
    DobbySharedRunesV3: { readProgress: () => progress },
    addEventListener(type, callback) { listener.set(type, callback); },
    eval: source => source.startsWith('typeof') ? false : [],
  };
  const frame = new Element();
  frame.contentDocument = new Element();
  frame.contentWindow = engine;
  const document = {
    body: { dataset: { dv7Screen: 'famille' } },
    getElementById(id) {
      if (id === 'dv7-engine') return frame;
      return notices.get(id) || (['dobby-mission-alert', 'btn-inspiration'].includes(id) ? null : new Element());
    },
    querySelector: selector => selector === 'main' ? main : null,
    querySelectorAll: () => [],
    addEventListener() {}, createElement: () => new Element(),
  };
  const window = {
    DobbyChrome: { ready: Promise.resolve(), mount() {} },
    DobbyFamilyStitch: { ready: true, init() {} },
    DobbyMagicAudio: { play: cue => cues.push(cue), accountChanged() {} },
  };
  vm.runInNewContext(bridge, { document, window, console, MutationObserver: class { observe() {} }, setTimeout() {} });
  frame.load();
  await new Promise(resolve => setImmediate(resolve));
  return {
    window, cues, notices,
    publish(next) { progress = { ...progress, ...next }; listener.get('dobby:missions-capability')(); },
    replaceActor(next) { actor = { ...actor, ...next }; },
  };
}

const pending = (id, author = 'person-c') => ({ id, missionId: id, memberId: 'person-c', actorMemberId: author, status: 'pending' });
const goal = (id) => ({ id, unlocked: true });

test('les alertes héritées sont silencieuses et seules les nouvelles alertes externes jouent une fois', async () => {
  const fixture = await setup({ entries: [pending('initial')] });
  assert.ok(fixture.notices.has('dobby-mission-alert'), 'la notification visuelle initiale existe');
  assert.deepEqual(fixture.cues, []);
  const entries = [pending('initial'), pending('self', 'person-a')];
  fixture.publish({ entries });
  assert.deepEqual(fixture.cues, [], 'la propre soumission du parent reste silencieuse');
  fixture.publish({ entries: [...entries, pending('new')] });
  fixture.publish({ entries: [...entries, pending('new')] });
  assert.deepEqual(fixture.cues, ['notification']);
  fixture.replaceActor({ userId: 'parent-b', memberId: 'person-b', epoch: 2 });
  fixture.publish({ goals: { child: goal('for-parent-b') } });
  assert.deepEqual(fixture.cues, ['notification'], 'le premier état du compte remplaçant reste silencieux');
});

test('une action confirmée joue après la réponse, sans notification pour le palier du même geste', async () => {
  const fixture = await setup();
  const feedback = fixture.window.DobbyStitchV7.withMissionSound;
  assert.equal(typeof feedback, 'function');
  let confirm;
  const receipt = feedback(() => new Promise(resolve => { confirm = resolve; }), 'confirm');
  fixture.publish({ goals: { child: goal('unlocked-locally') } });
  assert.deepEqual(fixture.cues, []);
  confirm({ revision: 2 });
  assert.equal((await receipt).revision, 2);
  fixture.publish({ goals: { child: goal('unlocked-locally') } });
  assert.deepEqual(fixture.cues, ['confirm']);
});

test('un échec, un no-op et une réponse après changement de compte restent silencieux', async () => {
  const fixture = await setup();
  const feedback = fixture.window.DobbyStitchV7.withMissionSound;
  assert.equal(typeof feedback, 'function');
  await assert.rejects(feedback(async () => { throw Error('Refus de la mission'); }, 'reward'), /Refus de la mission/);
  assert.equal(await feedback(() => false, 'confirm'), false);
  let confirm;
  const receipt = feedback(() => new Promise(resolve => { confirm = resolve; }), 'reward');
  fixture.replaceActor({ userId: 'parent-b', memberId: 'person-b', epoch: 2 });
  confirm(true);
  await receipt;
  assert.deepEqual(fixture.cues, []);
});
