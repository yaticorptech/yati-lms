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

    /**
     * A soft chord that swells in and fades out (the pad), through a gentle
     * echo: the Final Vault's mysterious music (asked 2026-10-27).
     */
    let echo = null;
    const echoIn = () => {
        if (echo || !ctx) return echo;
        const d = ctx.createDelay(1.5); d.delayTime.value = 0.42;
        const fb = ctx.createGain(); fb.gain.value = 0.35;
        const wet = ctx.createGain(); wet.gain.value = 0.4;
        d.connect(fb).connect(d); d.connect(wet).connect(musicBus);
        echo = d;
        return d;
    };
    const swell = (freqs, dur, vol) => {
        if (!ctx) return;
        const t = ctx.currentTime;
        freqs.forEach((f) => ['sine', 'triangle'].forEach((type, k) => {
            const o = ctx.createOscillator(); const g = ctx.createGain(); const lp = ctx.createBiquadFilter();
            o.type = type; o.frequency.value = f * (k ? 1.003 : 1);
            lp.type = 'lowpass'; lp.frequency.value = 900;
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(vol * (k ? 0.5 : 1), t + dur * 0.4);
            g.gain.linearRampToValueAtTime(0.0001, t + dur);
            o.connect(lp).connect(g).connect(musicBus);
            o.start(t); o.stop(t + dur + 0.1);
        }));
    };
    /** A slow melody note into the echo. */
    const bell = (f, vol) => {
        if (!ctx) return;
        const t = ctx.currentTime;
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
        o.connect(g); g.connect(musicBus); g.connect(echoIn());
        o.start(t); o.stop(t + 2.5);
    };
    // A minor key, slow: A minor, F, D minor, E — the temple's mystery.
    const CHORDS = [[110, 220, 261.6, 329.6], [87.3, 174.6, 220, 261.6], [73.4, 146.8, 174.6, 220], [82.4, 164.8, 207.7, 246.9]];
    const SCALE = [440, 493.9, 523.3, 587.3, 659.3, 698.5, 830.6, 880];
    /** The Final Vault's chambers: the same mysterious music, each a little tenser, quickening as the time runs low. */
    const temple = ({ chordMs, melodyMs, ticks = false, pulse = false, base = 55 }) => () => {
        let nextChord = 0; let chord = 0; let nextNote = 0; let nextTick = 0;
        return (now) => {
            if (now >= nextChord) { swell(CHORDS[chord % CHORDS.length], chordMs / 1000 + 1.2, 0.035); chord += 1; nextChord = now + chordMs; }
            if (now >= nextNote) {
                bell(SCALE[Math.floor(Math.random() * SCALE.length)] / (Math.random() < 0.5 ? 2 : 1), 0.045);
                nextNote = now + melodyMs * (0.6 + Math.random() * 0.8) * (1 - intensity * 0.5);
            }
            if (ticks && now >= nextTick) { noise(0.05, 0.035, 2400, musicBus, 'highpass'); nextTick = now + 600; }
            if (pulse && now >= nextTick) { tone('sine', base * 2, 0.22, 0.06, musicBus); nextTick = now + Math.max(300, 900 - intensity * 500); }
        };
    };
    Object.assign(AMBIENCE, {
        'vault-temple': temple({ chordMs: 4800, melodyMs: 1900 }),
        'vault-mechanism': temple({ chordMs: 4400, melodyMs: 1700, ticks: true }),
        'vault-code': temple({ chordMs: 4400, melodyMs: 1500 }),
        'vault-light': temple({ chordMs: 4000, melodyMs: 1300, pulse: true, base: 61.7 }),
        'vault-final': temple({ chordMs: 3600, melodyMs: 1000, pulse: true, base: 55 })
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
            ctx = null; echo = null;
            listeners.clear();
        }
    };
}
