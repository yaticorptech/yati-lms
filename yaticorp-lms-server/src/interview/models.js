/**
 * Interview Ready — the two records it keeps.
 *
 * InterviewSession: one mock interview, its transcript and, once finished,
 * its report. InterviewPrep: the student's personalised question bank and
 * which of them they have practised. Everything else the section shows —
 * skills, projects, courses — is read live from the LMS.
 */
const mongoose = require('mongoose');

const TYPES = ['hr', 'technical', 'project', 'behavioral', 'full'];
const STAGES = ['intro', 'about', 'background', 'skills', 'technical', 'project', 'problem', 'behavioral', 'situational', 'candidate', 'closing'];

const turnSchema = new mongoose.Schema({
    index: Number,
    stage: { type: String, enum: STAGES },
    question: String,
    isFollowUp: { type: Boolean, default: false },
    difficulty: { type: String, default: 'medium' },
    askedAt: { type: Date, default: Date.now },
    answer: { type: String, default: '' },
    answeredAt: { type: Date, default: null },
    inputMode: { type: String, enum: ['text', 'voice'], default: 'text' },
    // Delivery metrics for a spoken answer (see communicationService.js).
    voice: { type: { durationMs: Number, wordCount: Number, wpm: Number, longPauses: Number, pauseMs: Number, fillerCount: Number, fillers: [String], hedgeCount: Number, _id: false }, default: null }
}, { _id: false });

const sessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: TYPES, required: true },
    role: { type: String, default: '' },
    status: { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active', index: true },
    interviewer: { type: String, default: '' },           // 'gemini-…' or 'template'
    // What the interviewer knew about the student when the session began.
    context: { type: Object, default: {} },
    turns: { type: [turnSchema], default: [] },
    plan: { type: [String], default: [] },                 // the stages this session covers, in order
    maxQuestions: { type: Number, default: 8 },
    closingMessage: { type: String, default: '' },
    report: {
        overall: { type: Number, default: null },
        scores: {
            communication: Number, technical: Number, answerQuality: Number,
            problemSolving: Number, confidence: Number, relevance: Number
        },
        strengths: { type: [String], default: [] },
        improvements: { type: [String], default: [] },
        feedback: { type: String, default: '' },
        perQuestion: { type: [{ index: Number, score: Number, feedback: String, betterAnswer: String, _id: false }], default: [] },
        plan: { type: [{ title: String, action: String, skill: String, courseId: String, courseTitle: String, _id: false }], default: [] },
        model: { type: String, default: '' },
        improvedBy: { type: Number, default: 0 },
        // Delivery: what was measured from the spoken answers, and what to do about it.
        communication: { type: { notes: [{ kind: String, tone: String, text: String, _id: false }], wpm: Number, avgWords: Number, fillerCount: Number, hedgeCount: Number, longPauses: Number, voiceAnswers: Number, answers: Number, _id: false }, default: null },
        recommendation: { type: String, default: '' }
    },
    plannedMinutes: { type: Number, default: 12 },
    xp: { type: { completed: Number, improved: Number, challenge: Number }, default: () => ({ completed: 0, improved: 0, challenge: 0 }) },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null }
}, { timestamps: true });

sessionSchema.index({ userId: 1, completedAt: -1 });

const questionSchema = new mongoose.Schema({
    id: String,
    category: { type: String, enum: ['hr', 'technical', 'project', 'behavioral', 'situational'] },
    topic: String,
    question: String,
    hint: String,
    difficulty: { type: String, default: 'medium' }
}, { _id: false });

const prepSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    questions: { type: [questionSchema], default: [] },
    generatedAt: { type: Date, default: null },
    generatedFrom: { type: String, default: '' },          // fingerprint of the learning data used
    practiced: { type: [String], default: [] },            // question ids
    topics: { type: [{ topic: String, reason: String, _id: false }], default: [] },
    role: { type: String, default: '' },
    // Last computed readiness, so the rewards badge can read it without
    // rebuilding the whole learning context on every activity.
    readiness: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = {
    InterviewSession: mongoose.model('InterviewSession', sessionSchema, 'interview_sessions'),
    InterviewPrep: mongoose.model('InterviewPrep', prepSchema, 'interview_prep'),
    TYPES, STAGES
};
