/**
 * Conversations (2026-11-06, the user: "where is the answer for his question? give the answer — in all languages"): no
 * conversation ends on a question left unanswered; the interview's last question is answered, in the lesson already
 * seeded too, every line with its recording. The conversation is the same English for every student's language.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connect } = require('../helpers');
const { LinguisticLesson } = require('../../src/linguistic/models');

before(async () => { await connect(); await require('../../src/linguistic/seed').ensureSeeded(); });
after(() => mongoose.disconnect());

test('no conversation ends on a question nobody answers', () => {
    const all = [...require('../../src/linguistic/content/speaking'), ...require('../../src/linguistic/content/topics').lessons.filter((l) => l.module === 'speaking')];
    for (const l of all.filter((x) => x.learn?.dialogue)) {
        const lines = l.learn.dialogue.lines;
        assert.ok(!/\?\s*$/.test(lines[lines.length - 1].text), `${l.seedKey} ends on "${lines[lines.length - 1].text}"`);
    }
});

test('the job interview: Nikhil\'s question answered, in the lesson as seeded, every line recorded', async () => {
    const doc = await LinguisticLesson.findOne({ seedKey: 'speaking-advanced-1' }).lean();
    const lines = doc.learn.dialogue.lines;
    const asked = lines.findIndex((l) => /typical day looks like/.test(l.text));
    assert.ok(asked >= 0 && lines.length > asked + 1, 'his question has lines after it');
    assert.equal(lines[asked + 1].speaker, 'Interviewer');
    assert.match(lines[asked + 1].text, /day starts with/, 'the interviewer tells him about a typical day');
    for (const l of lines) assert.ok(fs.existsSync(path.join(__dirname, '..', '..', 'public', l.audio)), `${l.audio}: recorded`);
});
