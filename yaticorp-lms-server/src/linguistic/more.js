/**
 * Six lessons a unit (2026-11-14, the user: "in each unit keep 6 lessons … add more lessons if there are fewer — a new
 * lesson can't be the same as the lessons before, don't copy from them"): a unit with fewer gets new lessons with new
 * content (content/more.js), in the courses open to learn — English, Kannada, Hindi:
 *
 *   words    "More words: …"   four words none of the unit's lessons has (vocabulary)
 *   phrases  "Phrases: …"      sentences none of its lessons has, some to read and some to write (translation)
 *   story    "Story: …"        a short story in the language learnt, with questions (reading; Section 2's Stories)
 *   listen   "Conversation: …" a conversation, questions on it, and one to speak (speaking; Section 2's Listening)
 *   write    "Writing: …"      an email or paragraph and a sentence, checked here (Section 2's Writing)
 *
 * Section 1: a Kannada or Hindi unit had four (Words, sentences, Listening, review) and gets "More words" and
 * "Phrases" — the Family unit, with five, only "More words"; an English unit with five, "More words". Section 2 (its
 * skills in units of six, units.js): each skill's last unit filled to six, after every topic (orders 5 and 6), so the
 * units before it keep their lessons.
 *
 * Kept like a review: a stub per course and lesson (seedKey "kn:more-words-beginner-1~2"), made whole when served,
 * with `review: 'more'` (and `more`, its kind) so that none of the unit's other lessons' sentences or pictures are added
 * to it (service.js withBlanks… skip a review). On the path it is a lesson, a story, a conversation or a writing task
 * (units.js typeOf). A meaning or question in a language not written here (only English, Kannada and Hindi are) is in
 * English; "Phrases" for one learning English is left out for a language it has no sentences in (`usable`).
 */
/*
 * And the sections added on 2026-11-14 (the user: "add more sections, six units in each, six lessons in each … don't
 * repeat"; chose Words 1, Words 2, Sentences 1, Sentences 2, Story, Conversation): content/sections/*.js — each file
 * { level, units: { "<order>:<part>": { name, lessons: [six] } } | Intermediate's More words and Phrases, glosses }.
 */
const SECTIONS = (() => {
    const fs = require('fs'), path = require('path');
    const dir = path.join(__dirname, 'content', 'sections');
    return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort().map((f) => require(path.join(dir, f))) : [];
})();
const DATA = (() => {
    const base = require('./content/more');
    const out = Object.fromEntries(Object.entries(base).map(([level, units]) => [level, { ...units }]));
    for (const s of SECTIONS) out[s.level] = { ...(out[s.level] || {}), ...s.units };
    return out;
})();
/*
 * Sections 1 and 3's More words, More sentences and level review story, seen as section lessons (2026-11-18, the user:
 * "six lessons in one unit" — chose: all 18 other courses): the same words, sentences and story, laid over by each
 * language's file (content/sections/langs/base/<code>.js) as the new sections are. Slots "beginner|1:1|0|w0"…
 */
const BASE = ['beginner', 'intermediate'].map((level) => ({
    level,
    units: Object.fromEntries(Object.entries(DATA[level] || {}).filter(([, u]) => !Array.isArray(u.lessons)).map(([key, u]) => [key, { lessons: [
        ...(Array.isArray(u.words) ? [{ kind: 'words', list: u.words }] : []),
        ...(Array.isArray(u.phrases) ? [{ kind: 'phrases', list: u.phrases }] : []),
        ...(u.story ? [{ kind: 'story', title: u.story.title, text: u.story.text, questions: u.story.questions }] : [])
    ] }]).filter(([, u]) => u.lessons.length))
}));
/** The sections and Sections 1 and 3's new lessons: what a language's file is laid over. */
const ALL = [...SECTIONS, ...BASE];
/*
 * Every language's text for the sections (2026-11-17, the user: "add more sections to all languages"; chose all 17 more):
 * content/sections/langs/<code>.js = { code, items: { slot id: text }, say: { slot id: sound in English letters },
 * glosses: { sentence: word-by-word English } }, laid over the sections when loaded. A slot is named by its place:
 * "<level>|<unit>|<lesson index>|w0" (a word), "p0" (a sentence), "title", "text", "scenario", "l0" (a line), "q0", "q0o1".
 */
const slotsOf = (level, key, li, l) => {
    const base = `${level}|${key}|${li}`;
    const out = [];
    if (l.kind === 'words') (l.list || []).forEach((w, i) => out.push([`${base}|w${i}`, w, 'word']));
    if (l.kind === 'phrases') (l.list || []).forEach((x, i) => out.push([`${base}|p${i}`, x, 'phrase']));
    if (l.kind === 'story' || l.kind === 'listen') {
        if (l.title && typeof l.title === 'object') out.push([`${base}|title`, l.title, 'title']);
        if (l.text) out.push([`${base}|text`, l.text, 'story text']);
        if (l.scenario) out.push([`${base}|scenario`, l.scenario, 'scenario']);
        (l.lines || []).forEach((x, i) => out.push([`${base}|l${i}`, x, `line (${x.speaker})`]));
        (l.questions || []).forEach((q, qi) => {
            out.push([`${base}|q${qi}`, q.q, 'question']);
            (q.options || []).forEach((o, oi) => out.push([`${base}|q${qi}o${oi}`, o, oi === 0 ? 'option (the right one)' : 'option']));
        });
    }
    return out;
};
const PACKS = (() => {
    const fs = require('fs'), path = require('path');
    const dir = path.join(__dirname, 'content', 'sections', 'langs');
    const load = (d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.js')).sort().map((f) => require(path.join(d, f))) : []);
    // A language's file for the new sections, and (base/) for Sections 1 and 3's new lessons: one pack.
    const by = new Map();
    for (const p of [...load(dir), ...load(path.join(dir, 'base'))]) {
        const have = by.get(p.code) || { code: p.code, items: {}, say: {}, glosses: {}, tiles: {} };
        Object.assign(have.items, p.items || {}); Object.assign(have.say, p.say || {}); Object.assign(have.glosses, p.glosses || {}); Object.assign(have.tiles, p.tiles || {});
        by.set(p.code, have);
    }
    return [...by.values()].sort((a, b) => a.code.localeCompare(b.code));
})();
/** The languages each section is written in whole, besides English, Kannada and Hindi: { level: Set(code) }. */
const LANGS_AT = (() => {
    const out = {};
    for (const sec of ALL) {
        const slots = Object.entries(sec.units || {}).flatMap(([key, u]) => (u.lessons || []).flatMap((l, li) => slotsOf(sec.level, key, li, l)));
        if (!slots.length) continue;
        for (const pack of PACKS) {
            const text = pack.items || {};
            if (!slots.every(([id]) => typeof text[id] === 'string' && text[id].trim())) continue;
            for (const [id, obj] of slots) {
                obj[pack.code] = String(text[id]).normalize('NFC');
                if (pack.say?.[id]) obj.say = { ...(obj.say || {}), [pack.code]: String(pack.say[id]).normalize('NFC') };
                // Chinese and Japanese, written without spaces: the tiles a sentence is built from, one per word of its sound.
                if (Array.isArray(pack.tiles?.[id])) obj.tiles = { ...(obj.tiles || {}), [pack.code]: pack.tiles[id].map((x) => String(x).normalize('NFC')) };
            }
            (out[sec.level] = out[sec.level] || new Set()).add(pack.code);
        }
    }
    return out;
})();
// Sections 1 and 3's units: the languages their new lessons are written in, for `kindsOf`.
for (const level of ['beginner', 'intermediate']) for (const u of Object.values(DATA[level] || {})) if (!Array.isArray(u.lessons)) u.packs = [...(LANGS_AT[level] || [])];
/** Whether `level`'s new section is written in `code` (English, Kannada, Hindi always where it exists). */
const writtenIn = (level, code) => ['en', 'kn', 'hi'].includes(code) || !!LANGS_AT[level]?.has(code);
/** The sections' glosses, by language (content/sounds/hints adds them to its own). */
const glossesOf = (code) => Object.assign({}, ...SECTIONS.map((s) => s.glosses?.[code] || {}), ...PACKS.filter((x) => x.code === code).map((x) => x.glosses || {}));
/** A sentence's sound in English letters, for Chinese and Japanese (written without spaces): its words for the hints. */
const saysOf = (code) => Object.fromEntries(ALL.flatMap((sec) => Object.values(sec.units || {}).flatMap((u) => (u.lessons || []).filter((l) => l.kind === 'phrases')
    .flatMap((l) => (l.list || []).filter((x) => x[code] && x.say?.[code]).map((x) => [x[code], x.say[code]])))));
/** The sections' words in `code` with their English, [[en, word]]: the English sentences' hints know them (2026-11-17). */
const sectionWordsOf = (code) => ALL.flatMap((sec) => Object.values(sec.units || {}).flatMap((u) => (u.lessons || []).filter((l) => l.kind === 'words')
    .flatMap((l) => (l.list || []).filter((w) => w.en && w[code]).map((w) => [w.en, w[code]]))));
/** The sections' words in `code` with their sound in English letters: [[word, say]]. */
const sectionWordSaysOf = (code) => ALL.flatMap((sec) => Object.values(sec.units || {}).flatMap((u) => (u.lessons || []).filter((l) => l.kind === 'words')
    .flatMap((l) => (l.list || []).filter((w) => w[code] && w.say?.[code]).map((w) => [w[code], w.say[code]]))));
/** Chinese and Japanese sentences with their tiles: [{ text, say, tiles, gloss }] (content/sounds: each tile's sound and meaning). */
const sectionTilesOf = (code) => ALL.flatMap((sec) => Object.values(sec.units || {}).flatMap((u) => (u.lessons || []).filter((l) => l.kind === 'phrases')
    .flatMap((l) => (l.list || []).filter((x) => x[code] && x.say?.[code] && x.tiles?.[code]).map((x) => ({ text: x[code], say: x.say[code], tiles: x.tiles[code], gloss: (glossesOf(code) || {})[x[code]] || '' })))));
/** The languages with a file of their own (content/sections/langs). */
const packCodes = () => PACKS.map((x) => x.code);
const courses = require('./courses');
const parts = require('./parts');
const { infoOf } = require('./languages');
const NOTES = require('./content/asks/notes');
const { shuffle, seeded } = require('./vocabQuiz');

const OPEN = ['en', 'kn', 'hi'];
const nfc = (x) => (typeof x === 'string' ? x.normalize('NFC') : x);
const KINDS = ['words', 'phrases', 'story', 'listen', 'write'];
// A new section's lessons (2026-11-14), named by what they hold.
const NAMED = { words: 'Words', phrases: 'Sentences', story: 'Story', listen: 'Conversation', write: 'Writing' };
const MODULE = { words: 'vocabulary', phrases: 'translation', story: 'reading', listen: 'speaking', write: 'reading' };
const LABEL = { words: 'More words', phrases: 'Phrases', story: 'Story', listen: 'Conversation', write: 'Writing' };
const SUMMARY = {
    words: 'Four new words on this topic, with their meanings.', phrases: 'New sentences on this topic, to read and to write.',
    story: 'A short new story to read, with questions on it.', listen: 'A new conversation to listen to, questions on it, and your turn to speak.',
    write: 'A new email or paragraph to write, checked here.'
};

/** A unit's new lessons, each kind as { for: [courses], list | its content } (Section 1's words and phrases are lists). */
// (And every course whose language they are written in, `u.packs`, 2026-11-18.)
const kindsOf = (u) => ({
    words: Array.isArray(u.words) ? { for: [...(u.en ? OPEN : ['kn', 'hi']), ...(u.packs || [])], list: u.words } : u.words || null,
    phrases: u.phrases === false ? null : Array.isArray(u.phrases) ? { for: ['kn', 'hi', ...(u.packs || [])], list: u.phrases } : u.phrases || null,
    // A story without its courses named is for all three (Intermediate's, 2026-11-14); a conversation or writing, English.
    story: u.story ? { ...u.story, for: [...(u.story.for || OPEN), ...(u.packs || [])] } : null, listen: u.listen ? { for: ['en'], ...u.listen } : null, write: u.write ? { for: ['en'], ...u.write } : null
});
// The level review's own (key "review"): order 100, after every topic, in the Level review unit (units.js).
const REVIEW_ORDER = 100;
const unitsAt = (level) => Object.entries(DATA[level] || {}).map(([key, u]) => { const [order, part] = key === 'review' ? [REVIEW_ORDER, 1] : key.split(':').map(Number); return { ...u, order, part }; });
const unitOf = (stub) => (Number(stub.order) >= REVIEW_ORDER ? DATA[stub.level]?.review : DATA[stub.level]?.[`${Number(stub.order) || 1}:${Number(stub.part) || 1}`]) || null;
/** A level review's new lesson (the Level review unit's sixth). */
const inLevelReview = (doc) => doc?.review === 'more' && Number(doc.order) >= REVIEW_ORDER;
const textIn = (x, code) => nfc(typeof x === 'string' ? x : x?.[code] || x?.en || '');
/** A new lesson's kind, from its seedKey ("kn:more-story-advanced-5"): the lesson model keeps no field for it. */
const moreKind = (doc) => (doc?.review === 'more' ? doc.more || (/(?:^|:)more-([a-z]+)-/.exec(doc.seedKey || '') || [])[1] || null : null);
/** Which of a unit's lessons of its kind it is: "…-elementary-3-2" is the second. */
const moreNumber = (doc) => Number((/(?:^|:)more-[a-z]+-[a-z]+-\d+(?:~\d+)?-(\d+)$/.exec(doc?.seedKey || '') || [])[1]) || 1;
/** A new section's unit lesson (its `lessons` list): its spec, and its place in the unit. */
const sectionLesson = (doc) => {
    const u = unitOf(doc);
    if (!Array.isArray(u?.lessons)) return null;
    const kind = moreKind(doc), n = moreNumber(doc);
    const at = u.lessons.map((l, i) => ({ l, i })).filter(({ l }) => l.kind === kind)[n - 1];
    return at ? { spec: at.l, index: at.i } : null;
};
/** A unit's name from the new content: a new section's unit ("At home"). */
const unitName = (level, order, part) => DATA[level]?.[`${Number(order) || 1}:${Number(part) || 1}`]?.name || null;
/** Where a new lesson sits in its unit: a new section's in its list's order; another after the lesson of its kind. */
const rankOf = (l, MODULE_ORDER) => { const s = sectionLesson(l); return s ? s.index / 10 : MODULE_ORDER.indexOf(l.module) + 0.5; };

/** Every course's new lessons, as stubs. */
const stubs = () => courses.courseCodes().filter((c) => OPEN.includes(c) || packCodes().includes(c)).flatMap((code) => Object.keys(DATA).flatMap((level) => unitsAt(level).flatMap((u) => {
    const prefix = code === 'en' ? '' : `${code}:`;
    const name = parts.unitName(level, u.order, u.part) || u.name || `Unit ${u.order}`;
    const key = u.order >= REVIEW_ORDER ? `${level}-review` : `${level}-${u.order}${parts.keyOf(u.part)}`;
    // A new section's unit: its six lessons, in every open course (2026-11-14) — and every course whose language it is
    // written in (2026-11-17).
    if (Array.isArray(u.lessons)) {
        if (!writtenIn(level, code)) return [];
        const seen = {};
        return u.lessons.map((l) => {
            const n = (seen[l.kind] = (seen[l.kind] || 0) + 1);
            return {
                seedKey: `${prefix}more-${l.kind}-${key}${n > 1 ? `-${n}` : ''}`, course: code === 'en' ? null : code, level, order: u.order, part: u.part, review: 'more', more: l.kind,
                module: MODULE[l.kind], direction: l.kind === 'phrases' ? 'kn-en' : null, status: 'published', updatedBy: 'Course content', learn: {},
                title: `${NAMED[l.kind]}: ${textIn(l.title, 'en')}`, summary: SUMMARY[l.kind]
            };
        });
    }
    const k = kindsOf(u);
    return KINDS.filter((kind) => k[kind] && k[kind].for.includes(code)).map((kind) => ({
        seedKey: `${prefix}more-${kind}-${key}`, course: code === 'en' ? null : code, level, order: u.order, part: u.part, review: 'more', more: kind,
        module: MODULE[kind], direction: kind === 'phrases' ? 'kn-en' : null, status: 'published', updatedBy: 'Course content', learn: {},
        title: `${LABEL[kind]}: ${['story', 'listen', 'write'].includes(kind) ? textIn(k[kind].title, 'en') : name}`, summary: SUMMARY[kind]
    }));
})));

/** Whether a student whose own language is `helper` gets this lesson: "Phrases" in English needs sentences in theirs. */
// (A section written in their language too, since 2026-11-17.)
// And only one with something in it (2026-11-19, the user: "why it is coming like this, I didn't even try the lesson"): a
// course's "More words" whose words were never written in its language (Spanish, Tamil…) had no cards and no quiz — its
// intro, then 0%. Such a lesson is left off the path.
const filled = new Map();
const hasContent = (doc, helper) => {
    const key = `${doc.seedKey || doc._id}|${helper}`;
    if (!filled.has(key)) {
        let out = null;
        try { out = build(doc, helper); } catch { /* not buildable: empty */ }
        filled.set(key, !!out && ['words', 'quiz', 'items', 'writing'].some((f) => (out[f] || []).length));
    }
    return filled.get(key);
};
const usable = (doc, helper) => !(moreKind(doc) === 'phrases' && !doc.course && !['kn', 'hi'].includes(helper) && !(sectionLesson(doc) && LANGS_AT[doc.level]?.has(helper)))
    && (doc?.review !== 'more' || hasContent(doc, helper));

/** Questions on a story or conversation: asked in the student's language, the choices in the one learnt, mixed. */
const questionsOf = (list, X, Y, seed) => (list || []).map((q, i) => {
    const options = q.options.map((o) => textIn(o, X.code));
    return { id: `q${i + 1}`, type: 'mcq', prompt: textIn(q.q, Y.code), options: shuffle(options, seeded(`${seed}:q${i + 1}`)), answer: options[q.answer || 0], explanation: '' };
});

/** The stub made whole, for a student whose own language is `helper`. */
const build = (stub, helper) => {
    const code = stub.course || 'en';
    const X = courses.courseInfo(code);
    const Y = helper === 'en' ? courses.ENGLISH : infoOf(helper);
    const kind = moreKind(stub);
    const k = sectionLesson(stub)?.spec || kindsOf(unitOf(stub) || {})[kind] || {};
    const out = { ...stub, more: kind, language: Y.code, languageName: Y.name, ...(stub.course ? { target: X.code, targetName: X.name, targetLocale: X.locale } : {}) };
    if (kind === 'words') {
        out.words = (k.list || []).map((w) => {
            // Its meaning in the student's language; one learning English in English gets it explained in English.
            const meaning = code === 'en' ? (Y.code === 'en' ? w.def : w[Y.code] || w.def) : w[Y.code] || w.en;
            return { word: nfc(w[X.code]), kannada: nfc(meaning), pos: '', example: '', synonyms: [], antonyms: [], audio: null, lang: Y.name, target: X.name, locale: X.locale || 'en-IN', course: !!stub.course, en: w.en, pic: w.pic,
                ...(stub.course && w.say?.[X.code] ? { say: w.say[X.code] } : {}) };
        }).filter((w) => w.word && w.kannada);
        out.learn = { intro: NOTES[Y.code]?.vocab || `New ${X.name} words on this topic, with their meanings. Tap a card to see the meaning, and the speaker to hear the word.` };
        return out;
    }
    if (kind === 'phrases') {
        // Read in the language learnt (answered in the student's), or written in it — the first two to practise.
        // A course's sentences only where they are written in its language (2026-11-19, the user's Spanish "Write this in
        // Spanish: This is my son." with English tiles): an English one is not a Spanish course's, on either side.
        const items = (k.list || []).filter((p) => code === 'en' || p[X.code]).map((p, i) => {
            const from = p.read ? X.code : Y.code, to = p.read ? Y.code : X.code;
            const has = (c) => !!p[c];
            return {
                id: `p${i + 1}`, kind: 'sentence', open: false, source: nfc(p[has(from) ? from : 'en']), model: nfc(p[has(to) ? to : 'en']),
                accepted: (p.acc?.[has(to) ? to : 'en'] || []).map(nfc), ...(p.read ? { direction: 'en-kn' } : {}), explanation: '', en: p.en,
                ...(has(to) && p.tiles?.[to]?.length ? { tiles: p.tiles[to].map(nfc) } : {})
            };
        });
        out.items = items.slice(0, 2);
        out.quiz = items.slice(2);
        const N = NOTES[Y.code];
        out.learn = N ? { intro: N.write, points: [N.tiles, N.close] }
            : { intro: `New sentences on this topic: read some in ${X.name}, write others in it.`, points: ['Tap the word tiles in order, or type.', 'A close answer counts: you will see the model and the small differences.'] };
        return out;
    }
    // A story or conversation not written in a course's language is not that course's (2026-11-19): left empty, off the path.
    const written = (x) => code === 'en' || (typeof x === 'object' && !!x?.[X.code]);
    if (kind === 'story' && !written(k.text)) return out;
    if (kind === 'listen' && code !== 'en' && !(k.lines || []).some((line) => !Array.isArray(line) && written(line))) return out;
    if (kind === 'story') {
        out.learn = { intro: `Read the story in ${X.name}, then answer the questions.`, passage: { title: textIn(k.title, X.code), text: textIn(k.text, X.code) } };
        out.quiz = questionsOf(k.questions, X, Y, stub.seedKey);
        out.writing = [];
        return out;
    }
    if (kind === 'listen') {
        // Its lines in the language learnt (a new section's, 2026-11-14: in English, Kannada and Hindi), heard in its voice.
        // With its meaning in the student's language, where it is written (2026-11-18: the notes keep each line with it).
        const lines = (k.lines || []).map((line) => (Array.isArray(line) ? { speaker: line[0], text: line[1] }
            : { speaker: line.speaker, text: textIn(line, X.code), ...(Y.code !== X.code && line[Y.code] ? { meaning: textIn(line, Y.code) } : {}) }));
        // Its turn to speak (2026-11-17, Sections 6–10): in the English course, whose speech the browser writes down in English.
        const speaks = !!k.speaking && code === 'en';
        out.learn = { intro: speaks ? 'Listen to the conversation, then answer the questions — and then it is your turn to speak.' : 'Listen to the conversation, then answer the questions.',
            dialogue: { scenario: textIn(k.scenario, Y.code), speakers: k.speakers, lines, locale: X.locale || 'en-IN' } };
        out.quiz = questionsOf(k.questions, X, Y, stub.seedKey);
        if (speaks) out.speaking = { ...k.speaking };
        return out;
    }
    if (kind === 'write') {
        out.learn = { intro: k.intro || 'Write each one; it is checked here, sentence by sentence.' };
        out.writing = (k.tasks || []).map((t) => ({ mustInclude: [], ...t }));
        out.quiz = [];
        return out;
    }
    return out;
};

/**
 * A unit's words and sentences (2026-11-16, for quizzes of ten at least): all its lessons' — words with their meanings in
 * the student's language, sentences in the language learnt (with the student's where written) — only those written in
 * the language learnt (a story only in English is not a Kannada course's).
 */
const unitMaterial = (stub, helper) => {
    const u = unitOf(stub);
    if (!u) return null;
    const code = stub.course || 'en';
    const X = courses.courseInfo(code);
    const Y = helper === 'en' ? courses.ENGLISH : infoOf(helper);
    const own = (x) => (typeof x === 'string' ? (X.code === 'en' ? nfc(x) : '') : nfc(x?.[X.code] || ''));
    // (Whether each is written in the language learnt is told by its text, below — not by `for`, the students it is for.)
    const specs = Array.isArray(u.lessons) ? u.lessons.map((l) => [l.kind, l]) : Object.entries(kindsOf(u)).filter(([, v]) => v);
    const words = [], sentences = [];
    const lines = (t) => String(t || '').split(/(?<=[.!?।]["”’']?)\s+/).map((x) => x.trim()).filter(Boolean);
    for (const [kind, k] of specs) {
        if (kind === 'words') {
            for (const w of k.list || []) {
                const meaning = code === 'en' ? (Y.code === 'en' ? w.def : w[Y.code] || w.def) : w[Y.code] || w.en;
                if (w[X.code] && meaning) words.push({ word: nfc(w[X.code]), kannada: nfc(meaning), pos: '', example: '', synonyms: [], antonyms: [], audio: null, lang: Y.name, target: X.name, locale: X.locale || 'en-IN', course: !!stub.course, en: w.en, pic: w.pic });
            }
        }
        if (kind === 'phrases') (k.list || []).forEach((p, i) => { if (p[X.code]) sentences.push({ id: `u${sentences.length + 1}`, learnt: nfc(p[X.code]), helper: nfc(p[Y.code] || '') }); });
        if (kind === 'story') lines(own(k.text)).forEach((t) => sentences.push({ id: `u${sentences.length + 1}`, learnt: t, helper: '' }));
        if (kind === 'listen') (k.lines || []).forEach((line) => lines(Array.isArray(line) ? (X.code === 'en' ? line[1] : '') : own(line)).forEach((t) => sentences.push({ id: `u${sentences.length + 1}`, learnt: t, helper: '' })));
    }
    return { words, sentences };
};

module.exports = { stubs, build, unitOf, usable, moreKind, inLevelReview, unitName, rankOf, glossesOf, saysOf, sectionWordsOf, sectionWordSaysOf, sectionTilesOf, packCodes, slotsOf, writtenIn, KINDS, unitMaterial };
