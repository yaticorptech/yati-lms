import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded, shuffle } from '../../data/seeded';
import { assocConfig, makeAssocBoard, judgeSet, assocStars } from '../../data/bands/dAssoc';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
/** Solved-group colours, easiest tier first. */
const GROUP_TONES = ['bg-amber-300 text-amber-950', 'bg-emerald-300 text-emerald-950', 'bg-sky-300 text-sky-950', 'bg-violet-300 text-violet-950'];

/** 🧩 Vocabulary: sort the words into hidden groups of four. */
export default function WordAssociationGrid({ onExit }) {
  const progress = useGameProgress('word-association-grid', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const [config] = useState(() => assocConfig(progress.ageBand, progress.difficulty, progress.levelNo));
  const [rng] = useState(() => seeded(freshSeed()));
  const [board] = useState(() => makeAssocBoard(rng, config));
  const [order, setOrder] = useState(() => board.words.map((w) => w.word));
  const [picked, setPicked] = useState([]);
  const [solved, setSolved] = useState([]);       // group ids, in the order found
  const [mistakes, setMistakes] = useState(0);
  const [tried, setTried] = useState([]);         // sorted guesses already made
  const [feedback, setFeedback] = useState(null); // { tone, text }
  const [shake, setShake] = useState(0);
  const [started, setStarted] = useState(false);

  const allFound = solved.length === board.groups.length;
  const lost = mistakes >= config.mistakes;
  const over = allFound || lost;
  const stars = over ? assocStars({ solved: allFound, mistakes }) : 0;
  useRecordStars(progress, over, stars, { correct: solved.length, wrong: mistakes, hints: 0, score: allFound ? 100 - mistakes * 10 : solved.length * 10 });

  const remaining = order.filter((w) => !solved.some((id) => board.groups.find((g) => g.id === id).words.includes(w)));
  const groupOf = (id) => board.groups.find((g) => g.id === id);
  const toneOf = (id) => GROUP_TONES[board.groups.findIndex((g) => g.id === id) % GROUP_TONES.length];

  const toggle = (w) => {
    if (!started || over) return;
    setFeedback(null);
    setPicked((p) => (p.includes(w) ? p.filter((x) => x !== w) : p.length < 4 ? [...p, w] : p));
  };

  const submit = () => {
    if (picked.length !== 4 || over) return;
    const key = [...picked].sort().join('|');
    if (tried.includes(key)) { setFeedback({ tone: 'info', text: 'You already tried that set.' }); return; }
    setTried((t) => [...t, key]);
    const res = judgeSet(board, picked, solved);
    if (res.result === 'right') {
      setSolved((s) => [...s, res.group.id]);
      setPicked([]);
      setFeedback({ tone: 'good', text: `Yes — ${res.group.label}!` });
      return;
    }
    sfx.wrong();
    setMistakes((m) => m + 1);
    setShake((s) => s + 1);
    setFeedback(res.result === 'one-away' ? { tone: 'near', text: 'One away! Three of those belong together.' } : { tone: 'bad', text: 'Not a group. Look for another link.' });
  };

  const objective = `${board.words.length} words hide ${board.groups.length} groups of four. Tap four that share a link and press Submit. "One away" means three of your four belong together. ${config.mistakes} mistakes end the level.`;

  const feedbackTone = { good: 'text-emerald-600', near: 'text-amber-600', bad: 'text-rose-600', info: 'text-sky-700' };

  return (
    <GameShell
      title="Word Association Grid"
      blurb="Four words, one hidden link."
      tone="bg-gradient-to-br from-amber-500 to-rose-600"
      score={`${solved.length}/${board.groups.length}`}
      scoreLabel="Groups"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: allFound, stars,
        headline: allFound ? (mistakes === 0 ? 'Perfect grid!' : `Level ${progress.level} cleared!`) : 'Out of guesses',
        detail: allFound ? `All ${board.groups.length} groups found with ${mistakes} mistake${mistakes === 1 ? '' : 's'}.` : `Groups: ${board.groups.map((g) => `${g.label} (${g.words.join(', ')})`).join(' · ')}`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Find the {board.groups.length} groups · {config.mistakes - mistakes} mistake{config.mistakes - mistakes === 1 ? '' : 's'} left</p>}
    >
      {started && (
        <div className="mx-auto w-full max-w-lg">
          <div className="grid gap-2">
            {solved.map((id) => {
              const g = groupOf(id);
              return (
                <div key={id} className={`gs-pop rounded-xl px-3 py-2.5 text-center ${toneOf(id)}`}>
                  <p className="text-sm font-black tracking-wide uppercase">{g.label}</p>
                  <p className="text-sm font-bold">{g.words.join(' · ')}</p>
                </div>
              );
            })}
          </div>

          <div key={shake} className={`mt-2 grid grid-cols-4 gap-1.5 sm:gap-2 ${shake ? 'gs-wrong' : ''}`}>
            {remaining.map((w) => {
              const on = picked.includes(w);
              return (
                <button key={w} type="button" onClick={() => toggle(w)} aria-pressed={on}
                  className={`fp-press flex min-h-14 items-center justify-center min-w-0 rounded-xl px-1 text-center text-xs leading-tight font-black break-words uppercase ring-1 ring-inset transition-colors sm:min-h-16 sm:text-sm ${
                    on ? 'bg-slate-800 text-white ring-slate-900' : 'bg-orange-50 text-ink-900 ring-orange-200 hover:bg-orange-100'
                  }`}
                  style={{ hyphens: 'auto' }}
                  lang="en">
                  {w}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-center gap-2" aria-label={`${config.mistakes - mistakes} mistakes left`}>
            <span className="text-xs font-bold text-ink-500">Mistakes left</span>
            {Array.from({ length: config.mistakes }, (_, i) => (
              <span key={i} className={`h-3 w-3 rounded-full ${i < config.mistakes - mistakes ? 'bg-slate-700' : 'bg-slate-200'}`} />
            ))}
          </div>

          <p className={`mt-2 min-h-5 text-center text-sm font-black ${feedback ? feedbackTone[feedback.tone] : 'text-ink-500'}`} role="status" aria-live="polite">
            {feedback?.text || (picked.length ? `${picked.length} of 4 picked` : 'Tap four words that belong together.')}
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setOrder((o) => shuffle(rng, o))} className="fp-press min-h-11 rounded-xl bg-slate-100 text-xs font-black text-slate-700 ring-1 ring-slate-200 sm:text-sm">Shuffle</button>
            <button type="button" onClick={() => setPicked([])} disabled={!picked.length} className="fp-press min-h-11 rounded-xl bg-slate-100 text-xs font-black text-slate-700 ring-1 ring-slate-200 disabled:opacity-40 sm:text-sm">Clear</button>
            <button type="button" onClick={submit} disabled={picked.length !== 4} className="fp-press min-h-11 rounded-xl bg-rose-600 text-xs font-black text-white disabled:opacity-40 sm:text-sm">Submit</button>
          </div>
        </div>
      )}
    </GameShell>
  );
}
