/**
 * Small sound effects for the solo games, made on the fly with Web Audio (no files).
 * `wrong` is the same falling double buzz the group adventures use (competitions/games/adventure/audio.js).
 * Made on the first call, which always comes from a tap, so browsers allow it.
 */
let ctx = null;
const audio = () => {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

const tone = (c, type, freq, dur, vol, at = 0) => {
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  const [from, to] = Array.isArray(freq) ? freq : [freq, freq];
  osc.frequency.setValueAtTime(from, t0);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
};

export const sfx = {
  /** A wrong answer: two low buzzes, falling. */
  wrong() {
    const c = audio();
    if (!c) return;
    [0, 0.18].forEach((at) => { tone(c, 'sawtooth', [200, 110], 0.16, 0.12, at); tone(c, 'square', 92, 0.16, 0.04, at); });
  }
};
