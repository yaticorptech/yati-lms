/**
 * Certificate numbers (2026-10-31): every certificate a student has on My
 * Certificates — the course certificates this site issues, the competition
 * certificates they win here, and the ones they upload — gets one number:
 * YATI, their card number, a hyphen and exactly three digits:
 *
 *     YATI240100019664-001, YATI240100019664-002, …
 *
 * One series per student, oldest certificate first. A number, once given,
 * stays that certificate's; a new certificate takes the next one. Card
 * numbers are unique, so the numbers are too. A course certificate prints
 * its number on its PDF, so the card and the PDF always agree.
 *
 * Kept on the student (User.certificateSeq, the last one given, and
 * User.certificateNumbers, which certificate has which) — the cluster is at
 * its collection limit. Keys are what the profile calls each certificate:
 * course-<id>, competition-<id>, groupbrain-<id>, up-<id>.
 *
 * Numbers given before this format (YATI<card>-01 on course certificates,
 * YATI<card>001 on the profile for a day) are put right by renumber():
 * the student's whole series again, oldest first, in this format — run for
 * everyone by scripts/renumberCertificates.js, and for one student on their
 * own whenever their profile or a download finds an old-format number.
 */
const mongoose = require('mongoose');
const User = require('../models/User');

const KEY = /^(course|competition|groupbrain|up)-[\w.:-]{1,100}$/;
const FORMAT = /^YATI.+-\d{3,}$/;
const MAX_ITEMS = 300;

const prefixOf = (user) => `YATI${user?.cardNumber ? String(user.cardNumber).replace(/\s/g, '') : String(user?._id || '').slice(-8).toUpperCase()}`;
const format = (prefix, n) => `${prefix}-${String(n).padStart(3, '0')}`;
const current = (number) => FORMAT.test(String(number || ''));

/** The register as { key: number }; the first entry for a key wins. */
const registerOf = (user) => {
    const out = {};
    for (const e of user?.certificateNumbers || []) if (e?.key && e.number && !out[e.key]) out[e.key] = e.number;
    return out;
};

/**
 * The student's whole series again: every certificate they have — course
 * certificates (hidden ones too: they keep their place), uploads, and the
 * competition certificates already numbered — oldest first, -001 onwards.
 * Course certificates get the new number printed on them.
 */
const renumber = async (userId) => {
    const Certificate = require('../models/Certificate');
    const Achievement = require('../models/Achievement');
    const user = await User.findById(userId).select('cardNumber +certificateNumbers').lean();
    if (!user) return {};
    const [courses, uploads] = await Promise.all([
        Certificate.find({ userId }).select('issuedAt createdAt').lean(),
        Achievement.find({ userId }).select('createdAt').lean()
    ]);
    const entries = [
        ...courses.map((c) => ({ key: `course-${c._id}`, at: c.issuedAt || c.createdAt, courseId: c._id })),
        ...uploads.map((a) => ({ key: `up-${a._id}`, at: a.createdAt }))
    ];
    // Competition (and Group Brain) certificates live with the games; the ones
    // already numbered keep their place by the day the competition ended.
    const games = Object.keys(registerOf(user)).filter((k) => /^(competition|groupbrain)-/.test(k));
    if (games.length) {
        const ids = games.filter((k) => k.startsWith('competition-')).map((k) => k.slice('competition-'.length)).filter((id) => mongoose.isValidObjectId(id));
        const comps = ids.length ? await require('../competitions/models/Competition').find({ _id: { $in: ids } }).select('completedAt').lean() : [];
        const ended = Object.fromEntries(comps.map((c) => [`competition-${c._id}`, c.completedAt]));
        for (const key of games) entries.push({ key, at: ended[key] || null });
    }
    entries.sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0) || a.key.localeCompare(b.key));
    const prefix = prefixOf(user);
    const register = entries.map((e, n) => ({ key: e.key, number: format(prefix, n + 1), courseId: e.courseId }));
    if (register.some((e) => e.courseId)) {
        await Certificate.bulkWrite(register.filter((e) => e.courseId).map((e) => ({ updateOne: { filter: { _id: e.courseId }, update: { $set: { certificateNumber: e.number } } } })));
    }
    await User.updateOne({ _id: userId }, { $set: { certificateSeq: register.length, certificateNumbers: register.map(({ key, number }) => ({ key, number })) } });
    return Object.fromEntries(register.map((e) => [e.key, e.number]));
};

/** Whether this student still has a number in an older format, on the profile or a course certificate. */
const needsRenumber = async (userId, user) => {
    if ((user?.certificateNumbers || []).some((e) => !current(e.number))) return true;
    return Boolean(await require('../models/Certificate').exists({ userId, certificateNumber: { $not: FORMAT } }));
};
/** Puts an old-format series right before it is shown or printed. */
const ensureCurrent = async (userId) => {
    const user = await User.findById(userId).select('+certificateNumbers').lean();
    if (user && await needsRenumber(userId, user)) await renumber(userId);
};

/** Takes `count` numbers off the student's counter, at once; resolves to the first. */
const take = async (userId, count) => {
    const after = await User.findByIdAndUpdate(userId, { $inc: { certificateSeq: count } }, { returnDocument: 'after' }).select('certificateSeq cardNumber').lean();
    return { first: after.certificateSeq - count + 1, user: after };
};

/** The next number, for a certificate being issued now (a course certificate). */
const nextNumber = async (userId, key) => {
    await ensureCurrent(userId);
    const { first, user } = await take(userId, 1);
    const number = format(prefixOf(user), first);
    await User.updateOne({ _id: userId }, { $push: { certificateNumbers: { key, number } } });
    return number;
};

/**
 * The numbers of these certificates ([{ key, added }]) as { key: number },
 * giving the next ones, oldest first, to any that have none yet. A course
 * certificate always has its number already (given when it was issued).
 */
const numbersFor = async (userId, items) => {
    const list = (Array.isArray(items) ? items : []).filter((i) => KEY.test(String(i?.key || ''))).slice(0, MAX_ITEMS);
    await ensureCurrent(userId);
    const user = await User.findById(userId).select('cardNumber +certificateNumbers').lean();
    if (!user) return {};
    const have = registerOf(user);
    const fresh = [...new Map(list.filter((i) => !have[i.key]).map((i) => [i.key, i])).values()]
        .sort((a, b) => new Date(a.added || 0) - new Date(b.added || 0));
    if (fresh.length) {
        // A course certificate missing from the series (issued before it): its own number, if it has one in this format.
        const courseIds = fresh.filter((i) => i.key.startsWith('course-')).map((i) => i.key.slice('course-'.length)).filter((id) => mongoose.isValidObjectId(id));
        const printed = {};
        if (courseIds.length) {
            const certs = await require('../models/Certificate').find({ _id: { $in: courseIds }, userId }).select('certificateNumber').lean();
            for (const c of certs) if (current(c.certificateNumber)) printed[`course-${c._id}`] = c.certificateNumber;
        }
        const toNumber = fresh.filter((i) => !printed[i.key]);
        const added = Object.entries(printed).map(([key, number]) => ({ key, number }));
        if (toNumber.length) {
            const { first, user: counted } = await take(userId, toNumber.length);
            const prefix = prefixOf(counted);
            toNumber.forEach((i, n) => added.push({ key: i.key, number: format(prefix, first + n) }));
        }
        await User.updateOne({ _id: userId }, { $push: { certificateNumbers: { $each: added } } });
        // Read back, so two requests at once agree on whichever was saved first.
        Object.assign(have, registerOf(await User.findById(userId).select('+certificateNumbers').lean()));
    }
    return Object.fromEntries(list.map((i) => [i.key, have[i.key]]).filter(([, n]) => n));
};

module.exports = { numbersFor, nextNumber, renumber, ensureCurrent, prefixOf, format, FORMAT };
