/**
 * Train Builder (2026-11-16, replaces Pizza Party for Young Thinkers · Maths; same game id "shape-count-dash").
 * Pure, so node can test it.
 *
 * Each station has a number. Hook numbered carriages onto the engine so they add up to it, then press Go — the train
 * chugs off to the next station. Kinds of station, as the levels climb:
 *   sum      — make the station number with any carriages
 *   exact    — make it with exactly N carriages
 *   pattern  — the train is a number pattern with a gap (2, 4, 6, ?, 10): fill the gap
 */

const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const shuffle = (rng, list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** The level's setup. Developing (Classes 3–5) starts three levels on. */
export const trainConfig = (band, levelNo) => {
  const n = Math.max(1, levelNo + (band === 'developing' ? 3 : 0));
  const kinds = n <= 2 ? ['sum'] : n <= 4 ? ['sum', 'sum', 'pattern'] : n <= 6 ? ['sum', 'exact', 'pattern'] : ['exact', 'exact', 'pattern', 'sum'];
  const maxCar = n <= 2 ? 5 : n <= 4 ? 7 : n <= 6 ? 9 : 12;
  const cars = n <= 2 ? [2] : n <= 5 ? [2, 3] : [3];
  return { n, kinds, maxCar, cars, yard: n <= 2 ? 5 : 6, step: n <= 4 ? [1, 2, 5, 10] : [2, 3, 4, 5, 10], rounds: 6, pass: 5 };
};

/** Whether a train answers its station. */
export const trainWorks = (station, cars) => {
  if (station.kind === 'pattern') return cars.length === 1 && cars[0] === station.missing;
  const total = cars.reduce((a, b) => a + b, 0);
  return total === station.target && (station.kind !== 'exact' || cars.length === station.count);
};

/** One station. Yard cards are { id, value }; the planted answer is always in the yard. */
export const makeStation = (rng, config) => {
  const kind = config.kinds[int(rng, 0, config.kinds.length - 1)];
  if (kind === 'pattern') {
    const step = config.step[int(rng, 0, config.step.length - 1)];
    const start = step === 10 ? 10 * int(rng, 0, 3) : int(rng, 1, 6);
    const seq = Array.from({ length: 5 }, (_, i) => start + i * step);
    const gap = int(rng, 1, 4);
    const missing = seq[gap];
    const wrong = [...new Set([missing + 1, missing - 1, missing + step, missing - step, missing + 2].filter((v) => v > 0 && v !== missing))];
    const yard = shuffle(rng, [missing, ...shuffle(rng, wrong).slice(0, 3)]).map((value, id) => ({ id, value }));
    return { kind, seq, gap, missing, yard };
  }
  const count = kind === 'exact' ? 3 : config.cars[int(rng, 0, config.cars.length - 1)];
  const plant = Array.from({ length: count }, () => int(rng, 1, config.maxCar));
  const target = plant.reduce((a, b) => a + b, 0);
  const extras = Array.from({ length: config.yard - count }, () => int(rng, 1, config.maxCar));
  const yard = shuffle(rng, [...plant, ...extras]).map((value, id) => ({ id, value }));
  return { kind, target, count, yard };
};

export const makeTrainLevel = (rng, config) => Array.from({ length: config.rounds }, () => makeStation(rng, config));
