import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import GameShell from './GameShell';
import useGameProgress, { starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { PieceIcon, PromotionPicker } from '../../../competitions/games/ChessTable';
import { chessConfig, computerMove } from '../../data/bands/chessBot';

const FILES = 'abcdefgh';
// The group chess table's board (competitions/games/ChessTable.jsx): the same wood, gold frame and pieces.
const LIGHT_BG = 'linear-gradient(135deg,#f3dfb8 0%,#e7cb9a 55%,#f0d8ac 100%)';
const DARK_BG = 'linear-gradient(135deg,#8a5530 0%,#6e3f1f 55%,#83502b 100%)';
const GOLD = '#d9a441';
const THINK_MS = 450;
const CLOCK_MS = 30 * 60 * 1000; // 30 minutes each (2026-11-16, the user: time-based, at least 30 minutes)
const clock = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const COLOUR = { w: 'White', b: 'Black' };

/**
 * ♟️ Chess (2026-11-16, Rising Brains · Logic & Deduction; id "chess-challenge"). Choose White or Black at the start;
 * the computer plays the other side and searches further ahead as the levels climb (data/bands/chessBot.js; rules by
 * chess.js, as in online chess). The board is the group chess table's, as big as the screen allows.
 * Win: 3 stars; a draw: 1 star; a loss: try again.
 */
export default function ChessChallenge({ onExit }) {
  const progress = useGameProgress('chess-challenge', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = chessConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  // The live game (chess.js, mutable): made once, then moves change it and `fen` re-renders the board.
  const [game] = useState(() => new Chess());
  const [fen, setFen] = useState(() => game.fen());
  const [started, setStarted] = useState(false);
  const [me, setMe] = useState(null); // 'w' | 'b', chosen before the first move
  const [picked, setPicked] = useState(null);
  const [promoteTo, setPromoteTo] = useState(null);
  const [log, setLog] = useState([]); // verbose moves, in order
  const [thinking, setThinking] = useState(false);
  const [outcome, setOutcome] = useState(null); // 'win' | 'loss' | 'draw'
  const [timeUp, setTimeUp] = useState(false);
  const [clocks, setClocks] = useState({ w: CLOCK_MS, b: CLOCK_MS });
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // The chess clock: only the side to move loses time; at 0:00 that side loses.
  const turnNow = useMemo(() => new Chess(fen).turn(), [fen]);
  useEffect(() => {
    if (!started || !me || outcome) return undefined;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const spent = now - last;
      last = now;
      setClocks((c) => {
        const left = c[turnNow] - spent;
        if (left <= 0) {
          setTimeUp(true);
          setOutcome(turnNow === me ? 'loss' : 'win');
          timers.current.forEach(clearTimeout);
          setThinking(false);
        }
        return { ...c, [turnNow]: Math.max(0, left) };
      });
    }, 250);
    return () => clearInterval(id);
  }, [started, me, outcome, turnNow]);

  const g = useMemo(() => new Chess(fen), [fen]);
  const board = g.board();
  const cpu = me === 'w' ? 'b' : 'w';
  const over = outcome !== null;
  const stars = outcome === 'win' ? 3 : outcome === 'draw' ? 1 : 0;
  useRecordStars(progress, over, stars, { correct: outcome === 'win' ? 1 : 0, wrong: outcome === 'loss' ? 1 : 0, hints: 0, score: stars });

  const targets = picked ? g.moves({ square: picked, verbose: true }).map((m) => m.to) : [];
  const kingInCheck = g.inCheck() ? board.flat().find((sq) => sq && sq.type === 'k' && sq.color === g.turn())?.square : null;
  const last = log[log.length - 1];

  const finishIfOver = (mine) => {
    if (!game.isGameOver()) return false;
    if (game.isCheckmate()) {
      const youWon = game.turn() !== mine; // the side to move is the one checkmated
      setOutcome(youWon ? 'win' : 'loss');
      if (youWon) sfx.right?.(); else sfx.wrong?.();
    } else setOutcome('draw');
    return true;
  };

  const cpuTurn = (mine) => {
    setThinking(true);
    timers.current.push(setTimeout(() => {
      const m = computerMove(game.fen(), config);
      if (m && !game.isGameOver()) {
        const done = game.move(m);
        setLog((l) => [...l, done]);
        setFen(game.fen());
        finishIfOver(mine);
      }
      setThinking(false);
    }, THINK_MS));
  };

  const choose = (colour) => {
    setMe(colour);
    if (colour === 'b') cpuTurn('b'); // White moves first: the computer opens
  };

  const play = (from, to, promotion) => {
    const mv = game.move({ from, to, promotion });
    setPicked(null);
    setPromoteTo(null);
    setLog((l) => [...l, mv]);
    setFen(game.fen());
    if (!finishIfOver(me)) cpuTurn(me);
  };

  const tap = (square) => {
    if (!started || !me || over || thinking || promoteTo || g.turn() !== me) return;
    const piece = g.get(square);
    if (picked && targets.includes(square)) {
      const promotes = g.moves({ square: picked, verbose: true }).some((m) => m.to === square && m.promotion);
      if (promotes) setPromoteTo(square); else play(picked, square);
      return;
    }
    setPicked(piece && piece.color === me ? (picked === square ? null : square) : null);
  };

  const captured = (color) => {
    const start = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const now = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    board.flat().forEach((sq) => { if (sq && sq.color === color && sq.type !== 'k') now[sq.type] += 1; });
    return Object.entries(start).flatMap(([t, n]) => Array(Math.max(0, n - now[t])).fill(t));
  };

  // From the player's side: Black sees the board turned round.
  const order = [0, 1, 2, 3, 4, 5, 6, 7];
  const rows = me === 'b' ? [...order].reverse() : order;
  const cols = me === 'b' ? [...order].reverse() : order;

  const objective = 'Play chess against the computer. First choose your colour — White moves first. Each side has a 30-minute clock that runs only on its own turn. Tap a piece, then one of its marked squares. Checkmate the other king — or let its clock run out — to win! The computer thinks further ahead each level.';

  return (
    <GameShell
      title="Chess"
      blurb="Out-think the computer — checkmate its king!"
      tone="bg-gradient-to-br from-amber-600 to-stone-800"
      score={over ? (outcome === 'win' ? 'Won' : outcome === 'draw' ? 'Draw' : 'Lost') : `Move ${g.moveNumber()}`}
      scoreLabel="Game"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: outcome === 'win', stars,
        headline: outcome === 'win' ? (timeUp ? `Level ${progress.level} cleared — the computer ran out of time!` : `Level ${progress.level} cleared — checkmate!`) : outcome === 'draw' ? 'A draw — so close!' : 'The computer won this one',
        detail: outcome === 'win' ? `Won in ${g.moveNumber()} moves as ${COLOUR[me]}` : 'Every game makes you stronger — play again!',
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-sm">30 minutes each · the computer looks {config.depth} move{config.depth > 1 ? 's' : ''} ahead</p>}
    >
      {started && !me && (
        <div className="mx-auto max-w-md rounded-[1.75rem] border-2 p-6 text-center" style={{ borderColor: GOLD, background: 'linear-gradient(180deg,#24160f,#120b09)', boxShadow: '0 0 26px rgba(217,164,65,.4)' }}>
          <p className="text-xs font-black tracking-[0.18em] uppercase" style={{ color: GOLD }}>Choose your side</p>
          <p className="mt-1 text-lg font-black text-[#f6e7bd]">Which colour will you play?</p>
          <p className="mt-1 text-sm text-[#e8d6b0]">The computer takes the other one. White moves first.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[['w', 'White', 'Moves first'], ['b', 'Black', 'Computer opens']].map(([c, name, sub]) => (
              <button key={c} type="button" onClick={() => choose(c)}
                className="fp-press flex flex-col items-center gap-1 rounded-2xl p-4 transition hover:-translate-y-0.5"
                style={{ background: c === 'w' ? LIGHT_BG : DARK_BG, boxShadow: `0 0 0 2px ${GOLD}` }}>
                <span className="h-14 w-14"><PieceIcon type="k" color={c} /></span>
                <span className={`text-base font-black ${c === 'w' ? 'text-amber-950' : 'text-[#f6e7bd]'}`}>{name}</span>
                <span className={`text-xs font-bold ${c === 'w' ? 'text-amber-900/70' : 'text-[#e8d6b0]/80'}`}>{sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {started && me && (
        <div className="mx-auto w-full select-none" style={{ maxWidth: 'min(540px, max(320px, calc(100vh - 17rem)))' }}>
          <div className="w-full">
            <SideBar name="Computer" icon="🤖" colour={cpu} ms={clocks[cpu]} active={!over && g.turn() === cpu} captured={captured(me)} capturedColor={me} note={!over && g.turn() === cpu ? 'thinking…' : ''} />

            <div className="my-2 rounded-2xl border-2 p-2 pb-1 pl-1 sm:p-3 sm:pb-1.5 sm:pl-1.5" style={{ borderColor: GOLD, background: 'linear-gradient(180deg,#24160f,#120b09)', boxShadow: '0 0 26px rgba(217,164,65,.4), inset 0 0 18px rgba(0,0,0,.6)' }}>
              <div className="grid grid-cols-[1.25rem_1fr] gap-1 sm:grid-cols-[1.75rem_1fr]">
                <div className="grid grid-rows-8 text-center text-xs font-bold text-[#e8d6b0] sm:text-sm">
                  {rows.map((r) => <span key={r} className="flex items-center justify-center">{8 - r}</span>)}
                </div>
                <div className="relative aspect-square w-full overflow-hidden rounded-md shadow-[0_6px_18px_rgba(0,0,0,.6)]">
                  <div role="grid" aria-label="Chess board" className="grid h-full w-full grid-cols-8 grid-rows-8">
                    {rows.map((r) => cols.map((c) => {
                      const sq = board[r][c];
                      const name = `${FILES[c]}${8 - r}`;
                      const light = (r + c) % 2 === 0;
                      const isTarget = targets.includes(name);
                      return (
                        <button key={name} type="button" role="gridcell" onClick={() => tap(name)}
                          aria-label={`${name}${sq ? `, ${COLOUR[sq.color].toLowerCase()} ${NAMES[sq.type]}` : ''}${isTarget ? ', move here' : ''}`}
                          className="relative min-h-0 min-w-0" style={{ background: light ? LIGHT_BG : DARK_BG, WebkitTapHighlightColor: 'transparent' }}>
                          {last && (last.from === name || last.to === name) && <span aria-hidden className="absolute inset-0" style={{ background: 'rgba(250, 204, 21, 0.42)' }} />}
                          {picked === name && <span aria-hidden className="absolute inset-0" style={{ background: 'rgba(250, 204, 21, 0.75)' }} />}
                          {kingInCheck === name && <span aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.95) 0%, rgba(239,68,68,0.6) 38%, rgba(239,68,68,0) 72%)' }} />}
                          {sq && <span className="pointer-events-none absolute inset-[7%]"><PieceIcon type={sq.type} color={sq.color} /></span>}
                          {isTarget && !sq && <span aria-hidden className="pointer-events-none absolute top-[35%] left-[35%] h-[30%] w-[30%] rounded-full" style={{ background: 'rgba(15, 23, 42, 0.3)' }} />}
                          {isTarget && sq && <span aria-hidden className="pointer-events-none absolute inset-[3%] rounded-full" style={{ border: '0.3em solid rgba(15, 23, 42, 0.32)' }} />}
                        </button>
                      );
                    }))}
                  </div>
                  {promoteTo && <PromotionPicker color={me} onPick={(type) => play(picked, promoteTo, type)} onCancel={() => setPromoteTo(null)} />}
                </div>
                <span />
                <div className="grid grid-cols-8 py-1 text-center text-xs font-bold text-[#e8d6b0] sm:text-sm">
                  {cols.map((c) => <span key={c}>{FILES[c]}</span>)}
                </div>
              </div>
            </div>

            <SideBar name="You" icon="🧑" colour={me} ms={clocks[me]} active={!over && g.turn() === me} captured={captured(cpu)} capturedColor={cpu} note={over ? (timeUp ? (outcome === 'win' ? 'The computer ran out of time — you win! 🏆' : 'Your time ran out.') : outcome === 'win' ? 'Checkmate — you win! 🏆' : outcome === 'loss' ? 'Checkmate — the computer wins.' : 'A draw!') : g.turn() === me ? `your move${g.inCheck() ? ' · check!' : ''}` : ''} />
          </div>

        </div>
      )}
    </GameShell>
  );
}

/** A player bar in the group chess table's style: dark wood, a gold edge, the side's colour and captured pieces. */
function SideBar({ name, icon, colour, ms, active, captured, capturedColor, note }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-3 py-2"
      style={{ background: 'linear-gradient(180deg,#2a1f0e,#120d05)', boxShadow: active ? `0 0 0 2px ${GOLD}, 0 0 18px rgba(217,164,65,.45)` : 'inset 0 0 0 1px rgba(217,164,65,.35)' }}>
      <span className="grid h-9 w-9 place-items-center rounded-full text-xl" style={{ background: 'rgba(217,164,65,.18)', boxShadow: `inset 0 0 0 1px ${GOLD}` }} aria-hidden>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-[#f6e7bd]">{name} <span className="text-xs font-bold" style={{ color: GOLD }}>· {COLOUR[colour]}</span></p>
        {note && <p className="truncate text-xs font-semibold text-[#e8d6b0]">{note}</p>}
      </div>
      <div className="flex max-w-[35%] flex-wrap justify-end gap-0.5">
        {captured.map((t, i) => <span key={i} className="h-5 w-5"><PieceIcon type={t} color={capturedColor} /></span>)}
      </div>
      <span className={`shrink-0 rounded-lg px-2.5 py-1 font-mono text-base font-black tabular-nums ${ms < 60000 ? 'bg-rose-500/90 text-white' : active ? 'bg-[#d9a441] text-[#1a1208]' : 'bg-white/10 text-[#f6e7bd]'}`} aria-label={`${name} clock ${clock(ms)}`}>
        {clock(ms)}
      </span>
    </div>
  );
}
