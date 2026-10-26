/**
 * Linguistic Ability — how a session is put together, as plain data: the
 * screens (steps) a lesson becomes, the answer each screen gives, the hearts a
 * quiz allows, and what the sheet under a checked answer says. The session
 * (Session.jsx) and the screens (exercises.jsx) only draw these.
 *
 * A step: { key, part, kind, ... }
 *   part   learn | practice | quiz | intro
 *   kind   notes | words | passage | dialogue | intro      read, then CONTINUE
 *          pairs                                         match the pairs; done when all are matched
 *          question | translate | write | speak          answer, then CHECK
 */
import { tr, line, praiseIn } from '../say';

const PAIR_ROUND = 4;

/** Rounds of matching pairs: four words at a time, no round of one. */
const pairRounds = (words) => {
    const rounds = [];
    for (let i = 0; i < words.length; i += PAIR_ROUND) rounds.push(words.slice(i, i + PAIR_ROUND));
    if (rounds.length > 1 && rounds[rounds.length - 1].length < 2) rounds[rounds.length - 2].push(...rounds.pop());
    return rounds;
};

/** Three words spread through the list, to spell. */
const spellPicks = (words) => {
    const n = Math.min(3, words.length);
    return [...new Set(Array.from({ length: n }, (_, k) => Math.floor((k * words.length) / n)))];
};

/**
 * The fewest right answers that still pass, as the server counts it
 * (percent rounded, then compared with the pass mark).
 */
export const needToPass = (total, pass) => {
    for (let s = 0; s <= total; s++) if (Math.round((s / total) * 100) >= pass) return s;
    return total;
};
/** Hearts for a quiz: one more than the wrong answers that still pass, so losing the last one means the pass is out of reach. */
export const heartsFor = (total, pass) => (total ? total - needToPass(total, pass) + 1 : 0);

/** A lesson as its screens, in the order of the lesson flow: learn → practise → quiz. */
export const buildLesson = (lesson) => {
    const steps = [];
    const add = (s) => steps.push({ key: `${s.part}-${s.kind}-${steps.length}`, ...s });
    const learn = lesson.learn || {};
    const m = lesson.module;
    // The student's own language: meanings and translations are in it.
    const language = lesson.language || 'kn';
    // The language learnt: English, or a course's (its words are read aloud in it).
    const target = lesson.target || 'en';
    const targetLocale = lesson.targetLocale || 'en-IN';
    // Speak on a topic (Advanced, talks.js on the server): what to cover and useful phrases, then the talk, corrected.
    if (lesson.talk) {
        add({ part: 'learn', kind: 'notes', learn: { intro: learn.intro, points: lesson.talk.points, examples: lesson.talk.phrases }, title: lesson.title });
        add({ part: 'quiz', kind: 'talk', talk: lesson.talk });
        return steps.map((st) => ({ language, target, targetLocale, ...st }));
    }
    if (lesson.languageFallback) {
        add({ part: 'learn', kind: 'intro', mascot: 'thinking', title: 'In Kannada for now',
            text: `This lesson has no ${lesson.languageFallback} version yet, so its meanings and translations are in Kannada.` });
    }

    // Learn the concept.
    if (learn.intro || learn.points?.length || learn.examples?.length || learn.kannadaNote) add({ part: 'learn', kind: 'notes', learn, title: lesson.title });
    // (A level's word review goes straight to the pairs: its words were each learnt in their lesson.)
    if (m === 'vocabulary' && lesson.words?.length && !lesson.review) add({ part: 'learn', kind: 'words', words: lesson.words, language });
    if (m === 'reading' && learn.passage) add({ part: 'learn', kind: 'passage', passage: learn.passage });
    if (m === 'speaking' && learn.dialogue) add({ part: 'learn', kind: 'dialogue', dialogue: learn.dialogue, audio: learn.audio, phrases: learn.phrases || [] });

    // A warm-up on the unit's words (asked 2026-10-24: every lesson mixes its tasks, the Duolingo way):
    // matching pairs, each word heard as it is tapped, before the lesson's own practice.
    if (m !== 'vocabulary' && lesson.warmup?.length >= 2) {
        add({ part: 'practice', kind: 'pairs', words: lesson.warmup.map((w) => ({ ...w, pos: '', example: '' })), language, warmup: true });
    }

    // Practise, with the answer and why after each.
    if (m === 'vocabulary' && lesson.words?.length) {
        pairRounds(lesson.words).forEach((round) => add({ part: 'practice', kind: 'pairs', words: round, language }));
        // Spelling is English's; a course in another language matches and quizzes its words.
        if (!lesson.course) spellPicks(lesson.words).forEach((i) => {
            const w = lesson.words[i];
            add({ part: 'practice', kind: 'question', section: 'spell', retry: true, word: w, language,
                q: { id: `spell:${i}`, type: 'spelling', prompt: tr(language)('Type this word in English'), hint: `${w.word[0]}${'_'.repeat(Math.max(0, w.word.length - 1))} (${line(language, 'lettersCount', w.word.length)})`, kannada: w.kannada, audio: w.audio } });
        });
    }
    if (m === 'grammar') (lesson.practice || []).forEach((q) => add({ part: 'practice', kind: 'question', section: 'practice', retry: true, q }));
    if (m === 'reading') (lesson.writing || []).forEach((task) => add({ part: 'practice', kind: 'write', task }));
    if (m === 'speaking' && lesson.speaking?.prompt) add({ part: 'practice', kind: 'speak', speaking: lesson.speaking });
    // A review's sentences each carry their own direction (it mixes both).
    if (m === 'translation') (lesson.items || []).forEach((item) => add({ part: 'practice', kind: 'translate', section: 'items', retry: !item.open, item, direction: item.direction || lesson.direction, language }));

    // The quiz: it counts, one try per question.
    const quiz = lesson.quiz || [];
    if (quiz.length) {
        add({ part: 'quiz', kind: 'intro', mascot: 'flex-determined', title: tr(language)('Quiz time!'), quiz: true,
            text: line(language, 'quizIntro', quiz.length, lesson.passingScore) });
        const context = m === 'reading' && learn.passage ? { passage: learn.passage } : m === 'speaking' && learn.dialogue ? { dialogue: learn.dialogue } : null;
        quiz.forEach((q) => (q.type === 'translation'
            ? add({ part: 'quiz', kind: 'translate', section: 'quiz', collect: q.id, item: q, direction: q.direction || lesson.direction, language })
            : add({ part: 'quiz', kind: 'question', section: 'quiz', collect: q.id, q, context })));
    }
    return steps.map((st) => ({ language, target, targetLocale, ...st }));
};

/** The words a tile answer is built from. */
export const tilesOf = (step) => (step.kind === 'translate' ? step.item?.bank : step.kind === 'write' ? step.task?.words : step.q?.words) || [];

/** Whether this screen is answered with word tiles (until the student switches to the keyboard). */
export const usesTiles = (step) => (step.kind === 'question' && step.q.type === 'rearrange') || (step.kind === 'write' && step.task.type === 'jumbled') || (step.kind === 'translate' && !!step.item?.bank?.length);

/** A screen's answer before the student does anything. */
export const startValue = (step) => {
    if (step.kind === 'speak') return { ticks: (step.speaking.checklist || []).map(() => false), recorded: false };
    if (usesTiles(step)) return [];
    if (step.kind === 'question' && step.q.type === 'correction') return step.q.prompt;
    return '';
};

/** The answer as the server takes it: tiles (their places in the bank) as words in order; text as typed. */
export const givenOf = (step, value) => {
    if (Array.isArray(value)) { const t = tilesOf(step); return value.map((i) => t[i]).join(' '); }
    if (value && typeof value === 'object') return '';
    return String(value ?? '');
};

/** Can CHECK be pressed yet? */
export const answered = (step, value) => {
    if (step.kind === 'speak') return true;
    if (step.kind === 'pairs') return false;
    if (step.kind === 'question' && step.q.type === 'correction') return givenOf(step, value).trim() && givenOf(step, value).trim() !== String(step.q.prompt).trim();
    return !!givenOf(step, value).trim();
};

export const isInfo = (step) => ['notes', 'words', 'passage', 'dialogue', 'intro'].includes(step?.kind);

/**
 * The sheet under a checked answer: its tone (right, wrong, or info for work
 * that is checked here or self-checked), the title, and what to show.
 */
export const sheetOf = (step, r, n = 0) => {
    // In the student's language (say.js): Kannada for a Kannada speaker.
    const T = tr(step.language);
    const PRAISE = praiseIn(step.language);
    const praise = PRAISE[n % PRAISE.length];
    if (step.kind === 'pairs') return { tone: 'right', title: praise };
    if (step.kind === 'talk') {
        const sum = r.short ? line(step.language, 'talkShort', r.words, r.minWords) : line(step.language, 'talkResult', r.clean, r.total, r.words);
        return { tone: r.passed ? 'right' : 'wrong', title: T(r.passed ? 'Well spoken!' : r.short ? 'Say a little more' : 'Fix these, then speak again'), text: sum, good: r.good, tips: r.tips, model: r.sample, modelLabel: T('Sample answer') };
    }
    if (step.kind === 'speak') {
        return { tone: 'info', title: r.total ? line(step.language, 'ticked', r.ticked, r.total) : T('Saved'), text: r.total && r.ticked === r.total ? T('A full self-check. Well spoken!') : T('Listen to your recording again, and try once more if you like.'), model: r.sample || '', modelLabel: T('Sample answer') };
    }
    if (step.kind === 'write') {
        const tips = (r.findings || []).filter((f) => f.kind === 'tip').map((f) => f.text);
        const good = (r.findings || []).filter((f) => f.kind === 'good').map((f) => f.text);
        // A paragraph, email or letter (2026-10-26): checked here, its grammar corrected above — not sent to a teacher.
        if (r.checked) {
            const clean = r.total > 0 && r.clean === r.total;
            return { tone: clean && !tips.length ? 'right' : 'info', title: T(clean ? 'No grammar mistakes found' : 'Fix the marked words'), text: r.total ? line(step.language, 'writeResult', r.clean, r.total) : '', tips, good };
        }
        if (step.task.type === 'jumbled') return r.correct ? { tone: 'right', title: praise } : { tone: 'wrong', title: T('Correct solution:'), answer: r.model };
        return r.correct ? { tone: 'right', title: T('Good sentence!'), good, model: r.model, modelLabel: T('Another way to say it') } : { tone: 'wrong', title: T('Almost — fix these:'), tips, model: r.model, modelLabel: T('Model answer') };
    }
    if (step.kind === 'translate') {
        if (r.verdict === 'review') return { tone: 'info', title: T('Checked'), text: [r.total ? line(step.language, 'writeResult', r.clean, r.total) : '', T('Compare your translation with the model below.')].filter(Boolean).join(' · '), model: r.answer, modelLabel: T('Model translation') };
        if (r.correct) return r.verdict === 'close' ? { tone: 'right', title: T('Correct — mind the small differences'), answer: r.answer, diff: r.diff, explanation: r.explanation } : { tone: 'right', title: praise, explanation: r.explanation, also: r.accepted?.length ? r.answer : '' };
        return { tone: 'wrong', title: r.verdict === 'almost' ? T('Almost there! Correct solution:') : T('Correct solution:'), answer: r.answer, diff: r.diff, explanation: r.explanation };
    }
    if (r.correct) return { tone: 'right', title: praise, explanation: r.explanation };
    return { tone: 'wrong', title: r.near ? T('Nearly — check the spelling:') : T('Correct solution:'), answer: r.answer, explanation: r.explanation };
};

/** "1:05" from milliseconds. */
export const clock = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/** XP in a list of reward events. */
export const xpIn = (events) => (events || []).filter((e) => e.kind === 'xp').reduce((a, e) => a + (Number(e.amount) || 0), 0);
