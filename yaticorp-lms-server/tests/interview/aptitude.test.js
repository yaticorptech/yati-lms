/**
 * The aptitude question maker (aptitude.js): sets pitched to the student's
 * level, every question sound and its answer right. No database.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { makeSet, sectionsFor, titleFor, tierOf, SECTION_IDS } = require('../../src/interview/aptitude');
const { levelFor } = require('../../src/interview/level');

const LEVEL = {
    class3: levelFor({ educationLevel: 'Primary School (Class 1–5)', currentClass: 'Class 3' }),
    class7: levelFor({ educationLevel: 'Middle School (Class 6–8)', currentClass: 'Class 7' }),
    class10: levelFor({ educationLevel: 'High School (Class 9–10)', currentClass: 'Class 10' }),
    class12: levelFor({ educationLevel: 'Higher Secondary (Class 11–12)', currentClass: 'Class 12' }),
    college: levelFor({ educationLevel: 'Undergraduate' }),
    none: levelFor()
};
const kindsAt = (level, sets = 80) => {
    const kinds = new Set();
    for (let seed = 1; seed <= sets; seed++) for (const q of makeSet({ level, seed })) kinds.add(q.kind);
    return kinds;
};

describe('a set', () => {
    test('ten sound questions at every level and in every section', () => {
        for (const [name, level] of Object.entries(LEVEL)) {
            for (const section of ['mixed', ...SECTION_IDS]) {
                for (let seed = 1; seed <= 40; seed++) {
                    const set = makeSet({ level, section, seed });
                    assert.equal(set.length, 10, `${name}/${section}/${seed}`);
                    assert.equal(new Set(set.map((q) => q.question)).size, 10, 'no question twice');
                    for (const q of set) {
                        assert.equal(new Set(q.options).size, q.options.length, `repeated option: ${q.question}`);
                        assert.ok(q.answer >= 0 && q.answer < q.options.length, q.question);
                        assert.ok(q.options.length >= 3 || /follow/.test(q.options[0]), q.question);
                        if (section !== 'mixed') assert.equal(q.section, section);
                        assert.doesNotMatch([q.question, ...q.options, q.explanation].join(' '), /undefined|NaN|null|Infinity/, q.question);
                        assert.ok(q.explanation && q.topic && ['easy', 'medium', 'hard'].includes(q.difficulty));
                    }
                }
            }
        }
    });
    test('the same seed makes the same set', () => {
        assert.deepEqual(makeSet({ level: LEVEL.class10, seed: 42 }), makeSet({ level: LEVEL.class10, seed: 42 }));
        assert.notDeepEqual(makeSet({ level: LEVEL.class10, seed: 42 }), makeSet({ level: LEVEL.class10, seed: 43 }));
    });
    test('a mixed set spreads over all five sections, with two of the most-asked questions', () => {
        for (let seed = 1; seed <= 30; seed++) {
            const set = makeSet({ level: LEVEL.class10, seed });
            assert.equal(new Set(set.map((q) => q.section)).size, 5);
            assert.equal(set.filter((q) => q.faq).length, 2);
        }
    });
});

describe('pitched to the level', () => {
    test('a Class 3 child gets simple sums, counting on and the days of the week — nothing harder', () => {
        const k = kindsAt(LEVEL.class3);
        for (const kind of ['add-sub', 'times', 'step', 'letters', 'taller', 'days']) assert.ok(k.has(kind), kind);
        for (const kind of ['percent', 'profit', 'interest', 'work', 'code', 'clock', 'logic', 'family', 'squares']) assert.ok(!k.has(kind), kind);
    });
    test('a Class 10 student gets percentages, speed, codes and directions — not the first sums, nor interest', () => {
        const k = kindsAt(LEVEL.class10);
        for (const kind of ['percent', 'profit', 'speed', 'ratio', 'code', 'direction', 'squares', 'family']) assert.ok(k.has(kind), kind);
        for (const kind of ['add-sub', 'interest', 'work', 'clock', 'logic', 'two-series']) assert.ok(!k.has(kind), kind);
    });
    test('a college student gets placement-style aptitude', () => {
        const k = kindsAt(LEVEL.college);
        for (const kind of ['interest', 'work', 'clock', 'logic', 'two-series', 'profit']) assert.ok(k.has(kind), kind);
        for (const kind of ['add-sub', 'times', 'taller', 'step']) assert.ok(!k.has(kind), kind);
        assert.equal(tierOf(LEVEL.none), 5, 'a student the app cannot place is asked as a college student');
    });
    test('the word questions follow the level too', () => {
        const words = (level) => new Set(Array.from({ length: 60 }, (_, i) => makeSet({ level, section: 'words', seed: i + 1 })).flat().map((q) => q.question));
        assert.ok(words(LEVEL.class3).has('Which word means the opposite of "big"?'));
        assert.ok(!words(LEVEL.class3).has('Which word means the same as "meticulous"?'));
        assert.ok(words(LEVEL.college).has('Which word means the same as "meticulous"?'));
        assert.ok(!words(LEVEL.college).has('Which word means the opposite of "big"?'));
    });
    test('school students see "IQ & Reasoning" and plainer section names', () => {
        assert.equal(titleFor(LEVEL.class10), 'IQ & Reasoning');
        assert.equal(titleFor(LEVEL.college), 'Aptitude Practice');
        assert.deepEqual(sectionsFor(LEVEL.class7).map((s) => s.label), ['Mixed', 'Most asked puzzles', 'Maths puzzles', 'Patterns', 'Logic', 'Words']);
        assert.deepEqual(sectionsFor(LEVEL.college).map((s) => s.label), ['Mixed', 'Most asked in interviews', 'Quantitative aptitude', 'Series and patterns', 'Logical reasoning', 'Verbal ability']);
    });
});

describe('the most-asked questions', () => {
    const asked = (level) => new Set(Array.from({ length: 80 }, (_, i) => makeSet({ level, section: 'asked', seed: i + 1 })).flat().map((q) => q.question));
    test('every one is tagged as often asked in interviews', () => {
        for (const level of Object.values(LEVEL)) for (const q of makeSet({ level, section: 'asked', seed: 5 })) assert.equal(q.faq, true, q.question);
        for (const q of makeSet({ level: LEVEL.class10, section: 'maths', seed: 5 })) assert.equal(q.faq, undefined, 'other sections are not');
    });
    test('a Class 3 child gets the famous puzzles in plain words, not the placement classics', () => {
        const q = asked(LEVEL.class3);
        assert.ok(q.has('How many months of the year have 28 days?'));
        assert.ok(q.has('A farmer has 10 cows. All but 4 run away. How many cows are left?'));
        assert.ok(!q.has('Pipe A fills a tank in 4 hours; pipe B empties it in 6 hours. If both are open, how long does the tank take to fill?'));
        assert.ok(!q.has('Two dice are thrown. What is the probability that the total is 7?'));
    });
    test('a Class 10 student gets the classics of their level', () => {
        const q = asked(LEVEL.class10);
        assert.ok(q.has('If 5 machines take 5 minutes to make 5 toys, how long would 100 machines take to make 100 toys?'));
        assert.ok(q.has('A coin is tossed twice. What is the probability of getting at least one head?'));
        assert.ok(!q.has('A farmer has 10 cows. All but 4 run away. How many cows are left?'), 'not the youngest children\'s');
        assert.ok(!q.has('Two trains, each 100 m long, run towards each other at 40 km/h and 50 km/h. How long do they take to cross each other?'), 'not the placement ones');
    });
    test('a college student gets the placement classics', () => {
        const q = asked(LEVEL.college);
        for (const s of ['Two trains, each 100 m long, run towards each other at 40 km/h and 50 km/h. How long do they take to cross each other?',
            'A boat moves at 12 km/h in still water, and the stream flows at 3 km/h. How long does it take to go 45 km downstream?',
            'A bat and a ball cost ₹110 together. The bat costs ₹100 more than the ball. What does the ball cost?']) assert.ok(q.has(s), s);
        assert.ok(!q.has('What has hands but cannot clap?'));
    });
});

describe('the answers are right', () => {
    // Worked out again here, from the question's own words, for the kinds that can be.
    const all = (level, section) => Array.from({ length: 150 }, (_, i) => makeSet({ level, section, seed: i + 1 })).flat();
    const right = (q) => q.options[q.answer];
    test('percentages, sums and averages', () => {
        let checked = 0;
        for (const q of all(LEVEL.class10, 'maths')) {
            let m;
            if ((m = q.question.match(/^What is (\d+)% of (\d+)\?$/))) { assert.equal(right(q), String((m[1] * m[2]) / 100), q.question); checked++; }
            if ((m = q.question.match(/^What is the average of ([\d, ]+)\?$/))) { const xs = m[1].split(', ').map(Number); assert.equal(right(q), String(xs.reduce((a, b) => a + b, 0) / xs.length), q.question); checked++; }
        }
        for (const q of all(LEVEL.class3, 'maths')) {
            const m = q.question.match(/has (\d+) pencils and (buys|gives) (\d+)/);
            if (m) { assert.equal(right(q), String(m[2] === 'buys' ? +m[1] + +m[3] : m[1] - m[3]), q.question); checked++; }
        }
        assert.ok(checked > 100, `${checked} checked`);
    });
    test('number series that go up or down by the same step', () => {
        let checked = 0;
        for (const q of all(LEVEL.class3, 'patterns')) {
            const m = q.question.match(/^What comes next\? ([\d, ]+), \?$/);
            if (!m) continue;
            const xs = m[1].split(', ').map(Number); const d = xs[1] - xs[0];
            if (xs.every((x, i) => i === 0 || x - xs[i - 1] === d)) { assert.equal(right(q), String(xs[xs.length - 1] + d), q.question); checked++; }
        }
        assert.ok(checked > 50, `${checked} checked`);
    });
    test('the days of the week, and letter codes', () => {
        const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        let checked = 0;
        for (const q of all(LEVEL.class12, 'reasoning')) {
            let m;
            if ((m = q.question.match(/^Today is (\w+)\. What day will it be (\d+) days from today\?$/))) { assert.equal(right(q), DAYS[(DAYS.indexOf(m[1]) + +m[2]) % 7], q.question); checked++; }
            if ((m = q.question.match(/^If (\w+) is written as (\w+), how is (\w+) written\?$/))) {
                const k = (m[2].charCodeAt(0) - m[1].charCodeAt(0) + 26) % 26;
                assert.equal(right(q), [...m[3]].map((c) => String.fromCharCode(65 + ((c.charCodeAt(0) - 65 + k) % 26))).join(''), q.question); checked++;
            }
        }
        assert.ok(checked > 50, `${checked} checked`);
    });
});
