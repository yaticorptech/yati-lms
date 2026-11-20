/**
 * Which of these is “ಹಾವು”? (2026-11-12, the user's Duolingo picture, "add questions like this for all languages"):
 * the meaning of a word of the lesson's unit, in the student's language, asked; three picture cards, each a word in
 * the language learnt — the right one and two others that have pictures (content/pictures.js) — one to choose.
 * Every translation and Words lesson whose unit has a word with a picture, in every course and language.
 *
 * A question: { id: 'pic~<english>', type: 'picture', prompt, ask: the meaning asked, options: the three words,
 * pics: { word: picture }, answer / model: the right word, sayLang: the voice the words are read in, explanation }.
 */
const { pictureOf } = require('./content/pictures');
const { seeded, shuffle } = require('./vocabQuiz');

// "घर, मकान", "母、お母さん": the first is shown and asked.
const firstOf = (s) => String(s || '').split(/\s*[,;/、，،]\s*/).filter(Boolean)[0] || '';
const squash = (s) => String(s || '').normalize('NFC').trim().toLowerCase();

/*
 * Pictures too alike to be told apart side by side (a family and a mother; a book and reading): never offered
 * together, so only one card can be the word.
 */
const ALIKE = [['family', 'mother', 'father'], ['book', 'read', 'write'], ['teacher', 'student', 'friend'],
    ['morning', 'evening', 'sun'], ['hot', 'cold', 'fever', 'medicine'], ['bus', 'train', 'ticket', 'road'], ['happy', 'anxious']];
const alike = (a, b) => a === b || ALIKE.some((g) => g.includes(a) && g.includes(b));

const englishOf = (w) => squash(w.course ? w.en : w.word);
// A word's picture: the list's, else its own (a unit's new words carry theirs, 2026-11-17: "hand", "teeth" are not in the list).
const picOf = (w) => pictureOf(englishOf(w)) || w.pic || null;

/** Every word with a picture in the course as the student has it — { word, en, pic, level } — made once. */
const picturedCache = new Map();
const picturedOf = (course, helper) => {
    const key = `${course || 'en'}|${helper || ''}`;
    if (picturedCache.has(key)) return picturedCache.get(key);
    const courses = require('./courses');
    const { localize } = require('./languages');
    const out = [];
    const seen = new Set();
    for (const base of require('./content').lessons.filter((l) => l.module === 'vocabulary' && !l.review)) {
        let built = null;
        try { built = course ? courses.build(courses.stubOf(course, base), helper) : localize(base, helper); } catch { built = null; }
        for (const w of built?.words || []) {
            const en = englishOf(w);
            const pic = pictureOf(en);
            const word = firstOf(w.word);
            if (!pic || !word || seen.has(en)) continue;
            seen.add(en);
            out.push({ word, en, pic, level: base.level, meaning: firstOf(w.kannada) });
        }
    }
    picturedCache.set(key, out);
    return out;
};

/**
 * The question for a lesson: `key` its seed, `words` its unit's words (units.js unitWordsOf), `module` (a translation
 * lesson asks another of the unit's words than its Words lesson), `course` / `helper`, `level`, `sayLang`. Null when
 * the unit has no word with a picture.
 */
const pictureFor = ({ key, words, module, course = null, helper, level, sayLang = 'en-IN' }) => {
    // Not a word written the same in both languages (शिक्षक in Marathi and in Hindi): the question would hold its answer.
    const mine = (words || []).filter((w) => picOf(w) && firstOf(w.word) && firstOf(w.kannada) && squash(firstOf(w.word)) !== squash(firstOf(w.kannada)));
    if (!mine.length) return null;
    const turn = shuffle(mine, seeded(`${key}:picture:word`));
    const w = turn[(module === 'translation' ? 1 : 0) % turn.length];
    const en = englishOf(w);
    const right = { word: firstOf(w.word), en, pic: picOf(w) };
    const meaning = firstOf(w.kannada);
    const pool = picturedOf(course, helper).filter((x) => !alike(x.en, en) && squash(x.word) !== squash(right.word) && x.pic !== right.pic);
    // The unit's own words first, then its level's, then any; two not alike each other either.
    const unit = new Set(mine.map(englishOf));
    const rnd = seeded(`${key}:picture:others`);
    const ordered = [...shuffle(pool.filter((x) => unit.has(x.en)), rnd), ...shuffle(pool.filter((x) => !unit.has(x.en) && x.level === level), rnd),
        ...shuffle(pool.filter((x) => !unit.has(x.en) && x.level !== level), rnd)];
    const wrong = [];
    for (const x of ordered) { if (wrong.length < 2 && !wrong.some((y) => alike(y.en, x.en) || y.pic === x.pic)) wrong.push(x); }
    if (wrong.length < 2) return null;
    const cards = shuffle([right, ...wrong], seeded(`${key}:picture:cards`));
    return {
        id: `pic~${en}`, type: 'picture', prompt: `Which of these is "${meaning}"?`, ask: meaning,
        options: cards.map((c) => c.word), pics: Object.fromEntries(cards.map((c) => [c.word, c.pic])),
        answer: right.word, model: right.word, sayLang, explanation: `"${meaning}" is "${right.word}".`
    };
};

/** The card chosen is the right one. */
const pictureRight = (q, given) => squash(given) === squash(q.answer);

/*
 * Spell the word (2026-11-13, the user's picture: a dress, its letters D R E S S as tiles — "do the same in multilingo,
 * and tell me where"): a word of the unit that has a picture — the picture, its meaning in the student's language — and
 * its letters mixed up as tiles, tapped in order to spell it. A letter is what the eye takes as one (a Kannada akshara,
 * a kana), so ಮನೆ is ಮ ನೆ. In every Words lesson whose unit has such a word, every course; asked in the quiz.
 * A question: { id: 'spell~<english>', type: 'letters', prompt, ask, pic, words: the letters mixed, answer, sayLang }.
 */
// A consonant with a virama joins the one after it (ಸ್ + ತ = ಸ್ತ, as in ಪುಸ್ತಕ): one letter, not two.
const VIRAMA = /[\u094D\u09CD\u0A4D\u0ACD\u0B4D\u0BCD\u0C4D\u0CCD\u0D4D]$/;
const letters = (word) => [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(String(word).normalize('NFC'))].map((x) => x.segment)
    .reduce((out, g) => { if (out.length && VIRAMA.test(out[out.length - 1])) out[out.length - 1] += g; else out.push(g); return out; }, []);
const spellFor = ({ key, words, course = null, sayLang = 'en-IN', not = null }) => {
    const fit = (w) => {
        const word = firstOf(w.word);
        const n = letters(word).length;
        return picOf(w) && word && !/\s/.test(word) && n >= 2 && n <= 10 && firstOf(w.kannada) && squash(word) !== squash(firstOf(w.kannada));
    };
    const mine = (words || []).filter(fit);
    if (!mine.length) return null;
    // Another word than the picture cards ask, where the unit has one.
    const turn = shuffle(mine, seeded(`${key}:spell:word`));
    const w = turn.find((x) => englishOf(x) !== not) || turn[0];
    const word = firstOf(w.word), en = englishOf(w), parts = letters(word);
    // Mixed up — never already in order (a word of one letter repeated cannot be: not asked).
    let mixed = parts;
    for (let k = 0; k < 6 && mixed.join('') === parts.join(''); k++) mixed = shuffle(parts, seeded(`${key}:spell:mix:${k}`));
    if (mixed.join('') === parts.join('')) return null;
    const meaning = firstOf(w.kannada);
    return {
        id: `spell~${en}`, type: 'letters', prompt: `Spell the word for "${meaning}".`, ask: meaning, pic: picOf(w),
        words: mixed, answer: word, model: word, sayLang, explanation: `"${meaning}" is "${word}".`, ...(course ? { course } : {})
    };
};
/** The letters in the order tapped spell the word (tiles come joined by spaces). */
const spellRight = (q, given) => squash(String(given || '').replace(/\s+/g, '')) === squash(q.answer);

/*
 * Choose the picture (2026-11-13, the user's picture: "Select the correct picture for “사슴”" — a deer, an elephant, a
 * koala and a chicken, each with its name): the other way round from the picture cards — a word of the unit in the
 * language learnt, heard and read; four pictures, each with its meaning in the student's language, one to choose. In
 * every Words lesson whose unit has a word with a picture, every course; in its practice, a warm-up on the new word.
 * A question: { id: 'see~<english>', type: 'seeword', prompt, ask / say: the word, sayLang, options: the four
 * meanings, pics: { meaning: picture }, answer / model: the right meaning, explanation }.
 */
const seeFor = ({ key, words, course = null, helper, level, sayLang = 'en-IN', not = [] }) => {
    const fit = (w) => picOf(w) && firstOf(w.word) && firstOf(w.kannada) && squash(firstOf(w.word)) !== squash(firstOf(w.kannada));
    const mine = (words || []).filter(fit);
    if (!mine.length) return null;
    // Another word than the lesson's other picture questions ask, where the unit has one.
    const turn = shuffle(mine, seeded(`${key}:see:word`));
    const w = turn.find((x) => !not.includes(englishOf(x))) || turn[0];
    const en = englishOf(w);
    const right = { en, pic: picOf(w), meaning: firstOf(w.kannada) };
    const pool = picturedOf(course, helper).filter((x) => !alike(x.en, en) && x.pic !== right.pic && x.meaning && squash(x.meaning) !== squash(right.meaning));
    const unit = new Set(mine.map(englishOf));
    const rnd = seeded(`${key}:see:others`);
    const ordered = [...shuffle(pool.filter((x) => unit.has(x.en)), rnd), ...shuffle(pool.filter((x) => !unit.has(x.en) && x.level === level), rnd),
        ...shuffle(pool.filter((x) => !unit.has(x.en) && x.level !== level), rnd)];
    const wrong = [];
    for (const x of ordered) {
        if (wrong.length < 3 && !wrong.some((y) => alike(y.en, x.en) || y.pic === x.pic || squash(y.meaning) === squash(x.meaning))) wrong.push(x);
    }
    if (wrong.length < 3) return null;
    const cards = shuffle([right, ...wrong], seeded(`${key}:see:cards`));
    const word = firstOf(w.word);
    return {
        id: `see~${en}`, type: 'seeword', prompt: `Choose the picture for "${word}".`, ask: word, say: word, sayLang,
        options: cards.map((c) => c.meaning), pics: Object.fromEntries(cards.map((c) => [c.meaning, c.pic])),
        answer: right.meaning, model: right.meaning, explanation: `"${word}" is "${right.meaning}".`
    };
};
const seeRight = (q, given) => squash(given) === squash(q.answer);

module.exports = { pictureFor, pictureRight, picturedOf, ALIKE, spellFor, spellRight, letters, seeFor, seeRight };
