import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import useTimedRound from './useTimedRound';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { lineCells, makeSearchPuzzle, matchLine, searchConfig } from '../../data/bands/mindful';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const HUES = [330, 200, 40, 150, 270, 15, 180, 95];

/**
 * 🔎 Word Search (2026-11-17, Master Minds · Vocabulary). Themed words from every field — science, business, arts,
 * sport, law, health… — hidden in a letter grid. Drag across a word, or tap its first and last letter.
 */
export default function WordSearch({ onExit }) {
  const progress = useGameProgress('word-search', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = searchConfig(progress.difficulty, progress.levelNo);
  const [p] = useState(() => makeSearchPuzzle(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [found, setFound] = useState([]); // words, in the order found
  const [anchor, setAnchor] = useState(null);
  const [hover, setHover] = useState(null);
  const [miss, setMiss] = useState(false);
  const dragging = useRef(false);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const total = p.words.length;
  const pass = Math.ceil(total * 0.6);
  const allFound = found.length >= total;
  const { seconds, over: timeUp } = useTimedRound(total * config.secondsPerWord, started, allFound);
  const over = started && (allFound || timeUp);
  const stars = over ? starsForFixed(found.length, pass, total) : 0;
  useRecordStars(progress, over, stars, { correct: found.length, wrong: total - found.length, hints: 0, score: found.length });

  const finish = (a, b) => {
    const w = matchLine(p, lineCells(a, b, p.size), found);
    if (w) { sfx.right?.(); setFound((f) => [...f, w.word]); }
    else if (a !== b) { setMiss(true); timers.current.push(setTimeout(() => setMiss(false), 400)); }
    setAnchor(null);
    setHover(null);
  };
  const cellAt = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-cell]');
    return el ? Number(el.dataset.cell) : null;
  };
  const down = (e) => {
    if (over) return;
    const c = cellAt(e);
    if (c === null) return;
    if (anchor !== null && anchor !== c) { finish(anchor, c); return; } // second tap
    dragging.current = true;
    setAnchor(c);
    setHover(c);
  };
  const moveTo = (e) => { if (dragging.current) { const c = cellAt(e); if (c !== null) setHover(c); } };
  const up = (e) => {
    if (!dragging.current) return;
    dragging.current = false;
    const c = cellAt(e);
    if (c !== null && c !== anchor) finish(anchor, c); // a drag; a plain tap keeps the anchor for a second tap
  };

  const colourOf = new Map();
  found.forEach((word, k) => p.words.find((w) => w.word === word).cells.forEach((c) => colourOf.set(c, HUES[k % HUES.length])));
  const live = anchor !== null && hover !== null ? lineCells(anchor, hover, p.size) || [anchor] : [];
  const objective = `Theme: ${p.emoji} ${p.theme}. ${total} words are hidden in the grid${config.diagonal ? ' — across, down and slanting' : ' — across and down'}${config.backwards ? ', even backwards' : ''}. Drag across a word, or tap its first letter and then its last. Find at least ${pass} to clear the level.`;

  return (
    <GameShell
      title="Word Search"
      blurb="Find the hidden words."
      tone="bg-gradient-to-br from-fuchsia-400 to-purple-600"
      score={`${found.length}/${total}`}
      scoreLabel="Found"
      seconds={started ? seconds : undefined}
      totalSeconds={total * config.secondsPerWord}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: found.length >= pass, stars,
        headline: found.length >= pass ? `Level ${progress.level} cleared — sharp eyes!` : 'Some words stayed hidden — try again',
        detail: `${found.length} of ${total} ${p.theme.toLowerCase()} words found`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
    >
      {started && !over && (
        <div className="mx-auto grid w-full max-w-3xl items-start gap-4 select-none md:grid-cols-[1fr_12rem]">
          <div className={`touch-none vx-card p-2.5 ${miss ? 'gs-wrong' : ''}`}
            onPointerDown={down} onPointerMove={moveTo} onPointerUp={up}>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${p.size}, 1fr)` }}>
              {p.grid.map((ch, i) => {
                const hue = colourOf.get(i);
                const on = live.includes(i);
                return (
                  <span key={i} data-cell={i}
                    className={`flex aspect-square items-center justify-center rounded-lg text-sm font-black transition-colors duration-150 sm:text-lg ${on ? 'bg-violet-500 text-white' : hue !== undefined ? 'text-white' : 'bg-white text-violet-950 shadow-sm'}`}
                    style={!on && hue !== undefined ? { background: `hsl(${hue} 75% 60%)` } : undefined}>
                    {ch}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="rounded-[1.5rem] bg-white p-3 shadow-[0_14px_30px_-18px_rgba(109,40,217,0.6)] ring-2 ring-violet-200">
            <p className="mb-2 text-center text-sm font-black text-fuchsia-800">{p.emoji} {p.theme}</p>
            <ul className="flex flex-wrap justify-center gap-1.5 md:flex-col">
              {p.words.map((w) => {
                const k = found.indexOf(w.word);
                return (
                  <li key={w.word} className={`rounded-full px-3 py-1 text-center text-xs font-black tracking-wide transition ${k >= 0 ? 'text-white line-through' : 'bg-fuchsia-50 text-fuchsia-900'}`}
                    style={k >= 0 ? { background: `hsl(${HUES[k % HUES.length]} 75% 55%)` } : undefined}>
                    {w.word}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </GameShell>
  );
}
