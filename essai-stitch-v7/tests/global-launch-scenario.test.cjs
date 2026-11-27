'use strict';
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const repo = path.resolve(__dirname, '../..');
const parts = name => readFileSync(path.join(repo, 'scripts/review', name), 'utf8');

test('launch config selects a fictional child and reuses the pilot recipes and native register fixtures', () => {
  const scenario = require('../../scripts/review/global-scenario.js');
  const transform = require('../../scripts/review/global-launch-transform.cjs');
  const context = { URL, DobbyGlobalScenario: scenario, location: new URL('http://127.0.0.1:8123/famille.html?client=C'),
    sessionStorage: { getItem: () => null, setItem() {} }, history: { replaceState() {} } };
  context.window = context.top = context;
  vm.runInNewContext(transform.config(parts('global-config.js')), context);
  const config = context.DobbyReviewConfig;
  assert.equal(config.client, 'C');
  assert.match(config.storagePrefix, /launch-v1\|client-C\|$/);
  assert.equal(config.demoMemberId, null, 'Canonical identity must come through the native access verification');
  const state = config.initialState(scenario.day);
  assert.deepEqual(Array.from(state.familyMembers, member => member.memberCategory), ['parent', 'parent', 'child', 'child']);
  assert.deepEqual(Array.from(state.customRecipes, recipe => recipe.id), ['review-soup', 'review-gratin']);
  assert.ok(state.manualMissions.some(mission => mission.assigneeId === 'review-enfant-c'));
  assert.ok(state.manualMissions.some(mission => mission.assigneeId === 'review-enfant-d'));
  assert.ok(state.houseItems.length && state.familyDocs.length && state.familyEvents.length && Object.keys(state.planned).length);
  assert.equal(state.famHealth.length, 0, 'The app never imports synthetic Health data into the dormant historical register');
  assert.equal(scenario.health.activation, 'unavailable');
});

test('launch transport reuses the old guarded native module routes and uses one lifecycle and role boundary', () => {
  const transform = require('../../scripts/review/global-launch-transform.cjs');
  const legacy = parts('global-demo.js');
  const generated = transform.demo(legacy);
  assert.doesNotThrow(() => new vm.Script(generated));
  assert.ok(generated.includes(legacy.slice(legacy.indexOf(" if(method==='POST'?body?.household_id"), legacy.indexOf('const native='))));
  assert.match(generated, /DobbyGlobalLifecycle\.create\(/);
  assert.match(generated, /DobbyGlobalRoles\.handle\(/);
  assert.doesNotMatch(generated, /function clearResetStorage\(/);
  assert.throws(() => transform.demo(legacy.replace('function seed()', 'function changed()')), /Source globale héritée/);
});

test('launch controls never drive native feedback during frame boot and Cuisine can leave an unopened editor', () => {
  const { nativeResource } = require('../../scripts/review/global-launch-transform.cjs');
  const app = name => readFileSync(path.join(repo, 'essai-stitch-v7', name), 'utf8');
  const chrome = nativeResource('essai-stitch-v7/chrome.js', app('chrome.js'));
  const cuisine = nativeResource('essai-stitch-v7/cuisine-e074.js', app('cuisine-e074.js'));
  assert.match(chrome, /event\.target\.closest\?\.\('\[data-review-banner\],#dobby-global-panel'\)\)return/);
  assert.match(cuisine, /function leaveEditor\(\)\{if\(!c\)return;const ui=c\.ui;/);
  assert.doesNotThrow(() => new vm.Script(chrome));
  assert.doesNotThrow(() => new vm.Script(cuisine));
});
