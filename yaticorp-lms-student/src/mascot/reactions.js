/**
 * Which still answers which moment. Pages call `mascot.react(REACTIONS.x)`
 * rather than naming pictures, so the mapping can change here alone.
 */
export const REACTIONS = {
    greeting: 'wave-hi',
    correct: 'cheer-jump',
    wrong: 'sad',
    streak: 'star-celebrate',
    lessonComplete: 'confetti-cheer',
    idle: 'meditating',
    cta: 'wink-point'
};

/**
 * The longest run of answers in a row that were marked correct. Course quizzes
 * mark an answer `isCorrect`, Career Path quizzes `correct`.
 */
export const longestStreak = (results = []) => {
    let best = 0;
    let run = 0;
    for (const answer of results) {
        run = (answer?.isCorrect ?? answer?.correct) ? run + 1 : 0;
        best = Math.max(best, run);
    }
    return best;
};

/**
 * The reaction to a graded quiz. Answers are graded on the server when the quiz
 * is submitted — the page never holds the answer key — so this is the one
 * moment the student learns how their answers went, and it gets one verdict:
 * a failed attempt is sad, a pass with three or more right in a row earns the
 * streak, any other pass the cheer.
 */
export const quizReaction = ({ passed, results } = {}) => {
    if (!passed) return REACTIONS.wrong;
    return longestStreak(results) >= 3 ? REACTIONS.streak : REACTIONS.correct;
};
