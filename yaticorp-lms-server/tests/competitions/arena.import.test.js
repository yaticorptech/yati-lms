/**
 * Generate Question Bank (competitions/arena/importer.js and its datasets).
 *
 * The shipped datasets: every question passes the importer's checks, and
 * every `computed` arithmetic and reasoning answer is worked out again here.
 * The checks themselves, and a whole import into the database — duplicates,
 * contradictions, pictures that do not load, links not reachable, outdated
 * current affairs — run on throwaway data (keys stamped for this run), with
 * the network faked, so the real bank is never touched.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect } = require('../helpers');
const mongoose = require('mongoose');
const importer = require('../../src/competitions/arena/importer');
const { ArenaQuestion } = require('../../src/competitions/arena/models');
const R1 = require('../../src/competitions/arena/datasets/round1.json');
const R2 = require('../../src/competitions/arena/datasets/round2.json');
const R3 = require('../../src/competitions/arena/datasets/round3.json');

describe('the shipped datasets', () => {
    test('every question passes the import checks, with a unique key and wording', () => {
        for (const d of [R1, R2]) {
            const keys = new Set(); const words = new Set();
            for (const q of d.questions) {
                const v = importer.validate(q, d.round);
                assert.deepEqual(v.errors, [], `${q.key}: ${v.errors.join(' ')}`);
                assert.deepEqual(v.review, [], `${q.key} needs no review for its wording`);
                assert.ok(!keys.has(q.key), `duplicate key ${q.key}`); keys.add(q.key);
                const w = q.prompt + (q.image || q.wikipediaImage || q.wikidataLogo || ''); assert.ok(!words.has(w), `duplicate question ${q.key}`); words.add(w);
            }
        }
        assert.ok(R1.questions.length >= 10 && R2.questions.length >= 5, 'enough for the default contest (10 and 5)');
        // At least four in every category, for the admin to choose from.
        const per = (d) => d.questions.reduce((m, x) => ({ ...m, [x.category]: (m[x.category] || 0) + 1 }), {});
        for (const cat of ['General Knowledge', 'Science', 'Technology', 'Mathematics', 'History', 'Geography', 'Logical Reasoning']) assert.ok(per(R1)[cat] >= 4, `Round 1 ${cat}: ${per(R1)[cat] || 0}`);
        for (const cat of ['Personality', 'Monument', 'Sport', 'Logo', 'Flag']) assert.ok(per(R2)[cat] >= 10, `Round 2 ${cat}: ${per(R2)[cat] || 0}`);
        // Current affairs: every one sourced, dated and checked, none in the future.
        const now = Date.parse('2026-10-24');
        for (const q of R3.questions) {
            const v = importer.validate(q, 3, { now, maxAgeDays: R3.maxAgeDays });
            assert.deepEqual(v.errors, [], `${q.key}: ${v.errors.join(' ')}`);
            assert.equal(v.outdated, false, `${q.key} is out of date`);
            assert.ok(v.review.length, `${q.key}: current affairs are always reviewed by a person`);
        }
        assert.equal(new Set(R3.questions.map((q) => q.key)).size, R3.questions.length, 'unique keys');
        assert.ok(R3.questions.length >= 10, 'enough for the default contest (10)');
        assert.ok(importer.validate({ ...R3.example, sourceUrl: 'https://example.org/report', eventDate: '2026-09-30', verifiedOn: '2026-10-20' }, 3, { now: Date.parse('2026-10-24') }).errors.length === 0, 'the example is a valid format');
    });

    test('every computed answer is right', () => {
        const work = {
            'r1-math-percent-sum': () => String(0.2 * 250 + 0.15 * 200),
            'r1-math-simple-interest': () => `₹${((5000 * 8 * 3) / 100).toLocaleString('en-IN')}`,
            'r1-math-lcm': () => String([...Array(216).keys()].slice(1).find((n) => n % 12 === 0 && n % 18 === 0)),
            'r1-math-hcf': () => { const g = (a, b) => (b ? g(b, a % b) : a); return String(g(48, 180)); },
            'r1-math-train': () => `${(150 / 15) * 3.6} km/h`,
            'r1-math-workers': () => String((6 * 12) / 9),
            'r1-math-up-down': () => (Math.abs(1.1 * 0.9 - 0.99) < 1e-12 ? 'A 1% fall' : '?'),
            'r1-math-dice-seven': () => { let n = 0; for (let a = 1; a <= 6; a += 1) for (let b = 1; b <= 6; b += 1) if (a + b === 7) n += 1; return n === 6 ? '1/6' : '?'; },
            'r1-math-clock': () => `${Math.abs(3 * 30 + 30 * 0.5 - 30 * 6)}°`,
            'r1-math-handshakes': () => String((10 * 9) / 2),
            'r1-rsn-series': () => String(30 + 12),
            'r1-rsn-code': () => [...'DOG'].map((c) => String.fromCharCode(c.charCodeAt(0) + 1)).join(''),
            'r1-rsn-days': () => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][61 % 7],
            'r1-rsn-direction': () => { const d = ['North', 'East', 'South', 'West']; let i = 0; i = (i + 1) % 4; i = (i + 1) % 4; i = (i + 3) % 4; return d[i]; },
            'r1-rsn-heights': () => ['D', 'A', 'B', 'C'].at(-1),
            'r1-rsn-letters': () => String.fromCharCode('O'.charCodeAt(0) + 6)
        };
        const computed = R1.questions.filter((q) => q.computed);
        assert.deepEqual(computed.map((q) => q.key).sort(), Object.keys(work).sort(), 'every computed question has its working here');
        for (const q of computed) assert.equal(work[q.key](), q.answer, q.key);
    });

    test('flag pictures are the answer\'s own flag (the ISO code in the address)', () => {
        const CODES = { India: 'in', Japan: 'jp', Brazil: 'br', Canada: 'ca', Germany: 'de', France: 'fr', Italy: 'it', 'United Kingdom': 'gb', 'United States': 'us', China: 'cn', 'South Africa': 'za', 'South Korea': 'kr', Nepal: 'np', 'Sri Lanka': 'lk', Bangladesh: 'bd', Australia: 'au', Argentina: 'ar', Sweden: 'se', Switzerland: 'ch', Turkey: 'tr', Egypt: 'eg', Kenya: 'ke', Greece: 'gr', Portugal: 'pt' };
        for (const q of R2.questions.filter((x) => x.category === 'Flag')) assert.equal(q.image, `https://flagcdn.com/w640/${CODES[q.answer]}.png`, q.key);
    });
});

describe('the checks', () => {
    const base = { key: 'x-test-one', category: 'Science', difficulty: 'easy', prompt: 'Which planet is red?', options: ['Mars', 'Venus', 'Earth', 'Jupiter'], answer: 'Mars', explanation: 'Iron oxide.', sourceUrl: 'https://en.wikipedia.org/wiki/Mars' };
    const errs = (q, round = 1, o) => importer.validate(q, round, o).errors.join(' ');
    test('exactly one right answer among four different options', () => {
        assert.match(errs({ ...base, options: ['Mars', 'mars', 'Earth', 'Venus'] }), /same/);
        assert.match(errs({ ...base, answer: 'Pluto' }), /not one of the options/);
        assert.match(errs({ ...base, options: ['Mars', 'Venus', 'Earth'] }), /four options/);
        assert.match(errs({ ...base, difficulty: 'tough' }), /Difficulty/);
        assert.match(errs({ ...base, sourceUrl: 'http://x' }), /source/);
        assert.equal(errs({ ...base, sourceUrl: undefined, computed: true }), '', 'worked answers need no link');
        assert.ok(importer.validate({ ...base, options: ['Mars', 'Venus', 'All of the above', 'Earth'] }, 1).review.length, 'ambiguous wording is flagged');
    });
    test('pictures need an image and its credit; current affairs need dates and go out of date', () => {
        assert.match(errs({ ...base, image: 'https://x/y.png' }, 2), /credit/);
        assert.match(errs(base, 2), /image/);
        const now = Date.parse('2026-10-24');
        const ca = { ...base, eventDate: '2026-09-01', verifiedOn: '2026-09-05' };
        assert.equal(errs(ca, 3, { now }), '');
        assert.ok(importer.validate(ca, 3, { now }).review.length, 'always reviewed by a person');
        assert.match(errs({ ...ca, verifiedOn: undefined }, 3, { now }), /verification/);
        assert.match(errs({ ...ca, verifiedOn: '2026-08-01' }, 3, { now }), /before the event/);
        assert.equal(importer.validate({ ...ca, eventDate: '2024-01-01', verifiedOn: '2024-01-02' }, 3, { now }).outdated, true);
    });
    test('the options are mixed, the answer kept', () => {
        const spots = new Set(R1.questions.map((q) => { const a = importer.arrange(q); assert.equal(a.options[a.answer], q.answer); return a.answer; }));
        assert.equal(spots.size, 4, 'the answer is not always in the same place');
        assert.deepEqual(importer.arrange(R1.questions[0]), importer.arrange(R1.questions[0]), 'the same order every time');
    });
});

describe('an import into the bank', () => {
    const STAMP = `t${Date.now()}`;
    const q = (n, extra = {}) => ({ key: `${STAMP}-q${n}`, category: 'Test', difficulty: 'easy', prompt: `Test question ${n} of ${STAMP}?`, options: ['A one', 'B two', 'C three', 'D four'], answer: 'A one', explanation: 'Because.', sourceUrl: `https://example.org/${n}`, ...extra });
    // The network, faked: example.org/bad does not answer; pictures under /broken are not images;
    // Wikipedia knows two articles, one with a free picture and one with a non-free logo.
    const wiki = (url) => {
        const u = decodeURIComponent(url);
        if (u.includes('prop=pageimages')) return { query: { pages: [u.includes('Free_Thing') ? { pageimage: 'Free_thing.jpg' } : u.includes('Brand') ? { pageimage: 'Brand_logo.svg' } : { missing: true }] } };
        const free = u.includes('Free_thing');
        return { query: { pages: [{ imageinfo: [{ url: `https://upload.example.org/${free ? 'free' : 'brand'}.png`, thumburl: `https://upload.example.org/${free ? 'free' : 'brand'}-800.png`, extmetadata: free ? { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: '<a>Someone</a>' } } : { LicenseShortName: { value: 'Logo' }, NonFree: { value: 'true' } } }] }] } };
    };
    const fakeFetch = async (url) => (url.startsWith('https://en.wikipedia.org/w/api.php') ? { ok: true, status: 200, json: async () => wiki(url), headers: { get: () => 'application/json' } } : {
        ok: !url.includes('/bad'), status: url.includes('/bad') ? 404 : 200,
        headers: { get: () => (url.includes('/broken') ? 'text/html' : url.endsWith('.png') ? 'image/png' : 'text/html') }, body: null
    });

    test('a picture from Wikipedia: the article\'s own, freely licensed, credited, and reviewed; a non-free logo refused', async () => {
        const files = [{ id: 'round2', round: 2, questions: [
            q(20, { wikipediaImage: 'Free_Thing', prompt: `Picture question 20 of ${STAMP}?` }),
            q(21, { wikipediaImage: 'Brand', prompt: `Picture question 21 of ${STAMP}?` }),
            q(22, { wikipediaImage: 'No_Such_Article', prompt: `Picture question 22 of ${STAMP}?` })
        ] }];
        const job = await importer.finished(importer.startImport({ files, fetchImpl: fakeFetch }));
        assert.equal(job.counts.imported, 1);
        assert.equal(job.counts.invalid, 2);
        assert.match(job.problems.find((p) => p.key === `${STAMP}-q21`).reason, /not freely licensed/);
        assert.match(job.problems.find((p) => p.key === `${STAMP}-q22`).reason, /no Wikipedia article/);
        const saved = await ArenaQuestion.findOne({ importKey: `${STAMP}-q20` }).lean();
        assert.equal(saved.imageUrl, 'https://upload.example.org/free-800.png', 'the address Wikimedia gave');
        assert.match(saved.imageCredit, /CC BY-SA 4.0 · Someone · Wikimedia Commons, File:Free_thing.jpg/);
        assert.equal(saved.needsReview, true, 'a person confirms the picture shows the answer');
    });
    before(connect);
    after(async () => { await ArenaQuestion.deleteMany({ $or: [{ importKey: { $regex: `^${STAMP}` } }, { prompt: { $regex: STAMP } }] }); await mongoose.disconnect(); });

    test('imported as drafts; duplicates, invalid, outdated and review-required counted', async () => {
        await ArenaQuestion.create({ round: 1, prompt: `Test question 9 of ${STAMP}?`, options: ['A one', 'B two', 'C three', 'D four'], answer: 1, status: 'approved' });
        const files = [
            { id: 'round1', round: 1, questions: [q(1), q(2, { sourceUrl: 'https://example.org/bad' }), q(3, { answer: 'Z' }), { ...q(4), key: `${STAMP}-q1` }, q(5, { prompt: `Test question 1 of ${STAMP}?`, key: `${STAMP}-q5` }), q(9)] },
            { id: 'round2', round: 2, questions: [q(6, { image: 'https://flagcdn.com/w640/in.png', imageCredit: 'test' }), q(7, { image: 'https://example.org/broken.png', imageCredit: 'test' })] },
            { id: 'round3', round: 3, maxAgeDays: 365, questions: [q(8, { eventDate: '2020-01-01', verifiedOn: '2020-01-02' })] }
        ];
        const job = await importer.finished(importer.startImport({ files, fetchImpl: fakeFetch }));
        assert.equal(job.status, 'done', job.error);
        assert.equal(job.total, 9);
        assert.equal(job.done, 9);
        // q1, q2 (source down: review), q6 in; q9 is in the bank with a different answer: in, for review.
        assert.deepEqual(job.counts, { imported: 4, needsReview: 2, duplicate: 2, invalid: 2, outdated: 1 });
        const kinds = Object.fromEntries(job.problems.map((p) => [p.key, p.kind]));
        assert.equal(kinds[`${STAMP}-q3`], 'invalid');
        assert.equal(kinds[`${STAMP}-q7`], 'invalid', 'a picture that is not an image');
        assert.equal(kinds[`${STAMP}-q8`], 'outdated');
        assert.match(job.problems.find((p) => p.key === `${STAMP}-q9`).reason, /different answer/);
        const saved = await ArenaQuestion.find({ importKey: { $regex: `^${STAMP}` } }).lean();
        assert.ok(saved.every((x) => x.status === 'draft'), 'nothing approved by importing');
        assert.equal(saved.find((x) => x.importKey === `${STAMP}-q2`).needsReview, true);
        assert.equal(saved.find((x) => x.importKey === `${STAMP}-q6`).imageUrl, 'https://flagcdn.com/w640/in.png');

        const again = await importer.finished(importer.startImport({ files: [files[0]], fetchImpl: fakeFetch }));
        assert.equal(again.counts.imported, 0, 'importing again adds nothing');
        assert.equal(again.counts.duplicate, 5);
    });
});
