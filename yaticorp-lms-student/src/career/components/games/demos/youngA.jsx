/** Game-specific demos (see GameDemo.jsx) for group youngA: Young Thinkers — bright, friendly, big pictures. */
import { COLOURS as BOOK_COLOUR_INFO, COLOUR_KEYS as BOOK_COLOURS, PICTURES as BOOK_PICTURES } from '../../../data/bands/colouringBook';

const BOOK_HEX = Object.fromEntries(Object.entries(BOOK_COLOUR_INFO).map(([k, v]) => [k, v.hex]));

// ---- Shared helpers (pure) ----------------------------------------------------------------------------------------
const IDLE = [90, 90, false];

/*
 * A pair-finding script over 6 cards (3 × 2): which cards are face up, which are matched, whether the open two are a
 * miss, and which card the hand taps. Logical pairs: a = 0/4, b = 1/3, c = 2/5, laid out by `perm` (logical → slot).
 */
const FLIP_SCRIPT = [
  { open: [], done: [], tap: null },
  { open: [0], done: [], tap: 0 },
  { open: [0, 1], done: [], tap: 1, miss: true },
  { open: [3], done: [], tap: 3 },
  { open: [], done: [1, 3], tap: 1 },
  { open: [], done: [1, 3, 0, 4], tap: 4 },
  { open: [], done: [0, 1, 2, 3, 4, 5], tap: 5 },
  { open: [], done: [0, 1, 2, 3, 4, 5], tap: null }
];
const FLIP_PHASE = ['Tap a card', 'Tap a card', 'Not a pair', 'Remember where…', 'A pair!', 'A pair!', 'All pairs found!', 'All pairs found!'];
const FLIP_STEP = [0, 0, 1, 1, 1, 1, 2, 2];
const PERMS = [[0, 1, 2, 3, 4, 5], [2, 0, 4, 5, 1, 3], [3, 5, 1, 0, 2, 4]];
const cardPos = (slot) => [22 + (slot % 3) * 28, 34 + Math.floor(slot / 3) * 41];

function flipDemo(f, ex, renderCard) {
  const s = FLIP_SCRIPT[f];
  const perm = PERMS[ex];
  const slots = [0, 1, 2, 3, 4, 5].map((slot) => {
    const logical = perm.indexOf(slot);
    return { logical, open: s.open.includes(logical), done: s.done.includes(logical), miss: !!s.miss && s.open.includes(logical) };
  });
  return {
    body: (
      <div className="absolute inset-x-[8%] top-[14%] bottom-[5%] grid grid-cols-3 grid-rows-2 gap-1.5">
        {slots.map((c, slot) => <div key={slot} className="min-h-0 min-w-0">{renderCard(c)}</div>)}
      </div>
    ),
    hand: s.tap === null ? IDLE : [...cardPos(perm[s.tap]), true],
    step: FLIP_STEP[f],
    phase: FLIP_PHASE[f]
  };
}

// Centred square boards (3 × 3 or 2 × 2) inside the 4:3 box.
const SQUARE = 'absolute top-[12%] bottom-[4%] left-1/2 aspect-square -translate-x-1/2';
const pos3 = (i) => [18.5 + (i % 3) * 21 + 10.5, 12 + Math.floor(i / 3) * 28 + 14];

// ---- Colour Match: the coloured shape (or word) and the four glossy colour keys --------------------------------------
const INK = {
  red: { text: 'text-rose-500', key: 'bg-gradient-to-b from-rose-400 to-rose-500' },
  blue: { text: 'text-sky-500', key: 'bg-gradient-to-b from-sky-400 to-sky-500' },
  green: { text: 'text-emerald-500', key: 'bg-gradient-to-b from-emerald-400 to-emerald-500' },
  yellow: { text: 'text-amber-400', key: 'bg-gradient-to-b from-amber-300 to-amber-400' }
};
const KEYS = ['red', 'blue', 'green', 'yellow'];
const BLOB = {
  heart: 'M50 90 C20 68 4 50 4 32 C4 16 16 6 30 6 C40 6 47 12 50 20 C53 12 60 6 70 6 C84 6 96 16 96 32 C96 50 80 68 50 90 Z',
  star: 'M50 5 L62 37 L96 38 L69 59 L79 93 L50 73 L21 93 L31 59 L4 38 L38 37 Z',
  triangle: 'M50 8 L94 88 Q96 92 91 92 L9 92 Q4 92 6 88 Z',
  square: 'M24 12 H76 Q88 12 88 24 V76 Q88 88 76 88 H24 Q12 88 12 76 V24 Q12 12 24 12 Z'
};
const COLOUR_CARDS = [
  [{ shape: 'heart', ink: 'red' }, { shape: 'star', ink: 'blue' }],
  [{ shape: 'square', ink: 'green' }, { shape: 'triangle', ink: 'yellow' }],
  [{ word: 'RED', ink: 'green' }, { word: 'BLUE', ink: 'yellow' }]
];

// ---- Treasure Path / Mini Maze maps ---------------------------------------------------------------------------------
const MOVE = { u: [-1, 0], d: [1, 0], l: [0, -1], r: [0, 1] };
const ARROW = { u: '↑', d: '↓', l: '←', r: '→' };
const walk = (start, moves, n) => moves.slice(0, n).reduce(([r, c], m) => [r + MOVE[m][0], c + MOVE[m][1]], start);
const TREASURE = [
  { start: [2, 0], moves: ['r', 'r', 'u'], rocks: ['1,1', '3,2', '0,0', '0,3'] },
  { start: [0, 0], moves: ['d', 'd', 'r'], rocks: ['1,1', '0,2', '3,0', '2,3'] },
  { start: [3, 3], moves: ['u', 'l', 'l'], rocks: ['3,1', '1,2', '1,1', '0,3'] }
];
const PAD_POS = { u: [82.5, 52], l: [72.8, 66], d: [82.5, 66], r: [92.2, 66] };
const MAZES = [
  { start: [3, 0], moves: ['u', 'r', 'r', 'u', 'u'], walls: ['3,0,e', '1,0,s', '1,1,s', '0,1,e', '2,2,e', '1,2,e', '2,3,s'], star: '2,1', puddle: '3,2' },
  { start: [0, 0], moves: ['r', 'd', 'd', 'r', 'r'], walls: ['0,0,s', '0,1,e', '1,1,e', '1,0,e', '2,1,s', '1,2,s', '0,2,s'], star: '1,1', puddle: '3,0' },
  { start: [3, 3], moves: ['l', 'u', 'u', 'l', 'l'], walls: ['2,3,s', '3,1,e', '2,1,e', '0,1,s', '1,2,e', '0,2,s'], star: '1,2', puddle: '0,3' }
];
const MAZE_PAD = { u: [81.5, 33], l: [71.2, 54], r: [91.8, 54], d: [81.5, 75] };
const wallsOf = (m, r, c) => ({
  n: r === 0 || m.walls.includes(`${r - 1},${c},s`), s: r === 3 || m.walls.includes(`${r},${c},s`),
  w: c === 0 || m.walls.includes(`${r},${c - 1},e`), e: c === 3 || m.walls.includes(`${r},${c},e`)
});

// ---- Colouring Book pictures (the game's own, data/bands/colouringBook.js) ------------------------------------------
const BOOK = ['an apple', 'a house', 'a butterfly'].map((name) => BOOK_PICTURES.find((p) => p.name === name));

// ---- Shape Builder pieces: cells { r, c, t } with t = F (full) or the corner a half-square keeps -----------------
const POLY = { F: '0,0 1,0 1,1 0,1', tl: '0,0 1,0 0,1', tr: '0,0 1,0 1,1', br: '1,0 1,1 0,1', bl: '0,0 1,1 0,1' };
const SHAPES = [
  [{ fill: '#f97316', cells: [[0, 0, 'F'], [0, 1, 'F']] }, { fill: '#3b82f6', cells: [[1, 0, 'F']] }, { fill: '#22c55e', cells: [[1, 1, 'tl']] }],
  [{ fill: '#ec4899', cells: [[0, 0, 'br'], [0, 1, 'bl']] }, { fill: '#3b82f6', cells: [[1, 0, 'F'], [1, 1, 'F']] }, { fill: '#eab308', cells: [[1, 2, 'F']] }],
  [{ fill: '#a855f7', cells: [[0, 0, 'F'], [1, 0, 'F']] }, { fill: '#f97316', cells: [[1, 1, 'F']] }, { fill: '#22c55e', cells: [[0, 2, 'F'], [1, 2, 'F']] }]
];
const pieceArt = (piece) => {
  const r0 = Math.min(...piece.cells.map((x) => x[0]));
  const c0 = Math.min(...piece.cells.map((x) => x[1]));
  const rows = Math.max(...piece.cells.map((x) => x[0])) - r0 + 1;
  const cols = Math.max(...piece.cells.map((x) => x[1])) - c0 + 1;
  return (
    <svg viewBox={`0 0 ${cols} ${rows}`} className="h-[70%] max-w-[80%]" aria-hidden>
      {piece.cells.map(([r, c, t]) => <polygon key={`${r},${c}`} points={POLY[t]} transform={`translate(${c - c0} ${r - r0})`} fill={piece.fill} stroke="#fff" strokeWidth="0.06" />)}
    </svg>
  );
};

// ---- Light-Up Garden / Flash Sequence / Tic-Tac-Toe content ---------------------------------------------------------
const GARDEN = [{ 1: '🍎', 5: '⭐', 6: '🐶' }, { 0: '🎈', 4: '🐱', 8: '🌙' }, { 2: '🚗', 3: '⚽', 7: '🐸' }];
const PADS = [
  { face: '⭐', on: 'bg-rose-400', off: 'bg-rose-500/30' }, { face: '🍎', on: 'bg-sky-400', off: 'bg-sky-500/30' },
  { face: '🐶', on: 'bg-emerald-400', off: 'bg-emerald-500/30' }, { face: '🚗', on: 'bg-amber-300', off: 'bg-amber-500/30' }
];
const FLASH_RUNS = [[0, 3, 1], [2, 1, 3], [3, 0, 2]];
const padPos = (i) => [34.25 + (i % 2) * 31.5, 33 + Math.floor(i / 2) * 42];
const TTT = [
  { moves: [4, 1, 0, 3, 8], line: [0, 4, 8] },
  { moves: [0, 4, 2, 6, 1], line: [0, 1, 2] },
  { moves: [4, 0, 5, 8, 3], line: [3, 4, 5] }
];

export const DEMOS = {
  // Memory Match: violet card backs, picture faces, a miss turns red, matched pairs go green.
  'memory-match': {
    frames: 8,
    draw: (f, ex) => {
      const faces = [['🐶', '🍎', '⭐'], ['🐱', '🚗', '🎈'], ['🍌', '🐸', '⚽']][ex];
      const pic = (l) => faces[[0, 1, 2, 1, 0, 2][l]];
      const out = flipDemo(f, ex, (c) => (
        <div className={`grid h-full place-items-center rounded-xl text-3xl transition-all duration-300 sm:text-4xl ${
          c.done ? 'scale-95 bg-emerald-50 ring-2 ring-emerald-300' : c.miss ? 'bg-rose-50 ring-2 ring-rose-300' : c.open ? 'bg-white shadow-md ring-2 ring-violet-300' : 'bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm'}`}>
          {c.open || c.done ? pic(c.logical) : ''}
        </div>
      ));
      const moves = [0, 0, 1, 1, 2, 3, 4, 4][f];
      return { ...out, body: <>{out.body}<span className="absolute top-1.5 right-2 z-20 rounded-full bg-white/95 px-2 py-0.5 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">Moves {moves}/6</span></> };
    }
  },

  // Colour Match: a shape (or, later, a word) in a colour; tap the matching glossy colour key.
  'colour-match': {
    frames: 6,
    draw: (f, ex) => {
      const card = COLOUR_CARDS[ex][f < 3 ? 0 : 1];
      const tapped = f === 2 || f === 5;
      const keyAt = KEYS.indexOf(card.ink);
      const score = f < 2 ? 0 : f < 5 ? 1 : 2;
      return {
        body: (
          <>
            <div className={`absolute inset-x-[6%] top-[13%] grid h-[39%] place-items-center rounded-2xl bg-gradient-to-b from-violet-50 to-white ring-1 transition-all ${tapped ? 'ring-2 ring-emerald-400' : 'ring-slate-200'}`}>
              {card.word
                ? <span className={`text-4xl font-black tracking-wider sm:text-5xl ${INK[card.ink].text}`}>{card.word}</span>
                : <svg viewBox="0 0 100 100" className={`h-[78%] ${INK[card.ink].text}`} fill="currentColor" aria-hidden><path d={BLOB[card.shape]} /></svg>}
              {tapped && <span className="absolute top-1.5 right-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-600 ring-1 ring-emerald-100">+1</span>}
            </div>
            <div className="absolute inset-x-[6%] top-[55%] bottom-[4%] grid grid-cols-2 grid-rows-2 gap-1.5">
              {KEYS.map((k, i) => (
                <div key={k} className={`relative overflow-hidden rounded-xl transition-all ${INK[k].key} ${tapped && i === keyAt ? 'scale-95 ring-4 ring-emerald-300' : ''}`}>
                  <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent" />
                </div>
              ))}
            </div>
            <span className="absolute top-1.5 right-2 z-20 rounded-full bg-white/95 px-2 py-0.5 text-xs font-black text-teal-700 ring-1 ring-teal-100">Score {score}</span>
          </>
        ),
        hand: f === 0 || f === 3 ? IDLE : [28 + (keyAt % 2) * 44, 65 + Math.floor(keyAt / 2) * 21, tapped],
        step: f === 0 ? 0 : f === 5 ? 2 : 1,
        phase: f === 0 ? (card.word ? 'Look at the ink' : 'What colour is it?') : tapped ? 'Great!' : card.word ? 'Tap the ink colour' : 'Tap that colour'
      };
    }
  },

  // Animal Pair Safari: leafy card backs; an animal (amber) pairs with its sound, home or baby (sky).
  'animal-pair-safari': {
    frames: 8,
    draw: (f, ex) => {
      const sets = [
        [['🐄', 'cow'], ['🐕', 'dog'], ['🦆', 'duck'], ['🔊', 'Woof!', 'says'], ['🔊', 'Moo!', 'says'], ['🔊', 'Quack!', 'says']],
        [['🐝', 'bee'], ['🐟', 'fish'], ['🐦', 'bird'], ['🌊', 'water', 'lives in'], ['🍯', 'hive', 'lives in'], ['🪺', 'nest', 'lives in']],
        [['🐔', 'hen'], ['🦁', 'lion'], ['🐸', 'frog'], ['🪨', 'den', 'lives in'], ['🐣', 'chick', 'baby'], ['🪷', 'pond', 'lives in']]
      ][ex];
      return flipDemo(f, ex, (c) => {
        const [pic, word, label] = sets[c.logical];
        const up = c.open || c.done;
        return (
          <div className={`flex h-full flex-col items-center justify-center rounded-xl leading-none transition-all duration-300 ${
            c.done ? 'scale-95 bg-emerald-50 ring-2 ring-emerald-300' : c.miss ? 'bg-rose-50 ring-2 ring-rose-300' : up ? (label ? 'bg-sky-50 ring-2 ring-sky-300' : 'bg-amber-50 ring-2 ring-amber-300') : 'bg-gradient-to-br from-lime-400 to-emerald-600 shadow-md'}`}>
            {up ? (
              <>
                <span className="text-2xl sm:text-3xl">{pic}</span>
                {label && <span className="mt-0.5 text-[0.7rem] font-black text-sky-700 uppercase">{label}</span>}
                <span className="mt-0.5 text-xs font-black text-slate-800">{word}</span>
              </>
            ) : <span className="text-2xl">🌿</span>}
          </div>
        );
      });
    }
  },

  // What's Missing?: a warm scene of pictures, hidden behind 🙈, back with one gone; tap it in the tray.
  'whats-missing': {
    frames: 7,
    draw: (f, ex) => {
      const scene = [['🍎', '🐶', '⭐', '🚗', '🎈'], ['🐱', '⚽', '🌙', '🍌', '🐸'], ['🦋', '🍓', '🚲', '🐟', '🎁']][ex];
      const gone = [1, 3, 0][ex];
      const tray = [[scene[3], scene[1], '🌳'], ['🐢', scene[0], scene[3]], ['🍕', '🐻', scene[0]]][ex];
      const names = [['car', 'dog', 'tree'], ['turtle', 'cat', 'banana'], ['pizza', 'bear', 'butterfly']][ex];
      const right = tray.indexOf(scene[gone]);
      const cover = f === 2;
      const found = f >= 5;
      return {
        body: (
          <>
            {f < 2 && <span className="absolute top-[5%] right-[8%] h-1.5 w-[38%] overflow-hidden rounded-full bg-slate-900/10"><span className={`block h-full rounded-full bg-violet-500 ${f === 0 ? 'w-full' : 'w-2/5'}`} /></span>}
            <div className="absolute inset-x-[8%] top-[13%] grid h-[51%] grid-cols-3 grid-rows-2 gap-1 rounded-2xl bg-gradient-to-b from-amber-50 to-orange-100 p-1.5 ring-1 ring-orange-200">
              {[0, 1, 2, 3, 4, 5].map((s) => {
                const p = scene[s];
                const back = found && s === gone;
                return <div key={s} className={`grid place-items-center rounded-xl text-2xl sm:text-3xl ${back ? 'bg-emerald-100 ring-2 ring-emerald-400' : 'bg-white/60'}`}>{p && (f < 2 || s !== gone || found) ? p : ''}</div>;
              })}
              {cover && <div className="absolute inset-0 grid place-items-center rounded-2xl bg-violet-500 text-4xl">🙈</div>}
            </div>
            {f >= 3 && (
              <div className="absolute inset-x-[8%] top-[68%] bottom-[4%] grid grid-cols-3 gap-1.5">
                {tray.map((t, i) => (
                  <div key={t} className={`flex flex-col items-center justify-center rounded-xl ring-2 ${found && i === right ? 'bg-emerald-100 ring-emerald-500' : 'bg-white ring-violet-200'}`}>
                    <span className="text-xl leading-none sm:text-2xl">{t}</span><span className="text-xs font-bold text-slate-700">{names[i]}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ),
        hand: f === 4 || f === 5 ? [22 + right * 28, 82, true] : IDLE,
        step: f < 2 ? 0 : f < 4 ? 1 : 2,
        phase: ['Look carefully!', 'Look carefully!', 'Hiding…', "What's missing?", 'Tap it!', 'Well done!', 'Well done!'][f]
      };
    }
  },

  // Light-Up Garden: pictures pop up on a 3 × 3 grid, hide, then tap where they were (they turn green).
  'light-up-garden': {
    frames: 7,
    draw: (f, ex) => {
      const lit = GARDEN[ex];
      const cells = Object.keys(lit).map(Number);
      const tapped = f >= 3 ? cells.slice(0, Math.min(3, f - 2)) : [];
      return {
        body: (
          <div className={`${SQUARE} grid grid-cols-3 gap-1.5`}>
            {[...Array(9).keys()].map((i) => {
              const showing = f < 2 && lit[i];
              const hit = tapped.includes(i);
              return <div key={i} className={`grid place-items-center rounded-xl text-2xl ring-1 ring-slate-200 transition-all sm:text-3xl ${showing ? 'bg-amber-50 ring-2 ring-amber-300' : hit ? 'bg-emerald-400' : 'bg-slate-100'}`}>{showing || hit ? lit[i] : ''}</div>;
            })}
          </div>
        ),
        hand: f >= 3 && f < 6 ? [...pos3(cells[f - 3]), true] : IDLE,
        step: f < 2 ? 0 : f < 3 ? 1 : 2,
        phase: ['Look!', 'Look!', 'Remember where', 'Tap where they were', 'Tap where they were', 'Tap where they were', 'Well done!'][f]
      };
    }
  },

  // Flash Sequence: four picture pads light up one after another; tap them back in the same order.
  'flash-sequence': {
    frames: 9,
    draw: (f, ex) => {
      const run = FLASH_RUNS[ex];
      const lit = f < 3 ? run[f] : f >= 4 && f < 7 ? run[f - 4] : null;
      return {
        body: (
          <>
            <div className={`${SQUARE} grid grid-cols-2 gap-2`}>
              {PADS.map((p, i) => (
                <div key={i} className={`grid place-items-center rounded-2xl text-3xl transition-all duration-200 sm:text-4xl ${lit === i ? `${p.on} scale-105 shadow-lg` : `${p.off} opacity-80`}`}>{p.face}</div>
              ))}
            </div>
            {f >= 3 && f < 7 && <span className="absolute top-1.5 right-2 z-20 rounded-full bg-white/95 px-2 py-0.5 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">{3 - Math.max(0, f - 3)} more</span>}
          </>
        ),
        hand: f >= 4 && f < 7 ? [...padPos(run[f - 4]), true] : IDLE,
        step: f < 3 ? 0 : f < 7 ? 1 : 2,
        phase: f < 3 ? `Watch… ${f + 1}` : f < 7 ? 'Your turn!' : f === 7 ? 'Correct! Run of 3' : 'Next: one more'
      };
    }
  },

  // Tic-Tac-Toe: you are X (sky), the computer O (rose); spot your winning square, the line glows amber.
  'tic-tac-toe': {
    frames: 7,
    draw: (f, ex) => {
      const { moves, line } = TTT[ex];
      const made = f < 1 ? [] : moves.slice(0, Math.min(4, f));
      const board = Array(9).fill('');
      made.forEach((c, k) => { board[c] = k % 2 ? 'O' : 'X'; });
      if (f >= 6) board[line.find((c) => !moves.slice(0, 4).includes(c))] = 'X';
      const win = line.find((c) => !moves.slice(0, 4).includes(c));
      const xTap = f === 1 || f === 3 || f === 6;
      return {
        body: (
          <div className={`${SQUARE} grid grid-cols-3 gap-1.5`}>
            {board.map((v, i) => (
              <div key={i} className={`grid place-items-center rounded-xl text-3xl font-black ring-1 sm:text-4xl ${
                f >= 6 && line.includes(i) ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400' : v === 'X' ? 'bg-sky-50 text-sky-700 ring-sky-200' : v === 'O' ? 'bg-rose-50 text-rose-600 ring-rose-200' : 'bg-white ring-slate-200'}`}>
                {v}
              </div>
            ))}
          </div>
        ),
        hand: xTap ? [...pos3(f === 6 ? win : moves[f - 1]), true] : f === 5 ? [...pos3(win), false] : IDLE,
        step: f === 0 ? 0 : f < 6 ? 1 : 2,
        phase: ['You are X', 'Your move', 'Computer: O', 'Your move', 'Computer: O', 'Spot your win', 'Three in a row!'][f]
      };
    }
  },

  // Colouring Book: an outline picture, crayons on the right; pick a crayon, tap a part, it fills — part by part.
  'picture-logic': {
    frames: 7,
    draw: (f, ex) => {
      const pic = BOOK[ex];
      const n = pic.parts.length;
      const done = Math.min(n, Math.max(0, Math.round(((f - 1) / 4) * n)));
      const solved = f >= 6;
      const next = Math.min(n - 1, done);
      const crayons = BOOK_COLOURS.filter((k) => pic.parts.some((p) => p.c === k));
      const tapAt = pic.parts[next].at;
      return {
        body: (
          <div className="absolute inset-x-[5%] top-[12%] bottom-[4%] flex items-center justify-center gap-[4%]">
            <svg viewBox="-2 -2 104 104" className={`h-full max-h-full w-auto rounded-xl bg-white ${solved ? 'drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]' : ''}`} aria-hidden>
              {pic.parts.map((p, i) => <path key={i} d={p.d} fill={i < done || solved ? BOOK_HEX[p.c] : '#fff'} stroke="#1f2937" strokeWidth="1.8" strokeLinejoin="round" className="transition-[fill] duration-300" />)}
              {(pic.decor || []).map((d, i) => <path key={`d${i}`} d={d.d} fill={d.fill || 'none'} stroke="#1f2937" strokeWidth="1.8" />)}
            </svg>
            <div className="flex flex-col gap-1.5 rounded-xl bg-slate-100 p-1.5">
              {crayons.map((k) => <span key={k} className={`h-5 w-5 rounded-full ring-2 ${!solved && f >= 1 && pic.parts[next].c === k ? 'ring-slate-900' : 'ring-white'}`} style={{ backgroundColor: BOOK_HEX[k] }} />)}
            </div>
          </div>
        ),
        hand: f >= 1 && f <= 5 ? [26 + tapAt[0] * 0.42, 14 + tapAt[1] * 0.8, true] : IDLE,
        step: f === 0 ? 0 : f < 6 ? 1 : 2,
        phase: f === 0 ? 'Look at the picture' : f < 6 ? 'Pick a crayon, tap a part' : `You coloured ${pic.name}!`
      };
    }
  },

  // Treasure Path: a lime map with rocks; tap arrow cards into the program, press Go, the explorer walks to the 💰.
  'treasure-path': {
    frames: 9,
    draw: (f, ex) => {
      const m = TREASURE[ex];
      const cards = m.moves.slice(0, Math.min(3, f));
      const stepsWalked = f >= 5 ? Math.min(3, f - 4) : 0;
      const at = walk(m.start, m.moves, stepsWalked);
      const goal = walk(m.start, m.moves, 3);
      const trail = [0, 1, 2, 3].slice(0, stepsWalked + 1).map((n) => walk(m.start, m.moves, n).join(','));
      const won = f >= 7;
      return {
        body: (
          <>
            <div className="absolute top-[12%] bottom-[4%] left-[3%] grid aspect-square grid-cols-4 overflow-hidden rounded-xl bg-lime-100 ring-2 ring-lime-300">
              {[...Array(16).keys()].map((i) => {
                const r = Math.floor(i / 4); const c = i % 4; const k = `${r},${c}`;
                const here = at[0] === r && at[1] === c;
                return (
                  <div key={k} className={`grid place-items-center border border-lime-200/70 text-xl sm:text-2xl ${m.rocks.includes(k) ? 'bg-stone-200' : trail.includes(k) && f >= 5 ? 'bg-amber-100' : ''}`}>
                    {here ? (won ? '🥳' : '🧒') : m.rocks.includes(k) ? '🪨' : goal[0] === r && goal[1] === c ? '💰' : ''}
                  </div>
                );
              })}
            </div>
            <div className="absolute top-[12%] right-[3%] flex h-[24%] w-[29%] flex-wrap content-center items-center justify-center gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
              {cards.length === 0 && <span className="text-center text-xs font-bold text-slate-400">Your arrows</span>}
              {cards.map((d, i) => <span key={i} className={`grid h-7 w-7 place-items-center rounded-lg text-base font-black text-white ${f >= 5 && f < 8 && i === stepsWalked - 1 ? 'bg-amber-500' : 'bg-teal-600'}`}>{ARROW[d]}</span>)}
            </div>
            <div className="absolute top-[44%] right-[3%] grid h-[29%] w-[29%] grid-cols-3 grid-rows-2 gap-1">
              {['.', 'u', '.', 'l', 'd', 'r'].map((d, i) => d === '.' ? <span key={i} /> : <span key={i} className="grid place-items-center rounded-lg bg-teal-500 text-base font-black text-white">{ARROW[d]}</span>)}
            </div>
            <span className={`absolute right-[3%] bottom-[4%] grid h-[16%] w-[29%] place-items-center rounded-xl text-base font-black text-white ${f === 4 ? 'bg-emerald-700' : 'bg-emerald-600'}`}>Go ▶</span>
          </>
        ),
        hand: f >= 1 && f <= 3 ? [...PAD_POS[m.moves[f - 1]], true] : f === 4 ? [82.5, 88, true] : IDLE,
        step: f === 0 ? 0 : f < 4 ? 1 : 2,
        phase: f === 0 ? 'Find the treasure' : f < 4 ? 'Add arrow cards' : f < 7 ? 'Go! Walking…' : 'Treasure found!'
      };
    }
  },

  // Odd One Out: four word buttons; three belong together, tap the outsider, the reason shows.
  'odd-one-out': {
    frames: 6,
    draw: (f, ex) => {
      const [words, odd, why] = [
        [['Apple', 'Banana', 'Carrot', 'Mango'], 2, 'The others are fruits.'],
        [['Cow', 'Lion', 'Dog', 'Goat'], 1, 'The others are farm animals.'],
        [['Pen', 'Pencil', 'Crayon', 'Hammer'], 3, 'The others are for writing.']
      ][ex];
      const picked = f >= 3;
      return {
        body: (
          <>
            <p className="absolute inset-x-[6%] top-[14%] text-center text-base font-black text-slate-900 sm:text-lg">Which one does not belong?</p>
            <div className="absolute inset-x-[6%] top-[32%] bottom-[19%] grid grid-cols-2 grid-rows-2 gap-1.5">
              {words.map((w, i) => (
                <div key={w} className={`grid place-items-center rounded-xl text-base font-black ring-1 transition-colors sm:text-lg ${
                  picked && i === odd ? 'bg-emerald-50 text-emerald-800 ring-2 ring-emerald-300' : picked ? 'bg-slate-50 text-slate-400 ring-slate-200' : f >= 1 && i !== odd ? 'bg-sky-50 text-slate-900 ring-sky-200' : 'bg-white text-slate-900 ring-slate-200'}`}>
                  {picked && i === odd ? `✓ ${w}` : w}
                </div>
              ))}
            </div>
            {f >= 4 && <p className="absolute inset-x-[6%] bottom-[3%] rounded-lg bg-amber-50 px-2 py-1 text-center text-xs font-bold text-amber-900 ring-1 ring-amber-200 sm:text-sm">💡 {why}</p>}
          </>
        ),
        hand: f === 2 || f === 3 ? [28 + (odd % 2) * 44, 45 + Math.floor(odd / 2) * 25, f === 3] : IDLE,
        step: f === 0 ? 0 : f < 3 ? 1 : 2,
        phase: ['Four things', 'Three belong', 'Which is odd?', 'Correct!', 'Correct!', 'Correct!'][f]
      };
    }
  },

  // Shape Builder: a grey silhouette on the grid; tap a coloured piece, then tap where it goes, until it's full.
  'shape-builder': {
    frames: 8,
    draw: (f, ex) => {
      const pieces = SHAPES[ex];
      const placedN = f >= 2 ? Math.min(3, Math.floor(f / 2)) : 0;
      const selected = f >= 1 && f <= 5 && f % 2 === 1 ? (f - 1) / 2 : null;
      const owner = {};
      pieces.forEach((p, k) => p.cells.forEach(([r, c, t]) => { owner[`${r},${c}`] = { t, fill: k < placedN ? p.fill : null }; }));
      const done = placedN === 3;
      const placing = f >= 2 && f <= 6 && f % 2 === 0 ? pieces[f / 2 - 1].cells[0] : null;
      return {
        body: (
          <>
            <div className="absolute top-[12%] bottom-[4%] left-[4%] grid aspect-square grid-cols-3 grid-rows-3 overflow-hidden rounded-2xl bg-white p-1 ring-1 ring-slate-200">
              {[...Array(9).keys()].map((i) => {
                const k = `${Math.floor(i / 3)},${i % 3}`; const o = owner[k];
                return (
                  <div key={k} className="relative border border-dashed border-slate-900/10">
                    {o && <svg viewBox="0 0 1 1" className="absolute inset-0 h-full w-full" aria-hidden><polygon points={POLY[o.t]} fill={o.fill || '#cbd5e1'} stroke="#fff" strokeWidth={o.fill ? 0.04 : 0} /></svg>}
                  </div>
                );
              })}
            </div>
            <div className="absolute top-[12%] right-[4%] bottom-[4%] flex w-[28%] flex-col gap-1.5">
              {pieces.map((p, k) => (
                <div key={k} className={`grid flex-1 place-items-center rounded-xl bg-white shadow-sm transition-all ${k < placedN ? 'opacity-0' : selected === k ? 'scale-105 ring-4 ring-orange-400' : 'ring-2 ring-slate-900/10'}`}>
                  {pieceArt(p)}
                </div>
              ))}
            </div>
            {done && <span className="absolute bottom-[6%] left-[8%] rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-black text-white">🎉 Built!</span>}
          </>
        ),
        hand: selected !== null ? [82, 12 + (selected + 0.5) * 28, true] : placing ? [4 + (placing[1] + 0.5) * 21, 12 + (placing[0] + 0.5) * 28, true] : IDLE,
        step: f === 0 ? 0 : done ? 2 : 1,
        phase: f === 0 ? 'Fill the grey shape' : done ? 'You built it!' : selected !== null ? 'Tap a piece' : 'It fits!'
      };
    }
  },

  // Pattern Path: a row of colours/shapes/numbers with a dashed gap; find the repeat, pick what comes next.
  'pattern-path': {
    frames: 6,
    draw: (f, ex) => {
      const [run, opts, right, unit] = [
        [['🔴', '🔵', '🔴', '🔵', '🔴'], ['🟢', '🔵', '🔴'], 1, 2],
        [['⭐', '⭐', '❤️', '⭐', '⭐'], ['⭐', '🌙', '❤️'], 2, 3],
        [['2', '4', '6', '8', '10'], ['11', '12', '14'], 1, 0]
      ][ex];
      const picked = f >= 3;
      return {
        body: (
          <>
            <p className="absolute inset-x-0 top-[14%] text-center text-sm font-bold text-slate-500">{ex === 2 ? 'Which number comes next?' : 'What comes next?'}</p>
            <div className="absolute inset-x-[3%] top-[27%] flex h-[24%] items-center justify-center gap-1">
              {[...run, null].map((n, i) => (
                <span key={i} className={`grid aspect-square h-full max-w-[16%] place-items-center rounded-xl text-xl font-black sm:text-2xl ${
                  n === null ? (picked ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400' : 'border-2 border-dashed border-sky-300 bg-sky-100 text-sky-700') : f >= 1 && f < 3 && (unit ? i < unit : true) ? 'bg-amber-100 text-slate-900 ring-2 ring-amber-300' : 'bg-slate-100 text-slate-900'}`}>
                  {n ?? (picked ? opts[right] : '?')}
                </span>
              ))}
            </div>
            <div className="absolute inset-x-[8%] top-[60%] bottom-[6%] grid grid-cols-3 gap-2">
              {opts.map((o, i) => (
                <div key={o} className={`grid place-items-center rounded-2xl text-2xl font-black ring-1 sm:text-3xl ${picked && i === right ? 'bg-emerald-50 text-emerald-800 ring-2 ring-emerald-300' : 'bg-slate-50 text-slate-900 ring-slate-200'}`}>{o}</div>
              ))}
            </div>
          </>
        ),
        hand: f === 2 || f === 3 ? [22 + right * 28, 77, f === 3] : IDLE,
        step: f === 0 ? 0 : f < 3 ? 1 : 2,
        phase: f === 0 ? 'Look at the row' : f < 3 ? (ex === 2 ? 'Add 2 each time' : 'Find what repeats') : 'Correct!'
      };
    }
  },

  // Mini Maze Mission: walk the bunny through the walls with the arrow buttons, grab the star, reach the carrot.
  'mini-maze-mission': {
    frames: 8,
    draw: (f, ex) => {
      const m = MAZES[ex];
      const n = Math.max(0, Math.min(5, f - 1));
      const at = walk(m.start, m.moves, n);
      const goal = walk(m.start, m.moves, 5);
      const starTaken = [0, 1, 2, 3, 4, 5].slice(0, n + 1).some((k) => walk(m.start, m.moves, k).join(',') === m.star);
      const won = n === 5;
      const dir = f >= 2 && f <= 6 ? m.moves[f - 2] : null;
      return {
        body: (
          <>
            <div className="absolute top-[12%] bottom-[4%] left-[3%] grid aspect-square grid-cols-4 rounded-xl bg-emerald-50 p-0.5 ring-2 ring-slate-700">
              {[...Array(16).keys()].map((i) => {
                const r = Math.floor(i / 4); const c = i % 4; const k = `${r},${c}`; const w = wallsOf(m, r, c);
                const here = at[0] === r && at[1] === c;
                return (
                  <div key={k} className={`grid place-items-center border-[3px] text-xl sm:text-2xl ${w.n ? 'border-t-slate-700' : 'border-t-transparent'} ${w.s ? 'border-b-slate-700' : 'border-b-transparent'} ${w.w ? 'border-l-slate-700' : 'border-l-transparent'} ${w.e ? 'border-r-slate-700' : 'border-r-transparent'}`}>
                    {here ? '🐰' : goal[0] === r && goal[1] === c ? '🥕' : k === m.star && !starTaken ? '⭐' : k === m.puddle ? '💦' : ''}
                  </div>
                );
              })}
            </div>
            <div className="absolute top-[23%] right-[3%] grid h-[62%] w-[31%] grid-cols-3 grid-rows-3 gap-1">
              {['.', 'u', '.', 'l', 'b', 'r', '.', 'd', '.'].map((d, i) => (d === '.' ? <span key={i} /> : d === 'b'
                ? <span key={i} className="grid place-items-center text-lg">🐰</span>
                : <span key={i} className={`grid place-items-center rounded-xl text-base font-black shadow-sm ring-2 ${dir === d ? 'bg-teal-100 text-teal-800 ring-teal-400' : 'bg-white text-slate-700 ring-teal-200'}`}>{ARROW[d]}</span>))}
            </div>
            <span className="absolute top-1.5 right-2 z-20 rounded-full bg-white/95 px-2 py-0.5 text-xs font-black text-amber-600 ring-1 ring-amber-100">⭐ {starTaken ? 1 : 0}/1</span>
          </>
        ),
        hand: dir ? [...MAZE_PAD[dir], true] : IDLE,
        step: f < 1 ? 0 : won ? 2 : 1,
        phase: f < 1 ? 'Bunny to the carrot' : won ? 'Yummy carrot!' : f === 1 ? 'Which way?' : 'Step by step'
      };
    }
  },

  // Shadow Detective: a black shadow on a warm card; tap the picture that made it — it lights up in colour.
  'shadow-detective': {
    frames: 7,
    draw: (f, ex) => {
      const [choices, right, wrong, turned] = [
        [[['🐘', 'elephant'], ['🐱', 'cat'], ['🐟', 'fish'], ['🚗', 'car']], 0, null, false],
        [[['🐶', 'dog'], ['🐰', 'rabbit'], ['🦒', 'giraffe'], ['🐢', 'turtle']], 2, 1, false],
        [[['🚲', 'bike'], ['✈️', 'plane'], ['🚀', 'rocket'], ['🚌', 'bus']], 1, null, true]
      ][ex];
      const tryWrong = wrong !== null && (f === 2 || f === 3);
      const solved = f >= 4;
      const tapAt = f === 3 && wrong !== null ? wrong : f === 4 ? right : null;
      const pos = (i) => [61.5 + (i % 2) * 23, 34 + Math.floor(i / 2) * 41];
      return {
        body: (
          <>
            <div className="absolute top-[22%] left-[3%] grid aspect-square w-[44%] place-items-center overflow-hidden rounded-2xl bg-gradient-to-b from-amber-50 to-orange-100 ring-1 ring-orange-200">
              <span className={`text-6xl leading-none transition-all duration-500 sm:text-7xl ${solved ? '' : 'brightness-0'} ${turned && !solved ? 'rotate-45' : ''}`}>{choices[right][0]}</span>
            </div>
            <div className="absolute top-[14%] right-[3%] bottom-[4%] grid w-[48%] grid-cols-2 grid-rows-2 gap-1.5">
              {choices.map(([pic, name], i) => (
                <div key={name} className={`flex flex-col items-center justify-center rounded-xl ring-2 ${
                  solved && i === right ? 'bg-emerald-100 ring-emerald-500' : tryWrong && f === 3 && i === wrong ? 'bg-rose-100 ring-rose-400' : ['bg-amber-50 ring-amber-200', 'bg-sky-50 ring-sky-200', 'bg-emerald-50 ring-emerald-200', 'bg-rose-50 ring-rose-200'][i]}`}>
                  <span className="text-2xl leading-none sm:text-3xl">{pic}</span><span className="text-xs font-bold text-slate-700">{name}</span>
                </div>
              ))}
            </div>
          </>
        ),
        hand: tapAt !== null ? [...pos(tapAt), true] : f === 2 || f === 3 ? [...pos(wrong ?? right), false] : IDLE,
        step: f < 1 ? 0 : solved ? 2 : 1,
        phase: f < 1 ? 'Whose shadow?' : solved ? `Yes! The ${choices[right][1]}!` : f === 3 && wrong !== null ? 'Not that one!' : turned ? 'It is turned!' : 'Look at its shape'
      };
    }
  }
};
