import { useEffect, useState } from 'react';
import { CATALOG } from './catalog';
import { GAME_DEMOS } from './demos/index.js';

/**
 * How to play, shown (2026-11-14, the user: "instead of the how-to-play text, a small demo of a few seconds for every
 * game"): a tiny looping scene of the game being played — a hand taps, cards turn, tiles light, a token moves — with
 * the matching step written under it, the game's three coach steps in turn. One player, ten kinds of scene; every
 * game is given the kind that matches its own interaction (KIND below), with a little of its own content.
 *
 * With reduced motion asked for, the scene stands still on its last frame and all three steps are listed.
 */
const FRAME_MS = 1300; // slow enough to read each step (2026-11-14: "too fast to read")

// ---- Which scene each game shows -------------------------------------------------------------------------------
const KIND = {
  // flip cards to pair
  'memory-match': 'flip', 'animal-pair-safari': 'flip',
  // watch a run light up, then repeat it
  'sequence-recall': 'sequence', 'flash-sequence': 'sequence', 'light-up-garden': 'sequence', 'sequence-vault': 'sequence', 'departure-board': 'grid',
  // tiles light, then tap where they were
  'grid-recall': 'grid', 'pattern-recall': 'grid', 'matrix-recall': 'grid', 'grid-navigator': 'grid', 'spot-the-change': 'change', 'dual-image-recall': 'change', 'whats-missing': 'change', 'spatial-rotation-vault': 'grid', 'lights-out': 'grid', 'picture-word-hunt': 'grid',
  // fill cells of a puzzle grid
  'mini-sudoku': 'fill', 'sudoku-challenge': 'fill', 'constraint-grid': 'fill', 'picture-logic': 'fill', 'number-pattern-lab': 'fill', 'word-relation-matrix': 'fill', 'shape-builder': 'fill', 'tic-tac-toe': 'fill',
  // put things in order
  'speed-sort': 'order', 'clue-chain': 'order', 'verbal-architect': 'order', 'nuance-navigator': 'order', 'algorithm-builder': 'order', 'scale-balance': 'order', 'strategic-constraint-lab': 'order', 'fraction-battle': 'order',
  // move to a goal
  'mini-maze-mission': 'move', 'treasure-path': 'move', 'network-logic': 'move', 'number-hop': 'move', 'missing-number-race': 'move',
  // towers of rings or blocks
  'tower-shift': 'tower', 'tower-strategy': 'tower', 'last-stone': 'tower',
  // type it
  'typing-sprint': 'type', 'word-scramble': 'type', 'letter-builder': 'type', 'number-recall': 'type', 'reverse-recall': 'type', 'cipher-challenge': 'type', 'cipher-lab': 'type', 'equation-rush': 'type', 'running-total': 'type', 'number-forge': 'type', 'ratio-relay': 'type',
  // catch the right things as they move
  'count-and-catch': 'catch', 'word-balloon-pop': 'catch', 'focus-filter': 'catch', 'interference-recall': 'catch', 'rhyme-detective': 'catch', 'fruit-shop': 'catch', 'shape-count-dash': 'catch', 'dot-count': 'catch', 'word-association-grid': 'catch'
};
// Everything else picks the right answer from a few.

const CATEGORY_OF = Object.fromEntries(CATALOG.map((g) => [g.id, g.category]));
// The question a "choose" scene asks, by game, else by category.
const CHOOSE = {
  'colour-match': [['RED', ['🔴', '🔵', '🟢', '🟡'], 0], ['BLUE', ['🟡', '🔵', '🔴', '🟢'], 1], ['GREEN', ['🔴', '🟡', '🔵', '🟢'], 3]],
  'rule-switch': [['INK? (blue “RED”)', ['🔵', '🔴', '🟢', '🟡'], 0], ['WORD? (red “GREEN”)', ['🔴', '🟢', '🔵', '🟡'], 1], ['INK? (yellow “BLUE”)', ['🔵', '🔴', '🟡', '🟢'], 2]],
  'shadow-detective': [['Whose shadow? 🐘', ['🐘', '🐱', '🐟', '🚗'], 0], ['Whose shadow? 🦒', ['🐶', '🦒', '🐢', '🚌'], 1], ['Whose shadow? ✈️', ['🚗', '🚲', '✈️', '🚀'], 2]],
  'odd-one-out': [['Odd one out?', ['🍎', '🍌', '🚗', '🍇'], 2], ['Odd one out?', ['🐶', '🐱', '🐭', '🌳'], 3], ['Odd one out?', ['2', '4', '7', '8'], 2]],
  'pattern-path': [['🔴🔵🔴🔵 ?', ['🔴', '🟢', '🟡', '🟣'], 0], ['⭐⭐🌙⭐⭐ ?', ['⭐', '🌙', '☀️', '🌈'], 1], ['🔺🟦🔺🟦 ?', ['🟦', '🔺', '⚪', '⭐'], 1]],
  'next-in-sequence': [['2, 4, 6, ?', ['7', '8', '9', '10'], 1], ['5, 10, 15, ?', ['18', '20', '25', '30'], 1], ['1, 4, 9, 16, ?', ['20', '23', '25', '36'], 2]],
  'spelling-fix': [['Which is right?', ['becuase', 'because', 'becoz', 'bcause'], 1], ['Which is right?', ['freind', 'frend', 'friend', 'frind'], 2], ['Which is right?', ['school', 'scool', 'skool', 'shcool'], 0]],
  'sound-alike': [['___ going home.', ['There', 'Their', 'They’re', 'Thier'], 2], ['I ___ the ball.', ['see', 'sea', 'si', 'cee'], 0], ['Two plus ___.', ['to', 'too', 'two', 'tow'], 2]],
  'tense-pick': [['Yesterday I ___.', ['go', 'went', 'gone', 'going'], 1], ['She ___ every day.', ['run', 'runs', 'ran', 'running'], 1], ['Tomorrow we ___.', ['swam', 'swim', 'will swim', 'swum'], 2]],
  'sentence-gap': [['The sky is ___.', ['blue', 'run', 'fast', 'eat'], 0], ['Fish live in ___.', ['trees', 'water', 'sand', 'air'], 1], ['I read a ___.', ['book', 'shoe', 'cloud', 'jump'], 0]],
  'synonym-match': [['Big = ?', ['tiny', 'large', 'thin', 'slow'], 1], ['Happy ≠ ?', ['glad', 'sad', 'joyful', 'merry'], 1], ['Quick = ?', ['fast', 'slow', 'late', 'heavy'], 0]],
  'idiom-sense': [['Break the ice', ['start talking', 'smash ice', 'feel cold', 'be rude'], 0], ['Piece of cake', ['dessert', 'very easy', 'small part', 'birthday'], 1], ['Hit the books', ['punch', 'study hard', 'throw', 'tidy up'], 1]],
  'analogy-master': [['Hot : Cold :: Up : ?', ['Down', 'Top', 'Sky', 'High'], 0], ['Bird : Fly :: Fish : ?', ['Walk', 'Swim', 'Run', 'Jump'], 1], ['Pen : Write :: Knife : ?', ['Cut', 'Eat', 'Cook', 'Draw'], 0]],
  'context-detective': [['“arid” land, no rain', ['dry', 'wet', 'green', 'cold'], 0], ['a “jubilant” crowd cheered', ['angry', 'joyful', 'tired', 'quiet'], 1], ['“feeble” after the fever', ['weak', 'strong', 'fast', 'loud'], 0]],
  'semantic-precision': [['A ___ smile (warm)', ['nice', 'radiant', 'okay', 'good'], 1], ['He ___ the cup (dropped by accident)', ['moved', 'let fall', 'put', 'got'], 1], ['A ___ answer (exactly right)', ['good', 'fine', 'precise', 'big'], 2]],
  'argument-analyzer': [['Which weakens it?', ['A', 'B', 'C', 'D'], 2], ['The conclusion?', ['Line 1', 'Line 2', 'Line 3', 'Line 4'], 3], ['Hidden assumption?', ['A', 'B', 'C', 'D'], 0]],
  'math-sprint': [['7 + 5 = ?', ['11', '12', '13', '14'], 1], ['9 − 4 = ?', ['3', '4', '5', '6'], 2], ['6 × 3 = ?', ['15', '18', '21', '24'], 1]],
  'percent-snap': [['25% of 80', ['15', '20', '25', '30'], 1], ['10% of 350', ['3.5', '35', '350', '0.35'], 1], ['50% of 46', ['22', '23', '24', '26'], 1]],
  'probability-lab': [['P(🔴) from 🔴🔴🔵🔵', ['1/4', '1/2', '3/4', '1'], 1], ['P(6) on a die', ['1/2', '1/3', '1/6', '1/12'], 2], ['P(two heads)', ['1/2', '1/4', '1/3', '3/4'], 1]],
  'quantitative-arena': [['A: 2³   B: 3²', ['A', 'B', 'Equal', 'Can’t tell'], 1], ['A: 0.5   B: 1/2', ['A', 'B', 'Equal', 'Can’t tell'], 2], ['x > 0 · A: x   B: x²', ['A', 'B', 'Equal', 'Can’t tell'], 3]],
  'decision-theory-arena': [['Best expected value?', ['Plan A', 'Plan B', 'Plan C', 'Plan D'], 2], ['Safest worst case?', ['Plan A', 'Plan B', 'Plan C', 'Plan D'], 0], ['Best after a loss?', ['Stay', 'Switch', 'Wait', 'Stop'], 1]],
  'statistical-inference': [['Higher mean?', ['Set A', 'Set B', 'Same', '?'], 0], ['Outlier removed: mean…', ['rises', 'falls', 'same', '?'], 1], ['Correlation?', ['positive', 'negative', 'none', '?'], 0]],
  'numerical-optimization': [['Most value under 10 kg?', ['A+B', 'B+C', 'A+C', 'C'], 1], ['Cheapest mix?', ['2A+B', 'A+2B', '3A', '3B'], 0], ['Best split?', ['5/5', '7/3', '3/7', '10/0'], 1]],
  'data-dash': [['Tallest bar?', ['Mon', 'Tue', 'Wed', 'Thu'], 2], ['Total of A and B?', ['12', '15', '18', '21'], 2], ['Mean of 4, 6, 8?', ['5', '6', '7', '8'], 1]],
  'mental-math-circuit': [['5 → ×2 → +3', ['10', '13', '16', '8'], 1], ['8 → −2 → ×3', ['18', '22', '24', '14'], 0], ['20 → ÷4 → +7', ['11', '12', '13', '27'], 1]],
  'boolean-breaker': [['1 AND 0', ['0', '1'], 0], ['1 OR 0', ['0', '1'], 1], ['NOT 1', ['0', '1'], 0]],
  'deduction': [['All cats purr. Tom purrs. → Tom is a cat?', ['Follows', 'Doesn’t'], 1], ['All A are B. All B are C. → All A are C?', ['Follows', 'Doesn’t'], 0], ['No fish fly. Nemo is a fish. → Nemo can’t fly?', ['Follows', 'Doesn’t'], 0]],
  'logic-detective': [['Who did it?', ['🧑', '👩', '🧔', '👧'], 3], ['Who has the key?', ['🧑', '👩', '🧔', '👧'], 1], ['Which door?', ['🚪1', '🚪2', '🚪3', '🚪4'], 2]]
};
const CHOOSE_BY_CATEGORY = {
  memory: [['Seen before?', ['🍎', '⭐', '🐶', '🚗'], 1], ['Which was there?', ['🌙', '🎈', '🐟', '🌳'], 2], ['Which came first?', ['🔺', '🟦', '⚪', '⭐'], 0]],
  logic: [['1, 3, 5, ?', ['6', '7', '8', '9'], 1], ['🔺🔺🟦 🔺🔺 ?', ['🟦', '🔺', '⚪', '⭐'], 0], ['10, 20, 40, ?', ['50', '60', '80', '100'], 2]],
  vocab: [['Opposite of hot?', ['warm', 'cold', 'big', 'wet'], 1], ['Means “very big”?', ['tiny', 'huge', 'soft', 'quick'], 1], ['A word for “happy”?', ['glad', 'sad', 'cross', 'dull'], 0]],
  math: [['6 × 3 = ?', ['15', '18', '21', '24'], 1], ['12 ÷ 4 = ?', ['2', '3', '4', '6'], 1], ['15 + 9 = ?', ['22', '23', '24', '25'], 2]]
};
const TYPE_WORD = {
  'typing-sprint': ['apple', 'river', 'happy'], 'word-scramble': ['plane', 'house', 'tiger'], 'letter-builder': ['cat', 'sun', 'dog'], 'number-recall': ['4827', '3916', '58204'],
  'reverse-recall': ['7284', '6193', '40285'], 'cipher-challenge': ['hello', 'brain', 'smart'], 'cipher-lab': ['brain', 'logic', 'think'], 'equation-rush': ['x = 4', 'x = 7', 'x = 3'],
  'running-total': ['17', '23', '9'], 'number-forge': ['24', '15', '36'], 'ratio-relay': ['12', '9', '20']
};
const TYPE_CLUE = { 'word-scramble': ['l p a n e', 'o s h u e', 'r i g e t'], 'letter-builder': ['🐱  t a c', '☀️  n u s', '🐶  g o d'], 'reverse-recall': ['4 8 2 7', '3 9 1 6', '5 8 2 0 4'], 'number-recall': ['4 8 2 7', '3 9 1 6', '5 8 2 0 4'], 'equation-rush': ['3x + 5 = 17', '2x − 4 = 10', 'x / 3 + 2 = 3'] };
const CATCH_ITEMS = {
  'word-balloon-pop': [['🎈cat', '🎈cot', '🎈cat'], ['🎈sun', '🎈son', '🎈sun'], ['🎈dog', '🎈dig', '🎈dog']], 'focus-filter': [['b', 'd', 'b'], ['▶', '◀', '▶'], ['q', 'p', 'q']],
  'rhyme-detective': [['🐱', '🎩', '🐶'], ['🐝', '🔑', '🐟'], ['🦊', '📦', '🌙']], 'fruit-shop': [['🍎', '🍌', '🍎'], ['🍊', '🍇', '🍊'], ['🍌', '🍉', '🍌']],
  'dot-count': [['🔵', '🔴', '🔵'], ['🟢', '🟡', '🟢'], ['🔴', '🔵', '🔴']], 'shape-count-dash': [['▲', '●', '▲'], ['■', '▲', '■'], ['★', '●', '★']],
  'interference-recall': [['sun', 'moon', 'sun'], ['rose', 'lily', 'rose'], ['car', 'bus', 'car']], 'word-association-grid': [['red', 'cat', 'blue'], ['apple', 'chair', 'mango'], ['run', 'blue', 'jump']]
};
const DEFAULT_CATCH = [['🍎', '🍌', '🍎'], ['⭐', '🌙', '⭐'], ['🐟', '🦀', '🐟']];

// What is happening at each step, written on the scene (2026-11-14: "not clear what the game is about").
const PHASE = {
  flip: ['Turn two cards', 'Find the pair', 'All matched!'], sequence: ['Watch the order', 'Your turn: repeat it', 'Correct!'],
  grid: ['Remember the lit tiles', 'Tap where they were', 'Correct!'], fill: ['Look at the grid', 'Fill the empty cells', 'Solved!'],
  order: ['All mixed up', 'Put them in order', 'In order!'], move: ['Start here', 'Find the way', 'Reached the goal!'],
  tower: ['Move the rings', 'One ring at a time', 'Done!'], type: ['Read it', 'Type it in', 'Correct!'],
  catch: ['Watch them fall', 'Tap only the right ones', 'Caught!'], choose: ['Read the question', 'Pick the answer', 'Correct!'],
  change: ['Remember picture A', 'Picture B — what changed?', 'Found it!']
};

// ---- The hand ----------------------------------------------------------------------------------------------------
function Hand({ x, y, tap }) {
  return (
    <span aria-hidden className="pointer-events-none absolute z-10 text-2xl transition-all duration-500 ease-out sm:text-3xl"
      style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-30%, -10%) scale(${tap ? 0.82 : 1})`, filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.25))' }}>👆</span>
  );
}

// ---- Scenes: each (f, data) → { body, hand: [x, y, tap], step } over its own frame count -------------------------
const SCENES = {
  flip: { frames: 8, draw: (f, id, ex) => {
    const pics = (id === 'animal-pair-safari' ? [['🐄', '🥛', '🐝', '🍯'], ['🐔', '🐣', '🐶', '🦴'], ['🐟', '🌊', '🐦', '🪺']] : [['🐶', '⭐', '🐶', '⭐'], ['🍎', '🚗', '🍎', '🚗'], ['🌙', '🎈', '🌙', '🎈']])[ex];
    const seq = [0, 2, 1, 3];
    const open = (i) => { const k = seq.indexOf(i); return f >= k * 2 + 1; };
    const target = seq[Math.min(3, Math.floor(f / 2))];
    const pos = [[30, 32], [70, 32], [30, 72], [70, 72]][target];
    return {
      body: <div className="grid h-full grid-cols-2 gap-2 p-3">{[0, 1, 2, 3].map((i) => (
        <div key={i} className={`grid place-items-center rounded-xl text-2xl font-black transition-all duration-500 ${open(i) ? 'bg-white ring-2 ring-emerald-300' : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white/80'}`}>{open(i) ? pics[i] : '?'}</div>))}</div>,
      hand: [...pos, f % 2 === 1], step: f < 2 ? 0 : f < 4 ? 1 : 2
    };
  } },
  sequence: { frames: 9, draw: (f, id, ex) => {
    const run = [[0, 4, 8], [2, 4, 6], [1, 3, 7]][ex]; const cells = [...Array(9).keys()];
    const lit = f < 3 ? run[f] : f >= 4 && f < 7 ? run[f - 4] : null;
    const pos = (i) => [20 + (i % 3) * 30, 18 + Math.floor(i / 3) * 30];
    return {
      body: <div className="grid h-full grid-cols-3 gap-1.5 p-2.5">{cells.map((i) => <div key={i} className={`rounded-lg transition-colors duration-300 ${lit === i ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,.9)]' : 'bg-indigo-100'}`} />)}</div>,
      hand: f >= 4 && f < 7 ? [...pos(run[f - 4]), true] : [88, 86, false], step: f < 3 ? 0 : f < 7 ? 1 : 2
    };
  } },
  grid: { frames: 8, draw: (f, id, ex) => {
    const lit = [[1, 6, 11], [0, 9, 14], [3, 5, 12]][ex]; const cells = [...Array(16).keys()];
    const show = f < 2; const tapped = f >= 3 ? lit.slice(0, Math.min(3, f - 2)) : [];
    const pos = (i) => [14 + (i % 4) * 24, 14 + Math.floor(i / 4) * 24];
    const t = lit[Math.min(2, Math.max(0, f - 3))];
    return {
      body: <div className="grid h-full grid-cols-4 gap-1 p-2">{cells.map((i) => <div key={i} className={`rounded-md transition-colors duration-300 ${(show && lit.includes(i)) ? 'bg-sky-400' : tapped.includes(i) ? 'bg-emerald-400' : 'bg-slate-200'}`} />)}</div>,
      hand: f >= 3 && f < 6 ? [...pos(t), true] : [88, 88, false], step: f < 2 ? 0 : f < 6 ? 1 : 2
    };
  } },
  fill: { frames: 7, draw: (f, id, ex) => {
    const xo = id === 'tic-tac-toe';
    const given = xo ? { 0: 'X', 4: 'O', 8: '' } : { 0: '1', 2: '3', 4: '2', 6: '2', 8: '1' };
    const put = (xo ? [[[8, 'X'], [2, 'O'], [6, 'X']], [[2, 'X'], [6, 'O'], [1, 'X']], [[6, 'X'], [3, 'O'], [7, 'X']]] : [[[1, '2'], [3, '3'], [5, '1']], [[3, '3'], [7, '1'], [1, '2']], [[5, '1'], [1, '2'], [7, '1']]])[ex];
    const cells = [...Array(9).keys()];
    const done = put.slice(0, Math.max(0, Math.min(3, f - 1)));
    const pos = (i) => [20 + (i % 3) * 30, 18 + Math.floor(i / 3) * 30];
    const t = put[Math.min(2, Math.max(0, f - 1))][0];
    return {
      body: <div className="grid h-full grid-cols-3 gap-1 p-2.5">{cells.map((i) => {
        const p = done.find(([c]) => c === i);
        return <div key={i} className={`grid place-items-center rounded-md text-lg font-black ${p ? 'bg-emerald-100 text-emerald-700' : given[i] ? 'bg-white text-slate-800' : 'bg-white/60 text-slate-300'} ring-1 ring-slate-200`}>{p ? p[1] : given[i] || ''}</div>;
      })}</div>,
      hand: f >= 1 && f < 4 ? [...pos(t), true] : [88, 88, false], step: f < 1 ? 0 : f < 4 ? 1 : 2
    };
  } },
  order: { frames: 7, draw: (f, id, ex) => {
    const start = [[3, 1, 4, 2], [4, 2, 1, 3], [2, 4, 3, 1]][ex]; const goal = [1, 2, 3, 4];
    const mid = [[1, 3, 4, 2], [1, 2, 4, 3], [1, 4, 3, 2]][ex];
    const now = f < 2 ? start : f < 4 ? mid : goal;
    const ok = f >= 4;
    return {
      body: <div className="flex h-full flex-col justify-center gap-1.5 p-3">{now.map((n, i) => (
        <div key={n} className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-black transition-all duration-500 ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-slate-800 ring-1 ring-slate-200'}`} style={{ order: i }}>
          <span className="h-2 rounded-full bg-violet-400" style={{ width: `${n * 18}%` }} /> {n}
        </div>))}</div>,
      hand: f === 2 ? [50, 22, true] : f === 3 ? [50, 60, true] : [88, 88, false], step: f < 2 ? 0 : f < 4 ? 1 : 2
    };
  } },
  move: { frames: 7, draw: (f, id, ex) => {
    const path = [[[0, 2], [1, 2], [1, 1], [2, 1], [3, 1], [3, 0]], [[0, 2], [0, 1], [1, 1], [2, 1], [3, 1], [3, 0]], [[0, 2], [1, 2], [1, 1], [2, 1], [2, 0], [3, 0]]][ex];
    const at = path[Math.min(path.length - 1, f)];
    const walls = [['0-0', '1-0', '2-2', '0-1', '2-0'], ['0-0', '1-0', '1-2', '2-2', '2-0'], ['0-0', '1-0', '0-1', '3-2', '3-1']][ex];
    return {
      body: <div className="grid h-full grid-cols-4 grid-rows-3 gap-1 p-2">{[0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c) => {
        const here = at[0] === c && at[1] === r; const goal = c === 3 && r === 0; const wall = walls.includes(`${c}-${r}`);
        return <div key={`${c}-${r}`} className={`grid place-items-center rounded-md text-lg ${wall ? 'bg-slate-500' : 'bg-lime-100'}`}>{here ? '🐸' : goal ? '⭐' : ''}</div>;
      }))}</div>,
      hand: [12 + at[0] * 25, 18 + at[1] * 32, f > 0 && f < 6], step: f < 1 ? 0 : f < 5 ? 1 : 2
    };
  } },
  tower: { frames: 6, draw: (f) => {
    const states = [[[3, 2, 1], [], []], [[3, 2], [], [1]], [[3], [2], [1]], [[3], [2, 1], []], [[], [2, 1], [3]], [[1], [2], [3]]];
    const s = states[f];
    return {
      body: <div className="flex h-full items-end justify-around px-2 pb-2">{s.map((stack, p) => (
        <div key={p} className="relative flex h-[85%] w-[28%] flex-col-reverse items-center">
          <span className="absolute bottom-0 h-full w-1.5 rounded bg-amber-700/70" />
          <span className="absolute bottom-0 h-1.5 w-full rounded bg-amber-800" />
          {stack.map((r) => <span key={r} className="relative z-10 mb-0.5 h-3.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${30 + r * 22}%` }} />)}
        </div>))}</div>,
      hand: [[50, 40], [16, 40], [50, 40], [83, 40], [16, 40], [83, 40]][f].concat(true), step: f < 2 ? 0 : f < 4 ? 1 : 2
    };
  } },
  type: { frames: 8, draw: (f, id, ex) => {
    const word = (TYPE_WORD[id] || ['brain', 'smart', 'think'])[ex];
    const n = Math.max(0, Math.min(word.length, Math.round(((f - 1) / 5) * word.length)));
    const done = f >= 6;
    return {
      body: <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
        <span className="text-xs font-black tracking-widest text-slate-500 uppercase">{TYPE_CLUE[id]?.[ex] || 'Type it'}</span>
        <span className={`min-w-[70%] rounded-xl px-3 py-2 text-center font-mono text-lg font-black ring-2 ${done ? 'bg-emerald-50 text-emerald-700 ring-emerald-300' : 'bg-white text-slate-800 ring-indigo-200'}`}>{word.slice(0, n)}<span className="animate-pulse">{done ? ' ✓' : '|'}</span></span>
      </div>,
      hand: f >= 1 && f < 6 ? [30 + (f % 3) * 20, 82, f % 2 === 0] : [88, 88, false], step: f < 1 ? 0 : f < 6 ? 1 : 2
    };
  } },
  catch: { frames: 8, draw: (f, id, ex) => {
    const items = (CATCH_ITEMS[id] || DEFAULT_CATCH)[ex];
    const ys = items.map((_, i) => ((f * 14 + i * 33) % 90));
    const caught = f >= 3 ? (f >= 5 ? 2 : 1) : 0;
    return {
      body: <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-b from-sky-100 to-white">
        {items.map((it, i) => <span key={i} className="absolute text-2xl font-black transition-all duration-500 ease-linear" style={{ left: `${15 + i * 30}%`, top: `${ys[i]}%`, opacity: i === 0 && caught >= 1 ? 0 : i === 2 && caught >= 2 ? 0 : 1 }}>{it}</span>)}
        <span className="absolute right-2 bottom-1.5 rounded-full bg-white px-2 py-0.5 text-xs font-black text-emerald-700 shadow">✓ {caught}</span>
      </div>,
      hand: f === 3 ? [20, ys[0], true] : f === 5 ? [80, ys[2], true] : [50, 88, false], step: f < 2 ? 0 : f < 6 ? 1 : 2
    };
  } },
  change: { frames: 7, draw: (f, id, ex) => {
    const A = [['🍎', '⭐', '🐶', '🚗', '🌙', '🎈', '🐟', '🌳', '⚽'], ['🦋', '🍩', '🎩', '🚀', '🐢', '🌻', '🧲', '⭐', '🎈'], ['🐱', '🍌', '🚲', '☀️', '🎁', '🐸', '🍕', '🔑', '🌈']][ex];
    const at = [4, 6, 2][ex];
    const missing = id === 'whats-missing';
    const B = A.map((p, i) => (i === at ? (missing ? '' : ['🍌', '🐙', '🎸'][ex]) : p));
    const covered = f === 2;
    const showB = f >= 3;
    const found = f >= 5;
    const pos = [20 + (at % 3) * 30, 18 + Math.floor(at / 3) * 30];
    return {
      body: <div className="relative grid h-full grid-cols-3 gap-1 p-2">
        {(showB ? B : A).map((p, i) => <div key={i} className={`grid place-items-center rounded-md text-xl transition-colors duration-300 ${found && i === at ? 'bg-emerald-200 ring-2 ring-emerald-500' : 'bg-white ring-1 ring-slate-200'}`}>{covered ? '' : p}</div>)}
        {covered && <span className="absolute inset-2 grid place-items-center rounded-lg bg-slate-700/85 text-xs font-black text-white">Hidden…</span>}
        <span className="absolute top-1 right-1 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-black text-white">{showB ? 'B' : 'A'}</span>
      </div>,
      hand: f === 4 || f === 5 ? [...pos, true] : [88, 88, false], step: f < 3 ? 0 : f < 5 ? 1 : 2
    };
  } },
  choose: { frames: 6, draw: (f, id, ex) => {
    const [q, opts, right] = (CHOOSE[id] || CHOOSE_BY_CATEGORY[CATEGORY_OF[id]] || CHOOSE_BY_CATEGORY.logic)[ex];
    const picked = f >= 3;
    const cols = opts.length === 2 ? 2 : 2;
    const pos = (i) => [28 + (i % cols) * 44, 52 + Math.floor(i / cols) * 26];
    return {
      body: <div className="flex h-full flex-col gap-1.5 p-2.5">
        <div className="grid min-h-[34%] place-items-center rounded-xl bg-indigo-50 px-2 text-center text-sm font-black text-indigo-900 sm:text-base">{q}</div>
        <div className="grid flex-1 grid-cols-2 gap-1.5">{opts.map((o, i) => (
          <div key={i} className={`grid place-items-center rounded-lg px-1 text-center text-xs font-black transition-colors duration-300 sm:text-sm ${picked && i === right ? 'bg-emerald-400 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>{o}{picked && i === right ? ' ✓' : ''}</div>))}</div>
      </div>,
      hand: f >= 1 && f < 4 ? [...pos(right), f === 2 || f === 3] : [88, 90, false], step: f < 1 ? 0 : f < 4 ? 1 : 2
    };
  } }
};

const demoKindOf = (gameId) => KIND[gameId] || 'choose';

/*
 * A game's own demo (demos/*.jsx) wins over the shared scenes: { frames, draw(f, ex) → { body, hand: [x%, y%, tap],
 * step: 0|1|2, phase: 'label' } } — `ex` 0..2 is which of three examples is playing.
 */
export default function GameDemo({ gameId, steps = [] }) {
  const own = GAME_DEMOS[gameId];
  const scene = own ? { frames: own.frames, draw: (f, id, ex) => own.draw(f, ex) } : SCENES[demoKindOf(gameId)];
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // A tick counter: each run of the scene is one example, then the next (three in turn, 2026-11-14).
  const [t, setT] = useState(reduced ? scene.frames - 1 : 0);
  useEffect(() => {
    if (reduced) return undefined;
    const iv = setInterval(() => setT((n) => n + 1), FRAME_MS);
    return () => clearInterval(iv);
  }, [reduced, scene.frames]);
  const run = scene.frames + 2; // two frames' rest at the end of each example
  const ex = Math.floor(t / run) % 3;
  const frame = Math.min(t % run, scene.frames - 1);
  const { body, hand, step, phase } = scene.draw(frame, gameId, ex);

  return (
    <div data-game-demo={demoKindOf(gameId)}>
      <p className="mb-2 flex justify-center gap-1.5" aria-hidden>{[0, 1, 2].map((i) => <span key={i} className={`h-1.5 w-6 rounded-full transition-colors ${i === ex ? 'bg-violet-500' : 'bg-violet-200'}`} />)}</p>
      <div className="relative mx-auto aspect-[4/3] w-full max-w-[30rem] overflow-hidden rounded-2xl text-[1.15em] sm:text-[1.35em] bg-gradient-to-br from-slate-50 to-indigo-50 ring-1 ring-indigo-100" role="img" aria-label={`How to play: ${steps.join(' ')}`}>
        {body}
        <span className={`absolute top-1.5 left-1.5 z-20 rounded-full px-2 py-0.5 text-[11px] font-black shadow-sm ${step === 2 ? 'bg-emerald-500 text-white' : 'bg-white/95 text-indigo-700 ring-1 ring-indigo-100'}`}>{phase || (PHASE[demoKindOf(gameId)] || PHASE.choose)[step]}</span>
        <Hand x={hand[0]} y={hand[1]} tap={hand[2]} />
      </div>
    </div>
  );
}
