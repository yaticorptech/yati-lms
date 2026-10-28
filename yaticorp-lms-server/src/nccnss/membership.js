/**
 * @description Ending and continuing extra-curricular memberships without
 * losing them.
 *
 * A membership is never deleted once it has history: it is closed (left or
 * transferred) and keeps its activities and attendance. When the student
 * joins again — another unit, another organization — the new row points back
 * at the last closed one (transferredFrom), so the whole record can be read
 * in order.
 *
 * Called from the organization side whenever a student stops belonging to an
 * organization (removed, unassigned, moved by a superadmin, or leaving one
 * that closed), and before any new membership is made.
 */
const { NccNssMember, NccNssActivity, LIVE_STATUSES, CLOSED_STATUSES } = require('./models');

/**
 * Close every live or completed row of `userId` in `organizationId` (or, with
 * `notIn`, in any organization other than that one). An active or completed
 * row becomes left; a request that was still waiting is turned down. Their
 * waiting activities are turned down too, so no officer is left approving
 * hours for someone who has gone. Never throws: it must not fail the change
 * of organization that called it.
 */
const closeMemberships = async ({ userId, organizationId, notIn, reason }) => {
    try {
        const where = { userId, ...(notIn ? { organizationId: { $ne: notIn } } : { organizationId }) };
        const rows = await NccNssMember.find({ ...where, status: { $in: [...LIVE_STATUSES, 'completed'] } }).select('_id status').lean();
        if (!rows.length) return 0;
        const now = new Date();
        const ended = rows.filter((r) => r.status !== 'pending').map((r) => r._id);
        const waiting = rows.filter((r) => r.status === 'pending').map((r) => r._id);
        await Promise.all([
            NccNssMember.updateMany({ _id: { $in: ended } }, { $set: { status: 'left', endedAt: now, endReason: reason } }),
            NccNssMember.updateMany({ _id: { $in: waiting } }, { $set: { status: 'rejected', endedAt: now, endReason: reason } }),
            NccNssActivity.updateMany(
                { memberId: { $in: rows.map((r) => r._id) }, status: 'pending' },
                { $set: { status: 'rejected', reason, decidedAt: now } }
            )
        ]);
        return rows.length;
    } catch (error) {
        console.error(`[nccnss] could not close the memberships of student ${userId}:`, error.message);
        return 0;
    }
};

/** The student's latest closed row in a scheme (and club), anywhere: what a new row continues. */
const lastClosed = (userId, scheme, clubId) => NccNssMember.findOne({ userId, scheme, clubId: clubId || null, status: { $in: CLOSED_STATUSES } })
    .sort({ endedAt: -1, updatedAt: -1 }).select('_id').lean();

module.exports = { closeMemberships, lastClosed };
