import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { checkAnswer, vaultStages } from '../../data/bands/vault/vault';
import FinalVaultTable from '../../../competitions/games/vault/FinalVaultTable';

/**
 * 🏛️ The Final Vault, solo (2026-11-19, the user: "add Final Vault from the group games to Master Minds · Logic —
 * everything proper"). The group game's own temple, chambers, sounds and pictures (competitions/games/vault/
 * FinalVaultTable.jsx), driven here by a local engine instead of the server: five chambers made by the same generator
 * (data/bands/vault/, copied from the server's banks), Master Minds' escape room — 7 minutes, 30 seconds a mistake.
 * Levels go easy → medium → hard with the difficulty; stars for opening the vault, more for fewer mistakes.
 */
const ZONE = 'master';
const SECONDS = 420;
const PENALTY = 30;
const JAM_MS = 2500;
const READY_MS = 3000;
const SHOW_END_MS = 4500; // how long the vault-opened / time-up picture stays before the result
const LEVEL = { 1: 'easy', 2: 'medium', 3: 'hard' };
const freshSeed = () => Math.floor(Math.random() * 4294967296);

export default function FinalVault({ onExit }) {
  const progress = useGameProgress('final-vault', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const [stages] = useState(() => vaultStages(seeded(freshSeed()), LEVEL[progress.difficulty] || 'medium', ZONE));
  const [started, setStarted] = useState(false);
  const [t0, setT0] = useState(0); // when the countdown began
  const [me, setMe] = useState({ stage: 0, mistakes: 0, penaltyMs: 0, jamUntil: 0, done: false, failed: false, doneMs: null });
  const [now, setNow] = useState(0);
  const [finished, setFinished] = useState(false); // the result screen is up
  const endTimer = useRef(null);
  useEffect(() => () => clearTimeout(endTimer.current), []);

  const playStart = t0 + READY_MS;
  const playEnd = playStart + SECONDS * 1000;
  const phase = !started ? 'ready' : now < playStart ? 'ready' : 'play';
  const timeUp = started && now >= playEnd;
  const over = me.done || timeUp;

  // A clock for the phase changes (the table keeps its own countdown display).
  useEffect(() => {
    if (!started || over) return undefined;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [started, over]);

  // Once it is over: let the vault-opened (or time-up) picture show, then the result.
  useEffect(() => {
    if (!over || finished) return;
    endTimer.current = setTimeout(() => setFinished(true), SHOW_END_MS);
  }, [over, finished]);

  const begin = () => { const n = Date.now(); setT0(n); setNow(n); setStarted(true); };

  const onAction = useCallback(async (action) => {
    if (action.type !== 'solve' || over || action.stage !== me.stage) return;
    const n = Date.now();
    if (n < me.jamUntil) throw new Error('The mechanism is still resetting — try again in a moment.');
    const st = stages[me.stage];
    if (checkAnswer(st, action.value)) {
      const stage = me.stage + 1;
      const done = stage >= stages.length;
      setMe((m) => ({ ...m, stage, done, doneMs: done ? n - playStart : null }));
    } else {
      setMe((m) => ({ ...m, mistakes: m.mistakes + 1, penaltyMs: m.penaltyMs + PENALTY * 1000, jamUntil: n + JAM_MS }));
    }
  }, [over, me, stages, playStart]);

  const timeMs = me.done ? me.doneMs + me.penaltyMs : null;
  const stars = !me.done ? 0 : me.mistakes === 0 && timeMs <= SECONDS * 1000 * 0.6 ? 3 : me.mistakes <= 2 ? 2 : 1;
  useRecordStars(progress, finished, stars, { correct: me.stage, wrong: me.mistakes, hints: 0, score: me.stage, limitMs: SECONDS * 1000 });

  // The view the table expects from the server, made here.
  const view = useMemo(() => {
    const status = over ? 'over' : 'active';
    const cur = !over && me.stage < stages.length ? stages[me.stage] : null;
    const score = me.done ? 2000 + 2 * Math.max(0, Math.round((SECONDS * 1000 - timeMs) / 1000)) : Math.max(0, me.stage * 200 - me.mistakes * 10);
    return {
      status, phase,
      phaseStartedAt: phase === 'ready' ? t0 : playStart,
      phaseEndsAt: phase === 'ready' ? playStart : playEnd,
      serverNow: now || t0,
      canPlay: phase === 'play' && !over,
      total: stages.length, penalty: PENALTY, jamMs: JAM_MS,
      titles: stages.map((x) => x.title),
      me,
      current: cur && { index: me.stage, title: cur.title, kind: cur.kind, ...cur.pub },
      clues: stages.slice(0, me.stage).map((x) => x.clue).filter(Boolean),
      times: [timeMs],
      seats: [{ name: 'You', side: 0, color: '#f4c55a' }],
      players: [{ at: me.stage, done: me.done, left: false }],
      scores: [score],
      you: 0,
      outcome: me.done ? { places: [[0]] } : null,
      review: over ? stages.map((x) => ({ title: x.title, solution: x.solution })) : null
    };
    // now drives the phase; the table runs its own clock between renders
  }, [over, me, stages, phase, t0, playStart, playEnd, timeMs, now]);

  const objective = `Five temple chambers, five puzzles: an ancient lock, a hidden mechanism, a secret code, a path of light and the final trial. Solve them in order to open the treasure vault within ${SECONDS / 60} minutes. A wrong answer adds ${PENALTY} seconds. Open the vault to clear the level — fewer mistakes earn more stars.`;

  return (
    <GameShell
      dark
      title="The Final Vault"
      blurb="Solve five chambers and open the vault."
      tone="bg-gradient-to-br from-amber-500 to-yellow-800"
      score={`${me.stage}/${stages.length}`}
      scoreLabel="Chambers"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, seconds: SECONDS, stars: starsOn(progress.gameId, progress.level), onStart: begin } : null}
      result={finished ? {
        passed: me.done, stars,
        headline: me.done ? `The vault is open — level ${progress.level} cleared!` : 'Time is up — the vault stayed shut',
        detail: me.done ? `All 5 chambers in ${Math.floor(timeMs / 60000)}:${String(Math.round((timeMs % 60000) / 1000)).padStart(2, '0')}${me.mistakes ? ` · ${me.mistakes} mistake${me.mistakes > 1 ? 's' : ''} (+${me.mistakes * PENALTY}s)` : ' · no mistakes'}` : `${me.stage} of 5 chambers solved`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
    >
      {started && !finished && (
        <div className="w-full text-left">
          <FinalVaultTable view={view} onAction={onAction} busy={false} solo />
        </div>
      )}
    </GameShell>
  );
}
