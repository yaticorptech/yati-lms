const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const comms = require('../../src/interview/communicationService');

const spoken = (answer, voice, stage = 'about') => ({ stage, answer, inputMode: 'voice', voice: comms.turnMetrics(answer, voice) });
const typed = (answer, stage = 'about') => ({ stage, answer, inputMode: 'text', voice: comms.turnMetrics(answer, null) });
const kinds = (s) => Object.fromEntries(s.notes.map((n) => [n.kind, n.tone]));
const long = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

describe('turnMetrics', () => {
    test('counts words, fillers and hedges from the text, and pace from the timing', () => {
        const m = comms.turnMetrics('Um, so I think I basically built a dashboard, you know, with Python.', { durationMs: 6000, longPauses: 1, pauseMs: 3000 });
        assert.equal(m.wordCount, 13);
        assert.equal(m.fillerCount, 3);            // um, basically, you know
        assert.equal(m.hedgeCount, 1);             // i think
        assert.equal(m.wpm, 130);
        assert.equal(m.longPauses, 1); assert.equal(m.pauseMs, 3000);
        assert.ok(m.fillers.includes('um'));
    });
    test('ignores impossible client timings', () => {
        assert.equal(comms.turnMetrics('a few words here', { durationMs: 10 }).wpm, null);                 // too short to measure
        assert.equal(comms.turnMetrics(long(200), { durationMs: 4000 }).wpm, null);                       // 3000 wpm is not a person
        assert.equal(comms.turnMetrics('hello there', { durationMs: 'x', longPauses: -5 }).longPauses, 0);
        assert.equal(comms.turnMetrics('hello there', null).durationMs, 0);
    });
});

describe('summarize', () => {
    test('returns null with nothing answered', () => { assert.equal(comms.summarize({ turns: [{ answer: '' }] }), null); });
    test('flags fillers, slow pace, pauses, short answers and hedging', () => {
        const s = comms.summarize({ turns: [
            spoken('Um, uh, so I guess I maybe worked on, um, Python things, actually.', { durationMs: 9000, longPauses: 2 }),
            spoken('I think I probably used SQL, you know, for reports.', { durationMs: 8000, longPauses: 1 })
        ] });
        const k = kinds(s);
        assert.equal(k.fillers, 'warn'); assert.equal(k.pace, 'warn'); assert.equal(k.pauses, 'warn'); assert.equal(k.length, 'warn'); assert.equal(k.hedging, 'warn');
        assert.ok(s.wpm < 100, `slow pace expected, got ${s.wpm}`);
        assert.equal(s.voiceAnswers, 2); assert.equal(s.answers, 2);
        assert.match(s.notes.find((n) => n.kind === 'fillers').text, /filler words such as 'um'/);
    });
    test('praises clean, well-paced, well-sized answers', () => {
        const text = `I led the Sales Dashboard project. First I gathered the requirements, then I built the pipeline in Python, and finally I reviewed the result with the team. ${long(50)}`;
        const s = comms.summarize({ turns: [spoken(text, { durationMs: 30000 })] });
        const k = kinds(s);
        assert.equal(k.fillers, 'good'); assert.equal(k.pace, 'good'); assert.equal(k.length, 'good');
        assert.equal(k.pauses, undefined); assert.equal(k.hedging, undefined);
    });
    test('flags a fast pace and long answers', () => {
        const s = comms.summarize({ turns: [spoken(long(260), { durationMs: 60000 })] });
        const k = kinds(s);
        assert.equal(k.pace, 'warn'); assert.match(s.notes.find((n) => n.kind === 'pace').text, /quickly/);
        assert.equal(k.length, 'warn'); assert.match(s.notes.find((n) => n.kind === 'length').text, /concise/);
    });
    test('asks for structure when a long behavioural answer never reaches a result', () => {
        const s = comms.summarize({ turns: [spoken(`There was a time when my teammate and I disagreed about the design and we talked for a long time about it ${long(40)}`, { durationMs: 25000 }, 'behavioral')] });
        assert.equal(kinds(s).structure, 'warn');
        const ok = comms.summarize({ turns: [spoken(`We disagreed, I proposed a test, and the outcome was a faster build; I learned to test early. ${long(40)}`, { durationMs: 25000 }, 'behavioral')] });
        assert.equal(kinds(ok).structure, undefined);
    });
    test('typed answers get no pace and a note to speak next time', () => {
        const s = comms.summarize({ turns: [typed(long(60)), typed(long(70))] });
        assert.equal(s.wpm, null); assert.equal(s.voiceAnswers, 0);
        assert.equal(kinds(s).voice, 'info'); assert.equal(kinds(s).pace, undefined);
    });
    test('describe() is one readable line for the evaluator', () => {
        const s = comms.summarize({ turns: [spoken(long(60), { durationMs: 30000, longPauses: 1 })] });
        const line = comms.describe(s);
        assert.match(line, /1 of 1 answers were spoken aloud/); assert.match(line, /average pace 120 words\/min/); assert.match(line, /1 long pauses\.$/);
        assert.equal(comms.describe(null), '');
    });
});
