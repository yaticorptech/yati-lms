/**
 * Algorithm Builder (2026-11-13): the levels and the interpreter, pure, so a test can run every level's
 * reference solution through the very code the game uses.
 *
 * A program is a flat list of tokens. Blocks that hold others — `repeat`, `repeatR` (repeat a register's
 * value), `ifWall`, `ifGt`, `ifOdd` — are closed by an `end` token; `end` is a bracket, not a block, so it is
 * never counted. Three machines run programs:
 *   robot    — a grid with walls and gems; the run stops the moment the last gem is collected.
 *   cards    — 'swap' mode (fixed adjacent swaps, must sort this deal) or 'machine' mode (a cursor with
 *              "if card > next: swap", "step right", "back to start", which must sort EVERY deal of n cards).
 *   register — named registers and arithmetic blocks; the goal register must hold the right value for every
 *              listed input.
 * Bands: 'analytical' (Classes 9–10) sequences and loops; 'advanced' (11–12+) loops, conditionals and a hard
 * block cap a little above the optimum, so only an efficient algorithm fits.
 */

export const OPENERS = new Set(['repeat', 'repeatR', 'ifWall', 'ifGt', 'ifOdd']);
export const isOpener = (tok) => OPENERS.has(tok.op);
/** Blocks a program uses: every token but the closing brackets. */
export const blockCount = (tokens) => tokens.filter((t) => t.op !== 'end').length;

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N E S W
const DIR_OF = { '^': 0, '>': 1, v: 2, '<': 3 };

/* ------------------------------------------------------------------ parsing */

/** Flat tokens → a tree. { ok, tree } or { ok: false, error, at }. */
export const parse = (tokens) => {
  const root = [];
  const stack = [{ body: root, pc: -1 }];
  for (let pc = 0; pc < tokens.length; pc++) {
    const tok = tokens[pc];
    if (tok.op === 'end') {
      if (stack.length === 1) return { ok: false, error: 'An “end” has no block to close.', at: pc };
      stack.pop();
    } else if (isOpener(tok)) {
      const node = { tok, pc, body: [] };
      stack[stack.length - 1].body.push(node);
      stack.push(node);
    } else {
      stack[stack.length - 1].body.push({ tok, pc });
    }
  }
  if (stack.length > 1) return { ok: false, error: 'A block is still open — add its “end”.', at: stack[stack.length - 1].pc };
  return { ok: true, tree: root };
};

/** How deep each token sits, for indenting the program. */
export const depths = (tokens) => {
  let d = 0;
  return tokens.map((t) => {
    if (t.op === 'end') { d = Math.max(0, d - 1); return d; }
    const at = d;
    if (isOpener(t)) d += 1;
    return at;
  });
};

/** Index of the `end` that closes the opener at `i`, or -1. */
export const matchingEnd = (tokens, i) => {
  let d = 0;
  for (let k = i; k < tokens.length; k++) {
    if (isOpener(tokens[k])) d += 1;
    else if (tokens[k].op === 'end') { d -= 1; if (d === 0) return k; }
  }
  return -1;
};

/* ------------------------------------------------------------------ machines */

export const parseMap = (rows) => {
  const walls = new Set();
  const gems = [];
  let start = null;
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '#') walls.add(`${x},${y}`);
    else if (ch === 'G') gems.push([x, y]);
    else if (ch in DIR_OF) start = { x, y, dir: DIR_OF[ch] };
  }));
  return { w: Math.max(...rows.map((r) => r.length)), h: rows.length, walls, gems, start };
};

const robotMachine = (level) => {
  const map = level.map || parseMap(level.rows);
  const blocked = (x, y) => x < 0 || y < 0 || x >= map.w || y >= map.h || map.walls.has(`${x},${y}`);
  const ahead = (s) => [s.x + DIRS[s.dir][0], s.y + DIRS[s.dir][1]];
  return {
    cases: () => [null],
    init: () => ({ x: map.start.x, y: map.start.y, dir: map.start.dir, got: [] }),
    clone: (s) => ({ ...s, got: [...s.got] }),
    early: (s) => s.got.length === map.gems.length,
    apply: (s, tok) => {
      if (tok.op === 'left') { s.dir = (s.dir + 3) % 4; return null; }
      if (tok.op === 'right') { s.dir = (s.dir + 1) % 4; return null; }
      if (tok.op === 'fwd') {
        const [x, y] = ahead(s);
        if (blocked(x, y)) return 'The robot drove into a wall.';
        s.x = x; s.y = y;
        const g = map.gems.findIndex(([gx, gy]) => gx === x && gy === y);
        if (g >= 0 && !s.got.includes(g)) s.got.push(g);
        return null;
      }
      return `Unknown block ${tok.op}.`;
    },
    test: (s, tok) => (tok.op === 'ifWall' ? blocked(...ahead(s)) : false),
    loops: () => 0,
    check: (s) => (s.got.length === map.gems.length ? null : `${map.gems.length - s.got.length} gem${map.gems.length - s.got.length === 1 ? '' : 's'} left behind.`)
  };
};

const sortedOk = (deck) => deck.every((v, i) => i === 0 || deck[i - 1] <= v);

const permutations = (list) => {
  if (list.length <= 1) return [list];
  const out = [];
  list.forEach((v, i) => permutations([...list.slice(0, i), ...list.slice(i + 1)]).forEach((p) => out.push([v, ...p])));
  return out;
};

const cardsMachine = (level) => ({
  cases: () => (level.mode === 'machine' ? [level.deck, ...permutations(level.deck).filter((p) => p.join() !== level.deck.join())] : [level.deck]),
  init: (deck) => ({ deck: [...deck], cur: 0 }),
  clone: (s) => ({ deck: [...s.deck], cur: s.cur }),
  early: () => false,
  apply: (s, tok) => {
    const n = s.deck.length;
    if (tok.op === 'swap') {
      [s.deck[tok.i], s.deck[tok.i + 1]] = [s.deck[tok.i + 1], s.deck[tok.i]];
      return null;
    }
    if (tok.op === 'cmpSwap') {
      if (s.cur >= n - 1) return 'There is no card to the right of the cursor.';
      if (s.deck[s.cur] > s.deck[s.cur + 1]) [s.deck[s.cur], s.deck[s.cur + 1]] = [s.deck[s.cur + 1], s.deck[s.cur]];
      return null;
    }
    if (tok.op === 'step') {
      if (s.cur >= n - 1) return 'The cursor ran off the end of the row.';
      s.cur += 1;
      return null;
    }
    if (tok.op === 'home') { s.cur = 0; return null; }
    return `Unknown block ${tok.op}.`;
  },
  test: () => false,
  loops: () => 0,
  check: (s) => (sortedOk(s.deck) ? null : 'The cards are not in order yet.')
});

const LIMIT = 100000;
const registerMachine = (level) => ({
  cases: () => level.cases,
  init: (input) => ({ ...input }),
  clone: (s) => ({ ...s }),
  early: () => false,
  apply: (s, tok) => {
    if (tok.op === 'inc') s[tok.r] += 1;
    else if (tok.op === 'dec') s[tok.r] -= 1;
    else if (tok.op === 'dbl') s[tok.r] *= 2;
    else if (tok.op === 'add') s[tok.r] += s[tok.src];
    else if (tok.op === 'set') s[tok.r] = s[tok.src];
    else return `Unknown block ${tok.op}.`;
    if (Math.abs(s[tok.r]) > LIMIT) return `${tok.r} grew past ${LIMIT}.`;
    return null;
  },
  test: (s, tok) => {
    if (tok.op === 'ifGt') return s[tok.r] > s[tok.src];
    if (tok.op === 'ifOdd') return Math.abs(s[tok.r]) % 2 === 1;
    return false;
  },
  loops: (s, tok) => Math.max(0, Math.min(50, s[tok.r])),
  check: (s, input) => {
    const want = level.goal(input);
    return s[level.target] === want ? null : `${level.target} is ${s[level.target]}, but it should be ${want}.`;
  }
});

const machineFor = (level) => (level.type === 'robot' ? robotMachine(level) : level.type === 'cards' ? cardsMachine(level) : registerMachine(level));

/* ------------------------------------------------------------------ running */

class Halt { constructor(msg) { this.msg = msg; } }
class Done {}

/**
 * Run a program on one input. `frames` (when asked for) are snapshots for the step-by-step view:
 * { pc, state, note }. Returns { ok, error, steps, frames, state }.
 */
export const runOnce = (level, tokens, input, { trace = false, maxSteps = 4000 } = {}) => {
  const parsed = parse(tokens);
  if (!parsed.ok) return { ok: false, error: parsed.error, at: parsed.at, steps: 0, frames: [], state: null };
  const m = machineFor(level);
  const state = m.init(input);
  const frames = [];
  let steps = 0;
  const snap = (pc, note) => { if (trace) frames.push({ pc, state: m.clone(state), note }); };
  const tick = (pc) => {
    steps += 1;
    if (steps > maxSteps) throw new Halt('The program ran too long.');
    return pc;
  };
  const exec = (nodes) => {
    for (const node of nodes) {
      const { tok, pc } = node;
      if (tok.op === 'repeat' || tok.op === 'repeatR') {
        const n = tok.op === 'repeat' ? tok.n : m.loops(state, tok);
        for (let k = 1; k <= n; k++) {
          tick(pc);
          snap(pc, `Repeat: round ${k} of ${n}`);
          exec(node.body);
        }
        if (n === 0) snap(pc, 'Repeat 0 times — skipped');
      } else if (node.body) {
        tick(pc);
        const yes = m.test(state, tok);
        snap(pc, yes ? 'Condition true — run the inside' : 'Condition false — skip');
        if (yes) exec(node.body);
      } else {
        tick(pc);
        const err = m.apply(state, tok);
        snap(pc, err || null);
        if (err) throw new Halt(err);
        if (m.early(state)) throw new Done();
      }
    }
  };
  try {
    exec(parsed.tree);
  } catch (e) {
    if (e instanceof Halt) return { ok: false, error: e.msg, steps, frames, state };
    if (!(e instanceof Done)) throw e;
  }
  const error = m.check(state, input);
  return { ok: !error, error, steps, frames, state };
};

/** Run a program on every input the level checks. { ok, error, failed (input), shown (first run, traced) }. */
export const verify = (level, tokens, { trace = false } = {}) => {
  const cases = machineFor(level).cases();
  const shown = runOnce(level, tokens, cases[0], { trace });
  if (!shown.ok) return { ok: false, error: shown.error, failed: cases[0], shown, checked: 1 };
  for (let i = 1; i < cases.length; i++) {
    const r = runOnce(level, tokens, cases[i]);
    if (!r.ok) return { ok: false, error: r.error, failed: cases[i], shown, checked: i + 1 };
  }
  return { ok: true, error: null, failed: null, shown, checked: cases.length };
};

export const casesOf = (level) => machineFor(level).cases();
export const initialState = (level) => machineFor(level).init(machineFor(level).cases()[0]);

/** 3 at the optimum (or better), 2 within two blocks of it, 1 for any working program. */
export const starsForBlocks = (count, optimal) => (count <= optimal ? 3 : count <= optimal + 2 ? 2 : 1);

/* ------------------------------------------------------------------ brute force (tests) */

/**
 * Every well-formed program over a palette with at most `maxBlocks` blocks (openers closed at once, at
 * any later point, or left for an implicit close at the end), for proving a level's optimum is minimal.
 * Repeat counts run 2…maxRepeat. Empty bodies are skipped.
 */
export function* programs(palette, maxBlocks, maxRepeat = 9) {
  const choices = [];
  palette.forEach((p) => {
    if (p.op === 'repeat') for (let n = 2; n <= maxRepeat; n++) choices.push({ ...p, n });
    else choices.push(p);
  });
  function* grow(prog, blocks, depth, lastOpen) {
    if (blocks > 0 && !lastOpen) yield [...prog, ...Array(depth).fill({ op: 'end' })];
    if (blocks < maxBlocks) {
      for (const c of choices) {
        prog.push(c);
        yield* grow(prog, blocks + 1, depth + (isOpener(c) ? 1 : 0), isOpener(c));
        prog.pop();
      }
    }
    if (depth > 0 && !lastOpen) {
      prog.push({ op: 'end' });
      yield* grow(prog, blocks, depth - 1, false);
      prog.pop();
    }
  }
  yield* grow([], 0, 0, false);
}

/* ------------------------------------------------------------------ labels */

const DIR_NAME = ['north', 'east', 'south', 'west'];
export const dirName = (d) => DIR_NAME[d];

export const labelOf = (tok) => {
  switch (tok.op) {
    case 'fwd': return 'Move forward';
    case 'left': return 'Turn left';
    case 'right': return 'Turn right';
    case 'repeat': return `Repeat ${tok.n ?? 'n'} times`;
    case 'repeatR': return `Repeat ${tok.r} times`;
    case 'ifWall': return 'If wall ahead';
    case 'swap': return `Swap ${tok.i + 1} ↔ ${tok.i + 2}`;
    case 'cmpSwap': return 'If card > next: swap';
    case 'step': return 'Cursor right';
    case 'home': return 'Cursor to start';
    case 'inc': return `${tok.r} = ${tok.r} + 1`;
    case 'dec': return `${tok.r} = ${tok.r} − 1`;
    case 'dbl': return `${tok.r} = ${tok.r} × 2`;
    case 'add': return `${tok.r} = ${tok.r} + ${tok.src}`;
    case 'set': return `${tok.r} = ${tok.src}`;
    case 'ifGt': return `If ${tok.r} > ${tok.src}`;
    case 'ifOdd': return `If ${tok.r} is odd`;
    case 'end': return 'end';
    default: return tok.op;
  }
};

/** A short program as text, e.g. for the result. */
export const programText = (tokens) => {
  const d = depths(tokens);
  return tokens.map((t, i) => `${'  '.repeat(d[i])}${t.op === 'end' ? 'end' : labelOf(t)}`).join('\n');
};

/* ------------------------------------------------------------------ levels */

const T = {
  fwd: { op: 'fwd' }, left: { op: 'left' }, right: { op: 'right' }, ifWall: { op: 'ifWall' },
  rep: (n) => ({ op: 'repeat', n }), end: { op: 'end' },
  cmp: { op: 'cmpSwap' }, step: { op: 'step' }, home: { op: 'home' }
};
const ROBOT_BASIC = [T.fwd, T.left, T.right, { op: 'repeat', n: 2 }];
const ROBOT_COND = [...ROBOT_BASIC, T.ifWall];

/** Robot courses, easiest first. `ref` is a shortest program; tests prove nothing shorter works. */
const ROBOTS = {
  analytical: [
    { title: 'Straight run', rows: ['>.....G'], ref: [T.rep(6), T.fwd, T.end] },
    { title: 'The corner', rows: ['>...', '###.', '###.', '###G'], ref: [T.rep(2), T.rep(3), T.fwd, T.end, T.right, T.end] },
    { title: 'Staircase', rows: ['>G##', '#.G#', '##.G'], ref: [T.rep(3), T.fwd, T.right, T.fwd, T.left, T.end] },
    { title: 'Courtyard', rows: ['>..G', '.##.', '.##.', 'G..G'], ref: [T.rep(3), T.rep(3), T.fwd, T.end, T.right, T.end] },
    { title: 'Long stairs', rows: ['>.G######', '##..G####', '####..G##', '######..G'], ref: [T.rep(4), T.fwd, T.fwd, T.right, T.fwd, T.left, T.end], maxRepeat: 5 },
    { title: 'Perimeter', rows: ['>...G', '.###.', '.###.', '.###.', 'G...G'], ref: [T.rep(4), T.rep(4), T.fwd, T.end, T.right, T.end], maxRepeat: 5 },
  ],
  advanced: [
    { title: 'Spiral', rows: ['>....', '####.', '.G.#.', '.###.', '.....'], ref: [T.rep(16), T.ifWall, T.right, T.end, T.fwd, T.end], cond: true, maxRepeat: 20 },
    { title: 'Ring road', rows: ['>....G', '.####.', '.####.', 'G....G'], ref: [T.rep(13), T.ifWall, T.right, T.end, T.fwd, T.end], cond: true, maxRepeat: 20 },
    { title: 'Long spiral', rows: ['>.....', '#####.', '....#.', '.##G#.', '.####.', '......'], ref: [T.rep(22), T.ifWall, T.right, T.end, T.fwd, T.end], cond: true, maxRepeat: 24 },
    { title: 'Staircase, tight', rows: ['>.G######', '##..G####', '####..G##', '######..G'], ref: [T.rep(4), T.fwd, T.fwd, T.right, T.fwd, T.left, T.end], maxRepeat: 5 },
    { title: 'Perimeter, tight', rows: ['>...G', '.###.', '.###.', '.###.', 'G...G'], ref: [T.rep(4), T.rep(4), T.fwd, T.end, T.right, T.end], maxRepeat: 5 }
  ]
};

const R = (op, r, src) => ({ op, r, ...(src ? { src } : {}) });

/** Register puzzles. `cases` are the inputs checked; the first is the one shown. */
const REGISTERS = {
  analytical: [
    { title: 'Power up', goalText: 'Make A equal 32.', target: 'A', cases: [{ A: 1 }], goal: () => 32, palette: [R('inc', 'A'), R('dbl', 'A'), { op: 'repeat', n: 2 }], ref: [T.rep(5), R('dbl', 'A'), T.end] },
    { title: 'Odd target', goalText: 'Make A equal 26.', target: 'A', cases: [{ A: 3 }], goal: () => 26, palette: [R('inc', 'A'), R('dbl', 'A'), { op: 'repeat', n: 2 }], ref: [R('dbl', 'A'), R('dbl', 'A'), R('inc', 'A'), R('dbl', 'A')] },
    { title: 'Count up', goalText: 'Make A equal 45, starting from 3. Repeats can sit inside repeats.', target: 'A', cases: [{ A: 3 }], goal: () => 45, palette: [R('inc', 'A'), R('dec', 'A'), R('dbl', 'A'), { op: 'repeat', n: 2 }], ref: [T.rep(6), T.rep(7), R('inc', 'A'), T.end, T.end] },
    { title: 'Fill the tank', goalText: 'Make B equal 30. A holds 5.', target: 'B', cases: [{ A: 5, B: 0 }], goal: () => 30, palette: [R('inc', 'B'), R('add', 'B', 'A'), R('dbl', 'B'), { op: 'repeat', n: 2 }], ref: [T.rep(6), R('add', 'B', 'A'), T.end] },
    { title: 'Big number', goalText: 'Make A equal 100, starting from 3.', target: 'A', cases: [{ A: 3 }], goal: () => 100, palette: [R('inc', 'A'), R('dbl', 'A'), { op: 'repeat', n: 2 }], ref: [T.rep(5), R('dbl', 'A'), T.end, T.rep(4), R('inc', 'A'), T.end] },
    { title: 'Mirror', goalText: 'Make B equal 3 × A. A is 7.', target: 'B', cases: [{ A: 7, B: 0 }], goal: (i) => 3 * i.A, palette: [R('inc', 'B'), R('add', 'B', 'A'), R('set', 'B', 'A'), R('dbl', 'B'), { op: 'repeat', n: 2 }], ref: [T.rep(3), R('add', 'B', 'A'), T.end] }
  ],
  advanced: [
    { title: 'Multiplier', goalText: 'Make C = A × B, for any A and B. C starts at 0.', target: 'C', cases: [{ A: 4, B: 3, C: 0 }, { A: 7, B: 5, C: 0 }, { A: 2, B: 0, C: 0 }, { A: 9, B: 6, C: 0 }], goal: (i) => i.A * i.B, palette: [R('inc', 'C'), R('add', 'C', 'A'), R('add', 'C', 'B'), { op: 'repeatR', r: 'A' }, { op: 'repeatR', r: 'B' }], ref: [{ op: 'repeatR', r: 'B' }, R('add', 'C', 'A'), T.end] },
    { title: 'Powers of two', goalText: 'Make C = 2 to the power B. C starts at 1.', target: 'C', cases: [{ A: 0, B: 5, C: 1 }, { A: 0, B: 0, C: 1 }, { A: 0, B: 8, C: 1 }], goal: (i) => 2 ** i.B, palette: [R('inc', 'C'), R('dbl', 'C'), R('add', 'C', 'B'), { op: 'repeatR', r: 'B' }], ref: [{ op: 'repeatR', r: 'B' }, R('dbl', 'C'), T.end] },
    { title: 'Larger of two', goalText: 'Make C = the larger of A and B.', target: 'C', cases: [{ A: 4, B: 9, C: 0 }, { A: 8, B: 3, C: 0 }, { A: 5, B: 5, C: 0 }, { A: 0, B: 2, C: 0 }], goal: (i) => Math.max(i.A, i.B), palette: [R('set', 'C', 'A'), R('set', 'C', 'B'), { op: 'ifGt', r: 'A', src: 'B' }, { op: 'ifGt', r: 'B', src: 'C' }], ref: [R('set', 'C', 'A'), { op: 'ifGt', r: 'B', src: 'C' }, R('set', 'C', 'B'), T.end] },
    { title: 'Round up to even', goalText: 'Make C = A rounded up to the next even number (even stays).', target: 'C', cases: [{ A: 7, C: 0 }, { A: 4, C: 0 }, { A: 0, C: 0 }, { A: 13, C: 0 }], goal: (i) => i.A + (i.A % 2), palette: [R('set', 'C', 'A'), R('inc', 'C'), R('dbl', 'C'), { op: 'ifOdd', r: 'A' }, { op: 'ifOdd', r: 'C' }], ref: [R('set', 'C', 'A'), { op: 'ifOdd', r: 'C' }, R('inc', 'C'), T.end] },
    { title: 'Square', goalText: 'Make C = A × A. C starts at 0.', target: 'C', cases: [{ A: 6, C: 0 }, { A: 1, C: 0 }, { A: 0, C: 0 }, { A: 11, C: 0 }], goal: (i) => i.A * i.A, palette: [R('inc', 'C'), R('add', 'C', 'A'), R('dbl', 'C'), { op: 'repeatR', r: 'A' }, { op: 'repeatR', r: 'C' }], ref: [{ op: 'repeatR', r: 'A' }, R('add', 'C', 'A'), T.end] },
    { title: 'Largest of three', goalText: 'Make C = the largest of A, B and D.', target: 'C', cases: [{ A: 4, B: 9, D: 2, C: 0 }, { A: 8, B: 3, D: 1, C: 0 }, { A: 2, B: 3, D: 7, C: 0 }, { A: 5, B: 5, D: 5, C: 0 }, { A: 1, B: 6, D: 6, C: 0 }], goal: (i) => Math.max(i.A, i.B, i.D), palette: [R('set', 'C', 'A'), R('set', 'C', 'B'), R('set', 'C', 'D'), { op: 'ifGt', r: 'B', src: 'C' }, { op: 'ifGt', r: 'D', src: 'C' }], ref: [R('set', 'C', 'A'), { op: 'ifGt', r: 'B', src: 'C' }, R('set', 'C', 'B'), T.end, { op: 'ifGt', r: 'D', src: 'C' }, R('set', 'C', 'D'), T.end] },
    { title: 'Triangle number', goalText: 'Make C = 1 + 2 + … + A. C and B start at 0.', target: 'C', cases: [{ A: 4, B: 0, C: 0 }, { A: 1, B: 0, C: 0 }, { A: 7, B: 0, C: 0 }, { A: 0, B: 0, C: 0 }], goal: (i) => (i.A * (i.A + 1)) / 2, palette: [R('inc', 'B'), R('inc', 'C'), R('add', 'C', 'B'), R('add', 'C', 'A'), { op: 'repeatR', r: 'A' }], ref: [{ op: 'repeatR', r: 'A' }, R('inc', 'B'), R('add', 'C', 'B'), T.end] }
  ]
};

const inversions = (deck) => {
  let n = 0;
  for (let i = 0; i < deck.length; i++) for (let j = i + 1; j < deck.length; j++) if (deck[i] > deck[j]) n += 1;
  return n;
};

/** Adjacent swaps that bubble-sort a deal: exactly `inversions` of them, the fewest possible. */
export const bubbleSwaps = (deck) => {
  const d = [...deck];
  const out = [];
  for (let pass = 0; pass < d.length; pass++) {
    for (let i = 0; i < d.length - 1; i++) {
      if (d[i] > d[i + 1]) { [d[i], d[i + 1]] = [d[i + 1], d[i]]; out.push({ op: 'swap', i }); }
    }
  }
  return out;
};

const dealCards = (rng, n, minInv, maxInv) => {
  const values = [];
  while (values.length < n) {
    const v = 1 + Math.floor(rng() * 9);
    if (!values.includes(v)) values.push(v);
  }
  values.sort((a, b) => a - b);
  for (let tries = 0; tries < 400; tries++) {
    const d = [...values];
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    const inv = inversions(d);
    if (inv >= minInv && inv <= maxInv) return d;
  }
  return [...values].reverse().slice(0, n);
};

const lerp = (a, b, t) => Math.round(a + (b - a) * t);

/** A level for a band at difficulty 1–3, step 1–30. `rng` () → [0, 1). */
export const algorithmLevel = (band, difficulty, levelNo, rng) => {
  const b = band === 'analytical' ? 'analytical' : 'advanced';
  const t = Math.min(1, Math.max(0, ((difficulty - 1) * 30 + (levelNo - 1)) / 89));
  const kind = ['robot', 'cards', 'register'][levelNo % 3];
  const cap = (opt) => (b === 'advanced' ? opt + 3 : Math.max(opt + 8, 14));
  const pickFrom = (pool) => {
    const at = Math.round(t * (pool.length - 1)) + (rng() < 0.5 ? 0 : rng() < 0.5 ? -1 : 1);
    return pool[Math.min(pool.length - 1, Math.max(0, at))];
  };
  if (kind === 'robot') {
    const l = pickFrom(ROBOTS[b]);
    const opt = blockCount(l.ref);
    return {
      type: 'robot', title: l.title, rows: l.rows, map: parseMap(l.rows),
      goalText: 'Collect every gem. The run ends the moment the last gem is picked up.',
      palette: l.cond ? ROBOT_COND : ROBOT_BASIC, maxRepeat: l.maxRepeat || 9,
      ref: l.ref, opt, maxBlocks: cap(opt)
    };
  }
  if (kind === 'cards') {
    if (b === 'analytical') {
      const n = Math.min(5, 3 + difficulty - 1 + (levelNo > 20 ? 1 : 0));
      const maxInv = Math.min((n * (n - 1)) / 2, lerp(2, 7, t));
      const deck = dealCards(rng, n, Math.max(2, maxInv - 2), maxInv);
      const ref = bubbleSwaps(deck);
      return {
        type: 'cards', mode: 'swap', title: 'Card sorter', deck,
        goalText: 'Put the cards in order, smallest on the left, using swap blocks.',
        palette: Array.from({ length: n - 1 }, (_, i) => ({ op: 'swap', i })), maxRepeat: 9,
        ref, opt: ref.length, maxBlocks: cap(ref.length)
      };
    }
    const n = Math.min(5, 3 + Math.round(t * 2));
    const deck = dealCards(rng, n, Math.max(2, n - 1), (n * (n - 1)) / 2);
    const ref = [T.rep(n - 1), T.home, T.rep(n - 1), T.cmp, T.step, T.end, T.end];
    return {
      type: 'cards', mode: 'machine', title: `Sorting machine · ${n} cards`, deck,
      goalText: `Build a machine that sorts ANY deal of ${n} cards — it is tested on all ${[1, 1, 2, 6, 24, 120][n]} of them.`,
      palette: [T.cmp, T.step, T.home, { op: 'repeat', n: 2 }], maxRepeat: 9,
      ref, opt: blockCount(ref), maxBlocks: cap(blockCount(ref))
    };
  }
  const l = pickFrom(REGISTERS[b]);
  const opt = blockCount(l.ref);
  return {
    type: 'register', title: l.title, goalText: l.goalText, target: l.target, cases: l.cases, goal: l.goal,
    palette: l.palette, maxRepeat: 9, ref: l.ref, opt, maxBlocks: cap(opt)
  };
};

/** Every fixed level in the bank, for the tests. */
export const ALL_FIXED = [
  ...['analytical', 'advanced'].flatMap((band) => ROBOTS[band].map((l) => ({
    band, level: { type: 'robot', title: l.title, rows: l.rows, map: parseMap(l.rows), palette: l.cond ? ROBOT_COND : ROBOT_BASIC, maxRepeat: l.maxRepeat || 9, ref: l.ref, opt: blockCount(l.ref) } }))),
  ...['analytical', 'advanced'].flatMap((band) => REGISTERS[band].map((l) => ({
    band, level: { type: 'register', title: l.title, target: l.target, cases: l.cases, goal: l.goal, palette: l.palette, maxRepeat: 9, ref: l.ref, opt: blockCount(l.ref) } })))
];
