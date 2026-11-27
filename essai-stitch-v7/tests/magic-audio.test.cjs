'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const trusted = {isTrusted: true};
const quiet = () => new Promise(resolve => setImmediate(resolve));

function harness({sound = false, defer = false} = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../magic-audio.js'), 'utf8');
  const events = {window: new Map(), document: new Map()};
  const starts = [], stops = [], urls = [], contexts = [], downloads = [];
  let scope = 'parent-a', timestamp = 200;
  const document = {
    currentScript: {src: 'https://example.invalid/sub/essai-stitch-v7/magic-audio.js'},
    hidden: false,
    addEventListener: (name, listener) => events.document.set(name, listener),
  };
  class AudioContext {
    constructor() {
      this.state = 'suspended';
      this.currentTime = 5;
      this.destination = {};
      contexts.push(this);
    }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    decodeAudioData(buffer) { return Promise.resolve(buffer); }
    createGain() {
      return {
        gain: {cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {}},
        connect() {}, disconnect() {},
      };
    }
    createBufferSource() {
      return {
        connect() {}, disconnect() {},
        start(at) { starts.push({cue: this.buffer, at}); },
        stop(at) { stops.push({cue: this.buffer, at}); this.onended?.(); },
      };
    }
  }
  const window = {
    AudioContext,
    DobbyChrome: {soundEnabled: () => sound},
    DobbyStitchV7: {get ready() {return true;}, accountScope: () => scope},
    addEventListener: (name, listener) => events.window.set(name, listener),
  };
  const fetch = (url, options) => {
    const cue = url.pathname.split('/').pop().replace('.wav', '');
    urls.push({url: url.href, options});
    const result = {ok: true, arrayBuffer: async () => cue};
    if (!defer) return Promise.resolve(result);
    return new Promise(resolve => downloads.push(() => resolve(result)));
  };
  vm.runInNewContext(source, {window, document, fetch, URL, performance: {now: () => timestamp}});
  return {
    audio: window.DobbyMagicAudio, starts, stops, urls, contexts, downloads,
    setSound(value) { sound = value; window.DobbyMagicAudio.preferencesChanged(); },
    setScope(value) { scope = value; window.DobbyMagicAudio.accountChanged(); },
    advance(ms) { timestamp += ms; if (contexts[0]) contexts[0].currentTime += ms / 1000; },
    hide(value) { document.hidden = value; events.document.get('visibilitychange')(); },
    lifecycle(name) { events.window.get(name)(); },
    click(event) { events.document.get('click')(event); },
    keys(event) { events.document.get('keydown')(event); },
  };
}

test('default, saved opt-in and synthetic events stay quiet until an intentional gesture', async () => {
  const h = harness();
  h.audio.play('timer', trusted);
  h.click(trusted);
  h.setSound(true);
  h.click({isTrusted: false});
  h.keys({...trusted, key: 'Tab'});
  h.audio.play('confirm');
  await quiet();
  assert.deepEqual(h.urls, []);
  assert.equal(h.contexts.length, 0);
  h.keys({...trusted, key: 'Enter'});
  h.audio.play('confirm');
  await quiet();
  assert.deepEqual(h.starts.map(row => row.cue), ['confirm']);
  assert.equal(h.urls[0].url, 'https://example.invalid/sub/essai-stitch-v7/assets/audio/confirm.wav');
  assert.equal(h.urls[0].options.credentials, 'omit');
  assert.equal(h.urls[0].options.redirect, 'error');
});

test('one context and no cue stacking, with brief fades and priority for timers', async () => {
  const h = harness({sound: true});
  h.audio.play('confirm', trusted);
  h.audio.play('confirm', trusted);
  h.audio.play('notification');
  h.audio.play('reward');
  h.audio.play('timer');
  h.audio.play('confirm');
  await quiet();
  assert.deepEqual(h.starts.map(row => row.cue), ['timer']);
  assert.equal(h.contexts.length, 1);
  h.audio.play('timer');
  await quiet();
  assert.equal(h.starts.length, 1, 'The same alert is limited even when called twice');
  h.advance(800);
  h.audio.play('transition');
  await quiet();
  assert.equal(h.starts.length, 1, 'Lower-priority audio cannot cut off a playing alert');
  h.setSound(false);
  assert.equal(h.stops.length, 1);
  assert.ok(h.stops[0].at > 5.8 && h.stops[0].at <= 5.82, 'Early stop fades over at most 20 ms');
});

test('closing and hiding the page, switching accounts and muting cancel pending cues', async () => {
  for (const interrupt of [
    h => h.setScope('enfant'),
    h => h.setSound(false),
    h => {h.hide(true); h.hide(false);},
    h => {h.lifecycle('pagehide'); h.lifecycle('pageshow');},
    (h, stop) => stop(),
    h => h.advance(1800),
  ]) {
    const h = harness({sound: true, defer: true});
    const stop = h.audio.play('transition', trusted);
    interrupt(h, stop);
    h.downloads[0]();
    await quiet();
    assert.deepEqual(h.starts, []);
  }
});

test('a new trusted gesture can resume audio after replacement or reopening, with no replay', async () => {
  const h = harness({sound: true});
  h.audio.play('transition', trusted);
  await quiet();
  h.setScope('enfant');
  h.audio.play('timer');
  await quiet();
  assert.deepEqual(h.starts.map(row => row.cue), ['transition']);
  h.click(trusted);
  h.audio.play('timer');
  await quiet();
  h.lifecycle('pagehide');
  h.lifecycle('pageshow');
  h.audio.play('reward');
  await quiet();
  assert.deepEqual(h.starts.map(row => row.cue), ['transition', 'timer']);
  h.audio.play('confirm', trusted);
  await quiet();
  assert.deepEqual(h.starts.map(row => row.cue), ['transition', 'timer', 'confirm']);
  assert.equal(h.contexts.length, 1);
});

test('a delayed download after repeated gestures cannot stack or replace higher priority', async () => {
  const h = harness({sound: true, defer: true});
  h.audio.play('confirm', trusted);
  h.audio.play('reward', trusted);
  h.audio.play('confirm', trusted);
  assert.equal(h.urls.length, 2);
  h.downloads[1]();
  h.downloads[0]();
  await quiet();
  assert.deepEqual(h.starts.map(row => row.cue), ['reward']);
});
