/* Observe real rendering nodes, including any playback delayed until after leaving the Ritual. */
function traceRitualAudio() {
  if (window !== window.top) return;
  window.__ritualAudio = [];
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;

  const createSource = Audio.prototype.createBufferSource;
  Audio.prototype.createBufferSource = function (...args) {
    const source = createSource.apply(this, args);
    const row = {
      context: this,
      ended: false,
      stopAt: Infinity,
      get stopped() { return this.ended || this.context.state === 'closed' || this.context.currentTime >= this.stopAt; },
    };
    const start = source.start.bind(source);
    const stop = source.stop.bind(source);
    source.start = (...values) => {
      start(...values);
      window.__ritualAudio.push(row);
    };
    source.stop = (...values) => {
      stop(...values);
      row.stopAt = Math.max(values[0] ?? 0, row.context.currentTime);
    };
    source.addEventListener('ended', () => { row.ended = true; }, { once: true });
    return source;
  };
}

const ritualAudioStates = page => page.evaluate(() => __ritualAudio.map(row => row.stopped ? 'stopped' : 'playing'));

const ritualAudioStopped = () => __ritualAudio.every(row => row.stopped);
const ritualAudioPlaying = () => __ritualAudio.some(row => !row.stopped && row.context.state === 'running');

module.exports = { traceRitualAudio, ritualAudioStates, ritualAudioStopped, ritualAudioPlaying };
