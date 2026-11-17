/** Game-specific demos (see demos/README in GameDemo.jsx). Filled in by group youngB: Young Thinkers, bright and big. */

// Count & Catch demo (2026-11-16): a sum, things falling, the basket catching the right ones.
const COUNT_SUMS = [{ sum: '3 + 2', answer: 5, want: '🍎', other: '🍌' }, { sum: '2 × 3', answer: 6, want: '⭐', other: '🍓' }, { sum: '8 − 4', answer: 4, want: '🍊', other: '🥕' }];

/** A box placed by its left/top/width/height in % of the demo. */
// eslint-disable-next-line react-refresh/only-export-components -- a layout helper of these demos, never hot-reloaded on its own
function Box({ l, t, w, h, className = '', style, children }) {
  return <div className={`absolute ${className}`} style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, ...style }}>{children}</div>;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---- Spelling Fix / Sound Alike: QuizGame's young screen — big picture, the prompt, big option buttons. ---- */
function quiz(f, { pic, prompt, opts, right, filled }) {
  const picked = f >= 2;
  const n = opts.length;
  const xs = n === 2 ? [27, 73] : [18, 50, 82];
  const w = n === 2 ? 40 : 28;
  return {
    body: (
      <div className="relative h-full bg-white">
        <Box l={0} t={10} w={100} h={28} className="grid place-items-center text-5xl leading-none">{pic}</Box>
        <Box l={4} t={40} w={92} h={20} className="grid place-items-center text-center text-base font-black text-slate-900">
          {prompt && (picked && filled ? prompt.replace('___', filled) : prompt.replace('___', ' ? '))}
          {!prompt && 'Which word is right?'}
        </Box>
        {opts.map((o, i) => (
          <Box key={o} l={xs[i] - w / 2} t={66} w={w} h={24}
            className={`grid place-items-center rounded-2xl text-lg font-black ring-2 ring-inset ${picked && i === right ? 'bg-emerald-50 text-emerald-800 ring-emerald-300' : picked ? 'bg-slate-50 text-slate-400 ring-slate-200' : 'bg-slate-50 text-slate-900 ring-slate-200'}`}>
            {picked && i === right ? `✓ ${o}` : o}
          </Box>
        ))}
      </div>
    ),
    hand: f === 0 ? [88, 92, false] : [xs[right], 80, f === 2],
    step: f === 0 ? 0 : f === 1 ? 1 : 2
  };
}

/* ---- Typing Sprint: picture, the word with typed letters green and the next one amber, the glowing keyboard. ---- */
const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const keyAt = (ch) => {
  const r = KEY_ROWS.findIndex((row) => row.includes(ch.toUpperCase()));
  const row = KEY_ROWS[r];
  return [50 + (row.indexOf(ch.toUpperCase()) - (row.length - 1) / 2) * 9.6, 66 + r * 12];
};

/* ---- Picture Word Hunt: 4×4 letter grid; tap a word's first letter, then its last. ---- */
const HUNT = [
  { grid: ['CATB', 'MOPE', 'RSUN', 'LIKD'], words: [['CAT', '🐱', 0, 0, 0, 1], ['SUN', '☀️', 2, 1, 0, 1]] },
  { grid: ['KAPD', 'BUSO', 'TEMG', 'LIRN'], words: [['BUS', '🚌', 1, 0, 0, 1], ['DOG', '🐶', 0, 3, 1, 0]] },
  { grid: ['PRAT', 'IOLM', 'GUBE', 'SHEN'], words: [['PIG', '🐷', 0, 0, 1, 0], ['HEN', '🐔', 3, 1, 0, 1]] }
];
const HUNT_TONES = ['bg-amber-300', 'bg-sky-300'];
const cellsOf = ([word, , r, c, dr, dc]) => word.split('').map((_, i) => `${r + dr * i},${c + dc * i}`);
const huntPos = (r, c) => [3 + (c + 0.5) * 15.25, 14 + (r + 0.5) * 20.5];

/* ---- Rhyme Detective ---- */
const RHYME = [
  { target: ['🐱', 'cat'], cards: [['🎩', 'hat'], ['🐶', 'dog'], ['🦇', 'bat'], ['☀️', 'sun']], yes: [0, 2] },
  { target: ['🐝', 'bee'], cards: [['🐟', 'fish'], ['🔑', 'key'], ['🚗', 'car'], ['🌳', 'tree']], yes: [1, 3] },
  { target: ['🦊', 'fox'], cards: [['📦', 'box'], ['🐷', 'pig'], ['🌙', 'moon'], ['🧦', 'socks']], yes: [0, 3] }
];
const rhymePos = (i) => [28 + (i % 2) * 44, 43 + Math.floor(i / 2) * 22];

/* ---- Word Balloon Pop ---- */
const BALLOONS = [['🐱', ['kat', 'cat', 'cot'], 1], ['🐟', ['fsh', 'fiss', 'fish'], 2], ['☀️', ['sun', 'son', 'snu'], 0]];
const BALLOON_COLOURS = ['#f43f5e', '#3b82f6', '#22c55e'];

/* ---- Math Sprint: two quick questions per example, the clock bar running down. ---- */
const SPRINT = [
  [{ pic: ['🍎', 3, 2, '+'], text: '3 + 2 = ?', opts: [4, 5, 6], right: 1 }, { text: '4 + 4 = ?', opts: [8, 6, 9], right: 0 }],
  [{ pic: ['⭐', 5, 2, '−'], text: '5 − 2 = ?', opts: [2, 4, 3], right: 2 }, { text: '9 − 3 = ?', opts: [5, 6, 7], right: 1 }],
  [{ text: '7 + 5 = ?', opts: [11, 12, 13], right: 1 }, { text: '6 × 3 = ?', opts: [18, 16, 21], right: 0 }]
];

/* ---- Fruit Shop ---- */
const SHOP = [
  { shelf: [['🍎', 2], ['🍌', 3], ['🍊', 1]], list: '🍎×2 🍌×1', taps: [0, 0, 1], total: 7 },
  { shelf: [['🥭', 5], ['🍐', 2], ['🍋', 1]], list: '🍐×2 🍋×1', taps: [1, 1, 2], total: 5 },
  { shelf: [['🍉', 9], ['🥭', 4], ['🍎', 2]], list: '🥭×2', taps: [1, 1], total: 8, paid: 10 }
];

/* ---- Missing Number Race ---- */
const TRAINS = [
  { seq: [3, 4, 5, 6, 7], gap: 3, tiles: [8, 6, 2], right: 1 },
  { seq: [10, 9, 8, 7, 6], gap: 3, tiles: [7, 5, 9], right: 0 },
  { seq: [2, 4, 6, 8, 10], gap: 2, tiles: [5, 7, 6], right: 2 }
];
const CAR_TONES = ['bg-rose-400', 'bg-sky-400', 'bg-amber-400', 'bg-emerald-400', 'bg-violet-400'];

/* ---- Train Builder: hook carriages that add up to the station number, then Go. ---- */
const TRAIN_DEMO = [{ target: 12, yard: [5, 3, 7, 2], use: [0, 2] }, { target: 9, yard: [4, 6, 2, 3], use: [1, 3] }, { target: 15, yard: [8, 4, 7, 9], use: [0, 2] }];
const TRAIN_TONES = ['bg-rose-500', 'bg-sky-500', 'bg-amber-400', 'bg-emerald-500'];

export const DEMOS = {
  'spelling-fix': {
    frames: 6,
    draw: (f, ex) => {
      const [pic, opts, right] = [['🐱', ['kat', 'cat', 'catt'], 1], ['🐶', ['dog', 'dogg', 'dawg'], 0], ['☀️', ['sunn', 'zun', 'sun'], 2]][ex];
      return { ...quiz(f, { pic, opts, right }), phase: f === 0 ? 'Read the spellings' : f === 1 ? 'Only one is right' : 'Correct!' };
    }
  },

  'sound-alike': {
    frames: 6,
    draw: (f, ex) => {
      const [pic, prompt, opts, right] = [['🌊', 'I swim in the ___.', ['see', 'sea'], 1], ['☀️', 'The ___ is hot.', ['son', 'sun'], 1], ['🐦', 'I can ___ a bird.', ['see', 'sea'], 0]][ex];
      return { ...quiz(f, { pic, prompt, opts, right, filled: opts[right] }), phase: f === 0 ? 'Read the sentence' : f === 1 ? 'They sound the same' : 'It fits!' };
    }
  },

  'typing-sprint': {
    frames: 8,
    draw: (f, ex) => {
      const [pic, word] = [['🍎', 'apple'], ['🐟', 'fish'], ['⭐', 'star']][ex];
      const typed = clamp(f, 0, word.length);
      const done = f > word.length;
      const next = done ? null : word[typed];
      return {
        body: (
          <div className="relative h-full bg-white">
            <Box l={0} t={12} w={30} h={40} className="grid place-items-center text-5xl leading-none">{pic}</Box>
            <Box l={30} t={18} w={64} h={28} className={`grid place-items-center rounded-2xl font-mono text-2xl font-black tracking-widest ring-1 ring-inset ${done ? 'bg-emerald-50 text-emerald-700 ring-emerald-300' : 'bg-slate-50 text-slate-900 ring-slate-200'}`}>
              <span>{word.split('').map((ch, i) => <span key={i} className={i < typed ? 'text-emerald-600' : i === typed && !done ? 'rounded-sm bg-amber-200' : ''}>{ch}</span>)}{done && ' ✓'}</span>
            </Box>
            {KEY_ROWS.map((row, r) => (
              <div key={row} className="absolute inset-x-0 flex justify-center gap-[1%]" style={{ top: `${60 + r * 12}%`, height: '11%' }}>
                {row.split('').map((k) => <span key={k} className={`grid w-[8.6%] place-items-center rounded-md text-xs font-black ${next && k === next.toUpperCase() ? 'bg-amber-400 text-slate-900 ring-2 ring-amber-200' : 'bg-slate-100 text-slate-600'}`}>{k}</span>)}
              </div>
            ))}
          </div>
        ),
        hand: f >= 1 && !done ? [...keyAt(word[f - 1]), true] : [92, 40, false],
        step: f === 0 ? 0 : done ? 2 : 1,
        phase: f === 0 ? 'Read the word' : done ? 'Typed it!' : 'Type it'
      };
    }
  },

  'picture-word-hunt': {
    frames: 8,
    draw: (f, ex) => {
      const { grid, words } = HUNT[ex];
      const found = words.filter((_, i) => f >= 2 + i * 2);
      const owner = {};
      found.forEach((w, i) => cellsOf(w).forEach((k) => { owner[k] = i; }));
      const picking = f === 1 || f === 3 ? words[(f - 1) / 2] : null;
      const tapAt = f >= 1 && f <= 4 ? words[Math.floor((f - 1) / 2)] : null;
      const tapCell = tapAt && (f % 2 === 1 ? [tapAt[2], tapAt[3]] : [tapAt[2] + tapAt[4] * 2, tapAt[3] + tapAt[5] * 2]);
      return {
        body: (
          <div className="relative h-full bg-amber-50">
            <Box l={3} t={14} w={61} h={82} className="grid grid-cols-4 grid-rows-4 gap-1">
              {grid.flatMap((row, r) => row.split('').map((ch, c) => {
                const k = `${r},${c}`;
                const start = picking && picking[2] === r && picking[3] === c;
                return <span key={k} className={`grid place-items-center rounded-lg text-lg font-black ring-2 ring-inset ${owner[k] !== undefined ? `${HUNT_TONES[owner[k]]} ring-transparent` : start ? 'bg-indigo-500 text-white ring-indigo-700' : 'bg-white text-slate-900 ring-amber-200'}`}>{ch}</span>;
              }))}
            </Box>
            <Box l={67} t={18} w={31} h={76} className="flex flex-col justify-center gap-2">
              {words.map((w, i) => (
                <span key={w[0]} className={`flex items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-sm font-black ring-2 ring-inset ${found.includes(w) ? `${HUNT_TONES[i]} ring-transparent line-through` : 'bg-white ring-amber-200'}`}>
                  <span className="text-2xl leading-none">{w[1]}</span>{w[0]}
                </span>
              ))}
            </Box>
          </div>
        ),
        hand: tapCell ? [...huntPos(tapCell[0], tapCell[1]), true] : [92, 92, false],
        step: f === 0 ? 0 : f <= 4 ? 1 : 2,
        phase: f === 0 ? 'Find the picture words' : f % 2 === 1 && f < 5 ? 'Tap the first letter' : f < 5 ? 'Now the last letter' : 'All found!'
      };
    }
  },

  'rhyme-detective': {
    frames: 7,
    draw: (f, ex) => {
      const { target, cards, yes } = RHYME[ex];
      const picked = yes.slice(0, clamp(f, 0, 2));
      const checked = f >= 4;
      return {
        body: (
          <div className="relative h-full bg-white">
            <Box l={36} t={4} w={44} h={24} className="flex items-center justify-center gap-1.5 rounded-2xl bg-fuchsia-50 ring-2 ring-fuchsia-200 ring-inset">
              <span className="text-3xl leading-none">{target[0]}</span><span className="text-xl font-black text-slate-900">{target[1]}</span><span className="text-sm">🔊</span>
            </Box>
            {cards.map(([emo, w], i) => {
              const [x, y] = rhymePos(i);
              const on = picked.includes(i);
              return (
                <Box key={w} l={x - 20} t={y - 10} w={40} h={20}
                  className={`flex items-center justify-center gap-1.5 rounded-xl ring-2 ring-inset ${checked && yes.includes(i) ? 'bg-emerald-100 ring-emerald-500' : checked ? 'bg-slate-50 opacity-60 ring-slate-200' : on ? 'bg-indigo-100 ring-indigo-500' : 'bg-amber-50 ring-amber-200'}`}>
                  <span className="text-2xl leading-none">{emo}</span><span className="text-sm font-black text-slate-800">{w}</span>{on && !checked && <span className="text-xs">✔️</span>}
                </Box>
              );
            })}
            <Box l={32} t={81} w={36} h={15} className={`grid place-items-center rounded-xl text-sm font-black text-white ${checked ? 'bg-emerald-500' : 'bg-emerald-600'}`}>{checked ? 'Rhymes! 🎉' : 'Check ✓'}</Box>
          </div>
        ),
        hand: f === 1 || f === 2 ? [...rhymePos(yes[f - 1]), true] : f === 3 ? [50, 88, true] : [92, 60, false],
        step: f === 0 ? 0 : f < 3 ? 1 : 2,
        phase: f === 0 ? 'Say the word' : f < 3 ? 'Tap the rhymes' : f === 3 ? 'Press Check' : 'They rhyme!'
      };
    }
  },

  'letter-builder': {
    frames: 8,
    draw: (f, ex) => {
      const [pic, word, tiles] = [['🐱', 'CAT', 'TAC'], ['☀️', 'SUN', 'NUS'], ['🐶', 'DOG', 'GOD']][ex];
      // f1: a wrong tile goes in, f2: it is tapped to come back, f3–5: the right letters in order.
      const placed = f === 1 ? [tiles[0]] : f >= 3 ? word.slice(0, clamp(f - 2, 0, 3)).split('') : [];
      const done = f >= 6;
      const tileX = (i) => 50 + (i - 1) * 18;
      const usedTile = (i) => placed.includes(tiles[i]) && (f !== 1 || i === 0);
      const handTile = f === 1 ? 0 : f >= 3 && f <= 5 ? tiles.indexOf(word[f - 3]) : -1;
      return {
        body: (
          <div className="relative h-full bg-white">
            <Box l={0} t={8} w={100} h={28} className="grid place-items-center text-5xl leading-none">{pic}</Box>
            {[0, 1, 2].map((s) => (
              <Box key={s} l={tileX(s) - 7} t={40} w={14} h={22}
                className={`grid place-items-center rounded-xl border-2 border-dashed text-2xl font-black ${done ? 'border-emerald-400 bg-emerald-100 text-emerald-700' : placed[s] ? 'border-fuchsia-300 bg-fuchsia-50 text-slate-900' : 'border-slate-200 bg-white text-transparent'}`}>{placed[s] || '·'}</Box>
            ))}
            {tiles.split('').map((ch, i) => (
              <Box key={ch} l={tileX(i) - 7} t={70} w={14} h={22}
                className={`grid place-items-center rounded-xl text-2xl font-black ${usedTile(i) ? 'bg-slate-100 text-transparent' : 'bg-gradient-to-b from-fuchsia-400 to-purple-600 text-white shadow-sm'}`}>{ch}</Box>
            ))}
          </div>
        ),
        hand: handTile >= 0 ? [tileX(handTile), 80, true] : f === 2 ? [tileX(0), 50, true] : [90, 88, false],
        step: f === 0 ? 0 : f === 2 ? 2 : 1,
        phase: f === 0 ? 'Look at the picture' : f === 1 ? 'Oops, wrong letter' : f === 2 ? 'Tap it to take back' : done ? 'Spelled it!' : 'Spell the word'
      };
    }
  },

  'word-balloon-pop': {
    frames: 7,
    draw: (f, ex) => {
      const [pic, words, right] = BALLOONS[ex];
      const popped = f >= 4;
      const topOf = (i) => (popped && i === right ? 78 - 3 * 10 + i * 5 : 78 - f * 10 + i * 5);
      return {
        body: (
          <div className="relative h-full bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-100">
            <Box l={62} t={3} w={30} h={24} className="grid place-items-center rounded-2xl bg-white text-4xl leading-none ring-2 ring-sky-200 ring-inset">{pic}</Box>
            {words.map((w, i) => {
              const gone = popped && i !== right && topOf(i) < 34;
              return (
                <Box key={w} l={[22, 50, 78][i] - 12} t={topOf(i)} w={24} h={32} className={`flex flex-col items-center transition-all duration-700 ease-linear ${gone ? 'opacity-0' : ''}`}>
                  <span className={`flex aspect-[5/6] w-full items-center justify-center rounded-[50%] shadow-md ${popped && i === right ? 'scale-110 ring-4 ring-yellow-300' : ''}`}
                    style={{ background: `radial-gradient(circle at 35% 30%, #ffffffaa, ${BALLOON_COLOURS[i]} 45%)` }}>
                    <span className="rounded-md bg-white/85 px-1 text-sm font-black text-slate-900">{w}</span>
                  </span>
                  <span className="h-4 w-px bg-slate-500" />
                </Box>
              );
            })}
          </div>
        ),
        hand: f === 3 || f === 4 ? [[22, 50, 78][right], 78 - 30 + right * 5 + 10, true] : [92, 90, false],
        step: f === 0 ? 0 : f < 4 ? 1 : 2,
        phase: f === 0 ? 'Look at the picture' : f < 3 ? 'Read the balloons' : f === 3 ? 'Pop the right word' : 'Pop! Correct!'
      };
    }
  },

  'math-sprint': {
    frames: 7,
    draw: (f, ex) => {
      const qs = SPRINT[ex];
      const q = qs[f < 3 ? 0 : 1];
      const picked = f === 2 || f >= 4;
      const score = (f >= 2 ? 1 : 0) + (f >= 4 ? 1 : 0);
      const xs = [18, 50, 82];
      return {
        body: (
          <div className="relative h-full bg-white">
            <Box l={4} t={14} w={74} h={4} className="overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-amber-500 transition-all duration-1000" style={{ width: `${100 - f * 11}%` }} />
            </Box>
            <Box l={81} t={2} w={16} h={11} className="grid place-items-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">✓ {score}</Box>
            {q.pic && (
              <Box l={10} t={20} w={80} h={20} className="flex items-center justify-center gap-0.5 rounded-2xl bg-amber-50 text-2xl leading-none ring-1 ring-amber-200 ring-inset">
                {Array.from({ length: q.pic[1] }, (_, i) => <span key={i} className={q.pic[3] === '−' && i >= q.pic[1] - q.pic[2] ? 'opacity-40' : ''}>{q.pic[0]}</span>)}
                {q.pic[3] === '+' && <><span className="px-1 text-xl font-black text-slate-500">+</span>{Array.from({ length: q.pic[2] }, (_, i) => <span key={i}>{q.pic[0]}</span>)}</>}
              </Box>
            )}
            <Box l={0} t={q.pic ? 40 : 24} w={100} h={22} className={`grid place-items-center text-3xl font-black tabular-nums ${picked ? 'text-emerald-600' : 'text-slate-900'}`}>{picked ? q.text.replace('?', String(q.opts[q.right])) : q.text}</Box>
            {q.opts.map((o, i) => (
              <Box key={o} l={xs[i] - 13} t={68} w={26} h={24}
                className={`grid place-items-center rounded-2xl text-2xl font-black tabular-nums ring-1 ring-inset ${picked && i === q.right ? 'bg-emerald-500 text-white ring-emerald-500' : 'bg-slate-50 text-slate-900 ring-slate-200'}`}>{o}</Box>
            ))}
          </div>
        ),
        hand: f === 1 || f === 2 ? [xs[qs[0].right], 80, f === 2] : f === 3 || f === 4 ? [xs[qs[1].right], 80, f === 4] : [92, 92, false],
        step: f === 0 ? 0 : 1,
        phase: f === 0 ? 'The clock is running' : f >= 5 ? '2 right — keep going!' : picked ? 'Correct!' : 'Pick the answer'
      };
    }
  },

  'speed-sort': {
    frames: 7,
    draw: (f, ex) => {
      const nums = [[7, 2, 9, 4], [15, 31, 8, 22], [60, 12, 45, 30]][ex];
      const order = [...nums].sort((a, b) => a - b);
      const tapped = order.slice(0, clamp(f, 0, 4));
      const pos = (i) => [28 + (i % 2) * 44, 40 + Math.floor(i / 2) * 36];
      const handNum = f >= 1 && f <= 4 ? order[f - 1] : null;
      return {
        body: (
          <div className="relative h-full bg-white">
            <Box l={6} t={14} w={88} h={4} className="overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${100 - f * 12}%` }} />
            </Box>
            {nums.map((n, i) => {
              const [x, y] = pos(i);
              const on = tapped.includes(n);
              return (
                <Box key={n} l={x - 20} t={y - 15} w={40} h={30}
                  className={`grid place-items-center rounded-2xl text-4xl font-black tabular-nums ring-1 ring-inset ${on ? 'bg-emerald-500 text-white ring-emerald-500' : 'bg-white text-slate-900 ring-slate-200'}`}>{n}</Box>
              );
            })}
          </div>
        ),
        hand: handNum !== null ? [...pos(nums.indexOf(handNum)), true] : [92, 94, false],
        step: f === 0 ? 0 : f <= 4 ? 1 : 2,
        phase: f === 0 ? 'Smallest first' : f <= 4 ? `Tap ${handNum}` : 'Board cleared!'
      };
    }
  },

  'number-hop': {
    frames: 7,
    draw: (f, ex) => {
      const { prompt, pads, start, answer } = [
        { prompt: 'Hop to 3 + 2', pads: [2, 3, 4, 5, 6], start: 1, answer: 3 },
        { prompt: 'Hop to 6 − 2', pads: [3, 4, 5, 6, 7], start: 3, answer: 1 },
        { prompt: 'Hop to 10 + 3', pads: [10, 11, 12, 13, 14], start: 0, answer: 3 }
      ][ex];
      const steps = Math.abs(answer - start);
      const dir = Math.sign(answer - start);
      const hops = f >= 2 ? Math.min(steps, f - 1) : 0;
      const frog = start + dir * hops;
      const solved = f >= 2 && f - 1 >= steps;
      const x = (i) => 10 + i * 20;
      return {
        body: (
          <div className="relative h-full bg-white">
            <Box l={0} t={12} w={100} h={18} className="grid place-items-center text-2xl font-black text-slate-900">{prompt}</Box>
            <Box l={2} t={36} w={96} h={60} className="rounded-3xl bg-gradient-to-b from-sky-200 to-sky-400" />
            {pads.map((n, i) => (
              <Box key={n} l={x(i) - 8.5} t={56} w={17} h={23}
                className={`flex items-end justify-center rounded-full pb-1 text-xl font-black tabular-nums text-emerald-950 ${solved && i === answer ? 'bg-emerald-300 ring-4 ring-emerald-600' : 'bg-emerald-400 ring-2 ring-emerald-600/40'}`}>{n}</Box>
            ))}
            <Box l={x(frog) - 8} t={42} w={16} h={18} className="grid place-items-center text-3xl leading-none transition-all duration-500">🐸</Box>
          </div>
        ),
        hand: f === 1 ? [x(answer), 70, true] : [92, 92, false],
        step: f === 0 ? 0 : solved ? 2 : 1,
        phase: f === 0 ? 'Read the question' : f === 1 ? 'Tap the right pad' : solved ? 'Hop hop! Right!' : 'Hop…'
      };
    }
  },

  'fruit-shop': {
    frames: 8,
    draw: (f, ex) => {
      const { shelf, list, taps, total, paid } = SHOP[ex];
      const readyF = taps.length + 1;
      const totalF = readyF + 1;
      const changeF = paid ? totalF + 1 : null;
      const doneF = (changeF || totalF) + 1;
      const inBasket = taps.slice(0, clamp(f, 0, taps.length));
      const counts = shelf.map((_, i) => inBasket.filter((t) => t === i).length);
      const fx = (i) => 20 + i * 30;
      const bottom = f < readyF
        ? <span className="rounded-xl bg-emerald-600/40 px-3 py-1 text-sm font-black text-white">Basket ready ✓</span>
        : f === readyF
          ? <span className="rounded-xl bg-emerald-600 px-3 py-1 text-sm font-black text-white">Basket ready ✓</span>
          : f < (changeF || doneF)
            ? <span className="text-2xl font-black text-emerald-700 tabular-nums">Bill: ₹{total} ✓</span>
            : changeF && f === changeF
              ? <span className="flex items-center gap-2 text-sm font-black text-slate-700"><span className="rounded-lg bg-emerald-200 px-2 py-0.5 text-emerald-900">₹{paid} note</span> change <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-200 text-amber-900 ring-2 ring-amber-400">₹{paid - total}</span></span>
              : <span className="text-lg font-black text-emerald-600">All paid! 🎉</span>;
      return {
        body: (
          <div className="relative h-full bg-white">
            <Box l={44} t={3} w={53} h={15} className="flex items-center justify-center gap-1 rounded-xl bg-yellow-50 px-1 text-base font-black text-slate-900 ring-2 ring-yellow-200 ring-inset">📝 {list}</Box>
            {shelf.map(([emo, price], i) => (
              <Box key={emo} l={fx(i) - 12} t={22} w={24} h={30} className="flex flex-col items-center justify-center rounded-2xl bg-white ring-2 ring-lime-200 ring-inset">
                <span className="text-3xl leading-none">{emo}</span>
                <span className="mt-0.5 rounded-full bg-rose-500 px-1.5 text-xs font-black text-white">₹{price}</span>
              </Box>
            ))}
            <Box l={4} t={56} w={92} h={20} className="flex items-center gap-1.5 rounded-2xl bg-amber-100 px-2 ring-2 ring-amber-300 ring-inset">
              <span className="text-xl">🧺</span>
              {shelf.map(([emo], i) => counts[i] > 0 && <span key={emo} className="rounded-lg bg-white px-1.5 text-lg leading-tight font-black">{emo}×{counts[i]}</span>)}
            </Box>
            <Box l={0} t={79} w={100} h={19} className="grid place-items-center">{bottom}</Box>
          </div>
        ),
        hand: f >= 1 && f <= taps.length ? [fx(taps[f - 1]), 36, true] : f === readyF || f === totalF || f === changeF ? [f === changeF ? 72 : 50, 88, true] : [93, 60, false],
        step: f <= taps.length ? 0 : changeF && f >= changeF ? 2 : 1,
        phase: f === 0 ? 'Read the list' : f <= taps.length ? 'Fill the basket' : f < totalF ? 'Basket ready' : f < (changeF || doneF) ? `Add it up: ₹${total}` : f === changeF ? 'Give the change' : 'Paid!'
      };
    }
  },

  // Count & Catch: work out the sum, move the basket under the right things as they fall, press Done.
  'count-and-catch': {
    frames: 9,
    draw: (f, ex) => {
      const { sum, answer, want, other } = COUNT_SUMS[ex];
      const caught = Math.min(answer, Math.max(0, f - 1));
      const done = f >= 8;
      const basketX = [50, 30, 62, 40, 70, 34, 58, 48, 48][f];
      return {
        body: (
          <div className="relative h-full bg-gradient-to-b from-sky-300 to-lime-100">
            <Box l={28} t={3} w={44} h={14} className="grid place-items-center rounded-xl bg-indigo-600 text-base font-black text-white shadow">{sum} {want}</Box>
            {f >= 1 && f <= 7 && <Box l={basketX - 6} t={46} w={12} h={14} className="grid place-items-center text-2xl leading-none">{want}</Box>}
            {f >= 2 && f <= 6 && f % 2 === 0 && <Box l={(basketX + 30) % 80 + 5} t={30} w={12} h={14} className="grid place-items-center text-2xl leading-none">{other}</Box>}
            <Box l={basketX - 12} t={64} w={24} h={14} className="rounded-b-2xl bg-amber-600 ring-2 ring-amber-800/40" />
            <Box l={basketX - 5} t={57} w={10} h={8} className="grid place-items-center rounded-full bg-white text-xs font-black text-indigo-700 shadow">{caught}</Box>
            <Box l={30} t={84} w={40} h={12} className={`grid place-items-center rounded-full text-xs font-black text-white ${done ? 'bg-emerald-500' : 'bg-emerald-600/70'}`}>{done ? `${sum} = ${answer} ✓` : 'Done ✓'}</Box>
          </div>
        ),
        hand: f === 0 ? [50, 10, false] : f <= 7 ? [basketX, 74, false] : [50, 90, true],
        step: f === 0 ? 0 : f <= 7 ? 1 : 2,
        phase: f === 0 ? `Work it out: ${sum}` : f <= 7 ? `Caught ${caught} ${want}` : `${answer}! Press Done`
      };
    }
  },

  'missing-number-race': {
    frames: 6,
    draw: (f, ex) => {
      const { seq, gap, tiles, right } = TRAINS[ex];
      const filled = f >= 2;
      const tx = [20, 50, 80];
      return {
        body: (
          <div className="relative h-full bg-white">
            <Box l={47} t={3} w={50} h={22} className="flex flex-col justify-center gap-0.5 rounded-xl bg-slate-700 px-1">
              {[[filled ? 70 : 30, '🏎️'], [30 + f * 5, '🚙']].map(([at, car]) => (
                <div key={car} className="relative h-[42%] rounded-md bg-slate-600">
                  <span className="absolute top-1/2 right-0.5 -translate-y-1/2 text-sm leading-none">🏁</span>
                  <span className="absolute top-1/2 -translate-y-1/2 text-lg leading-none transition-all duration-700" style={{ left: `${at}%`, transform: 'translateY(-50%) scaleX(-1)' }}>{car}</span>
                </div>
              ))}
            </Box>
            <Box l={2} t={32} w={96} h={24} className="flex items-center justify-center gap-1">
              <span className="text-2xl leading-none">🚂</span>
              {seq.map((v, i) => (
                <span key={i} className={`grid h-full w-[15%] place-items-center rounded-xl text-xl font-black ring-2 ring-inset ${i === gap ? (filled ? 'bg-emerald-100 text-emerald-800 ring-emerald-500' : 'bg-yellow-100 text-yellow-700 ring-yellow-400') : `${CAR_TONES[i]} text-white ring-black/10`}`}>{i === gap && !filled ? '?' : v}</span>
              ))}
            </Box>
            {tiles.map((v, i) => (
              <Box key={v} l={tx[i] - 13} t={68} w={26} h={24}
                className={`grid place-items-center rounded-2xl text-2xl font-black ring-2 ring-inset ${filled && i === right ? 'bg-emerald-100 text-emerald-700 opacity-60 ring-emerald-400' : 'bg-white text-slate-900 ring-orange-200'}`}>{v}</Box>
            ))}
          </div>
        ),
        hand: f === 1 || f === 2 ? [tx[right], 80, f === 2] : [93, 60, false],
        step: f === 0 ? 0 : f === 1 ? 1 : 2,
        phase: f === 0 ? 'Which car is empty?' : f === 1 ? `Jump: ${seq[1] - seq[0] > 0 ? '+' : '−'}${Math.abs(seq[1] - seq[0])}` : 'Vroom! Right!'
      };
    }
  },

  'shape-count-dash': {
    frames: 7,
    draw: (f, ex) => {
      const { target, yard, use } = TRAIN_DEMO[ex];
      const hooked = use.slice(0, Math.max(0, Math.min(use.length, f - 1)));
      const gone = f >= 5;
      const sum = hooked.map((i) => yard[i]);
      return {
        body: (
          <div className="relative h-full bg-gradient-to-b from-sky-300 to-lime-100">
            <Box l={36} t={3} w={28} h={16} className="flex flex-col items-center justify-center rounded-lg bg-emerald-700 text-white shadow ring-2 ring-white">
              <span className="text-[0.5rem] font-black uppercase">Station</span><span className="text-lg leading-none font-black">{target}</span>
            </Box>
            <Box l={0} t={48} w={100} h={2} className="bg-slate-600" />
            <Box l={gone ? 70 : 4} t={30} w={60} h={18} className="flex items-end gap-1 transition-all duration-700">
              <span className="text-3xl leading-none">🚂</span>
              {hooked.map((i) => <span key={i} className={`grid h-8 w-8 place-items-center rounded-md text-sm font-black text-white ${TRAIN_TONES[i]}`}>{yard[i]}</span>)}
            </Box>
            <Box l={25} t={53} w={50} h={10} className="grid place-items-center rounded-full bg-white text-xs font-black text-slate-700">{sum.length ? `${sum.join(' + ')} = ${sum.reduce((a, b) => a + b, 0)}` : 'Tap carriages'}</Box>
            {yard.map((v, i) => (
              <Box key={i} l={8 + i * 22} t={68} w={16} h={14} className={`grid place-items-center rounded-md text-base font-black text-white shadow ${TRAIN_TONES[i]} ${hooked.includes(i) ? 'opacity-30' : ''}`}>{v}</Box>
            ))}
            <Box l={38} t={86} w={24} h={11} className={`grid place-items-center rounded-full text-xs font-black text-white ${gone ? 'bg-emerald-500' : 'bg-emerald-600/80'}`}>{gone ? 'Choo choo!' : 'Go! 🚦'}</Box>
          </div>
        ),
        hand: f >= 1 && f <= use.length ? [16 + use[f - 1] * 22, 76, true] : f === use.length + 1 ? [50, 92, true] : [92, 94, false],
        step: f === 0 ? 0 : f <= use.length ? 1 : 2,
        phase: f === 0 ? `Make ${target}` : f <= use.length ? `Hook on ${yard[use[f - 1]]}` : gone ? 'Off it goes!' : 'Press Go'
      };
    }
  }
};
