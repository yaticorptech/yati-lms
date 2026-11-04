/**
 * NCC or NSS, not both (the user's rule, 2026-11-02): a student may be in one of the two at a time
 * (Scouts & Guides and clubs alongside, as before). A membership that has ended — completed, or
 * closed on leaving — does not count; one that is waiting for approval does.
 */
const { NccNssMember, LIVE_STATUSES } = require('./models');

const OTHER = { NCC: 'NSS', NSS: 'NCC' };

/** The student's live membership (active, or asked for) in the other one, or null. */
const otherCorps = async (userId, scheme, { activeOnly = false } = {}) => {
    const other = OTHER[scheme];
    if (!other) return null;
    return NccNssMember.findOne({ userId, scheme: other, status: { $in: activeOnly ? ['active'] : LIVE_STATUSES } }).select('scheme status').lean();
};

/** Why not, in the reader's words: "you" for the student, "this student" for the organization. */
const corpsMessage = (row, scheme, { student = true } = {}) => {
    const who = student ? 'You' : 'This student';
    const what = row.status === 'pending' ? `${student ? 'have' : 'has'} asked to join ${row.scheme}` : `${student ? 'are' : 'is'} in ${row.scheme}`;
    const then = row.status === 'pending' ? `withdraw or settle that request before ${scheme}` : `leave ${row.scheme} before joining ${scheme}`;
    return `${who} ${what}. A student can be in NCC or NSS, not both: ${then}.`;
};

module.exports = { otherCorps, corpsMessage, OTHER_CORPS: OTHER };
