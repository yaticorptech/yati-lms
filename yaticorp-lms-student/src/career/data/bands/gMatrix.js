/**
 * Word Relation Matrix (Master Minds, Classes 11–12) — pure, seeded grids.
 *
 * A theme is a table: every column is a category (Maker | Tool | Product) and every row one instance of the
 * relation that links them (potter : wheel : vase). A grid deals some rows and blanks some cells; the pool holds
 * exactly the missing words, plus (at higher difficulty) decoys taken from rows of the same theme that are not on
 * the grid. Unique by construction: every word appears once in its theme, every row keeps at least one given cell
 * (themes whose first column is the key, like Word | Synonym | Antonym, always keep that one), so each blank has
 * exactly one word in the pool that fits both its row and its column.
 */
import { intBetween, sample, shuffle } from '../seeded.js';

export const THEMES = [
  {
    id: 'craft', title: 'Maker · Tool · Work', cols: ['Maker', 'Tool', 'Work'], tier: 1,
    rows: [
      ['potter', 'wheel', 'vase'], ['blacksmith', 'anvil', 'horseshoe'], ['tailor', 'needle', 'suit'], ['baker', 'oven', 'bread'],
      ['sculptor', 'chisel', 'statue'], ['weaver', 'loom', 'tapestry'], ['photographer', 'camera', 'photograph'], ['painter', 'brush', 'mural']
    ]
  },
  {
    id: 'nations', title: 'Country · Capital · Currency', cols: ['Country', 'Capital', 'Currency'], tier: 1,
    rows: [
      ['Japan', 'Tokyo', 'yen'], ['India', 'New Delhi', 'rupee'], ['Russia', 'Moscow', 'rouble'], ['China', 'Beijing', 'yuan'],
      ['Thailand', 'Bangkok', 'baht'], ['South Korea', 'Seoul', 'won'], ['Brazil', 'Brasília', 'real'], ['Bangladesh', 'Dhaka', 'taka'],
      ['United Kingdom', 'London', 'pound']
    ]
  },
  {
    id: 'animals', title: 'Animal · Young · Group', cols: ['Animal', 'Young', 'Group'], tier: 1,
    rows: [
      ['lion', 'cub', 'pride'], ['goose', 'gosling', 'gaggle'], ['owl', 'owlet', 'parliament'], ['kangaroo', 'joey', 'mob'],
      ['fish', 'fry', 'school'], ['wolf', 'pup', 'pack'], ['horse', 'foal', 'herd'], ['swan', 'cygnet', 'bevy']
    ]
  },
  {
    id: 'degrees', title: 'Positive · Comparative · Superlative', cols: ['Positive', 'Comparative', 'Superlative'], tier: 1,
    rows: [['good', 'better', 'best'], ['bad', 'worse', 'worst'], ['little', 'less', 'least'], ['many', 'more', 'most'], ['far', 'farther', 'farthest'], ['late', 'later', 'latest']]
  },
  {
    id: 'fields', title: 'Field · Studies · Expert', cols: ['Field', 'Studies', 'Expert'], tier: 2,
    rows: [
      ['ornithology', 'birds', 'ornithologist'], ['entomology', 'insects', 'entomologist'], ['seismology', 'earthquakes', 'seismologist'],
      ['botany', 'plants', 'botanist'], ['cardiology', 'the heart', 'cardiologist'], ['etymology', 'word origins', 'etymologist'],
      ['astronomy', 'stars and planets', 'astronomer'], ['geology', 'rocks', 'geologist'], ['meteorology', 'weather', 'meteorologist'],
      ['numismatics', 'coins', 'numismatist']
    ]
  },
  {
    id: 'instruments', title: 'Instrument · Measures · SI unit', cols: ['Instrument', 'Measures', 'Unit'], tier: 2,
    rows: [
      ['thermometer', 'temperature', 'kelvin'], ['barometer', 'air pressure', 'pascal'], ['odometer', 'distance travelled', 'metre'],
      ['ammeter', 'electric current', 'ampere'], ['voltmeter', 'voltage', 'volt'], ['balance', 'mass', 'kilogram'],
      ['stopwatch', 'time', 'second'], ['light meter', 'illuminance', 'lux']
    ]
  },
  {
    id: 'families', title: 'Noun · Verb · Adjective', cols: ['Noun', 'Verb', 'Adjective'], tier: 3,
    rows: [
      ['decision', 'decide', 'decisive'], ['analysis', 'analyse', 'analytical'], ['emphasis', 'emphasise', 'emphatic'],
      ['persuasion', 'persuade', 'persuasive'], ['clarity', 'clarify', 'clear'], ['strength', 'strengthen', 'strong'],
      ['destruction', 'destroy', 'destructive'], ['simplicity', 'simplify', 'simple'], ['prediction', 'predict', 'predictable'],
      ['competition', 'compete', 'competitive']
    ]
  },
  {
    id: 'meanings', title: 'Word · Synonym · Antonym', cols: ['Word', 'Synonym', 'Antonym'], tier: 3, anchor: 0,
    rows: [
      ['abundant', 'plentiful', 'scarce'], ['candid', 'frank', 'evasive'], ['diligent', 'industrious', 'lazy'],
      ['transient', 'fleeting', 'permanent'], ['benevolent', 'charitable', 'malevolent'], ['frugal', 'thrifty', 'extravagant'],
      ['timid', 'shy', 'bold'], ['ancient', 'archaic', 'modern'], ['humble', 'modest', 'arrogant'], ['brief', 'concise', 'lengthy']
    ]
  }
];

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const ramp = (from, to, levelNo) => Math.round(from + (to - from) * clampN((levelNo - 1) / 29, 0, 1));

/** difficulty: rows 3 / 4 / 5, more blanks, decoys from difficulty 2; themes from the tiers allowed. */
export const matrixConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const d = clampN(difficulty || 1, 1, 3);
  const rows = 2 + d;
  const blanks = d === 1 ? ramp(3, 4, levelNo) : d === 2 ? ramp(5, 6, levelNo) : ramp(7, 9, levelNo);
  return {
    band: ageBand === 'advanced' || !ageBand ? 'advanced' : 'gentle',
    difficulty: d,
    grids: levelNo >= 20 ? 3 : 2,
    rows,
    blanks,
    decoys: d === 1 ? 0 : d === 2 ? ramp(1, 2, levelNo) : ramp(2, 3, levelNo),
    tiers: d === 1 ? [1] : d === 2 ? [1, 2] : [2, 3]
  };
};

/**
 * A grid: { theme, rows: [[word…]], blanks: [[r, c]…], pool: [words, shuffled], decoys: [words] }.
 * Each row keeps ≥ 1 given cell (the anchor column when the theme has one).
 */
export const makeMatrixGrid = (rng, config, theme) => {
  const rows = sample(rng, theme.rows, config.rows);
  const cols = theme.cols.length;
  const open = [];
  rows.forEach((_, r) => {
    for (let c = 0; c < cols; c++) if (c !== theme.anchor) open.push([r, c]);
  });
  const perRow = rows.map(() => 0);
  const maxPerRow = cols - 1;
  const blanks = [];
  // Every row first gets one blank (so all rows matter), then the rest at random.
  for (const [r, c] of shuffle(rng, open)) {
    if (blanks.length >= config.blanks) break;
    if (perRow[r] === 0) { blanks.push([r, c]); perRow[r] += 1; }
  }
  for (const [r, c] of shuffle(rng, open)) {
    if (blanks.length >= config.blanks) break;
    if (blanks.some(([br, bc]) => br === r && bc === c) || perRow[r] >= maxPerRow) continue;
    blanks.push([r, c]);
    perRow[r] += 1;
  }
  blanks.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const blankCols = [...new Set(blanks.map(([, c]) => c))];
  const spare = theme.rows.filter((row) => !rows.includes(row));
  const decoys = [];
  for (const row of shuffle(rng, spare)) {
    if (decoys.length >= config.decoys) break;
    decoys.push(row[blankCols[intBetween(rng, 0, blankCols.length - 1)]]);
  }
  const pool = shuffle(rng, [...blanks.map(([r, c]) => rows[r][c]), ...decoys]);
  return { theme, rows, blanks, pool, decoys };
};

export const makeMatrixLevel = (rng, config) => {
  const themes = sample(rng, THEMES.filter((t) => config.tiers.includes(t.tier) && t.rows.length >= config.rows + config.decoys), config.grids);
  return themes.map((theme) => makeMatrixGrid(rng, config, theme));
};

/** Does `word` belong in blank [r, c]? */
export const fitsCell = (grid, r, c, word) => grid.rows[r][c] === word;

/** Every assignment of pool words to blanks that satisfies all rows and columns (for tests: must be exactly one). */
export const countSolutions = (grid) => {
  let n = 0;
  const used = new Array(grid.pool.length).fill(false);
  const go = (i) => {
    if (i === grid.blanks.length) { n += 1; return; }
    const [r, c] = grid.blanks[i];
    for (let k = 0; k < grid.pool.length; k++) {
      if (used[k] || !fitsCell(grid, r, c, grid.pool[k])) continue;
      used[k] = true;
      go(i + 1);
      used[k] = false;
    }
  };
  go(0);
  return n;
};
