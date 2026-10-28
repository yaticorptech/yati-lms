/**
 * Linguistic Ability — the rules: what a student may open, how a quiz counts,
 * what is saved, what is paid, and when a level and its certificate are done.
 *
 * The flow in every module: pick a module and a level, learn, practise, take
 * the quiz. A quiz at or above the level's passing score completes the lesson
 * and opens the next one; mistakes are kept for revision; retries are always
 * allowed and the best score stands.
 *
 * Levels (sections): Beginner is always open. A higher level opens only when
 * every lesson of the level below is done (2026-10-28: not by the placement
 * test or a level said, for any student); inside a section, each lesson opens
 * when the one before it is done. The student's level is Beginner, moved up
 * each time a whole level is completed.
 *
 * Points are the platform's own Reward rules (the linguistic_* activities),
 * paid once per thing through safeRecordActivity, so a retry or a replayed
 * request never pays twice.
 */
const mongoose = require('mongoose');
const { LinguisticLesson, LinguisticProgress, LinguisticAttempt, LinguisticSubmission, MODULES, LEVELS } = require('./models');
const { getConfig } = require('./config');
const { gradeQuestion, checkTranslation, normalize } = require('./check');
const { lessonQuiz, reviewQuiz, hearQuiz, unitQuiz, sentenceQuestion, questionById, questionFor, shuffle, seeded } = require('./vocabQuiz');
const { checkWriting, sentencesOf } = require('./writingCheck');
const placementQuestions = require('./content/placement');
const { dayKey, startOfDay } = require('../rewards/config/constants');
const { safeRecordActivity } = require('../rewards/services/activityService');
const { languages, infoOf, languageOf, localize, localizePlacement, skipsOf } = require('./languages');
const { courses, courseOf, courseInfo, courseCodes, build } = require('./courses');
const reviews = require('./reviews');
const talks = require('./talks');
const speakChecks = require('./speakChecks');
const { normaliseCardNumber } = require('../utils/cardNumber');
const { checkTalk, checkWritten } = require('./talkCheck');
// The feedback on English in the student's own language (2026-10-27, all 20 languages).
const { localizeFeedback } = require('./content/feedback');
const { unitsOf, pathOrder, warmupFor, typeOf } = require('./units');
const { CODES: SOUND_CODES, sayOf, tileSay, saysFor, wordHints } = require('./content/sounds');
const parts = require('./parts');
/** The lessons of the student's course: all of them, but those their language leaves out (an English speaker's translation). */
const forStudent = (lessons, progress) => { const skip = courseOf(progress) === 'en' ? skipsOf(languageOf(progress)) : []; return skip.length ? lessons.filter((l) => !skip.includes(l.module)) : lessons; };
/** Every lesson of the course the student is on, each titled as in its unit (parts.js). */
const allLessonsFor = async (progress) => forStudent(await publishedLessons(courseOf(progress)), progress).map((l) => ({ ...l, title: parts.titleOf(l) }));
/** The lessons of the student's roadmap: every one, or the main ones when their plan is short (`planOf`). */
const lessonsFor = async (progress) => { const all = await allLessonsFor(progress); return planOf(progress)?.tier === 'main' ? all.filter((l) => !isExtra(l)) : all; };
/** A second unit's English lesson (parts.js): the seeded lesson it is cut from, in the student's language, as the stub. */
const ownPart = (doc, lang) => {
    const source = parts.sourceOf(doc);
    const l = source && localize(source, lang);
    return l && { ...l, _id: doc._id, seedKey: doc.seedKey, base: doc.base, part: doc.part, title: doc.title, summary: doc.summary, status: doc.status };
};
/**
 * A lesson as the student sees it: a course lesson made whole, an English one
 * in their language — cut to its unit's share of the topic's words or
 * sentences (parts.js).
 */
const serveOwn = (doc, progress) => {
    const lang = languageOf(progress);
    const out = doc?.review === 'talk' ? talks.build(doc, lang) : doc?.review ? reviews.build(doc, lang) : doc?.course ? build(doc, lang) : doc?.part ? ownPart(doc, lang) : localize(doc, lang);
    return parts.cut(out, doc);
};
/** A lesson as the student has it, with its unit's words to warm up on (units.js) when it is not about words. */
const serve = (doc, progress) => {
    const out = serveOwn(doc, progress);
    const warmup = out && warmupFor(doc, languageOf(progress));
    return warmup ? { ...out, warmup } : out;
};
/** Levels and certificates belong to a course (one from before courses is English's). */
const inCourse = (x, course) => (x.course || 'en') === course;
/** Where the student starts in their course: the placement test's level (English), or the level chosen. */
const placedLevel = (progress) => (courseOf(progress) === 'en' ? progress.placement?.level : progress.courseStart?.[courseOf(progress)]) || null;
/** Where every student's lessons begin (2026-10-28): Section 1 — a placement says where they stand, not where they start. */
const START = 'beginner';

const MODULE_LABEL = { vocabulary: 'Vocabulary Builder', grammar: 'Grammar Practice', reading: 'Reading and Writing', speaking: 'Speaking and Listening', translation: 'Translation Practice' };
const LEVEL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const lvl = (l) => LEVELS.indexOf(l);
const idOf = (x) => String(x?._id ?? x);

/* ── Loading ──────────────────────────────────────────────────────────── */

/** A course's published lessons: English (course null) unless another is named. */
const publishedLessons = (course = null) => LinguisticLesson.find({ status: 'published', deletedAt: null, course: course && course !== 'en' ? course : null }).sort({ module: 1, level: 1, order: 1, createdAt: 1 }).lean();

/** The student's progress record, made on first use. */
const progressOf = async (userId) => LinguisticProgress.findOneAndUpdate({ userId }, { $setOnInsert: { userId } }, { upsert: true, returnDocument: 'after' });

const lessonEntry = (progress, lessonId) => progress.lessons.find((l) => idOf(l.lessonId) === idOf(lessonId));
const isDone = (progress, lessonId) => lessonEntry(progress, lessonId)?.status === 'completed';
/** A level the student has finished in their course. */
const levelDone = (progress, level) => progress.levelsCompleted.some((x) => x.level === level && inCourse(x, courseOf(progress)));
/** A course finished: all its sections (2026-10-28: only then can the student choose their next language). */
const courseDone = (progress, course = courseOf(progress)) => LEVELS.every((l) => progress.levelsCompleted.some((x) => x.level === l && inCourse(x, course)));
/**
 * Bhagyashree's two accounts (2026-10-28, user: "I am working on that"): they change the language they learn at any
 * time, finished or not. By card number, so it holds whichever database the server uses.
 */
const FREE_COURSE_CARDS = new Set(['240100045056', '240100019423']);
const changesCourseFreely = (user) => FREE_COURSE_CARDS.has(normaliseCardNumber(user?.cardNumber));

/* ── What is open ─────────────────────────────────────────────────────── */

/**
 * For every published lesson: whether it is open, and its status. And for
 * every module, which levels are open.
 *
 * Since 2026-10-24 the path is in topic units (units.js) and walked the
 * Duolingo way: a level opens when the one below is done (or the student was
 * placed in it or past it), and its lessons open one after another along the
 * path — each unit's Words, Grammar, Reading, Speaking and Translation lessons
 * and its review, then the level's review. A lesson once started stays open.
 * The level's reviews never hold back the next level.
 *
 * Lessons added to the path later (a topic's second unit, parts.js,
 * 2026-10-24) do not lock a student who is past them: every lesson before the
 * furthest one they have started is open, and a level they finished keeps
 * the next one open.
 */
const access = (lessons, progress) => {
    const lessonOpen = new Map();
    const levelOpen = Object.fromEntries(MODULES.map((m) => [m, {}]));
    let below = null;
    for (let i = 0; i < LEVELS.length; i++) {
        const at = lessons.filter((l) => l.level === LEVELS[i]);
        // The next section opens when every lesson of the one before is done, its unit reviews, listening and
        // level review too (2026-10-28, "don't allow the next unit or section before it is complete") — for every
        // student: an old placement no longer opens one.
        const before = below || [];
        const open = i === 0 || levelDone(progress, LEVELS[i - 1]) || (before.length ? before.every((l) => isDone(progress, l._id)) : levelOpen[MODULES[0]][LEVELS[i - 1]]);
        for (const m of MODULES) levelOpen[m][LEVELS[i]] = open;
        const walk = pathOrder(at);
        const furthest = walk.reduce((n, l, j) => (lessonEntry(progress, l._id) ? j : n), -1);
        walk.forEach((l, j) => {
            const started = !!lessonEntry(progress, l._id);
            // Only in an open section: a lesson begun or done in a section now shut waits for it (2026-10-28).
            lessonOpen.set(idOf(l._id), open && (started || j === 0 || j < furthest || isDone(progress, walk[j - 1]._id)));
        });
        below = at;
    }
    return { lessonOpen, levelOpen };
};

/** The student's level now: Beginner, moved up past every completed level (2026-10-28: not the placement). */
const currentLevel = (lessons, progress) => {
    let i = lvl(START);
    for (let k = 0; k < LEVELS.length; k++) {
        const at = lessons.filter((l) => l.level === LEVELS[k]);
        // A level finished before its review lessons came (2026-10-23) stays finished.
        const finished = progress.levelsCompleted.some((x) => x.level === LEVELS[k] && inCourse(x, courseOf(progress)));
        if (finished || (at.length && at.every((l) => isDone(progress, l._id)))) i = Math.max(i, Math.min(k + 1, LEVELS.length - 1));
    }
    return LEVELS[i];
};

/** The next lesson to take in a module: open, not done, lowest level first. */
const nextIn = (lessons, progress, open, module) => lessons.find((l) => l.module === module && open.get(idOf(l._id)) && !isDone(progress, l._id)) || null;
/** The next lesson along the path after `lesson` (units.js): open and not done, in its level and then the levels after. */
const nextOnPath = (lessons, progress, open, lesson) => {
    const walk = LEVELS.slice(lvl(lesson.level)).flatMap((l) => pathOrder(lessons.filter((x) => x.level === l)));
    const from = walk.findIndex((x) => idOf(x._id) === idOf(lesson._id));
    return walk.slice(from + 1).find((x) => open.get(idOf(x._id)) && !isDone(progress, x._id)) || null;
};

/* ── What a student is sent ───────────────────────────────────────────── */

// The options in an order that does not give the answer away, the same every
// time for the same question.
const mixed = (xs, seed) => shuffle(xs, seeded(seed));
const tiles = (words, answer, seed) => {
    let out = mixed(words, seed);
    if (out.join(' ') === String(answer).replace(/[.?!]$/, '') && out.length > 1) out = [...out.slice(1), out[0]];
    return out;
};
const publicQuestion = (q, seed) => ({
    id: q.id, type: q.type, prompt: q.prompt, ...(q.promptEn ? { promptEn: q.promptEn } : {}), ...(q.hint ? { hint: q.hint } : {}),
    ...(q.options ? { options: mixed(q.options, `${seed}:${q.id}`) } : {}),
    ...(q.words ? { words: tiles(q.words, q.answer, `${seed}:${q.id}`) } : {}),
    // A listening question: what to play (the word is spoken, so it is sent), and its meaning for one who cannot hear it.
    ...(q.kind === 'listen' ? { say: q.say, sayLang: q.sayLang, audio: q.audio || null, meaning: q.meaning } : {}),
    // Hear it and pick its meaning: the word written, for one who cannot hear it (its meaning is the answer).
    ...(q.kind === 'hearMeaning' ? { say: q.say, sayLang: q.sayLang, audio: q.audio || null, written: q.written } : {})
});
const quizOf = (lesson) => {
    if (lesson.module !== 'vocabulary') return lesson.quiz || [];
    // A level's word review asks ten of its words; its listening review, eight, by sound.
    const seed = idOf(lesson._id);
    if (lesson.review === 'words') return reviewQuiz(lesson.words, seed, 10, 'review');
    if (lesson.review === 'listen') return reviewQuiz(lesson.words, seed, 8, 'hear');
    // A unit's Listening and its review ask each word in a way its lessons before did not (vocabQuiz.js, 2026-10-24);
    // the review also asks two words of the unit before and the unit's sentences (reviews.js).
    if (lesson.review === 'hear') return hearQuiz(lesson.words, seed);
    if (lesson.review === 'unit') {
        return [
            ...unitQuiz(lesson.words, seed),
            ...reviewQuiz(lesson.earlier || [], `${seed}:before`, 2, 'review').map((q) => ({ ...q, id: `before~${q.id}` })),
            ...(lesson.sentences || []).map((s, k) => sentenceQuestion(s, k, lesson.pool || [], seed)).filter(Boolean)
        ];
    }
    return lessonQuiz(lesson.words, idOf(lesson._id));
};

/**
 * A translation's word bank, as the page offers it (tap the words in order):
 * the model translation's words with a few from the lesson's other answers
 * mixed in, shuffled the same way every time. None for a passage, or a model
 * too long to build from tiles — those are typed.
 */
const bankWords = (text) => String(text || '').replace(/[.,!?;:"“”„«»()¿¡،؟۔।—–]/g, ' ').split(/\s+/).filter(Boolean);
const tilesOf = (x) => (x.tiles?.length ? x.tiles : bankWords(x.model));
const bankFor = (item, lesson) => {
    if (item.open || item.typed) return null;
    const words = tilesOf(item);
    if (!words.length || words.length > 14) return null;
    const lower = new Set(words.map((w) => w.toLowerCase()));
    // Extra tiles from the lesson's other answers in the same direction (a review mixes both, in two languages).
    const way = item.direction || lesson.direction;
    const others = [...new Set([...(lesson.items || []), ...(lesson.quiz || [])].filter((x) => x.id !== item.id && !x.open && (x.direction || lesson.direction) === way).flatMap(tilesOf))].filter((w) => !lower.has(w.toLowerCase()));
    const seed = `${idOf(lesson._id)}:${item.id}:bank`;
    const extra = shuffle(others, seeded(seed)).slice(0, Math.min(4, Math.max(2, Math.ceil(words.length / 2))));
    return shuffle([...words, ...extra], seeded(`${seed}:mix`));
};

/** The course's language, when its words and sentences have their sound in English letters (content/sounds). */
const soundsIn = (lesson) => (lesson.course && SOUND_CODES.includes(lesson.target) ? lesson.target : null);
/** A word of the language learnt quoted in a question — What does "食べ物、食事" mean? — with how it sounds. */
const QUOTED = /["“”„«»「」『』]([^"“”„«»「」『』]+)["“”„«»「」『』]/g;
const promptSayOf = (code, prompt) => {
    for (const m of String(prompt || '').matchAll(QUOTED)) {
        const text = m[1].trim(), say = sayOf(code, text);
        if (say) return { text, say, locale: courseInfo(code).locale };
    }
    return null;
};
/**
 * A question in the language learnt `code` (2026-10-27): its choices with how each sounds, and the word it
 * asks about, to hear and read in English letters (its meaning is the answer, so it is not given).
 */
const withSays = (code, q) => {
    if (!code || !SOUND_CODES.includes(code)) return q;
    const says = saysFor(code, q.options), promptSay = promptSayOf(code, q.prompt);
    return says || promptSay ? { ...q, ...(says ? { says } : {}), ...(promptSay ? { promptSay } : {}) } : q;
};
/** A checked answer in the language learnt, with how it sounds (2026-10-27). */
const withAnswerSay = (lesson, out) => {
    const code = soundsIn(lesson), say = code && out?.answer ? sayOf(code, out.answer) : null;
    return say ? { ...out, answerSay: say } : out;
};

const publicLesson = (lesson, entry, config) => {
    const seed = idOf(lesson._id);
    // How the language learnt sounds, in English letters (2026-10-27): a quiz's choices; a sentence to read,
    // or the word tiles to build one from.
    const sounds = soundsIn(lesson);
    const said = (it, bank) => {
        if (!sounds) return {};
        // A sentence to read also carries its English, whole and word by word, shown when tapped, as Duolingo's hints are.
        const out = (it.direction || lesson.direction) === 'en-kn' ? { sourceSay: sayOf(sounds, it.source), sourceEn: it.en, sourceWords: wordHints(sounds, it.source) } : { bankSays: saysFor(sounds, bank, tileSay) };
        return Object.fromEntries(Object.entries(out).filter(([, v]) => v));
    };
    const out = {
        id: seed, module: lesson.module, moduleLabel: MODULE_LABEL[lesson.module], level: lesson.level, order: lesson.order,
        title: lesson.title, summary: lesson.summary, direction: lesson.direction || null, learn: lesson.learn || {},
        language: lesson.language || 'kn', languageName: lesson.languageName || 'Kannada', ...(lesson.languageFallback ? { languageFallback: lesson.languageFallback } : {}),
        ...(lesson.course ? { course: lesson.course, target: lesson.target, targetName: lesson.targetName, targetLocale: lesson.targetLocale } : {}),
        passingScore: config.passingScore[lesson.level],
        progress: entry ? { status: entry.status, step: entry.step, bestScore: entry.bestScore, lastScore: entry.lastScore, attempts: entry.attempts } : { status: 'new', step: 'learn', bestScore: null, attempts: 0 }
    };
    if (lesson.module === 'vocabulary') out.words = lesson.review === 'listen' ? [] : lesson.words || [];
    if (lesson.review) out.review = lesson.review;
    // A few of the unit's words, to warm up on with matching pairs (units.js).
    if (lesson.warmup?.length) out.warmup = lesson.warmup;
    if (lesson.module === 'grammar') out.practice = (lesson.practice || []).map((q) => publicQuestion(q, seed));
    if (lesson.module === 'reading') {
        out.writing = (lesson.writing || []).map((t) => ({ id: t.id, type: t.type, prompt: t.prompt, ...(t.promptEn ? { promptEn: t.promptEn } : {}), minWords: t.minWords || 0, mustInclude: t.mustInclude || [], checklist: t.checklist || [], ...(t.words ? { words: tiles(t.words, t.answer, `${seed}:${t.id}`) } : {}) }));
    }
    // The checklist ticks itself from what is said (2026-10-28): the checks, for the page to run as the student speaks.
    if (lesson.module === 'speaking') out.speaking = { ...(lesson.speaking || {}), checks: speakChecks.checksFor(lesson), need: speakChecks.needed((lesson.speaking?.checklist || []).length) };
    // Speak on a topic (talks.js): the task; its sample answer comes with the corrections.
    if (lesson.talk) out.talk = { ...lesson.talk, sample: undefined };
    // A review's items each carry their own direction (it mixes both).
    const way = (it) => (it.direction ? { direction: it.direction } : {});
    if (lesson.module === 'translation') out.items = (lesson.items || []).map((it) => { const bank = bankFor(it, lesson); return { id: it.id, kind: it.kind, topic: it.topic, source: it.source, open: !!it.open, bank, ...way(it), ...said(it, bank) }; });
    out.quiz = lesson.module === 'translation'
        ? (lesson.quiz || []).map((it) => { const bank = bankFor(it, lesson); return { id: it.id, kind: it.kind, topic: it.topic, source: it.source, type: 'translation', bank, ...way(it), ...said(it, bank) }; })
        : quizOf(lesson).map((q) => withSays(sounds, publicQuestion(q, seed)));
    return out;
};

/* ── Saving what happened ─────────────────────────────────────────────── */

const touchLesson = (progress, lesson, patch = {}) => {
    let e = lessonEntry(progress, lesson._id);
    if (!e) { progress.lessons.push({ lessonId: lesson._id, module: lesson.module, level: lesson.level }); e = progress.lessons[progress.lessons.length - 1]; }
    const STEPS = ['learn', 'practice', 'quiz', 'done'];
    // A lesson's step only moves forward, except back to the quiz for a retry.
    if (patch.step && (STEPS.indexOf(patch.step) > STEPS.indexOf(e.step) || patch.force)) e.step = patch.step;
    e.updatedAt = new Date();
    progress.lastLessonId = lesson._id;
    progress.lastActiveAt = new Date();
    return e;
};

/** Keep a wrong answer for revision, or clear it once answered right. */
const noteMistake = (progress, { lesson, section, qid, kind = 'question', prompt = '', given = '', correct }) => {
    const same = (m) => !m.resolvedAt && m.section === section && m.qid === qid && idOf(m.lessonId) === idOf(lesson?._id);
    const open = progress.mistakes.find(same);
    if (correct) { if (open) open.resolvedAt = new Date(); return; }
    if (open) { open.count += 1; open.given = String(given).slice(0, 500); open.lastAt = new Date(); return; }
    progress.mistakes.push({ lessonId: lesson?._id, section, qid, kind, module: lesson?.module, level: lesson?.level, prompt: String(prompt).slice(0, 300), given: String(given).slice(0, 500) });
    // Keep the list to the most recent few hundred.
    if (progress.mistakes.length > 400) progress.mistakes.splice(0, progress.mistakes.length - 400);
};

/**
 * The student's open mistakes in the course they are on (asked 2026-10-24: a
 * student learning Hindi was asked their English mistakes). A mistake's
 * course is its lesson's; the others wait for when they are back in theirs.
 */
const openMistakes = async (progress) => {
    const open = progress.mistakes.filter((m) => !m.resolvedAt);
    const ids = [...new Set(open.map((m) => idOf(m.lessonId)).filter((id) => mongoose.isValidObjectId(id)))];
    const course = courseOf(progress);
    const mine = new Set((await LinguisticLesson.find({ _id: { $in: ids } }).select('course').lean()).filter((l) => (l.course || 'en') === course).map((l) => idOf(l._id)));
    return open.filter((m) => mine.has(idOf(m.lessonId)));
};

const saveAttempt = (userId, lesson, kind, { score = 0, total = 0, passed = false, detail } = {}) => LinguisticAttempt.create({
    userId, lessonId: lesson?._id || null, module: lesson?.module || '', level: lesson?.level || '', kind,
    score, total, percent: total ? Math.round((score / total) * 100) : 0, passed, detail, day: dayKey()
});

const pay = async (userId, type, refId, meta = {}) => {
    const r = await safeRecordActivity({ userId, type, refId, meta });
    return { events: r.events || [], xp: r.duplicate ? 0 : (r.events || []).find((e) => e.kind === 'xp')?.amount || 0 };
};

/* ── Levels and certificates ──────────────────────────────────────────── */

const certificateNumber = (user, level, course = 'en') => `YATI-${course === 'en' ? 'ENG' : course.toUpperCase()}-${level[0].toUpperCase()}-${String(user.cardNumber || idOf(user._id).slice(-8)).toUpperCase()}`;

/**
 * After a lesson is passed: is its level now complete, and does it earn the
 * certificate? Every lesson of the level done, and the average best score at
 * or above the configured minimum. A level done below the average is marked
 * done (the next level opens) and earns the certificate once retakes bring
 * the average up.
 */
const checkLevel = async (user, progress, level, lessons, config) => {
    const at = lessons.filter((l) => l.level === level);
    if (!at.length || !at.every((l) => isDone(progress, l._id))) return { events: [], certificate: null };
    const scores = at.map((l) => lessonEntry(progress, l._id)?.bestScore || 0);
    const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const course = courseOf(progress);
    if (!progress.levelsCompleted.some((x) => x.level === level && inCourse(x, course))) progress.levelsCompleted.push({ level, completedAt: new Date(), average, course });
    if (average < config.certificateMinAverage || progress.certificates.some((c) => c.level === level && inCourse(c, course))) return { events: [], certificate: null, average };
    const certificate = { level, number: certificateNumber(user, level, course), issuedAt: new Date(), average, course };
    progress.certificates.push(certificate);
    const paid = await pay(user._id, 'linguistic_level', course === 'en' ? `level:${level}` : `level:${course}:${level}`, { level, course });
    return { events: paid.events, certificate, average };
};

/* ── Grading ──────────────────────────────────────────────────────────── */

const findQuestion = (lesson, section, id) => {
    if (section === 'practice') return (lesson.practice || []).find((q) => q.id === id);
    // A vocabulary quiz as it was asked (a review's ways, its sentences, the words before it), else rebuilt from its id.
    const asked = () => quizOf(lesson).find((q) => q.id === id) || questionById(lesson.words || [], id, idOf(lesson._id));
    if (section === 'quiz') return lesson.module === 'vocabulary' ? asked() : (lesson.quiz || []).find((q) => q.id === id);
    if (section === 'items') return (lesson.items || []).find((q) => q.id === id);
    if (section === 'vocab') return asked();
    if (section === 'spell') return questionById(lesson.words || [], id, idOf(lesson._id));
    return null;
};

/** One answer judged, with what the student is shown afterwards. */
const judge = (lesson, q, given, section) => {
    if (lesson.module === 'translation' && (section === 'items' || section === 'quiz')) {
        const t = checkTranslation(q, given, q.direction || lesson.direction, lesson.language || 'kn', lesson.target || 'en');
        return { correct: t.correct, verdict: t.verdict, closeness: t.closeness, diff: t.diff, closest: t.closest, answer: q.model, accepted: q.accepted || [], explanation: q.explanation || '', ...(t.accents ? { accents: true } : {}) };
    }
    const g = gradeQuestion(q, given);
    return { correct: g.correct, near: g.near, answer: q.answer, explanation: q.explanation || '' };
};

/** Practice: one question checked at once, with the answer and why. */
const checkPractice = async (user, lesson, section, id, given) => {
    const q = findQuestion(lesson, section, id);
    if (!q) return null;
    const out = judge(lesson, q, given, section);
    const progress = await progressOf(user._id);
    touchLesson(progress, lesson, { step: 'practice' });
    let events = [];
    let submission = null, grammar = null;
    if (out.verdict === 'review') {
        // A passage: never marked wrong by the machine, and not sent to a teacher (2026-10-26). Written in
        // English (an English course, into English), its grammar is corrected here, sentence by sentence.
        if (!lesson.course && (q.direction || lesson.direction) === 'kn-en') grammar = grammarOf(given);
        submission = await submit(user, lesson, { taskId: q.id, kind: 'translation', taskType: 'paragraph translation', prompt: q.source, answer: given, model: q.model, autoFeedback: [], sentences: grammar?.sentences }, 'checked');
    } else {
        noteMistake(progress, { lesson, section, qid: q.id, kind: lesson.module === 'translation' ? 'translation' : section === 'spell' ? 'word' : 'question', prompt: q.source || q.prompt, given, correct: out.correct });
        if (out.correct && lesson.module === 'translation') events = (await pay(user._id, 'linguistic_translation', `${idOf(lesson._id)}:${q.id}`)).events;
    }
    await progress.save();
    await saveAttempt(user._id, lesson, 'check', { score: out.correct ? 1 : 0, total: 1, passed: !!out.correct, detail: { section, id: q.id, given: String(given).slice(0, 1500), correct: out.correct, verdict: out.verdict } });
    return { ...out, ...(grammar ? { ...localizeFeedback(languageOf(progress), grammar), ok: grammar.clean === grammar.total } : {}), events, submission: submission ? { id: idOf(submission._id), status: submission.status } : null };
};

/**
 * One quiz answer checked as it is given, for the feedback after each
 * question. Nothing is saved: the quiz counts when it is submitted
 * (submitQuiz), which judges every answer again.
 */
const checkQuizAnswer = (lesson, id, given) => {
    const q = findQuestion(lesson, 'quiz', id);
    return q ? judge(lesson, q, given, 'quiz') : null;
};

/**
 * The quiz: every answer judged; at or above the passing score the lesson is
 * done. Returns the score, each answer with its correct one and explanation,
 * the next lesson, and the reward events.
 */
const submitQuiz = async (user, lesson, answers = {}) => {
    const config = await getConfig();
    const qs = quizOf(lesson);
    const results = qs.map((q) => {
        const given = String(answers?.[q.id] ?? '').slice(0, 1500);
        return { id: q.id, prompt: q.source || q.prompt, given, ...judge(lesson, q, given, 'quiz') };
    });
    const score = results.filter((r) => r.correct).length;
    const total = results.length;
    const percent = total ? Math.round((score / total) * 100) : 0;
    const passed = percent >= config.passingScore[lesson.level];

    const progress = await progressOf(user._id);
    const wasDone = isDone(progress, lesson._id);
    const e = touchLesson(progress, lesson, { step: passed ? 'done' : 'quiz' });
    e.attempts += 1;
    e.lastScore = percent;
    e.bestScore = Math.max(e.bestScore ?? 0, percent);
    if (passed && e.status !== 'completed') { e.status = 'completed'; e.completedAt = new Date(); }
    for (const r of results) {
        // A question never reached (the lesson ended when the student ran out
        // of hearts) counts as wrong in the score, but is not kept as a mistake.
        if (!r.given.trim()) continue;
        const section = lesson.module === 'vocabulary' ? 'vocab' : 'quiz';
        noteMistake(progress, { lesson, section, qid: r.id, kind: lesson.module === 'translation' ? 'translation' : lesson.module === 'vocabulary' ? 'word' : 'question', prompt: r.prompt, given: r.given, correct: r.correct });
    }

    const { events, level, next } = await settle(user, progress, lesson, percent, passed, config);
    await saveAttempt(user._id, lesson, 'quiz', { score, total, passed, detail: results.map((r) => ({ id: r.id, given: r.given, correct: r.correct })) });
    return {
        score, total, percent, passed, passingScore: config.passingScore[lesson.level], firstPass: passed && !wasDone, bestScore: e.bestScore,
        results, next: next ? { id: idOf(next._id), title: next.title, level: next.level } : null,
        certificate: level.certificate ? { level: level.certificate.level, number: level.certificate.number } : null,
        events
    };
};

/**
 * After a lesson's result is on the progress record: its points (passed, and
 * a perfect score), the level checked, the progress saved, and the next
 * lesson along the path.
 */
const settle = async (user, progress, lesson, percent, passed, config) => {
    const events = [];
    if (passed) events.push(...(await pay(user._id, 'linguistic_lesson', `lesson:${idOf(lesson._id)}`, { module: lesson.module, level: lesson.level })).events);
    if (percent === 100) events.push(...(await pay(user._id, 'linguistic_perfect', `perfect:${idOf(lesson._id)}`)).events);
    const lessons = await lessonsFor(progress);
    const level = passed ? await checkLevel(user, progress, lesson.level, lessons, config) : { events: [], certificate: null };
    events.push(...level.events);
    await progress.save();
    const { lessonOpen } = access(lessons, progress);
    return { events, level, next: passed ? nextOnPath(lessons, progress, lessonOpen, lesson) : null };
};

/**
 * Speak on a topic (talks.js): what the student said, corrected sentence by
 * sentence (talkCheck.js). Done with enough words and the share of sentences
 * with no mistake at the level's pass mark; otherwise they read the
 * corrections and speak again.
 */
const submitTalk = async (user, lesson, text) => {
    const config = await getConfig();
    const passing = config.passingScore[lesson.level];
    const r = checkTalk(text, lesson.talk || {}, passing);
    const progress = await progressOf(user._id);
    const wasDone = isDone(progress, lesson._id);
    const e = touchLesson(progress, lesson, { step: r.passed ? 'done' : 'quiz' });
    e.attempts += 1;
    e.lastScore = r.percent;
    e.bestScore = Math.max(e.bestScore ?? 0, r.percent);
    if (r.passed && e.status !== 'completed') { e.status = 'completed'; e.completedAt = new Date(); }
    const { events, level, next } = await settle(user, progress, lesson, r.percent, r.passed, config);
    await saveAttempt(user._id, lesson, 'speaking', { score: r.clean, total: r.total, passed: r.passed, detail: { talk: true, words: r.words, mistakes: r.sentences.flatMap((x) => x.mistakes.map((m) => ({ wrong: m.wrong, right: m.right }))).slice(0, 50) } });
    return {
        ...localizeFeedback(languageOf(progress), r), passingScore: passing, firstPass: r.passed && !wasDone, bestScore: e.bestScore, sample: lesson.talk?.sample || '',
        next: next ? { id: idOf(next._id), title: next.title, level: next.level } : null,
        certificate: level.certificate ? { level: level.certificate.level, number: level.certificate.number } : null,
        events
    };
};

/* ── Writing and speaking ─────────────────────────────────────────────── */

const submit = async (user, lesson, fields, status = 'pending') => {
    // An answer still waiting for review (or one checked here) is replaced; once reviewed, a new one starts.
    const open = await LinguisticSubmission.findOne({ userId: user._id, lessonId: lesson._id, taskId: fields.taskId, status });
    const data = { ...fields, status, answer: String(fields.answer).slice(0, 6000), module: lesson.module, level: lesson.level, organizationId: user.organizationId || null };
    if (open) { Object.assign(open, data); return open.save(); }
    return LinguisticSubmission.create({ userId: user._id, lessonId: lesson._id, ...data });
};

/** The grammar of a piece of written English, sentence by sentence (talkCheck.js `checkWritten`): each one corrected, with the reason. */
const grammarOf = (text) => {
    // A new line ends a sentence too (2026-10-27: two lines, one without its full stop, were read as one).
    const sentences = String(text || '').split(/\n+/).flatMap((line) => sentencesOf(line.replace(/\s+/g, ' ').trim())).map(checkWritten);
    return { sentences, clean: sentences.filter((s) => !s.mistakes.length).length, total: sentences.length };
};

const submitWriting = async (user, lesson, taskId, answer) => {
    const task = (lesson.writing || []).find((t) => t.id === taskId);
    if (!task) return null;
    const text = String(answer || '').trim();
    let result;
    if (task.type === 'jumbled') {
        const g = gradeQuestion({ type: 'rearrange', answer: task.answer, accepted: task.accepted }, text);
        result = { correct: g.correct, findings: [], model: task.model || task.answer };
    } else {
        const w = checkWriting(text, task);
        const g = grammarOf(text);
        // A spelling slip put right in the sentences: "no common spelling mistakes" would say otherwise.
        if (g.sentences.some((x) => x.mistakes.some((m) => /^Spelling:/.test(m.why)))) w.findings = w.findings.filter((f) => !/No common spelling mistakes/.test(f.text));
        if (task.type === 'sentence') result = { correct: w.ok && g.clean === g.total, findings: w.findings, model: task.model, words: w.words, ...g };
        else {
            // Checked here, its grammar corrected sentence by sentence, and not sent to a teacher (2026-10-26:
            // "don't send the answers; correct the grammar here"). Kept for the student's Writing tab.
            const sub = text ? await submit(user, lesson, { taskId, kind: 'writing', taskType: task.type, prompt: task.prompt, answer: text, model: task.model, autoFeedback: w.findings, sentences: g.sentences }, 'checked') : null;
            // `ok`: written with no mistake to put right (2026-10-27): otherwise the same task again, until it is.
            result = { correct: null, checked: true, ok: w.ok && g.clean === g.total, findings: w.findings, words: w.words, ...g, submission: sub ? { id: idOf(sub._id), status: sub.status } : null };
        }
    }
    const progress = await progressOf(user._id);
    touchLesson(progress, lesson, { step: 'practice' });
    await progress.save();
    await saveAttempt(user._id, lesson, 'writing', { score: result.correct ? 1 : 0, total: 1, passed: !!result.correct, detail: { taskId, type: task.type, words: result.words } });
    return localizeFeedback(languageOf(progress), result);
};

/**
 * A speaking task, answered by voice (2026-10-28: "don't give a tick option manually"): what the browser wrote
 * down as the student spoke, and for how long. Each point of the checklist is ticked here from what was said.
 */
const saveSpeaking = async (user, lesson, said = '', seconds = 0) => {
    const items = lesson.speaking?.checklist || [];
    const ticks = speakChecks.ticksFor(lesson, said, seconds);
    const ticked = ticks.filter(Boolean).length;
    const progress = await progressOf(user._id);
    touchLesson(progress, lesson, { step: 'practice' });
    await progress.save();
    await saveAttempt(user._id, lesson, 'speaking', { score: ticked, total: items.length, passed: ticked === items.length && items.length > 0, detail: { checklist: ticks, recorded: true, said: said.slice(0, 2000), seconds } });
    return { ticked, total: items.length, ticks, sample: lesson.speaking?.sample || '' };
};

/* ── Placement test ───────────────────────────────────────────────────── */

const BANDS = ['beginner', 'intermediate', 'advanced'];
/**
 * The level the scores point to. Beginner basics must hold up (4 of 5) for
 * anything higher; then 3 of the 5 intermediate questions place a student at
 * Intermediate, and 4 of 5 at both upper bands place them at Advanced.
 */
const placementLevel = (bands) => {
    const ok = (b, need) => (bands[b]?.score ?? 0) >= need;
    if (ok('advanced', 4) && ok('intermediate', 4) && ok('beginner', 4)) return 'advanced';
    if (ok('intermediate', 3) && ok('beginner', 4)) return 'intermediate';
    return 'beginner';
};

const placementPublic = (lang = 'kn') => placementQuestions.map((x) => localizePlacement(x, lang)).map((q) => ({ id: q.id, band: q.band, type: q.type, prompt: q.prompt, ...(q.promptEn ? { promptEn: q.promptEn } : {}), options: mixed(q.options, `placement:${q.id}`) }));

const submitPlacement = async (user, answers = {}) => {
    const lang = languageOf(await progressOf(user._id));
    const results = placementQuestions.map((x) => localizePlacement(x, lang)).map((q) => {
        const given = String(answers?.[q.id] ?? '');
        return { id: q.id, band: q.band, prompt: q.prompt, given, correct: normalize(given) === normalize(q.answer), answer: q.answer, explanation: q.explanation };
    });
    const bands = Object.fromEntries(BANDS.map((b) => { const r = results.filter((x) => x.band === b); return [b, { score: r.filter((x) => x.correct).length, total: r.length }]; }));
    const score = results.filter((r) => r.correct).length;
    const level = placementLevel(bands);
    const progress = await progressOf(user._id);
    // The test shows the student's level, but never moves them on (2026-10-28: every student starts at Section 1,
    // and units and sections open only by finishing them). One with no place yet starts at Beginner.
    // The result is kept (`found`, the score: the First Step badge), the place they are at stays.
    const at = progress.placement?.level || 'beginner';
    progress.placement = { level: at, found: level, score, total: results.length, bands, takenAt: new Date() };
    const kept = at !== level ? at : null;
    progress.lastActiveAt = new Date();
    await retier(progress);
    await progress.save();
    await LinguisticAttempt.create({ userId: user._id, kind: 'placement', score, total: results.length, percent: Math.round((score / results.length) * 100), passed: true, detail: { level, bands }, day: dayKey() });
    const paid = await pay(user._id, 'linguistic_placement', 'placement');
    return { level, score, total: results.length, bands, results, events: paid.events, ...(kept ? { kept, keptLabel: LEVEL_LABEL[kept] } : {}) };
};

/* ── Daily vocabulary challenge ───────────────────────────────────────── */

const DAILY_KINDS = ['meaning', 'blank', 'spell', 'synonym', 'antonym'];
/** Today's questions for this student: words from vocabulary lessons at their level. */
const dailyQuestions = async (userId, level, size, lang = 'kn', course = 'en') => {
    const c = course === 'en' ? null : course;
    const fields = 'words seedKey module level course base';
    let pool = await LinguisticLesson.find({ module: 'vocabulary', status: 'published', deletedAt: null, level, course: c, review: null, part: null }).select(fields).lean();
    if (!pool.length) pool = await LinguisticLesson.find({ module: 'vocabulary', status: 'published', deletedAt: null, course: c, review: null, part: null }).select(fields).lean();
    pool = pool.map((l) => (l.course ? build(l, lang) : localize(l, lang)));
    const day = dayKey();
    const all = pool.flatMap((l) => (l.words || []).map((w, i) => ({ lesson: l, i, w })));
    const rnd = seeded(`daily:${userId}:${day}`);
    const picked = shuffle(all, rnd).slice(0, size);
    return picked.map((p, n) => {
        const kinds = p.w.course ? [n % 2 ? 'word' : 'meaning', 'meaning'] : [DAILY_KINDS[n % DAILY_KINDS.length], 'meaning'];
        for (const k of kinds) {
            const q = questionFor(p.lesson.words, p.i, k, `daily:${day}`);
            if (q) return { ...q, id: `${idOf(p.lesson._id)}~${q.id}`, lesson: p.lesson };
        }
        return null;
    }).filter(Boolean);
};
const rebuildDaily = async (id, lang = 'kn') => {
    const [lessonId, qid] = String(id).split('~');
    if (!mongoose.isValidObjectId(lessonId)) return null;
    const doc = await LinguisticLesson.findById(lessonId).select('words module level seedKey course base').lean();
    const lesson = doc?.course ? build(doc, lang) : localize(doc, lang);
    return lesson ? { lesson, q: questionById(lesson.words || [], qid, `daily:${dayKey()}`) } : null;
};

/* ── The dashboard ────────────────────────────────────────────────────── */

const dayNumber = (d) => Math.round(Date.parse(`${d}T00:00:00Z`) / 86400000);
/** The English learning streak, from the days the student did something here. */
const streakOf = async (userId) => {
    const days = (await LinguisticAttempt.distinct('day', { userId })).map(dayNumber).sort((a, b) => a - b);
    const today = dayNumber(dayKey());
    let longest = 0, run = 0;
    for (let i = 0; i < days.length; i++) { run = i && days[i] === days[i - 1] + 1 ? run + 1 : 1; longest = Math.max(longest, run); }
    let current = 0;
    if (days.length && today - days[days.length - 1] <= 1) { current = 1; for (let i = days.length - 1; i > 0 && days[i] === days[i - 1] + 1; i--) current++; }
    return { current, longest, today: days[days.length - 1] === today };
};

const pointsOf = async (userId) => {
    const XpTransaction = require('../rewards/models/XpTransaction');
    const [r] = await XpTransaction.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(idOf(userId)), source: { $regex: '^linguistic_' } } }, { $group: { _id: null, xp: { $sum: '$amount' } } }]);
    return r?.xp || 0;
};

const ACHIEVEMENTS = [
    { key: 'first_step', emoji: '🧭', title: 'First Step', description: 'Take the placement test.', value: (s) => (s.placement && !s.placement.chosen ? 1 : 0), target: 1 },
    { key: 'first_lesson', emoji: '🌱', title: 'Off to a Start', description: 'Complete your first lesson.', value: (s) => s.completed, target: 1 },
    { key: 'ten_lessons', emoji: '📘', title: 'Keen Learner', description: 'Complete 10 lessons.', value: (s) => s.completed, target: 10 },
    { key: 'perfect', emoji: '💯', title: 'Perfect Score', description: 'Score 100% on a lesson quiz.', value: (s) => s.perfect, target: 1 },
    { key: 'translator', emoji: '🔁', title: 'Translator', description: 'Translate 10 items correctly.', value: (s) => s.translated, target: 10 },
    { key: 'streak_3', emoji: '🔥', title: 'Three-Day Streak', description: 'Practise English three days in a row.', value: (s) => s.longest, target: 3 },
    { key: 'streak_7', emoji: '⚡', title: 'Week of English', description: 'Practise English seven days in a row.', value: (s) => s.longest, target: 7 },
    { key: 'reviser', emoji: '🧠', title: 'Mistake Fixer', description: 'Fix 10 mistakes in revision.', value: (s) => s.fixed, target: 10 },
    { key: 'level_beginner', emoji: '🥉', title: 'Beginner Complete', description: 'Finish every Beginner lesson.', value: (s) => (s.levels.includes('beginner') ? 1 : 0), target: 1 },
    { key: 'level_intermediate', emoji: '🥈', title: 'Intermediate Complete', description: 'Finish every Intermediate lesson.', value: (s) => (s.levels.includes('intermediate') ? 1 : 0), target: 1 },
    { key: 'level_advanced', emoji: '🏆', title: 'Advanced Complete', description: 'Finish every Advanced lesson.', value: (s) => (s.levels.includes('advanced') ? 1 : 0), target: 1 }
];

const dashboard = async (user) => {
    const [progress, config] = await Promise.all([progressOf(user._id), getConfig()]);
    const lessons = await lessonsFor(progress);
    const { lessonOpen, levelOpen } = access(lessons, progress);
    const done = (l) => isDone(progress, l._id);
    const best = (l) => lessonEntry(progress, l._id)?.bestScore;
    const level = currentLevel(lessons, progress);
    const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
    const modules = MODULES.map((m) => {
        const all = lessons.filter((l) => l.module === m);
        const atLevel = all.filter((l) => l.level === level);
        const next = nextIn(lessons, progress, lessonOpen, m);
        return {
            id: m, label: MODULE_LABEL[m], total: all.length, completed: all.filter(done).length,
            atLevel: { total: atLevel.length, completed: atLevel.filter(done).length },
            average: avg(all.filter(done).map(best).filter((x) => x !== null && x !== undefined)),
            next: next ? { id: idOf(next._id), title: next.title, level: next.level } : null,
            levels: levelOpen[m]
        };
    });
    const completedLessons = lessons.filter(done);
    const [streak, points, translated, dailyToday, pending] = await Promise.all([
        streakOf(user._id), pointsOf(user._id),
        LinguisticAttempt.aggregate([{ $match: { userId: user._id, kind: 'check', module: 'translation', 'detail.correct': true } }, { $group: { _id: { l: '$lessonId', i: '$detail.id' } } }, { $count: 'n' }]),
        LinguisticAttempt.findOne({ userId: user._id, kind: 'daily', day: dayKey() }).select('score total').lean(),
        LinguisticSubmission.countDocuments({ userId: user._id, status: 'pending' })
    ]);
    const stats = {
        placement: progress.placement, completed: completedLessons.length, perfect: completedLessons.filter((l) => best(l) === 100).length,
        translated: translated[0]?.n || 0, longest: streak.longest, fixed: progress.mistakes.filter((m) => m.resolvedAt).length,
        levels: progress.levelsCompleted.filter((x) => inCourse(x, courseOf(progress))).map((x) => x.level)
    };
    const timeline = await timelineOf(progress, lessons, progress.dailyGoal || DEFAULT_GOAL);
    const resumeLesson = progress.lastLessonId && lessons.find((l) => idOf(l._id) === idOf(progress.lastLessonId));
    const resumeEntry = resumeLesson && lessonEntry(progress, resumeLesson._id);
    return {
        level, levelLabel: LEVEL_LABEL[level], placement: progress.placement, ...languageView(progress),
        // Started: a level found by the test or chosen; until then the section asks first.
        started: !!placedLevel(progress), dailyGoal: progress.dailyGoal || DEFAULT_GOAL, goalSet: !!progress.dailyGoal,
        knows: progress.knows ? { speak: progress.knows.speak, write: progress.knows.write, read: progress.knows.read } : null,
        ...courseView(progress),
        ...(changesCourseFreely(user) ? { freeCourse: true } : {}),
        levels: LEVELS.map((l) => {
            const at = lessons.filter((x) => x.level === l);
            const cert = progress.certificates.find((c) => c.level === l && inCourse(c, courseOf(progress)));
            return { level: l, label: LEVEL_LABEL[l], total: at.length, completed: at.filter(done).length, passingScore: config.passingScore[l], complete: stats.levels.includes(l), certificate: cert && !cert.hiddenAt ? { number: cert.number, issuedAt: cert.issuedAt } : null };
        }),
        modules,
        overall: { total: lessons.length, completed: completedLessons.length, percent: lessons.length ? Math.round((completedLessons.length / lessons.length) * 100) : 0 },
        quizAverage: avg(completedLessons.map(best).filter((x) => x !== null && x !== undefined)),
        points, streak,
        achievements: ACHIEVEMENTS.map((a) => { const v = a.value(stats); return { key: a.key, emoji: a.emoji, title: a.title, description: a.description, earned: v >= a.target, current: Math.min(v, a.target), target: a.target }; }),
        resume: resumeLesson && resumeEntry?.status !== 'completed' ? { id: idOf(resumeLesson._id), title: resumeLesson.title, module: resumeLesson.module, moduleLabel: MODULE_LABEL[resumeLesson.module], level: resumeLesson.level, step: resumeEntry?.step || 'learn' } : null,
        daily: { done: !!dailyToday, score: dailyToday?.score ?? null, total: dailyToday?.total ?? config.dailyChallengeSize },
        mistakes: (await openMistakes(progress)).length,
        pendingReviews: pending,
        today: await todayOf(user._id, progress),
        timeline,
        // The learning plan (2026-10-24): today's lessons and whether the student is on track; null without one.
        plan: roadmapOf(progress, lessons, { summary: true }),
        certificateMinAverage: config.certificateMinAverage
    };
};

/* ── The timeline (asked 2026-10-24) ──────────────────────────────────── */

const DAY_MS = 86400e3;
const PACE_DAYS = 14;
/** "2026-12-08", `days` from today. */
const dateIn = (days) => new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);

/**
 * In how many days the student finishes the language: every lesson left in
 * their course, from their own level on (a level placed past is not owed),
 * at the lessons a day their daily XP goal comes to (a lesson pays
 * `linguistic_lesson` XP). Each level's own finishing day, one after another;
 * the days at each goal, to pick a faster one; and — once they have done a
 * few lessons in the last two weeks — the days at the pace they really keep.
 */
const timelineOf = async (progress, lessons, goal) => {
    const xpPerLesson = (await require('../rewards/services/configService').xpFor('linguistic_lesson')) || 20;
    const perDayAt = (xp) => Math.max(0.5, xp / xpPerLesson);
    const from = lvl(START);
    const finished = (l) => progress.levelsCompleted.some((x) => x.level === l && inCourse(x, courseOf(progress)));
    const rows = LEVELS.map((l, i) => {
        const at = lessons.filter((x) => x.level === l);
        const left = i < from || finished(l) ? 0 : at.filter((x) => !isDone(progress, x._id)).length;
        return { level: l, label: LEVEL_LABEL[l], total: at.length, left, skipped: i < from, done: finished(l) || (at.length > 0 && left === 0 && i >= from) };
    });
    const remaining = rows.reduce((n, r) => n + r.left, 0);
    const daysAt = (perDay, upTo = remaining) => Math.ceil(upTo / perDay);
    const perDay = perDayAt(goal);
    let before = 0;
    const levels = rows.map((r) => {
        before += r.left;
        const days = r.left ? daysAt(perDay, before) : 0;
        return { ...r, days, finishOn: r.left ? dateIn(days) : null };
    });
    // The pace kept: lessons finished in the last two weeks (or since the first one, if sooner).
    const ids = new Set(lessons.map((l) => idOf(l._id)));
    const doneAt = progress.lessons.filter((e) => e.status === 'completed' && e.completedAt && ids.has(idOf(e.lessonId))).map((e) => new Date(e.completedAt).getTime());
    const recent = doneAt.filter((t) => t >= Date.now() - PACE_DAYS * DAY_MS);
    const span = doneAt.length ? Math.min(PACE_DAYS, Math.max(1, Math.ceil((Date.now() - Math.min(...doneAt)) / DAY_MS))) : 0;
    const pace = recent.length >= 3 && remaining ? recent.length / span : null;
    return {
        goal, xpPerLesson, lessonsPerDay: Math.round(perDay * 10) / 10,
        remaining, days: daysAt(perDay), finishOn: remaining ? dateIn(daysAt(perDay)) : null,
        levels,
        goals: GOALS.map((xp) => ({ xp, lessonsPerDay: Math.round(perDayAt(xp) * 10) / 10, days: daysAt(perDayAt(xp)) })),
        pace: pace ? { lessonsPerDay: Math.round(pace * 10) / 10, days: daysAt(pace), finishOn: dateIn(daysAt(pace)) } : null
    };
};

/**
 * The learning path: every level as a section, every module as a unit in it,
 * and its lessons in order, with what is open and what is done. `current` is
 * the lesson to take next: the first open one not done, from the student's
 * own level on (a student placed at Intermediate is not sent back to the
 * first Beginner lesson), else from the start.
 */
const pathView = async (user) => {
    const [progress, config] = await Promise.all([progressOf(user._id), getConfig()]);
    const lessons = await lessonsFor(progress);
    const { lessonOpen, levelOpen } = access(lessons, progress);
    const level = currentLevel(lessons, progress);
    const levels = LEVELS.map((l) => {
        // Topic units (units.js, 2026-10-24): each with a lesson of each kind and its review; the level's review last.
        const units = unitsOf(lessons.filter((x) => x.level === l)).map((u) => ({
            // Kept when units are added (a chest stays opened): "beginner-1", a topic's second unit "beginner-1-2", the level's review "beginner-review".
            id: u.kind === 'review' ? `${l}-review` : `${l}-${u.order}${u.part > 1 ? `-${u.part}` : ''}`, index: u.index, kind: u.kind, title: u.title,
            lessons: u.lessons.map((x) => {
                const e = lessonEntry(progress, x._id);
                return {
                    id: idOf(x._id), type: typeOf(x), title: x.title, summary: x.summary, order: x.order, module: x.module, moduleLabel: MODULE_LABEL[x.module], review: x.review || null,
                    direction: x.direction || null, open: !!lessonOpen.get(idOf(x._id)), status: e?.status || 'new', bestScore: e?.bestScore ?? null, attempts: e?.attempts || 0
                };
            })
        })).map((u) => ({ ...u, open: levelOpen[MODULES[0]][l] && u.lessons.some((x) => x.open), lessons: withStops(u, progress) }));
        const all = units.flatMap((u) => u.lessons.filter((x) => !x.stop));
        const cert = progress.certificates.find((c) => c.level === l && inCourse(c, courseOf(progress)));
        return {
            level: l, label: LEVEL_LABEL[l], passingScore: config.passingScore[l], open: levelOpen[MODULES[0]][l],
            total: all.length, completed: all.filter((x) => x.status === 'completed').length,
            complete: progress.levelsCompleted.some((x) => x.level === l && inCourse(x, courseOf(progress))),
            certificate: cert && !cert.hiddenAt ? { number: cert.number, issuedAt: cert.issuedAt } : null, units
        };
    });
    const order = (from) => levels.slice(from).flatMap((s) => s.units.flatMap((u) => u.lessons.filter((x) => !x.stop)));
    const next = (xs) => xs.find((x) => x.open && x.status !== 'completed');
    const current = next(order(lvl(level))) || next(order(0)) || null;
    return { level, levelLabel: LEVEL_LABEL[level], placement: progress.placement, ...languageView(progress), ...courseView(progress), current: current ? current.id : null, certificateMinAverage: config.certificateMinAverage, levels };
};

/*
 * The two stops on a unit's path that are not lessons (asked 2026-10-24, the
 * Duolingo way): a treasure chest after the unit's story (or its second
 * lesson), opened once for bonus XP when the lesson before it is done; and
 * practice of the student's own mistakes before the unit review, open once
 * any of the unit's lessons is done. Neither holds the path back.
 */
const withStops = (unit, progress) => {
    const nodes = [...unit.lessons];
    if (unit.kind !== 'topic' || !nodes.length) return nodes;
    const story = nodes.findIndex((n) => n.type === 'story');
    const after = story >= 0 ? story : Math.min(1, nodes.length - 1);
    const key = `${courseOf(progress)}:${unit.id}`;
    nodes.splice(after + 1, 0, {
        id: `chest-${unit.id}`, stop: 'chest', type: 'chest', title: 'Treasure chest', summary: 'Bonus XP for getting this far.',
        open: nodes[after].status === 'completed', status: (progress.chests || []).includes(key) ? 'completed' : 'new'
    });
    const review = nodes.findIndex((n) => n.review === 'unit');
    nodes.splice(review >= 0 ? review : nodes.length, 0, {
        id: `practice-${unit.id}`, stop: 'practice', type: 'practice', title: 'Practice', summary: 'Practise the answers you got wrong until they are right.',
        open: nodes.some((n) => !n.stop && n.status === 'completed'), status: 'new'
    });
    return nodes;
};

/** Open a unit's treasure chest: bonus XP, once, when the lesson before it is done. */
const openChest = async (user, unitId) => {
    const path = await pathView(user);
    const node = path.levels.flatMap((l) => l.units).find((u) => u.id === unitId)?.lessons.find((n) => n.stop === 'chest');
    if (!node) return { error: 'There is no chest there.', status: 404 };
    if (node.status === 'completed') return { error: 'This chest is already open.', status: 409 };
    if (!node.open) return { error: 'Finish the lessons before it to open this chest.', status: 409 };
    const progress = await progressOf(user._id);
    const key = `${courseOf(progress)}:${unitId}`;
    const done = await LinguisticProgress.updateOne({ _id: progress._id, chests: { $ne: key } }, { $push: { chests: key } });
    if (!done.modifiedCount) return { error: 'This chest is already open.', status: 409 };
    const paid = await pay(user._id, 'linguistic_chest', `chest:${key}`, { unit: unitId, course: courseOf(progress) });
    return { opened: true, xp: paid.xp, events: paid.events };
};

/* ── The learning plan (asked 2026-10-24) ─────────────────────────────── */

/*
 * "When the user enters, ask how much time they need to learn the language,
 * and make their roadmap from it." The student picks a time; the roadmap
 * fits it. With room for every lesson at no more than FULL_PER_DAY a day it
 * has them all; with less time it keeps the main lessons — the topics' own,
 * each level's checkpoint and the Advanced talks — and leaves out the extra
 * practice (unit reviews, listening, the level's word and sentence reviews),
 * which come back with a longer plan. Then the lessons left are spread over
 * the days left, one day after another: today's, and the days to come.
 */
const PLAN_DAYS = [14, 30, 60, 90, 180];
const FULL_PER_DAY = 3;
const MINUTES_PER_LESSON = 7;
const EXTRA = ['unit', 'hear', 'words', 'listen', 'sentences'];
const isExtra = (l) => EXTRA.includes(l.review);
const planOf = (progress) => (progress?.plans || []).find((p) => inCourse(p, courseOf(progress))) || null;

/** The lessons from a level on, in path order (units.js): the roadmap's order. */
const walkFrom = (lessons, level) => LEVELS.slice(lvl(level || 'beginner')).flatMap((l) => pathOrder(lessons.filter((x) => x.level === l)));
/** What a plan of `days` would hold, with `left` of every lesson still to do and `leftMain` of the main ones. */
const planFor = (days, left, leftMain) => {
    const tier = left / days <= FULL_PER_DAY ? 'full' : 'main';
    const lessons = tier === 'full' ? left : leftMain;
    const perDay = lessons / days;
    return { days, tier, lessons, perDay: Math.round(perDay * 10) / 10, minutes: Math.max(5, Math.ceil((Math.max(1, perDay) * MINUTES_PER_LESSON) / 5) * 5) };
};
/** Every plan to choose from, for these lessons from `level` on. */
const optionsFor = (lessons, progress, level) => {
    const left = walkFrom(lessons, level).filter((l) => !isDone(progress, l._id));
    return PLAN_DAYS.map((d) => planFor(d, left.length, left.filter((l) => !isExtra(l)).length));
};

/** The choices for a student not yet started (the start screens): their course, language and level as they said them. */
const planChoices = async (user, { course, language, level } = {}) => {
    const progress = await progressOf(user._id);
    const as = { ...progress.toObject(), course: course && course !== 'en' ? course : null, language: language || progress.language };
    const lessons = forStudent(await publishedLessons(courseOf(as)), as);
    return optionsFor(lessons, progress, LEVELS.includes(level) ? level : START);
};

/** A plan's tier again, after the student's level or course changed (the placement test after the start screens). */
const retier = async (progress) => {
    const p = planOf(progress);
    if (!p) return;
    const lessons = await allLessonsFor(progress);
    const left = walkFrom(lessons, START).filter((l) => !isDone(progress, l._id));
    p.tier = planFor(p.days, left.length, left.filter((l) => !isExtra(l)).length).tier;
    progress.markModified('plans');
};

/**
 * A course begun after the student has made a plan in another: the same time
 * again, from today (asked 2026-10-26: what they answered once is not asked
 * again). A student who never made one is asked (PlanQuestion.jsx).
 */
const carryPlan = async (progress) => {
    if (planOf(progress) || !(progress.plans || []).length) return;
    const last = [...progress.plans].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0];
    const lessons = await allLessonsFor(progress);
    const left = walkFrom(lessons, START).filter((l) => !isDone(progress, l._id));
    progress.plans.push({ course: courseOf(progress), days: last.days, tier: planFor(last.days, left.length, left.filter((l) => !isExtra(l)).length).tier, startedAt: new Date() });
    progress.markModified('plans');
};

/** Make (or change) the plan: `days` from today; null takes it away (every lesson, at their own pace). */
const setPlan = async (user, days) => {
    const progress = await progressOf(user._id);
    const course = courseOf(progress);
    progress.plans = (progress.plans || []).filter((p) => !inCourse(p, course));
    if (days != null) {
        if (!PLAN_DAYS.includes(Number(days))) return { error: 'Choose 2 weeks, 1 month, 2, 3 or 6 months.' };
        const lessons = await allLessonsFor(progress);
        const left = walkFrom(lessons, START).filter((l) => !isDone(progress, l._id));
        const plan = planFor(Number(days), left.length, left.filter((l) => !isExtra(l)).length);
        progress.plans.push({ course, days: plan.days, tier: plan.tier, startedAt: new Date() });
        // The daily goal to match: the XP of the day's lessons.
        const xp = Math.ceil(plan.perDay) * ((await require('../rewards/services/configService').xpFor('linguistic_lesson')) || 20);
        progress.dailyGoal = GOALS.find((g) => g >= xp) || GOALS[GOALS.length - 1];
    }
    progress.markModified('plans');
    progress.lastActiveAt = new Date();
    await progress.save();
    return roadmapView(user);
};

/** A day of the plan: 1 on the day it was made. */
const dayOfPlan = (plan, date = new Date()) => dayNumber(dayKey(date)) - dayNumber(dayKey(plan.startedAt)) + 1;

/**
 * The roadmap: the plan's days, each with its lessons. Days gone show what
 * was done on them; today and the days to come share out the lessons left
 * (today's done ones first), evenly. `summary` leaves out all but today.
 */
const roadmapOf = (progress, lessons, { summary = false } = {}) => {
    const plan = planOf(progress);
    if (!plan) return null;
    const walk = walkFrom(lessons, START);
    const unitOf = new Map();
    for (const l of LEVELS) for (const u of unitsOf(lessons.filter((x) => x.level === l))) for (const x of u.lessons) unitOf.set(idOf(x._id), u.title);
    const { lessonOpen } = access(lessons, progress);
    const info = (x) => {
        const e = lessonEntry(progress, x._id);
        return { id: idOf(x._id), title: x.title, module: x.module, type: typeOf(x), level: x.level, unit: unitOf.get(idOf(x._id)) || '', status: e?.status || 'new', open: !!lessonOpen.get(idOf(x._id)) };
    };
    const today = dayOfPlan(plan);
    const doneOn = (x) => { const e = lessonEntry(progress, x._id); return e?.status === 'completed' && e.completedAt ? dayOfPlan(plan, e.completedAt) : null; };
    const left = walk.filter((x) => !isDone(progress, x._id));
    const doneToday = walk.filter((x) => doneOn(x) === today);
    const daysLeft = Math.max(1, plan.days - today + 1);
    const queue = [...doneToday, ...left];
    const ahead = Array.from({ length: daysLeft }, (_, k) => ({
        day: today + k, today: k === 0,
        lessons: queue.slice(Math.floor((k * queue.length) / daysLeft), Math.floor(((k + 1) * queue.length) / daysLeft)).map(info)
    }));
    const done = walk.length - left.length;
    // On track: the lessons the plan expected by the end of yesterday, against those done before today.
    const expected = Math.min(walk.length, Math.round(((Math.min(today, plan.days + 1) - 1) * walk.length) / plan.days));
    const behind = Math.max(0, expected - (done - doneToday.length));
    const out = {
        days: plan.days, tier: plan.tier, day: today, daysLeft: Math.max(0, plan.days - today + 1), over: today > plan.days,
        total: walk.length, done, left: left.length, behind, minutesPerLesson: MINUTES_PER_LESSON, today: ahead[0]
    };
    if (summary) return out;
    const gone = Array.from({ length: Math.max(0, Math.min(today, plan.days + 1) - 1) }, (_, k) => ({ day: k + 1, past: true, lessons: walk.filter((x) => doneOn(x) === k + 1).map(info) }));
    return { ...out, schedule: [...gone, ...ahead] };
};

/** The roadmap page: the plan and its days, and the plans to choose from (to make one, or change it). */
const roadmapView = async (user) => {
    const progress = await progressOf(user._id);
    const lessons = await lessonsFor(progress);
    return {
        ...courseView(progress), plan: roadmapOf(progress, lessons),
        options: optionsFor(await allLessonsFor(progress), progress, START), level: placedLevel(progress),
        // What they said in the start screens (2026-10-26): the skills and topics they want, and when they like to learn.
        about: { focus: progress.focus || [], topics: progress.topics || [], studyTime: progress.studyTime || null, aim: progress.aim || null, practiceMinutes: progress.practiceMinutes ?? null }
    };
};

/* ── Starting out (asked 2026-10-23) ──────────────────────────────────── */

const GOALS = [10, 20, 30, 50];
const DEFAULT_GOAL = 30;

/** The student picks their level themselves instead of taking the test: it opens that level as the test would. */
const chooseLevel = async (user, level) => {
    if (!LEVELS.includes(level)) return null;
    const progress = await progressOf(user._id);
    // No level above the one they are at is opened by saying it (2026-10-28): everyone starts at Beginner.
    if (lvl(level) > lvl(progress.placement?.level || 'beginner')) return { error: 'Everyone starts at Section 1. Finish your units and sections to move on to the next level.' };
    progress.placement = { level, score: null, total: null, bands: null, takenAt: new Date(), chosen: true };
    progress.lastActiveAt = new Date();
    await retier(progress);
    await progress.save();
    return { level, levelLabel: LEVEL_LABEL[level], placement: progress.placement };
};

/** XP a day to aim for: 10 (casual), 20 (regular), 30 (serious) or 50 (intense). */
const setGoal = async (user, xp) => {
    const goal = Number(xp);
    if (!GOALS.includes(goal)) return null;
    const progress = await progressOf(user._id);
    progress.dailyGoal = goal;
    await progress.save();
    return { dailyGoal: goal };
};

const REASONS = ['school', 'career', 'people', 'travel', 'fun', 'brain', 'research', 'abroad', 'other'];
const AIMS = ['basics', 'speaking', 'fluent', 'unsure'];
const STYLES = ['speaking', 'reading', 'listening', 'none'];
const AGE_BANDS = ['under18', '18-24', '25-34', '35-44', '45-54', '55+'];
const PRACTICE_MINUTES = [5, 15, 30, 60, 0];
const FOCUS = ['speaking', 'listening', 'reading', 'writing', 'grammar', 'vocabulary'];
const TOPICS = ['daily', 'travel', 'work', 'studies', 'health', 'money', 'technology', 'culture'];
const STUDY_TIMES = ['morning', 'afternoon', 'evening', 'night'];
/**
 * Why they are learning, and how much English they said they know (0 new …
 * 4 most topics); and, since 2026-10-26, what they want to get better at,
 * the topics they like and when they like to learn (each optional, kept when
 * not sent).
 */
const setAbout = async (user, { reason, know, focus, topics, studyTime, aim, style, ageBand, practiceMinutes } = {}) => {
    const k = Number(know);
    if (!REASONS.includes(reason) || !Number.isInteger(k) || k < 0 || k > 4) return null;
    const list = (xs, known) => (Array.isArray(xs) ? [...new Set(xs)].filter((x) => known.includes(x)) : null);
    const f = list(focus, FOCUS), t = list(topics, TOPICS);
    if ((focus !== undefined && !f?.length) || (topics !== undefined && !t?.length) || (studyTime !== undefined && !STUDY_TIMES.includes(studyTime))) return null;
    const one = (v, known) => v === undefined || known.includes(v);
    if (!one(aim, AIMS) || !one(style, STYLES) || !one(ageBand, AGE_BANDS) || !one(practiceMinutes, PRACTICE_MINUTES)) return null;
    const progress = await progressOf(user._id);
    progress.reason = reason;
    progress.selfRating = k;
    if (f) progress.focus = f;
    if (t) progress.topics = t;
    if (studyTime !== undefined) progress.studyTime = studyTime;
    if (aim !== undefined) progress.aim = aim;
    if (style !== undefined) progress.style = style;
    if (ageBand !== undefined) progress.ageBand = ageBand;
    if (practiceMinutes !== undefined) progress.practiceMinutes = practiceMinutes;
    await progress.save();
    return { reason, selfRating: k, focus: progress.focus, topics: progress.topics, studyTime: progress.studyTime, aim: progress.aim, style: progress.style, ageBand: progress.ageBand, practiceMinutes: progress.practiceMinutes };
};

/** The course the student is on, and every course there is. */
/** The course the student is on, and every course, with the ones they have begun (to ask where to start in a new one). */
const courseView = (progress) => ({
    course: { ...courseInfo(courseOf(progress)), full: courseOf(progress) === 'en' },
    // Finished (2026-10-28): every section of the course done — the next language can be chosen.
    courseDone: courseDone(progress),
    courses: courses().map((c) => ({ ...c, begun: c.code === 'en' ? !!progress.placement?.level : !!progress.courseStart?.[c.code], done: courseDone(progress, c.code) }))
});

/**
 * Learn another language (or English again): the course, and for a course
 * other than English, the level to start at (Beginner, or the level they
 * said). Their own language cannot be the course, except English for an
 * English speaker. One language at a time: another only before the course is started, or once it is finished.
 */
const setCourse = async (user, course, start) => {
    if (!courseCodes().includes(course)) return { error: 'That course is not available.' };
    const progress = await progressOf(user._id);
    if (course !== 'en' && course === languageOf(progress)) return { error: 'That is the language you speak. Choose another to learn.' };
    if (start != null && !LEVELS.includes(start)) return { error: 'Choose Beginner, Intermediate or Advanced.' };
    // One language at a time (2026-10-27, user): once the student has started a course, they keep it — until they
    // finish every section of it (2026-10-28: "after completing that, they choose the next language").
    if (placedLevel(progress) && course !== courseOf(progress) && !courseDone(progress) && !changesCourseFreely(user)) return { error: `You are learning ${courseInfo(courseOf(progress)).name}. Finish all its sections, then choose your next language.` };
    // A course starts at Beginner (2026-10-28): a later level opens only by finishing the one before.
    if (start && start !== 'beginner') start = null;
    progress.course = course === 'en' ? null : course;
    if (course !== 'en' && (start || !progress.courseStart?.[course])) {
        progress.courseStart = { ...(progress.courseStart || {}), [course]: start || 'beginner' };
        progress.markModified('courseStart');
    }
    progress.lastActiveAt = new Date();
    await retier(progress);
    await carryPlan(progress);
    await progress.save();
    return { ...courseView(progress), started: !!placedLevel(progress), ...(changesCourseFreely(user) ? { freeCourse: true } : {}) };
};

/**
 * The languages the student speaks, writes and reads (2026-10-28): each a list of one or more language
 * codes the section knows; null when one is missing or holds an unknown code.
 */
const KNOWS = ['speak', 'write', 'read'];
const setKnows = async (user, body = {}) => {
    const codes = new Set(languages().map((l) => l.code)), out = {};
    for (const k of KNOWS) {
        const list = Array.isArray(body[k]) ? [...new Set(body[k].map(String))] : [];
        if (!list.length || list.length > 30 || !list.every((c) => codes.has(c))) return null;
        out[k] = list;
    }
    const progress = await progressOf(user._id);
    progress.knows = out;
    await progress.save();
    return { knows: out };
};

/** The student's language, whether they chose it, and every language there is. */
const languageView = (progress) => ({ language: infoOf(languageOf(progress)), languageChosen: !!progress.language, languages: languages() });

/** Choose the language meanings and translations are shown in. */
const setLanguage = async (user, code) => {
    if (!languages().some((l) => l.code === code)) return null;
    const progress = await progressOf(user._id);
    if (code === progress.course) return { error: `You are learning ${courseInfo(code).name}. Choose another language, or change your course first.` };
    progress.language = code;
    await progress.save();
    return languageView(progress);
};

/** Today so far: XP earned here and lessons completed, for the daily quests. */
const todayOf = async (userId, progress) => {
    const XpTransaction = require('../rewards/models/XpTransaction');
    const since = startOfDay(dayKey());
    const [r] = await XpTransaction.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(idOf(userId)), source: { $regex: '^linguistic_' }, createdAt: { $gte: since } } }, { $group: { _id: null, xp: { $sum: '$amount' } } }]);
    return { xp: r?.xp || 0, lessons: progress.lessons.filter((l) => l.completedAt && l.completedAt >= since).length };
};

/** A module's lessons at every level, with what is open and what is done. */
const moduleView = async (user, module) => {
    const [progress, config] = await Promise.all([progressOf(user._id), getConfig()]);
    const lessons = await lessonsFor(progress);
    const { lessonOpen, levelOpen } = access(lessons, progress);
    return {
        module, label: MODULE_LABEL[module], level: currentLevel(lessons, progress), placement: progress.placement,
        levels: LEVELS.map((l) => ({
            level: l, label: LEVEL_LABEL[l], open: levelOpen[module][l], passingScore: config.passingScore[l],
            lessons: lessons.filter((x) => x.module === module && x.level === l).map((x) => {
                const e = lessonEntry(progress, x._id);
                return { id: idOf(x._id), title: x.title, summary: x.summary, order: x.order, direction: x.direction || null, open: lessonOpen.get(idOf(x._id)), status: e?.status || 'new', step: e?.step || 'learn', bestScore: e?.bestScore ?? null, attempts: e?.attempts || 0 };
            })
        }))
    };
};

module.exports = {
    MODULE_LABEL, LEVEL_LABEL, publishedLessons, progressOf, access, currentLevel, publicLesson, touchLesson, noteMistake, saveAttempt, pay,
    checkPractice, submitQuiz, submitTalk, submitWriting, saveSpeaking, placementPublic, submitPlacement, placementLevel, dailyQuestions, rebuildDaily,
    dashboard, moduleView, pathView, withAnswerSay, setKnows, withSays, soundsIn, openChest, openMistakes, setPlan, roadmapView, planChoices, PLAN_DAYS, forStudent, lessonsFor, serve, setCourse, courseView, placedLevel, inCourse, checkQuizAnswer, bankFor, bankWords, setLanguage, chooseLevel, setGoal, setAbout, GOALS, REASONS, languageView, localize, languageOf, findQuestion, judge, streakOf, pointsOf, lessonEntry, isDone, publicQuestion, quizOf, certificateNumber, checkLevel
};
