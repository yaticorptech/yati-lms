/**
 * Linguistic Ability — the rules: what a student may open, how a quiz counts,
 * what is saved, what is paid, and when a level and its certificate are done.
 *
 * The flow in every module: pick a module and a level, learn, practise, take
 * the quiz. A quiz at or above the level's passing score completes the lesson
 * and opens the next one; mistakes are kept for revision; retries are always
 * allowed and the best score stands.
 *
 * Levels: Beginner is always open. A higher level opens when the placement
 * test put the student there, or when every lesson of the level below in that
 * module is done. The student's English level is the placement level, moved
 * up each time a whole level is completed.
 *
 * Points are the platform's own Reward rules (the linguistic_* activities),
 * paid once per thing through safeRecordActivity, so a retry or a replayed
 * request never pays twice.
 */
const mongoose = require('mongoose');
const { LinguisticLesson, LinguisticProgress, LinguisticAttempt, LinguisticSubmission, MODULES, LEVELS } = require('./models');
const { getConfig } = require('./config');
const { gradeQuestion, checkTranslation, normalize } = require('./check');
const { lessonQuiz, reviewQuiz, questionById, questionFor, shuffle, seeded } = require('./vocabQuiz');
const { checkWriting } = require('./writingCheck');
const placementQuestions = require('./content/placement');
const { dayKey, startOfDay } = require('../rewards/config/constants');
const { safeRecordActivity } = require('../rewards/services/activityService');
const { languages, infoOf, languageOf, localize, localizePlacement, skipsOf } = require('./languages');
const { courses, courseOf, courseInfo, courseCodes, build } = require('./courses');
const reviews = require('./reviews');
/** The lessons of the student's course: all of them, but those their language leaves out (an English speaker's translation). */
const forStudent = (lessons, progress) => { const skip = courseOf(progress) === 'en' ? skipsOf(languageOf(progress)) : []; return skip.length ? lessons.filter((l) => !skip.includes(l.module)) : lessons; };
/** The lessons of the course the student is on. */
const lessonsFor = async (progress) => forStudent(await publishedLessons(courseOf(progress)), progress);
/** A lesson as the student sees it: a course lesson made whole, an English one in their language. */
const serve = (doc, progress) => (doc?.review ? reviews.build(doc, languageOf(progress)) : doc?.course ? build(doc, languageOf(progress)) : localize(doc, languageOf(progress)));
/** Levels and certificates belong to a course (one from before courses is English's). */
const inCourse = (x, course) => (x.course || 'en') === course;
/** Where the student starts in their course: the placement test's level (English), or the level chosen. */
const placedLevel = (progress) => (courseOf(progress) === 'en' ? progress.placement?.level : progress.courseStart?.[courseOf(progress)]) || null;

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

/* ── What is open ─────────────────────────────────────────────────────── */

// A module's lessons at a level, in sequences: one per translation direction,
// one for everything else.
const sequences = (lessons) => {
    const by = new Map();
    for (const l of lessons) { const k = l.module === 'translation' ? l.direction || '' : ''; if (!by.has(k)) by.set(k, []); by.get(k).push(l); }
    return [...by.values()];
};

/**
 * For every published lesson: whether it is open, and its status. And for
 * every module, which levels are open.
 */
const access = (lessons, progress) => {
    const placed = placedLevel(progress) ? lvl(placedLevel(progress)) : 0;
    const lessonOpen = new Map();
    const levelOpen = {};
    for (const m of MODULES) {
        levelOpen[m] = {};
        for (let i = 0; i < LEVELS.length; i++) {
            const all = lessons.filter((l) => l.module === m && l.level === LEVELS[i]);
            const at = all.filter((l) => !l.review);
            const below = i > 0 ? lessons.filter((l) => l.module === m && l.level === LEVELS[i - 1] && !l.review) : [];
            const open = i === 0 || i <= placed || (below.length ? below.every((l) => isDone(progress, l._id)) : levelOpen[m][LEVELS[i - 1]]);
            levelOpen[m][LEVELS[i]] = open;
            for (const seq of sequences(at)) {
                seq.forEach((l, j) => {
                    const started = !!lessonEntry(progress, l._id);
                    lessonOpen.set(idOf(l._id), started || (open && (j === 0 || isDone(progress, seq[j - 1]._id))));
                });
            }
            // The level's reviews (reviews.js), one after another, once the unit's lessons at the level are done.
            const unitDone = at.every((l) => isDone(progress, l._id));
            all.filter((l) => l.review).forEach((l, j, rev) => {
                lessonOpen.set(idOf(l._id), !!lessonEntry(progress, l._id) || (open && unitDone && (j === 0 || isDone(progress, rev[j - 1]._id))));
            });
        }
    }
    return { lessonOpen, levelOpen };
};

/** The student's English level now: the placement level, moved up past every completed level. */
const currentLevel = (lessons, progress) => {
    let i = placedLevel(progress) ? lvl(placedLevel(progress)) : 0;
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
    id: q.id, type: q.type, prompt: q.prompt, ...(q.hint ? { hint: q.hint } : {}),
    ...(q.options ? { options: mixed(q.options, `${seed}:${q.id}`) } : {}),
    ...(q.words ? { words: tiles(q.words, q.answer, `${seed}:${q.id}`) } : {}),
    // A listening question: what to play (the word is spoken, so it is sent), and its meaning for one who cannot hear it.
    ...(q.kind === 'listen' ? { say: q.say, sayLang: q.sayLang, audio: q.audio || null, meaning: q.meaning } : {})
});
const quizOf = (lesson) => {
    if (lesson.module !== 'vocabulary') return lesson.quiz || [];
    // A level's word review asks ten of its words; its listening review, eight, by sound.
    if (lesson.review === 'words') return reviewQuiz(lesson.words, idOf(lesson._id), 10);
    if (lesson.review === 'listen') return reviewQuiz(lesson.words, idOf(lesson._id), 8, ['listen']);
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

const publicLesson = (lesson, entry, config) => {
    const seed = idOf(lesson._id);
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
    if (lesson.module === 'grammar') out.practice = (lesson.practice || []).map((q) => publicQuestion(q, seed));
    if (lesson.module === 'reading') {
        out.writing = (lesson.writing || []).map((t) => ({ id: t.id, type: t.type, prompt: t.prompt, minWords: t.minWords || 0, mustInclude: t.mustInclude || [], checklist: t.checklist || [], ...(t.words ? { words: tiles(t.words, t.answer, `${seed}:${t.id}`) } : {}) }));
    }
    if (lesson.module === 'speaking') out.speaking = lesson.speaking || {};
    // A review's items each carry their own direction (it mixes both).
    const way = (it) => (it.direction ? { direction: it.direction } : {});
    if (lesson.module === 'translation') out.items = (lesson.items || []).map((it) => ({ id: it.id, kind: it.kind, topic: it.topic, source: it.source, open: !!it.open, bank: bankFor(it, lesson), ...way(it) }));
    out.quiz = lesson.module === 'translation'
        ? (lesson.quiz || []).map((it) => ({ id: it.id, kind: it.kind, topic: it.topic, source: it.source, type: 'translation', bank: bankFor(it, lesson), ...way(it) }))
        : quizOf(lesson).map((q) => publicQuestion(q, seed));
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
    if (section === 'quiz') return lesson.module === 'vocabulary' ? questionById(lesson.words || [], id, idOf(lesson._id)) : (lesson.quiz || []).find((q) => q.id === id);
    if (section === 'items') return (lesson.items || []).find((q) => q.id === id);
    if (section === 'spell' || section === 'vocab') return questionById(lesson.words || [], id, idOf(lesson._id));
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
    let submission = null;
    if (out.verdict === 'review') {
        // A passage: kept for a teacher, never marked wrong by the machine.
        submission = await submit(user, lesson, { taskId: q.id, kind: 'translation', taskType: 'paragraph translation', prompt: q.source, answer: given, model: q.model, autoFeedback: [] });
    } else {
        noteMistake(progress, { lesson, section, qid: q.id, kind: lesson.module === 'translation' ? 'translation' : section === 'spell' ? 'word' : 'question', prompt: q.source || q.prompt, given, correct: out.correct });
        if (out.correct && lesson.module === 'translation') events = (await pay(user._id, 'linguistic_translation', `${idOf(lesson._id)}:${q.id}`)).events;
    }
    await progress.save();
    await saveAttempt(user._id, lesson, 'check', { score: out.correct ? 1 : 0, total: 1, passed: !!out.correct, detail: { section, id: q.id, given: String(given).slice(0, 1500), correct: out.correct, verdict: out.verdict } });
    return { ...out, events, submission: submission ? { id: idOf(submission._id), status: submission.status } : null };
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

    const events = [];
    if (passed) events.push(...(await pay(user._id, 'linguistic_lesson', `lesson:${idOf(lesson._id)}`, { module: lesson.module, level: lesson.level })).events);
    if (percent === 100) events.push(...(await pay(user._id, 'linguistic_perfect', `perfect:${idOf(lesson._id)}`)).events);

    const lessons = await lessonsFor(progress);
    const level = passed ? await checkLevel(user, progress, lesson.level, lessons, config) : { events: [], certificate: null };
    events.push(...level.events);
    await progress.save();
    await saveAttempt(user._id, lesson, 'quiz', { score, total, passed, detail: results.map((r) => ({ id: r.id, given: r.given, correct: r.correct })) });

    const { lessonOpen } = access(lessons, progress);
    const next = passed ? nextIn(lessons, progress, lessonOpen, lesson.module) : null;
    return {
        score, total, percent, passed, passingScore: config.passingScore[lesson.level], firstPass: passed && !wasDone, bestScore: e.bestScore,
        results, next: next ? { id: idOf(next._id), title: next.title, level: next.level } : null,
        certificate: level.certificate ? { level: level.certificate.level, number: level.certificate.number } : null,
        events
    };
};

/* ── Writing and speaking ─────────────────────────────────────────────── */

const submit = async (user, lesson, fields) => {
    // An answer still waiting for review is replaced; once reviewed, a new one starts.
    const open = await LinguisticSubmission.findOne({ userId: user._id, lessonId: lesson._id, taskId: fields.taskId, status: 'pending' });
    const data = { ...fields, answer: String(fields.answer).slice(0, 6000), module: lesson.module, level: lesson.level, organizationId: user.organizationId || null };
    if (open) { Object.assign(open, data); return open.save(); }
    return LinguisticSubmission.create({ userId: user._id, lessonId: lesson._id, ...data });
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
        if (task.type === 'sentence') result = { correct: w.ok, findings: w.findings, model: task.model, words: w.words };
        else {
            const sub = text ? await submit(user, lesson, { taskId, kind: 'writing', taskType: task.type, prompt: task.prompt, answer: text, model: task.model, autoFeedback: w.findings }) : null;
            result = { correct: null, review: true, findings: w.findings, model: task.model, words: w.words, submission: sub ? { id: idOf(sub._id), status: sub.status } : null };
        }
    }
    const progress = await progressOf(user._id);
    touchLesson(progress, lesson, { step: 'practice' });
    await progress.save();
    await saveAttempt(user._id, lesson, 'writing', { score: result.correct ? 1 : 0, total: 1, passed: !!result.correct, detail: { taskId, type: task.type, words: result.words } });
    return result;
};

const saveSpeaking = async (user, lesson, checklist = [], recorded = false) => {
    const items = lesson.speaking?.checklist || [];
    const ticked = items.filter((_, i) => checklist[i] === true).length;
    const progress = await progressOf(user._id);
    touchLesson(progress, lesson, { step: 'practice' });
    await progress.save();
    await saveAttempt(user._id, lesson, 'speaking', { score: ticked, total: items.length, passed: ticked === items.length && items.length > 0, detail: { checklist: items.map((_, i) => checklist[i] === true), recorded: !!recorded } });
    return { ticked, total: items.length, sample: lesson.speaking?.sample || '' };
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

const placementPublic = (lang = 'kn') => placementQuestions.map((x) => localizePlacement(x, lang)).map((q) => ({ id: q.id, band: q.band, type: q.type, prompt: q.prompt, options: mixed(q.options, `placement:${q.id}`) }));

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
    progress.placement = { level, score, total: results.length, bands, takenAt: new Date() };
    progress.lastActiveAt = new Date();
    await progress.save();
    await LinguisticAttempt.create({ userId: user._id, kind: 'placement', score, total: results.length, percent: Math.round((score / results.length) * 100), passed: true, detail: { level, bands }, day: dayKey() });
    const paid = await pay(user._id, 'linguistic_placement', 'placement');
    return { level, score, total: results.length, bands, results, events: paid.events };
};

/* ── Daily vocabulary challenge ───────────────────────────────────────── */

const DAILY_KINDS = ['meaning', 'blank', 'spell', 'synonym', 'antonym'];
/** Today's questions for this student: words from vocabulary lessons at their level. */
const dailyQuestions = async (userId, level, size, lang = 'kn', course = 'en') => {
    const c = course === 'en' ? null : course;
    const fields = 'words seedKey module level course base';
    let pool = await LinguisticLesson.find({ module: 'vocabulary', status: 'published', deletedAt: null, level, course: c, review: null }).select(fields).lean();
    if (!pool.length) pool = await LinguisticLesson.find({ module: 'vocabulary', status: 'published', deletedAt: null, course: c, review: null }).select(fields).lean();
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
    const resumeLesson = progress.lastLessonId && lessons.find((l) => idOf(l._id) === idOf(progress.lastLessonId));
    const resumeEntry = resumeLesson && lessonEntry(progress, resumeLesson._id);
    return {
        level, levelLabel: LEVEL_LABEL[level], placement: progress.placement, ...languageView(progress),
        // Started: a level found by the test or chosen; until then the section asks first.
        started: !!placedLevel(progress), dailyGoal: progress.dailyGoal || DEFAULT_GOAL, goalSet: !!progress.dailyGoal,
        ...courseView(progress),
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
        mistakes: progress.mistakes.filter((m) => !m.resolvedAt).length,
        pendingReviews: pending,
        today: await todayOf(user._id, progress),
        certificateMinAverage: config.certificateMinAverage
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
        const units = MODULES.map((m) => ({
            module: m, label: MODULE_LABEL[m], open: levelOpen[m][l],
            lessons: lessons.filter((x) => x.module === m && x.level === l).map((x) => {
                const e = lessonEntry(progress, x._id);
                return { id: idOf(x._id), title: x.title, summary: x.summary, order: x.order, direction: x.direction || null, open: !!lessonOpen.get(idOf(x._id)), status: e?.status || 'new', bestScore: e?.bestScore ?? null, attempts: e?.attempts || 0 };
            })
        })).filter((u) => u.lessons.length);
        const all = units.flatMap((u) => u.lessons);
        const cert = progress.certificates.find((c) => c.level === l && inCourse(c, courseOf(progress)));
        return {
            level: l, label: LEVEL_LABEL[l], passingScore: config.passingScore[l], open: units.some((u) => u.open),
            total: all.length, completed: all.filter((x) => x.status === 'completed').length,
            complete: progress.levelsCompleted.some((x) => x.level === l && inCourse(x, courseOf(progress))),
            certificate: cert && !cert.hiddenAt ? { number: cert.number, issuedAt: cert.issuedAt } : null, units
        };
    });
    const order = (from) => levels.slice(from).flatMap((s) => s.units.flatMap((u) => u.lessons));
    const next = (xs) => xs.find((x) => x.open && x.status !== 'completed');
    const current = next(order(lvl(level))) || next(order(0)) || null;
    return { level, levelLabel: LEVEL_LABEL[level], placement: progress.placement, ...languageView(progress), ...courseView(progress), current: current ? current.id : null, certificateMinAverage: config.certificateMinAverage, levels };
};

/* ── Starting out (asked 2026-10-23) ──────────────────────────────────── */

const GOALS = [10, 20, 30, 50];
const DEFAULT_GOAL = 30;

/** The student picks their level themselves instead of taking the test: it opens that level as the test would. */
const chooseLevel = async (user, level) => {
    if (!LEVELS.includes(level)) return null;
    const progress = await progressOf(user._id);
    progress.placement = { level, score: null, total: null, bands: null, takenAt: new Date(), chosen: true };
    progress.lastActiveAt = new Date();
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

const REASONS = ['school', 'career', 'people', 'travel', 'fun', 'brain'];
/** Why they are learning, and how much English they said they know (0 new … 4 most topics). */
const setAbout = async (user, { reason, know } = {}) => {
    const k = Number(know);
    if (!REASONS.includes(reason) || !Number.isInteger(k) || k < 0 || k > 4) return null;
    const progress = await progressOf(user._id);
    progress.reason = reason;
    progress.selfRating = k;
    await progress.save();
    return { reason, selfRating: k };
};

/** The course the student is on, and every course there is. */
/** The course the student is on, and every course, with the ones they have begun (to ask where to start in a new one). */
const courseView = (progress) => ({
    course: { ...courseInfo(courseOf(progress)), full: courseOf(progress) === 'en' },
    courses: courses().map((c) => ({ ...c, begun: c.code === 'en' ? !!progress.placement?.level : !!progress.courseStart?.[c.code] }))
});

/**
 * Learn another language (or English again): the course, and for a course
 * other than English, the level to start at (Beginner, or the level they
 * said). Their own language cannot be the course, except English for an
 * English speaker.
 */
const setCourse = async (user, course, start) => {
    if (!courseCodes().includes(course)) return { error: 'That course is not available.' };
    const progress = await progressOf(user._id);
    if (course !== 'en' && course === languageOf(progress)) return { error: 'That is the language you speak. Choose another to learn.' };
    if (start != null && !LEVELS.includes(start)) return { error: 'Choose Beginner, Intermediate or Advanced.' };
    progress.course = course === 'en' ? null : course;
    if (course !== 'en' && (start || !progress.courseStart?.[course])) {
        progress.courseStart = { ...(progress.courseStart || {}), [course]: start || 'beginner' };
        progress.markModified('courseStart');
    }
    progress.lastActiveAt = new Date();
    await progress.save();
    return { ...courseView(progress), started: !!placedLevel(progress) };
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
    checkPractice, submitQuiz, submitWriting, saveSpeaking, placementPublic, submitPlacement, placementLevel, dailyQuestions, rebuildDaily,
    dashboard, moduleView, pathView, forStudent, lessonsFor, serve, setCourse, courseView, placedLevel, inCourse, checkQuizAnswer, bankFor, bankWords, setLanguage, chooseLevel, setGoal, setAbout, GOALS, REASONS, languageView, localize, languageOf, findQuestion, judge, streakOf, pointsOf, lessonEntry, isDone, publicQuestion, quizOf, certificateNumber, checkLevel
};
