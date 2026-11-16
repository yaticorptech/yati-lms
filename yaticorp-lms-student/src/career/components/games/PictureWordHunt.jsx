import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { checkHuntPick, huntCells, huntConfig, lineCells, makeHuntLevel } from '../../data/bands/youngB';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const NEXT_MS = 1100;
const WORD_TONES = ['bg-amber-300', 'bg-sky-300', 'bg-lime-300', 'bg-pink-300', 'bg-violet-300'];
const key = (cell) => `${cell[0]},${cell[1]}`;

/** 🔤 Picture Word Hunt: find each pictured word in the letter grid — tap its first and last letter, or drag across it. */
export default function PictureWordHunt({ onExit }) {
  const progress = useGameProgress('picture-word-hunt', { bands: SECTION_BANDS.young });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = huntConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const young = config.band === 'foundation';
  const [puzzles] = useState(() => makeHuntLevel(seeded(freshSeed()), config));
  const total = puzzles.reduce((s, p) => s + p.words.length, 0);
  const [started, setStarted] = useState(false);
  const [game, setGame] = useState({ p: 0, found: [], foundAll: 0, wrong: 0, feedback: null });
  const [start, setStart] = useState(null);
  const [hover, setHover] = useState(null);
  const [flash, setFlash] = useState([]);
  const [dragFrom, setDragFrom] = useState(null);
  const drag = useRef(null);
  const timers = useRef({});

  const over = game.p >= puzzles.length;
  const puzzle = over ? null : puzzles[game.p];
  const score = Math.max(0, game.foundAll - Math.floor(game.wrong / 2));
  const pass = Math.ceil(total * 0.6);
  const stars = over ? starsForFixed(score, pass, total) : 0;
  useRecordStars(progress, over, stars, { correct: game.foundAll, wrong: game.wrong, hints: 0, score });

  useEffect(() => {
    const t = timers.current;
    return () => { clearTimeout(t.next); clearTimeout(t.flash); };
  }, []);

  const tryPick = (a, b) => {
    setStart(null);
    setHover(null);
    if (!puzzle || game.found.length === puzzle.words.length) return;
    const idx = checkHuntPick(puzzle, a, b);
    if (idx >= 0 && game.found.includes(idx)) {
      setGame((g) => ({ ...g, feedback: 'again' }));
      return;
    }
    if (idx >= 0) {
      sfx.right?.();
      const found = [...game.found, idx];
      const done = found.length === puzzle.words.length;
      setGame((g) => ({ ...g, found, foundAll: g.foundAll + 1, feedback: done ? 'grid-done' : { word: puzzle.words[idx].word } }));
      if (done) {
        timers.current.next = setTimeout(() => {
          setGame((g) => ({ ...g, p: g.p + 1, found: [], feedback: null }));
        }, NEXT_MS);
      }
      return;
    }
    sfx.wrong();
    setGame((g) => ({ ...g, wrong: g.wrong + 1, feedback: 'try' }));
    setFlash(lineCells(a, b) || [a, b]);
    clearTimeout(timers.current.flash);
    timers.current.flash = setTimeout(() => setFlash([]), 650);
  };

  const tapCell = (cell) => {
    if (!start) { setStart(cell); setGame((g) => ({ ...g, feedback: 'now-last' })); return; }
    if (key(start) === key(cell)) { setStart(null); setGame((g) => ({ ...g, feedback: null })); return; }
    tryPick(start, cell);
  };

  const cellAt = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const c = el && el.closest ? el.closest('[data-cell]') : null;
    if (!c) return null;
    const [r, col] = c.getAttribute('data-cell').split(',').map(Number);
    return [r, col];
  };

  const onDown = (e, cell) => {
    if (e.button !== undefined && e.button !== 0) return;
    drag.current = cell;
    setDragFrom(cell);
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const c = cellAt(e);
    if (c && key(c) !== key(drag.current)) setHover(c);
  };
  const onUp = (e) => {
    const from = drag.current;
    drag.current = null;
    setDragFrom(null);
    if (!from) return;
    const to = cellAt(e) || from;
    if (key(to) === key(from)) { setHover(null); tapCell(from); } else tryPick(from, to);
  };

  // Which word (index) owns each found cell, for colouring.
  const owner = {};
  if (puzzle) game.found.forEach((i) => huntCells(puzzle.words[i]).forEach((c) => { owner[key(c)] = i; }));
  const preview = new Set(start && hover ? (lineCells(start, hover) || []).map(key) : dragFrom && hover ? (lineCells(dragFrom, hover) || []).map(key) : []);
  const flashing = new Set(flash.map(key));

  const fb = game.feedback;
  const message = !fb
    ? young ? 'Find a picture word! Tap its first letter.' : 'Tap the first and last letter of a word, or drag across it.'
    : fb === 'now-last' ? 'Now tap the last letter of the word.'
      : fb === 'try' ? (young ? 'Not a word from the list. Try again! 💪' : 'That is not one of the words — look again.')
        : fb === 'again' ? 'You found that one already!'
          : fb === 'grid-done' ? 'All words found! 🎉'
              : `Yes! ${fb.word.toUpperCase()}! 🎉`;
  const happy = fb === 'grid-done' || (fb && fb.word);

  const dirsText = config.dirs.length === 1 ? 'Words go across (left to right).' : 'Words go across or down.';
  const objective = `${dirsText} Find all ${total} picture words in ${puzzles.length} grids: tap the first letter, then the last letter (or drag). Fewer wrong tries mean more stars.`;

  return (
    <GameShell
      title="Picture Word Hunt"
      blurb={young ? 'Find the hidden picture words!' : `Find ${total} hidden words.`}
      tone="bg-gradient-to-br from-amber-400 to-orange-600"
      score={`${game.foundAll}/${total}`}
      scoreLabel="Words"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: stars > 0, stars,
        headline: stars > 0 ? `Level ${progress.level} cleared!` : 'Nearly there',
        detail: `${game.foundAll} of ${total} words found · ${game.wrong} wrong ${game.wrong === 1 ? 'try' : 'tries'}`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Grid {Math.min(game.p + 1, puzzles.length)} of {puzzles.length} · keyboard: Tab to a letter, Enter to pick it</p>}
    >
      {started && puzzle && (
        <div className="mx-auto w-full max-w-md">
          <ul className="mb-3 flex flex-wrap justify-center gap-2" aria-label="Words to find">
            {puzzle.words.map((w, i) => {
              const done = game.found.includes(i);
              return (
                <li key={w.word} className={`flex min-h-14 items-center gap-2 rounded-2xl px-3 py-1.5 ring-2 ring-inset ${done ? `${WORD_TONES[i % WORD_TONES.length]} ring-transparent` : 'bg-white ring-amber-200'}`}>
                  <span className="text-3xl leading-none" aria-hidden="true">{w.emoji}</span>
                  <span className={`font-black tracking-widest text-ink-900 uppercase ${done ? 'line-through' : ''}`} aria-label={done ? `${w.word}, found` : young ? w.word : `${w.len} letters starting with ${w.word[0]}`}>
                    {done || young ? w.word : `${w.word[0]}${' _'.repeat(w.len - 1)}`}
                  </span>
                  {done && <span aria-hidden="true">✅</span>}
                </li>
              );
            })}
          </ul>

          <div
            className="mx-auto grid touch-none gap-1.5 select-none"
            style={{ gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`, maxWidth: `${puzzle.size * 4.25}rem` }}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={() => { drag.current = null; setDragFrom(null); setHover(null); }}
            role="grid"
            aria-label="Letter grid"
          >
            {puzzle.grid.map((row, r) => row.map((ch, c) => {
              const k = `${r},${c}`;
              const own = owner[k];
              const isStart = start && key(start) === k;
              const cls = flashing.has(k)
                ? 'gs-wrong bg-rose-200 ring-rose-400'
                : own !== undefined
                  ? `${WORD_TONES[own % WORD_TONES.length]} ring-transparent`
                  : isStart
                    ? 'bg-indigo-500 text-white ring-indigo-700'
                    : preview.has(k)
                      ? 'bg-indigo-100 ring-indigo-300'
                      : 'bg-white ring-amber-200 hover:bg-amber-50';
              return (
                <button
                  key={k}
                  type="button"
                  data-cell={k}
                  onPointerDown={(e) => onDown(e, [r, c])}
                  onClick={(e) => { if (e.detail === 0) tapCell([r, c]); }}
                  aria-label={`Row ${r + 1}, column ${c + 1}: ${ch}${isStart ? ', picked' : ''}`}
                  className={`flex aspect-square min-h-11 items-center justify-center rounded-xl text-2xl font-black uppercase ring-2 ring-inset transition-colors focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 sm:text-3xl ${cls}`}
                >
                  {ch}
                </button>
              );
            }))}
          </div>

          <p className={`mt-3 min-h-6 text-center text-base font-black ${happy ? 'text-emerald-600' : fb === 'try' ? 'text-rose-600' : 'text-ink-900'}`} role="status" aria-live="polite">{message}</p>
        </div>
      )}
    </GameShell>
  );
}
