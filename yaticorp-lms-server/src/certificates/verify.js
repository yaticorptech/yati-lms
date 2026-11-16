/**
 * The public certificate check (2026-11-11, the user's ask): anyone types a certificate's number — the one the
 * student writes in their AI passport — and sees whether it is genuine, whose it is, what it was for, and the
 * certificate itself. No sign-in.
 *
 *   GET /api/certificates/verify/:number        { found, valid, kind, number, name, title, line, issuedBy, issuedAt, … }
 *   GET /api/certificates/verify/:number/pdf    the certificate, as the student downloads it (shown as a picture)
 *
 * Numbers it knows:
 *   YATI<card>-001     the student's series (services/certificateNumbers.js): course, Multilingo, competition and
 *                      Group Brain certificates. Typed with or without "YATI", spaces or the hyphen.
 *   YATI-ENG-B-<card>  a Multilingo certificate's number from before the series (still printed on older PDFs).
 *   YC-XXXX-XXXX       a Certificate Builder certificate;  GB-XXXX-XXXX  a Group Brain one.
 *
 * A certificate the student uploaded themselves (up-) is in their series too, but YATI did not issue it: the check
 * says so, and shows nothing of it.
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const numbers = require('../services/certificateNumbers');
const { findUserByCardNumber } = require('../utils/cardNumber');

const ISSUER = 'Yaticorp India Pvt Ltd';
const LEVEL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

/** What was typed, as one of the forms above: { kind: 'series'|'lingo-old'|'builder'|'groupbrain', … } or null. */
const parse = (raw) => {
    const t = String(raw || '').toUpperCase().replace(/\s+/g, '').trim();
    if (!t || t.length > 60) return null;
    if (/^YC-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(t)) return { kind: 'builder', id: t };
    if (/^GB-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(t)) return { kind: 'groupbrain', id: t };
    let m = t.match(/^YATI-([A-Z]{2,3})-([BIA])-([A-Z0-9]{6,20})$/);
    if (m) return { kind: 'lingo-old', course: m[1] === 'ENG' ? 'en' : m[1].toLowerCase(), level: { B: 'beginner', I: 'intermediate', A: 'advanced' }[m[2]], card: m[3] };
    // YATI240100019664-001, 240100019664-001, YATI240100019664001 (a 12-digit card and then its series)
    m = t.match(/^(?:YATI)?-?(\d{12})-(\d{1,5})$/) || t.match(/^(?:YATI)?-?(\d{12})(\d{3})$/) || t.match(/^(?:YATI)-?([A-Z0-9]{6,20})-(\d{1,5})$/);
    if (m) return { kind: 'series', card: m[1], number: numbers.format(`YATI${m[1]}`, Number(m[2])) };
    return null;
};

/** The student whose series this number is in, and the certificate's key there. */
const holderOf = async ({ card, number }) => {
    let user = /^\d{12}$/.test(card) ? await findUserByCardNumber(card) : null;
    if (user) user = await User.findById(user._id).select('name cardNumber +certificateNumbers').lean();
    // A student without a card: the prefix is the end of their id, so look for the number itself.
    if (!user) user = await User.findOne({ 'certificateNumbers.number': number }).select('name cardNumber +certificateNumbers').lean();
    if (!user) return null;
    const entry = (user.certificateNumbers || []).find((e) => e.number === number);
    return entry ? { user, key: entry.key } : { user, key: null };
};

/**
 * The certificate behind a number: { info, pdf } — `info` for the page, `pdf(res)` writing the certificate — or
 * null when there is none.
 */
const find = async (raw) => {
    const p = parse(raw);
    if (!p) return null;

    if (p.kind === 'builder') {
        const { verify } = require('../competitions/certificates/routes');
        const info = await verify(p.id);
        if (!info.found) return null;
        return {
            info: { kind: 'competition', number: info.certId, name: info.name, title: info.title, line: [info.eventName, info.line].filter(Boolean).join(' · '), issuedBy: info.issuedBy, issuedAt: info.issuedAt, valid: info.valid, revokedAt: info.revokedAt },
            pdf: async (res) => {
                const { IssuedCertificate, CertificateDesign } = require('../competitions/certificates/models');
                const cert = await IssuedCertificate.findOne({ certId: p.id }).lean();
                const design = cert && await CertificateDesign.findById(cert.designId).lean();
                if (!design) return false;
                await require('../competitions/certificates/render').pdf(res, require('../competitions/certificates/auto').withCompetition(design, cert), [cert], `Certificate_${p.id}.pdf`);
                return true;
            }
        };
    }
    if (p.kind === 'groupbrain') return groupBrain(p.id);

    if (p.kind === 'lingo-old') {
        const user = await findUserByCardNumber(p.card);
        if (!user) return null;
        return lingo(user, p.course, p.level, { typed: `YATI-${p.course === 'en' ? 'ENG' : p.course.toUpperCase()}-${p.level[0].toUpperCase()}-${p.card}` });
    }

    // The series.
    const found = await holderOf(p);
    if (!found) return null;
    const { user, key } = found;
    if (!key) {
        // A course certificate numbered before the register held it.
        const Certificate = require('../models/Certificate');
        const c = await Certificate.findOne({ userId: user._id, certificateNumber: p.number }).lean();
        return c ? course(user, c) : null;
    }
    const [kind, ...rest] = key.split('-');
    const id = rest.join('-');
    if (kind === 'course') {
        const c = mongoose.isValidObjectId(id) ? await require('../models/Certificate').findOne({ _id: id, userId: user._id }).lean() : null;
        return c ? course(user, c, p.number) : null;
    }
    if (kind === 'lingo') {
        const [courseCode, level] = [rest.slice(0, -1).join('-'), rest[rest.length - 1]];
        return lingo(user, courseCode, level, { number: p.number });
    }
    if (kind === 'groupbrain') {
        const r = await groupBrain(id);
        if (r) r.info.number = p.number;
        return r;
    }
    if (kind === 'competition') return competition(user, id.replace(/^arena-/, ''), p.number);
    if (kind === 'up') {
        const a = mongoose.isValidObjectId(id) ? await require('../models/Achievement').findOne({ _id: id, userId: user._id }).select('title issuer issuedOn createdAt fileUrl thumbnailUrl fileType framed').lean() : null;
        if (!a) return null;
        // Not issued by YATI: said plainly; the file the student uploaded is shown as theirs (2026-11-11, the user asked to see it).
        const imageUrl = a.thumbnailUrl || (a.fileType === 'image' ? a.fileUrl : '');
        // A PDF with no picture of it: passed through here, so the page can draw its first page.
        const pdf = !imageUrl && a.fileType === 'pdf' && /^https:\/\//.test(a.fileUrl || '') ? async (res) => {
            const r = await require('axios').get(a.fileUrl, { responseType: 'stream', timeout: 30000, maxContentLength: 15 * 1024 * 1024 });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${p.number}.pdf"`);
            r.data.pipe(res);
            await new Promise((ok, fail) => { r.data.on('end', ok); r.data.on('error', fail); });
            return true;
        } : null;
        return { info: { kind: 'upload', number: p.number, name: user.name, title: a.title, line: a.issuer ? `From ${a.issuer}` : '', issuedBy: a.issuer || '', issuedAt: a.issuedOn || a.createdAt, valid: false, selfUploaded: true, framed: Boolean(a.framed), imageUrl, fileUrl: a.fileUrl || '' }, pdf };
    }
    return null;
};

const course = async (user, c, number = c.certificateNumber) => {
    const Course = require('../models/Course');
    const courseDoc = await Course.findById(c.courseId).select('title').lean().catch(() => null);
    const title = courseDoc?.title || 'Course';
    return {
        info: { kind: 'course', number, name: user.name, title: 'Certificate of Completion', line: title, issuedBy: ISSUER, issuedAt: c.issuedAt || c.createdAt, valid: true },
        pdf: async (res) => { require('../controllers/certificateController').drawCoursePdf(res, { number: c.certificateNumber || number, name: user.name, title, issuedAt: c.issuedAt || c.createdAt }, { inline: true }); return true; }
    };
};

const lingo = async (user, courseCode, level, { number = null, typed = null } = {}) => {
    const { LinguisticProgress } = require('../linguistic/models');
    const progress = await LinguisticProgress.findOne({ userId: user._id }).select('certificates').lean();
    const c = (progress?.certificates || []).find((x) => (x.course || 'en') === courseCode && x.level === level);
    if (!c) return null;
    let courseName = 'English';
    try { courseName = require('../linguistic/courses').courseInfo(courseCode).name || courseName; } catch { /* the course's code */ }
    const shown = number || c.number || typed;
    return {
        info: { kind: 'multilingo', number: shown, name: user.name, title: `Multilingo ${courseName} · ${LEVEL_LABEL[level] || level}`, line: c.average != null ? `Average score ${c.average}%` : '', issuedBy: ISSUER, issuedAt: c.issuedAt, valid: true, ...(typed && c.number && c.number !== typed ? { nowNumbered: c.number } : {}) },
        pdf: async (res) => { require('../linguistic/certificate').draw(res, { name: user.name, level: c.level, number: c.number || shown, issuedAt: c.issuedAt, average: c.average, courseName }); return true; }
    };
};

const groupBrain = async (certId) => {
    const gb = require('../competitions/groupbrain/certificates');
    const info = await gb.verify(certId);
    if (!info.found) return null;
    const rank = info.rank ? `${['', '1st', '2nd', '3rd'][info.rank] || `${info.rank}th`} place · ` : '';
    return {
        info: { kind: 'groupbrain', number: info.certId, name: info.name, title: `${rank}${info.title}`, line: [info.eventName, info.line].filter(Boolean).join(' · '), issuedBy: 'YATICORP · Group Brain', issuedAt: info.issuedAt, valid: info.valid, revokedAt: info.revokedAt, revokedReason: info.revokedReason },
        pdf: async (res) => {
            const { GroupBrainCertificate } = require('../competitions/groupbrain/models');
            const cert = await GroupBrainCertificate.findOne({ certId: info.certId }).lean();
            if (!cert) return false;
            await gb.pdf(cert, res);
            return true;
        }
    };
};

/** A Games & Competitions certificate (a team competition, or Quiz Arena), checked as its download checks it. */
const competition = async (user, id, number) => {
    if (!mongoose.isValidObjectId(id)) return null;
    const cert = require('../competitions/services/certificate');
    const Competition = require('../competitions/models/Competition');
    const comp = await Competition.findById(id).lean();
    if (comp) {
        if (comp.status !== 'completed' || require('../competitions/services/views').resultsHidden(comp)) return null;
        const Team = require('../competitions/models/Team');
        const team = await Team.findOne({ competitionId: comp._id, status: 'approved', 'players.userId': user._id }).lean();
        if (!team || !cert.eligible(comp, team) || !await cert.tookPart(comp, user._id)) return null;
        const playerName = team.players.find((x) => String(x.userId) === String(user._id))?.name || user.name;
        const place = team.place || null;
        return {
            info: { kind: 'competition', number, name: playerName, title: place ? `${['', '1st', '2nd', '3rd'][place] || `${place}th`} place` : 'Certificate of Participation', line: [comp.name, team.collegeName].filter(Boolean).join(' · '), issuedBy: 'YATICORP · Games & Competitions', issuedAt: comp.completedAt, valid: true },
            pdf: async (res) => { cert.draw(res, { competition: comp, team, playerName, place, number }); return true; }
        };
    }
    const { ArenaCompetition, ArenaEntry } = require('../competitions/arena/models');
    const c = await ArenaCompetition.findById(id).lean();
    if (!c) return null;
    const e = await ArenaEntry.findOne({ competitionId: c._id, userId: user._id }).lean();
    const award = e && require('../competitions/arena/student').certificateFor(c, e);
    if (!award) return null;
    const college = e.collegeName || 'their college';
    const max = (c.paper?.length || 0) * (c.pointsPerQuestion || 0);
    const ord = { 1: '1st', 2: '2nd', 3: '3rd' }[award.place];
    return {
        info: { kind: 'competition', number, name: e.name || user.name, title: award.place ? `${ord} place · Quiz Arena` : 'Certificate of Participation · Quiz Arena', line: [c.title, college].filter(Boolean).join(' · '), issuedBy: 'YATICORP · Games & Competitions', issuedAt: c.resultsPublishedAt, valid: true },
        pdf: async (res) => {
            cert.draw(res, {
                number,
                competition: { name: c.title, game: 'arena', organizedBy: c.organizedBy, completedAt: c.resultsPublishedAt },
                team: { teamName: e.name, collegeName: college },
                playerName: e.name,
                place: award.place,
                paragraph: `This certificate is awarded in recognition of your outstanding performance in Quiz Arena, representing ${college}. You scored ${e.score} of ${max} points across the Live Quiz Battle, the Picture Challenge and the Current Affairs Clash.`,
                line: award.place ? `for finishing ${ord} with ${e.score} of ${max} points, representing ${college}` : `for taking part in Quiz Arena for ${college}, scoring ${e.score} of ${max} points`
            });
            return true;
        }
    };
};

/* ── Routes ─────────────────────────────────────────────────────────────── */

// A few checks a minute from one address: enough for anyone checking certificates, too few to walk every number.
const hits = new Map();
const LIMIT = 40, WINDOW_MS = 60 * 1000;
const limited = (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'x';
    const now = Date.now();
    const h = hits.get(ip);
    if (!h || now - h.start > WINDOW_MS) hits.set(ip, { start: now, n: 1 });
    else if (++h.n > LIMIT) return res.status(429).json({ message: 'Too many checks. Please wait a minute and try again.' });
    if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start > WINDOW_MS) hits.delete(k);
    return next();
};

const check = async (req, res, next) => {
    try {
        if (!parse(req.params.number)) return res.json({ found: false, badFormat: true });
        const r = await find(req.params.number);
        if (!r) return res.json({ found: false });
        res.set('Cache-Control', 'no-store');
        res.json({ found: true, ...r.info, hasPdf: Boolean(r.pdf) && (r.info.valid !== false || Boolean(r.info.selfUploaded)) });
    } catch (err) { next(err); }
};

const pdf = async (req, res, next) => {
    try {
        const r = await find(req.params.number);
        if (!r?.pdf || (r.info.valid === false && !r.info.selfUploaded)) return res.status(404).json({ message: 'No certificate to show for this number.' });
        const drawn = await r.pdf(res);
        if (drawn === false && !res.headersSent) res.status(404).json({ message: 'No certificate to show for this number.' });
    } catch (err) {
        if (!res.headersSent) next(err);
    }
};

module.exports = { parse, find, limited, check, pdf };
