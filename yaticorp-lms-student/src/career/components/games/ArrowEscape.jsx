import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { DIRS, arrowConfig, blocker, dailySeed, makeArrowBoard, pathOut } from '../../data/bands/arrowEscape';

/**
 * ➡️ Arrow Escape (2026-11-19, Master Minds · Logic — plays like the arrow-clearing puzzle the user chose; our own
 * name and design). Long, thin, bending arrows on a warm paper board. Tap one: with a clear way out it slides out
 * head first, its body following its own path; blocked, it runs up to what is in its way in red and slides back,
 * and a life is lost (3). Hints, hold-to-see-the-way-out, perfect runs, a daily board, light and dark.
 */
export default function ArrowEscape({ onExit }) {
  const progress = useGameProgress('arrow-escape', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const HOLD_MS = 420;
const LEAVE_MS_PER_CELL = 28;
const EMPTY = { size: 1, rows: 1, cols: 1, arrows: [] }; // until the play area has been measured
const BUMP_MS = 620;

/** The arrow's track: its own squares (tail → head), then straight on past the edge. */
const track = (a, size) => {
  const [dr, dc] = DIRS[a.dir];
  const [hr, hc] = a.cells[a.cells.length - 1];
  const extra = Array.from({ length: size + a.cells.length + 2 }, (_, k) => [hr + dr * (k + 1), hc + dc * (k + 1)]);
  // A one-square arrow gets a short tail so it reads as an arrow, not just a head.
  const tail = a.cells.length === 1 ? [[hr - dr * 0.55, hc - dc * 0.55]] : [];
  return [...tail, ...a.cells, ...extra];
};
/** The points of a window `len` squares long, `off` squares along the track (fractional). */
const windowPoints = (tr, off, len) => {
  const at = (t) => { const i = Math.min(tr.length - 2, Math.max(0, Math.floor(t))); const f = t - i; return [tr[i][1] + (tr[i + 1][1] - tr[i][1]) * f + 0.5, tr[i][0] + (tr[i + 1][0] - tr[i][0]) * f + 0.5]; };
  const a = off; const b = off + len - 1;
  const pts = [at(a)];
  for (let i = Math.ceil(a + 1e-6); i < b; i += 1) pts.push([tr[i][1] + 0.5, tr[i][0] + 0.5]);
  pts.push(at(b));
  return pts;
};
const headPath = (dir, w) => ({ U: `M0 ${-w * 1.6} L${w} 0 L${-w} 0 Z`, D: `M0 ${w * 1.6} L${w} 0 L${-w} 0 Z`, L: `M${-w * 1.6} 0 L0 ${w} L0 ${-w} Z`, R: `M${w * 1.6} 0 L0 ${w} L0 ${-w} Z` }[dir]);

function Round({ progress, onExit }) {
  const cfg = arrowConfig(progress.difficulty, progress.levelNo);
  const daily = false; // the daily board's button was removed (2026-11-19)
  /* The board is cut to the space it has (2026-11-20, the user: fill the whole white area with small arrows): once the
     play area is on screen it is measured, and the grid gets that height ÷ width. */
  const wrap = useRef(null);
  const [board, setBoard] = useState(EMPTY);
  const ready = board !== EMPTY;
  const size = board.size;
  const [arrows, setArrows] = useState(board.arrows);
  const [anims, setAnims] = useState({}); // id → { kind: 'leave' | 'bump', start, dist }
  const [now, setNow] = useState(0);
  const [lives, setLives] = useState(cfg.hearts);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hinted, setHinted] = useState(null);
  const [guide, setGuide] = useState(null);
  const [started, setStarted] = useState(false);
  const hold = useRef(null); const held = useRef(false);
  useLayoutEffect(() => {
    if (!started || ready || !wrap.current) return;
    const r = wrap.current.getBoundingClientRect();
    const width = Math.max(200, r.width);
    const height = Math.max(200, window.innerHeight - r.top - 24);
    setBoard(daily ? makeArrowBoard(seeded(dailySeed()), arrowConfig(2, 12, height / width)) : makeArrowBoard(seeded(freshSeed()), arrowConfig(progress.difficulty, progress.levelNo, height / width)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, ready]);
  useEffect(() => { setArrows(board.arrows); setAnims({}); setLives(cfg.hearts); setMistakes(0); setHintsUsed(0); setHinted(null); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board]);

  // One animation clock while anything moves; finished slides leave the board.
  const animating = Object.keys(anims).length > 0;
  useEffect(() => {
    if (!animating) return undefined;
    let raf;
    const tick = () => {
      const t = performance.now();
      setNow(t);
      setAnims((cur) => {
        const done = Object.entries(cur).filter(([, a]) => t - a.start >= a.ms);
        if (!done.length) return cur;
        const gone = done.filter(([, a]) => a.kind === 'leave').map(([id]) => Number(id));
        if (gone.length) setArrows((list) => list.filter((x) => !gone.includes(x.id)));
        const next = { ...cur }; done.forEach(([id]) => delete next[id]); return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animating]);

  const left = arrows.filter((a) => anims[a.id]?.kind !== 'leave');
  const cleared = ready && arrows.length === 0;
  const failed = lives <= 0;
  const over = !daily && (cleared || failed) && !animating;
  const perfect = mistakes === 0 && hintsUsed === 0;
  const stars = !over || failed ? 0 : perfect ? 3 : mistakes <= 1 && hintsUsed <= 1 ? 2 : 1;
  useRecordStars(progress, over, stars, { correct: board.arrows.length - arrows.length, wrong: mistakes, hints: hintsUsed, score: board.arrows.length - arrows.length });

  const tap = (id) => {
    if (failed || anims[id]) return;
    const a = left.find((x) => x.id === id);
    if (!a) return;
    const block = blocker(a, left, size);
    const t = performance.now();
    if (!block) {
      sfx.whoosh?.();
      if (hinted === id) setHinted(null);
      setAnims((m) => ({ ...m, [id]: { kind: 'leave', start: t, ms: (size + a.cells.length) * LEAVE_MS_PER_CELL + 120 } }));
    } else {
      sfx.wrong?.();
      setMistakes((n) => n + 1);
      if (!daily) setLives((h) => h - 1);
      setAnims((m) => ({ ...m, [id]: { kind: 'bump', start: t, ms: BUMP_MS, dist: block.free + 0.32, cell: block.cell } }));
    }
  };
  const down = (id) => { held.current = false; clearTimeout(hold.current); hold.current = setTimeout(() => { held.current = true; setGuide(id); }, HOLD_MS); };
  const up = (id) => { clearTimeout(hold.current); if (held.current) { held.current = false; setGuide(null); return; } tap(id); };
  const cancel = () => { clearTimeout(hold.current); held.current = false; setGuide(null); };

  const W = size <= 14 ? 0.09 : 0.08; // thin lines, in squares
  const HEAD_W = size <= 8 ? 0.17 : 0.16;
  const guideArrow = guide !== null ? left.find((a) => a.id === guide) : null;
  const guideBlock = guideArrow ? blocker(guideArrow, left, size) : null;
  const objective = 'Tap an arrow to slide it out — only if nothing is in its way. Clear the whole board. A blocked arrow runs up to what is in its way, slides back, and costs a life (3). Stuck? Press and hold an arrow to see its way out. No mistakes is a perfect run.';

  return (
    <GameShell
      title="Arrow Escape"
      blurb="Clear the board, one arrow at a time."
      tone="bg-gradient-to-br from-amber-700 to-stone-800"
      score={daily ? 'Daily' : `${board.arrows.length - arrows.length}/${board.arrows.length}`}
      scoreLabel={daily ? 'Board' : 'Cleared'}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: cleared, stars,
        headline: cleared ? (perfect ? `Perfect run! Level ${progress.level} cleared ✨` : `Level ${progress.level} cleared!`) : 'Out of lives — try the board again',
        detail: cleared ? `${board.arrows.length} arrows · ${mistakes} mistake${mistakes === 1 ? '' : 's'} · ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}` : `${board.arrows.length - arrows.length} of ${board.arrows.length} arrows cleared`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
    >
      {started && !over && (
        <>
          {/* Lives, small and above the board card (2026-11-20). Lives only (2026-11-19, the user: no level line, hint, theme or daily buttons) */}
        {!daily && (
          <div className="flex items-center justify-center gap-1.5 pb-1.5" aria-label={`${lives} lives left`}>
            {Array.from({ length: cfg.hearts }, (_, i) => (
              <svg key={i} viewBox="0 0 24 22" className={`h-5 w-5 transition duration-300 ${i < lives ? 'drop-shadow-[0_2px_3px_rgba(190,18,60,0.35)]' : 'scale-90 opacity-40 grayscale'}`} aria-hidden>
                <path d="M12 21 C5 15.5 1 12 1 7 C1 3.5 3.7 1 7 1 C9.2 1 11 2.2 12 4 C13 2.2 14.8 1 17 1 C20.3 1 23 3.5 23 7 C23 12 19 15.5 12 21 Z" fill={i < lives ? '#e11d48' : '#cbd5e1'} />
                {i < lives && <ellipse cx="7.5" cy="6" rx="2.6" ry="1.8" fill="#fff" opacity="0.45" />}
              </svg>
            ))}
          </div>
        )}

        {/* No card behind the board (2026-11-20, the user): black arrows straight on the page, the picture filling the width. */}
        <div ref={wrap} className="ae-wrap ae-plain mx-auto flex w-full max-w-lg select-none flex-col items-center justify-start px-1 max-sm:flex-1">
          {/* The board */}
          {ready && <div className="relative w-full">
            <svg viewBox={`-0.3 -0.3 ${board.cols + 0.6} ${board.rows + 0.6}`} className="block w-full touch-none overflow-visible" role="group" aria-label={`${left.length} arrows on the board`}>
              {guideArrow && pathOut(guideArrow, size).map(([r, c], i) => {
                const bad = guideBlock && i >= guideBlock.free;
                return <rect key={i} x={c + 0.2} y={r + 0.2} width="0.6" height="0.6" rx="0.3" className={bad ? 'ae-guide-bad' : 'ae-guide-ok'} />;
              })}
              {arrows.map((a) => {
                const an = anims[a.id];
                const tr = track(a, size);
                let off = 0;
                if (an?.kind === 'leave') off = ((now - an.start) / an.ms) * (size + a.cells.length + 1);
                if (an?.kind === 'bump') { const p = Math.min(1, (now - an.start) / an.ms); off = an.dist * (p < 0.45 ? p / 0.45 : 1 - (p - 0.45) / 0.55); }
                const pts = windowPoints(tr, Math.max(0, off), a.cells.length === 1 ? 2 : a.cells.length);
                const head = pts[pts.length - 1];
                const cls = an?.kind === 'bump' ? 'ae-red' : hinted === a.id ? 'ae-hint' : '';
                return (
                  <g key={a.id} className={`ae-arrow ${cls}`} onPointerDown={() => down(a.id)} onPointerUp={() => up(a.id)} onPointerLeave={cancel} onPointerCancel={cancel}>
                    <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="transparent" strokeWidth="0.85" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'stroke' }} />
                    <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" className="ae-line" strokeWidth={W} strokeLinecap="round" strokeLinejoin="round" />
                    <path d={headPath(a.dir, HEAD_W)} transform={`translate(${head[0]} ${head[1]})`} className="ae-head" />
                  </g>
                );
              })}
              {Object.values(anims).filter((x) => x.kind === 'bump' && x.cell).map((x, i) => <circle key={i} cx={x.cell[1] + 0.5} cy={x.cell[0] + 0.5} r="0.38" className="ae-block" />)}
            </svg>
          </div>}

        </div>
        </>
      )}
    </GameShell>
  );
}
