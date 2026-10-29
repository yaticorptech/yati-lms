/**
 * The solo games played by hand, as Group Brain races (added 2026-10-29): Lights Out, Code Breaker, Typing
 * Sprint, Speed Sort, Number Bonds, Math Sprint and Memory Match. Each runs on stageCore, as the adventures
 * do: everyone gets the same puzzles, plays them at their own pace against one clock, and sees how far the
 * others are (never their answers). A puzzle solved is 100 points, a wrong try −20 (Code Breaker: fewer
 * guesses, more points); finishing them all before the time is up adds 2 points a second left. Places by
 * points, then who finished first.
 *
 * Every move names the puzzle it is for (`stage`), so a double tap or a stale screen cannot count twice.
 */
const { GameError } = require('./contract');
const { makeStageEngine } = require('./stageCore');

const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pickOne = (rng, list) => list[Math.floor(rng() * list.length)];
const shuffle = (list, rng) => { const a = [...list]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const D = { easy: 1, medium: 2, hard: 3 };

/** The shared parts: points, progress, the clock. */
const race = (def) => makeStageEngine({
    id: def.id, label: def.label, emoji: def.emoji, summary: def.summary,
    setup: (o, rng) => ({ seconds: def.seconds[o.difficulty] || def.seconds.medium, stages: def.make(rng, D[o.difficulty] || 2), kind: def.id }),
    start: (shared) => ({ stage: 0, ...(def.begin ? def.begin(shared.stages[0]) : {}) }),
    actions: {
        [def.action]: (s, seat, action, ctx) => {
            const p = s.progress[seat];
            const st = s.shared.stages[p.stage];
            const r = def.play(st, p, action, ctx);          // { solved } | { wrong } | {} (a step, nothing scored)
            if (r.solved) {
                p.points = (p.points || 0) + (r.points ?? 100);
                p.solved = (p.solved || 0) + 1;
                p.stage += 1;
                if (p.stage >= s.shared.stages.length) p.done = true;
                else if (def.begin) Object.assign(p, def.begin(s.shared.stages[p.stage]));
                s.message = `${s.seats[seat].name} solved one.`;
            } else if (r.wrong) {
                p.mistakes += 1;
                p.wrong = (p.wrong || 0) + 1;
                p.points = (p.points || 0) - (r.penalty ?? 20);
            }
        }
    },
    publicOf: (s, you, over) => {
        const p = you != null ? s.progress[you] : null;
        const st = p && !over && p.stage < s.shared.stages.length ? s.shared.stages[p.stage] : null;
        return {
            kind: def.id, total: s.shared.stages.length,
            me: p && { stage: p.stage, mistakes: p.mistakes, done: p.done, doneMs: p.doneMs, ...(def.mine ? def.mine(p) : {}) },
            current: st && { index: p.stage, ...def.show(st, p) },
            review: over && def.review ? s.shared.stages.map(def.review) : null
        };
    },
    progressOf: (p, s) => ({ at: p.stage, of: s.shared.stages.length }),
    score: (s, i) => {
        const p = s.progress[i];
        // Points earned move by move; a test player's steps (services/testBots.js) move the stage and the
        // mistakes without points, so those count at the usual 100 and −20.
        const steps = p.stage - (p.solved || 0);
        const slips = p.mistakes - (p.wrong || 0);
        const base = (p.points || 0) + steps * 100 - slips * 20;
        const bonus = p.done ? 2 * Math.max(0, Math.round((s.runMs - (p.doneMs ?? s.runMs)) / 1000)) : 0;
        return Math.max(0, base) + bonus;
    }
});

/* ── Lights Out ─────────────────────────────────────────────────────── */
const flip = (board, n, at) => {
    const b = [...board]; const r = Math.floor(at / n); const c = at % n;
    for (const [dr, dc] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = r + dr; const cc = c + dc;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n) b[rr * n + cc] = b[rr * n + cc] ? 0 : 1;
    }
    return b;
};
const lightsout = race({
    id: 'lightsout', label: 'Lights Out', emoji: '💡', summary: 'Turn every light off — a tap flips its neighbours too. Same boards for everyone.',
    seconds: { easy: 180, medium: 240, hard: 300 }, action: 'tap',
    // Lit by tapping a solved board at random, so every board can be solved.
    make: (rng, d) => Array.from({ length: 4 }, (_, k) => {
        const n = d === 1 ? 3 : d === 2 ? 4 : 5;
        let b = Array(n * n).fill(0);
        for (let t = 0; t < 3 + k + d * 2; t += 1) b = flip(b, n, int(rng, 0, n * n - 1));
        if (!b.some(Boolean)) b = flip(b, n, int(rng, 0, n * n - 1));
        return { n, board: b };
    }),
    begin: (st) => ({ board: [...st.board], taps: 0 }),
    play: (st, p, a) => {
        const at = Number(a.cell);
        if (!Number.isInteger(at) || at < 0 || at >= st.n * st.n) throw new GameError('Tap a light on the board.');
        p.board = flip(p.board, st.n, at); p.taps += 1;
        return p.board.some(Boolean) ? {} : { solved: true };
    },
    show: (st, p) => ({ n: st.n, board: p.board, taps: p.taps })
});

/* ── Code Breaker ───────────────────────────────────────────────────── */
const PEGS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const feedback = (secret, guess) => {
    let exact = 0; const s = []; const g = [];
    secret.forEach((x, i) => { if (guess[i] === x) exact += 1; else { s.push(x); g.push(guess[i]); } });
    let near = 0;
    for (const x of g) { const k = s.indexOf(x); if (k >= 0) { near += 1; s.splice(k, 1); } }
    return { exact, near };
};
const codebreaker = race({
    id: 'codebreaker', label: 'Code Breaker', emoji: '🔐', summary: 'Crack the same colour codes from the clues — fewer guesses, more points.',
    seconds: { easy: 240, medium: 300, hard: 360 }, action: 'guess',
    make: (rng, d) => Array.from({ length: 3 }, () => ({ colours: 3 + d, secret: Array.from({ length: 4 }, () => pickOne(rng, PEGS.slice(0, 3 + d))) })),
    begin: () => ({ guesses: [] }),
    play: (st, p, a) => {
        const code = Array.isArray(a.code) ? a.code.map(String) : [];
        if (code.length !== 4 || code.some((c) => !PEGS.slice(0, st.colours).includes(c))) throw new GameError('Pick four colours.');
        if (p.guesses.length >= 10) throw new GameError('No guesses left for this code.');
        const f = feedback(st.secret, code);
        p.guesses.push({ code, ...f });
        if (f.exact === 4) return { solved: true, points: 60 + 10 * Math.max(0, 10 - p.guesses.length) };
        if (p.guesses.length >= 10) { p.guesses = []; return { solved: true, points: 0 }; }
        return { wrong: true, penalty: 0 };
    },
    show: (st, p) => ({ colours: PEGS.slice(0, st.colours), guesses: p.guesses, left: 10 - p.guesses.length }),
    review: (st) => ({ title: 'Code', solution: st.secret.join(' · ') })
});

/* ── Typing Sprint ──────────────────────────────────────────────────── */
const WORDS = {
    1: ['apple', 'river', 'happy', 'train', 'green', 'smile', 'house', 'water', 'music', 'light', 'chair', 'bread', 'cloud', 'plant', 'tiger', 'ocean'],
    2: ['journey', 'balance', 'library', 'weather', 'curious', 'kitchen', 'thunder', 'example', 'freedom', 'harvest', 'picture', 'science', 'gallery', 'promise'],
    3: ['necessary', 'beautiful', 'knowledge', 'challenge', 'discipline', 'adventure', 'temperature', 'environment', 'opportunity', 'imagination', 'pronunciation', 'conscience']
};
const typingsprint = race({
    id: 'typingsprint', label: 'Typing Sprint', emoji: '⌨️', summary: 'Type the same words, exactly and fast. The quickest clean typist wins.',
    seconds: { easy: 90, medium: 90, hard: 100 }, action: 'type',
    make: (rng, d) => shuffle([...WORDS[d], ...WORDS[Math.max(1, d - 1)]], rng).slice(0, 12).map((word) => ({ word })),
    play: (st, p, a) => (String(a.value || '').trim().toLowerCase() === st.word ? { solved: true } : { wrong: true }),
    show: (st) => ({ word: st.word })
});

/* ── Speed Sort ─────────────────────────────────────────────────────── */
const speedsort = race({
    id: 'speedsort', label: 'Speed Sort', emoji: '🔢', summary: 'Tap the numbers from smallest to largest — the same sets for everyone.',
    seconds: { easy: 90, medium: 100, hard: 120 }, action: 'sort',
    make: (rng, d) => Array.from({ length: 8 }, () => {
        const n = 3 + d; const max = d === 1 ? 20 : d === 2 ? 99 : 999;
        const set = new Set(); while (set.size < n) set.add(int(rng, 1, max));
        return { numbers: [...set] };
    }),
    play: (st, p, a) => {
        const order = Array.isArray(a.order) ? a.order.map(Number) : [];
        if (order.length !== st.numbers.length || [...order].sort((x, y) => x - y).join() !== [...st.numbers].sort((x, y) => x - y).join()) throw new GameError('Tap every number once.');
        return order.every((x, i) => i === 0 || order[i - 1] < x) ? { solved: true } : { wrong: true };
    },
    show: (st) => ({ numbers: st.numbers })
});

/* ── Number Bonds ───────────────────────────────────────────────────── */
const numberbonds = race({
    id: 'numberbonds', label: 'Number Bonds', emoji: '🧷', summary: 'Tap the two tiles that make the target — the same targets for everyone.',
    seconds: { easy: 90, medium: 100, hard: 120 }, action: 'pair',
    make: (rng, d) => Array.from({ length: 10 }, () => {
        const target = d === 1 ? int(rng, 8, 20) : d === 2 ? int(rng, 20, 60) : int(rng, 50, 150);
        const a = int(rng, 1, target - 1);
        const tiles = new Set([a, target - a]);
        while (tiles.size < 6) { const x = int(rng, 1, target - 1); if (!tiles.has(target - x)) tiles.add(x); }
        return { target, tiles: shuffle([...tiles], rng) };
    }),
    play: (st, p, a) => {
        const i = Number(a.a); const j = Number(a.b);
        if (![i, j].every((k) => Number.isInteger(k) && k >= 0 && k < st.tiles.length) || i === j) throw new GameError('Tap two different tiles.');
        return st.tiles[i] + st.tiles[j] === st.target ? { solved: true } : { wrong: true };
    },
    show: (st) => ({ target: st.target, tiles: st.tiles })
});

/* ── Math Sprint ────────────────────────────────────────────────────── */
const mathsprint = race({
    id: 'mathsprint', label: 'Math Sprint', emoji: '🧮', summary: 'The same sums for everyone, typed against the clock.',
    seconds: { easy: 60, medium: 60, hard: 75 }, action: 'answer',
    make: (rng, d) => Array.from({ length: 15 }, () => {
        const op = pickOne(rng, d === 1 ? ['+', '−'] : d === 2 ? ['+', '−', '×'] : ['+', '−', '×', '÷']);
        let a = int(rng, 2, d === 1 ? 20 : d === 2 ? 50 : 99); let b = int(rng, 2, d === 1 ? 20 : 12);
        if (op === '−' && b > a) [a, b] = [b, a];
        if (op === '÷') { a = b * int(rng, 2, 12); }
        const answer = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b;
        return { text: `${a} ${op} ${b}`, answer };
    }),
    play: (st, p, a) => {
        const v = Number(String(a.value ?? '').trim());
        if (!Number.isFinite(v)) throw new GameError('Type a number.');
        return v === st.answer ? { solved: true } : { wrong: true };
    },
    show: (st) => ({ text: st.text })
});

/* ── Memory Match ───────────────────────────────────────────────────── */
const FACES = ['🍎', '🚀', '🎸', '🐼', '⚽', '🌈', '🍕', '🦋', '🎲', '🌵', '🐙', '🍩'];
const memorymatch = race({
    id: 'memorymatch', label: 'Memory Match', emoji: '🃏', summary: 'The same deck for everyone: turn two cards at a time and pair them all.',
    seconds: { easy: 120, medium: 150, hard: 180 }, action: 'flip',
    // One stage per pair, on one deck: the stage counts the pairs found.
    make: (rng, d) => {
        const pairs = d === 1 ? 6 : d === 2 ? 8 : 10;
        const deck = shuffle([...FACES.slice(0, pairs), ...FACES.slice(0, pairs)], rng);
        return Array.from({ length: pairs }, () => ({ deck }));
    },
    begin: () => ({}),
    play: (st, p, a) => {
        const at = Number(a.card);
        p.matched = p.matched || []; p.open = p.open || [];
        if (!Number.isInteger(at) || at < 0 || at >= st.deck.length || p.matched.includes(at)) throw new GameError('Turn a card that is face down.');
        if (p.open.length === 2) p.open = [];                     // the last two, turned back
        if (p.open.includes(at)) throw new GameError('That card is already turned.');
        p.open.push(at);
        if (p.open.length < 2) return {};
        const [x, y] = p.open;
        if (st.deck[x] === st.deck[y]) { p.matched.push(x, y); p.open = []; return { solved: true }; }
        return { wrong: true, penalty: 5 };
    },
    mine: (p) => ({ matched: p.matched || [] }),
    show: (st, p) => ({ deck: st.deck.map((f, i) => ((p.matched || []).includes(i) || (p.open || []).includes(i) ? f : null)), open: p.open || [] })
});

const ENGINES = { lightsout, codebreaker, typingsprint, speedsort, numberbonds, mathsprint, memorymatch };
module.exports = { RACE: Object.keys(ENGINES), raceEngine: (id) => ENGINES[id] || null, feedback, flip };
