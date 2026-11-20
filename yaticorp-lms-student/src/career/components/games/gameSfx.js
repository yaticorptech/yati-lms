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
  /** An arrow sliding away (Arrow Escape, 2026-11-19): a soft rising whoosh of filtered noise. */
  whoosh() {
    const c = audio();
    if (!c) return;
    const dur = 0.32; const t0 = c.currentTime;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(500, t0); bp.frequency.exponentialRampToValueAtTime(2600, t0 + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp).connect(g).connect(c.destination); src.start(t0); src.stop(t0 + dur);
  },
  /** A wrong answer: two low buzzes, falling. */
  wrong() {
    const c = audio();
    if (!c) return;
    [0, 0.18].forEach((at) => { tone(c, 'sawtooth', [200, 110], 0.16, 0.12, at); tone(c, 'square', 92, 0.16, 0.04, at); });
  },
  /** A right answer (2026-11-14, the 84 games): a short bright rising chime. */
  right() {
    const c = audio();
    if (!c) return;
    [0, 0.09].forEach((at, i) => tone(c, 'sine', i ? 880 : 660, 0.12, 0.08, at));
  }
};
