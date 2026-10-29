/**
 * Speak on a topic (asked 2026-10-24): in every Advanced unit, the student is
 * given a topic, speaks about it (the browser writes it down), and each
 * sentence is corrected, with the reason — by rules here, no AI
 * (talkCheck.js). The rules must put common mistakes right and leave correct
 * English alone.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { LinguisticLesson } = require('../../src/linguistic/models');
const { checkSentence, checkTalk, checkWritten } = require('../../src/linguistic/talkCheck');
const talks = require('../../src/linguistic/talks');
const { unlock, placeAt } = require('./unlock');

describe('written English (2026-10-27: random letters were passed as "no grammar mistakes")', () => {
    test('words that cannot be English are marked; the capital letter and full stop are put right', () => {
        const gibberish = checkWritten('cvbnmdfghjertyuuytresdfghoiuyt gfdsdfghj fgfgh');
        assert.deepEqual(gibberish.mistakes.filter((m) => /not an English word/.test(m.why)).map((m) => m.wrong), ['cvbnmdfghjertyuuytresdfghoiuyt', 'gfdsdfghj', 'fgfgh']);
        assert.ok(gibberish.mistakes.some((m) => /full stop/.test(m.why)));
        const plain = checkWritten('i wake up at six');
        assert.equal(plain.corrected, 'I wake up at six.');
        const lower = checkWritten('my mother cooks rice');
        assert.equal(lower.corrected, 'My mother cooks rice.');
        assert.deepEqual(lower.mistakes.map((m) => m.right), ['My', '.']);
    });
    test('real English is left alone: short words, names, acronyms, words like strengths and rhythm', () => {
        for (const t of ['My strengths are rhythm and twelfths.', 'I study at NCC in Mysuru.', 'Hmm, I like my gym!', 'Mrs. Rao teaches us HTML.', 'Is it ready?', 'He said "yes."']) {
            assert.deepEqual(checkWritten(t).mistakes, [], t);
        }
    });
    test('plurals of words ending in -e are words (2026-10-28: "trees" was cut to "tre" and marked)', () => {
        for (const t of ['We should plant more trees.', 'My knees hurt after the match.', 'She agrees with me.', 'The boxes are heavy.', 'Our homes use solar energy.']) {
            assert.deepEqual(checkWritten(t).mistakes, [], t);
        }
    });
    test('spelling and the marks at the end put right; names left alone (2026-10-27)', () => {
        const fix = (t) => checkWritten(t).corrected;
        assert.equal(fix('I take a bath and eat my breakfas'), 'I take a bath and eat my breakfast.');
        assert.equal(fix('I wake up early in the morning..'), 'I wake up early in the morning.');
        assert.equal(fix('I get ready and go to the office.,'), 'I get ready and go to the office.');
        assert.equal(fix('I like tea,.'), 'I like tea.');
        assert.equal(fix('I am ready , and my face is clean .'), 'I am ready, and my face is clean.');
        assert.equal(fix('He go to the offise.'), 'He goes to the office.');
        for (const t of ['Hari and Sneha bought a laptop online for two lakh rupees.', 'She played and stopped, making plans quickly.', 'The algorithm was elegant.', 'Wait... what?']) assert.deepEqual(checkWritten(t).mistakes, [], t);
    });
    test('speech is not held to capitals and full stops', () => {
        assert.deepEqual(checkSentence('my mother cooks rice').mistakes, []);
    });
});

describe('the corrections', () => {
    const FIXED = [
        ['He go to college every day.', 'He goes to college every day.'],
        ['She have two brothers.', 'She has two brothers.'],
        ['It make me happy.', 'It makes me happy.'],
        ['Yesterday I go to the market.', 'Yesterday I went to the market.'],
        ['Last year we are in Mysuru.', 'Last year we were in Mysuru.'],
        ['I did not went there.', 'I did not go there.'],
        ['Did you saw the movie?', 'Did you see the movie?'],
        ['He doesn\'t knows the answer.', 'He doesn\'t know the answer.'],
        ['You can goes now.', 'You can go now.'],
        ['We should to save money.', 'We should save money.'],
        ['I can able to speak English.', 'I can speak English.'],
        ['I am knowing the answer.', 'I know the answer.'],
        ['I am study in BCom.', 'I am studying in BCom.'],
        ['I want go abroad.', 'I want to go abroad.'],
        ['I am agree with you.', 'I agree with you.'],
        ['They was late.', 'They were late.'],
        ['There is many people.', 'There are many people.'],
        ['I have went there twice.', 'I have gone there twice.'],
        ['This is more better.', 'This is better.'],
        ['I need some informations.', 'I need some information.'],
        ['One of my friend is a doctor.', 'One of my friends is a doctor.'],
        ['I have a apple and an banana.', 'I have an apple and a banana.'],
        ['He is a honest man at an university.', 'He is an honest man at a university.'],
        ['I am working here since two years.', 'I am working here for two years.'],
        ['I met him today morning.', 'I met him this morning.'],
        ['I passed out from college in 2020.', 'I graduated from college in 2020.'],
        ['We discussed about the plan.', 'We discussed the plan.'],
        ['Myself Rahul.', 'I am Rahul.'],
        ['He made me to understand.', 'He made me understand.'],
        ['I enjoy to read books.', 'I enjoy reading books.'],
        ['i like it.', 'I like it.']
    ];
    for (const [said, right] of FIXED) {
        test(`"${said}" → "${right}"`, () => {
            const r = checkSentence(said);
            assert.equal(r.corrected, right);
            assert.ok(r.mistakes.length && r.mistakes.every((m) => m.wrong && m.right && m.why), 'each correction says what, to what, and why');
        });
    }

    test('correct English is left alone', () => {
        const RIGHT = ['Did he go home?', 'Let it go.', 'Does she have a car?', 'He read the book yesterday.', 'Make it to the top.', 'The will to win is strong.',
            'I am free today.', 'We are complete.', 'I feel like going out.', 'It helps me grow.', 'Plan A is better.', 'A university is a big place.', 'He has gone home.',
            'I have been there since 2020.', 'An hour later, he came back.', 'My plans make sense.', 'I did tests yesterday.', 'Why does he go there?', 'Can he come tomorrow?',
            'She will have to wait.', 'Help him go.', 'They are work colleagues.', 'I graduated in 2020 and now I work in Bengaluru.', 'He is a lead singer.',
            'One of my friend\'s books is here.', 'Where did she go yesterday?', 'I watched it grow.', 'If I were you, I would save money.', 'He reads a lot.', 'I have read it.'];
        for (const s of RIGHT) assert.deepEqual(checkSentence(s).mistakes, [], s);
    });

    test('every model answer is a clean, long-enough talk', () => {
        for (const t of talks.TOPICS) {
            const r = checkTalk(t.sample, { minWords: talks.MIN_WORDS, words: t.words }, 75);
            assert.deepEqual([r.percent, r.passed], [100, true], t.title);
            assert.ok(r.good.some((g) => /this unit's words/.test(g)), `${t.title}: uses its words`);
        }
    });

    test('a talk: the share of sentences with no mistake; too short or too many mistakes does not pass', () => {
        const short = checkTalk('I like my college. It is big.', { minWords: 70 }, 75);
        assert.deepEqual([short.short, short.passed], [true, false]);
        const many = checkTalk(`${'He go to the office every day and he work hard. '.repeat(3)}${'I like my job very much because it is interesting and useful. '.repeat(3)}`, { minWords: 20 }, 75);
        assert.deepEqual([many.total, many.clean, many.percent, many.passed], [6, 3, 50, false]);
        assert.ok(many.sentences[0].mistakes.length === 2);
    });
});

describe('in the path and as a lesson', () => {
    let app, asha, kavya, api, knApi;
    before(async () => {
        await connect();
        app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
        asha = await makeUser('Ling Talk Asha'); kavya = await makeUser('Ling Talk Kavya');
        api = app.call(asha.token); knApi = app.call(kavya.token);
        await require('../../src/linguistic/seed').ensureSeeded();
        await api('POST', '/language', { language: 'hi' });
        // At Advanced, as a student placed there before 2026-10-28, so its lessons open along the path.
        await placeAt(asha.user, 'advanced');
    });
    after(async () => { await cleanup([asha.user, kavya.user], app.server); });

    test('Advanced, practised by skill (2026-10-29): its Speaking track has the eight "Speak on a topic" talks; the other sections none', async () => {
        const p = (await api('GET', '/path')).body;
        const adv = p.levels.find((l) => l.level === 'advanced');
        const speaking = adv.units.find((u) => u.id === 'advanced-speaking');
        assert.equal(speaking.lessons.length, 8, 'four topics, two talks each (the fourth 2026-10-28)');
        assert.ok(speaking.lessons.every((x) => x.type === 'talk'));
        assert.ok(adv.units.filter((u) => u !== speaking).every((u) => !u.lessons.some((x) => x.type === 'talk')), 'only there');
        assert.ok(p.levels.filter((l) => l.level !== 'advanced').every((l) => l.units.every((u) => !u.lessons.some((x) => x.type === 'talk'))));
    });

    test('the lesson: the topic and what to cover, no sample answer before speaking; the quiz route turns it away', async () => {
        await unlock(asha.user, ['talk-advanced-1']);
        const l = await LinguisticLesson.findOne({ seedKey: 'talk-advanced-1' }).lean();
        const page = (await api('GET', `/lessons/${l._id}`)).body;
        assert.equal(page.review, 'talk');
        assert.match(page.talk.prompt, /worked in a team/);
        assert.equal(page.talk.minWords, talks.MIN_WORDS);
        assert.ok(page.talk.points.length >= 3 && page.talk.words.includes('collaborate'));
        assert.equal(page.talk.sample, undefined);
        assert.equal((await api('POST', `/lessons/${l._id}/quiz`, { answers: {} })).status, 400);
        assert.equal((await api('POST', `/lessons/${l._id}/talk`, { text: '' })).status, 400);
    });

    test('speaking with mistakes: each sentence corrected and why; not done; spoken again well: done, points, the next lesson', async () => {
        const l = await LinguisticLesson.findOne({ seedKey: 'talk-advanced-1' }).lean();
        const said = 'Last year I work in a team of four students. Myself and my friend collect the data. We discussed about the plan every week. One of my friend do the slides. We can able to finish on time. It was a good experience and I learnt a lot about teamwork and about how to collaborate with other people in an efficient way.';
        const bad = (await api('POST', `/lessons/${l._id}/talk`, { text: said })).body;
        assert.equal(bad.passed, false);
        assert.ok(bad.sentences.length === 6 && bad.clean < bad.total);
        const fixed = bad.sentences.find((s) => /discussed about/.test(s.text));
        assert.equal(fixed.corrected, 'We discussed the plan every week.');
        assert.match(fixed.mistakes[0].why, /"about" नहीं लगता/, 'why, in the student\'s language (Hindi; 2026-10-27)');
        assert.ok(bad.sample.length > 100, 'the model answer comes with the corrections');
        const talkIn = async () => (await api('GET', '/path')).body.levels.find((x) => x.level === 'advanced').units.find((u) => u.id === 'advanced-speaking').lessons.find((x) => x.id === String(l._id));
        assert.notEqual((await talkIn()).status, 'completed');

        const good = (await api('POST', `/lessons/${l._id}/talk`, { text: talks.TOPICS[0].sample })).body;
        assert.deepEqual([good.passed, good.percent, good.firstPass], [true, 100, true]);
        assert.ok(good.events.some((e) => e.kind === 'xp'), 'points for the lesson');
        assert.ok(good.next, 'the next lesson on the path');
        assert.equal((await talkIn()).status, 'completed');
    });

    test('a Kannada speaker reads the topic and the points in Kannada', async () => {
        await unlock(kavya.user, ['talk-advanced-3~2']);
        const l = await LinguisticLesson.findOne({ seedKey: 'talk-advanced-3~2' }).lean();
        const page = (await knApi('GET', `/lessons/${l._id}`)).body;
        assert.match(page.talk.prompt, /[ಀ-೿]/);
        assert.ok(page.talk.points.every((p) => /[ಀ-೿]/.test(p)));
        assert.equal(page.talk.words.join(), 'invest,profit,risk,loan', 'the words to use stay English');
    });
});
