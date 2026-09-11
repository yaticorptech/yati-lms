/**
 * @author Preethesh Kulal
 * @description Mongoose schema for global platform settings per organization
 */
const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    isCreditSystemEnabled: {
        type: Boolean,
        default: true
    },
    // The Career Path section as a whole. Locking it hides the student tab and
    // closes the /api/career endpoints behind it; admin reporting on the
    // section keeps working, so an operator can still see what was collected.
    isCareerPathEnabled: {
        type: Boolean,
        default: true
    },
    // The Jobs section as a whole. Locking it hides the student tab and closes
    // the /api/jobs endpoints behind it; admin ingestion and reporting keep
    // working, so an operator can still maintain the index while it is shut.
    isJobsEnabled: {
        type: Boolean,
        default: true
    },
    // Gamification, rewards and the wallet. Locking it hides the cards, the
    // leaderboard and the wallet from students and closes /api/rewards; hooks
    // stop awarding while it is locked. Admin reporting keeps working.
    isRewardsEnabled: {
        type: Boolean,
        default: true
    },
    // Which Job Access Verification steps a student must finish before the
    // job board opens. Each switch removes its step from the flow entirely;
    // the server reads these, so the frontend never decides what is required.
    // The Global Quiz tab on the student dashboard: whether it is offered at
    // all, and how many questions a paper holds unless the student picks
    // otherwise. The pool itself is the quizzes already inside the courses.
    globalQuiz: {
        enabled: { type: Boolean, default: true },
        defaultLength: { type: Number, default: 10, min: 3, max: 25 }
    },
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
