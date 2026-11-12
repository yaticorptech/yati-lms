/**
 * The adventure games' sound, made live with the Web Audio API — no audio
 * files to load or fail. Each game has its own ambience (`theme`), which
 * grows tenser with setIntensity(0..1), and they share the effects (sfx).
 *
 * Browsers allow sound only after the player does something: nothing plays
 * until start() is called from a tap (the game's "Begin" button). Volume,
 * mute and music are the player's own, remembered in this browser.
 *
 * Sound never decides anything: it follows what the server says.
 */
const KEY = 'groupBrainAudio';
const readPrefs = () => {
    try { return { volume: 0.7, muted: false, music: true, sfx: true, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { return { volume: 0.7, muted: false, music: true, sfx: true }; }
};
const savePrefs = (p) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* not kept: fine */ } };

const PENTATONIC = [220, 247.5, 277.2, 330, 370, 440, 495, 554.4, 660];

export default function createAudio(initialTheme) {
    let theme = initialTheme;
    const prefs = readPrefs();
    let ctx = null; let master = null; let musicBus = null; let sfxBus = null;
    let loop = null; let intensity = 0; const voices = [];
    const listeners = new Set();
    const emit = () => listeners.forEach((f) => f({ ...prefs, started: !!ctx }));

    const applyGain = () => {
        if (!ctx) return;
        master.gain.setTargetAtTime(prefs.muted ? 0 : prefs.volume, ctx.currentTime, 0.05);
        musicBus.gain.setTargetAtTime(prefs.music ? 0.55 : 0, ctx.currentTime, 0.2);
        sfxBus.gain.setTargetAtTime(prefs.sfx === false ? 0 : 1, ctx.currentTime, 0.05);
    };

    /** A tone: type, frequency (or [from, to]), length, loudness, where to. */
    const tone = (type, freq, dur, vol = 0.3, bus = sfxBus, at = 0) => {
        if (!ctx) return;
        const t = ctx.currentTime + at;
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = type;
        if (Array.isArray(freq)) { o.frequency.setValueAtTime(freq[0], t); o.frequency.exponentialRampToValueAtTime(freq[1], t + dur); } else o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(bus);
        o.start(t); o.stop(t + dur + 0.05);
    };
    const noise = (dur, vol, filterFreq, bus = sfxBus, type = 'bandpass', at = 0) => {
        if (!ctx) return;
        const t = ctx.currentTime + at;
        const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource(); src.buffer = buf;
        const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = filterFreq; f.Q.value = 1.2;
        const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f).connect(g).connect(bus);
        src.start(t);
    };

    /** A bird: two to four quick whistles, rising or falling. */
    const bird = () => {
        const base = 1800 + Math.random() * 1600; const n = 2 + Math.floor(Math.random() * 3); const up = Math.random() < 0.5;
        for (let i = 0; i < n; i += 1) tone('sine', up ? [base, base * 1.35] : [base * 1.3, base], 0.09, 0.035, sfxBus, i * 0.13);
    };
    const AMBIENCE = {
        // The jungle: the sea or the river (soft noise), wind, birds, and a quiet melody (the music).
        treasure() {
            const wind = () => noise(3.2, 0.05, 500 + Math.random() * 400, musicBus, 'bandpass');
            const water = () => noise(2.4, 0.035, 900, sfxBus, 'lowpass');
            let nextWind = 0; let nextNote = 0; let nextBird = 0; let nextWater = 0;
            return (now) => {
                if (now >= nextWind) { wind(); nextWind = now + 2600; }
                if (now >= nextWater) { water(); nextWater = now + 2000; }
                if (now >= nextBird) { bird(); nextBird = now + 1500 + Math.random() * 3500; }
                if (now >= nextNote) {
                    const n = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
                    tone('triangle', n, 1.1, 0.07, musicBus);
                    // Quicker as the time runs low.
                    nextNote = now + (700 + Math.random() * 900) * (1 - intensity * 0.6);
                }
            };
        }
    };

    /*
     * The adventure score (2026-11-07, second take: "unique, adventurous"): a small film-score ensemble played in time
     * with the Web Audio clock, through a hall's echo — taiko drums, warm strings and a choir, plucked oud and harp,
     * a bass, and the tune on flute or horn. Each chamber has its own scale (Dorian, the exotic Phrygian dominant,
     * harmonic minor…), tune and ensemble; a swell of drums leads into each new section, and everything quickens and
     * fills out as the time runs low (setIntensity).
     */
    const SCALES = {
        dorian: [0, 2, 3, 5, 7, 9, 10], minor: [0, 2, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11],
        phrygianDom: [0, 1, 4, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], lydian: [0, 2, 4, 6, 7, 9, 11]
    };
    // The hall: a made-up echo (decaying noise, a little different left and right), shared by every instrument.
    let hall = null;
    const send = () => {
        if (hall) return hall;
        const len = Math.floor(ctx.sampleRate * 3.2);
        const ir = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch += 1) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6; }
        const conv = ctx.createConvolver(); conv.buffer = ir;
        const wet = ctx.createGain(); wet.gain.value = 0.42;
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
        const input = ctx.createGain();
        input.connect(comp); conv.connect(wet).connect(comp); input.connect(conv);
        comp.connect(musicBus);
        hall = input;
        return hall;
    };
    const at = (t) => Math.max(0, t - ctx.currentTime);
    /** One note: oscillators through a low-pass filter (which may close as the note dies), an envelope, vibrato. */
    const voice = (t, f, dur, vol, { types = ['sine'], cutoff = 2000, q = 0.7, attack = 0.01, release = 0.1, detune = 0, vib = 0, vibAt = 0.15, fenv = null, partial = null } = {}) => {
        const out = send();
        const g = ctx.createGain(); const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.Q.value = q;
        if (fenv) { lp.frequency.setValueAtTime(fenv[0], t); lp.frequency.exponentialRampToValueAtTime(fenv[1], t + fenv[2]); } else lp.frequency.value = cutoff;
        const hold = Math.max(attack + 0.005, dur - release);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.setValueAtTime(vol, t + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, hold + 0.03));
        lp.connect(g).connect(out);
        let lg = null;
        if (vib) { const lfo = ctx.createOscillator(); lg = ctx.createGain(); lfo.frequency.value = 5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * vib, t + vibAt + 0.2); lfo.connect(lg); lfo.start(t); lfo.stop(t + dur + 0.2); }
        const osc = (type, freq, k, level = 1) => {
            const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = detune * (k % 2 ? 1 : -1);
            if (lg) lg.connect(o.frequency);
            if (level === 1) o.connect(lp); else { const pg = ctx.createGain(); pg.gain.value = level; o.connect(pg).connect(lp); }
            o.start(t); o.stop(t + dur + 0.2);
        };
        types.forEach((type, k) => osc(type, f, k));
        if (partial) osc('sine', f * partial[0], 0, partial[1]);
    };
    const INST = {
        // The tune.
        flute: (t, f, d) => { voice(t, f, d, 0.075, { types: ['sine'], partial: [2, 0.12], cutoff: 4000, attack: 0.06, release: 0.18, vib: 0.007 }); noise(Math.min(0.12, d), 0.01, 3000, send(), 'bandpass', at(t)); },
        horn: (t, f, d) => voice(t, f, d, 0.05, { types: ['sawtooth', 'triangle'], partial: [0.5, 0.25], cutoff: 950, q: 1.1, attack: 0.1, release: 0.25, detune: 5, vib: 0.004 }),
        oud: (t, f, d) => voice(t, f, Math.min(d, 1.1), 0.07, { types: ['sawtooth', 'triangle'], fenv: [3400, 500, 0.35], attack: 0.004, release: 0.6, detune: 4 }),
        // The ensemble.
        pizz: (t, f) => voice(t, f, 0.32, 0.05, { types: ['triangle'], partial: [2, 0.25], fenv: [2600, 700, 0.2], attack: 0.004, release: 0.25 }),
        harp: (t, f) => voice(t, f, 1.3, 0.04, { types: ['sine'], partial: [2, 0.3], attack: 0.003, release: 1.2 }),
        strings: (t, fs2, d) => fs2.forEach((f) => voice(t, f, d, 0.016, { types: ['sawtooth', 'sawtooth', 'triangle'], cutoff: 850, q: 0.5, attack: Math.min(0.9, d * 0.3), release: Math.min(1.2, d * 0.4), detune: 9, vib: 0.002 })),
        choir: (t, fs2, d) => fs2.forEach((f) => {
            const out = send();
            [[760, 0.6], [1150, 0.4]].forEach(([fc, lv]) => {
                const o = ctx.createOscillator(); const bp = ctx.createBiquadFilter(); const g = ctx.createGain();
                o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 14;
                bp.type = 'bandpass'; bp.frequency.value = fc; bp.Q.value = 5;
                g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03 * lv, t + d * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + d);
                o.connect(bp).connect(g).connect(out); o.start(t); o.stop(t + d + 0.1);
            });
        }),
        bass: (t, f, d) => voice(t, f, d, 0.11, { types: ['sine', 'triangle'], cutoff: 380, attack: 0.02, release: d * 0.5 }),
        // The drums.
        taiko: (t, v = 1) => { tone('sine', [95, 40], 0.7, 0.32 * v, send(), at(t)); noise(0.12, 0.09 * v, 320, send(), 'lowpass', at(t)); },
        tom: (t, v = 1) => { tone('sine', [180, 110], 0.35, 0.14 * v, send(), at(t)); noise(0.05, 0.03 * v, 1200, send(), 'bandpass', at(t)); },
        shaker: (t, v = 1) => noise(0.06, 0.018 * v, 7500, send(), 'highpass', at(t)),
        tick: (t) => noise(0.025, 0.028, 3500, send(), 'highpass', at(t)),
        // A rising rush of air into the next section.
        swell: (t, d) => {
            const src = ctx.createBufferSource(); const len = Math.ceil(ctx.sampleRate * d);
            const buf = ctx.createBuffer(1, len, ctx.sampleRate); const x = buf.getChannelData(0);
            for (let i = 0; i < len; i += 1) x[i] = Math.random() * 2 - 1;
            src.buffer = buf;
            const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.Q.value = 0.8; hp.frequency.setValueAtTime(400, t); hp.frequency.exponentialRampToValueAtTime(5000, t + d);
            const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + d * 0.95); g.gain.linearRampToValueAtTime(0.0001, t + d);
            src.connect(hp).connect(g).connect(send()); src.start(t);
        }
    };
    /** A tune, written as "degree:sixteenths" (r for a rest), bar by bar, into one note (or nothing) per sixteenth. */
    const tune = (text) => {
        const steps = [];
        text.split('|').forEach((bar) => bar.trim().split(/\s+/).forEach((tok) => {
            const [d, n] = tok.split(':'); const len = Number(n);
            steps.push(d === 'r' ? null : { deg: Number(d), len }); for (let i = 1; i < len; i += 1) steps.push(null);
        }));
        return steps;
    };
    const TUNES = {
        jungle: tune('0:3 2:1 4:4 3:2 2:2 3:4 | 4:6 2:2 0:8 | 0:3 2:1 4:4 6:2 7:2 6:4 | 4:12 r:4'),
        temple: tune('4:4 5:2 4:2 3:2 2:2 1:4 | 2:6 1:2 0:8 | 0:2 1:2 2:4 3:2 4:2 5:4 | 4:8 1:4 0:4'),
        palace: tune('0:6 4:2 7:8 | 6:3 5:1 4:4 5:4 2:4 | 3:6 2:2 1:4 2:4 | 0:12 r:4'),
        castle: tune('0:8 -1:4 0:4 | 2:8 1:4 -1:4 | 0:8 2:4 4:4 | 3:12 r:4'),
        gate: tune('4:2 4:2 7:4 6:2 4:2 3:4 | 4:2 4:2 2:4 0:8 | 4:2 4:2 7:4 9:4 8:2 7:2 | 7:12 r:4'),
        treasure: tune('0:2 0:2 4:4 4:2 5:2 4:4 | 7:8 6:4 5:4 | 4:2 5:2 4:4 2:4 4:4 | 0:12 r:4')
    };
    const KITS = {
        jungle: { taiko: 'x.....x...x.....', tom: '....x.......x.x.', shaker: true },
        march: { taiko: 'x.......x.......', tom: '....x..x....x...', more: 'x...x...x...x...' },
        ritual: { taiko: 'x..x..x.....x...', tom: '..........x...x.', shaker: true, more: 'x..x..x.x..x..x.' }
    };

    /** One theme: a 4-bar progression, played as an 8-bar section with the tune, then 8 bars for the ensemble alone. */
    const score = (cfg) => () => {
        const scale = SCALES[cfg.scale];
        const hz = (deg, oct = 0) => { const o = Math.floor(deg / 7); const i = ((deg % 7) + 7) % 7; return cfg.root * 2 ** ((12 * (oct + o) + scale[i]) / 12); };
        const kit = KITS[cfg.kit]; const melody = TUNES[cfg.tune];
        let n = 0; let next = ctx.currentTime + 0.15;
        const play = (t, sp) => {
            const bar = Math.floor(n / 16); const s = n % 16;
            const section = Math.floor(bar / 8) % 2;     // 0: the tune, 1: the ensemble
            const c = cfg.prog[bar % 4]; const chord = [c, c + 2, c + 4];
            const hot = intensity > 0.5;
            if (s === 0) {
                INST.strings(t, chord.map((d) => hz(d)), sp * 17);
                if (cfg.choir && (section === 1 || hot)) INST.choir(t, [hz(c, 1), hz(c + 4, 1)], sp * 17);
            }
            if (s === 0 || s === 8 || (cfg.drive && (s === 6 || s === 14))) INST.bass(t, hz(c, -1), sp * (s % 8 ? 2 : 6));
            if (cfg.pizz && s % 2 === 0) INST.pizz(t, hz([c, c + 4, c + 7, c + 4][(s / 2) % 4]));
            if ((cfg.harp || section === 1) && s % 2 === 1 && (cfg.harp || s % 4 === 1)) INST.harp(t, hz([c, c + 2, c + 4, c + 7, c + 9, c + 7, c + 4, c + 2][Math.floor(s / 2) % 8], 1));
            // The tune in the first section; in the second only when the time runs short (an octave up).
            const note = melody[n % 64];
            if (note && (section === 0 || hot)) cfg.leads.forEach((l) => INST[l](t, hz(note.deg, section === 0 ? 1 : 2), sp * note.len * 0.98));
            if (kit && (bar % 8 !== 0 || s >= 4 || section === 1)) {
                if (kit.taiko[s] === 'x' || (hot && kit.more?.[s] === 'x')) INST.taiko(t, s === 0 ? 1.1 : 0.85);
                if (kit.tom[s] === 'x') INST.tom(t);
                if (kit.shaker || hot) INST.shaker(t, s % 4 === 2 ? 1.3 : 0.7);
            }
            // The drums gather into each new section: a roll and a rush of air.
            if (bar % 8 === 7 && s >= 8) { INST.tom(t, 0.5 + (s - 8) * 0.08); if (s === 8) INST.swell(t, sp * 8); }
            if (cfg.ticks && s % 4 === 0) INST.tick(t);
            if (cfg.birds && s === 0 && Math.random() < 0.3) bird();
            n += 1;
        };
        return () => {
            const sp = 60 / (cfg.bpm * (1 + intensity * 0.2)) / 4;
            if (next < ctx.currentTime - 0.05) next = ctx.currentTime + 0.05;   // back from a hidden tab: no catch-up burst
            while (next < ctx.currentTime + 0.3) { play(next, sp); next += sp; }
        };
    };
    const D3 = 146.83; const E3 = 164.81; const C3 = 130.81; const A2 = 110; const F3 = 174.61; const B2 = 123.47;
    Object.assign(AMBIENCE, {
        // The Lost Kingdom: the jungle and its ruins — each trial its own scale, tune and ensemble.
        'kingdom-1': score({ root: D3, scale: 'dorian', bpm: 92, prog: [0, 6, 3, 0], tune: 'jungle', leads: ['flute'], pizz: true, kit: 'jungle', birds: true }),
        'kingdom-2': score({ root: E3, scale: 'phrygianDom', bpm: 88, prog: [0, 1, 0, 6], tune: 'temple', leads: ['oud'], harp: true, kit: 'ritual', birds: true }),
        'kingdom-3': score({ root: A2 * 2, scale: 'harmonic', bpm: 96, prog: [0, 5, 3, 4], tune: 'palace', leads: ['horn'], pizz: true, choir: true, kit: 'march' }),
        'kingdom-4': score({ root: C3, scale: 'minor', bpm: 84, prog: [0, 5, 6, 4], tune: 'castle', leads: ['horn', 'flute'], choir: true, harp: true, kit: 'march', ticks: true }),
        'kingdom-5': score({ root: D3, scale: 'dorian', bpm: 108, prog: [0, 6, 5, 6], tune: 'gate', leads: ['horn', 'oud'], pizz: true, choir: true, kit: 'ritual', drive: true }),
        'kingdom-treasure': score({ root: D3, scale: 'major', bpm: 90, prog: [0, 3, 4, 0], tune: 'treasure', leads: ['horn', 'flute'], harp: true, choir: true, kit: 'march', birds: true }),
        // The Final Vault: an ancient vault under the desert — exotic scales, oud, choir and the mechanism's ticking.
        'vault-temple': score({ root: E3, scale: 'phrygianDom', bpm: 84, prog: [0, 1, 6, 0], tune: 'temple', leads: ['oud', 'flute'], harp: true, choir: true, kit: 'ritual' }),
        'vault-code': score({ root: B2 * 2, scale: 'harmonic', bpm: 92, prog: [0, 5, 3, 4], tune: 'castle', leads: ['horn'], pizz: true, kit: 'march' }),
        'vault-mechanism': score({ root: C3, scale: 'minor', bpm: 98, prog: [0, 6, 5, 4], tune: 'gate', leads: ['oud'], pizz: true, kit: 'march', ticks: true, drive: true }),
        'vault-light': score({ root: F3, scale: 'lydian', bpm: 90, prog: [0, 1, 0, 4], tune: 'jungle', leads: ['flute'], harp: true, choir: true, kit: 'jungle' }),
        'vault-final': score({ root: D3, scale: 'harmonic', bpm: 110, prog: [0, 5, 3, 4], tune: 'palace', leads: ['horn', 'oud'], pizz: true, choir: true, kit: 'ritual', ticks: true, drive: true })
    });

    const SFX = {
        click: () => tone('square', 900, 0.05, 0.08),
        success: () => [523, 659, 784].forEach((f, i) => tone('triangle', f, 0.25, 0.18, sfxBus, i * 0.08)),
        unlock: () => { noise(0.18, 0.25, 220, sfxBus, 'lowpass'); tone('sine', [180, 90], 0.3, 0.25); [784, 1046].forEach((f, i) => tone('triangle', f, 0.4, 0.14, sfxBus, 0.15 + i * 0.1)); },
        fail: () => { tone('sawtooth', [220, 110], 0.4, 0.2); tone('square', 92, 0.35, 0.08); },
        alarm: () => [0, 0.35].forEach((at) => tone('sawtooth', [660, 880], 0.3, 0.1, sfxBus, at)),
        tick: () => tone('square', 1500, 0.03, 0.06),
        step: () => noise(0.09, 0.12, 500 + Math.random() * 300, sfxBus, 'lowpass'),
        trap: () => { noise(0.4, 0.35, 300, sfxBus, 'lowpass'); tone('sawtooth', [300, 60], 0.5, 0.2); },
        // A right answer: a bright rising chime, with a sparkle on top.
        correct: () => { [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone('triangle', f, 0.35, 0.16, sfxBus, i * 0.07)); [2093, 2637].forEach((f, i) => tone('sine', f, 0.5, 0.05, sfxBus, 0.3 + i * 0.06)); },
        // A wrong answer: two low buzzes, falling.
        wrong: () => { [0, 0.18].forEach((at) => { tone('sawtooth', [200, 110], 0.16, 0.14, sfxBus, at); tone('square', 92, 0.16, 0.05, sfxBus, at); }); noise(0.2, 0.12, 250, sfxBus, 'lowpass'); },
        victory: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone('triangle', f, i === 5 ? 0.9 : 0.22, 0.2, sfxBus, i * 0.13)),
        gear: () => { [0, 0.09, 0.18].forEach((at) => noise(0.06, 0.25, 1800, sfxBus, 'bandpass', at)); tone('square', [120, 90], 0.3, 0.05); },
        dial: () => { noise(0.03, 0.2, 3200, sfxBus, 'bandpass'); tone('square', 1800, 0.02, 0.04); },
        door: () => { noise(1.6, 0.3, 160, sfxBus, 'lowpass'); tone('sawtooth', [70, 40], 1.6, 0.12); [523, 784, 1046].forEach((f, i) => tone('triangle', f, 0.6, 0.1, sfxBus, 0.9 + i * 0.12)); },
        mirror: () => { tone('sine', [1400, 2100], 0.12, 0.08); noise(0.08, 0.12, 4000, sfxBus, 'highpass'); },
        crystal: () => [1046, 1318, 1568, 2093].forEach((f, i) => tone('sine', f, 1.2, 0.08, sfxBus, i * 0.07)),
        defeat: () => [392, 349, 311, 262].forEach((f, i) => tone('triangle', f, 0.45, 0.16, sfxBus, i * 0.22))
    };

    return {
        /** From a tap: make the sound system, start the ambience. */
        async start() {
            if (!ctx) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return;
                ctx = new AC();
                master = ctx.createGain(); master.connect(ctx.destination);
                musicBus = ctx.createGain(); musicBus.connect(master);
                sfxBus = ctx.createGain(); sfxBus.connect(master);
                applyGain();
                let step = (AMBIENCE[theme] || AMBIENCE.treasure)(); let playing = theme;
                loop = setInterval(() => {
                    if (playing !== theme) { step = (AMBIENCE[theme] || AMBIENCE.treasure)(); playing = theme; }
                    if (ctx.state === 'running') step(performance.now());
                }, 100);
            }
            if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
            emit();
        },
        sfx(name) { if (ctx && SFX[name]) SFX[name](); },
        /** Another ambience (a new chamber): it takes over within a beat. */
        setTheme(name) { theme = name; },
        setIntensity(v) { intensity = Math.max(0, Math.min(1, v)); },
        set(patch) { Object.assign(prefs, patch); savePrefs(prefs); applyGain(); emit(); },
        prefs: () => ({ ...prefs, started: !!ctx }),
        subscribe(f) { listeners.add(f); return () => listeners.delete(f); },
        dispose() {
            clearInterval(loop);
            voices.forEach((v) => v.oscs.forEach((o) => { try { o.stop(); } catch { /* stopped */ } }));
            if (ctx) ctx.close().catch(() => {});
            ctx = null; hall = null;
            listeners.clear();
        }
    };
}
