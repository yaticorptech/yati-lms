/**
 * How the Global Quiz writes its numbers, shared by the paper (GlobalQuiz) and
 * the list of past quizzes (QuizHistory) so the two always agree.
 */

/** A span of time as the clock shows it: m:ss, or h:mm:ss past an hour. */
export const clock = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
    return `${h ? `${h}:` : ''}${h ? String(m).padStart(2, '0') : m}:${String(sec).padStart(2, '0')}`;
};

/** The score's colour: green for a strong paper, violet for a pass, amber below. */
export const toneFor = (score) => (score >= 80 ? '#10b981' : score >= 50 ? '#7c3aed' : '#f59e0b');

/** A date the way the quiz banner writes it: 10 Oct 2026. */
export const shortDate = (when) => new Date(when).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
