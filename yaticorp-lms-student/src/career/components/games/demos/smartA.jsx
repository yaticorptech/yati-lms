import { Lock, LockOpen, Delete, Check, ArrowLeft, ArrowRight, Lightbulb, Bot } from 'lucide-react';
import { Fish } from '../FocusFilter';

/**
 * Game-specific demos for Rising Brains (Classes 6–10), group smartA — see GameDemo.jsx. Each draw(f, ex) is a pure
 * function of the frame and the example (0..2): a small copy of the game's own screen, the hand at [x%, y%, tap].
 *
 * Most scenes share one frame of reference: the box is 4:3, the phase label sits in the top 14% (pt-8), and a square
 * board on the left fills the height (about 64% of the width), so a cell's centre is cellX/cellY below.
 */
const cellX = (c, n, left = 3, span = 64) => left + ((c + 0.5) * span) / n;
const cellY = (r, n, top = 15, span = 80) => top + ((r + 0.5) * span) / n;
const between = (f, a, b) => f >= a && f < b;

/* ---- Sequence Recall: eight coloured pads, a run lights up, tap it back -------------------------------------- */
const PADS = [
  ['▲', 'bg-rose-400', 'bg-rose-500/30'], ['7', 'bg-sky-400', 'bg-sky-500/30'], ['●', 'bg-emerald-400', 'bg-emerald-500/30'],
  ['3', 'bg-amber-300', 'bg-amber-500/30'], ['■', 'bg-violet-400', 'bg-violet-500/30'], ['9', 'bg-orange-400', 'bg-orange-500/30'],
  ['◆', 'bg-teal-400', 'bg-teal-500/30'], ['5', 'bg-pink-400', 'bg-pink-500/30']
];

const sequenceRecall = (f, ex) => {
  const run = [[2, 5, 0], [6, 1, 3], [4, 7, 2]][ex];
  const lit = f < 3 ? run[f] : between(f, 4, 7) ? run[f - 4] : null;
  const done = f >= 7;
  return {
    body: (
      <div className="flex h-full flex-col px-3 pt-8 pb-2">
        <div className="grid flex-1 grid-cols-4 grid-rows-2 gap-2">
          {PADS.map(([label, on, off], i) => (
            <div key={i} className={`flex items-center justify-center rounded-2xl text-xl font-black text-white transition-all duration-200 sm:text-2xl ${lit === i ? `${on} scale-105 shadow-lg` : off} ${done && run.includes(i) ? 'ring-2 ring-emerald-400' : ''}`}>{label}</div>
          ))}
        </div>
        <p className="mt-1.5 text-center text-xs font-bold text-slate-500">{f < 3 ? 'Watch closely…' : done ? 'Run of 3 — next run adds one' : `Your turn — ${Math.max(1, 3 - Math.max(0, f - 4))} to go`}</p>
      </div>
    ),
    hand: between(f, 4, 7) ? [12.5 + (run[f - 4] % 4) * 25, 33 + Math.floor(run[f - 4] / 4) * 34, true] : [90, 90, false],
    step: f < 3 ? 0 : f < 7 ? 1 : 2,
    phase: f < 3 ? 'Watch the order' : f < 7 ? 'Tap it back' : 'Correct!'
  };
};

/* ---- Number Recall: digits flash, then type them back --------------------------------------------------------- */
const numberRecall = (f, ex) => {
  const num = ['4827', '39164', '582047'][ex];
  const showing = f < 2;
  const typed = f < 2 ? '' : num.slice(0, Math.min(num.length, Math.ceil(((f - 2) / 3) * num.length)));
  const done = f >= 7;
  return {
    body: (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-3 pt-7">
        <div className="flex flex-wrap justify-center gap-1.5">
          {num.split('').map((d, i) => (
            <span key={i} className={`flex h-11 w-8 items-center justify-center rounded-xl text-2xl font-black sm:h-14 sm:w-11 sm:text-3xl ${showing ? 'bg-indigo-50 text-indigo-700' : done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-300'}`}>{showing || done ? d : '?'}</span>
          ))}
        </div>
        <div className={`flex w-full max-w-[17rem] gap-2 transition-opacity ${showing ? 'opacity-0' : ''}`}>
          <span className={`flex h-10 min-w-0 flex-1 items-center justify-center rounded-xl border text-lg font-black tracking-widest ${done ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-900'}`}>{typed || <span className="text-sm font-bold tracking-normal text-slate-400">The number</span>}</span>
          <span className={`flex h-10 items-center rounded-xl px-3 text-sm font-black text-white ${f === 6 ? 'bg-violet-700' : 'bg-gradient-to-r from-indigo-500 to-violet-600'}`}>{done ? '✓' : 'Check'}</span>
        </div>
      </div>
    ),
    hand: between(f, 2, 6) ? [40, 74, f % 2 === 1] : f === 6 ? [82, 74, true] : [90, 90, false],
    step: f < 2 ? 0 : f < 7 ? 1 : 2,
    phase: f < 2 ? 'Memorise it' : f < 7 ? 'Type it back' : 'Correct!'
  };
};

/* ---- Sequence Vault: coloured doors with codes, they lock, a code changes, unlock the named door -------------- */
const VAULT = [
  { doors: [['Red', 'from-rose-500 to-red-600', '472'], ['Blue', 'from-sky-500 to-blue-600', '815'], ['Green', 'from-emerald-500 to-green-600', '306']], rule: 'Blue door: the 2nd digit turns UP by 1.', ask: 1, code: '825' },
  { doors: [['Gold', 'from-amber-400 to-orange-500', '639'], ['Purple', 'from-violet-500 to-purple-600', '204'], ['Red', 'from-rose-500 to-red-600', '751']], rule: 'Gold door: its first digit moves to the end.', ask: 0, code: '396' },
  { doors: [['Green', 'from-emerald-500 to-green-600', '948'], ['Gold', 'from-amber-400 to-orange-500', '163'], ['Blue', 'from-sky-500 to-blue-600', '520']], rule: 'Blue door: the 3rd digit turns DOWN by 1 (0 wraps to 9).', ask: 2, code: '529' }
];
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
const keyAt = (k) => { const i = KEYS.indexOf(k); return [59.5 + (i % 3) * 15, 58 + Math.floor(i / 3) * 11]; };

const sequenceVault = (f, ex) => {
  const v = VAULT[ex];
  const study = f < 2;
  const asking = f >= 4;
  const typed = asking ? v.code.slice(0, Math.max(0, Math.min(3, f - 4))) : '';
  const open = f >= 8;
  return {
    body: (
      <div className="flex h-full flex-col gap-2 px-2 pt-8 pb-2">
        <div className="grid h-[40%] grid-cols-3 gap-2">
          {v.doors.map(([name, tone, code], i) => (
            <div key={name} className={`flex flex-col items-center justify-center gap-0.5 rounded-xl bg-gradient-to-b text-white shadow-md transition-all ${tone} ${asking && v.ask === i ? 'scale-105 ring-4 ring-amber-300' : f === 3 && v.ask === i ? 'ring-4 ring-amber-300' : !study ? 'opacity-70' : ''}`}>
              <span className="text-xs font-black tracking-wider uppercase">{name}</span>
              {open && v.ask === i ? <LockOpen className="h-4 w-4" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
              <span className="rounded-md bg-black/25 px-1.5 font-mono text-sm font-black tracking-[0.15em] sm:text-base">{study ? code : open && v.ask === i ? v.code : '•••'}</span>
            </div>
          ))}
        </div>
        {f < 2 && (
          <div className="flex flex-1 flex-col justify-center gap-2 px-2">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full bg-indigo-500 ${f === 0 ? 'w-full' : 'w-1/2'}`} /></div>
            <p className="text-center text-xs font-bold text-slate-600">Study every code before the doors lock</p>
          </div>
        )}
        {f === 2 && <p className="flex flex-1 items-center justify-center text-sm font-black text-slate-700">Doors locked</p>}
        {f === 3 && (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl bg-amber-50 px-2 text-center ring-2 ring-amber-300">
            <p className="text-xs font-black tracking-widest text-amber-700 uppercase">Code change!</p>
            <p className="mt-0.5 text-xs leading-snug font-black text-slate-900 sm:text-sm">{v.rule}</p>
          </div>
        )}
        {asking && (
          <div className="flex min-h-0 flex-1 gap-2">
            <div className="flex w-1/2 flex-col items-center justify-center gap-1.5">
              <p className={`text-center text-xs leading-tight font-black ${open ? 'text-emerald-600' : 'text-slate-900'}`}>{open ? `Open! ${v.doors[v.ask][0]} unlocked` : `Unlock the ${v.doors[v.ask][0].toUpperCase()} door`}</p>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => <span key={i} className={`flex h-8 w-7 items-center justify-center rounded-lg font-mono text-lg font-black ring-2 ${open ? 'bg-emerald-50 text-emerald-700 ring-emerald-400' : typed[i] ? 'bg-white text-slate-900 ring-indigo-400' : 'bg-slate-100 ring-slate-200'}`}>{typed[i] || ''}</span>)}
              </div>
            </div>
            <div className="grid w-1/2 grid-cols-3 grid-rows-4 gap-1">
              {KEYS.map((k) => (
                <span key={k} className={`flex items-center justify-center rounded-md text-xs font-black ring-1 ring-slate-200 ${k === 'ok' ? 'bg-emerald-500 text-white' : k === 'del' ? 'bg-slate-100 text-slate-600' : 'bg-white text-slate-900'}`}>
                  {k === 'ok' ? <Check className="h-3.5 w-3.5" /> : k === 'del' ? <Delete className="h-3.5 w-3.5" /> : k}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    ),
    hand: between(f, 5, 8) ? [...keyAt(v.code[f - 5]), true] : f === 8 ? [...keyAt('ok'), true] : f === 3 ? [50, 78, false] : [92, 92, false],
    step: f < 3 ? 0 : f === 3 ? 2 : 1,
    phase: f < 2 ? 'Remember the codes' : f === 2 ? 'Doors lock' : f === 3 ? 'Code change!' : f < 8 ? 'Type the new code' : 'Door open!'
  };
};

/* ---- Audio Echo: listening missions — count a sound, catch it, remember spoken words ----------------------------- */
const ECHO_MISSIONS = [
  { kind: 'count', icon: '🔢', title: 'Count it', ask: 'How many 🔔 Bells?', options: [2, 3, 4, 5], answer: 3 },
  { kind: 'spot', icon: '🎯', title: 'Catch it', ask: 'Tap when you hear 🥁', options: [], answer: 0 },
  { kind: 'words', icon: '🗣️', title: 'Remember it', ask: 'Which words did you hear?', options: ['mango', 'tiger', 'kite', 'lemon'], answer: 0 }
];

const audioEcho = (f, ex) => {
  const mm = ECHO_MISSIONS[ex];
  const listening = f >= 1 && f <= 4;
  const answering = f >= 5;
  const tapAt = mm.kind === 'count' ? 1 : 0;
  return {
    body: (
      <div className="flex h-full flex-col gap-1.5 bg-gradient-to-br from-sky-50 to-teal-50 px-2 pt-8 pb-2">
        <div className="flex h-7 items-center justify-center gap-1 rounded-lg bg-white text-xs font-black text-slate-800 shadow-sm">{mm.icon} {mm.title}</div>
        {!answering ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1">
            <span className={`grid h-14 w-14 place-items-center rounded-full bg-teal-100 text-3xl ring-4 ring-white ${listening && f % 2 ? 'scale-110' : ''} transition`}>🔊</span>
            <span className="text-[0.65rem] font-black text-teal-700">{f === 0 ? mm.ask : '🎧 Listening…'}</span>
            {mm.kind === 'spot' && listening && <span className={`rounded-xl px-4 py-1.5 text-xs font-black text-white ${f === 3 ? 'bg-emerald-500' : 'bg-rose-500'}`}>🥁 Heard it!</span>}
          </div>
        ) : mm.kind === 'spot' ? (
          <div className="flex flex-1 items-center justify-center text-sm font-black text-emerald-600">🎉 Caught them all!</div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-1.5">
            <span className="text-[0.65rem] font-black text-slate-700">{mm.ask}</span>
            <div className="grid grid-cols-4 gap-1">
              {mm.options.map((o, i) => <span key={o} className={`rounded-lg px-1.5 py-1 text-xs font-black ring-1 ${f >= 6 && i === tapAt ? 'bg-emerald-500 text-white ring-emerald-600' : 'bg-white text-slate-800 ring-slate-200'}`}>{o}</span>)}
            </div>
          </div>
        )}
      </div>
    ),
    hand: mm.kind === 'spot' && f === 3 ? [50, 78, true] : answering && mm.kind !== 'spot' && f === 5 ? [21 + tapAt * 19, 70, true] : [92, 94, false],
    step: f === 0 ? 0 : listening ? 1 : 2,
    phase: f === 0 ? mm.ask : listening ? 'Listen closely' : mm.kind === 'spot' ? 'All caught!' : 'Answer from memory'
  };
};

/* ---- Chef's Memory: a recipe shows, hides; tap the ingredients into the pot, then Cook ------------------------------ */
const CHEF_DEMO = [
  { recipe: [['🍅', 2], ['🧅', 1]], pantry: ['🥕', '🍅', '🧀', '🧅', '🥔'] },
  { recipe: [['🥕', 1], ['🍄', 2]], pantry: ['🍄', '🌽', '🥕', '🧄', '🍅'] },
  { recipe: [['🥚', 2], ['🧀', 1]], pantry: ['🧈', '🥚', '🍋', '🧀', '🥦'] }
];

const chefMemory = (f, ex) => {
  const { recipe, pantry } = CHEF_DEMO[ex];
  const taps = recipe.flatMap(([e, n]) => Array(n).fill(e));
  const added = taps.slice(0, Math.max(0, Math.min(taps.length, f - 2)));
  const cooked = f >= taps.length + 4;
  const tapping = f >= 2 && f < taps.length + 2 ? taps[f - 2] : null;
  return {
    body: (
      <div className="flex h-full flex-col gap-1.5 px-2 pt-8 pb-2">
        <div className="flex min-h-[26%] items-center justify-center gap-1.5 rounded-xl bg-amber-50 ring-1 ring-amber-200">
          {f < 2 ? recipe.map(([e, n], i) => <span key={i} className="rounded-lg bg-white px-1.5 text-sm font-black text-slate-800 shadow-sm">{n}{e}</span>)
            : cooked ? <span className="text-sm font-black text-emerald-700">Perfect dish! 🍲✨</span>
              : <span className="text-xs font-black text-amber-800">🙈 Cook from memory</span>}
        </div>
        <div className="flex min-h-[24%] items-center justify-center gap-1 rounded-b-3xl rounded-t-lg bg-slate-700 p-1">
          <div className={`flex h-full w-full items-center justify-center gap-0.5 rounded-b-2xl rounded-t-md ${cooked ? 'bg-amber-300' : 'bg-orange-200'}`}>{added.map((e, i) => <span key={i} className="text-base leading-none">{e}</span>)}</div>
        </div>
        <div className="grid flex-1 grid-cols-5 gap-1">
          {pantry.map((e) => <span key={e} className={`grid place-items-center rounded-lg bg-white text-xl ring-1 ${tapping === e ? 'ring-2 ring-orange-500' : 'ring-orange-200'}`}>{e}</span>)}
        </div>
      </div>
    ),
    hand: tapping ? [12 + pantry.indexOf(tapping) * 19, 82, true] : [92, 94, false],
    step: f < 2 ? 0 : f < taps.length + 3 ? 1 : 2,
    phase: f < 2 ? 'Remember the recipe' : tapping ? `Add ${tapping}` : cooked ? 'Perfect!' : 'Cook!'
  };
};

/* ---- Focus Filter: arrow rows (middle arrow only, orange = opposite), then search boards -------------------- */
const FLANKER = [
  [{ flank: 'R', centre: 'L', answer: 'L' }, { flank: 'L', centre: 'R', answer: 'R' }],
  [{ flank: 'L', centre: 'L', answer: 'R', flip: true }, { flank: 'L', centre: 'R', answer: 'R' }]
];
const SEARCH = 'dbqpbqpqbdqpqdpqbd'.split('');
const SEARCH_HITS = [1, 4, 8, 16];

const focusFilter = (f, ex) => {
  if (ex === 2) {
    const found = SEARCH_HITS.slice(0, Math.max(0, Math.min(4, f)));
    const done = f >= 5;
    return {
      body: (
        <div className="flex h-full flex-col gap-1.5 px-2 pt-8 pb-2">
          <div className="flex items-center justify-between gap-2 text-xs font-black text-slate-900">
            <span>Find <span className="rounded-md bg-gradient-to-b from-fuchsia-500 to-violet-600 px-1.5 font-mono text-base text-white">b</span></span>
            <span className="text-slate-500">{found.length}/4 found</span>
          </div>
          <div className="grid flex-1 grid-cols-6 grid-rows-3 gap-1">
            {SEARCH.map((g, i) => (
              <span key={i} className={`flex items-center justify-center rounded-lg font-mono text-xl font-black ring-1 sm:text-2xl ${found.includes(i) ? 'bg-emerald-200 text-emerald-800 ring-emerald-400' : 'bg-white text-slate-900 ring-slate-200'}`}>{g}</span>
            ))}
          </div>
        </div>
      ),
      hand: between(f, 1, 5) ? [10.5 + (SEARCH_HITS[f - 1] % 6) * 15.8, 38 + Math.floor(SEARCH_HITS[f - 1] / 6) * 23, true] : [92, 92, false],
      step: 2,
      phase: f < 1 ? 'Find the targets' : done ? 'All found!' : 'Tap only the b'
    };
  }
  const t = FLANKER[ex][f < 4 ? 0 : 1];
  const local = f % 4; // 0 ready, 1 arrows, 2 tap, 3 feedback
  const show = local === 1 || local === 2;
  const arrows = [t.flank, t.flank, t.centre, t.flank, t.flank];
  return {
    body: (
      <div className="flex h-full flex-col gap-2 px-3 pt-8 pb-2">
        <div className={`flex flex-1 items-center justify-center rounded-2xl bg-gradient-to-b from-sky-100 to-teal-200 ring-2 ${local === 3 ? 'ring-emerald-400' : t.flip && show ? 'ring-amber-400' : 'ring-white'}`}>
          {show && <div className="flex gap-0.5">{arrows.map((d, i) => <Fish key={i} dir={d} golden={t.flip} className="w-9 sm:w-12" />)}</div>}
          {local === 0 && <span className="text-2xl font-black text-cyan-700/40">+</span>}
          {local === 3 && <span className="text-base font-black text-emerald-600">✓ Right!</span>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[['L', 'Left'], ['R', 'Right']].map(([d, name]) => (
            <span key={d} className={`flex h-10 items-center justify-center gap-1 rounded-xl bg-gradient-to-b text-sm font-black text-white ${d === 'L' ? 'from-sky-400 to-blue-500' : 'from-teal-400 to-emerald-500'} ${local === 2 && t.answer === d ? 'ring-2 ring-white brightness-90' : ''}`}>
              {d === 'L' && <ArrowLeft className="h-4 w-4" aria-hidden />}{name}{d === 'R' && <ArrowRight className="h-4 w-4" aria-hidden />}
            </span>
          ))}
        </div>
      </div>
    ),
    hand: local === 2 ? [t.answer === 'L' ? 27 : 73, 86, true] : [92, 94, false],
    step: t.flip ? 1 : 0,
    phase: local === 3 ? 'Right!' : t.flip ? 'Orange: opposite way' : 'Middle arrow only'
  };
};

/* ---- Dual-Image Recall: scene A, hidden, scene B — tap what changed; or tap what was in BOTH scenes ---------- */
const TINT = { sky: 'bg-sky-200', rose: 'bg-rose-200', amber: 'bg-amber-200', emerald: 'bg-emerald-200', violet: 'bg-violet-200' };
const DUAL = [
  { a: [['🍎', 'sky'], ['⭐', 'rose'], ['🐶', 'amber'], ['🚗', 'emerald'], ['🌙', 'violet'], ['🎈', 'sky'], ['🐟', 'amber'], ['🌳', 'rose'], ['⚽', 'emerald']], changes: [[1, ['🍩', 'rose']], [6, ['🐟', 'violet']]] },
  { a: [['🦋', 'amber'], ['🚀', 'sky'], ['🎩', 'emerald'], ['🐢', 'rose'], ['🌻', 'violet'], ['🔑', 'amber'], ['🎸', 'sky'], ['🍕', 'emerald'], ['🧲', 'rose']], changes: [[3, ['🐢', 'sky']], [8, ['🐙', 'rose']]] }
];
const BOTH = { s1: ['🐱', '🍌', '🚲', '☀️'], s2: ['🎁', '🍌', '🐸', '☀️'], pool: ['🐱', '🍌', '🎁', '🚲', '🍕', '☀️', '🐸', '🔑'], both: [1, 5] };

const dualImageRecall = (f, ex) => {
  const checkBtn = (pressed, label) => <span className={`flex h-9 items-center justify-center rounded-xl px-2 text-xs font-black text-white ${pressed ? 'bg-emerald-800' : 'bg-emerald-600'}`}>{label}</span>;
  if (ex === 2) {
    const picked = BOTH.both.slice(0, f >= 5 ? 2 : f >= 4 ? 1 : 0);
    const done = f >= 7;
    const scene = f < 2 ? BOTH.s1 : f < 4 ? BOTH.s2 : null;
    return {
      body: (
        <div className="flex h-full flex-col gap-2 px-2 pt-8 pb-2">
          <p className="text-center text-xs font-black text-slate-900">{f < 2 ? 'Scene 1 of 2 — remember these' : f < 4 ? 'Scene 2 of 2 — remember these too' : done ? 'Perfect!' : 'Tap every picture in BOTH'}</p>
          {scene ? (
            <div className={`flex flex-1 items-center justify-center gap-2 rounded-2xl p-2 ${f < 2 ? 'bg-sky-50 ring-2 ring-sky-200' : 'bg-violet-50 ring-2 ring-violet-200'}`}>
              {scene.map((e) => <span key={e} className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm sm:h-16 sm:w-16 sm:text-4xl">{e}</span>)}
            </div>
          ) : (
            <div className="flex flex-1 gap-2">
              <div className="grid flex-1 grid-cols-4 grid-rows-2 gap-1.5">
                {BOTH.pool.map((e, i) => <span key={e} className={`flex items-center justify-center rounded-xl text-2xl ring-inset ${done && BOTH.both.includes(i) ? 'bg-emerald-100 ring-4 ring-emerald-500' : picked.includes(i) ? 'bg-indigo-50 ring-4 ring-indigo-600' : 'bg-white ring-1 ring-slate-200'}`}>{e}</span>)}
              </div>
              <div className="flex w-[24%] items-end">{checkBtn(f === 6, 'Check')}</div>
            </div>
          )}
        </div>
      ),
      hand: f === 4 || f === 5 ? [10 + (BOTH.both[f - 4] % 4) * 17, 46 + Math.floor(BOTH.both[f - 4] / 4) * 29, true] : f === 6 ? [87, 84, true] : [92, 94, false],
      step: f < 4 ? 0 : 2,
      phase: f < 4 ? 'Remember both scenes' : done ? 'Perfect!' : 'Tap what was in both'
    };
  }
  const { a, changes } = DUAL[ex];
  const b = a.map((t, i) => (changes.find(([at]) => at === i)?.[1] || t));
  const tiles = f < 2 ? a : b;
  const changed = changes.map(([at]) => at);
  const picked = changed.slice(0, f >= 5 ? 2 : f >= 4 ? 1 : 0);
  const done = f >= 7;
  return {
    body: (
      <div className="flex h-full gap-2 px-2 pt-8 pb-2">
        {f === 2 ? (
          <div className="flex aspect-square h-full items-center justify-center rounded-2xl bg-slate-800 text-3xl font-black text-white/40">?</div>
        ) : (
          <div className="grid aspect-square h-full grid-cols-3 grid-rows-3 gap-1">
            {tiles.map(([e, tint], i) => (
              <span key={i} className={`flex items-center justify-center rounded-xl text-2xl ring-inset sm:text-3xl ${TINT[tint]} ${done && changed.includes(i) ? 'ring-4 ring-emerald-500' : picked.includes(i) ? 'ring-4 ring-indigo-600' : 'ring-1 ring-black/5'}`}>{e}</span>
            ))}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <span className={`rounded-lg px-2 py-1 text-center text-xs font-black ${f < 2 ? 'bg-sky-100 text-sky-800' : f === 2 ? 'bg-slate-100 text-slate-600' : 'bg-violet-100 text-violet-800'}`}>{f < 2 ? 'Scene A' : f === 2 ? 'Hiding…' : 'Scene B'}</span>
          {f >= 3 && <p className="text-center text-xs leading-snug font-bold text-slate-700">{done ? 'Both changes found!' : 'Tap every tile that changed'}</p>}
          {f >= 3 && checkBtn(f === 6, done ? '✓ Perfect' : 'Check')}
        </div>
      </div>
    ),
    hand: f === 4 || f === 5 ? [cellX(changed[f - 4] % 3, 3), cellY(Math.floor(changed[f - 4] / 3), 3), true] : f === 6 ? [82, 86, true] : [92, 94, false],
    step: f < 3 ? 0 : 1,
    phase: f < 2 ? 'Study scene A' : f === 2 ? 'Hidden…' : done ? 'Found them!' : 'What changed?'
  };
};

/* ---- Next in Sequence: the quiz screen — the run, a dashed gap, four options ---------------------------------- */
const NEXT = [
  { run: [3, 7, 11, 15, null], opts: [17, 19, 20, 21], answer: 19, note: 'Add 4 each time' },
  { run: [2, 6, 18, 54, null], opts: [108, 72, 162, 160], answer: 162, note: 'Multiply by 3 each time' },
  { run: [4, 9, null, 19, 24], opts: [12, 13, 15, 14], answer: 14, note: 'Add 5 each time — 9 + 5 = 14' }
];

const nextInSequence = (f, ex) => {
  const q = NEXT[ex];
  const picked = f >= 4;
  const ai = q.opts.indexOf(q.answer);
  return {
    body: (
      <div className="flex h-full flex-col gap-1.5 px-3 pt-8 pb-2 text-center">
        <p className="text-xs font-bold text-slate-500">{q.run.includes(null) && q.run[4] !== null ? 'Which one fills the gap?' : 'Which number comes next?'}</p>
        <div className="flex justify-center gap-1.5">
          {q.run.map((n, i) => (
            <span key={i} className={`flex h-10 min-w-10 items-center justify-center rounded-xl px-1 text-base font-black tabular-nums sm:h-12 sm:min-w-12 sm:text-lg ${n === null ? (picked ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400' : 'border-2 border-dashed border-sky-300 bg-sky-100 text-sky-700') : 'bg-slate-100 text-slate-900'}`}>{n === null ? (picked ? q.answer : '?') : n}</span>
          ))}
        </div>
        <p className={`mx-auto rounded-full px-2 py-0.5 text-xs font-black ${picked ? 'bg-amber-50 text-amber-800' : 'opacity-0'}`}>
          {picked ? <><Lightbulb className="mr-1 inline h-3 w-3" aria-hidden />{q.note}</> : ' '}
        </p>
        <div className="grid flex-1 grid-cols-2 gap-1.5">
          {q.opts.map((o, i) => (
            <span key={o} className={`flex items-center justify-center gap-1 rounded-xl text-sm font-black ring-1 sm:text-base ${picked && i === ai ? 'bg-emerald-50 text-emerald-800 ring-emerald-300' : picked ? 'bg-slate-50 text-slate-400 ring-slate-200' : 'bg-slate-50 text-slate-900 ring-slate-200'}`}>
              {picked && i === ai && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}{o}
            </span>
          ))}
        </div>
      </div>
    ),
    hand: f === 3 || f === 4 ? [27 + (ai % 2) * 46, 68 + Math.floor(ai / 2) * 15, f === 4] : [92, 94, false],
    step: f < 1 ? 0 : f < 3 ? 1 : 2,
    phase: f < 1 ? 'Look at the run' : f < 3 ? 'Find the rule' : f < 5 ? 'Pick what comes next' : 'Correct!'
  };
};

/* ---- Sudoku (Mini 6×6 / Challenge 9×9): tap a blank cell, then a number on the pad ---------------------------- */
const SUDOKU_6 = [[1, 2, 3, 4, 5, 6], [4, 5, 6, 1, 2, 3], [2, 3, 1, 5, 6, 4], [5, 6, 4, 2, 3, 1], [3, 1, 2, 6, 4, 5], [6, 4, 5, 3, 1, 2]];
const SUDOKU_9 = Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => ((r * 3 + Math.floor(r / 3) + c) % 9) + 1));
const PERMS = { 6: [[1, 2, 3, 4, 5, 6], [3, 6, 1, 5, 2, 4], [5, 1, 4, 6, 3, 2]], 9: [[1, 2, 3, 4, 5, 6, 7, 8, 9], [4, 7, 1, 9, 2, 8, 3, 6, 5], [8, 3, 6, 2, 9, 5, 1, 7, 4]] };
const BLANKS = { 6: [[8, 21, 33], [3, 16, 26], [13, 24, 35]], 9: [[10, 41, 67], [5, 30, 76], [20, 52, 63]] };
const SHAPE = { 6: [2, 3], 9: [3, 3] };

const sudokuDemo = (size) => (f, ex) => {
  const [br, bc] = SHAPE[size];
  const perm = PERMS[size][ex];
  const sol = (size === 6 ? SUDOKU_6 : SUDOKU_9).flat().map((v) => perm[v - 1]);
  const blanks = BLANKS[size][ex];
  const k = f >= 1 && f < 7 ? Math.floor((f - 1) / 2) : -1; // the blank being worked on
  const filled = blanks.slice(0, f >= 7 ? 3 : Math.max(0, Math.floor(f / 2)));
  const selected = k >= 0 ? blanks[k] : -1;
  const solved = f >= 7;
  const keys = size + 1;
  const rows = Math.ceil(keys / 2);
  const keyPos = (d) => [76 + ((d - 1) % 2) * 15, cellY(Math.floor((d - 1) / 2), rows)];
  return {
    body: (
      <div className="flex h-full gap-2 px-2 pt-8 pb-2">
        <div className={`grid aspect-square h-full overflow-hidden rounded-lg border-2 border-slate-700 ${solved ? 'ring-4 ring-emerald-300' : ''}`} style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
          {sol.map((v, i) => {
            const r = Math.floor(i / size); const c = i % size;
            const blank = blanks.includes(i); const shown = !blank || filled.includes(i);
            return (
              <span key={i} className={`flex items-center justify-center font-black ${size === 9 ? 'text-xs sm:text-sm' : 'text-sm sm:text-lg'} ${i === selected ? 'bg-blue-600 text-white' : blank ? (solved ? 'bg-emerald-50 text-blue-700' : 'bg-white text-blue-700') : 'bg-slate-100 text-slate-700'}`}
                style={{ borderRight: c < size - 1 ? `${(c + 1) % bc === 0 ? 2 : 1}px solid ${(c + 1) % bc === 0 ? '#334155' : '#e2e8f0'}` : undefined, borderBottom: r < size - 1 ? `${(r + 1) % br === 0 ? 2 : 1}px solid ${(r + 1) % br === 0 ? '#334155' : '#e2e8f0'}` : undefined }}>
                {shown ? v : ''}
              </span>
            );
          })}
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1" style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
          {Array.from({ length: size }, (_, d) => <span key={d} className="flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-black text-white">{d + 1}</span>)}
          <span className="flex items-center justify-center rounded-lg bg-white text-sm font-black text-slate-500 ring-1 ring-slate-200">⌫</span>
        </div>
      </div>
    ),
    hand: k >= 0 ? (f % 2 === 1 ? [cellX(blanks[k] % size, size), cellY(Math.floor(blanks[k] / size), size), true] : [...keyPos(sol[blanks[k]]), true]) : [92, 94, false],
    step: f < 1 ? 0 : f < 7 ? 1 : 2,
    phase: f < 1 ? 'Find the empty cells' : solved ? 'Solved!' : f % 2 === 1 ? 'Tap an empty cell' : 'Tap the missing number'
  };
};

/* ---- Chess: tap a piece, then a green square; checkmate the king ---------------------------------------------- */
const CH_START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const CH_GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const chessDemo = (f) => {
  const rows = CH_START.split('/').map((r) => r.replace(/\d/g, (d) => '.'.repeat(Number(d))).split(''));
  if (f >= 3) { rows[6][4] = '.'; rows[4][4] = 'P'; }
  const picked = f === 1 || f === 2;
  return {
    body: (
      <div className="flex h-full items-center justify-center bg-gradient-to-b from-amber-50 to-stone-200 px-2 pt-8 pb-2">
        <div className="grid aspect-square h-full grid-cols-8 overflow-hidden rounded-md ring-2 ring-amber-900">
          {rows.flatMap((row, r) => row.map((ch, c) => {
            const target = picked && c === 4 && (r === 5 || r === 4);
            return (
              <span key={`${r}${c}`} className={`relative grid place-items-center text-[0.7rem] leading-none sm:text-sm ${(r + c) % 2 ? 'bg-amber-800' : 'bg-amber-200'} ${picked && r === 6 && c === 4 ? 'bg-emerald-400' : ''}`}>
                {ch !== '.' && <span className={ch === ch.toUpperCase() ? 'text-white [text-shadow:0_0_2px_#000]' : 'text-black'}>{CH_GLYPH[ch.toLowerCase()]}</span>}
                {target && <span className="absolute h-1.5 w-1.5 rounded-full bg-emerald-600" />}
              </span>
            );
          }))}
        </div>
      </div>
    ),
    hand: f === 1 ? [56, 78, true] : f === 2 ? [56, 52, true] : [92, 94, false],
    step: f === 0 ? 0 : f < 3 ? 1 : 2,
    phase: f === 0 ? 'Choose your colour' : f === 1 ? 'Tap a piece' : f === 2 ? 'Tap a green square' : 'Your pawn moved!'
  };
};

/* ---- Crown Garden: one crown per row, column and garden; no touching ------------------------------------------- */
const CG_REGIONS = [0, 0, 1, 1, 0, 2, 2, 1, 3, 3, 2, 1, 3, 3, 3, 1];
const CG_CROWNS = [1, 3, 0, 2]; // row → column
const CG_TONE = ['#fecdd3', '#bae6fd', '#bbf7d0', '#fde68a'];
const crownGarden = (f) => {
  const placed = Math.min(4, Math.max(0, f - 1));
  const done = placed === 4;
  return {
    body: (
      <div className="flex h-full items-center justify-center bg-white px-2 pt-8 pb-2">
        <div className="grid aspect-square h-full grid-cols-4 overflow-hidden rounded-lg ring-2 ring-slate-700">
          {CG_REGIONS.map((g, i) => {
            const r = Math.floor(i / 4);
            const crown = r < placed && CG_CROWNS[r] === i % 4;
            return <span key={i} className="grid place-items-center text-lg ring-1 ring-slate-700/20" style={{ backgroundColor: CG_TONE[g] }}>{crown ? '👑' : ''}</span>;
          })}
        </div>
      </div>
    ),
    hand: f >= 1 && f <= 4 ? [28 + CG_CROWNS[f - 1] * 15, 22 + (f - 1) * 19, true] : [92, 94, false],
    step: f === 0 ? 0 : done ? 2 : 1,
    phase: done ? 'One per row, column, garden!' : f === 0 ? 'Place the crowns' : `Crown ${placed + 1}`
  };
};

/* ---- Tower Strategy: three pegs of mixed rings; move a top ring to the NEXT peg until each peg is one colour ------ */
const TS_STATES = [
  [[0, 1], [1], [2, 2, 0]],
  [[0], [1, 1], [2, 2, 0]],
  [[0], [1, 1, 0], [2, 2]],
  [[0, 0], [1, 1], [2, 2]]
];
const TS_MOVES = [[0, 1], [2, 1], [1, 0]]; // next-door moves only: 1→2, 3→2, 2→1
const TS_TONE = ['bg-gradient-to-b from-rose-400 to-red-700', 'bg-gradient-to-b from-sky-300 to-blue-700', 'bg-gradient-to-b from-yellow-200 to-amber-600'];
const towerStrategy = (f) => {
  const k = Math.min(TS_STATES.length - 1, Math.max(0, f - 1));
  const pegs = TS_STATES[k];
  const done = k === TS_STATES.length - 1;
  const mv = f >= 1 && f <= TS_MOVES.length ? TS_MOVES[f - 1] : null;
  return {
    body: (
      <div className="flex h-full items-end justify-center gap-3 bg-gradient-to-b from-sky-100 to-violet-100 px-4 pt-8 pb-3">
        {pegs.map((t, i) => (
          <div key={i} className="relative flex h-[85%] w-1/4 flex-col-reverse items-center">
            <span className={`absolute bottom-1 h-[90%] w-1.5 rounded-t-full ${done ? 'bg-emerald-400' : 'bg-amber-700'}`} />
            <span className={`absolute bottom-0 h-1.5 w-full rounded-full ${done ? 'bg-emerald-400' : 'bg-amber-700'}`} />
            <div className="relative mb-1.5 flex w-full flex-col-reverse items-center gap-0.5">
              {t.map((c, j) => <span key={j} className={`h-3.5 w-[85%] rounded-full ${TS_TONE[c]}`} />)}
            </div>
          </div>
        ))}
      </div>
    ),
    hand: mv ? [26 + mv[1] * 24, 60, true] : [92, 94, false],
    step: f === 0 ? 0 : done ? 2 : 1,
    phase: done ? 'Sorted: one colour each!' : mv ? `Peg ${mv[0] + 1} → peg ${mv[1] + 1}` : 'Next-door moves only'
  };
};

/* ---- Pipe Flow: tap pipes to turn them; water flows tap → plant ------------------------------------------------- */
const pipeFlowDemo = (f) => {
  const turned = Math.min(3, Math.max(0, f - 1));
  const done = turned === 3;
  const cells = [['─', 0], ['┐', 1], ['│', 2], ['└', 3]];
  return {
    body: (
      <div className="flex h-full items-center justify-center gap-1 bg-gradient-to-b from-lime-100 to-emerald-200 px-2 pt-8 pb-2">
        <span className="text-2xl">🚰</span>
        <div className="grid grid-cols-2 gap-1">
          {cells.map(([g, i]) => <span key={i} className={`grid h-12 w-12 place-items-center rounded-lg bg-amber-50 font-mono text-3xl font-black ring-1 ring-amber-200 transition ${i < turned + 1 && done ? 'text-sky-500' : i <= turned ? 'text-sky-500' : 'text-slate-400'}`} style={{ transform: i <= turned ? 'none' : 'rotate(90deg)' }}>{g}</span>)}
        </div>
        <span className={`text-2xl transition ${done ? 'scale-125' : ''}`}>{done ? '🌻' : '🌱'}</span>
      </div>
    ),
    hand: f >= 1 && f <= 3 ? [f === 1 ? 57 : f === 2 ? 42 : 57, f === 1 ? 45 : 70, true] : [92, 94, false],
    step: f === 0 ? 0 : done ? 2 : 1,
    phase: done ? 'Water flows — it blooms!' : f === 0 ? 'Join tap to plant' : 'Tap to turn a pipe'
  };
};

/* ---- Emoji Equations: each line gives one more picture; answer the last line ------------------------------------ */
const emojiEquationsDemo = (f) => {
  const lines = [['🍎 + 🍎 + 🍎', 30, '🍎 = 10'], ['🍎 + 🍌 + 🍌', 18, '🍌 = 4'], ['🍌 + 🍇 + 🍇', 10, '🍇 = 3']];
  const shown = Math.min(3, f);
  const answered = f >= 5;
  return {
    body: (
      <div className="flex h-full flex-col justify-center gap-1 bg-gradient-to-br from-pink-50 to-amber-50 px-3 pt-8 pb-2">
        {lines.map(([l, t, v], i) => (
          <div key={i} className={`flex items-center justify-between rounded-lg bg-white px-2 py-0.5 text-sm font-black text-slate-800 ring-1 ring-slate-100 ${i < shown ? '' : 'opacity-40'}`}>
            <span>{l} = {t}</span>{i < shown && <span className="text-xs text-pink-600">{v}</span>}
          </div>
        ))}
        <div className="flex items-center justify-center rounded-lg bg-gradient-to-r from-pink-500 to-amber-500 py-1 text-sm font-black text-white">🍎 + 🍌 × 🍇 = {answered ? '22' : '?'}</div>
      </div>
    ),
    hand: f === 4 ? [50, 88, true] : [92, 94, false],
    step: f < 3 ? 0 : answered ? 2 : 1,
    phase: f < 3 ? 'Work out each picture' : answered ? '10 + 4 × 3 = 22' : '× before +'
  };
};

/* ---- Code Breaker: four-colour guesses, ✓ right spot / ○ right colour, crack the code ------------------------- */
const PEG = { r: 'bg-rose-500', b: 'bg-sky-500', g: 'bg-emerald-500', y: 'bg-amber-400', p: 'bg-violet-500', o: 'bg-orange-500' };
const PALETTE = ['r', 'b', 'g', 'y', 'p', 'o'];
const CODES = [
  { guesses: ['rrbb', 'rbgy', 'rygb'] },
  { guesses: ['ggyy', 'gpyo', 'gopy'] },
  { guesses: ['bbrr', 'brop', 'borp'] }
];
const score = (secret, guess) => {
  const exact = guess.split('').filter((c, i) => c === secret[i]).length;
  const common = PALETTE.reduce((n, c) => n + Math.min(secret.split(c).length - 1, guess.split(c).length - 1), 0);
  return [exact, common - exact];
};

const codeBreaker = (f, ex) => {
  const { guesses } = CODES[ex];
  const secret = guesses[2];
  const rows = guesses.slice(0, Math.min(3, Math.floor(f / 2)));
  const building = Math.floor(f / 2) < 3 ? guesses[Math.floor(f / 2)] : null;
  const current = building ? building.slice(0, f % 2 === 0 ? 2 : 4) : '';
  const cracked = f >= 6;
  return {
    body: (
      <div className="flex h-full flex-col gap-1.5 px-3 pt-8 pb-2">
        <ul className="flex flex-1 flex-col gap-1">
          {rows.map((g, i) => {
            const [ex2, part] = score(secret, g);
            return (
              <li key={i} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${cracked && i === 2 ? 'bg-emerald-50 ring-1 ring-emerald-300' : 'bg-slate-50'}`}>
                <span className="w-3 text-xs font-black text-slate-400">{i + 1}</span>
                <span className="flex gap-1">{g.split('').map((k, n) => <span key={n} className={`h-5 w-5 rounded-full ${PEG[k]}`} />)}</span>
                <span className="ml-auto flex gap-2 text-xs font-black"><span className="text-emerald-700">✓{ex2}</span><span className="text-amber-600">○{part}</span></span>
              </li>
            );
          })}
          {cracked && <li className="text-center text-xs font-black text-emerald-600">Cracked in 3 guesses!</li>}
        </ul>
        {!cracked && (
          <div className="flex justify-center gap-1.5">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-6 w-6 rounded-full ring-2 ring-inset ${current[i] ? `${PEG[current[i]]} ring-white` : 'bg-slate-100 ring-slate-300'}`} />)}</div>
        )}
        <div className="flex items-center gap-1">
          {PALETTE.map((k) => <span key={k} className={`h-7 w-7 shrink-0 rounded-full ring-2 ring-white sm:h-9 sm:w-9 ${PEG[k]}`} />)}
          <span className={`ml-auto flex h-7 items-center rounded-lg px-2 text-xs font-black text-white ${f % 2 === 1 && !cracked ? 'bg-indigo-800' : 'bg-gradient-to-r from-sky-500 to-indigo-600'}`}>Guess</span>
        </div>
      </div>
    ),
    hand: cracked ? [92, 60, false] : f % 2 === 1 ? [88, 88, true] : [8 + PALETTE.indexOf(current[1]) * 10, 88, true],
    step: cracked ? 2 : f < 2 ? 0 : 1,
    phase: cracked ? 'Code cracked!' : f < 2 ? 'Pick four colours' : 'Use the feedback'
  };
};

/* ---- Lights Out: tap a light to flip it and its neighbours, turn them all off ---------------------------------- */
const LIGHTS = [{ size: 3, taps: [4, 0] }, { size: 3, taps: [1, 8, 6] }, { size: 4, taps: [5, 10] }];
const flip = (board, i, n) => {
  const r = Math.floor(i / n); const c = i % n;
  const out = [...board];
  [[r, c], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([y, x]) => { if (y >= 0 && y < n && x >= 0 && x < n) out[y * n + x] = !out[y * n + x]; });
  return out;
};

const lightsOut = (f, ex) => {
  const { size, taps } = LIGHTS[ex];
  const start = taps.reduce((b, t) => flip(b, t, size), Array(size * size).fill(false));
  const done = Math.max(0, Math.min(taps.length, f));
  const board = taps.slice(0, done).reduce((b, t) => flip(b, t, size), start);
  const off = done === taps.length && f > 0;
  return {
    body: (
      <div className="flex h-full flex-col items-center pt-8 pb-2">
        <div className="grid aspect-square h-full gap-1.5" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
          {board.map((on, i) => <span key={i} className={`rounded-xl transition-all duration-300 ${on ? 'bg-gradient-to-br from-amber-300 to-orange-400 shadow-lg shadow-orange-500/30' : off ? 'bg-slate-200 ring-1 ring-emerald-300' : 'bg-slate-100 ring-1 ring-slate-200'}`} />)}
        </div>
      </div>
    ),
    hand: f >= 1 && f <= taps.length ? [cellX(taps[f - 1] % size, size, 18), cellY(Math.floor(taps[f - 1] / size), size), true] : [92, 92, false],
    step: f < 1 ? 1 : off ? 2 : 0,
    phase: f < 1 ? 'Lights are on' : off ? `All off in ${taps.length} taps!` : 'Flip it + neighbours'
  };
};

/* ---- Shape Matrix: colour runs across, count runs down — pick the cell that fills the gap -------------------- */
const MATRIX = [
  { colours: ['bg-rose-500', 'bg-sky-500', 'bg-amber-500'], start: 1, options: [[1, 3], [2, 3], [2, 2], [1, 4]], answer: 1 },
  { colours: ['bg-emerald-500', 'bg-violet-500', 'bg-rose-500'], start: 2, options: [[2, 4], [2, 5], [0, 4], [2, 3]], answer: 0 },
  { colours: ['bg-sky-500', 'bg-amber-500', 'bg-violet-500'], start: 1, options: [[0, 3], [2, 2], [1, 4], [2, 3]], answer: 3 }
];
const dots = (colour, count) => (
  <span className="flex h-full w-full flex-wrap content-center items-center justify-center gap-0.5 p-1">
    {Array.from({ length: count }, (_, i) => <span key={i} className={`h-2.5 w-2.5 rounded-full sm:h-3.5 sm:w-3.5 ${colour}`} />)}
  </span>
);

const shapeMatrix = (f, ex) => {
  const m = MATRIX[ex];
  const picked = f >= 4;
  return {
    body: (
      <div className="flex h-full gap-3 px-2 pt-8 pb-2">
        <div className="grid aspect-square h-full grid-cols-3 grid-rows-3 gap-1 rounded-xl bg-slate-50 p-1 ring-1 ring-slate-200">
          {Array.from({ length: 9 }, (_, i) => {
            const r = Math.floor(i / 3); const c = i % 3;
            const hl = (f === 1 && r === 0) || (f === 2 && c === 0);
            if (i === 8 && !picked) return <span key={i} className="flex items-center justify-center rounded-lg border-2 border-dashed border-cyan-300 text-xl font-black text-cyan-500">?</span>;
            return <span key={i} className={`rounded-lg ${i === 8 ? 'bg-emerald-50 ring-2 ring-emerald-400' : hl ? 'bg-cyan-50 ring-2 ring-cyan-400' : 'bg-white ring-1 ring-slate-100'}`}>{dots(m.colours[c], m.start + r)}</span>;
          })}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-center text-xs font-black text-slate-900">{f === 1 ? 'Colour runs across' : f === 2 ? 'Count runs down' : 'Which one fits?'}</p>
          <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-1.5">
            {m.options.map(([col, n], i) => <span key={i} className={`rounded-xl ring-1 ${picked && i === m.answer ? 'bg-emerald-50 ring-2 ring-emerald-400' : 'bg-white ring-slate-200'}`}>{dots(m.colours[col], n)}</span>)}
          </div>
        </div>
      </div>
    ),
    hand: f === 3 || f === 4 ? [76 + (m.answer % 2) * 15, 43 + Math.floor(m.answer / 2) * 34, f === 4] : [94, 94, false],
    step: f < 1 ? 0 : f < 3 ? 1 : 2,
    phase: f < 1 ? 'Find the rule' : f < 3 ? 'Check rows and columns' : picked ? 'Correct!' : 'Pick the missing cell'
  };
};

export const DEMOS = {
  'sequence-recall': { frames: 9, draw: sequenceRecall },
  'number-recall': { frames: 8, draw: numberRecall },
  'sequence-vault': { frames: 10, draw: sequenceVault },
  'grid-navigator': { frames: 8, draw: audioEcho },
  'pattern-recall': { frames: 9, draw: chefMemory },
  'focus-filter': { frames: 8, draw: focusFilter },
  'dual-image-recall': { frames: 8, draw: dualImageRecall },
  'next-in-sequence': { frames: 7, draw: nextInSequence },
  'mini-sudoku': { frames: 8, draw: sudokuDemo(6) },
  'sudoku-challenge': { frames: 8, draw: sudokuDemo(9) },
  'tower-strategy': { frames: 8, draw: towerStrategy },
  'emoji-equations': { frames: 7, draw: emojiEquationsDemo },
  'clue-chain': { frames: 7, draw: crownGarden },
  'chess-challenge': { frames: 5, draw: chessDemo },
  'constraint-grid': { frames: 6, draw: pipeFlowDemo },
  'code-breaker': { frames: 8, draw: codeBreaker },
  'lights-out': { frames: 7, draw: lightsOut },
  'shape-matrix': { frames: 7, draw: shapeMatrix }
};
