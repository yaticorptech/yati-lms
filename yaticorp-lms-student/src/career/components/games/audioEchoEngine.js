/**
 * Audio Echo's sound engine (2026-11-16): every sound synthesised live with Web Audio — no files, so nothing can fail
 * to load. One master gain for volume and mute. A new sound fades out whatever is still ringing, so sounds never
 * overlap. Made on the first tap (Start), which browsers require before audio can play.
 *
 * createEchoEngine() → { ok, play(key) → ms, stopAll(), setVolume(0..1), setMuted(bool), resume() } — `ok` is false
 * when the device has no Web Audio; every call is then a harmless no-op and the game goes on with the lights alone.
 */

const NOOP = { ok: false, play: () => 0, stopAll: () => {}, setVolume: () => {}, setMuted: () => {}, resume: async () => false };

export function createEchoEngine() {
  if (typeof window === 'undefined') return NOOP;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return NOOP;
  let ctx;
  try { ctx = new AC(); } catch { return NOOP; }

  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);
  let volume = 0.8;
  let muted = false;
  let voices = []; // gain nodes still sounding

  // White noise, made once, for the drum, thunder, dog and knock.
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;

  /** A voice: a gain envelope into the master, remembered so the next sound can fade it out. */
  const voice = (t0, peak, attack, decay) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    g.connect(master);
    voices.push(g);
    return g;
  };
  const osc = (type, freq, into, t0, t1) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    o.connect(into);
    o.start(t0);
    o.stop(t1);
    return o;
  };
  const noiseSrc = (into, t0, t1, filterType, freq, q = 1) => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(freq, t0);
    f.Q.value = q;
    src.connect(f).connect(into);
    src.start(t0);
    src.stop(t1);
    return f;
  };

  const SOUNDS = {
    // A bright bell: three inharmonic partials, a long ring.
    bell: (t) => {
      [[880, 0.5], [2420, 0.22], [4750, 0.1]].forEach(([f, v]) => osc('sine', f, voice(t, v, 0.005, 1.1), t, t + 1.2));
      return 650;
    },
    // A drum: a falling sine thump plus a short noise slap.
    drum: (t) => {
      const o = osc('sine', 160, voice(t, 0.9, 0.003, 0.35), t, t + 0.4);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
      noiseSrc(voice(t, 0.35, 0.002, 0.08), t, t + 0.12, 'lowpass', 1800);
      return 450;
    },
    // A piano note (C5 with two quiet harmonics), quick attack and decay.
    piano: (t) => {
      [[523.25, 0.45, 'triangle'], [1046.5, 0.12, 'sine'], [1569.75, 0.05, 'sine']].forEach(([f, v, type]) => osc(type, f, voice(t, v, 0.008, 0.85), t, t + 0.9));
      return 600;
    },
    // A water drop: a quick upward "bloop".
    drop: (t) => {
      const o = osc('sine', 500, voice(t, 0.7, 0.004, 0.22), t, t + 0.26);
      o.frequency.exponentialRampToValueAtTime(1700, t + 0.09);
      return 400;
    },
    // A bird: two fast high chirps.
    bird: (t) => {
      [0, 0.16].forEach((at) => {
        const o = osc('sine', 2600, voice(t + at, 0.3, 0.005, 0.11), t + at, t + at + 0.13);
        o.frequency.exponentialRampToValueAtTime(4200, t + at + 0.06);
        o.frequency.exponentialRampToValueAtTime(3000, t + at + 0.12);
      });
      return 500;
    },
    // A dog: two short gruff barks.
    dog: (t) => {
      [0, 0.22].forEach((at) => {
        const v = voice(t + at, 0.5, 0.01, 0.14);
        const o = osc('sawtooth', 340, v, t + at, t + at + 0.16);
        o.frequency.exponentialRampToValueAtTime(190, t + at + 0.14);
        noiseSrc(voice(t + at, 0.18, 0.005, 0.1), t + at, t + at + 0.12, 'bandpass', 900, 2);
      });
      return 550;
    },
    // Thunder: a deep rolling rumble.
    thunder: (t) => {
      const f = noiseSrc(voice(t, 0.9, 0.06, 1.1), t, t + 1.25, 'lowpass', 420);
      f.frequency.exponentialRampToValueAtTime(90, t + 1.1);
      return 900;
    },
    // A phone: a quick double ring (two tones together).
    phone: (t) => {
      [0, 0.2].forEach((at) => [440, 480].forEach((f) => osc('sine', f, voice(t + at, 0.22, 0.005, 0.15), t + at, t + at + 0.17)));
      return 520;
    },
    // A cat: a rising-then-falling "meow" through a nasal filter.
    cat: (t) => {
      const v = voice(t, 0.35, 0.04, 0.5);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 3;
      f.connect(v);
      const o = osc('sawtooth', 480, f, t, t + 0.6);
      o.frequency.linearRampToValueAtTime(820, t + 0.18);
      o.frequency.linearRampToValueAtTime(430, t + 0.55);
      return 650;
    },
    // A cow: a long low "moo".
    cow: (t) => {
      const v = voice(t, 0.5, 0.12, 0.75);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.setValueAtTime(350, t); f.frequency.linearRampToValueAtTime(900, t + 0.35); f.frequency.linearRampToValueAtTime(300, t + 0.85);
      f.connect(v);
      const o = osc('sawtooth', 125, f, t, t + 0.9);
      o.frequency.linearRampToValueAtTime(105, t + 0.85);
      return 900;
    },
    // A duck: two short nasal quacks.
    duck: (t) => {
      [0, 0.2].forEach((at) => {
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 5;
        f.connect(voice(t + at, 0.55, 0.01, 0.13));
        const o = osc('square', 380, f, t + at, t + at + 0.15);
        o.frequency.exponentialRampToValueAtTime(300, t + at + 0.14);
      });
      return 500;
    },
    // A doorbell: "ding-dong".
    doorbell: (t) => {
      osc('sine', 660, voice(t, 0.45, 0.005, 0.55), t, t + 0.6);
      osc('sine', 523, voice(t + 0.32, 0.45, 0.005, 0.7), t + 0.32, t + 1.05);
      return 900;
    },
    // A clock: tick-tock-tick-tock.
    clock: (t) => {
      [0, 0.16, 0.32, 0.48].forEach((at, i) => noiseSrc(voice(t + at, 0.6, 0.001, 0.035), t + at, t + at + 0.05, 'bandpass', i % 2 ? 1900 : 3200, 6));
      return 650;
    },
    // A car horn: two harsh tones together.
    horn: (t) => {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 1600;
      f.connect(voice(t, 0.3, 0.02, 0.4));
      [350, 440].forEach((hz) => osc('square', hz, f, t, t + 0.45));
      return 550;
    },
    // Rain: soft hiss with tiny drops.
    rain: (t) => {
      noiseSrc(voice(t, 0.25, 0.08, 0.8), t, t + 0.95, 'highpass', 3500);
      [0.08, 0.22, 0.37, 0.5, 0.66, 0.79].forEach((at) => {
        const o = osc('sine', 1800 + at * 900, voice(t + at, 0.18, 0.002, 0.05), t + at, t + at + 0.07);
        o.frequency.exponentialRampToValueAtTime(2800, t + at + 0.05);
      });
      return 900;
    },
    // Wind: a rushing whoosh that rises and falls.
    wind: (t) => {
      const f = noiseSrc(voice(t, 0.45, 0.3, 0.7), t, t + 1.05, 'bandpass', 400, 2.5);
      f.frequency.linearRampToValueAtTime(1300, t + 0.45);
      f.frequency.linearRampToValueAtTime(500, t + 1);
      return 950;
    },
    // Waves: a deep swell rolling in and out.
    waves: (t) => {
      const f = noiseSrc(voice(t, 0.6, 0.45, 0.65), t, t + 1.15, 'lowpass', 300);
      f.frequency.linearRampToValueAtTime(1100, t + 0.5);
      f.frequency.linearRampToValueAtTime(250, t + 1.1);
      return 1000;
    },
    // A door knock: two wooden taps.
    knock: (t) => {
      [0, 0.16].forEach((at) => {
        noiseSrc(voice(t + at, 0.8, 0.002, 0.06), t + at, t + at + 0.08, 'bandpass', 520, 4);
        osc('sine', 180, voice(t + at, 0.4, 0.002, 0.07), t + at, t + at + 0.09);
      });
      return 420;
    }
  };

  const stopAll = () => {
    const now = ctx.currentTime;
    voices.forEach((g) => {
      try {
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      } catch { /* already finished */ }
    });
    voices = [];
  };

  return {
    ok: true,
    /** Plays one sound now (fading out the last); returns how long it needs, in ms. */
    play(key) {
      const make = SOUNDS[key];
      if (!make) return 0;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      stopAll();
      try { return make(ctx.currentTime + 0.01); } catch { return 0; }
    },
    stopAll,
    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.02);
    },
    setMuted(m) {
      muted = m;
      master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.02);
    },
    async resume() {
      try { await ctx.resume(); return ctx.state === 'running'; } catch { return false; }
    }
  };
}
