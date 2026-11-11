/**
 * Language Learning — a story told as a short film (2026-11-07, story 2, "The Stranger Who Changed Everything"; the
 * server's comics.js). Its scenes, drawn and animated here in 2D comic style (FilmStage.jsx), play one after the other
 * without a break, from the first line to the last: the narration and dialogue spoken in the course's language and
 * subtitled word by word, the people walking, sitting, turning and moving their lips as they speak, soft music and
 * rain under it; then the moral — and then, by itself, the lesson's own five questions (Session's `onFinish`).
 * Tap a character: they hop and say their line (the film waits, then goes on).
 *
 * The voices are recorded (2026-11-07: "generate audio for this story and add it — fixed"): one file a line, per
 * language, in public/linguistic/<film.audio>/<lang>/<scene>-<line>.m4a with their lengths in manifest.json; the
 * subtitles follow each recording. A language with no recording (Kannada: no voice to record it with) is read by the
 * browser's own voice.
 *
 * Controls (all working): Play / Pause, previous / next line, replay the scene, start again, autoplay on or off,
 * voice, music, subtitles, full screen; and the script, to read it all.
 */
import { Suspense, lazy } from 'react';
import FilmStage from './FilmStage';
// The 3D scene (film3d/, Three.js) loads only when the film opens; without WebGL, the drawn one (FilmStage) plays.
const FilmStage3D = lazy(() => import('./film3d/FilmStage3D'));
const USE_3D = false;
const webgl = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } };
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Captions, ChevronLeft, ChevronRight, Expand, Mic, MicOff, Music, Pause, Play, RotateCcw, Repeat, ScrollText, Shrink } from 'lucide-react';

/* ── Motion ───────────────────────────────────────────────────────────── */
const CSS = `
.sf-fade { animation: sf-fadein .9s ease both; }
@keyframes sf-fadein { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .sf-fade { animation: none; } }
`;

/* ── Sound: soft music under the story, and the rain ───────────────────── */
function createScore() {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain(); master.gain.value = 0.0001; master.connect(ctx.destination);
    const echo = ctx.createDelay(1); echo.delayTime.value = 0.38; const fb = ctx.createGain(); fb.gain.value = 0.32;
    echo.connect(fb).connect(echo); echo.connect(master);
    const rainGain = ctx.createGain(); rainGain.gain.value = 0; rainGain.connect(master);
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
    const rain = ctx.createBufferSource(); rain.buffer = buf; rain.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; rain.connect(lp).connect(rainGain); rain.start();
    // A gentle progression (A minor, F, C, G) — pads, and a slow piano line over them.
    const CH = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]];
    const MEL = [659.3, 587.3, 523.3, 493.9, 523.3, 440, 392, 440];
    let step = 0; let timer = null;
    const note = (f, t, dur, vol, type) => {
        const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (type === 'sine' ? 0.02 : dur * 0.4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(master); g.connect(echo); o.start(t); o.stop(t + dur + 0.1);
    };
    const tick = () => {
        const t = ctx.currentTime + 0.05;
        if (step % 4 === 0) CH[(step / 4) % 4].forEach((f) => note(f, t, 4.4, 0.035, 'triangle'));
        if (step % 2 === 0) note(MEL[(step / 2) % MEL.length], t, 2.2, 0.05, 'sine');
        step += 1;
    };
    return {
        play(volume) { ctx.resume(); master.gain.setTargetAtTime(volume, ctx.currentTime, 0.4); if (!timer) { tick(); timer = setInterval(tick, 1000); } },
        stop() { master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3); clearInterval(timer); timer = null; },
        duck(on) { master.gain.setTargetAtTime(on ? 0.45 : 0.9, ctx.currentTime, 0.3); },
        rain(on) { rainGain.gain.setTargetAtTime(on ? 0.05 : 0, ctx.currentTime, 0.6); },
        close() { clearInterval(timer); ctx.close().catch(() => {}); }
    };
}

/* ── The recorded voices ─────────────────────────────────────────────── */
const ROOT = `${import.meta.env.BASE_URL || '/'}linguistic/`;
const manifests = {};
/** The recordings' lengths for a film ({ en: { '1-0': 3.2, … }, … }), fetched once. */
const loadManifest = (dir) => {
    if (!manifests[dir]) manifests[dir] = fetch(`${ROOT}${dir}/manifest.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    return manifests[dir];
};

/* ── Voices ───────────────────────────────────────────────────────────── */
const VOICE = { narrator: { rate: 0.94, pitch: 1 }, arjun: { rate: 1, pitch: 1.08 }, ravi: { rate: 0.86, pitch: 0.78 }, interviewer: { rate: 0.95, pitch: 0.9 } };
const voiceFor = (locale) => {
    const all = typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    const lang = (locale || 'en-IN').toLowerCase();
    return all.find((v) => v.lang.toLowerCase() === lang) || all.find((v) => v.lang.toLowerCase().startsWith(lang.split('-')[0])) || null;
};

/** The whole script, to read: each scene, who says what. */
export function FilmScript({ film }) {
    return (
        <div className="space-y-4" data-film-script>
            {film.scenes.map((sc) => (
                <section key={sc.id}>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#777]">{sc.title}</h4>
                    <div className="mt-1 space-y-1.5">
                        {sc.lines.map((ln, k) => (
                            <p key={k} className={`text-[15px] leading-7 ${ln.who === 'narrator' ? 'italic text-[#555]' : 'font-semibold text-[#3c3c3c]'}`}>
                                {ln.who !== 'narrator' && <span className="mr-1 font-extrabold text-[#1cb0f6]">{ln.name}:</span>}{ln.text}
                            </p>
                        ))}
                    </div>
                </section>
            ))}
            {film.moral && <p className="rounded-xl bg-[#fff7e0] px-3 py-2 text-[15px] font-extrabold text-[#8a5a00]">{film.moralLabel || 'Moral:'} {film.moral}</p>}
        </div>
    );
}

/** The player. `onFinish`: on to the lesson's questions. `sound`: the lesson's own sound switch. */
export default function StoryFilm({ film, onFinish, sound = true }) {
    const scenes = film.scenes;
    const [phase, setPhase] = useState('intro');          // intro · play · moral
    const [si, setSi] = useState(0);
    const [li, setLi] = useState(0);
    const [paused, setPaused] = useState(false);
    const [waiting, setWaiting] = useState(false);        // autoplay off: the line said, waiting for Next
    const [autoplay, setAutoplay] = useState(true);
    const [voice, setVoice] = useState(true);
    const [music, setMusic] = useState(sound);
    const [subs, setSubs] = useState(true);
    const [script, setScript] = useState(false);
    const [word, setWord] = useState(-1);                 // the character index being said, for the subtitle
    const [talking, setTalking] = useState(null);         // who is speaking now: their lips move
    // The cartoon film (FilmStage, 2D) since 2026-11-09 (asked: "I want a cartoon animated film"); the 3D scene (film3d/)
    // is kept, switched off.
    const [use3D] = useState(() => USE_3D && webgl());
    const [mouth, setMouth] = useState(0);
    const [recorded, setRecorded] = useState(null);      // this language's recordings: { '1-0': seconds, … } or null
    const lang = (film.locale || 'en-IN').split('-')[0];
    useEffect(() => {
        let alive = true;
        if (film.audio) loadManifest(film.audio).then((m) => { if (alive) setRecorded(m?.[lang] || null); });
        return () => { alive = false; };
    }, [film.audio, lang]);
    const audio = useRef(null);
    /** Play a recording (`key`: '2-3', 'moral'); `onWord(i)` with the share of it said; `onEnd` when it is over. */
    const playRecording = (key, text, onWord, onEnd) => {
        const a = new Audio(`${ROOT}${film.audio}/${lang}/${key}.m4a`);
        audio.current = a;
        let ended = false;
        const end = () => { if (ended) return; ended = true; onEnd(); };
        a.ontimeupdate = () => { if (a.duration) onWord?.(Math.floor((a.currentTime / a.duration) * text.length)); };
        a.onended = end; a.onerror = end;
        a.play().catch(end);
        later(((recorded?.[key] || 20) + 4) * 1000, end);
    };
    const [full, setFull] = useState(false);
    const box = useRef(null);
    const score = useRef(null);
    const timers = useRef([]);
    const later = (ms, f) => { const t = setTimeout(f, ms); timers.current.push(t); return t; };
    const clear = () => {
        timers.current.forEach(clearTimeout); timers.current = [];
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        if (audio.current) { audio.current.onended = null; audio.current.onerror = null; audio.current.pause(); audio.current = null; }
    };
    useEffect(() => () => { clear(); score.current?.close(); }, []);

    const scene = scenes[si];
    const line = scene?.lines[li];
    const canSpeak = typeof window !== 'undefined' && !!window.speechSynthesis;

    // Music on while the film plays (and the lesson's sound is on); the rain in the rainy scenes.
    useEffect(() => {
        const s = score.current;
        if (!s) return;
        if (phase !== 'intro' && !paused && music && sound) s.play(0.9); else s.stop();
        s.rain(phase === 'play' && !paused && sound && (line?.light || scene?.light) === 'rain');
    }, [phase, paused, music, sound, line, scene]);

    const nextLine = useCallback(() => {
        setWaiting(false); setWord(-1);
        if (li < scene.lines.length - 1) { setLi(li + 1); return; }
        if (si < scenes.length - 1) { setSi(si + 1); setLi(0); return; }
        setPhase('moral');
    }, [li, si, scene, scenes.length]);

    // The lines one after the other, scene into scene: each said (or shown long enough to read), then the next.
    useEffect(() => {
        if (phase !== 'play' || paused || waiting) return undefined;
        const done = () => { setTalking(null); setMouth(0); score.current?.duck(false); if (autoplay) later(700, nextLine); else setWaiting(true); };
        score.current?.duck(true);
        // Lips: moving while the speaker's words are said.
        const speaker = line.who === 'narrator' ? null : line.who;
        setTalking(speaker);
        const flap = speaker ? setInterval(() => setMouth((m) => (m === 2 ? 1 : m === 1 ? 0 : 2)), 130) : null;
        const stop = () => clearInterval(flap);
        const readMs = 1400 + line.text.length * 62;
        const key = `${si + 1}-${li}`;
        if (voice && sound && recorded?.[key]) {
            playRecording(key, line.text, setWord, () => { stop(); done(); });
        } else if (voice && sound && canSpeak) {
            const u = new SpeechSynthesisUtterance(line.text);
            const v = voiceFor(film.locale); if (v) u.voice = v;
            u.lang = film.locale || 'en-IN'; Object.assign(u, VOICE[line.who] || VOICE.narrator);
            let ended = false;
            const end = () => { if (ended) return; ended = true; stop(); done(); };
            u.onboundary = (e) => { if (typeof e.charIndex === 'number') setWord(e.charIndex); };
            u.onend = end; u.onerror = end;
            window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
            later(readMs + 9000, end);                     // a voice that never says it has ended
        } else later(readMs, () => { stop(); done(); });
        return () => { stop(); clear(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, si, li, paused, waiting, voice, recorded]);

    // The moral, said; then on to the questions by itself (autoplay), or with the button.
    useEffect(() => {
        if (phase !== 'moral' || paused) return undefined;
        const go = () => { if (autoplay) later(2600, () => onFinish?.()); };
        if (voice && sound && recorded?.moral) playRecording('moral', film.moral, null, go);
        else if (voice && sound && canSpeak && film.moral) {
            const u = new SpeechSynthesisUtterance(`${film.moralLabel || 'The moral of the story:'} ${film.moral}`);
            const v = voiceFor(film.locale); if (v) u.voice = v; u.lang = film.locale || 'en-IN'; u.rate = 0.9;
            u.onend = go; u.onerror = go; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
            later(20000, go);
        } else later(5000, go);
        return clear;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, paused]);

    const start = () => {
        if (!score.current) score.current = createScore();
        clear(); setSi(0); setLi(0); setPaused(false); setWaiting(false); setPhase('play');
    };
    const go = (s, l) => { clear(); setWaiting(false); setWord(-1); setSi(s); setLi(l); setPhase('play'); };
    // A tap on someone: the film waits while they say their line (the one now, else their first in this scene), then
    // goes on from the line it was on.
    const tapped = (who) => {
        const theirs = line?.who === who ? line : scene.lines.find((l) => l.who === who);
        const key = theirs ? `${si + 1}-${scene.lines.indexOf(theirs)}` : null;
        if (!theirs || !(voice && sound && (canSpeak || recorded?.[key]))) return;
        clear(); setPaused(true); setTalking(who);
        const flap = setInterval(() => setMouth((m) => (m === 2 ? 1 : m === 1 ? 0 : 2)), 130);
        if (recorded?.[key]) {
            playRecording(key, theirs.text, null, () => { clearInterval(flap); setTalking(null); setMouth(0); setPaused(false); });
            return;
        }
        const u = new SpeechSynthesisUtterance(theirs.text);
        const v = voiceFor(film.locale); if (v) u.voice = v;
        u.lang = film.locale || 'en-IN'; Object.assign(u, VOICE[who] || VOICE.narrator);
        let ended = false;
        const end = () => { if (ended) return; ended = true; clearInterval(flap); setTalking(null); setMouth(0); setPaused(false); };
        u.onend = end; u.onerror = end;
        window.speechSynthesis.speak(u);
        later(1400 + theirs.text.length * 62 + 9000, end);
    };
    const back = () => (li > 0 ? go(si, li - 1) : si > 0 ? go(si - 1, scenes[si - 1].lines.length - 1) : go(0, 0));
    const forward = () => { clear(); nextLine(); };
    const toggleFull = () => {
        const el = box.current;
        if (!document.fullscreenElement && el?.requestFullscreen) el.requestFullscreen().then(() => setFull(true)).catch(() => {});
        else if (document.exitFullscreen) document.exitFullscreen().then(() => setFull(false)).catch(() => {});
    };
    useEffect(() => { const f = () => setFull(!!document.fullscreenElement); document.addEventListener('fullscreenchange', f); return () => document.removeEventListener('fullscreenchange', f); }, []);

    const total = useMemo(() => scenes.reduce((n, s) => n + s.lines.length, 0), [scenes]);
    const at = scenes.slice(0, si).reduce((n, s) => n + s.lines.length, 0) + li + (phase === 'moral' ? 1 : 0);
    const text = line?.text || '';
    const said = word >= 0 ? text.slice(0, text.indexOf(' ', word) < 0 ? text.length : text.indexOf(' ', word)) : '';
    const btn = 'flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl px-2.5 text-sm font-extrabold text-white/90 hover:bg-white/15 disabled:opacity-40';

    return (
        <div className="space-y-3" data-story-film lang={(film.locale || 'en-IN').split('-')[0]}>
            <style>{CSS}</style>
            <div ref={box} className={`relative overflow-hidden bg-black shadow-[0_18px_40px_-16px_rgba(0,0,0,.6)] ${full ? '' : 'rounded-2xl'}`} style={{ aspectRatio: full ? undefined : '16 / 9', height: full ? '100%' : undefined }}>
                {/* The scene, acted out; a soft fade as one scene becomes the next */}
                {phase !== 'intro' && scene && (
                    <div className="absolute inset-0">
                        {use3D
                            ? <Suspense fallback={<div className="absolute inset-0 bg-black" />}><FilmStage3D scene={scene} line={phase === 'moral' ? scene.lines.at(-1) : line} lineIndex={phase === 'moral' ? scene.lines.length - 1 : li} talking={talking} spoken={word} text={line?.text || ''} paused={paused || phase === 'moral'} onTap={tapped} /></Suspense>
                            : <div key={scene.id} className="sf-fade absolute inset-0"><FilmStage scene={scene} line={phase === 'moral' ? scene.lines.at(-1) : line} talking={talking} mouth={mouth} onTap={tapped} /></div>}
                    </div>
                )}
                {/* Letterbox bars */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[7%] bg-black" /><div className="pointer-events-none absolute inset-x-0 bottom-0 h-[7%] bg-black" />

                {phase === 'intro' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(ellipse_at_center,#2b3a55_0%,#0b0f1a_75%)] px-6 text-center" data-film-intro>
                        <p className="text-xs font-extrabold uppercase tracking-[0.35em] text-amber-300/90">A story film</p>
                        <h2 className="max-w-3xl font-serif text-3xl font-bold leading-tight text-white sm:text-5xl">{film.title}</h2>
                        <p className="max-w-xl text-sm text-white/75 sm:text-base">Watch and listen — the subtitles follow every word. Tap a character to hear them. Then answer five questions on the story.</p>
                        <button type="button" onClick={start} className="mt-2 inline-flex h-14 items-center gap-2 rounded-full bg-amber-400 px-7 text-lg font-black text-[#1b1b1b] shadow-lg hover:bg-amber-300" data-film-play><Play size={22} fill="currentColor" /> Play the story</button>
                    </div>
                )}

                {phase === 'moral' && (
                    <div className="sf-fade absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(ellipse_at_center,#3b2b10_0%,#0b0a07_75%)] px-6 text-center" data-film-moral>
                        <p className="text-xs font-extrabold uppercase tracking-[0.35em] text-amber-300">{film.moralLabel || 'The moral'}</p>
                        <p className="max-w-3xl font-serif text-xl font-bold italic leading-snug text-amber-50 sm:text-3xl">“{film.moral}”</p>
                        <button type="button" onClick={() => { clear(); onFinish?.(); }} className="mt-2 inline-flex h-12 items-center gap-2 rounded-full bg-amber-400 px-6 font-black text-[#1b1b1b] hover:bg-amber-300" data-film-questions>Answer the questions <ChevronRight size={18} /></button>
                    </div>
                )}

                {/* Subtitles: who speaks, and the words — those said so far brighter */}
                {phase === 'play' && subs && line && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-[9%] flex justify-center px-[4%]" data-film-subtitle>
                        <p className={`max-w-[92%] rounded-lg bg-black/65 px-3 py-1.5 text-center leading-snug text-white shadow ${line.who === 'narrator' ? 'italic' : 'font-semibold'}`} style={{ fontSize: 'clamp(13px, 2.3vw, 24px)' }}>
                            {line.who !== 'narrator' && <span className="mr-1.5 font-black text-amber-300">{line.name}:</span>}
                            <span>{said}</span><span className={said ? 'text-white/60' : ''}>{text.slice(said.length)}</span>
                        </p>
                    </div>
                )}
                {waiting && (
                    <button type="button" onClick={forward} className="absolute bottom-[20%] right-[4%] inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-sm font-black text-[#1b1b1b] shadow" data-film-next-line>Next <ChevronRight size={16} /></button>
                )}

                {/* Controls */}
                {phase !== 'intro' && (
                    <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-0.5 bg-gradient-to-t from-black/85 to-transparent px-2 pb-1.5 pt-6" data-film-controls>
                        <button type="button" className={btn} onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play' : 'Pause'} data-film-pause>{paused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}</button>
                        <button type="button" className={btn} onClick={back} aria-label="Previous line" disabled={phase !== 'play'}><ChevronLeft size={18} /></button>
                        <button type="button" className={btn} onClick={forward} aria-label="Next line" disabled={phase !== 'play'}><ChevronRight size={18} /></button>
                        <button type="button" className={btn} onClick={() => go(si, 0)} aria-label="Replay this scene" title="Replay this scene"><Repeat size={17} /></button>
                        <button type="button" className={btn} onClick={start} aria-label="Start again" title="Start again"><RotateCcw size={17} /></button>
                        <div className="mx-2 h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-white/20"><div className="h-full bg-amber-400 transition-[width] duration-500" style={{ width: `${(at / (total + 1)) * 100}%` }} /></div>
                        <button type="button" className={`${btn} ${autoplay ? 'text-amber-300' : ''}`} onClick={() => setAutoplay((a) => !a)} aria-pressed={autoplay} title="Autoplay">Auto</button>
                        {canSpeak && <button type="button" className={btn} onClick={() => setVoice((v) => !v)} aria-pressed={voice} aria-label={voice ? 'Turn the voice off' : 'Turn the voice on'}>{voice ? <Mic size={17} /> : <MicOff size={17} />}</button>}
                        <button type="button" className={`${btn} ${music ? '' : 'opacity-50'}`} onClick={() => setMusic((m) => !m)} aria-pressed={music} aria-label={music ? 'Turn the music off' : 'Turn the music on'}><Music size={17} /></button>
                        <button type="button" className={`${btn} ${subs ? '' : 'opacity-50'}`} onClick={() => setSubs((s) => !s)} aria-pressed={subs} aria-label={subs ? 'Hide subtitles' : 'Show subtitles'}><Captions size={18} /></button>
                        <button type="button" className={btn} onClick={toggleFull} aria-label={full ? 'Exit full screen' : 'Full screen'}>{full ? <Shrink size={17} /> : <Expand size={17} />}</button>
                    </div>
                )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={() => setScript((x) => !x)} aria-expanded={script} className="lingo-btn inline-flex h-10 items-center gap-2 px-3 text-sm" style={{ background: '#fff', borderColor: '#E5E5E5', color: '#1899D6' }} data-film-script-toggle><ScrollText size={16} /> {script ? 'Hide the script' : 'Read the script'}</button>
            </div>
            {script && <div className="rounded-2xl border-2 border-[#E5E5E5] p-4"><FilmScript film={film} /></div>}
        </div>
    );
}
