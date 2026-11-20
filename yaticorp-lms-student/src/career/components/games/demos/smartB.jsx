/* eslint-disable react-refresh/only-export-components -- small local helpers; this file exports only DEMOS data */
/**
 * Game-specific demos for Rising Brains (Classes 6–10), group smartB — see GameDemo.jsx for the contract.
 * Each demo is a pure function of (frame, example). Pieces sit at % positions (Box) so the hand lands on them
 * at every box size.
 */

/** A piece placed at [left, top, width, height] in % of the 4:3 box (height may be left out). */
function Box({ s, className = '', children }) {
  const style = { left: `${s[0]}%`, top: `${s[1]}%`, width: `${s[2]}%` };
  if (s[3] != null) style.height = `${s[3]}%`;
  return <div className={`absolute ${className}`} style={style}>{children}</div>;
}

const REST = [92, 92, false];
/** Centres of a 2 × 2 answer grid placed at top 55 %, height 41 %. */
const OPT_AT = [[26, 65], [74, 65], [26, 86], [74, 86]];
const minus = (n) => (n < 0 ? `−${-n}` : `${n}`);

function OptionGrid({ options, right, picked, pressed }) {
  return (
    <div className="absolute grid grid-cols-2 grid-rows-2 gap-1.5" style={{ left: '3%', top: '55%', width: '94%', height: '41%' }}>
      {options.map((o, i) => (
        <div key={o} className={`flex items-center justify-center rounded-xl px-1 text-center text-sm leading-tight font-black ring-1 ring-inset ${
          picked && i === right ? 'bg-emerald-100 text-emerald-800 ring-emerald-400' : pressed && i === right ? 'bg-slate-100 text-slate-900 ring-slate-400' : 'bg-white text-slate-800 ring-slate-200'}`}>
          {o}{picked && i === right ? ' ✓' : ''}
        </div>
      ))}
    </div>
  );
}

/** QuizGame's screen: the prompt card, four answers, the right one turns green. */
const quizDemo = (examples, prompt, phases) => ({
  frames: 6,
  draw: (f, ex) => {
    const q = examples[ex];
    const picked = f >= 3;
    return {
      body: (
        <div className="relative h-full">
          <Box s={[4, 14, 92, 38]} className="flex flex-col items-center justify-center rounded-2xl bg-white px-3 text-center shadow-sm ring-1 ring-slate-200">{prompt(q, picked)}</Box>
          <OptionGrid options={q[1]} right={q[2]} picked={picked} pressed={f === 2} />
        </div>
      ),
      hand: f === 0 ? REST : f < 3 ? [...OPT_AT[q[2]], f === 2] : [OPT_AT[q[2]][0] + 10, OPT_AT[q[2]][1] + 4, false],
      step: f < 1 ? 0 : f < 3 ? 1 : 2,
      phase: phases[f < 1 ? 0 : f < 3 ? 1 : 2]
    };
  }
});

const gapLine = (sentence, word, picked, tone) => {
  const [before, after] = sentence.split('___');
  return (
    <>
      {before}
      {picked ? <span className={`mx-0.5 border-b-4 px-0.5 ${tone}`}>{word}</span> : <span className={`mx-1 inline-block w-12 border-b-4 align-bottom ${tone}`}>&nbsp;</span>}
      {after}
    </>
  );
};

// ---- Word games ----------------------------------------------------------------------------------------------------
const SCRAMBLE = [['PLANET', 'TLENAP', 'It travels round a star.'], ['RIVER', 'VERRI', 'Water that flows to the sea.'], ['BRIDGE', 'GEDRIB', 'It takes a road over water.']];

const CIPHER = [['MEET AT NOON', 3], ['GO WEST', 5], ['SEND HELP', 2]];

const ANALOGY = [
  [['Petal', 'Flower', 'Page'], ['Leaf', 'Book', 'Pen', 'Read'], 1, 2],
  [['Hot', 'Cold', 'Early'], ['Late', 'Soon', 'Dawn', 'Quick'], 0, 1],
  [['Rain', 'Flood', 'Spark'], ['Light', 'Match', 'Fire', 'Smoke'], 2, 3]
];
const RELATIONS = ['Synonym', 'Opposite', 'Part → whole', 'Cause → effect'];
const TILE_TONES = ['bg-violet-50 ring-violet-200', 'bg-sky-50 ring-sky-200', 'bg-amber-50 ring-amber-200', 'bg-emerald-50 ring-emerald-200'];

const CONTEXT = [
  [['After weeks without rain,', 'the arid fields cracked', 'and the river dried up.'], 'arid', [[0, 'rain'], [2, 'dried']], ['very dry', 'very cold', 'very green'], 0],
  [['The jubilant fans cheered,', 'sang and hugged each other', 'after the last-minute win.'], 'jubilant', [[0, 'cheered'], [1, 'hugged']], ['angry', 'full of joy', 'very tired'], 1],
  [['Unlike his chatty sister,', 'Ravi is taciturn and', 'rarely says a word.'], 'taciturn', [[0, 'Unlike'], [2, 'rarely']], ['quiet', 'rude', 'clever'], 0]
];
const bare = (w) => w.replace(/[^A-Za-z-]/g, '');
/** Where a word sits on its centred line, in % of the box (text is sized in cqw, ≈ 2.2 % a character). */
const wordX = (line, w) => 50 + (line.indexOf(w) + w.length / 2 - line.length / 2) * 2.2;

const ASSOC = [
  [['Fruit', 'apple mango pear plum'], ['Colours', 'red blue gold pink'], ['Animals', 'cat dog cow hen'], ['Weather', 'rain snow wind fog']],
  [['Body', 'arm leg hand nose'], ['Tools', 'saw axe drill file'], ['Planets', 'mars venus earth saturn'], ['Drinks', 'tea milk juice soda']],
  [['Music', 'drum harp flute bell'], ['Sea', 'wave tide reef shell'], ['Space', 'star moon comet orbit'], ['Trees', 'oak pine elm ash']]
];
const ASSOC_ORDER = [5, 0, 10, 15, 2, 8, 13, 6, 11, 1, 4, 14, 9, 3, 12, 7];
const ASSOC_PICKS = ASSOC_ORDER.map((w, p) => [w, p]).filter(([w]) => w < 4).map(([, p]) => p);
const GROUP_TONES = ['bg-amber-300 text-amber-950', 'bg-emerald-300 text-emerald-950', 'bg-sky-300 text-sky-950', 'bg-violet-300 text-violet-950'];

// ---- Maths games ---------------------------------------------------------------------------------------------------
const TOTALS = [[[8, -13, 6, -4], [-3, 3, -5, 1]], [[12, 9, -25, 7], [5, 3, -3, 13]], [[-6, 14, -11, 20], [15, 23, 17, -17]]];

const EQUATIONS = [
  { lines: ['3x + 5 = 17', '3x = 12'], ops: [['− 5', '+ 5', '÷ 3', '× 3'], ['× 3', '÷ 3', '− 3', '+ 12']], right: [0, 1], last: '12 ÷ 3', x: '4' },
  { lines: ['2x − 4 = 10', '2x = 14'], ops: [['− 4', '+ 4', '÷ 2', '× 2'], ['÷ 2', '× 2', '+ 2', '− 14']], right: [1, 0], last: '14 ÷ 2', x: '7' },
  { lines: ['4(x + 1) = 20', 'x + 1 = 5'], ops: [['− 1', '× 4', '÷ 4', '− 4'], ['+ 1', '− 1', '÷ 5', '× 1']], right: [2, 1], last: '5 − 1', x: '4' }
];

const FRACTIONS = [[[3, 4], [5, 6], 2], [[2, 3], [4, 6], 1], [[5, 8], [3, 5], 0]];
const DUEL = ['Mine is bigger', 'Equal', 'Bot’s is bigger'];
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
function Frac({ n, d }) {
  return (
    <span className="inline-flex flex-col items-center text-xl leading-none font-black">
      <span className="px-1 pb-0.5">{n}</span>
      <span className="w-full min-w-7 border-t-[3px] border-current" />
      <span className="px-1 pt-0.5">{d}</span>
    </span>
  );
}

const LAB = [
  { name: 'Number pyramid', rule: 'Each brick = the two below it added', rows: [[15], [8, 7], [3, 5, 2]], hidden: ['1-1', '0-0'] },
  { name: 'Magic square', rule: 'Every row, column and diagonal makes 15', rows: [[2, 7, 6], [9, 5, 1], [4, 3, 8]], hidden: ['0-1', '1-1', '2-2'] },
  { name: 'Step grid', rule: 'Across: +2 each time · Down: +5', rows: [[1, 3, 5], [6, 8, 10], [11, 13, 15]], hidden: ['1-1', '2-0', '2-2'] }
];
const labCell = (r, c, n) => [50 + (c - (n - 1) / 2) * 21 - 9.5, 29 + r * 17];

const RELAY = [
  [6, [['Juice : water = 2 : 3. With 6 cups of juice, how many cups of water?', 9], ['On a map 1 cm = 4 km. A road is 9 cm long. How many km?', 36]]],
  [12, [['12 sweets are shared 1 : 2. How many in the bigger share?', 8], ['Red : blue = 1 : 4. With 8 red beads, how many blue?', 32]]],
  [20, [['50% of 20 students walk to school. How many walk?', 10], ['Boys : girls = 2 : 5. With 10 boys, how many girls?', 25]]]
];

const DASH = [
  { title: 'Books read', labels: ['Mon', 'Tue', 'Wed', 'Thu'], values: [4, 7, 9, 5], q: 'Which day had the most books?', options: ['Mon', 'Tue', 'Wed', 'Thu'], answer: 'Wed', mark: [2] },
  { title: 'Rainfall (mm)', labels: ['A', 'B', 'C', 'D'], values: [12, 18, 6, 24], q: 'Total rainfall of A and B?', answer: '30', mark: [0, 1] },
  { title: 'Favourite fruit · 40 students', pie: true, labels: ['Mango', 'Apple', 'Banana'], values: [50, 25, 25], q: 'How many chose Mango?', answer: '20', mark: [0] }
];
const DASH_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444'];
/** The chart's svg (200 × 80) fills 71.25 % of the box width, centred, from 19 % down for 38 %. */
const dashAt = (x, y) => [14.4 + (x / 200) * 71.25, 19 + (y / 80) * 38];
const barX = (i) => 14 + i * 45 + 6;
const barH = (v, top) => (v / top) * 40;
function DashChart({ set, marked }) {
  if (set.pie) {
    const starts = set.values.map((_, i) => set.values.slice(0, i).reduce((x, v) => x + v, 0));
    return (
      <svg viewBox="0 0 200 80" className="h-full w-full" aria-hidden>
        {set.values.map((p, i) => {
          const a0 = (starts[i] / 100) * Math.PI * 2 - Math.PI / 2;
          const a1 = ((starts[i] + p) / 100) * Math.PI * 2 - Math.PI / 2;
          const d = `M60,40 L${60 + 36 * Math.cos(a0)},${40 + 36 * Math.sin(a0)} A36,36 0 ${p > 50 ? 1 : 0} 1 ${60 + 36 * Math.cos(a1)},${40 + 36 * Math.sin(a1)} Z`;
          return <path key={i} d={d} fill={DASH_COLORS[i]} stroke={marked && set.mark.includes(i) ? '#0f172a' : '#fff'} strokeWidth="2" />;
        })}
        {set.labels.map((l, i) => (
          <g key={l}>
            <rect x="110" y={16 + i * 20} width="9" height="9" rx="2" fill={DASH_COLORS[i]} />
            <text x="124" y={25 + i * 20} fontSize="12" fontWeight="800" fill="#1e293b">{l} {set.values[i]}%</text>
          </g>
        ))}
      </svg>
    );
  }
  const top = Math.max(...set.values);
  return (
    <svg viewBox="0 0 200 80" className="h-full w-full" aria-hidden>
      <line x1="10" x2="196" y1="64" y2="64" stroke="#cbd5e1" />
      {set.values.map((v, i) => (
        <g key={i}>
          <rect x={barX(i)} y={64 - barH(v, top)} width="26" height={barH(v, top)} rx="3" fill={DASH_COLORS[i]} stroke={marked && set.mark.includes(i) ? '#0f172a' : 'none'} strokeWidth="2" />
          <text x={barX(i) + 13} y={61 - barH(v, top)} textAnchor="middle" fontSize="12" fontWeight="800" fill="#1e293b">{v}</text>
          <text x={barX(i) + 13} y="77" textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155">{set.labels[i]}</text>
        </g>
      ))}
    </svg>
  );
}

const CIRCUITS = [
  [5, [['× 2', '+ 3'], ['+ 4', '− 1'], ['× 2', '+ 5']], [0, 1, 0], [10, 9, 18]],
  [8, [['+ 4', '× 2'], ['÷ 2', '− 3'], ['× 3', '+ 6']], [1, 0, 0], [16, 8, 24]],
  [20, [['÷ 4', '− 5'], ['+ 7', '× 2'], ['− 3', '× 3']], [0, 1, 1], [5, 10, 30]]
];

export const DEMOS = {
  'word-scramble': { frames: 8, draw: (f, ex) => {
    const [word, mixed, clue] = SCRAMBLE[ex];
    const typed = f < 2 ? '' : f === 2 ? word.slice(0, 2) : f === 3 ? word.slice(0, 4) : word;
    const ok = f >= 6;
    return {
      body: (
        <div className="relative h-full">
          <Box s={[4, 14, 92, 11]} className="flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-slate-600">
            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 font-black text-amber-700">Clue</span>{clue}
          </Box>
          <Box s={[4, 30, 92, 20]} className="flex items-stretch justify-center gap-1">
            {mixed.split('').map((ch, i) => <span key={i} className={`flex w-[12%] max-w-11 items-center justify-center rounded-xl text-lg font-black ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-900'}`}>{ch}</span>)}
          </Box>
          <Box s={[5, 58, 60, 18]} className={`flex items-center justify-center rounded-xl border-2 bg-white text-base font-black tracking-widest ${ok ? 'border-emerald-400 text-emerald-700' : 'border-slate-200 text-slate-900'}`}>
            {typed || <span className="text-sm font-semibold tracking-normal text-slate-400">Your answer</span>}{ok ? ' ✓' : ''}
          </Box>
          <Box s={[68, 58, 27, 18]} className="flex items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-sm font-black text-white">Check</Box>
          {ok && <Box s={[4, 82, 92, 10]} className="text-center text-sm font-black text-emerald-600">+1 · next word</Box>}
        </div>
      ),
      hand: f === 1 ? [50, 42, false] : f >= 2 && f <= 4 ? [35, 68, f !== 3] : f === 5 ? [81, 68, true] : REST,
      step: f < 1 ? 0 : f < 2 ? 1 : 2,
      phase: f < 1 ? 'Read the clue' : f < 2 ? 'Unscramble it' : f < 5 ? 'Type the word' : f < 6 ? 'Check' : 'Correct!'
    };
  } },

  'sentence-gap': quizDemo(
    [['She was too ___ to lift the heavy box.', ['weak', 'strong', 'tall', 'brave'], 0], ['The hall was ___ — not one visitor came.', ['crowded', 'empty', 'noisy', 'bright'], 1], ['He spoke ___ so the baby would not wake.', ['loudly', 'softly', 'quickly', 'angrily'], 1]],
    (q, picked) => <p className="text-base leading-snug font-bold text-slate-900">{gapLine(q[0], q[1][q[2]], picked, 'border-pink-400 text-pink-600')}</p>,
    ['Read the sentence', 'Pick the word', 'Correct!']
  ),

  'tense-pick': quizDemo(
    [['By the time we arrived, the film ___.', ['had started', 'has started', 'starts', 'was start'], 0, 'start'], ['She ___ in Delhi since 2019.', ['lives', 'has lived', 'lived', 'is live'], 1, 'live'], ['If it rains, we ___ indoors.', ['played', 'will play', 'had played', 'playing'], 1, 'play']],
    (q, picked) => (
      <>
        <p className="text-xs font-bold text-slate-500">Choose the correct form.</p>
        <p className="mt-1 text-sm leading-snug font-black text-slate-900">{gapLine(q[0], q[1][q[2]], picked, 'border-fuchsia-400 text-fuchsia-700')}</p>
        <p className="mt-1 text-sm font-bold text-fuchsia-700">({q[3]})</p>
      </>
    ),
    ['Read the sentence', 'Pick the form', 'Correct!']
  ),

  'word-roots': quizDemo(
    [['bene-', ['good', 'bad', 'before', 'across'], 0, 'benefit'], ['tele-', ['near', 'far', 'light', 'sound'], 1, 'telephone'], ['micro-', ['huge', 'many', 'small', 'under'], 2, 'microscope']],
    (q, picked) => (
      <>
        <p className="text-3xl font-black tracking-wide text-slate-900">{q[0]}</p>
        <p className={`mt-1 text-xs font-bold ${picked ? 'text-amber-700' : 'text-slate-500'}`}>{picked ? `${q[0]} means “${q[1][q[2]]}” — as in ${q[3]}` : 'What does this part mean?'}</p>
      </>
    ),
    ['Read the root', 'Pick its meaning', 'Correct!']
  ),

  'antonym-match': quizDemo(
    [['Generous', ['kind', 'giving', 'stingy', 'lavish'], 2], ['Ancient', ['old', 'modern', 'aged', 'antique'], 1], ['Brave', ['cowardly', 'bold', 'fearless', 'daring'], 0]],
    (q) => (
      <>
        <p className="text-xs font-black tracking-[0.14em] text-fuchsia-600 uppercase">Opposite of</p>
        <p className="mt-1 text-3xl font-black tracking-wide text-slate-900">{q[0]}</p>
      </>
    ),
    ['Read the word', 'Find the opposite', 'Correct!']
  ),

  // Word Ladder: read the clue, change one letter of the word below, climb to the goal.
  'word-ladder': { frames: 6, draw: (f, ex) => {
    const [words, clues] = [
      [['cat', 'cot', 'dot', 'dog'], ['a small bed for a baby', 'a tiny round spot', 'a pet that barks']],
      [['cold', 'cord', 'card', 'ward', 'warm'], ['a thick string', 'you send one on a birthday', 'a room in a hospital', 'a little hot']],
      [['hot', 'hat', 'bat', 'bit', 'big'], ['you wear it on your head', 'used to hit the ball in cricket', 'a small piece', 'large']]
    ][ex];
    const climbed = Math.min(words.length - 1, Math.floor(f * (words.length - 1) / 5));
    const done = climbed >= words.length - 1;
    const rows = words.slice(1).map((w, i) => ({ w, i: i + 1 })).reverse();
    const tile = (w, i, tone, lit) => (
      <span className="flex justify-center gap-0.5">
        {w.split('').map((c, k) => <span key={k} className={`grid h-5 w-4 place-items-center rounded text-[0.65rem] font-black uppercase ${lit === k ? 'bg-amber-300 text-amber-950' : tone}`}>{c}</span>)}
      </span>
    );
    const diffAt = (a, b) => [...a].findIndex((c, k) => c !== b[k]);
    return {
      body: (
        <div className="flex h-full flex-col justify-center gap-1 bg-gradient-to-b from-amber-200 via-rose-200 to-violet-200 px-6 pt-8 pb-2">
          {rows.map(({ w, i }) => (
            <div key={w} className={`rounded-lg py-0.5 ${i <= climbed ? 'bg-emerald-200/70' : i === climbed + 1 ? 'bg-white/80 ring-2 ring-violet-400' : 'bg-white/30'}`}>
              {i <= climbed ? tile(w, i, 'bg-emerald-500 text-white', diffAt(words[i - 1], w)) : i === words.length - 1 ? tile(w, i, 'bg-white text-rose-600') : tile(' '.repeat(w.length), i, 'bg-white/60')}
            </div>
          ))}
          <div className="rounded-lg bg-amber-800/15 py-0.5">{tile(words[0], 0, 'bg-white text-amber-900')}</div>
          {!done && <p className="text-center text-[0.65rem] font-black text-violet-800">Clue: “{clues[climbed]}”</p>}
        </div>
      ),
      hand: done ? [92, 94, false] : [50, 88, f % 2 === 1],
      step: done ? 2 : f < 1 ? 0 : 1,
      phase: done ? 'Reached the goal!' : f < 1 ? 'Read the clue' : 'Change one letter'
    };
  } },
  'analogy-master': { frames: 8, draw: (f, ex) => {
    const [[a, b, c], tiles, right, rel] = ANALOGY[ex];
    const word = f >= 2 ? tiles[right] : null;
    const relPhase = f >= 3;
    return {
      body: (
        <div className="relative h-full">
          <Box s={[3, 14, 94, 25]} className="flex flex-wrap content-center items-center justify-center gap-1 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 p-1.5 ring-1 ring-violet-200">
            {[a, ':', b, '::', c, ':'].map((w, i) => <span key={i} className={w.includes(':') ? 'text-sm font-black text-violet-400' : 'rounded-lg bg-white px-1.5 py-1 text-sm font-black text-violet-900 shadow-sm'}>{w}</span>)}
            <span className={`min-w-12 rounded-lg px-1.5 py-1 text-center text-sm font-black ${word ? 'bg-emerald-500 text-white' : 'border-2 border-dashed border-violet-400 text-violet-400'}`}>{word || '?'}</span>
          </Box>
          <Box s={[3, 43, 94, 9]} className="text-center text-xs font-bold text-slate-700">{f >= 5 ? 'Right word + link — bonus point!' : relPhase ? 'Bonus: what links A to B?' : 'Which word completes it?'}</Box>
          <div className="absolute grid grid-cols-2 grid-rows-2 gap-1.5" style={{ left: '3%', top: '55%', width: '94%', height: '41%' }}>
            {(relPhase ? RELATIONS : tiles).map((w, i) => {
              const good = relPhase ? f >= 5 && i === rel : f >= 2 && i === right;
              return <div key={w} className={`flex items-center justify-center rounded-xl px-1 text-center text-sm font-black ring-2 ring-inset ${good ? 'bg-emerald-100 text-emerald-800 ring-emerald-500' : relPhase ? 'bg-white text-slate-900 ring-slate-200' : `text-slate-900 ${TILE_TONES[i]}`}`}>{w}</div>;
            })}
          </div>
        </div>
      ),
      hand: f === 1 || f === 2 ? [...OPT_AT[right], f === 2] : f === 3 || f === 4 ? [...OPT_AT[rel], f === 4] : REST,
      step: f < 1 ? 0 : f < 3 ? 1 : 2,
      phase: f < 1 ? 'Find the link' : f < 3 ? 'Pick the word' : f < 5 ? 'Name the link' : 'Bonus point!'
    };
  } },

  'context-detective': { frames: 9, draw: (f, ex) => {
    const [lines, target, clues, options, right] = CONTEXT[ex];
    const tapped = clues.slice(0, Math.min(2, f)).map(([, w]) => w);
    const reveal = f >= 4;
    const clueAt = (k) => [wordX(lines[clues[k][0]], clues[k][1]), 26 + clues[k][0] * 12];
    return {
      body: (
        <div className="@container relative h-full">
          <Box s={[3, 13, 94, 6]} className="text-right text-xs font-black tracking-wide text-teal-700 uppercase">{reveal ? 'Step 2 · Pick the meaning' : 'Step 1 · Find the clues'}</Box>
          <Box s={[3, 20, 94, 36]} className="grid grid-rows-3 items-center rounded-2xl bg-white text-center text-[4.2cqw] leading-none text-slate-900 shadow-sm ring-1 ring-teal-100">
            {lines.map((line, li) => (
              <p key={li}>
                {line.split(' ').map((w, i) => {
                  const b = bare(w);
                  const cls = b === target ? 'rounded bg-amber-300 font-black text-amber-950'
                    : tapped.includes(b) ? (reveal ? 'rounded bg-emerald-200 font-bold text-emerald-900' : 'rounded bg-teal-600 font-bold text-white') : '';
                  return <span key={i}><span className={cls}>{w}</span>{' '}</span>;
                })}
              </p>
            ))}
          </Box>
          {!reveal ? (
            <>
              <Box s={[3, 59, 94, 7]} className="text-center text-xs font-bold text-slate-700">Which words hint at what <b className="text-amber-700">{target}</b> means?</Box>
              <Box s={[10, 69, 80, 13]} className={`flex items-center justify-center rounded-xl bg-teal-600 text-sm font-black text-white ${tapped.length ? '' : 'opacity-40'}`}>Lock in my clues</Box>
            </>
          ) : options.map((o, i) => (
            <Box key={o} s={[6, 59 + i * 13, 88, 11.5]} className={`flex items-center rounded-xl px-3 text-sm font-bold ring-2 ring-inset ${f >= 6 && i === right ? 'bg-emerald-100 text-emerald-900 ring-emerald-500' : 'bg-white text-slate-900 ring-slate-200'}`}>
              <span className="mr-2 text-slate-500">{i + 1}.</span>{o}{f >= 6 && i === right ? ' ✓' : ''}
            </Box>
          ))}
        </div>
      ),
      hand: f === 1 ? [...clueAt(0), true] : f === 2 ? [...clueAt(1), true] : f === 3 ? [50, 75, true] : f === 5 || f === 6 ? [50, 65 + right * 13, f === 6] : REST,
      step: f < 1 ? 0 : f < 4 ? 1 : 2,
      phase: f < 1 ? 'Read the passage' : f < 3 ? 'Tap the clues' : f < 4 ? 'Lock them in' : f < 6 ? 'Pick the meaning' : 'Case cracked!'
    };
  } },

  'word-association-grid': { frames: 8, draw: (f, ex) => {
    const groups = ASSOC[ex];
    const words = groups.flatMap(([, w]) => w.split(' '));
    const solved = f >= 7 ? 4 : f >= 6 ? 1 : 0;
    const picked = f >= 1 && f <= 5 ? ASSOC_PICKS.slice(0, Math.min(4, f)) : [];
    const left = ASSOC_ORDER.map((w, p) => [w, p]).filter(([w]) => w >= solved * 4);
    const cellAt = (r, c) => [2 + c * 24, 13 + r * 17];
    return {
      body: (
        <div className="relative h-full">
          {groups.slice(0, solved).map(([label, w], g) => (
            <Box key={label} s={[2, 13 + g * 17, 95, 15.5]} className={`flex flex-col items-center justify-center rounded-xl text-center leading-tight ${GROUP_TONES[g]}`}>
              <span className="text-xs font-black tracking-wide uppercase">{label}</span>
              <span className="text-xs font-bold">{w.split(' ').join(' · ')}</span>
            </Box>
          ))}
          {left.map(([w, p], k) => {
            const slot = solved ? k + solved * 4 : p;
            const [x, y] = cellAt(Math.floor(slot / 4), slot % 4);
            return (
              <Box key={words[w]} s={[x, y, 23, 15.5]} className={`flex items-center justify-center rounded-xl text-xs font-black uppercase ring-1 ring-inset ${picked.includes(p) ? 'bg-slate-800 text-white ring-slate-900' : 'bg-orange-50 text-slate-900 ring-orange-200'}`}>
                {words[w]}
              </Box>
            );
          })}
          <Box s={[3, 84, 55, 10]} className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            Mistakes left {[0, 1, 2, 3].map((i) => <span key={i} className="h-2.5 w-2.5 rounded-full bg-slate-700" />)}
          </Box>
          <Box s={[62, 83, 35, 12]} className={`flex items-center justify-center rounded-xl bg-rose-600 text-sm font-black text-white ${picked.length === 4 ? '' : 'opacity-40'}`}>Submit</Box>
        </div>
      ),
      hand: f >= 1 && f <= 4 ? [13.5 + (ASSOC_PICKS[f - 1] % 4) * 24, 21 + Math.floor(ASSOC_PICKS[f - 1] / 4) * 17, true] : f === 5 ? [79, 89, true] : REST,
      step: f < 5 ? 0 : f < 7 ? 1 : 2,
      phase: f < 1 ? 'Find a hidden group' : f < 5 ? 'Tap four words' : f < 6 ? 'Submit' : f < 7 ? 'Group locked in!' : 'All groups found!'
    };
  } },

  'running-total': { frames: 8, draw: (f, ex) => {
    const [steps, options] = TOTALS[ex];
    const total = steps.reduce((a, b) => a + b, 0);
    const right = options.indexOf(total);
    const working = `${steps.map((n, i) => (i === 0 ? minus(n) : `${n < 0 ? '−' : '+'} ${Math.abs(n)}`)).join(' ')} = ${minus(total)}`;
    return {
      body: f < 4 ? (
        <div className="relative h-full">
          <Box s={[4, 14, 92, 8]} className="text-right text-xs font-black text-slate-500">Number {f + 1} of 4</Box>
          <Box s={[4, 24, 92, 46]} className={`flex items-center justify-center text-6xl font-black tabular-nums ${steps[f] < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {steps[f] < 0 ? '−' : '+'}{Math.abs(steps[f])}
          </Box>
          <Box s={[30, 75, 40, 5]} className="flex justify-center gap-1.5">{steps.map((_, i) => <span key={i} className={`h-2.5 w-2.5 rounded-full ${i <= f ? 'bg-emerald-500' : 'bg-slate-200'}`} />)}</Box>
          <Box s={[4, 84, 92, 8]} className="text-center text-xs font-bold text-slate-500">Keep the total in your head</Box>
        </div>
      ) : (
        <div className="relative h-full">
          <Box s={[4, 16, 92, 20]} className="flex items-center justify-center text-2xl font-black text-slate-900">Total?</Box>
          <Box s={[4, 39, 92, 10]} className="text-center text-xs font-bold text-emerald-700">{f >= 6 ? working : ''}</Box>
          <OptionGrid options={options.map(minus)} right={right} picked={f >= 6} pressed={f === 5} />
        </div>
      ),
      hand: f === 4 || f === 5 ? [...OPT_AT[right], f === 5] : REST,
      step: f < 1 ? 0 : f < 4 ? 1 : 2,
      phase: f < 1 ? 'Numbers arrive' : f < 4 ? 'Keep the total' : f < 6 ? 'What is the total?' : 'Correct!'
    };
  } },

  'equation-rush': { frames: 9, draw: (f, ex) => {
    const e = EQUATIONS[ex];
    const done = f >= 7;
    const rows = [[e.lines[0], null]];
    if (f >= 2) rows.push([e.lines[1], e.ops[0][e.right[0]]]);
    if (f >= 4) rows.push([`${e.last} = ${done ? e.x : '?'}`, e.ops[1][e.right[1]]]);
    const stage = f < 2 ? 0 : 1;
    return {
      body: (
        <div className="relative h-full">
          <Box s={[3, 13, 94, 39]} className="grid grid-rows-3 rounded-2xl bg-slate-900 px-3 py-1 font-mono text-white">
            {rows.map(([line, label], i) => (
              <div key={i} className={`flex items-center justify-between gap-2 ${i ? 'border-t border-white/10 text-sm text-slate-200' : 'text-base'}`}>
                <span className="font-bold">{line}</span>
                {label && <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-xs text-orange-200">{label}</span>}
              </div>
            ))}
          </Box>
          {f < 4 ? (
            <div className="absolute grid grid-cols-2 grid-rows-2 gap-1.5" style={{ left: '3%', top: '55%', width: '94%', height: '41%' }}>
              {e.ops[stage].map((op, i) => (
                <div key={op} className={`flex items-center justify-center rounded-xl font-mono text-lg font-black ring-2 ring-inset ${(f === 1 || f === 3) && i === e.right[stage] ? 'bg-orange-300 text-orange-950 ring-orange-500' : 'bg-orange-50 text-orange-900 ring-orange-200'}`}>{op}</div>
              ))}
            </div>
          ) : (
            <>
              <Box s={[15, 57, 70, 17]} className={`flex items-center justify-center gap-2 rounded-xl bg-white text-xl font-black ring-2 ${done ? 'text-emerald-700 ring-emerald-400' : 'ring-orange-300'}`}>
                <i className="font-serif">x</i> = <span className={done ? 'text-emerald-700' : 'text-orange-700'}>{f >= 5 ? e.x : '…'}{done ? ' ✓' : ''}</span>
              </Box>
              <Box s={[15, 78, 70, 15]} className={`flex items-center justify-center rounded-xl text-sm font-black text-white ${done ? 'bg-emerald-500' : 'bg-orange-600'}`}>{done ? 'Solved!' : 'Check x'}</Box>
            </>
          )}
        </div>
      ),
      hand: f === 1 ? [...OPT_AT[e.right[0]], true] : f === 3 ? [...OPT_AT[e.right[1]], true] : f === 5 ? [55, 65, true] : f === 6 ? [50, 85, true] : REST,
      step: f < 2 ? 0 : f < 4 ? 1 : 2,
      phase: f < 1 ? 'Undo the last step' : f < 2 ? 'Pick the inverse' : f < 4 ? 'Next step' : f < 6 ? 'Work out x' : f < 7 ? 'Check x' : 'Solved!'
    };
  } },

  'fraction-battle': { frames: 7, draw: (f, ex) => {
    const [[a, b], [c, d], ans] = FRACTIONS[ex];
    const L = (b * d) / gcd(b, d);
    const secs = 12 - Math.min(f, 2) * 2;
    return {
      body: (
        <div className="relative h-full">
          <Box s={[44, 13, 52, 4]} className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => <span key={i} className={`h-full flex-1 rounded-full ${i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-rose-500' : i === 2 ? (f >= 5 ? 'bg-emerald-500' : 'bg-amber-300') : 'bg-slate-200'}`} />)}
          </Box>
          <Box s={[4, 19, 92, 6]} className="flex items-center justify-between text-xs font-black uppercase">
            <span className="text-teal-800">Duel · which is bigger?</span><span className="text-slate-500">{secs}s</span>
          </Box>
          <Box s={[4, 26, 92, 2.5]} className="overflow-hidden rounded-full bg-slate-200">
            <span className="block h-full rounded-full bg-teal-500" style={{ width: `${(secs / 12) * 100}%` }} />
          </Box>
          <Box s={[4, 31, 44, 30]} className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-emerald-50 text-emerald-900 ring-2 ring-emerald-300">
            <span className="text-xs leading-none font-black uppercase">Your card</span><Frac n={a} d={b} />
          </Box>
          <Box s={[52, 31, 44, 30]} className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-rose-50 text-rose-900 ring-2 ring-rose-300">
            <span className="text-xs leading-none font-black uppercase">Fracto-Bot</span><Frac n={c} d={d} />
          </Box>
          {DUEL.map((label, i) => (
            <Box key={label} s={[4 + i * 32, 64, 28, 15]} className={`flex items-center justify-center rounded-xl px-1 text-center text-xs leading-tight font-black ring-2 ring-inset ${f >= 2 && i === ans ? 'bg-emerald-100 ring-emerald-500' : 'bg-white ring-slate-200'}`}>{label}</Box>
          ))}
          {f >= 3 && (
            <Box s={[4, 82, 92, 15]} className="flex flex-col justify-center rounded-xl bg-emerald-50 px-2 text-xs text-emerald-900 ring-1 ring-emerald-200">
              <b>+1 You!</b>
              <span className="font-semibold">{a}/{b} = {(a * L) / b}/{L} and {c}/{d} = {(c * L) / d}/{L}</span>
            </Box>
          )}
        </div>
      ),
      hand: f === 1 || f === 2 ? [18 + ans * 32, 71, f === 2] : REST,
      step: f < 1 ? 0 : f < 3 ? 1 : 2,
      phase: f < 1 ? 'Duel the bot' : f < 3 ? 'Which is bigger?' : f < 5 ? '+1 You!' : 'Round won!'
    };
  } },

  'number-pattern-lab': { frames: 8, draw: (f, ex) => {
    const p = LAB[ex];
    const k = p.hidden.length;
    const filled = Math.min(k, f);
    const solved = f > k + 1;
    return {
      body: (
        <div className="relative h-full">
          <Box s={[4, 12.5, 92, 14]} className="flex flex-col items-center justify-center rounded-xl bg-indigo-50 px-2 text-center leading-tight ring-1 ring-indigo-100">
            <span className="text-xs font-black tracking-wider text-indigo-500 uppercase">{p.name}</span>
            <span className="text-xs font-bold text-slate-800">{p.rule}</span>
          </Box>
          {p.rows.flatMap((row, r) => row.map((v, c) => {
            const j = p.hidden.indexOf(`${r}-${c}`);
            const [x, y] = labCell(r, c, row.length);
            const tone = j < 0 ? 'bg-white text-slate-900 ring-1 ring-slate-200'
              : solved ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400'
                : j === filled - 1 && f <= k ? 'bg-indigo-100 text-indigo-800 ring-2 ring-indigo-500' : 'bg-sky-50 text-sky-700 ring-2 ring-sky-300';
            return <Box key={`${r}-${c}`} s={[x, y, 19, 15]} className={`flex items-center justify-center rounded-xl text-base font-black tabular-nums ${tone}`}>{j < 0 || j < filled ? v : '?'}</Box>;
          }))}
          <Box s={[25, 83, 50, 12]} className={`flex items-center justify-center rounded-xl text-sm font-black text-white ${solved ? 'bg-emerald-500' : 'bg-emerald-600'}`}>{solved ? 'Perfect! +2' : 'Check board'}</Box>
        </div>
      ),
      hand: f >= 1 && f <= k ? (() => {
        const [r, c] = p.hidden[f - 1].split('-').map(Number);
        const [x, y] = labCell(r, c, p.rows[r].length);
        return [x + 9.5, y + 7.5, true];
      })() : f === k + 1 ? [50, 89, true] : REST,
      step: f < 1 ? 0 : f <= k ? 1 : 2,
      phase: f < 1 ? 'Read the rule' : f <= k ? 'Fill the ? cells' : f === k + 1 ? 'Check board' : 'Board solved!'
    };
  } },

  'ratio-relay': { frames: 8, draw: (f, ex) => {
    const [start, legs] = RELAY[ex];
    const cleared = (f >= 2 ? 1 : 0) + (f >= 5 ? 1 : 0);
    const li = f < 3 ? 0 : 1;
    const finished = f >= 6;
    const typed = [1, 2, 4, 5].includes(f) ? String(legs[li][1]) : '';
    const baton = li === 0 ? start : legs[0][1];
    const stations = [['Start', start, 'bg-slate-700 text-white'], ...legs.map(([, ans], i) => [`Leg ${i + 1}`, cleared > i ? ans : i + 1,
      cleared > i ? 'bg-amber-400 text-amber-950' : i === li ? 'bg-white text-orange-600 ring-2 ring-orange-500' : 'bg-white text-slate-400 ring-1 ring-orange-200'])];
    return {
      body: (
        <div className="relative h-full">
          <Box s={[3, 11, 94, 27]} className="rounded-2xl bg-gradient-to-r from-orange-50 to-rose-50 ring-1 ring-orange-100" />
          <Box s={[18, 20.5, 64, 1.5]} className="rounded-full bg-orange-200" />
          {stations.map(([label, value, tone], i) => (
            <Box key={label} s={[12 + i * 32, 13, 12]} className="flex flex-col items-center gap-0.5">
              <span className={`flex aspect-square w-full items-center justify-center rounded-full text-sm font-black tabular-nums ${tone}`}>{value}</span>
              <span className="text-xs font-bold text-slate-500">{label}</span>
            </Box>
          ))}
          {finished ? (
            <Box s={[3, 42, 94, 30]} className="flex flex-col items-center justify-center rounded-2xl bg-emerald-50 text-center ring-1 ring-emerald-200">
              <span className="text-lg font-black text-emerald-700">Relay finished!</span>
              <span className="text-sm font-bold text-slate-700">{start} → {legs[0][1]} → {legs[1][1]}</span>
            </Box>
          ) : (
            <Box s={[3, 42, 94, 30]} className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-orange-100">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-black tracking-wider text-orange-500 uppercase">Leg {li + 1} of 2</span>
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-black text-orange-700">Baton: {baton}</span>
              </div>
              <p className="text-xs leading-snug font-bold text-slate-900">{legs[li][0]}</p>
            </Box>
          )}
          <Box s={[6, 77, 54, 16]} className={`flex items-center justify-center gap-2 rounded-xl bg-white ring-2 ring-inset ${finished ? 'ring-emerald-300' : 'ring-orange-300'}`}>
            <span className="text-xs font-bold text-slate-500">Answer</span><span className="text-xl font-black tabular-nums text-slate-900">{typed || '…'}</span>
          </Box>
          <Box s={[64, 77, 30, 16]} className="flex items-center justify-center rounded-xl bg-indigo-600 text-sm font-black text-white">Pass ↵</Box>
        </div>
      ),
      hand: f === 1 || f === 4 ? [36, 85, true] : f === 2 || f === 5 ? [79, 85, true] : REST,
      step: f < 1 ? 0 : f < 6 ? 1 : 2,
      phase: f === 0 || f === 3 ? 'Read the leg' : f === 1 || f === 4 ? 'Type the answer' : f === 2 || f === 5 ? 'Pass the baton' : 'Relay finished!'
    };
  } },

  'data-dash': { frames: 7, draw: (f, ex) => {
    const set = DASH[ex];
    const done = f >= 4;
    const choice = !!set.options;
    const right = choice ? set.options.indexOf(set.answer) : -1;
    const top = Math.max(...set.values);
    const mark = set.pie ? dashAt(48, 26) : dashAt(barX(set.mark[0]) + 13, 64 - barH(set.values[set.mark[0]], top) / 2);
    const optX = (i) => 3 + (94 * (i + 0.5)) / 4;
    return {
      body: (
        <div className="relative h-full">
          <Box s={[3, 12.5, 94, 6]} className="text-center text-xs font-black text-slate-800">{set.title}</Box>
          <Box s={[3, 19, 94, 38]}><DashChart set={set} marked={f >= 1} /></Box>
          <Box s={[3, 59, 94, 9]} className="text-center text-sm font-black text-slate-900">{set.q}</Box>
          {choice ? set.options.map((o, i) => (
            <Box key={o} s={[optX(i) - 11, 71, 22, 15]} className={`flex items-center justify-center rounded-xl text-sm font-black ring-2 ring-inset ${done && i === right ? 'bg-emerald-100 text-emerald-800 ring-emerald-500' : 'bg-white text-slate-900 ring-emerald-200'}`}>{o}</Box>
          )) : (
            <>
              <Box s={[10, 71, 48, 15]} className={`flex items-center justify-center rounded-xl bg-white text-xl font-black tabular-nums ring-2 ring-inset ${done ? 'text-emerald-700 ring-emerald-500' : 'text-slate-900 ring-emerald-300'}`}>{f >= 2 ? set.answer : '…'}</Box>
              <Box s={[62, 71, 28, 15]} className="flex items-center justify-center rounded-xl bg-indigo-600 text-sm font-black text-white">Answer</Box>
            </>
          )}
          {done && <Box s={[3, 88, 94, 8]} className="text-center text-sm font-black text-emerald-600">Right — {set.answer}!</Box>}
        </div>
      ),
      hand: f === 1 ? [...mark, false] : f === 2 ? (choice ? [optX(right), 78, false] : [34, 78, true]) : f === 3 ? (choice ? [optX(right), 78, true] : [76, 78, true]) : REST,
      step: f < 2 ? 0 : f < 4 ? 1 : 2,
      phase: f < 1 ? 'Read the chart' : f < 2 ? 'Find the values' : f < 4 ? 'Answer' : 'Right!'
    };
  } },

  'mental-math-circuit': { frames: 8, draw: (f, ex) => {
    const [input, layers, sol, trail] = CIRCUITS[ex];
    const ran = f >= 5;
    const rowTop = (i) => 24 + i * 16;
    return {
      body: (
        <div className="relative h-full">
          <Box s={[36, 11, 28, 10]} className="flex items-center justify-between rounded-xl bg-cyan-600 px-2 text-white">
            <span className="text-xs font-black tracking-widest">IN</span><span className="text-lg font-black tabular-nums">{input}</span>
          </Box>
          {[21, 37, 53, 69].map((t) => <Box key={t} s={[49.5, t, 1, 3]} className={`rounded-full ${ran ? 'bg-amber-400' : 'bg-slate-300'}`} />)}
          {layers.map((opts, i) => {
            const on = f > i ? sol[i] : 1 - sol[i];
            return (
              <div key={i}>
                {opts.map((op, k) => (
                  <Box key={op} s={[24 + k * 28, rowTop(i), 24, 12]} className={`flex items-center justify-center rounded-xl font-mono text-base font-black ${on === k ? 'bg-amber-300 text-slate-900 shadow-[0_0_0_3px_rgba(251,191,36,0.35)]' : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200 ring-inset'}`}>{op}</Box>
                ))}
                {ran && <Box s={[79, rowTop(i), 20, 12]} className="flex items-center text-sm font-black text-cyan-700 tabular-nums">= {trail[i]}</Box>}
              </div>
            );
          })}
          <Box s={[32, 72, 36, 10]} className={`flex items-center justify-between rounded-xl px-2 ${ran ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-amber-300'}`}>
            <span className="text-xs font-black tracking-wider">TARGET</span><span className="text-lg font-black tabular-nums">{trail[2]}</span>
          </Box>
          <Box s={[25, 85, 50, 11]} className={`flex items-center justify-center rounded-xl text-sm font-black ${ran ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-400 text-slate-900'}`}>{ran ? 'Circuit live! +2' : 'Run'}</Box>
        </div>
      ),
      hand: f >= 1 && f <= 3 ? [36 + sol[f - 1] * 28, rowTop(f - 1) + 6, true] : f === 4 ? [50, 90, true] : REST,
      step: f < 1 ? 0 : f < 5 ? 1 : 2,
      phase: f < 1 ? 'Reach the target' : f < 4 ? 'Flip the switches' : f < 5 ? 'Run' : 'Circuit live!'
    };
  } }
};
