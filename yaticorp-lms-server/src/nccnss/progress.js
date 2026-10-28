/**
 * @description Where each NCC/NSS member stands: hours, camps, attendance,
 * whether they meet the college's targets, and what is still missing.
 *
 * Worked out on every read from the activities and events themselves, so the
 * numbers can never drift from what an officer approved or marked.
 */
const { NccNssActivity, NccNssEvent, NccNssSetting, SCHEMES, DEFAULT_TARGETS } = require('./models');

/** The college's targets for both schemes, defaults filled in. */
const targetsFor = async (organizationId) => {
    const rows = await NccNssSetting.find({ organizationId }).lean();
    const out = {};
    for (const scheme of SCHEMES) {
        const row = rows.find((r) => r.scheme === scheme);
        out[scheme] = row
            ? { requiredHours: row.requiredHours, requiredCamps: row.requiredCamps, minAttendance: row.minAttendance }
            : { ...DEFAULT_TARGETS[scheme] };
    }
    return out;
};

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

/** Events a member was expected at: their scheme (and club), their unit (or all units), since they joined and until their membership ended. */
const sameClub = (a, b) => String(a.clubId?._id || a.clubId || '') === String(b.clubId?._id || b.clubId || '');
const expectedFor = (member, events) => events.filter((e) =>
    e.scheme === member.scheme &&
    sameClub(e, member) &&
    (!e.unit || e.unit === member.unit) &&
    e.attendanceTaken &&
    new Date(e.date) >= startOfDay(member.createdAt) &&
    (!member.endedAt || new Date(e.date) <= new Date(member.endedAt)));

/**
 * One summary per member, in the same order. Two queries for the whole list,
 * not two per member.
 */
const summarise = async (members, organizationId, targets) => {
    if (!members.length) return [];
    targets = targets || await targetsFor(organizationId);
    const ids = members.map((m) => m._id);
    const [activities, events] = await Promise.all([
        NccNssActivity.find({ memberId: { $in: ids }, status: { $in: ['approved', 'pending'] } })
            .select('memberId kind hours status').lean(),
        NccNssEvent.find({ organizationId, attendanceTaken: true }).select('scheme clubId unit kind hours date attendanceTaken presentMemberIds').lean()
    ]);

    return members.map((m) => {
        const mine = activities.filter((a) => String(a.memberId) === String(m._id));
        const approved = mine.filter((a) => a.status === 'approved');
        const expected = expectedFor(m, events);
        const attended = expected.filter((e) => e.presentMemberIds.some((id) => String(id) === String(m._id)));

        const hours = approved.reduce((s, a) => s + (a.hours || 0), 0) + attended.reduce((s, e) => s + (e.hours || 0), 0);
        const camps = approved.filter((a) => a.kind === 'camp').length + attended.filter((e) => e.kind === 'camp').length;
        const awards = approved.filter((a) => a.kind === 'award').length;
        const attendance = expected.length ? Math.round((attended.length / expected.length) * 100) : null;

        const t = targets[m.scheme];
        const missing = [];
        if (hours < t.requiredHours) missing.push(`${t.requiredHours - hours} more hours`);
        if (camps < t.requiredCamps) missing.push(`${t.requiredCamps - camps} more camp${t.requiredCamps - camps > 1 ? 's' : ''}`);
        if (attendance !== null && attendance < t.minAttendance) missing.push(`attendance up to ${t.minAttendance}%`);

        // Behind: attendance under the line once there are a few events to judge
        // by, or a member past their first year with under half the hours.
        const atRisk = m.status === 'active' && (
            (attendance !== null && expected.length >= 3 && attendance < t.minAttendance) ||
            (t.requiredHours > 0 && m.year > 1 && hours < t.requiredHours / 2)
        );

        return {
            hours,
            requiredHours: t.requiredHours,
            camps,
            requiredCamps: t.requiredCamps,
            attendance,
            eventsHeld: expected.length,
            eventsAttended: attended.length,
            minAttendance: t.minAttendance,
            awards,
            pendingActivities: mine.length - approved.length,
            eligible: missing.length === 0,
            atRisk,
            next: missing.length ? `Needs ${missing.join(', ')}` : 'All targets met — eligible for the certificate'
        };
    });
};

module.exports = { targetsFor, summarise };
