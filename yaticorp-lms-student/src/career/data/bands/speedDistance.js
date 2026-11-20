/**
 * Speed, Time & Distance (2026-11-19, Master Minds · Maths, the user's pick). Pure and seeded.
 *
 * Each question is answered on a timeline: drag the marker along a track (kilometres) or a clock line (times of day)
 * to the answer, then the vehicles drive it out to show where they really get to. Every answer sits exactly on the
 * track's step, so a dragged answer is either right or wrong — never "nearly".
 *
 *   distance  speed × time — how far?                         (track in km)
 *   arrive    distance ÷ speed — what time does it arrive?    (clock line, 15-minute steps)
 *   meet      two vehicles head towards each other — where do they meet?
 *   catch     a faster one leaves later — where does it catch up?
 */
import { intBetween, pick } from '../seeded.js';

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const speedStep = (difficulty, levelNo) => clampN(Math.ceil((levelNo || 1) / 3) + ((difficulty || 1) - 1) * 3, 1, 14);

export const speedConfig = (difficulty, levelNo) => {
  const s = speedStep(difficulty, levelNo);
  return {
    step: s,
    kinds: s <= 2 ? ['distance', 'arrive'] : s <= 5 ? ['distance', 'arrive', 'meet'] : ['arrive', 'meet', 'catch', 'distance'],
    questions: 6,
    pass: 4,
    seconds: s <= 4 ? 240 : 210
  };
};

export const fmtTime = (mins) => {
  const h = Math.floor(mins / 60) % 24; const m = mins % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};
const hrs = (t) => (t === 0.5 ? 'half an hour' : t === Math.floor(t) ? `${t} hour${t === 1 ? '' : 's'}` : t % 1 === 0.5 ? `${Math.floor(t) ? `${Math.floor(t)}½` : '½'} hours` : `${Math.floor(t)} h ${Math.round((t % 1) * 60)} min`);

/** A track: { unit: 'km' | 'time', min, max, step } — the answer and every stop on it are multiples of step from min. */
const kmTrack = (answer, rng) => {
  const step = answer % 50 === 0 && answer >= 300 ? 25 : 10;
  const max = Math.ceil((answer * (1.3 + rng() * 0.6)) / 50) * 50;
  return { unit: 'km', min: 0, max: Math.max(max, answer + 50), step };
};

const MAKERS = {
  distance: (rng, s) => {
    for (;;) {
      const v = pick(rng, s <= 4 ? [40, 50, 60, 80] : [45, 60, 72, 75, 84, 90, 96]);
      const t = pick(rng, s <= 4 ? [1, 1.5, 2, 2.5, 3] : [1.25, 1.5, 1.75, 2.25, 2.5, 3.5, 4.5]);
      const d = v * t;
      if (!Number.isInteger(d) || d % 10 !== 0) continue;
      const who = pick(rng, [['🚆', 'A train'], ['🚗', 'A car'], ['🚌', 'A bus']]);
      return {
        kind: 'distance', icon: who[0], answer: d, track: kmTrack(d, rng),
        prompt: `${who[1]} travels at ${v} km/h for ${hrs(t)}. How far does it go?`,
        note: `Distance = speed × time = ${v} × ${t} = ${d} km.`,
        movers: [{ icon: who[0], from: 0, to: d }]
      };
    }
  },
  arrive: (rng, s) => {
    for (;;) {
      const v = pick(rng, s <= 4 ? [40, 50, 60, 80] : [48, 60, 64, 72, 75, 90]);
      const tMin = 15 * intBetween(rng, s <= 4 ? 4 : 5, s <= 4 ? 14 : 22); // 1 h … 5½ h, in quarter hours
      const d = (v * tMin) / 60;
      if (!Number.isInteger(d)) continue;
      const leave = 60 * intBetween(rng, 6, 11) + pick(rng, [0, 15, 30, 45]);
      const answer = leave + tMin;
      const who = pick(rng, [['🚗', 'A car'], ['🚆', 'A train'], ['🚚', 'A truck']]);
      const span = 60 * Math.ceil((tMin + 60 + rng() * 90) / 60);
      return {
        kind: 'arrive', icon: who[0], answer,
        track: { unit: 'time', min: leave, max: leave + span, step: 15 },
        prompt: `${who[1]} leaves at ${fmtTime(leave)} and drives ${d} km at ${v} km/h. What time does it arrive?`,
        note: `Time = distance ÷ speed = ${d} ÷ ${v} = ${hrs(tMin / 60)}, so it arrives at ${fmtTime(answer)}.`,
        movers: [{ icon: who[0], from: leave, to: answer }]
      };
    }
  },
  meet: (rng) => {
    for (;;) {
      const a = pick(rng, [40, 45, 50, 60, 70, 75, 80]);
      const b = pick(rng, [30, 40, 50, 55, 60, 65, 90]);
      const t = pick(rng, [1.5, 2, 2.5, 3, 4]);
      const D = (a + b) * t;
      const at = a * t;
      if (!Number.isInteger(D) || !Number.isInteger(at) || at % 10 !== 0 || D % 10 !== 0) continue;
      return {
        kind: 'meet', icon: '🚆', answer: at,
        track: { unit: 'km', min: 0, max: D, step: 10 },
        prompt: `Two trains start ${D} km apart at the same time and run towards each other: from A at ${a} km/h, from B at ${b} km/h. How far from A do they meet?`,
        note: `Together they close ${a} + ${b} = ${a + b} km every hour, so they meet after ${D} ÷ ${a + b} = ${t} h — ${a} × ${t} = ${at} km from A.`,
        movers: [{ icon: '🚆', from: 0, to: at }, { icon: '🚄', from: D, to: at, flip: true }],
        ends: ['A', 'B']
      };
    }
  },
  catch: (rng) => {
    for (;;) {
      const a = pick(rng, [40, 45, 50, 60]);
      const b = a + pick(rng, [10, 15, 20, 30]);
      const h = pick(rng, [0.5, 1, 1.5, 2]);
      const T = (b * h) / (b - a); // hours after the first leaves
      const km = a * T;
      if (!Number.isInteger(km) || km % 10 !== 0 || km > 600) continue;
      return {
        kind: 'catch', icon: '🚗', answer: km, track: kmTrack(km, rng),
        prompt: `A car leaves town at ${a} km/h. ${hrs(h).replace(/^h/, 'H')} later a second car follows on the same road at ${b} km/h. How far from town does it catch up?`,
        note: `The first car is ${a} × ${h} = ${a * h} km ahead; the gap closes ${b - a} km each hour, so ${a * h} ÷ ${b - a} = ${(a * h) / (b - a)} h — ${b} × ${(a * h) / (b - a)} = ${km} km from town.`,
        movers: [{ icon: '🚗', from: a * h, to: km }, { icon: '🏎️', from: 0, to: km }],
        ends: ['Town', '']
      };
    }
  }
};

export const makeSpeedLevel = (rng, cfg) => {
  const out = [];
  for (let i = 0; i < cfg.questions; i += 1) {
    const options = cfg.kinds.filter((k) => k !== out[i - 1]?.kind);
    out.push(MAKERS[pick(rng, options)](rng, cfg.step));
  }
  return out;
};

/** Snap a raw position to the track's step. */
export const snap = (track, v) => clampN(track.min + Math.round((v - track.min) / track.step) * track.step, track.min, track.max);
export const showValue = (track, v) => (track.unit === 'time' ? fmtTime(v) : `${v} km`);
