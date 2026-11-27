/* Public sound cues. The native Chrome still owns the preference. */
window.DobbyMagicAudio = (() => {
  'use strict';
  const assets = new URL('./assets/audio/', document.currentScript.src);
  const priority = Object.freeze({confirm: 1, transition: 2, notification: 3, reward: 4, timer: 5});
  const gainLevel = 0.72;
  const fade = 0.015;
  const cueInterval = 600;
  const maxDelay = 950;
  const noStop = () => {};
  const buffers = new Map();
  const lastCue = new Map();
  let context, activation, unlocking, scope, current;
  let pageAway = false, nextStart = 0;

  function available() {
    return !document.hidden && !pageAway && window.DobbyChrome?.soundEnabled() === true;
  }

  function stop(cue) {
    if (current !== cue) return;
    current = null;
    if (!cue.source) return;
    const at = context.currentTime;
    if (at < cue.startAt || context.state !== 'running') {
      cue.source.stop(at);
      return;
    }
    const end = at + fade;
    cue.gain.gain.cancelScheduledValues(at);
    cue.gain.gain.setValueAtTime(gainLevel, at);
    cue.gain.gain.linearRampToValueAtTime(0, end);
    cue.source.stop(end);
    nextStart = Math.max(nextStart, end);
  }

  function disarm() {
    if (current) stop(current);
    activation = undefined;
    unlocking = undefined;
    lastCue.clear();
  }

  function accountChanged() {
    const next = window.DobbyStitchV7?.accountScope();
    if (scope !== next) {
      disarm();
      scope = next;
    }
  }

  function activate(event) {
    const key = event?.key;
    if (!event?.isTrusted || (key !== undefined && key !== 'Enter' && key !== ' ') ||
        !window.DobbyStitchV7?.ready || !available()) return;
    accountChanged();
    if (unlocking || activation && context?.state === 'running') return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      context ??= new Audio();
      const resumed = context.state === 'running' ? Promise.resolve() : context.resume();
      const attempt = Promise.resolve(resumed).then(
        () => context.state === 'running',
        () => false
      );
      activation = unlocking = attempt;
      attempt.then(ok => {
        if (unlocking === attempt) unlocking = undefined;
        if (!ok && activation === attempt) disarm();
      });
    } catch {
      disarm();
    }
  }

  function load(name) {
    if (!buffers.has(name)) {
      const url = new URL(name + '.wav', assets);
      buffers.set(name, fetch(url, {credentials: 'omit', mode: 'same-origin', redirect: 'error'})
        .then(response => {
          if (!response.ok) throw Error('Son indisponible');
          return response.arrayBuffer();
        })
        .then(bytes => context.decodeAudioData(bytes))
        .catch(error => { buffers.delete(name); throw error; }));
    }
    return buffers.get(name);
  }

  function play(name, event) {
    if (!Object.hasOwn(priority, name)) return noStop;
    accountChanged();
    if (event) activate(event);
    const armed = activation;
    const requested = performance.now();
    if (!available() || !armed ||
        requested - (lastCue.get(name) ?? -Infinity) < cueInterval ||
        (current && priority[current.name] >= priority[name])) return noStop;

    if (current) stop(current);
    lastCue.set(name, requested);
    const cue = {name};
    current = cue;
    Promise.all([armed, load(name)]).then(([running, buffer]) => {
      accountChanged();
      if (current !== cue) return;
      if (!running || activation !== armed || !available() || context.state !== 'running' ||
          performance.now() - requested > maxDelay) {
        stop(cue);
        return;
      }
      const source = context.createBufferSource(), gain = context.createGain();
      const at = Math.max(context.currentTime, nextStart);
      source.buffer = buffer;
      gain.gain.setValueAtTime(gainLevel, at);
      source.connect(gain);
      gain.connect(context.destination);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        if (current === cue) current = null;
      };
      source.start(at);
      Object.assign(cue, {source, gain, startAt: at});
    }).catch(() => stop(cue));
    return () => stop(cue);
  }

  document.addEventListener('click', activate, true);
  document.addEventListener('keydown', activate, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) disarm(); });
  window.addEventListener('pagehide', () => { pageAway = true; disarm(); });
  window.addEventListener('pageshow', () => { pageAway = false; });
  return Object.freeze({
    play,
    accountChanged,
    preferencesChanged() { if (!available()) disarm(); },
  });
})();
