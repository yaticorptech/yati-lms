/**
 * Quiz Arena's scores and rankings, worked out on the server from the stored
 * answers (each answer's points were fixed when it was given).
 *
 * Ranking, best first:
 *   1. more points
 *   2. less time: the total time taken over the questions answered right
 *   3. registered earlier
 * so every student has a rank of their own. Only students who took part
 * (opened the live quiz or answered something) are ranked.
 *
 * College-wise: each college's students who took part, ranked by their
 * average score, then by how many took part, then by their best student's
 * rank.
 */

const totals = (entry) => {
    let score = 0; let correctCount = 0; let timeMs = 0;
    for (const a of entry.answers || []) {
        score += a.points;
        if (a.correct) { correctCount += 1; timeMs += a.ms; }
    }
    return { score, correctCount, answered: (entry.answers || []).length, timeMs };
};

const tookPart = (entry) => !!entry.joinedAt || (entry.answers || []).length > 0;

/** The ranked students: [{ entry, rank, score, correctCount, answered, timeMs }]. */
const rank = (entries) => entries
    .filter(tookPart)
    .map((entry) => ({ entry, ...totals(entry) }))
    .sort((a, b) => b.score - a.score || a.timeMs - b.timeMs || new Date(a.entry.registeredAt) - new Date(b.entry.registeredAt))
    .map((row, i) => ({ ...row, rank: i + 1 }));

/** Colleges from ranked rows: [{ organizationId, collegeName, participants, totalScore, averageScore, bestRank, rank }]. */
const colleges = (ranked) => {
    const by = new Map();
    for (const r of ranked) {
        const key = String(r.entry.organizationId || r.entry.collegeName || 'none');
        const c = by.get(key) || { organizationId: r.entry.organizationId || null, collegeName: r.entry.collegeName || 'Independent', participants: 0, totalScore: 0, bestRank: Infinity };
        c.participants += 1;
        c.totalScore += r.score;
        c.bestRank = Math.min(c.bestRank, r.rank);
        by.set(key, c);
    }
    return [...by.values()]
        .map((c) => ({ ...c, averageScore: Math.round((c.totalScore / c.participants) * 10) / 10 }))
        .sort((a, b) => b.averageScore - a.averageScore || b.participants - a.participants || a.bestRank - b.bestRank)
        .map((c, i) => ({ ...c, rank: i + 1 }));
};

module.exports = { totals, tookPart, rank, colleges };
