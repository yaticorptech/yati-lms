import test from 'node:test';
import assert from 'node:assert/strict';

const S = await import('../../src/career/data/bands/wordcraft/select.js');
const R = await import('../../src/career/data/bands/wordcraft/score.js');
const C = await import('../../src/career/data/bands/wordcraft/content.js');
const { seeded } = await import('../../src/career/data/seeded.js');

test('WORDCRAFT: every level is exactly three challenges — the twister and two different optional ones', () => {
  const rng = seeded(7);
  let state = S.freshDeal();
  const counts = Object.fromEntries(S.OPTIONAL.map((k) => [k, 0]));
  const places = [0, 0, 0];
  let lastPlace = null; let lastPair = null;
  for (let lv = 1; lv <= 1000; lv += 1) {
    const { combo, state: next } = S.dealCombo(rng, state);
    state = next;
    assert.equal(combo.length, 3);
    assert.equal(combo.filter((k) => k === S.TWISTER).length, 1, 'the twister, once');
    const two = combo.filter((k) => k !== S.TWISTER);
    assert.equal(new Set(two).size, 2, 'two different optional challenges');
    two.forEach((k) => { assert.ok(S.OPTIONAL.includes(k)); counts[k] += 1; });
    const place = combo.indexOf(S.TWISTER);
    assert.notEqual(place, lastPlace, 'the twister never in the same place two levels running');
    lastPlace = place; places[place] += 1;
    const pair = [...two].sort().join('+');
    assert.notEqual(pair, lastPair, 'never the same pair twice in a row');
    lastPair = pair;
  }
  // 1000 levels = 100 decks: each optional challenge exactly 400 times.
  for (const k of S.OPTIONAL) assert.equal(counts[k], 400, k);
  for (const n of places) assert.ok(n >= 330 && n <= 337, `twister places balanced: ${places}`);
});

test('WORDCRAFT: ten levels in a row use ten different pairs', () => {
  let state = S.freshDeal(); const rng = seeded(3); const seen = new Set();
  for (let i = 0; i < 10; i += 1) { const r = S.dealCombo(rng, state); state = r.state; seen.add(r.combo.filter((k) => k !== 'twister').sort().join('+')); }
  assert.equal(seen.size, 10);
});

test('WORDCRAFT: stages, content for every challenge at every stage, fresh picks', () => {
  assert.deepEqual([1, 10, 11, 25, 26, 45, 46, 400].map(S.stageOf), [0, 0, 1, 1, 2, 2, 3, 3]);
  for (let stage = 0; stage < 4; stage += 1) {
    const ch = S.makeChallenges(seeded(stage + 1), ['dont-say', 'caption', 'talk60', 'plot', 'sell', 'twister'], stage, {});
    for (const c of ch) assert.ok(c.item, `${c.kind} has content`);
    const plot = ch.find((c) => c.kind === 'plot');
    assert.equal(plot.twists.length, S.STAGES[stage].twists);
    assert.ok(plot.twists.every((t) => t.at > 0 && t.at < plot.seconds));
    assert.equal(ch.find((c) => c.kind === 'twister').item.stage, stage);
  }
  for (const bank of [C.TABOO, C.TOPICS, C.TWISTERS, C.OPENERS, C.TWISTS]) for (let s = 0; s < 4; s += 1) assert.ok(bank.filter((x) => x.stage === s).length >= 8);
  assert.ok(C.CAPTIONS.length >= 40 && C.PRODUCTS.length >= 40);
  const ids = [...C.TABOO, ...C.TOPICS, ...C.TWISTERS, ...C.OPENERS, ...C.TWISTS, ...C.CAPTIONS, ...C.PRODUCTS].map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, 'unique ids');
  // A seen item is not picked again while fresh ones remain.
  const items = C.TWISTERS.filter((t) => t.stage === 0);
  const seen = items.slice(0, items.length - 1).map((t) => t.id);
  assert.equal(S.pickFresh(seeded(9), items, seen).id, items.at(-1).id);
});

test('WORDCRAFT scoring: forbidden words, twister repetitions, typed cap', () => {
  const item = C.TABOO.find((t) => t.target === 'umbrella');
  const clean = R.scoreTaboo(item, 'You carry this when the weather turns, it gives you shelter and cover from the drops falling from the sky so you stay protected and dry on the way', { stage: 0 });
  const dirty = R.scoreTaboo(item, 'You open it when there is rain and you hold the handle so you do not get wet in the weather under the sky', { stage: 0 });
  assert.deepEqual(clean.said, []);
  assert.ok(dirty.said.includes('rain') && dirty.said.includes('handle'));
  assert.ok(clean.score > dirty.score + 30, `${clean.score} vs ${dirty.score}`);
  assert.ok(R.scoreTaboo(item, 'x '.repeat(5) + 'shelter cover protect carry sky drops weather fold', { typed: true }).score <= R.TYPED_CAP);

  // Tongue twister: five times in one go, two chances.
  const tw = 'Peter Piper picked a peck of pickled peppers.';
  const five = Array(5).fill('peter piper picked a peck of pickled peppers').join(' ');
  assert.equal(R.checkTwister(tw, five, 0.85).ok, true);
  assert.equal(R.checkTwister(tw, Array(4).fill('peter piper picked a peck of pickled peppers').join(' '), 0.85).reps, 4);
  const broken = R.checkTwister(tw, `${five.split(' ').slice(0, 16).join(' ')} peter something else entirely ${five.split(' ').slice(0, 16).join(' ')}`, 0.85);
  assert.equal(broken.ok, false, 'a broken run does not count as five');
  assert.equal(R.checkTwister(tw, five, 0.85, 40, 20).ok, false, 'too slow');
  const ch = { item: { text: tw }, acc: 0.85, seconds: 30, needed: 5 };
  assert.equal(R.replayTwister(ch, [{ spoken: five, secs: 12 }]).score, 100);
  assert.equal(R.replayTwister(ch, [{ spoken: 'peter piper', secs: 3 }, { spoken: five, secs: 12 }]).score, 80, 'second chance');
  assert.equal(R.replayTwister(ch, [{ spoken: 'peter', secs: 3 }, { spoken: 'piper', secs: 3 }, { spoken: five, secs: 12 }]).done, false, 'only two chances');
  assert.ok(R.scoreTwister({ done: false, attempts: 2, best: 3 }).score < R.PASS);

  const plot = R.scorePlot({ line: 'The lift stopped between floors.' }, [{ word: 'parrot' }, { word: 'pizza' }], 'The lift stopped and suddenly a parrot flew in because someone had ordered a pizza, then the doors opened and finally we escaped together laughing', { stage: 0 });
  assert.equal(plot.used.length, 2);
  const cap = R.scoreCaption(C.CAPTIONS.find((c) => c.id === 'c1062'), 'Burrito Bob refuses to face Monday!');
  assert.ok(cap.score >= R.PASS, String(cap.score));
});
