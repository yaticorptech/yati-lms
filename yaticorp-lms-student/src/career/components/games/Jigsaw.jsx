import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { jigsawConfig, makeJigsaw, piecePath } from '../../data/bands/jigsaw';

/**
 * 🧩 Jigsaw (2026-11-19, Master Minds · Logic — the user's design, replacing Water Sort). One picture a level, cut into
 * interlocking pieces. The picture shows, then hides; 2 peeks to see it again. Drag a piece onto the board (or tap it,
 * then tap where it goes). The right place snaps it in; a wrong place sends it back and is a mistake — 3 mistakes and
 * the puzzle is lost. The lives are counted but not shown (the user asked). data/bands/jigsaw.js.
 */
export default function Jigsaw({ onExit }) {
  const progress = useGameProgress('jigsaw', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const SEEN = 'yati:jigsaw-seen';
const readSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN) || '[]'); } catch { return []; } };
const freshSeed = () => Math.floor(Math.random() * 4294967296);
const B = 600; // the board, in SVG units
const BASE = (import.meta.env?.BASE_URL || '/').replace(/\/?$/, '/');

/** A piece drawn with its square at (0, 0): the picture clipped to its outline. */
function Piece({ id, glow = null, cut, n, s, src }) {
  const r = Math.floor(id / n); const c = id % n;
  const d = piecePath(cut, n, r, c, s);
  return (
    <g transform={`translate(${-c * s} ${-r * s})`}>
      <clipPath id={`jp-${id}`}><path d={d} /></clipPath>
      <image href={src} x="0" y="0" width={B} height={B} preserveAspectRatio="xMidYMid slice" clipPath={`url(#jp-${id})`} />
      <path d={d} fill="none" stroke={glow === 'bad' ? '#e11d48' : glow === 'pick' ? '#f59e0b' : 'rgba(255,255,255,0.9)'} strokeWidth={glow ? 5 : 2.2} />
      <path d={d} fill="none" stroke="rgba(30,27,75,0.25)" strokeWidth="0.8" />
    </g>
  );
}


function Round({ progress, onExit }) {
  const cfg = jigsawConfig(progress.difficulty, progress.levelNo);
  const [level] = useState(() => makeJigsaw(seeded(freshSeed()), cfg, readSeen()));
  const { n, cut } = level;
  const s = B / n;
  const src = `${BASE}${level.picture}`;
  const [placed, setPlaced] = useState(() => new Set());
  const [tray, setTray] = useState(level.order);
  const [selected, setSelected] = useState(null);
  const [drag, setDrag] = useState(null); // { id, x, y } in board units
  const [mistakes, setMistakes] = useState(0);
  const [peeks, setPeeks] = useState(cfg.peeks);
  const [showing, setShowing] = useState(true); // the picture, at the start
  const [started, setStarted] = useState(false);
  const [flash, setFlash] = useState(null); // { id, ok }
  const svg = useRef(null);
  const peekTimer = useRef(null);

  // The picture shows at the start, then hides.
  useEffect(() => {
    if (!started) return undefined;
    peekTimer.current = setTimeout(() => setShowing(false), cfg.showMs);
    return () => clearTimeout(peekTimer.current);
  }, [started, cfg.showMs]);
  const peek = () => {
    if (peeks <= 0 || showing) return;
    setPeeks((p) => p - 1); setShowing(true); sfx.tap?.();
    clearTimeout(peekTimer.current); peekTimer.current = setTimeout(() => setShowing(false), cfg.peekMs);
  };

  const total = n * n;
  const done = placed.size === total;
  const failed = mistakes >= cfg.lives;
  const [finish, setFinish] = useState(false);
  useEffect(() => { if (!done) return undefined; sfx.right?.(); const t = setTimeout(() => setFinish(true), 1600); return () => clearTimeout(t); }, [done]);
  useEffect(() => { if (!done) return; try { localStorage.setItem(SEEN, JSON.stringify([...readSeen(), level.picture].slice(-8))); } catch { /* storage off */ } }, [done, level.picture]);
  const over = (done && finish) || failed;
  const peeksUsed = cfg.peeks - peeks;
  const stars = !over || failed ? 0 : mistakes === 0 && peeksUsed === 0 ? 3 : mistakes + peeksUsed <= 2 ? 2 : 1;
  useRecordStars(progress, over, stars, { correct: placed.size, wrong: mistakes, hints: peeksUsed, score: placed.size });

  // Tray: the pieces left, in rows under the board (scaled down).
  const per = Math.min(n + 1, 6);
  const slotW = B / per;
  const scale = Math.min(0.9, (slotW * 0.86) / (s * 1.4));
  const trayRows = Math.ceil(tray.length / per);
  const trayTop = B + 34;
  const H = trayTop + Math.max(1, trayRows) * slotW + 10;
  const trayPos = (k) => [(k % per) * slotW + slotW / 2, trayTop + Math.floor(k / per) * slotW + slotW / 2];

  const toSvg = (e) => { const p = svg.current.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.current.getScreenCTM().inverse()); return [q.x, q.y]; };
  const place = (id, r, c) => {
    if (r < 0 || c < 0 || r >= n || c >= n) return;
    const slot = r * n + c;
    if (placed.has(slot)) return;
    if (slot === id) {
      sfx.tap?.();
      setPlaced((p) => new Set([...p, id])); setTray((t) => t.filter((x) => x !== id)); setSelected(null);
      setFlash({ id, ok: true }); setTimeout(() => setFlash(null), 450);
    } else {
      sfx.wrong?.();
      setMistakes((m) => m + 1); setSelected(null);
      setFlash({ id, ok: false, at: slot }); setTimeout(() => setFlash(null), 600);
    }
  };
  const down = (e, id) => { if (done || failed) return; e.stopPropagation(); try { svg.current.setPointerCapture?.(e.pointerId); } catch { /* not a live pointer */ } const [x, y] = toSvg(e); setDrag({ id, x, y, sx: x, sy: y, moved: false }); };
  const move = (e) => { if (!drag) return; const [x, y] = toSvg(e); setDrag((d) => ({ ...d, x, y, moved: d.moved || Math.hypot(x - d.sx, y - d.sy) > 8 })); };
  const up = () => {
    if (!drag) return;
    const d = drag; setDrag(null);
    if (!d.moved) { setSelected((cur) => (cur === d.id ? null : d.id)); return; }
    if (d.y < B) place(d.id, Math.floor(d.y / s), Math.floor(d.x / s));
  };
  const boardTap = (e) => {
    if (selected === null || drag) return;
    const [x, y] = toSvg(e);
    if (y < B) place(selected, Math.floor(y / s), Math.floor(x / s));
  };


  const objective = `Look at the picture — it hides after a few seconds. Then drag each piece onto its place on the board (or tap a piece, then tap its place). Corners and edges have flat sides. You can peek at the picture ${cfg.peeks} times. Too many pieces put in the wrong place and the puzzle is lost.`;

  return (
    <GameShell
      title="Jigsaw"
      blurb="Remember the picture, then rebuild it."
      tone="bg-gradient-to-br from-violet-500 to-fuchsia-600"
      score={`${placed.size}/${total}`}
      scoreLabel="Pieces"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: done, stars,
        headline: done ? (mistakes === 0 && peeksUsed === 0 ? `Perfect! Level ${progress.level} cleared ✨` : `Picture complete — level ${progress.level} cleared!`) : 'Too many pieces in the wrong place — try again',
        detail: `${n}×${n} pieces · ${mistakes} mistake${mistakes === 1 ? '' : 's'} · ${peeksUsed} peek${peeksUsed === 1 ? '' : 's'}`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
    >
      {started && !over && (
        <div className="mx-auto flex w-full max-w-md select-none flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-black text-violet-800">{showing && !done ? '👀 Remember the picture…' : done ? '🎉 Picture complete!' : `${total - placed.size} piece${total - placed.size === 1 ? '' : 's'} to place`}</p>
            <button type="button" onClick={peek} disabled={peeks <= 0 || showing} className="rounded-full bg-violet-600 px-3.5 py-1.5 text-xs font-black text-white shadow-[0_3px_0_#4c1d95] disabled:opacity-40">👁 See picture ({peeks})</button>
          </div>
          <div className="rounded-[1.5rem] bg-gradient-to-b from-violet-100 to-fuchsia-50 p-2 shadow-[0_14px_30px_-18px_rgba(109,40,217,0.6)] ring-1 ring-violet-200">
            <svg ref={svg} viewBox={`-6 -6 ${B + 12} ${H + 12}`} className="block w-full touch-none" onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="group" aria-label={`Jigsaw, ${placed.size} of ${total} pieces placed`}>
              {/* The board */}
              <rect x="0" y="0" width={B} height={B} rx="10" fill="#ffffff" stroke="#ddd6fe" strokeWidth="3" onClick={boardTap} />
              {Array.from({ length: total }, (_, id) => (
                <path key={`o${id}`} d={piecePath(cut, n, Math.floor(id / n), id % n, s)} fill={flash && !flash.ok && flash.at === id ? 'rgba(225,29,72,0.18)' : 'none'} stroke="#ede9fe" strokeWidth="2" pointerEvents="none" />
              ))}
              {[...placed].map((id) => (
                <g key={`p${id}`} transform={`translate(${(id % n) * s} ${Math.floor(id / n) * s})`} pointerEvents="none" className={flash?.id === id && flash.ok ? 'jg-snap' : ''}><Piece id={id} cut={cut} n={n} s={s} src={src} /></g>
              ))}
              {/* The whole picture, while it shows */}
              {(showing || done) && <image href={src} x="0" y="0" width={B} height={B} preserveAspectRatio="xMidYMid slice" className="jg-show" pointerEvents="none" />}
              {/* The tray */}
              {!done && <text x={B / 2} y={B + 24} textAnchor="middle" fontSize="16" fontWeight="900" fill="#6d28d9">{selected !== null ? 'Now tap its place on the board' : 'Drag a piece to its place'}</text>}
              {tray.map((id, k) => {
                if (drag?.id === id && drag.moved) return null;
                const [cx, cy] = trayPos(k);
                return (
                  <g key={`t${id}`} transform={`translate(${cx - (s * scale) / 2} ${cy - (s * scale) / 2}) scale(${scale})`} onPointerDown={(e) => down(e, id)} className={`cursor-grab ${flash?.id === id && !flash.ok ? 'jg-bad' : ''}`}>
                    <rect x={-s * 0.25} y={-s * 0.25} width={s * 1.5} height={s * 1.5} fill="transparent" />
                    <Piece id={id} cut={cut} n={n} s={s} src={src} glow={selected === id ? 'pick' : flash?.id === id && !flash.ok ? 'bad' : null} />
                  </g>
                );
              })}
              {drag?.moved && (
                <g transform={`translate(${drag.x - s / 2} ${drag.y - s / 2})`} pointerEvents="none" style={{ filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.35))' }}><Piece id={drag.id} cut={cut} n={n} s={s} src={src} /></g>
              )}
            </svg>
          </div>
        </div>
      )}
    </GameShell>
  );
}
