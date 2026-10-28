/**
 * @description Ranks, badges and trainings on a Scouts & Guides record —
 * shared by the organization's routes (./orgAdmin.js), the leader's
 * (./leader.js) and the student's (./student.js).
 *
 * An award belongs to the student (userId) as well as to the membership it
 * was earned in, so a transfer to another unit or organization keeps every
 * one, and the current rank is read across all of them.
 */
const { ScoutAward } = require('./models');
const { AWARD_TYPES, ranksFor, currentRank } = require('./bsg');

/**
 * The award a request describes, checked: { fields } or { error }. A rank
 * must be one of the member's section's ranks when the section is known.
 */
const awardFields = (body = {}, section) => {
    const type = AWARD_TYPES.includes(body.type) ? body.type : null;
    if (!type) return { error: 'Choose a rank, a badge or a training.' };
    const name = String(body.name || '').trim().slice(0, 100);
    if (!name) return { error: type === 'rank' ? 'Choose the rank.' : 'Give the badge or training its name.' };
    const ranks = ranksFor(section);
    if (type === 'rank' && ranks.length && !ranks.includes(name)) return { error: `Choose one of the ${ranks.join(', ')} ranks.` };
    const date = body.date ? new Date(body.date) : new Date();
    if (Number.isNaN(date.getTime())) return { error: 'Choose the date it was passed.' };
    if (date.getTime() > Date.now() + 86400000) return { error: 'The date cannot be in the future.' };
    return {
        fields: {
            type, name, date,
            examiner: String(body.examiner || '').trim().slice(0, 120),
            certificateNo: String(body.certificateNo || '').trim().slice(0, 60),
            note: String(body.note || '').trim().slice(0, 300)
        }
    };
};

/** A new award on `member`'s record, as given; status and who decided are the caller's. */
const newAward = (member, fields, extra) => ScoutAward.create({
    organizationId: member.organizationId, memberId: member._id, userId: member.userId?._id || member.userId,
    unitId: member.unitId?._id || member.unitId || null, section: member.section || '',
    ...fields, ...extra
});

/** Every award of these students (any organization), newest first, grouped by student. */
const awardsByUser = async (userIds) => {
    const rows = userIds.length
        ? await ScoutAward.find({ userId: { $in: userIds }, status: { $in: ['approved', 'pending'] } }).sort({ date: -1, createdAt: -1 }).lean()
        : [];
    const out = new Map();
    for (const r of rows) {
        const k = String(r.userId);
        if (!out.has(k)) out.set(k, []);
        out.get(k).push(r);
    }
    return out;
};

/** Scouts members with their current rank (and, with `full`, their awards) added. */
const withRanks = async (members, { full = false } = {}) => {
    const scouts = members.filter((m) => m.scheme === 'SCOUTS');
    if (!scouts.length) return members;
    const byUser = await awardsByUser([...new Set(scouts.map((m) => String(m.userId?._id || m.userId)))]);
    return members.map((m) => {
        if (m.scheme !== 'SCOUTS') return m;
        const awards = byUser.get(String(m.userId?._id || m.userId)) || [];
        return { ...m, rank: currentRank(awards, m.section), ...(full ? { awards } : {}) };
    });
};

module.exports = { awardFields, newAward, awardsByUser, withRanks };
