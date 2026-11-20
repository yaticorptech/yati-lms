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
import { ticksOf, needOf, wordCount, canTranscribe } from '../parts/speakTicks';

const PAIR_ROUND = 4;

/** Rounds of matching pairs: four words at a time, no round of one. */
const pairRounds = (words) => {
    const rounds = [];
    for (let i = 0; i < words.length; i += PAIR_ROUND) rounds.push(words.slice(i, i + PAIR_ROUND));
    if (rounds.length > 1 && rounds[rounds.length - 1].length < 2) rounds[rounds.length - 2].push(...rounds.pop());
    return rounds;
};

/** Three words spread through the list, to spell. */
// One word to write in the practice (2026-11-12, the user: "a few practice questions, more in the quiz"; was three).
const spellPicks = (words) => {
    const n = Math.min(1, words.length);
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
    // (A level's word review goes straight to the pairs: its words were each learnt in their lesson. So does a Letters
    // lesson, 2026-10-31: its letters were each seen and heard on the Letters chart, "don't give them again".)
    const letters = lesson.review === 'letters';
    // A unit's "More words" (2026-11-14) teaches new words: its cards first, like a Words lesson.
    if (m === 'vocabulary' && lesson.words?.length && (!lesson.review || lesson.review === 'more')) add({ part: 'learn', kind: 'words', words: lesson.words, language });
    if (m === 'reading' && learn.passage) add({ part: 'learn', kind: 'passage', passage: learn.passage });
    // A picture story (Advanced, 2026-10-31): its comic page.
    if (lesson.comic) add({ part: 'learn', kind: 'comic', comic: lesson.comic });
    if (m === 'speaking' && learn.dialogue) add({ part: 'learn', kind: 'dialogue', dialogue: learn.dialogue, audio: learn.audio, phrases: learn.phrases || [] });

    // A warm-up on the unit's words (asked 2026-10-24: every lesson mixes its tasks, the Duolingo way):
    // matching pairs, each word heard as it is tapped, before the lesson's own practice.
    if (m !== 'vocabulary' && lesson.warmup?.length >= 2) {
        add({ part: 'practice', kind: 'pairs', words: lesson.warmup.map((w) => ({ ...w, pos: '', example: '' })), language, warmup: true });
    }

    // Practise, with the answer and why after each.
    if (m === 'vocabulary' && lesson.words?.length) {
        // Matching pairs once a unit (2026-10-29): in its Words lesson (and a level's word review), not again in the
        // unit's review or its listening stop.
        // A Letters lesson whose letters each have a word (English, 2026-10-31): "A for 🍎 apple" cards; then (asked the
        // same day, "after this, give the match the following") each letter matched to its word and picture, not its sound.
        // In Kannada and Hindi too, a few letters have no word (ಙ, ಞ …): they are matched to their sounds, as before.
        const worded = letters ? lesson.words.filter((w) => w.for) : [];
        if (letters && lesson.twins) {
            // Two consonants with their vowel signs (2026-11-13, the user: "add the kha letter also, the same as the ಕ
            // cards, then mixed questions"): every syllable on the cards, the first consonant's then the other's (one with
            // no word shows its sound); then a few matches, each syllable beside its twin (ಕಾ ಖಾ) — the quiz asks more.
            const half = lesson.words.slice(0, Math.ceil(lesson.words.length / 2));
            const twinPairs = half.map((w) => [w, lesson.words.find((x) => x.word === w.twin)].filter(Boolean));
            const spread = (list, n) => (list.length <= n ? list : Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]));
            add({ part: 'learn', kind: 'letterWords', words: lesson.words, language });
            // Matched to their words only (2026-11-13, the user's "ಚೃ — chru" screen: "if that letter has words, give the
            // words; don't give it like this"): a syllable with no word is not matched to its sound.
            const both = spread(twinPairs.filter((p) => p.length === 2 && p.every((w) => w.for)), 4).flat();
            const matched = both.length >= 4 ? both : spread(worded, 8);
            if (matched.length >= 2) pairRounds(matched.map((w) => ({ ...w, kannada: `${w.pic} ${w.for}` }))).forEach((round) => add({ part: 'practice', kind: 'pairs', words: round, language, letterWords: true }));
        } else if (worded.length) {
            add({ part: 'learn', kind: 'letterWords', words: worded, language });
            pairRounds(worded.map((w) => ({ ...w, kannada: `${w.pic} ${w.for}` }))).forEach((round) => add({ part: 'practice', kind: 'pairs', words: round, language, letterWords: true }));
            const bySound = lesson.words.filter((w) => !w.for);
            if (bySound.length >= 2) pairRounds(bySound).forEach((round) => add({ part: 'practice', kind: 'pairs', words: round, language }));
        } else if (!['unit', 'hear'].includes(lesson.review)) pairRounds(lesson.words).forEach((round) => add({ part: 'practice', kind: 'pairs', words: round, language }));
        // Write the word, its picture beside (2026-11-06, the user: "make this question in every language"): English's words
        // and, since then, a course's too, in its own letters (or as they sound in English letters).
        if (!letters) spellPicks(lesson.words).forEach((i) => {
            const w = lesson.words[i];
            add({ part: 'practice', kind: 'question', section: 'spell', retry: true, word: w, language,
                q: { id: `spell:${i}`, type: 'spelling', prompt: tr(language)('Type this word in English'), kannada: w.kannada, audio: w.audio, pic: w.pic || null, writeIn: lesson.course ? lesson.target : 'en',
                    ...(lesson.course ? {} : { hint: `${w.word[0]}${'_'.repeat(Math.max(0, w.word.length - 1))} (${line(language, 'lettersCount', w.word.length)})` }) } });
        });
    }
    // Choose the picture (2026-11-13, the user's "Select the correct picture for “사슴”"): a Words lesson's warm-up on a new word.
    (lesson.sees || []).forEach((q) => add({ part: 'practice', kind: 'question', section: 'see', retry: true, q, language }));
    if (m === 'grammar') (lesson.practice || []).forEach((q) => add({ part: 'practice', kind: 'question', section: 'practice', retry: true, q }));
    if (m === 'reading') {
        // Taught before it is asked (2026-11-16, the user: "first you should teach the user before asking this kind of
        // question… then related questions so they can fill it"): how an email, a letter or a paragraph is written (once a
        // lesson for each kind), then a few questions on this task, then the task.
        const taught = new Set();
        (lesson.writing || []).forEach((task) => {
            const guide = lesson.writeGuides?.[task.type];
            if (guide && !taught.has(task.type)) { taught.add(task.type); add({ part: 'practice', kind: 'writeGuide', guide, language }); }
            (task.asks || []).forEach((q) => add({ part: 'practice', kind: 'question', section: 'writeguide', retry: true, q, language }));
            add({ part: 'practice', kind: 'write', task });
        });
    }
    if (m === 'speaking' && lesson.speaking?.prompt) add({ part: 'practice', kind: 'speak', speaking: lesson.speaking });
    // A review's sentences each carry their own direction (it mixes both).
    // Two sentences to translate in the practice (2026-11-12, "a few practice questions"; was all four) — a passage
    // (an open item, Advanced) always.
    if (m === 'translation') (lesson.items || []).filter((item, k, all) => item.open || all.filter((x) => !x.open).indexOf(item) < 2)
        .forEach((item) => add({ part: 'practice', kind: 'translate', section: 'items', retry: !item.open, item, direction: item.direction || lesson.direction, language }));
    // Fill in the blanks (2026-11-05), tap what you hear (2026-11-06), complete the conversation (2026-11-07) and the
    // picture cards (2026-11-12) are asked in the quiz since 2026-11-12 (the user: "more quiz questions than practice"):
    // the server puts them in lesson.quiz; lesson.blanks, hears, chats and pictures are not asked here any more.
    // Say this sentence (2026-11-06): where the browser can write down what is said; elsewhere (Firefox) left out, not stuck on.
    if (canTranscribe()) (lesson.sayits || []).forEach((q) => add({ part: 'practice', kind: 'sayit', q, language }));

    // The quiz: it counts, one try per question.
    const quiz = lesson.quiz || [];
    if (quiz.length) {
        add({ part: 'quiz', kind: 'intro', mascot: 'flex-determined', title: tr(language)('Quiz time!'), quiz: true,
            text: line(language, 'quizIntro', quiz.length, lesson.passingScore, rightNeeded(quiz.length, lesson.passingScore)) });
        const context = lesson.comic ? { comic: lesson.comic } : m === 'reading' && learn.passage ? { passage: learn.passage } : m === 'speaking' && learn.dialogue ? { dialogue: learn.dialogue } : null;
        quiz.forEach((q) => (q.type === 'translation'
            ? add({ part: 'quiz', kind: 'translate', section: 'quiz', collect: q.id, item: q, direction: q.direction || lesson.direction, language })
            : add({ part: 'quiz', kind: 'question', section: 'quiz', collect: q.id, q, context })));
    }
    return steps.map((st) => ({ language, target, targetLocale, ...st }));
};

/** The words a tile answer is built from. */
export const tilesOf = (step) => (step.kind === 'translate' ? step.item?.bank : step.kind === 'write' ? step.task?.words : step.q?.words) || [];

/** Whether this screen is answered with word tiles (until the student switches to the keyboard). */
export const usesTiles = (step) => (step.kind === 'question' && ['rearrange', 'blanks', 'hear', 'letters'].includes(step.q.type)) || (step.kind === 'write' && step.task.type === 'jumbled') || (step.kind === 'translate' && !!step.item?.bank?.length);

/** A screen's answer before the student does anything. */
export const startValue = (step) => {
    if (step.kind === 'speak') return { said: '', seconds: 0, recorded: false };
    if (usesTiles(step)) return [];
    if (step.kind === 'question' && step.q.type === 'correction') return step.q.prompt;
    return '';
};

/** The answer as the server takes it: tiles (their places in the bank) as words in order; text as typed. */
export const givenOf = (step, value) => {
    // A sentence filled in: each box's word, in order (an empty box, nothing).
    if (step.kind === 'question' && step.q?.type === 'blanks') { const t = tilesOf(step); return Array.isArray(value) ? value.map((i) => (Number.isInteger(i) ? t[i] : '')).join(' ').trim() : ''; }
    if (Array.isArray(value)) { const t = tilesOf(step); return value.map((i) => t[i]).join(' '); }
    if (value && typeof value === 'object') return '';
    return String(value ?? '');
};

/** A paragraph, email or letter: three sentences or more (2026-10-28). */
export const OPEN_WRITING = ['paragraph', 'email', 'letter'];
export const LEAST_SENTENCES = 3;
/** Its sentences: each ends with a full stop (or ? or !) and has two words or more — as the server counts them (writingCheck.js). */
export const sentenceCount = (text) => (String(text || '').match(/[^.!?\n]+[.!?]+/g) || []).filter((s) => wordCount(s) >= 2).length;

/** Can CHECK be pressed yet? */
export const answered = (step, value) => {
    // A speaking task is answered by voice (2026-10-28: "don't give a tick option manually"): recorded, five words
    // or more said, and half the checklist or more ticked by itself from what was said (speakTicks.js).
    if (step.kind === 'speak') return !!value?.recorded && wordCount(value.said) >= 5 && ticksOf(step.speaking, value.said, value.seconds).filter(Boolean).length >= needOf(step.speaking);
    if (step.kind === 'pairs' || step.kind === 'sayit') return false;
    // Every box filled.
    if (step.kind === 'question' && step.q.type === 'blanks') return Array.isArray(value) && value.filter((i) => Number.isInteger(i)).length === step.q.parts.filter((p) => p === null).length;
    // "Write at least three sentences, otherwise don't go to the next question" (2026-10-28).
    if (step.kind === 'write' && OPEN_WRITING.includes(step.task.type)) return sentenceCount(value) >= LEAST_SENTENCES;
    if (step.kind === 'question' && step.q.type === 'correction') return givenOf(step, value).trim() && givenOf(step, value).trim() !== String(step.q.prompt).trim();
    return !!givenOf(step, value).trim();
};

export const isInfo = (step) => ['notes', 'words', 'passage', 'comic', 'letterWords', 'dialogue', 'intro', 'practiceReview', 'writeGuide'].includes(step?.kind);

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
        return { tone: 'info', title: r.total ? line(step.language, 'ticked', r.ticked, r.total) : T('Saved'), text: r.total && r.ticked === r.total ? T('Well spoken!') : T('Listen to your recording again, and try once more if you like.'), model: r.sample || '', modelLabel: T('Sample answer') };
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
/**
 * How many right answers finish a quiz of `n` at `pass` % (2026-11-16, the user, of "Get 65% or more": "what is that?" —
 * "12 questions. Get 8 or more right (65%)"): the fewest whose percent, rounded as the server rounds it, reaches the mark.
 */
export const rightNeeded = (n, pass) => {
    for (let k = 0; k <= n; k++) if (Math.round((k * 100) / Math.max(1, n)) >= pass) return k;
    return n;
};

/** XP by what it was for ({ linguistic_lesson: 20, … }), added to `into` (2026-11-06). */
export const xpBy = (events, into = {}) => { for (const e of events || []) if (e?.kind === 'xp' && e.amount) into[e.source || 'other'] = (into[e.source || 'other'] || 0) + e.amount; return into; };
export const xpIn = (events) => (events || []).filter((e) => e.kind === 'xp').reduce((a, e) => a + (Number(e.amount) || 0), 0);

/*
 * Say this sentence (2026-11-06): whether what the browser heard is the sentence — every word of it that carries the
 * meaning there (a small one, "a" or "the", may slip), in any case, without its marks, a number said or written ("six" / "6"); Chinese and Japanese, written
 * without spaces, by their letters. The words heard, not how each sound was made: the browser cannot tell that.
 */
const NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
// Hindi spellings the browser writes either way (2026-11-17: "मैं विद्यार्थी हूं" heard for "हूँ"): chandrabindu as
// anusvara, and no nukta (ज़ = ज), so the same words said match.
const devanagari = (t) => t.replace(/\u0901/g, '\u0902').replace(/\u093C/g, '');
const plain = (t) => devanagari(String(t || '').toLowerCase().normalize('NFKC')).replace(/[\p{P}\p{S}]+/gu, ' ').split(/\s+/).filter(Boolean).map((w) => (/^\d+$/.test(w) && NUMBERS[Number(w)] ? NUMBERS[Number(w)] : w));
export const saidRight = (heard, sentence, locale = 'en') => {
    const want = plain(sentence), got = plain(heard);
    if (!want.length || !got.length) return false;
    if (/^(zh|ja)/.test(locale)) {
        const a = [...want.join('')], b = [...got.join('')];
        const left = [...b];
        const found = a.filter((c) => { const k = left.indexOf(c); if (k === -1) return false; left.splice(k, 1); return true; }).length;
        return found / a.length >= 0.85 && b.length <= a.length + 3;
    }
    const left = [...got];
    const missed = want.filter((w) => { const k = left.indexOf(w); if (k === -1) return true; left.splice(k, 1); return false; });
    // Every word that carries the meaning heard ("a dog and a cat" is not "a dog and a rabbit"); a small one (a, the) may slip.
    return missed.every((w) => [...w].length < 3) && missed.length <= Math.max(1, Math.floor(want.length / 5)) && got.length <= want.length + 3;
};
