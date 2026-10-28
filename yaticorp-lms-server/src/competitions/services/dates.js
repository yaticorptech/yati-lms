/**
 * A competition's dates, checked the same way everywhere (asked 2026-10-27:
 * "it must be correct every time"): registration ends after it starts, the
 * competition starts on a later day than registration ends (days in India's
 * time), and nothing new is set in the past. A date left as it was saved is
 * not held to "not in the past" (a running competition can still be edited).
 * Throws { status: 400, message } on the first problem.
 */
const day = (d) => new Date(d.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
const fail = (message) => Object.assign(new Error(message), { status: 400 });

const checkSchedule = ({ registrationOpensAt, registrationDeadline, startsAt, current = null, now = Date.now() }) => {
    const changed = (k, v) => !current || !current[k] || new Date(current[k]).getTime() !== v.getTime();
    if (registrationOpensAt && registrationOpensAt >= registrationDeadline) throw fail('Registration has to end after it starts.');
    if (registrationOpensAt && changed('registrationOpensAt', registrationOpensAt) && day(registrationOpensAt) < day(new Date(now))) throw fail('Registration start cannot be in the past.');
    if (changed('registrationDeadline', registrationDeadline) && registrationDeadline.getTime() < now) throw fail('Registration end cannot be in the past.');
    if (changed('startsAt', startsAt) && startsAt.getTime() < now) throw fail('The start cannot be in the past.');
    if (day(startsAt) <= day(registrationDeadline)) throw fail('The competition has to start on a later day than registration ends.');
};

module.exports = { checkSchedule, day };
