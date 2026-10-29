/** The summit celebration's decision (JourneyStairs.jsx), kept apart so it can be tested on its own. */

// How far the student has come at the summit: reached the final step, or completed it.
const RANK = { unlocked: 1, completed: 2 };

/**
 * Which celebration to play: 'full' the first time this goal's final step is reached, and again
 * the first time it is completed; 'brief' for a goal already completed, once a session; 'still'
 * in their place when motion is reduced; otherwise 'settled' (the ambient glow only).
 */
export const summitPlan = ({ finalState, goal, stored, seenThisSession, reduced }) => {
    const before = stored && stored.goal === goal ? RANK[stored.state] || 0 : 0;
    const fresh = RANK[finalState] > before;
    const kind = fresh ? (reduced ? 'still' : 'full')
        : finalState === 'completed' && !seenThisSession ? (reduced ? 'still' : 'brief') : 'settled';
    return { kind, fresh };
};

