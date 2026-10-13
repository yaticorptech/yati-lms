/**
 * Two things mock interviews saved before 2026-10-13 can carry, put right
 * whenever an interview is read, so a student never meets them again and the
 * records mend themselves as they are used, with nothing to run.
 *
 *  1. Typed answers saved as spoken. When speech recognition failed (no
 *     connection, a blocked microphone) the page kept the empty recording's
 *     timings, and the answer typed after it went in as 'voice'. A spoken
 *     answer is timed from its first words, on the web and in the app, so one
 *     that was really heard always has a duration; one saved as spoken with
 *     none was typed. The report's delivery section never counted these as
 *     spoken (it needs a measured pace): only the "spoken" label changes.
 *
 *  2. The built-in interviewer's old wording: "in this hr interview", "in
 *     this full interview", and a repeated question put down to the reply
 *     being "about something else" when it was as often gibberish or "I don't
 *     know". Only the exact sentences it wrote are rewritten; an AI-written
 *     report is left as it is.
 */
const { InterviewSession } = require('./models');

const TYPE_WORDS = { hr: 'HR interview', full: 'full mock interview' };
const OLD_SUMMARY = /^(.+?), you scored (\d+)\/100 in this (hr|full) interview\./;
const OLD_REPEAT = /Answer the question that was asked — the interviewer had to repeat (a question|\d+ questions) because your reply was about something else\./g;

const reword = (text) => String(text)
    .replace(OLD_SUMMARY, (_, name, score, type) => `${name}, you scored ${score}/100 in this ${TYPE_WORDS[type]}.`)
    .replace(OLD_REPEAT, (_, howMany) => `Answer the question that was asked, in full sentences — the interviewer had to ask ${howMany} again because the reply did not answer it.`);

/**
 * Put a session right in place (a Mongoose document or a lean one), and save
 * just the paths that changed.
 * @returns {Promise<boolean>} whether anything was wrong
 */
const repairSaved = async (session) => {
    if (!session?._id) return false;
    const set = {};
    (session.turns || []).forEach((t, i) => {
        if (t.inputMode === 'voice' && t.answer && !(t.voice?.durationMs > 0)) { t.inputMode = 'text'; set[`turns.${i}.inputMode`] = 'text'; }
    });
    const report = session.report;
    if (report) {
        const feedback = reword(report.feedback || '');
        if (report.feedback && feedback !== report.feedback) { report.feedback = feedback; set['report.feedback'] = feedback; }
        const improvements = (report.improvements || []).map(reword);
        if (improvements.some((x, i) => x !== report.improvements[i])) { report.improvements = improvements; set['report.improvements'] = improvements; }
    }
    if (!Object.keys(set).length) return false;
    // A targeted update, not save(): a document saved whole would race the
    // answer being sent to the same interview.
    await InterviewSession.updateOne({ _id: session._id }, { $set: set });
    return true;
};

module.exports = { repairSaved, reword };
