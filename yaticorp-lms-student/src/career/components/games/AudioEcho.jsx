import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { CATEGORIES, SOUNDS, echoConfig, makeEchoLevel, scoreSpot, scoreWords } from '../../data/bands/audioEcho';
import { createEchoEngine } from './audioEchoEngine';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const LEAD_MS = 700;
const FEEDBACK_MS = 2600;
const BY_KEY = Object.fromEntries(SOUNDS.map((s) => [s.key, s]));
// One quiet accent per mission (2026-11-16, the user: clean and professional).
const MISSION = {
  count: { icon: '🔢', title: 'Count it', accent: '#f59e0b', soft: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', btn: 'bg-amber-500 hover:bg-amber-600' },
  spot: { icon: '🎯', title: 'Catch it', accent: '#f43f5e', soft: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200', btn: 'bg-rose-500 hover:bg-rose-600' },
  words: { icon: '🗣️', title: 'Remember it', accent: '#8b5cf6', soft: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-200', btn: 'bg-violet-500 hover:bg-violet-600' }
};
/** The clock for tap timing (outside render, kept here so taps and the stream share one clock). */
const clockNow = () => performance.now();
const ttsReady = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

/**
 * 🎧 Audio Echo (2026-11-16, remade; title kept, id "grid-navigator"). Listening missions for memory and focus:
 * count a sound in a quick stream, catch every target sound with a tap, remember a spoken word list. Sounds are made
 * live (audioEchoEngine.js); words are read by the device's voice (speech synthesis) — with no voice, word missions
 * become counting missions. Missions and scoring: data/bands/audioEcho.js.
 */
export default function AudioEcho({ onExit }) {
  const progress = useGameProgress('grid-navigator', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = echoConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [voice] = useState(ttsReady);
  const [missions] = useState(() => makeEchoLevel(seeded(freshSeed()), config).map((m) => (m.kind === 'words' && !ttsReady() ? m.fallback : m)));
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState('intro'); // intro · playing · answer · feedback
  const [beat, setBeat] = useState(-1); // index of the sound or word now playing
  const [spotTaps, setSpotTaps] = useState([]);
  const [tapFlash, setTapFlash] = useState(null); // 'hit' | 'miss'
  const [picked, setPicked] = useState([]);
  const [verdict, setVerdict] = useState(null);
  const [right, setRight] = useState(0);
  const [results, setResults] = useState([]); // true / false per mission, for the progress dots
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [audioOk, setAudioOk] = useState(null);
  const [interrupted, setInterrupted] = useState(false);
  const engine = useRef(null);
  const timers = useRef([]);
  const startAt = useRef(0);
  const tapsRef = useRef([]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  const hush = () => { clearTimers(); engine.current?.stopAll(); if (ttsReady()) window.speechSynthesis.cancel(); };
  useEffect(() => hush, []); // eslint-disable-line react-hooks/exhaustive-deps

  const over = idx >= missions.length;
  const m = over ? null : missions[idx];
  const stars = over ? starsForFixed(right, config.pass, missions.length) : 0;
  useRecordStars(progress, over, stars, { correct: right, wrong: missions.length - right, hints: 0, score: right });

  const ensureEngine = async () => {
    if (engine.current) return;
    engine.current = createEchoEngine();
    engine.current.setVolume(volume / 100);
    engine.current.setMuted(muted);
    setAudioOk(engine.current.ok && (await engine.current.resume()));
  };

  const preview = async (key) => { await ensureEngine(); engine.current.play(key); };

  const next = () => {
    setIdx((i) => i + 1);
    setPhase('intro');
    setBeat(-1);
    setSpotTaps([]);
    tapsRef.current = [];
    setPicked([]);
    setVerdict(null);
  };

  const finish = (ok, text) => {
    setVerdict({ ok, text });
    setPhase('feedback');
    setResults((r) => [...r, ok]);
    if (ok) { sfx.right?.(); setRight((r) => r + 1); } else sfx.wrong?.();
    later(next, FEEDBACK_MS);
  };

  /** Plays the mission's stream (sounds or words); then the answer (or, for "spot", the score). */
  const play = async () => {
    await ensureEngine();
    hush();
    setInterrupted(false);
    setPhase('playing');
    setSpotTaps([]);
    tapsRef.current = [];
    startAt.current = clockNow();
    if (m.kind === 'words') {
      const say = (i) => {
        if (i >= m.heard.length) { setBeat(-1); later(() => setPhase('answer'), 500); return; }
        setBeat(i);
        const u = new window.SpeechSynthesisUtterance(m.heard[i]);
        u.rate = 0.9;
        u.volume = muted ? 0 : volume / 100;
        u.onend = () => later(() => say(i + 1), 450);
        u.onerror = () => later(() => say(i + 1), 450);
        window.speechSynthesis.speak(u);
      };
      later(() => say(0), LEAD_MS);
      return;
    }
    m.seq.forEach((key, i) => later(() => { setBeat(i); engine.current?.play(key); }, LEAD_MS + i * config.gapMs));
    later(() => {
      setBeat(-1);
      if (m.kind === 'count') { setPhase('answer'); return; }
      const r = scoreSpot(m.seq, m.target, config.gapMs, tapsRef.current, LEAD_MS);
      const ok = r.hits === r.targets && r.falseTaps <= config.slips;
      finish(ok, ok
        ? `Caught all ${r.targets}! ${r.falseTaps ? `(${r.falseTaps} extra tap)` : 'No false taps.'}`
        : `Caught ${r.hits} of ${r.targets}${r.falseTaps ? ` · ${r.falseTaps} false tap${r.falseTaps > 1 ? 's' : ''}` : ''}.`);
    }, LEAD_MS + m.seq.length * config.gapMs + 300);
  };

  const heardIt = () => {
    if (phase !== 'playing' || m.kind !== 'spot' || paused) return;
    const t = clockNow() - startAt.current;
    tapsRef.current = [...tapsRef.current, t];
    setSpotTaps(tapsRef.current);
    const i = Math.floor((t - LEAD_MS) / config.gapMs);
    setTapFlash(i >= 0 && m.seq[i] === m.target ? 'hit' : 'miss');
    later(() => setTapFlash(null), 250);
  };

  const answerCount = (n) => {
    if (phase !== 'answer') return;
    const name = BY_KEY[m.target].name.toLowerCase();
    finish(n === m.answer, n === m.answer ? `Yes — the ${name} played ${m.answer} times!` : `The ${name} played ${m.answer} times.`);
  };
  const checkWords = () => {
    if (phase !== 'answer') return;
    const ok = scoreWords(m.heard, picked);
    finish(ok, ok ? `All ${m.heard.length} words remembered!` : `The words were: ${m.heard.join(', ')}.`);
  };

  const togglePause = () => {
    if (!started) return;
    if (!paused) {
      hush();
      if (phase === 'playing') { setPhase('intro'); setInterrupted(true); setBeat(-1); }
      setPaused(true);
      return;
    }
    setPaused(false);
    if (phase === 'feedback') later(next, 600);
  };

  const changeVolume = (v) => { setVolume(v); engine.current?.setVolume(v / 100); if (v > 0 && muted) { setMuted(false); engine.current?.setMuted(false); } };
  const toggleMute = () => { engine.current?.setMuted(!muted); setMuted(!muted); };

  const objective = `Listening missions! 🔢 Count how many times a sound plays · 🎯 Tap "Heard it!" every time the target sound plays · 🗣️ Remember a list of spoken words. ${missions.length} missions — get ${config.pass} right. Turn your sound on! 🔊`;
  const look = m ? MISSION[m.kind] : MISSION.count;
  const target = m && m.target ? BY_KEY[m.target] : null;

  return (
    <GameShell
      title="Audio Echo"
      blurb="Listen closely: count, catch and remember."
      tone="bg-gradient-to-br from-teal-400 to-blue-600"
      score={`${right}/${missions.length}`}
      scoreLabel="Missions"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      paused={paused}
      onPause={togglePause}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: right >= config.pass,
        stars,
        headline: right >= config.pass ? `Level ${progress.level} cleared — sharp ears!` : 'Listen closely and try again',
        detail: `${right} of ${missions.length} listening missions right`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-sm">{voice ? 'Sound on, please — every mission is heard, not seen.' : 'No voice on this device: word missions are swapped for counting missions.'}</p>}
    >
      {started && m && (
        <div className="mx-auto w-full max-w-2xl select-none">
          <div className="overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_20px_44px_-26px_rgba(15,23,42,0.35)] ring-1 ring-slate-200">
            {/* Header: mission, sound category, volume */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <span className={`grid h-11 w-11 place-items-center rounded-2xl text-2xl ${look.soft}`} aria-hidden>{look.icon}</span>
                <div>
                  <p className="text-[0.65rem] font-black tracking-[0.16em] text-slate-400 uppercase">Mission {idx + 1} of {missions.length}</p>
                  <p className="text-lg leading-tight font-black text-slate-900">{look.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                  <span aria-hidden>{CATEGORIES[config.category].icon}</span>{CATEGORIES[config.category].name}
                </span>
                <div className="flex items-center gap-1.5 rounded-full bg-slate-50 py-1 pr-2.5 pl-1 ring-1 ring-slate-200">
                  <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className="grid h-7 w-7 place-items-center rounded-full text-slate-600 hover:bg-white">
                    {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
                  </button>
                  <input type="range" min="0" max="100" value={muted ? 0 : volume} onChange={(e) => changeVolume(Number(e.target.value))} className="w-20 accent-slate-700" aria-label="Volume" />
                </div>
              </div>
            </div>

            {/* Progress: one segment per mission */}
            <div className="flex gap-1 px-4 pt-3 sm:px-5" aria-hidden>
              {missions.map((_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${i < results.length ? (results[i] ? 'bg-emerald-400' : 'bg-rose-300') : i === idx ? 'bg-slate-800' : 'bg-slate-200'}`} />
              ))}
            </div>

            <div className="px-4 pt-5 pb-5 sm:px-6">
              {phase === 'intro' && (
                <div className="gs-rise grid items-center gap-5 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-xl leading-snug font-black text-slate-900 sm:text-2xl">
                      {m.kind === 'count' && <>How many times will you hear the <span className={look.text}>{target.name}</span>?</>}
                      {m.kind === 'spot' && <>Tap <span className={look.text}>Heard it</span> every time the <span className={look.text}>{target.name}</span> plays.</>}
                      {m.kind === 'words' && <>Remember all <span className={look.text}>{m.heard.length} {m.theme}</span> the voice reads.</>}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      {m.kind === 'words' ? 'Then pick every word you heard.' : `${m.seq.length} sounds · listen only, nothing lights up.`}
                    </p>
                    {interrupted && <p className="mt-2 text-xs font-bold text-amber-600">Paused — it will start again from the beginning.</p>}
                    {/* One row on phones too (2026-11-16, the user): the two buttons share the width. */}
                    <div className="mt-5 flex gap-2">
                      <button type="button" onClick={play} disabled={paused}
                        className={`fp-press inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-black whitespace-nowrap text-white shadow-sm transition disabled:opacity-40 sm:min-h-12 sm:flex-none sm:px-6 sm:text-sm ${look.btn}`}>
                        ▶ Start listening
                      </button>
                      {target && (
                        <button type="button" onClick={() => preview(target.key)} disabled={paused}
                          className="fp-press inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-xs font-black whitespace-nowrap text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50 disabled:opacity-40 sm:min-h-12 sm:flex-none sm:px-5 sm:text-sm">
                          <Volume2 className="h-4 w-4 shrink-0" aria-hidden /> Hear the {target.name}
                        </button>
                      )}
                    </div>
                  </div>
                  {target && (
                    <div className={`mx-auto grid h-28 w-28 place-items-center rounded-full ${look.soft} ring-8 ring-white`} style={{ boxShadow: `0 0 0 1px ${look.accent}33` }}>
                      <span className="text-5xl" aria-hidden>{target.emoji}</span>
                    </div>
                  )}
                </div>
              )}

              {phase === 'playing' && (
                <div className="flex flex-col items-center py-2">
                  <Speaker beat={beat} accent={look.accent} />
                  <p className="mt-4 text-sm font-black text-slate-600">Listening… {m.kind === 'words' ? `word ${Math.max(0, beat) + 1} of ${m.heard.length}` : `${Math.max(0, beat + 1)} of ${m.seq.length}`}</p>
                  {m.kind === 'spot' && (
                    <>
                      <button type="button" onPointerDown={heardIt}
                        className={`fp-press mt-5 min-h-16 w-full max-w-sm rounded-2xl text-xl font-black text-white shadow-sm transition ${tapFlash === 'hit' ? 'bg-emerald-500' : tapFlash === 'miss' ? 'bg-slate-400' : look.btn}`}>
                        Heard it — {target.name}
                      </button>
                      <p className="mt-2 text-xs font-bold text-slate-400">Taps: {spotTaps.length}</p>
                    </>
                  )}
                </div>
              )}

              {phase === 'answer' && m.kind !== 'words' && (
                <div className="gs-rise text-center">
                  <p className="text-lg font-black text-slate-900">How many times did the {target.name} play?</p>
                  <div className="mx-auto mt-4 grid max-w-sm grid-cols-4 gap-2">
                    {m.options.map((n) => (
                      <button key={n} type="button" onClick={() => answerCount(n)}
                        className="fp-press min-h-16 rounded-2xl bg-white text-3xl font-black text-slate-800 ring-1 ring-slate-300 transition hover:-translate-y-0.5 hover:ring-slate-500">
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {phase === 'answer' && m.kind === 'words' && (
                <div className="gs-rise text-center">
                  <p className="text-lg font-black text-slate-900">Tap every word you heard <span className="text-sm font-bold text-slate-400">({picked.length}/{m.heard.length})</span></p>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {m.tiles.map((w) => {
                      const on = picked.includes(w);
                      return (
                        <button key={w} type="button" onClick={() => setPicked((p) => (on ? p.filter((x) => x !== w) : [...p, w]))}
                          className={`fp-press min-h-12 rounded-xl px-2 text-base font-black capitalize transition ${on ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:ring-slate-500'}`}>
                          {w}
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" onClick={checkWords} disabled={!picked.length}
                    className={`fp-press mt-5 min-h-12 rounded-xl px-8 text-sm font-black text-white shadow-sm disabled:opacity-40 ${look.btn}`}>
                    Check answer
                  </button>
                </div>
              )}

              {phase === 'feedback' && verdict && (
                <div className="gs-rise flex flex-col items-center py-3 text-center" role="status" aria-live="polite">
                  <span className={`grid h-14 w-14 place-items-center rounded-full text-2xl text-white ${verdict.ok ? 'gs-right bg-emerald-500' : 'bg-rose-500'}`} aria-hidden>{verdict.ok ? '✓' : '✕'}</span>
                  <p className={`mt-3 text-lg font-black ${verdict.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{verdict.ok ? 'Great listening!' : 'Not this time'}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{verdict.text}</p>
                </div>
              )}
            </div>

            {/* The sounds in this level */}
            <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
              <p className="mb-2 text-[0.65rem] font-black tracking-[0.16em] text-slate-400 uppercase">Sounds in this level</p>
              <div className="flex flex-wrap gap-1.5">
                {config.sounds.map((k) => (
                  <span key={k} className={`inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold ring-1 ${target && target.key === k ? `${look.text} ${look.ring}` : 'text-slate-600 ring-slate-200'}`}>
                    <span aria-hidden>{BY_KEY[k].emoji}</span>{BY_KEY[k].name}
                  </span>
                ))}
              </div>
            </div>

            {audioOk === false && (
              <p className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-center text-xs font-bold text-amber-700">
                Sound could not start on this device — check that it is not muted, then press Start listening again.
              </p>
            )}
          </div>
        </div>
      )}
    </GameShell>
  );
}

/** A speaker that pulses on every beat — it never shows which sound it was. */
function Speaker({ beat, accent }) {
  return (
    <span className="relative grid h-32 w-32 place-items-center" aria-hidden>
      <span key={`a${beat}`} className={`absolute inset-0 rounded-full ${beat >= 0 ? 'animate-ping' : ''}`} style={{ background: `${accent}26` }} />
      <span className="absolute inset-3 rounded-full" style={{ background: `${accent}1a`, boxShadow: `inset 0 0 0 1px ${accent}40` }} />
      <span className="absolute inset-7 grid place-items-center rounded-full bg-white shadow-sm">
        <Volume2 className="h-9 w-9" style={{ color: accent }} />
      </span>
    </span>
  );
}
