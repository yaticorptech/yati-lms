import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import useSpeech, { sayAloud } from './useSpeech';
import { PASS_MARK, makeSpeakLevel, scoreInterview, scoreReading, scoreRetell, scoreTwister, speakTier, words } from '../../data/bands/speakUp';

/**
 * 🎤 Speak Up (2026-11-19, Master Minds · Vocabulary — the user's four speaking games in one, for adults). Every level:
 * 1 Read Aloud (words said wrong turn red; tap one to hear it) · 2 Tongue Twister (fast and clear) · 3 Interview
 * Answer (30 seconds: key points, fillers, pace) · 4 Story Retell (key points in your own words). A round passes at 60;
 * 3 of 4 clears the level. Speech recognition where the browser has it (useSpeech.js), typing where it does not.
 */
export default function SpeakUp({ onExit }) {
  const progress = useGameProgress('speak-up', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const STAGES = [
  { key: 'read', icon: '📖', name: 'Read Aloud', job: 'Read the paragraph aloud, clearly and at a natural pace.' },
  { key: 'twister', icon: '👅', name: 'Tongue Twister', job: 'Say the twister as fast as you can — every word clear.' },
  { key: 'interview', icon: '💼', name: 'Interview', job: 'Answer the question for 30 seconds. Make your points, skip the “um”s.' },
  { key: 'retell', icon: '📚', name: 'Story Retell', job: 'Read the story, then tell it back in your own words.' }
];
const SEEN = 'yati:speak-seen';
const readSeen = () => { try { return new Set(JSON.parse(localStorage.getItem(SEEN) || '[]')); } catch { return new Set(); } };
const freshSeed = () => Math.floor(Math.random() * 4294967296);

function Round({ progress, onExit }) {
  const [rounds] = useState(() => makeSpeakLevel(seeded(freshSeed()), speakTier(progress.difficulty, progress.levelNo), readSeen()));
  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState([]); // best score per round
  const [started, setStarted] = useState(false);
  const over = idx >= rounds.length;
  const passed = scores.filter((s) => s >= PASS_MARK).length;
  const stars = over ? starsForFixed(passed, 3, rounds.length) : 0;
  useRecordStars(progress, over, stars, { correct: passed, wrong: rounds.length - passed, hints: 0, score: Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length)) });
  useEffect(() => {
    if (!over) return;
    try { const seen = [...readSeen(), ...rounds.map((r) => r.item.text || r.item.q)].slice(-40); localStorage.setItem(SEEN, JSON.stringify(seen)); } catch { /* storage off */ }
  }, [over, rounds]);

  const r = rounds[Math.min(idx, rounds.length - 1)];
  const done = scores.length > idx;
  const finish = (score) => { sfx[score >= PASS_MARK ? 'right' : 'wrong']?.(); setScores((s) => [...s, score]); };
  const objective = 'Four speaking challenges in every level: read a paragraph aloud, race a tongue twister, answer an interview question for 30 seconds, and retell a short story. Each round is scored out of 100 — 60 passes it, and 3 of 4 clears the level. Allow the microphone when asked.';

  return (
    <GameShell
      title="Speak Up"
      blurb="Read, race, answer and retell — out loud."
      tone="bg-gradient-to-br from-rose-500 to-violet-700"
      score={`${passed}/${rounds.length}`}
      scoreLabel="Passed"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: passed >= 3, stars,
        headline: passed >= 3 ? `Well spoken — level ${progress.level} cleared!` : 'Keep practising — try again',
        detail: `${passed} of 4 rounds passed · scores ${scores.join(', ')}`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Round {Math.min(idx + 1, 4)} of 4</p>}
    >
      {started && !over && (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
          <ol className="flex items-start" aria-label="The four rounds">
            {STAGES.map((s, i) => {
              const sc = scores[i];
              const state = sc === undefined ? (i === idx ? 'now' : 'next') : sc >= PASS_MARK ? 'right' : 'wrong';
              return (
                <li key={s.key} className="relative flex flex-1 flex-col items-center gap-1">
                  {i > 0 && <span aria-hidden className={`absolute right-1/2 top-5 h-1 w-full -translate-y-1/2 rounded-full ${scores[i - 1] !== undefined ? 'bg-violet-500' : 'bg-violet-100'}`} />}
                  <span className={`relative z-10 grid h-10 w-10 place-items-center rounded-full text-lg ${state === 'right' ? 'bg-emerald-500 text-sm font-black text-white' : state === 'wrong' ? 'bg-rose-500 text-sm font-black text-white' : state === 'now' ? 'scale-110 bg-violet-600 shadow-[0_0_0_5px_rgba(139,92,246,0.25)]' : 'bg-white ring-2 ring-violet-100'}`}>{sc !== undefined ? sc : s.icon}</span>
                  <span className={`text-center text-[10px] font-black leading-tight ${state === 'now' ? 'text-violet-700' : 'text-slate-400'}`}>{s.name}</span>
                </li>
              );
            })}
          </ol>

          <div key={idx} className="nq-in flex flex-col gap-3">
            <div className="vx-card px-4 py-3.5">
              <p className="text-[0.65rem] font-black tracking-[0.16em] uppercase opacity-90">{STAGES[idx].icon} Round {idx + 1} · {STAGES[idx].name}</p>
              <p className="mt-1 text-sm leading-snug font-bold sm:text-base">{STAGES[idx].job}</p>
            </div>
            <Speaking key={idx} round={r} done={done} onDone={finish} />
            {done && (
              <button type="button" onClick={() => setIdx((n) => n + 1)} className="vx-cta fp-press min-h-12 w-full text-base">
                {idx + 1 < rounds.length ? `Next: ${STAGES[idx + 1].icon} ${STAGES[idx + 1].name} →` : 'See result →'}
              </button>
            )}
          </div>
        </div>
      )}
    </GameShell>
  );
}

const ScoreBar = ({ label, value, suffix = '' }) => (
  <div className="flex items-center gap-2 text-xs font-black text-slate-600">
    <span className="w-20 shrink-0">{label}</span>
    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${value >= 70 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, value)}%` }} /></span>
    <span className="w-14 text-right tabular-nums">{value}{suffix}</span>
  </div>
);

/** One round: the text, the microphone (or typing), then the marked result. Two attempts; the better one counts. */
function Speaking({ round, done, onDone }) {
  const { kind, item } = round;
  const sp = useSpeech();
  const [typed, setTyped] = useState('');
  const [typeStart, setTypeStart] = useState(0);
  const [hidden, setHidden] = useState(false); // retell: the story put away
  const [res, setRes] = useState(null);
  const [tries, setTries] = useState(0);
  const [best, setBest] = useState(0);
  const [left, setLeft] = useState(round.seconds || 0);
  const tick = useRef(null);

  // The interview clock: 30 seconds, then it stops by itself.
  useEffect(() => {
    if (kind !== 'interview' || !sp.listening) return undefined;
    const end = Date.now() + round.seconds * 1000;
    tick.current = setInterval(() => { const s = Math.max(0, Math.ceil((end - Date.now()) / 1000)); setLeft(s); if (s <= 0) { clearInterval(tick.current); sp.stop(); } }, 200);
    return () => clearInterval(tick.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.listening]);

  const mark = (spoken, seconds) => {
    const r = kind === 'read' ? scoreReading(item.text, spoken, seconds)
      : kind === 'twister' ? scoreTwister(item, spoken, seconds)
        : kind === 'interview' ? scoreInterview(item, spoken, Math.min(seconds, round.seconds))
          : scoreRetell(item, spoken);
    const t = tries + 1;
    const b = Math.max(best, r.score);
    setRes({ ...r, spoken }); setTries(t); setBest(b);
    if (t >= 2 || r.score >= PASS_MARK) onDone(b);
  };

  // When the microphone stops, mark what was said.
  const wasListening = useRef(false);
  useEffect(() => {
    if (wasListening.current && !sp.listening && sp.text) mark(sp.text, sp.seconds || 1);
    wasListening.current = sp.listening;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.listening]);

  const retry = () => { setRes(null); sp.setText(''); setTyped(''); setLeft(round.seconds || 0); };
  const showText = kind !== 'interview' && !(kind === 'retell' && hidden);

  return (
    <div className="flex flex-col gap-3">
      {/* What to say */}
      {kind === 'interview' ? (
        <div className="rounded-2xl bg-white p-4 text-center shadow-[0_10px_24px_-16px_rgba(109,40,217,0.6)] ring-2 ring-violet-200">
          <p className="text-xs font-black tracking-wider text-violet-500 uppercase">The interviewer asks</p>
          <p className="mt-1 text-xl font-black text-slate-900">“{item.q}”</p>
          <button type="button" onClick={() => sayAloud(item.q, 0.95)} className="mt-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-200">🔊 Hear the question</button>
        </div>
      ) : showText ? (
        <div className="rounded-2xl bg-white p-4 shadow-[0_10px_24px_-16px_rgba(109,40,217,0.6)] ring-2 ring-violet-200">
          {kind === 'retell' && <p className="mb-1 text-xs font-black tracking-wider text-violet-500 uppercase">📚 {item.title}</p>}
          <p className={`leading-relaxed text-slate-900 ${kind === 'twister' ? 'text-center text-2xl font-black' : 'text-[17px] font-semibold'}`}>
            {res && (kind === 'read' || kind === 'twister')
              ? item.text.split(/\s+/).map((w, i) => {
                const ok = res.hit[wordIndex(item.text, i)];
                return <span key={i}>{ok === false ? <button type="button" onClick={() => sayAloud(w.replace(/[^\w’'-]/g, ''))} className="rounded-md bg-rose-100 px-0.5 font-black text-rose-700 underline decoration-wavy decoration-rose-400" title="Tap to hear it">{w}</button> : <span className={ok ? 'text-emerald-700' : ''}>{w}</span>}{' '}</span>;
              })
              : item.text}
          </p>
          {kind !== 'retell' && <button type="button" onClick={() => sayAloud(item.text, kind === 'twister' ? 1 : 0.9)} className="mt-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-200">🔊 Hear it read</button>}
          {kind === 'retell' && !res && <button type="button" onClick={() => setHidden(true)} className="vx-cta fp-press mt-3 min-h-11 w-full text-sm">I have read it — hide it and retell</button>}
        </div>
      ) : (
        <div className="rounded-2xl bg-violet-50 p-4 text-center text-sm font-bold text-violet-800 ring-1 ring-violet-200">📚 “{item.title}” is put away — now tell the story in your own words.</div>
      )}

      {/* Speak (or type) */}
      {!done && !res && (kind !== 'retell' || hidden) && (
        sp.supported ? (
          <div className="flex flex-col items-center gap-2">
            <button type="button" onClick={sp.listening ? sp.stop : sp.start}
              className={`grid h-20 w-20 place-items-center rounded-full text-3xl text-white shadow-lg transition ${sp.listening ? 'su-live bg-rose-500' : 'bg-gradient-to-br from-violet-600 to-fuchsia-600 active:scale-95'}`}
              aria-label={sp.listening ? 'Stop' : 'Start speaking'}>{sp.listening ? '■' : '🎤'}</button>
            <p className="text-sm font-black text-slate-600">{sp.listening ? (kind === 'interview' ? `Speaking… ${left}s left — tap ■ to finish` : 'Listening… tap ■ when you finish') : 'Tap the microphone and start speaking'}</p>
            {sp.text && <p className="w-full rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">{sp.text}</p>}
            {sp.error && <p className="text-sm font-bold text-rose-600">{sp.error}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 ring-1 ring-amber-200">This browser cannot listen to speech (try Chrome). Type what you would say instead.</p>
            <textarea value={typed} onChange={(e) => { if (!typeStart) setTypeStart(Date.now()); setTyped(e.target.value); }} rows={4} className="w-full rounded-xl p-3 text-sm ring-2 ring-violet-200 outline-none focus:ring-violet-400" placeholder={kind === 'interview' ? 'Your answer…' : 'Type it here…'} />
            <button type="button" onClick={() => mark(typed, Math.max(1, (Date.now() - (typeStart || Date.now())) / 1000))} disabled={!words(typed).length} className="vx-cta fp-press min-h-11 w-full text-sm disabled:opacity-40">✓ Done</button>
          </div>
        )
      )}

      {/* The result */}
      {res && (
        <div className={`gs-rise flex flex-col gap-2 rounded-2xl p-3.5 ring-1 ${res.score >= PASS_MARK ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'}`} role="status">
          <p className={`text-base font-black ${res.score >= PASS_MARK ? 'text-emerald-700' : 'text-rose-700'}`}>{res.score >= PASS_MARK ? '✓' : '✕'} Score {res.score} / 100{tries >= 2 || res.score >= PASS_MARK ? ` · counted: ${best}` : ''}</p>
          {kind === 'read' && <><ScoreBar label="Accuracy" value={res.accuracy} suffix="%" /><ScoreBar label="Pace" value={res.pace} /><p className="text-xs font-bold text-slate-600">{res.wpm} words a minute (110–160 is natural). {res.hit.includes(false) ? 'Tap a red word to hear it said correctly.' : 'Every word was clear!'}</p></>}
          {kind === 'twister' && <><ScoreBar label="Accuracy" value={res.accuracy} suffix="%" /><ScoreBar label="Speed" value={res.speed} /><p className="text-xs font-bold text-slate-600">{res.seconds} s (target {item.target} s). {res.hit.includes(false) ? 'Tap a red word to hear it.' : 'Crisp and clear!'}</p></>}
          {kind === 'interview' && (
            <>
              <ul className="grid gap-1 text-xs font-bold">{item.keys.map((alts, i) => <li key={i} className={res.keysHit[i] ? 'text-emerald-700' : 'text-slate-500'}>{res.keysHit[i] ? '✓' : '○'} {alts[0]}</li>)}</ul>
              <p className="text-xs font-bold text-slate-600">{res.fillerCount ? `Fillers: ${res.fillers.map(([f, n]) => `“${f}” ×${n}`).join(', ')}.` : 'No filler words — great!'} {res.words} words, {res.wpm} words a minute.</p>
            </>
          )}
          {kind === 'retell' && (
            <>
              <ul className="grid gap-1 text-xs font-bold">{item.points.map((alts, i) => <li key={i} className={res.pointsHit[i] ? 'text-emerald-700' : 'text-slate-500'}>{res.pointsHit[i] ? '✓' : '○'} {alts[0]}</li>)}</ul>
              <p className="text-xs font-bold text-slate-600">{res.pointsHit.filter(Boolean).length} of {item.points.length} key points. {res.pointsHit.includes(false) ? 'The grey ones were missed.' : 'You covered everything!'}</p>
            </>
          )}
          {!done && <button type="button" onClick={retry} className="vx-cta fp-press min-h-11 w-full text-sm">↺ Try once more (the better score counts)</button>}
          {kind === 'retell' && done && <p className="text-xs text-slate-600"><b>The story:</b> {item.text}</p>}
        </div>
      )}
    </div>
  );
}

/** The index in words() of the i-th space-separated piece of the text (numbers and hyphens can split or merge). */
function wordIndex(text, i) {
  const pieces = text.split(/\s+/);
  let n = 0;
  for (let k = 0; k < i; k += 1) n += words(pieces[k]).length;
  return n;
}
