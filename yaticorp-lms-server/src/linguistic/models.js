/**
 * Linguistic Ability — the records it keeps.
 *
 *   LinguisticLesson      one lesson of a module at a level, with what to learn,
 *                         the practice, the quiz and their answers. Seeded from
 *                         content/ (seed.js) and edited by administrators.
 *   LinguisticProgress    one per student: placement result, each lesson's
 *                         status and best score, mistakes to revise, levels
 *                         completed and certificates.
 *   LinguisticAttempt     every quiz, check, challenge and test a student takes:
 *                         the history behind scores, streaks and reports.
 *   LinguisticSubmission  an open-ended answer (a paragraph, an email, a letter,
 *                         a paragraph translation) waiting for, or given, a
 *                         teacher's review.
 *
 * Content and answers live only on the server: the student routes send a
 * lesson without its answers and grade what comes back (check.js).
 */
const mongoose = require('mongoose');
const { Schema } = mongoose;

const MODULES = ['vocabulary', 'grammar', 'reading', 'speaking', 'translation'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const DIRECTIONS = ['kn-en', 'en-kn'];

const lessonSchema = new Schema({
    module: { type: String, enum: MODULES, required: true, index: true },
    level: { type: String, enum: LEVELS, required: true, index: true },
    order: { type: Number, default: 1 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    summary: { type: String, default: '', trim: true, maxlength: 300 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    // Translation lessons go one way.
    direction: { type: String, enum: [...DIRECTIONS, null], default: null },
    // What to learn first: intro, points, examples, a passage or a dialogue.
    learn: { type: Schema.Types.Mixed, default: {} },
    // Module-specific practice and test material (validate.js checks the shapes).
    words: { type: Schema.Types.Mixed, default: undefined },      // vocabulary
    practice: { type: Schema.Types.Mixed, default: undefined },   // grammar
    quiz: { type: Schema.Types.Mixed, default: undefined },       // grammar, reading, speaking, translation
    writing: { type: Schema.Types.Mixed, default: undefined },    // reading
    speaking: { type: Schema.Types.Mixed, default: undefined },   // speaking
    items: { type: Schema.Types.Mixed, default: undefined },      // translation
    // A seeded lesson's key: the seed adds a lesson once and never again, so an
    // administrator's edits (or deletion) stand.
    seedKey: { type: String, default: null },
    // A lesson of another language's course (courses.js): the language taught, and the
    // English course lesson its words and sentences come from. null = the English course.
    course: { type: String, default: null, index: true },
    base: { type: String, default: null },
    // A review lesson made from its level's lessons (reviews.js): 'words', 'listen', 'sentences' or 'checkpoint'.
    review: { type: String, default: null },
    // Deleted lessons are kept, hidden, so students' history still points somewhere.
    deletedAt: { type: Date, default: null },
    updatedBy: { type: String, default: '' }
}, { timestamps: true, minimize: false });
lessonSchema.index({ seedKey: 1 }, { unique: true, partialFilterExpression: { seedKey: { $type: 'string' } } });
lessonSchema.index({ module: 1, level: 1, order: 1 });

const lessonProgressSchema = new Schema({
    lessonId: { type: Schema.Types.ObjectId, ref: 'LinguisticLesson', required: true },
    module: String,
    level: String,
    status: { type: String, enum: ['started', 'completed'], default: 'started' },
    // Where the student stopped, so the lesson opens there again.
    step: { type: String, enum: ['learn', 'practice', 'quiz', 'done'], default: 'learn' },
    bestScore: { type: Number, default: null },    // percent
    lastScore: { type: Number, default: null },
    attempts: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
    updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const mistakeSchema = new Schema({
    // What to ask again: the lesson and the question in it (or a daily word).
    lessonId: { type: Schema.Types.ObjectId, ref: 'LinguisticLesson' },
    section: { type: String, enum: ['practice', 'quiz', 'items', 'vocab', 'spell', 'daily'], required: true },
    qid: { type: String, required: true },
    module: String,
    level: String,
    kind: { type: String, enum: ['question', 'word', 'translation'], default: 'question' },
    prompt: { type: String, default: '' },          // shown in the list
    given: { type: String, default: '' },
    count: { type: Number, default: 1 },
    lastAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null }
});

const progressSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    placement: {
        // `chosen`: the student picked their level themselves instead of taking the test (asked 2026-10-23).
        type: new Schema({ level: { type: String, enum: LEVELS }, score: Number, total: Number, bands: Schema.Types.Mixed, takenAt: Date, chosen: { type: Boolean, default: false } }, { _id: false }),
        default: null
    },
    lessons: { type: [lessonProgressSchema], default: [] },
    mistakes: { type: [mistakeSchema], default: [] },
    // `course`: the language course (missing = English, from before there were others).
    levelsCompleted: { type: [{ level: String, completedAt: Date, average: Number, course: String, _id: false }], default: [] },
    certificates: { type: [{ level: String, number: String, issuedAt: Date, average: Number, course: String, hiddenAt: { type: Date, default: null }, _id: false }], default: [] },
    lastLessonId: { type: Schema.Types.ObjectId, ref: 'LinguisticLesson', default: null },
    lastActiveAt: { type: Date, default: null },
    // The student's own language, for meanings and translation (languages.js); null = not chosen (Kannada).
    language: { type: String, enum: [...require('./languages').CODES, null], default: null },
    // XP a day the student means to earn here (10, 20, 30 or 50); null = not set (30 is shown).
    dailyGoal: { type: Number, default: null },
    // From the start screens: why they are learning, and how much they said they know (0 new … 4 fluent).
    reason: { type: String, default: '' },
    // The course being learnt (null = English), and where each other course was started.
    course: { type: String, default: null },
    courseStart: { type: Schema.Types.Mixed, default: {} },
    selfRating: { type: Number, default: null, min: 0, max: 4 }
}, { timestamps: true });

const attemptSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'LinguisticLesson', default: null },
    module: { type: String, default: '' },
    level: { type: String, default: '' },
    kind: { type: String, enum: ['quiz', 'check', 'placement', 'daily', 'review', 'writing', 'speaking'], required: true },
    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    percent: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    // The answers and what they were judged, for the history and reports.
    detail: { type: Schema.Types.Mixed, default: undefined },
    // The student's day (Asia/Kolkata, like the rest of the platform), for streaks.
    day: { type: String, required: true }
}, { timestamps: true });
attemptSchema.index({ userId: 1, createdAt: -1 });
attemptSchema.index({ userId: 1, day: 1 });
attemptSchema.index({ lessonId: 1, kind: 1 });

const submissionSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Copied from the student, so a college coordinator sees their own students' work.
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'LinguisticLesson', required: true },
    module: String,
    level: String,
    taskId: { type: String, required: true },
    kind: { type: String, enum: ['writing', 'translation'], required: true },
    taskType: { type: String, default: '' },        // paragraph, email, letter, or a paragraph translation
    prompt: { type: String, default: '' },
    answer: { type: String, required: true, maxlength: 6000 },
    model: { type: String, default: '' },
    autoFeedback: { type: [{ kind: String, text: String, _id: false }], default: [] },
    status: { type: String, enum: ['pending', 'reviewed'], default: 'pending', index: true },
    score: { type: Number, default: null },          // 0–100, from the teacher
    comment: { type: String, default: '', maxlength: 2000 },
    reviewedBy: { type: new Schema({ id: String, name: String, role: String }, { _id: false }), default: null },
    reviewedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = {
    LinguisticLesson: mongoose.model('LinguisticLesson', lessonSchema, 'linguistic_lessons'),
    LinguisticProgress: mongoose.model('LinguisticProgress', progressSchema, 'linguistic_progress'),
    LinguisticAttempt: mongoose.model('LinguisticAttempt', attemptSchema, 'linguistic_attempts'),
    LinguisticSubmission: mongoose.model('LinguisticSubmission', submissionSchema, 'linguistic_submissions'),
    MODULES, LEVELS, DIRECTIONS
};
