/**
 * The teacher side of YATICORP: its own accounts and its own research records.
 *
 * Teachers are a separate collection, not students with a flag: every student
 * list, leaderboard, report and Career Path query reads `users`, and a teacher
 * must never turn up in any of them. They sign in with a card exactly as
 * students do — the same cards, the same one-card-one-account rule — and the
 * token says `role: 'teacher'` (see auth.js, protectTeacher).
 */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const { Schema } = mongoose;
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$/;
const hashPassword = async (plain) => bcrypt.hash(String(plain), await bcrypt.genSalt(10));

const TEACHER_STATUSES = ['active', 'inactive', 'pending'];

/* ── Questionnaires (Research Methodologies → Questionnaire builder) ──── */

// Kept inside the teacher's own record, not a collection of their own: the
// database cluster is at its limit of collections (asked 2026-10-27; a new
// collection was refused). The limits in questionnaire.js keep 20 of them
// well inside one record.

// 'section' is a heading that groups the questions after it; it is not asked.
const QUESTION_TYPES = ['likert', 'single', 'multiple', 'yesno', 'short', 'long', 'section'];
const LIKERT_SCALES = ['agreement', 'frequency', 'satisfaction', 'importance', 'likelihood'];

const questionSchema = new Schema({
    type: { type: String, enum: QUESTION_TYPES, default: 'likert' },
    text: { type: String, default: '', maxlength: 500 },
    options: { type: [String], default: [] },          // 'single' and 'multiple' only
    scale: { type: String, enum: LIKERT_SCALES, default: 'agreement' },
    points: { type: Number, enum: [5, 7], default: 5 }
});

const questionnaireSchema = new Schema({
    title: { type: String, required: true, trim: true, maxlength: 200 },
    intro: { type: String, default: '', maxlength: 2000 },
    questions: [questionSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

/* ── Teacher ───────────────────────────────────────────────────────────── */

const teacherSchema = new Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    cardNumber: { type: String, required: true, unique: true, set: (v) => (v == null ? v : String(v).trim()) },
    password: { type: String, required: true },
    // 'pending' while the admin's approval is switched on and not yet given
    // (Setting.teacherApprovalRequired); 'inactive' is blocked or turned down.
    status: { type: String, enum: TEACHER_STATUSES, default: 'active' },
    statusReason: { type: String, trim: true, default: '', maxlength: 500 },
    // Who made the account: the teacher at sign-up, the admin, or their organization.
    createdBy: { type: String, enum: ['self', 'admin', 'organization'], default: 'self' },
    // The college or school the teacher belongs to, as for students (User.organizationId).
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    organizationJoinedAt: { type: Date, default: null },
    institution: { type: String, trim: true, default: '' },
    department: { type: String, trim: true, default: '' },
    designation: { type: String, trim: true, default: '' },
    researchArea: { type: String, trim: true, default: '' },
    // A photo (uploaded, cropped round) or one of the app's avatars; optional.
    profilePicture: { type: String, default: '' },
    // Independent Writing's daily target, in words.
    dailyWordGoal: { type: Number, default: 500, min: 50, max: 20000 },
    loginCount: { type: Number, default: 0 },
    lastLoginAt: Date,
    passwordChangedAt: Date,
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpiry: { type: Date, select: false },
    // Not read with the account (every request loads it): only the
    // questionnaire routes ask for them.
    questionnaires: { type: [questionnaireSchema], select: false, default: undefined }
}, { timestamps: true });

teacherSchema.pre('save', async function () {
    if (!this.isModified('password') || BCRYPT_HASH.test(this.password || '')) return;
    this.password = await hashPassword(this.password);
});

teacherSchema.methods.matchPassword = async function (entered) {
    if (typeof entered !== 'string' || !entered || typeof this.password !== 'string') return false;
    return bcrypt.compare(entered, this.password);
};

/** Signed in before the password last changed: that session is over. */
teacherSchema.methods.tokenPredatesPassword = function (iat) {
    if (!this.passwordChangedAt || typeof iat !== 'number') return false;
    return iat * 1000 < this.passwordChangedAt.getTime() - 1000;
};

teacherSchema.statics.hashPassword = hashPassword;

/* ── Research Path ─────────────────────────────────────────────────────── */

const taskSchema = new Schema({
    text: { type: String, required: true, trim: true, maxlength: 300 },
    done: { type: Boolean, default: false },
    doneAt: Date,
    custom: { type: Boolean, default: false },
    // Which template task this is ("literature.0"), so its wording can follow the topic.
    tpl: String
});

const stageSchema = new Schema({
    key: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    targetDate: Date,
    notes: { type: String, default: '', maxlength: 5000 },
    tasks: [taskSchema]
});

const researchProjectSchema = new Schema({
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    field: { type: String, trim: true, default: '', maxlength: 200 },
    goal: { type: String, enum: ['phd', 'masters', 'postdoc', 'funded', 'independent'], default: 'phd' },
    // Which task template the stages started from (researchPath.js KINDS).
    kind: { type: String, default: 'general' },
    // The title and field the stages were last worded for (researchPath.js pathKey).
    pathFor: { type: String, default: null },
    startDate: Date,
    targetDate: Date,
    stages: [stageSchema]
}, { timestamps: true });

/* ── Publications Map ──────────────────────────────────────────────────── */

const PUBLICATION_TYPES = ['journal', 'conference', 'chapter', 'book', 'patent', 'preprint', 'other'];
const PUBLICATION_STATUSES = ['idea', 'drafting', 'submitted', 'under_review', 'revision', 'accepted', 'published', 'rejected'];
const INDEXING = ['Scopus', 'Web of Science', 'UGC-CARE', 'PubMed', 'IEEE Xplore', 'Google Scholar', 'Other'];

const publicationSchema = new Schema({
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 500 },
    type: { type: String, enum: PUBLICATION_TYPES, default: 'journal' },
    status: { type: String, enum: PUBLICATION_STATUSES, default: 'drafting' },
    venue: { type: String, trim: true, default: '', maxlength: 300 },
    authors: { type: String, trim: true, default: '', maxlength: 1000 },
    year: { type: Number, min: 1900, max: 2200 },
    // For the reference list (APA): volume, issue and pages of a journal or
    // proceedings, and the publisher of a book or chapter.
    volume: { type: String, trim: true, default: '', maxlength: 40 },
    issue: { type: String, trim: true, default: '', maxlength: 40 },
    pages: { type: String, trim: true, default: '', maxlength: 40 },
    publisher: { type: String, trim: true, default: '', maxlength: 200 },
    doi: { type: String, trim: true, default: '', maxlength: 200 },
    url: { type: String, trim: true, default: '', maxlength: 1000 },
    indexing: [{ type: String, enum: INDEXING }],
    quartile: { type: String, enum: ['', 'Q1', 'Q2', 'Q3', 'Q4'], default: '' },
    impactFactor: { type: Number, min: 0, max: 1000 },
    citations: { type: Number, min: 0, default: 0 },
    deadline: Date,
    submittedOn: Date,
    decisionOn: Date,
    publishedOn: Date,
    notes: { type: String, default: '', maxlength: 5000 }
}, { timestamps: true });

/* ── Thesis Writing ────────────────────────────────────────────────────── */

const CHAPTER_STATUSES = ['not_started', 'drafting', 'review', 'done'];

const chapterSchema = new Schema({
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, default: '', maxlength: 400000 },
    targetWords: { type: Number, min: 0, max: 200000, default: 0 },
    status: { type: String, enum: CHAPTER_STATUSES, default: 'not_started' },
    notes: { type: String, default: '', maxlength: 5000 },
    updatedAt: { type: Date, default: Date.now }
});

const thesisSchema = new Schema({
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 400 },
    degree: { type: String, trim: true, default: '', maxlength: 100 },
    university: { type: String, trim: true, default: '', maxlength: 200 },
    supervisor: { type: String, trim: true, default: '', maxlength: 200 },
    field: { type: String, trim: true, default: '', maxlength: 200 },
    targetWords: { type: Number, min: 0, max: 1000000, default: 80000 },
    dueDate: Date,
    chapters: [chapterSchema]
}, { timestamps: true });

/* ── Independent Writing ───────────────────────────────────────────────── */

const WRITING_KINDS = ['article', 'essay', 'grant', 'reflection', 'notes', 'other'];

const writingPieceSchema = new Schema({
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    kind: { type: String, enum: WRITING_KINDS, default: 'article' },
    content: { type: String, default: '', maxlength: 400000 },
    wordGoal: { type: Number, min: 0, max: 200000, default: 0 }
}, { timestamps: true });

/** Words written per day, from every thesis chapter and writing piece saved that day. */
const writingLogSchema = new Schema({
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    day: { type: String, required: true },             // YYYY-MM-DD, the platform's day
    words: { type: Number, default: 0 }
}, { timestamps: true });
writingLogSchema.index({ teacherId: 1, day: 1 }, { unique: true });

/* ── Plagiarism ────────────────────────────────────────────────────────── */

const plagiarismReportSchema = new Schema({
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    title: { type: String, trim: true, default: 'Pasted text', maxlength: 300 },
    // What was checked, kept so the report can show it highlighted later.
    text: { type: String, default: '', maxlength: 400000 },
    source: {
        kind: { type: String, enum: ['paste', 'thesis', 'writing'], default: 'paste' },
        id: Schema.Types.ObjectId,
        chapterId: Schema.Types.ObjectId
    },
    words: Number,
    score: Number,                // % of words found elsewhere
    ownScore: Number,             // … of which in the teacher's own documents
    documentsCompared: Number,
    matches: [{ _id: false, start: Number, end: Number, words: Number, source: String, own: Boolean }],
    sources: [{ _id: false, label: String, own: Boolean, words: Number }],
    citations: { found: Number },
    flags: [{ _id: false, start: Number, end: Number, kind: String, message: String }]
}, { timestamps: true });

/* ── Version history ───────────────────────────────────────────────────── */

/**
 * Earlier states of a thesis chapter or a writing piece. Taken on a save
 * when the last one is ten minutes old (the text as it was before that save),
 * when the teacher saves a version by hand, and before a restore — so any
 * day's work can be brought back. The newest 60 per document are kept.
 */
const textVersionSchema = new Schema({
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    kind: { type: String, enum: ['chapter', 'writing'], required: true },
    docId: { type: Schema.Types.ObjectId, required: true },          // the thesis or the piece
    chapterId: { type: Schema.Types.ObjectId, default: null },
    title: { type: String, default: '', maxlength: 300 },
    content: { type: String, default: '', maxlength: 400000 },
    words: { type: Number, default: 0 },
    reason: { type: String, enum: ['auto', 'manual', 'restore'], default: 'auto' },
    label: { type: String, trim: true, default: '', maxlength: 120 }
}, { timestamps: true });
textVersionSchema.index({ teacherId: 1, kind: 1, docId: 1, chapterId: 1, createdAt: -1 });

/* ── Plagiarism: the teacher's own sources ─────────────────────────────── */

/** Papers and books the teacher has read, uploaded so the check compares with them too. */
const plagiarismSourceSchema = new Schema({
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    fileName: { type: String, trim: true, default: '', maxlength: 300 },
    text: { type: String, default: '', maxlength: 600000 },
    words: { type: Number, default: 0 }
}, { timestamps: true });

/* ── Organizations ─────────────────────────────────────────────────────── */

/**
 * A teacher asking to join an organization, decided by its admin — the
 * teacher's twin of OrgJoinRequest. Kept after the decision, so the teacher
 * sees "rejected" rather than an untouched form.
 */
const TEACHER_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];
const teacherOrgRequestSchema = new Schema({
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    status: { type: String, enum: TEACHER_REQUEST_STATUSES, default: 'pending', index: true },
    decisionReason: { type: String, default: '', trim: true, maxlength: 500 },
    decidedAt: { type: Date, default: null },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null }
}, { timestamps: true });
// One request in flight per teacher, anywhere: two taps are settled by the database.
teacherOrgRequestSchema.index({ teacherId: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });
teacherOrgRequestSchema.index({ organizationId: 1, status: 1, createdAt: 1 });
teacherOrgRequestSchema.index({ teacherId: 1, createdAt: -1 });

module.exports = {
    Teacher: mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema),
    ResearchProject: mongoose.models.ResearchProject || mongoose.model('ResearchProject', researchProjectSchema),
    Publication: mongoose.models.Publication || mongoose.model('Publication', publicationSchema),
    Thesis: mongoose.models.Thesis || mongoose.model('Thesis', thesisSchema),
    WritingPiece: mongoose.models.WritingPiece || mongoose.model('WritingPiece', writingPieceSchema),
    WritingLog: mongoose.models.WritingLog || mongoose.model('WritingLog', writingLogSchema),
    PlagiarismReport: mongoose.models.PlagiarismReport || mongoose.model('PlagiarismReport', plagiarismReportSchema),
    TextVersion: mongoose.models.TextVersion || mongoose.model('TextVersion', textVersionSchema),
    PlagiarismSource: mongoose.models.PlagiarismSource || mongoose.model('PlagiarismSource', plagiarismSourceSchema),
    TeacherOrgRequest: mongoose.models.TeacherOrgRequest || mongoose.model('TeacherOrgRequest', teacherOrgRequestSchema, 'teacher_org_requests'),
    PUBLICATION_TYPES, PUBLICATION_STATUSES, INDEXING, CHAPTER_STATUSES, WRITING_KINDS, TEACHER_STATUSES, TEACHER_REQUEST_STATUSES,
    QUESTION_TYPES, LIKERT_SCALES
};
