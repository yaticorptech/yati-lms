import test from 'node:test';
import assert from 'node:assert/strict';

const S = await import('../../src/career/data/bands/speakUp.js');
const { seeded } = await import('../../src/career/data/seeded.js');

test('Speak Up: reading every word right scores high, missing words are found', () => {
  const text = S.READINGS[0].text;
  const perfect = S.scoreReading(text, text, (S.words(text).length / 130) * 60);
  assert.equal(perfect.accuracy, 100);
  assert.ok(perfect.score >= 95, `${perfect.score}`);
  const missing = S.scoreReading('The cat sat on the mat today', 'the cat sat on mat', 3);
  assert.deepEqual(missing.hit, [true, true, true, true, false, true, false]);
  // speech engines slip a letter in long words, and spell numbers out
  assert.equal(S.alignWords('thirty minute walk', '30 minute walks').filter(Boolean).length, 3);
});

test('Speak Up: twister, interview and retell scores behave', () => {
  const tw = S.TWISTERS[0];
  assert.ok(S.scoreTwister(tw, tw.text, 3).score >= 95);
  assert.ok(S.scoreTwister(tw, 'she sells', 3).score < 60);
  const q = S.QUESTIONS[1];
  const good = S.scoreInterview(q, 'My greatest strength is planning. For example, when I led a project, my team finished early and we achieved a better result because we planned every step together with my colleagues and kept checking progress every week', 28);
  const poor = S.scoreInterview(q, 'um like um basically um I am good', 28);
  assert.ok(good.score > poor.score + 30, `${good.score} vs ${poor.score}`);
  assert.ok(poor.fillerCount >= 4);
  const st = S.STORIES[0];
  assert.ok(S.scoreRetell(st, 'Anita had an interview but her train was delayed so she called the company and they moved it to the afternoon and she got the job').score >= 85);
  assert.ok(S.scoreRetell(st, 'a woman went somewhere').score < 40);
});

test('Speak Up: a level is four rounds in order', () => {
  for (const tier of [1, 2, 3]) {
    const lv = S.makeSpeakLevel(seeded(tier * 7), tier);
    assert.deepEqual(lv.map((r) => r.kind), ['read', 'twister', 'interview', 'retell']);
  }
});
