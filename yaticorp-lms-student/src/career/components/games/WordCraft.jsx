import { useCallback, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { SECTION_BANDS } from './catalog';
import { sfx } from './gameSfx';
import api from '../../services/api';
import { CHALLENGES, STAGES, TWISTER } from '../../data/bands/wordcraft/select';
import { PASS } from '../../data/bands/wordcraft/score';
import { CaptionClash, DontSayThat, PlotTwist, SellImpossible, TalkFor60, TongueTwister } from './wordcraft/challenges';
import { Bar, ScoreDial } from './wordcraft/kit';
import { LOOK, btnMain, btnSoft } from './wordcraft/look';

const CHALLENGE_VIEWS = { 'dont-say': DontSayThat, caption: CaptionClash, talk60: TalkFor60, plot: PlotTwist, sell: SellImpossible, twister: TongueTwister };

/**
 * ✍️ WORDCRAFT — Vocabulary & Communication Challenge (2026-11-20, Master Minds · Vocabulary; Class 11 onwards,
 * college students and adults). Individual play only (the user, 2026-11-20: no multiplayer).
 *
 * Every level is three challenges: the compulsory Tongue Twister (five correct in a row) and two of Don't Say That!,
 * Caption Clash, Talk for 60, Plot Twist and Sell the Impossible. The SERVER deals the level, keeps it (a level left
 * half-way resumes), re-scores each challenge from what was said (the same score.js, run there) and unlocks the next
 * level only when all three are done and the twister reached five in a row — /api/career/games/wordcraft.
 * Stars as in the other games: one per challenge passed, only with the twister done.
 * Speech: the browser's recogniser (useSpeech.js). Where there is none, the other challenges can be typed (counted up
 * to 80) and the twister says it needs Chrome or Edge. No audio is recorded or sent — only the words recognised.
 */
export default function WordCraft({ onExit }) {
  const progress = useGameProgress('wordcraft', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

// One line each (2026-11-20, the user: minimal text, simple words).
const HOW = {
  'dont-say': 'Explain the big word. Don’t say it, or the red words.',
  caption: 'Write a funny or clever caption for the picture.',
  talk60: 'Talk about the topic until the time runs out.',
  plot: 'Read the first line. Keep the story going out loud. When a new word pops up, use it.',
  sell: 'Talk the customer into buying this odd product.',
  twister: 'Say it 5 times in a row, without stopping. You get 2 chances.'
};
const message = (err, fallback) => err?.response?.data?.message || (err?.response ? fallback : 'Could not reach the server — check your connection.');

function Round({ progress, onExit }) {
  const [started, setStarted] = useState(false);
  const [session, setSession] = useState(null); // { id, level, stage, challenges, results } from the server
  const [stats, setStats] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [notice, setNotice] = useState('');
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState('brief'); // brief | play | saving | result | summary
  const [results, setResults] = useState([]);
  const [outcome, setOutcome] = useState(null);
  const [saveErr, setSaveErr] = useState('');
  const [gone, setGone] = useState(false); // the session ended elsewhere
  const [showStats, setShowStats] = useState(false);
  const pending = useRef(null);

  // Start (or resume) the level on the server when the briefing is closed.
  const load = useCallback(async () => {
    setLoadErr('');
    try {
      const [{ data: st }, { data: s }] = await Promise.all([api.get('/games/wordcraft'), api.post('/games/wordcraft/start', { level: progress.level })]);
      const sess = s.session;
      const rs = sess.challenges.map((_, i) => sess.results?.[i] || sess.results?.[String(i)] || null);
      const open = rs.findIndex((r) => !r);
      setStats(st.stats);
      setSession(sess); setResults(rs); setIdx(open < 0 ? 0 : open); setPhase('brief');
      if (sess.level !== progress.level) setNotice(`Level ${progress.level} is still locked — clear level ${sess.level} first.`);
      else if (s.resumed && open > 0) setNotice(`Welcome back — carrying on from challenge ${open + 1} of 3.`);
    } catch (err) { setLoadErr(message(err, 'WORDCRAFT could not start this level.')); }
  }, [progress.level]);

  const level = session?.level ?? progress.level;
  const stage = session?.stage ?? 0;
  const challenges = session?.challenges || [];
  const over = phase === 'summary';
  const stars = over ? outcome?.stars || 0 : 0;
  const total = results.reduce((s, r) => s + (r?.score || 0), 0);
  useRecordStars({ ...progress, level }, over, stars, { correct: outcome?.passed || 0, wrong: 3 - (outcome?.passed || 0), hints: 0, score: outcome?.average || 0 });

  const ch = challenges[idx];
  const View = ch ? CHALLENGE_VIEWS[ch.kind] : null;

  const submit = async (payload) => {
    if (payload) pending.current = payload;
    setPhase('saving'); setSaveErr('');
    try {
      const { data } = await api.post('/games/wordcraft/submit', { sessionId: session.id, index: idx, ...pending.current });
      setResults((list) => { const next = [...list]; next[idx] = data.result; return next; });
      if (data.level) setOutcome(data.level);
      if (data.stats) setStats(data.stats);
      if (data.result?.passed) sfx.right?.(); else sfx.wrong?.();
      pending.current = null;
      setPhase('result');
    } catch (err) {
      if (err?.response?.status === 409) setGone(true);
      setSaveErr(message(err, 'Your answer could not be saved.'));
    }
  };
  const next = () => {
    if (idx + 1 < challenges.length) { setIdx(idx + 1); setPhase('brief'); setNotice(''); } else setPhase('summary');
  };

  const objective = 'Three challenges a level: the Tongue Twister (five correct in a row, compulsory) and two of Don\'t Say That!, Caption Clash, Talk for 60, Plot Twist and Sell the Impossible. Speak into the microphone — each challenge is scored out of 100 and 60 passes.';

  return (
    <GameShell
      title="WORDCRAFT"
      blurb="Vocabulary & Communication Challenge"
      tone="bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500"
      score={total}
      scoreLabel="Score"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => { setStarted(true); load(); } } : null}
      result={null}
    >
      {started && (
        <div className="wc-root mx-auto flex w-full max-w-2xl flex-col gap-3 text-left">
          {!session ? (
            <div className="wc-in flex flex-col items-center gap-3 rounded-3xl bg-white p-8 text-center ring-1 ring-violet-100">
              {loadErr ? (
                <>
                  <p className="text-3xl">📡</p>
                  <p className="text-base font-black text-slate-800">{loadErr}</p>
                  <button type="button" className={btnMain} onClick={load}>↺ Try again</button>
                </>
              ) : (
                <>
                  <span className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-fuchsia-500" aria-hidden />
                  <p className="text-sm font-black text-slate-500">Dealing your three challenges…</p>
                </>
              )}
            </div>
          ) : (
            <>
              <LevelStrip level={level} stage={stage} challenges={challenges} results={results} idx={idx} phase={phase} total={total} stats={stats} showStats={showStats} onStats={() => setShowStats((v) => !v)} />
              {showStats && stats && <StatsPanel stats={stats} />}
              {notice && <p className="wc-in rounded-2xl bg-sky-50 px-4 py-2.5 text-center text-sm font-black text-sky-800 ring-1 ring-sky-200">{notice}</p>}

              {phase === 'brief' && ch && <Brief key={`b${idx}`} ch={ch} n={idx + 1} onStart={() => setPhase('play')} />}
              {phase === 'play' && View && <div key={`p${idx}`} className="wc-in"><View ch={ch} onDone={submit} /></div>}
              {phase === 'saving' && (
                <div className="wc-in flex flex-col items-center gap-3 rounded-3xl bg-white p-8 text-center ring-1 ring-violet-100">
                  {saveErr ? (
                    <>
                      <p className="text-3xl">⚠️</p>
                      <p className="text-base font-black text-slate-800">{saveErr}</p>
                      {gone
                        ? <button type="button" className={btnMain} onClick={progress.retry}>↺ Start the level again</button>
                        : <button type="button" className={btnMain} onClick={() => submit()}>↺ Try saving again</button>}
                    </>
                  ) : (
                    <>
                      <span className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-fuchsia-500" aria-hidden />
                      <p className="text-sm font-black text-slate-500">Scoring your answer…</p>
                    </>
                  )}
                </div>
              )}
              {phase === 'result' && results[idx] && <ChallengeResult key={`r${idx}`} res={results[idx]} last={idx + 1 >= challenges.length} onNext={next} />}
              {phase === 'summary' && outcome && (
                <Summary level={level} challenges={challenges} results={results} outcome={outcome}
                  onNext={progress.advance} onRetry={progress.retry} atEnd={progress.atEnd} canAdvance={level === progress.level} />
              )}
            </>
          )}
        </div>
      )}
    </GameShell>
  );
}

/** The level, the three challenges, the score. */
function LevelStrip({ level, stage, challenges, results, idx, phase, total, showStats, onStats }) {
  return (
    <div className="flex items-center gap-2 rounded-3xl bg-gradient-to-r from-[#2a0f5c] via-[#4c1d95] to-[#1e3a8a] p-2.5 text-white shadow-[0_16px_36px_-22px_rgba(46,16,101,0.9)]">
      <span className="shrink-0 rounded-2xl bg-white/10 px-2.5 py-1.5 text-center leading-none"><span className="block text-[9px] font-black text-violet-200 uppercase">{STAGES[stage].name}</span><span className="text-sm font-black">Lv {level}</span></span>
      <ol className="flex min-w-0 flex-1 justify-center gap-1.5">
        {challenges.map((c, i) => {
          const r = results[i]; const now = i === idx && phase !== 'summary';
          return (
            <li key={i} title={CHALLENGES[c.kind].name} className={`grid h-11 w-11 place-items-center rounded-2xl text-xl transition ${now ? 'bg-white shadow-lg' : r ? (r.passed ? 'bg-emerald-400/30 ring-1 ring-emerald-300' : 'bg-rose-400/30 ring-1 ring-rose-300') : 'bg-white/10'}`}>
              <span aria-label={CHALLENGES[c.kind].name}>{r ? (r.passed ? '✓' : '✕') : CHALLENGES[c.kind].icon}</span>
            </li>
          );
        })}
      </ol>
      <span className="shrink-0 text-right leading-none"><span className="block text-[9px] font-black text-violet-200 uppercase">Score</span><span className="text-lg font-black tabular-nums">{total}</span></span>
      <button type="button" onClick={onStats} aria-expanded={showStats} className="wc-press shrink-0 rounded-2xl bg-white/10 px-2 py-1.5 text-base hover:bg-white/20" aria-label="My stats">📊</button>
    </div>
  );
}

/** The challenge's briefing: icon, name, one line, start. */
function Brief({ ch, n, onStart }) {
  const meta = CHALLENGES[ch.kind];
  return (
    <div className={`wc-in flex flex-col items-center gap-3 rounded-3xl bg-gradient-to-br ${LOOK[ch.kind].hero} px-5 py-7 text-center text-white shadow-[0_22px_48px_-28px_rgba(76,29,149,0.7)]`}>
      <p className="text-[11px] font-black tracking-[0.2em] text-white/75 uppercase">{n} of 3{ch.kind === TWISTER ? ' · must do' : ''}</p>
      <p className="text-5xl" aria-hidden>{meta.icon}</p>
      <p className="text-3xl font-black">{meta.name}</p>
      <p className="max-w-sm text-base font-bold text-white/90">{HOW[ch.kind]}</p>
      <button type="button" className="wc-press mt-1 min-h-12 rounded-2xl bg-white px-8 text-base font-black text-violet-700 shadow-lg" onClick={onStart} autoFocus>Start ▶</button>
    </div>
  );
}

/** After each challenge: the score, one good thing, one tip. */
function ChallengeResult({ res, last, onNext }) {
  const ok = res.passed;
  return (
    <div className="wc-in flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-[0_22px_48px_-28px_rgba(76,29,149,0.6)] ring-1 ring-violet-100">
      <ScoreDial score={res.score} />
      <p className={`text-2xl font-black ${ok ? 'text-emerald-600' : 'text-rose-600'}`}>{ok ? (res.score >= 85 ? 'Outstanding!' : 'Passed!') : res.kind === TWISTER ? 'Not done' : 'Not quite'}</p>
      {res.strengths?.[0] && <p className="text-sm font-bold text-slate-700">💪 {res.strengths[0]}</p>}
      {res.improve?.[0] && <p className="text-sm font-bold text-slate-500">🎯 {res.improve[0]}</p>}
      <button type="button" className={btnMain} onClick={onNext} autoFocus>{last ? 'Results ➜' : 'Next ➜'}</button>
    </div>
  );
}

/** The level's end: stars, overall score, the three scores, continue. */
function Summary({ level, challenges, results, outcome, onNext, onRetry, atEnd, canAdvance }) {
  const { cleared, stars, twisterDone } = outcome;
  return (
    <div className="wc-in flex flex-col items-center gap-4 rounded-3xl bg-white p-6 text-center shadow-[0_22px_48px_-28px_rgba(76,29,149,0.6)] ring-1 ring-violet-100">
      <p className="text-3xl font-black text-slate-900">{cleared ? `Level ${level} complete!` : 'Not cleared'}</p>
      <div className="flex gap-1.5" aria-label={`${stars} of 3 stars`}>{[0, 1, 2].map((i) => <span key={i} className={`text-4xl ${i < stars ? 'wc-pop' : 'opacity-25 grayscale'}`} style={{ animationDelay: `${0.15 * i}s` }}>⭐</span>)}</div>
      <ScoreDial score={outcome.average} label="Overall" />
      <div className="grid w-full grid-cols-3 gap-2">
        {challenges.map((c, i) => (
          <div key={i} className={`rounded-2xl p-2.5 ring-1 ${results[i]?.passed ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'}`}>
            <p className="text-xl" aria-hidden>{CHALLENGES[c.kind].icon}</p>
            <p className="text-xl font-black text-slate-900 tabular-nums">{results[i]?.score ?? 0}</p>
            <p className="truncate text-[10px] font-black text-slate-500">{CHALLENGES[c.kind].name}</p>
          </div>
        ))}
      </div>
      {!cleared && !twisterDone && <p className="text-sm font-black text-rose-600">The Tongue Twister must be done to clear the level.</p>}
      <div className="flex flex-wrap justify-center gap-2">
        {cleared && !atEnd && canAdvance && <button type="button" className={btnMain} onClick={onNext} autoFocus>Next level ➜</button>}
        <button type="button" className={cleared && canAdvance ? btnSoft : btnMain} onClick={onRetry}>↺ {cleared ? 'Play again' : 'Try again'}</button>
      </div>
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div className="rounded-2xl bg-violet-50 p-2.5 ring-1 ring-violet-100">
    <p className="text-xl font-black text-violet-900 tabular-nums">{value}</p>
    <p className="text-[10px] font-black tracking-wider text-violet-500 uppercase">{label}</p>
  </div>
);

const SKILL_NAMES = { vocabulary: 'Vocabulary', grammar: 'Grammar', fluency: 'Fluency', pronunciation: 'Pronunciation*', creativity: 'Creativity' };
/** The student's WORDCRAFT record, from the server: totals, accuracy, best, skills and their change, history. */
function StatsPanel({ stats }) {
  const skills = Object.entries(stats.skills || {}).filter(([, s]) => s.score !== null);
  return (
    <div className="wc-in rounded-3xl bg-white p-4 shadow-[0_18px_40px_-26px_rgba(76,29,149,0.55)] ring-1 ring-violet-100 sm:p-5">
      <p className="text-xs font-black tracking-[0.18em] text-violet-600 uppercase">📊 My WORDCRAFT</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <Stat label="Total points" value={stats.totalPoints} />
        <Stat label="Levels done" value={stats.levelsCompleted} />
        <Stat label="Accuracy" value={stats.accuracy !== null ? `${stats.accuracy}%` : '—'} />
        <Stat label="Best level" value={stats.bestLevelScore ?? '—'} />
      </div>
      {skills.length > 0 && (
        <div className="mt-4 grid gap-2">
          <p className="text-[11px] font-black tracking-wider text-slate-500 uppercase">Skills (last 20 challenges){stats.improvement !== null ? ` · recent levels ${stats.improvement >= 0 ? '▲' : '▼'} ${Math.abs(stats.improvement)}` : ''}</p>
          {skills.map(([k, s]) => (
            <div key={k} className="flex items-center gap-2">
              <div className="min-w-0 flex-1"><Bar label={SKILL_NAMES[k] || k} value={s.score} /></div>
              <span className={`w-10 text-right text-[11px] font-black ${s.change > 0 ? 'text-emerald-600' : s.change < 0 ? 'text-rose-500' : 'text-slate-300'}`}>{s.change === null ? '' : `${s.change > 0 ? '▲' : s.change < 0 ? '▼' : '='}${s.change ? Math.abs(s.change) : ''}`}</span>
            </div>
          ))}
          <p className="text-[10px] font-bold text-slate-400">* From the tongue twisters: how many words the speech recogniser heard correctly — not an accent grade.</p>
        </div>
      )}
      {stats.history?.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-black tracking-wider text-slate-500 uppercase">Recent levels</p>
          <ul className="mt-1.5 grid gap-1.5">
            {stats.history.map((h, i) => (
              <li key={i} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-100">
                <span className="w-16 shrink-0 font-black text-slate-800">Level {h.level}</span>
                <span className="flex-1 truncate text-xs font-bold text-slate-500">{(h.kinds || []).map((k) => CHALLENGES[k]?.icon).join(' ')} · {(h.scores || []).join(' / ')}</span>
                <span className="text-xs">{h.cleared ? '⭐'.repeat(h.stars || 0) : '✕'}</span>
                <span className="w-10 text-right font-black text-violet-800 tabular-nums">{h.total}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
