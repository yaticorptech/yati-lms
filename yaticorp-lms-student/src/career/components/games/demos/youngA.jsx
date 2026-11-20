/** Game-specific demos (see GameDemo.jsx) for group youngA: Young Thinkers — bright, friendly, big pictures. */
import { MAP_H as TH_H, MAP_W as TH_W, NODES as TH_NODES, PLACES as TH_PLACES, explorerArt as thExplorerArt, mapArt as thMapArt } from '../treasureMap';
import { CHARACTERS as BOOK_CHARACTERS, COLOURS as BOOK_COLOUR_INFO, COLOUR_KEYS as BOOK_COLOURS } from '../../../data/bands/colouringBook';

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
// The gem is picked up on the way (after `gem` steps); the chest stays locked until then (2026-11-18).
const TREASURE = [
  { start: [3, 0], moves: ['u', 'u', 'r', 'r', 'd'], gem: 2, rocks: ['3,1', '2,1', '0,3', '3,3'], water: ['0,1'] },
  { start: [0, 0], moves: ['r', 'r', 'r', 'd', 'd', 'l'], gem: 3, rocks: ['1,1', '1,2', '3,0'], water: ['2,0'] },
  { start: [3, 3], moves: ['l', 'l', 'u', 'u', 'r'], gem: 2, rocks: ['2,2', '2,3', '0,0'], water: ['1,0'] }
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
const BOOK = ['a teddy bear', 'a cupcake', 'a kitten'].map((name) => BOOK_CHARACTERS.find((p) => p.name === name));

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

  // Animal Pair Safari (2026-11-18, like the game): 8 cards, 2 rows of 4 — a green 🌿 back, an animal (amber) or its
  // partner (sky: says / lives in / baby). Turn two; a pair goes green, a miss flashes red.
  'animal-pair-safari': {
    frames: 11,
    draw: (f, ex) => {
      const sets = [
        [['🐄', 'cow'], ['🐕', 'dog'], ['🦆', 'duck'], ['🐈', 'cat'], ['🔊', 'Moo!', 'says'], ['🔊', 'Woof!', 'says'], ['🔊', 'Quack!', 'says'], ['🔊', 'Meow!', 'says']],
        [['🐝', 'bee'], ['🐟', 'fish'], ['🐦', 'bird'], ['🦁', 'lion'], ['🍯', 'hive', 'lives in'], ['🌊', 'water', 'lives in'], ['🪺', 'nest', 'lives in'], ['🪨', 'den', 'lives in']],
        [['🐔', 'hen'], ['🐑', 'sheep'], ['🐸', 'frog'], ['🐄', 'cow'], ['🐣', 'chick', 'baby'], ['🐑', 'lamb', 'baby'], ['🐸', 'tadpole', 'baby'], ['🐄', 'calf', 'baby']]
      ][ex];
      // Logical pairs: 0/4, 1/5, 2/6, 3/7. Slots shuffled per example.
      const perm = [[0, 5, 2, 7, 4, 1, 6, 3], [3, 6, 0, 5, 2, 7, 4, 1], [6, 1, 4, 3, 0, 7, 2, 5]][ex];
      const script = [
        { open: [], done: [], tap: null }, { open: [0], done: [], tap: 0 }, { open: [0, 4], done: [], tap: 4 },
        { open: [1], done: [0, 4], tap: 1 }, { open: [1, 6], done: [0, 4], tap: 6, miss: true }, { open: [2], done: [0, 4], tap: 2 },
        { open: [2, 6], done: [0, 4], tap: 6 }, { open: [1, 5], done: [0, 4, 2, 6], tap: 5 }, { open: [3, 7], done: [0, 4, 2, 6, 1, 5], tap: 7 },
        { open: [], done: [0, 1, 2, 3, 4, 5, 6, 7], tap: null }, { open: [], done: [0, 1, 2, 3, 4, 5, 6, 7], tap: null }
      ][f];
      const slotPos = (slot) => [6 + (slot % 4 + 0.5) * 22, 15 + (Math.floor(slot / 4) + 0.5) * 40];
      return {
        body: (
          <div className="absolute inset-x-[6%] top-[15%] bottom-[5%] grid grid-cols-4 grid-rows-2 gap-1.5">
            {perm.map((logical, slot) => {
              const [pic, word, label] = sets[logical];
              const done = script.done.includes(logical);
              const open = script.open.includes(logical);
              const miss = script.miss && open;
              const up = open || done;
              return (
                <div key={slot} className={`flex min-h-0 flex-col items-center justify-center gap-0.5 rounded-xl leading-none transition-all duration-300 ${
                  done ? 'scale-95 bg-emerald-50 ring-2 ring-emerald-300' : miss ? 'bg-rose-50 ring-2 ring-rose-300' : up ? (label ? 'bg-sky-50 shadow-md ring-2 ring-sky-300' : 'bg-amber-50 shadow-md ring-2 ring-amber-300') : 'bg-gradient-to-br from-lime-400 to-emerald-600 shadow-md'}`}>
                  {up ? (
                    <>
                      <span className="text-xl sm:text-2xl">{pic}</span>
                      {label && <span className="text-[0.5rem] font-black text-sky-700 uppercase sm:text-[0.6rem]">{label}</span>}
                      <span className="text-[0.6rem] font-black text-slate-900 sm:text-xs">{word}</span>
                    </>
                  ) : <span className="text-xl opacity-90">🌿</span>}
                </div>
              );
            })}
          </div>
        ),
        hand: script.tap === null ? IDLE : [...slotPos(perm.indexOf(script.tap)), true],
        step: f === 0 ? 0 : f < 9 ? 1 : 2,
        phase: ['Tap a card', 'An animal!', 'Its partner — a pair!', 'Tap a card', 'Not a pair', 'Remember where…', 'A pair!', 'A pair!', 'A pair!', 'All pairs found! 🎉', 'All pairs found! 🎉'][f]
      };
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

  // Light-Up Garden (2026-11-18, like the game): pictures pop up on the grid and hide. Example 1 is level 1 — tap where
  // they were. Examples 2–3 are level 2 on — pick each picture from the 4 below and put it back on its square.
  'light-up-garden': {
    frames: 8,
    draw: (f, ex) => {
      const lit = GARDEN[ex];
      const cells = Object.keys(lit).map(Number);
      const place = ex > 0;
      const two = cells.slice(0, 2);
      const cellPos = (i) => [28.25 + ((i % 3) + 0.5) * 14.5, 12 + (Math.floor(i / 3) + 0.5) * 19.3];
      const tray = place ? [lit[two[1]], '🐸', lit[two[0]], '🚀'] : [];
      const trayPos = (k) => [14 + k * 18.5 + 8.25, 85];
      // place mode: f3 pick A · f4 put A · f5 pick B · f6 put B · f7 done
      const placed = place ? (f >= 6 ? two : f >= 4 ? [two[0]] : []) : [];
      const holding = place && (f === 3 ? lit[two[0]] : f === 5 ? lit[two[1]] : null);
      const tapped = !place && f >= 3 ? cells.slice(0, Math.min(3, f - 2)) : [];
      const showing = f < 2;
      const shown = place ? two : cells;
      let hand = IDLE;
      if (place) {
        if (f === 3) hand = [...trayPos(tray.indexOf(lit[two[0]])), true];
        if (f === 4) hand = [...cellPos(two[0]), true];
        if (f === 5) hand = [...trayPos(tray.indexOf(lit[two[1]])), true];
        if (f === 6) hand = [...cellPos(two[1]), true];
      } else if (f >= 3 && f < 6) hand = [...cellPos(cells[f - 3]), true];
      return {
        body: (
          <>
            <div className="absolute top-[12%] left-1/2 grid h-[58%] aspect-square -translate-x-1/2 grid-cols-3 grid-rows-3 gap-1">
              {[...Array(9).keys()].map((i) => {
                const show = showing && shown.includes(i);
                const done = placed.includes(i);
                const hit = tapped.includes(i);
                return (
                  <div key={i} className={`grid place-items-center rounded-lg text-xl ring-1 ring-slate-200 transition-all sm:text-2xl ${show ? 'bg-amber-50 ring-2 ring-amber-300' : done ? 'bg-emerald-50 ring-2 ring-emerald-400' : hit ? 'bg-emerald-400' : holding ? 'bg-slate-100 ring-2 ring-violet-200' : 'bg-slate-100'}`}>
                    {show || done || hit ? lit[i] : ''}
                  </div>
                );
              })}
            </div>
            {place && f >= 2 && (
              <div className="absolute top-[74%] bottom-[4%] left-[14%] flex gap-[2%]">
                {tray.map((p, k) => {
                  const used = placed.some((c) => lit[c] === p);
                  return <span key={k} className={`grid aspect-square h-full place-items-center rounded-xl text-xl transition-all sm:text-2xl ${used ? 'bg-slate-100 opacity-30' : holding === p ? 'scale-105 bg-violet-100 ring-[3px] ring-violet-500' : 'bg-white shadow-sm ring-2 ring-slate-200'}`}>{p}</span>;
                })}
              </div>
            )}
          </>
        ),
        hand,
        step: f < 2 ? 0 : f < 7 ? 1 : 2,
        phase: f < 2 ? 'Look!' : f === 2 ? (place ? 'They hide — 4 pictures below' : 'They hide!') : f < 7 ? (place ? (f % 2 ? 'Pick a picture' : 'Put it where it was') : 'Tap where they were') : 'Well done! 🎉'
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

  // Colouring Book (2026-11-18, like the game): a cute character on the cream page, coloured for a look, then hidden;
  // the crayons below — pick one, tap a part, it fills.
  'picture-logic': {
    frames: 10,
    draw: (f, ex) => {
      const pic = BOOK[ex];
      const crayons = BOOK_COLOURS.filter((k) => pic.parts.some((p) => p.c === k));
      // Three colours to show: the first part of each of the first three crayons.
      const steps = crayons.slice(0, 3).map((k) => ({ k, part: pic.parts.findIndex((p) => p.c === k) }));
      const looking = f < 2;
      const solved = f >= 9;
      const stepNo = f >= 3 ? Math.floor((f - 3) / 2) : -1; // which colour is being done
      const coloured = new Set(steps.filter((_, i) => i < stepNo || (i === stepNo && (f - 3) % 2 === 1)).map((st) => st.part));
      const holding = stepNo >= 0 && stepNo < 3 ? steps[stepNo].k : null;
      const fillOf = (i, p) => (looking || solved || coloured.has(i) ? BOOK_HEX[p.c] : '#fff');
      const drawPos = ([x, y]) => [28.25 + x * 0.435, 9 + y * 0.58];
      const crayonPos = (j) => [22 + ((j % 4) + 0.5) * 14, 73 + Math.floor(j / 4) * 13 + 6];
      const decorAfter = (i) => (pic.decor || []).filter((d) => d.after === i);
      const line = (d, k) => <path key={k} d={d.d} fill={d.fill || 'none'} stroke={d.stroke || '#1f2937'} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />;
      let hand = IDLE;
      if (stepNo >= 0 && stepNo < 3) hand = (f - 3) % 2 === 0 ? [...crayonPos(crayons.indexOf(steps[stepNo].k)), true] : [...drawPos(pic.parts[steps[stepNo].part].at), true];
      return {
        body: (
          <>
            <div className="absolute top-[7%] left-1/2 h-[63%] aspect-square -translate-x-1/2 rounded-xl bg-[#fffaf0] p-[3%] ring-1 ring-amber-200">
              <svg viewBox="-2 -2 104 104" className={`h-full w-full rounded-lg bg-white ${solved ? 'drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]' : ''}`} aria-hidden>
                {pic.parts.map((p, i) => [
                  <path key={i} d={p.d} fill={fillOf(i, p)} stroke="#1f2937" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" className="transition-[fill] duration-300" />,
                  ...decorAfter(i).map((d, k) => line(d, `a${i}${k}`))
                ])}
                {(pic.decor || []).filter((d) => d.after == null).map((d, i) => line(d, `d${i}`))}
              </svg>
              {looking && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/85 px-2 text-[0.6rem] font-black text-white">⏳ 7s</span>}
            </div>
            <div className="absolute top-[73%] bottom-[2%] left-[22%] grid w-[56%] grid-cols-4 gap-x-1 rounded-xl bg-gradient-to-b from-amber-50 to-orange-50 ring-1 ring-amber-200">
              {crayons.map((k) => (
                <span key={k} className={`flex items-center justify-center rounded-lg transition-transform ${holding === k ? '-translate-y-0.5 bg-white ring-2 ring-slate-900' : ''}`}>
                  <svg viewBox="0 0 28 56" className="h-[90%] max-h-9" aria-hidden>
                    <path d="M8 16 L14 2 L20 16 Z" fill={BOOK_HEX[k]} stroke="rgba(0,0,0,0.25)" />
                    <rect x="6" y="15" width="16" height="39" rx="3" fill={BOOK_HEX[k]} stroke="rgba(0,0,0,0.25)" />
                    <rect x="6" y="22" width="16" height="4" fill="rgba(255,255,255,0.55)" />
                  </svg>
                </span>
              ))}
            </div>
          </>
        ),
        hand,
        step: looking ? 0 : f < 9 ? 1 : 2,
        phase: looking ? 'Look at the colours!' : f === 2 ? 'It hides — colour from memory' : solved ? `You coloured ${pic.name}! 🎉` : (f - 3) % 2 === 0 ? 'Pick a crayon' : 'Tap the part'
      };
    }
  },

  // Treasure Path: an island map — pick up the gem 💎 first, then the locked chest 🔐 opens 💰 (2026-11-18).
  // Frames: look · one frame per arrow card · press Go · one frame per step walked · the chest opens.
  'treasure-path': {
    frames: 15,
    draw: (f, ex) => {
      const m = TREASURE[ex];
      const n = m.moves.length;
      const addEnd = n;             // frames 1..n add the cards
      const goAt = n + 1;           // the Go press
      const walked = f > goAt ? Math.min(n, f - goAt) : 0;
      const at = walk(m.start, m.moves, walked);
      const gemAt = walk(m.start, m.moves, m.gem);
      const goal = walk(m.start, m.moves, n);
      const hasGem = walked >= m.gem;
      const won = walked >= n;
      const cards = m.moves.slice(0, Math.min(n, f));
      const trail = Array.from({ length: walked + 1 }, (_, k) => walk(m.start, m.moves, k).join(','));
      return {
        body: (
          <>
            <div className="absolute top-[12%] bottom-[4%] left-[3%] aspect-square rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 p-1">
              <div className="grid h-full w-full grid-cols-4 overflow-hidden rounded-xl">
                {[...Array(16).keys()].map((i) => {
                  const r = Math.floor(i / 4); const c = i % 4; const k = `${r},${c}`;
                  const here = at[0] === r && at[1] === c;
                  const water = m.water.includes(k);
                  return (
                    <div key={k} className={`grid place-items-center text-lg sm:text-2xl ${water ? 'tp-water' : walked && trail.includes(k) ? 'tp-sand' : (r + c) % 2 ? 'tp-grass-a' : 'tp-grass-b'}`}>
                      {here ? <span className="tp-explorer">{won ? '🥳' : '🧒'}</span>
                        : m.rocks.includes(k) ? <span className="tp-drop">🪨</span>
                          : water ? <span className="text-sm">🌊</span>
                            : gemAt[0] === r && gemAt[1] === c && !hasGem ? <span className="tp-gem">💎</span>
                              : goal[0] === r && goal[1] === c ? <span className={hasGem ? 'tp-goal' : ''}>{hasGem ? '💰' : '🔐'}</span> : ''}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="tp-plank absolute top-[12%] right-[3%] flex h-[24%] w-[29%] flex-wrap content-center items-center justify-center gap-1 rounded-xl p-1">
              {cards.length === 0 && <span className="text-center text-xs font-bold text-amber-50">Your arrows</span>}
              {cards.map((d, i) => <span key={i} className={`grid h-6 w-6 place-items-center rounded-md text-sm font-black text-white ${walked && !won && i === walked - 1 ? 'bg-amber-500' : 'bg-teal-500'}`}>{ARROW[d]}</span>)}
            </div>
            <div className="absolute top-[44%] right-[3%] grid h-[29%] w-[29%] grid-cols-3 grid-rows-2 gap-1">
              {['.', 'u', '.', 'l', 'd', 'r'].map((d, i) => d === '.' ? <span key={i} /> : <span key={i} className="grid place-items-center rounded-lg bg-gradient-to-b from-sky-400 to-blue-600 text-base font-black text-white shadow-[0_2px_0_#1e40af]">{ARROW[d]}</span>)}
            </div>
            <span className={`absolute right-[3%] bottom-[4%] grid h-[16%] w-[29%] place-items-center rounded-xl bg-gradient-to-b from-orange-400 to-rose-500 text-base font-black text-white shadow-[0_3px_0_#be123c] ${f === goAt ? 'translate-y-0.5' : ''}`}>Go ▶</span>
          </>
        ),
        hand: f >= 1 && f <= addEnd ? [...PAD_POS[m.moves[f - 1]], true] : f === goAt ? [82.5, 88, true] : IDLE,
        step: f === 0 ? 0 : f <= addEnd ? 1 : 2,
        phase: f === 0 ? 'Gem first, then the chest' : f <= addEnd ? 'Add arrow cards' : !hasGem ? 'Go! Off to the gem…' : !won ? 'Got the gem 💎 — the chest opens!' : 'Treasure found! 🎉'
      };
    }
  },

  // Odd One Out (2026-11-18, like the game): a coloured stage, four picture cards (or word cards), tap the odd one —
  // it bounces with a ✓ — then the secret rule is told.
  'odd-one-out': {
    frames: 7,
    draw: (f, ex) => {
      const [title, bg, cards, odd, why, words] = [
        ['Who doesn’t fit in? 🕵️', 'from-emerald-400 via-teal-400 to-cyan-500', ['🍎', '🍌', '🥕', '🍇'], 2, '🍎 🍌 🍇 are fruits — 🥕 is a vegetable.', false],
        ['Up in the sky? ☁️', 'from-sky-300 via-sky-400 to-blue-500', ['🦅', '✈️', '🦋', '🐘'], 3, '🦅 ✈️ 🦋 can fly — 🐘 cannot.', false],
        ['Read and think 📖', 'from-violet-400 via-purple-400 to-indigo-500', ['Monday', 'apple', 'Friday', 'Sunday'], 1, 'Monday, Friday, Sunday are days.', true]
      ][ex];
      const picked = f >= 3;
      const cardPos = (i) => [12 + ((i % 2) + 0.5) * 38, 22 + (Math.floor(i / 2) + 0.5) * 27];
      return {
        body: (
          <div className={`absolute inset-0 bg-gradient-to-br ${bg}`}>
            <span className="absolute top-[3%] right-[3%] rounded-full bg-white/90 px-2 py-0.5 text-[0.65rem] font-black text-slate-900 shadow-sm sm:text-xs">{title}</span>
            <div className="absolute inset-x-[12%] top-[22%] bottom-[24%] grid grid-cols-2 grid-rows-2 gap-2">
              {cards.map((c, i) => (
                <div key={c} className={`relative grid place-items-center rounded-2xl transition-all duration-300 ${words ? ['bg-amber-50', 'bg-sky-50', 'bg-pink-50', 'bg-lime-50'][i] : 'bg-white/95'} ${
                  picked && i === odd ? '-translate-y-1 shadow-[0_4px_0_#047857] ring-[3px] ring-emerald-400' : picked ? 'scale-95 opacity-60' : 'shadow-[0_4px_0_rgba(15,23,42,0.18)]'}`}>
                  <span className={words ? 'text-sm font-black text-slate-900 sm:text-base' : 'text-2xl drop-shadow sm:text-3xl'}>{c}</span>
                  {picked && i === odd && <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-emerald-500 text-xs font-black text-white">✓</span>}
                </div>
              ))}
            </div>
            {f >= 4 && <p className="absolute inset-x-[4%] bottom-[3%] truncate rounded-xl bg-emerald-50 px-2 py-1 text-center text-[0.65rem] font-bold text-emerald-900 ring-1 ring-emerald-200 sm:text-xs">💡 {why}</p>}
          </div>
        ),
        hand: f === 2 || f === 3 ? [...cardPos(odd), f === 3] : IDLE,
        step: f === 0 ? 0 : f < 3 ? 1 : 2,
        phase: ['Four cards', 'Three share a rule', 'Which is odd?', 'Found it!', 'Read why 💡', 'Read why 💡', 'Read why 💡'][f]
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

  // Pattern Path (2026-11-18, like the game): the row on its stage — a train, a necklace or stepping stones — with a
  // glowing ?, four big picture choices; the right one fills the gap and what repeats is shown.
  'pattern-path': {
    frames: 7,
    draw: (f, ex) => {
      const [style, title, bg, row, opts, right, unit] = [
        ['train', '🚂 Fill the train!', 'from-sky-300 via-sky-400 to-emerald-300', ['🐶', '🐸', '🐶', '🐸', '🐶'], ['🐱', '🐸', '🐶', '🐵'], 1, ['🐶', '🐸']],
        ['beads', '📿 Finish the necklace!', 'from-fuchsia-400 via-pink-400 to-rose-300', ['🔴', '🔴', '🔵', '🔴', '🔴'], ['🔴', '🟢', '🔵', '🟡'], 2, ['🔴', '🔴', '🔵']],
        ['stones', '🪨 Cross the river!', 'from-cyan-400 via-sky-500 to-blue-600', ['⭐', '🌙', '☀️', '⭐', '🌙'], ['⭐', '☀️', '🌙', '❤️'], 1, ['⭐', '🌙', '☀️']]
      ][ex];
      const picked = f >= 3;
      const spot = (item, i, gap) => {
        const content = gap ? (picked ? opts[right] : <span className="font-black text-white">?</span>) : item;
        const glow = gap ? (picked ? 'ring-2 ring-emerald-300' : 'pp-glow ring-2 ring-white') : f >= 1 && f < 3 && i < unit.length ? 'ring-2 ring-amber-300' : '';
        if (style === 'train') return <span className={`grid aspect-square w-full place-items-center rounded-t-lg rounded-b-sm ${gap && !picked ? 'bg-white/30' : ['bg-rose-400', 'bg-amber-400', 'bg-emerald-400', 'bg-sky-400', 'bg-violet-400', 'bg-rose-400'][i]} ${glow}`}><span className="grid h-[72%] w-[72%] place-items-center rounded-md bg-white/85 text-base sm:text-xl">{content}</span></span>;
        if (style === 'stones') return <span className={`grid aspect-[4/3] w-full place-items-center rounded-[50%] text-base shadow-[0_3px_0_rgba(15,23,42,0.35)] sm:text-xl ${gap && !picked ? 'bg-white/25' : 'bg-gradient-to-b from-stone-200 to-stone-400'} ${glow}`}>{content}</span>;
        return <span className={`grid aspect-square w-full place-items-center rounded-full text-base sm:text-xl ${gap && !picked ? 'bg-white/30' : 'bg-gradient-to-br from-white to-pink-100'} ${glow}`}>{content}</span>;
      };
      const optPos = (i) => [20 + ((i % 2) + 0.5) * 30, 56 + (Math.floor(i / 2) + 0.5) * 20];
      return {
        body: (
          <>
            <div className={`absolute inset-x-[3%] top-[3%] h-[48%] overflow-hidden rounded-2xl bg-gradient-to-br ${bg}`}>
              <span className="absolute top-[5%] right-[3%] rounded-full bg-white/90 px-2 py-0.5 text-[0.6rem] font-black text-slate-900 sm:text-xs">{title}</span>
              <div className="absolute inset-x-[3%] top-[30%] bottom-[6%] flex items-center justify-center gap-[1.5%]">
                {style === 'train' && <span className="w-[12%] text-center text-2xl leading-none sm:text-3xl">🚂</span>}
                {style === 'beads' && <span aria-hidden className="absolute inset-x-[4%] top-1/2 h-0.5 bg-amber-200" />}
                {[...row, null].map((item, i) => <span key={i} className={`relative flex items-center ${style === 'train' ? 'w-[12%]' : 'w-[13.5%]'}`}>{spot(item, i, item === null)}</span>)}
              </div>
            </div>
            <div className="absolute inset-x-[20%] top-[56%] bottom-[4%] grid grid-cols-2 grid-rows-2 gap-1.5">
              {opts.map((o, i) => (
                <div key={o} className={`relative grid place-items-center rounded-xl bg-white text-xl transition-all sm:text-2xl ${picked && i === right ? '-translate-y-0.5 shadow-[0_3px_0_#047857] ring-[3px] ring-emerald-400' : picked ? 'scale-95 opacity-50' : 'shadow-[0_3px_0_rgba(15,23,42,0.15)] ring-2 ring-slate-100'}`}>
                  {o}
                  {picked && i === right && <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-emerald-500 text-xs font-black text-white">✓</span>}
                </div>
              ))}
            </div>
          </>
        ),
        hand: f === 2 || f === 3 ? [...optPos(right), f === 3] : IDLE,
        step: f === 0 ? 0 : f < 3 ? 1 : 2,
        phase: f === 0 ? 'Look at the row' : f < 3 ? `It repeats ${unit.join('')}` : 'Correct! 🎉'
      };
    }
  },

  // Treasure Path for Young Thinkers (2026-11-18, like their game): the user's ancient-map picture; a riddle card with a
  // wooden banner and bright answer buttons; a right answer walks the explorer on, and at last the chest is reached.
  'treasure-path:young': {
    frames: 11,
    draw: (f, ex) => {
      const riddles = [
        [['I say “Moo”. Who am I?', ['🐶', '🐄', '🐔'], 1], ['What comes next? 🔴🔵🔴🔵', ['🔵', '🔴', '🟢'], 1]],
        [['How many ⭐? ⭐⭐⭐⭐', ['3', '5', '4'], 2], ['Which is the BIGGEST?', ['🐭', '🐘', '🐈'], 1]],
        [['Today is Thursday. Tomorrow?', ['Sunday', 'Friday', 'Monday'], 1], ['Opposite of HOT 🔥?', ['❄️', '☀️', '⬆️'], 0]]
      ][ex];
      // f0 map · f1 riddle 1 · f2 point · f3 tap · f4 walk · f5 riddle 2 · f6 point · f7 tap · f8 walk · f9–10 treasure
      const at = f >= 9 ? 4 : f >= 8 ? 2 : f >= 4 ? 1 : 0;
      const q = f >= 5 ? riddles[1] : riddles[0];
      const place = TH_PLACES[f >= 5 ? 1 : 0];
      const showQ = (f >= 1 && f <= 3) || (f >= 5 && f <= 7);
      const tapped = f === 3 || f === 7;
      const pointing = f === 2 || f === 6 || tapped;
      const spot = TH_NODES[at];
      const pills = ['from-orange-400 to-orange-500', 'from-violet-500 to-violet-700', 'from-lime-500 to-green-600'];
      const optPos = (i) => [24 + i * 26, 87];
      return {
        body: (
          <>
            <div className="absolute top-[3%] left-1/2 h-[55%] -translate-x-1/2 overflow-hidden rounded-xl" style={{ aspectRatio: `${TH_W} / ${TH_H}` }}>
              <img src={thMapArt} alt="" className="absolute inset-0 h-full w-full" />
              {at > 0 && <span className="th-medal absolute aspect-square w-[15.6%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${TH_NODES[0][0]}%`, top: `${TH_NODES[0][1]}%` }} />}
              {at === 4 && <span className="tp-goal absolute -translate-x-1/2 -translate-y-1/2 text-2xl" style={{ left: `${TH_NODES[4][0]}%`, top: `${TH_NODES[4][1]}%` }}>✨</span>}
              <img src={thExplorerArt} alt="" className={`absolute aspect-square w-[15.6%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-700 ${f === 4 || f === 8 ? 'tp-walking' : ''}`} style={{ left: `${spot[0]}%`, top: `${spot[1]}%` }} />
            </div>
            {showQ && (
              <div className="th-card absolute inset-x-[6%] top-[66%] bottom-[2%] rounded-2xl px-2 pt-1">
                <span className="th-banner absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-md px-2 py-0.5 text-[0.6rem] font-black whitespace-nowrap text-amber-50 sm:text-xs"><img src={place.art} alt="" className="h-4 w-4" />{place.name}</span>
                <p className="mt-2.5 truncate text-center text-xs font-black text-[#1e2a5a] sm:text-sm">{q[0]}</p>
                <div className="absolute inset-x-[5%] top-[52%] bottom-[10%] grid grid-cols-3 gap-1.5">
                  {q[1].map((o, i) => (
                    <span key={o} className={`grid place-items-center rounded-full bg-gradient-to-b text-xs font-black text-white sm:text-sm ${pills[i]} ${tapped && i === q[2] ? 'ring-2 ring-emerald-300' : tapped ? 'opacity-50' : ''}`}>{o}</span>
                  ))}
                </div>
              </div>
            )}
            {(f === 0 || f === 4 || f === 8) && <p className="absolute inset-x-[4%] top-[72%] text-center text-sm font-black text-amber-900">{f === 0 ? 'Solve riddles to reach the chest!' : 'Walking on… 🚶'}</p>}
            {f >= 9 && <p className="oo-pop th-card absolute inset-x-[12%] top-[68%] rounded-xl py-2 text-center text-base font-black text-amber-900">💰 Treasure found! 🎉</p>}
          </>
        ),
        hand: pointing ? [...optPos(q[2]), tapped] : IDLE,
        step: f === 0 ? 0 : f < 9 ? 1 : 2,
        phase: f === 0 ? 'The ancient map' : showQ ? (tapped ? 'Correct!' : 'Solve the riddle') : f < 9 ? 'Walk on!' : 'Treasure! 🎉'
      };
    }
  },

  // Mini Maze Mission (2026-11-18, like the game): a garden maze in a wooden frame, hedges for walls; walk the rabbit
  // with the blue arrows, grab the star, keep away from the lion, reach the carrot.
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
            <div className="mm-frame absolute top-[12%] bottom-[4%] left-[3%] aspect-square rounded-xl p-1">
            <div className="grid h-full w-full grid-cols-4 grid-rows-4 overflow-hidden rounded-lg">
              {[...Array(16).keys()].map((i) => {
                const r = Math.floor(i / 4); const c = i % 4; const k = `${r},${c}`; const w = wallsOf(m, r, c);
                const here = at[0] === r && at[1] === c;
                return (
                  <div key={k} className={`grid place-items-center border-[3px] text-xl sm:text-2xl ${r === m.start[0] && c === m.start[1] ? 'bg-lime-200' : (r + c) % 2 ? 'bg-[#8fd94a]' : 'bg-[#9ae354]'} ${w.n && r > 0 ? 'border-t-green-700' : 'border-t-transparent'} ${w.s && r < 3 ? 'border-b-green-700' : 'border-b-transparent'} ${w.w && c > 0 ? 'border-l-green-700' : 'border-l-transparent'} ${w.e && c < 3 ? 'border-r-green-700' : 'border-r-transparent'}`}>
                    {here ? <span className="tp-explorer">🐰</span> : goal[0] === r && goal[1] === c ? <span className="tp-goal">🥕</span> : k === m.star && !starTaken ? <span className="mm-star">⭐</span> : k === m.puddle ? <span className="tp-drop">🦁</span> : ''}
                  </div>
                );
              })}
            </div>
            </div>
            <div className="absolute top-[23%] right-[3%] grid h-[62%] w-[31%] grid-cols-3 grid-rows-3 gap-1">
              {['.', 'u', '.', 'l', 'b', 'r', '.', 'd', '.'].map((d, i) => (d === '.' ? <span key={i} /> : d === 'b'
                ? <span key={i} className="grid place-items-center rounded-full bg-emerald-100 text-lg">🐰</span>
                : <span key={i} className={`grid place-items-center rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 text-base font-black text-white ${dir === d ? 'translate-y-0.5 shadow-[0_1px_0_#1e40af]' : 'shadow-[0_3px_0_#1e40af]'}`}>{ARROW[d]}</span>))}
            </div>
            <span className="absolute top-1.5 right-2 z-20 rounded-full bg-white/95 px-2 py-0.5 text-xs font-black text-amber-600 ring-1 ring-amber-100">⭐ {starTaken ? 1 : 0}/1</span>
          </>
        ),
        hand: dir ? [...MAZE_PAD[dir], true] : IDLE,
        step: f < 1 ? 0 : won ? 2 : 1,
        phase: f < 1 ? 'Rabbit to the carrot — not the lion!' : won ? 'Yummy carrot! 🥕' : f === 1 ? 'Which way?' : 'Step by step'
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
