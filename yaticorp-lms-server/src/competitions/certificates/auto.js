/**
 * Certificates that issue themselves (asked 2026-10-31: "they will just create the certificate; when the competition
 * is over, whoever won gets it with their name and place, and the student sees it"). An organiser saves one design
 * for a competition (CertificateDesign with `auto`); once its results are published, every placed player — 1st, 2nd,
 * 3rd — gets a certificate with their own name and place, and, when the design says so, everyone else who took part a
 * participation certificate. Nobody types a name.
 *
 * There is no job to run: `sync` is called whenever it matters — when the design is saved, when the issued list is
 * opened, and when a student asks for their certificates — and issues only what is missing (one per player per
 * design, by a unique index), so calling it again is harmless.
 */
const mongoose = require('mongoose');
const Competition = require('../models/Competition');
const Team = require('../models/Team');
const { ArenaCompetition, ArenaEntry } = require('../arena/models');
const { tookPart } = require('../arena/scoring');
const views = require('../services/views');
const { CertificateDesign, IssuedCertificate } = require('./models');

const AWARD = { 1: 'first', 2: 'second', 3: 'third' };

// The competition types students see in Competitions (2026-10-31): a certificate is designed for a type, and every
// competition of that type gives it to its winners once its results are out.
const GAME_TYPES = [['chess', 'Chess'], ['rapidfire', 'Rapid Fire'], ['codeclash', 'Code Clash'], ['brainsprint', 'Brain Sprint'], ['arena', 'Quiz Arena']];
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '');

/** One competition as the certificates need it, or null while its results are not out. */
const shape = (kind, c) => (kind === 'competition'
    ? (c && c.status === 'completed' && c.resultsPublishedAt && !views.resultsHidden(c) ? { kind, id: String(c._id), game: c.game, name: c.name, date: fmtDate(c.completedAt || c.startsAt), publishedAt: c.resultsPublishedAt, hostOrganizationId: c.hostOrganizationId, designId: c.certificateDesignId || null, winners: c.certificates !== false, participants: c.participationCertificates !== false } : null)
    : (c && c.resultsPublishedAt ? { kind, id: String(c._id), game: 'arena', name: c.title, date: fmtDate(c.startsAt), publishedAt: c.resultsPublishedAt, hostOrganizationId: c.hostOrganizationId, designId: c.certificates?.designId || null, winners: c.certificates?.winners !== false, participants: c.certificates?.participants !== false } : null));

/** The competition, when its results are out, or null. */
const finished = async (kind, id) => {
    if (!mongoose.isValidObjectId(id)) return null;
    if (kind === 'competition') return shape(kind, await Competition.findById(id).lean());
    if (kind === 'arena') return shape(kind, await ArenaCompetition.findById(id).lean());
    return null;
};

/** Every finished competition a type design covers: the platform's own, or the organization's and the ones it entered. */
const finishedOfType = async (design) => {
    const game = design.competition.game;
    const orgId = design.organizationId;
    if (game === 'arena') {
        const played = orgId ? await ArenaEntry.distinct('competitionId', { organizationId: orgId, status: 'approved' }) : [];
        const rows = await ArenaCompetition.find({ resultsPublishedAt: { $ne: null }, ...(orgId ? { $or: [{ hostOrganizationId: orgId }, { _id: { $in: played } }] } : { hostOrganizationId: null }) }).lean();
        return rows.map((c) => shape('arena', c)).filter(Boolean);
    }
    const entered = orgId ? await Team.distinct('competitionId', { organizationId: orgId, status: 'approved' }) : [];
    const rows = await Competition.find({ game, status: 'completed', resultsPublishedAt: { $ne: null }, ...(orgId ? { $or: [{ hostOrganizationId: orgId }, { _id: { $in: entered } }] } : { hostOrganizationId: null }) }).lean();
    return rows.map((c) => shape('competition', c)).filter(Boolean);
};

/** Everyone a design certifies in one competition, from its results: [{ userId, name, institution, place }]. */
const recipientsOf = async (design, comp) => {
    // An organization's design for a competition it did not host: its own students only.
    const own = design.scope === 'organization' && String(comp.hostOrganizationId) !== String(design.organizationId) ? { organizationId: design.organizationId } : {};
    let rows;
    if (comp.kind === 'competition') {
        const teams = await Team.find({ competitionId: comp.id, status: 'approved', ...own }).select('collegeName players place').lean();
        rows = teams.flatMap((t) => t.players.map((p) => ({ userId: p.userId, name: p.name, institution: t.collegeName || '', place: t.place || null })));
    } else {
        const entries = await ArenaEntry.find({ competitionId: comp.id, status: 'approved', ...own }).lean();
        rows = entries.filter(tookPart).map((e) => ({ userId: e.userId, name: e.name, institution: e.collegeName || '', place: e.rank && e.rank <= 3 ? e.rank : null }));
    }
    // The places switched on get their place; a place switched off (and everyone unplaced) a participation
    // certificate when that is on.
    // The competition's own switches too: winners' certificates, participation certificates.
    const places = comp.winners === false ? [] : Array.isArray(design.places) ? design.places : [1, 2, 3];
    return rows.map((r) => ({ ...r, place: places.includes(r.place) ? r.place : null }))
        .filter((r) => r.place || (design.participation !== false && comp.participants !== false));
};

/**
 * A competition-type design is a template (2026-11-03): it issues only for competitions whose results come out after
 * it was saved, never back to ones already over.
 */
const covers = (design, comp) => design.competition?.kind !== 'game' || !design.createdAt || !comp.publishedAt
    || new Date(comp.publishedAt) >= new Date(design.createdAt);

/** Issue what this design still owes in one competition. Returns how many were issued now. */
const syncOne = async (design, comp) => {
    if (!covers(design, comp)) return 0;
    const key = `${comp.kind}:${comp.id}`;
    const people = await recipientsOf(design, comp);
    const have = new Set((await IssuedCertificate.find({ designId: design._id, competitionKey: key }).select('recipient.userId').lean()).map((c) => String(c.recipient.userId)));
    const missing = people.filter((p) => p.userId && !have.has(String(p.userId)));
    if (missing.length) {
        const users = await require('../../models/User').find({ _id: { $in: missing.filter((p) => !p.name).map((p) => p.userId) } }).select('name').lean();
        missing.forEach((p) => { if (!p.name) p.name = users.find((u) => String(u._id) === String(p.userId))?.name || 'Student'; });
    }
    const { newId } = require('./ids');
    let made = 0;
    for (const p of missing) {
        for (let tries = 0; tries < 5; tries += 1) {
            try {
                await IssuedCertificate.create({
                    certId: newId(), designId: design._id, scope: design.scope, organizationId: design.organizationId,
                    competitionKey: key, competitionName: comp.name, date: comp.date,
                    recipient: { name: p.name, institution: p.institution, userId: p.userId },
                    award: { kind: AWARD[p.place] || 'participation', title: '' }
                });
                made += 1;
                break;
            } catch (err) {
                if (err?.code !== 11000) throw err;
                // Already issued (a second sync at the same moment): done. Otherwise an ID already taken: draw another.
                if (/recipient\.userId/.test(err.message)) break;
            }
        }
    }
    if (made) await CertificateDesign.updateOne({ _id: design._id }, { $inc: { count: made } });
    return made;
};

/** Issue what this design still owes: in every competition of its type, or (older designs) its one competition. */
const syncDesign = async (design) => {
    if (!design?.auto) return 0;
    // A saved certificate (2026-11-03): the competitions that picked it.
    if (design.competition?.kind === 'template') {
        const comps = [
            ...(await Competition.find({ certificateDesignId: design._id, status: 'completed', resultsPublishedAt: { $ne: null } }).lean()).map((c) => shape('competition', c)),
            ...(await ArenaCompetition.find({ 'certificates.designId': design._id, resultsPublishedAt: { $ne: null } }).lean()).map((c) => shape('arena', c))
        ].filter(Boolean);
        let made = 0;
        for (const comp of comps) made += await syncOne(design, comp);
        return made;
    }
    if (design.competition?.kind === 'game') {
        let made = 0;
        for (const comp of await finishedOfType(design)) made += await syncOne(design, comp);
        return made;
    }
    const comp = design.competition?.id && await finished(design.competition.kind, design.competition.id);
    return comp ? syncOne(design, comp) : 0;
};

/** Every saved design covering one competition, brought up to date for it. */
const syncCompetition = async (kind, id) => {
    const comp = await finished(kind, id);
    if (!comp) return;
    // The saved certificate the competition picked when it was made (2026-11-03); and older designs made for it alone.
    const designs = await CertificateDesign.find({ auto: true, $or: [
        { 'competition.kind': kind, 'competition.id': id },
        ...(comp.designId ? [{ _id: comp.designId }] : [])
    ] }).lean();
    for (const d of designs) await syncOne(d, comp).catch((err) => console.error('[certificates] auto issue:', err.message));
};

/**
 * A student's certificate for one competition, issued by a design — the host's own design first (the platform's for
 * a platform competition, the college's for its own), else any — or null.
 */
const forStudent = async (userId, kind, id) => {
    await syncCompetition(kind, id);
    const certs = await IssuedCertificate.find({ competitionKey: `${kind}:${id}`, 'recipient.userId': userId, revokedAt: null }).sort({ createdAt: -1 }).lean();
    if (!certs.length) return null;
    const designs = await CertificateDesign.find({ _id: { $in: certs.map((c) => c.designId) } }).lean();
    const comp = await finished(kind, id);
    const hostDesign = designs.find((d) => (comp?.hostOrganizationId ? String(d.organizationId) === String(comp.hostOrganizationId) : d.scope === 'platform'));
    const cert = certs.find((c) => String(c.designId) === String(hostDesign?._id)) || certs[0];
    return { cert, design: withCompetition(designs.find((d) => String(d._id) === String(cert.designId)), cert) };
};

/** The design as it draws this certificate: a type template uses the competition's own name and date. */
const withCompetition = (design, cert) => (['game', 'template'].includes(design.competition?.kind)
    ? { ...design, competition: { ...design.competition, name: cert.competitionName || design.competition?.name || '' }, date: cert.date || design.date || '' }
    : { ...design, competition: { ...design.competition, name: design.competition?.name || cert.competitionName || '' }, date: design.date || cert.date || '' });

/** Which of these competitions have a Builder certificate for this student: a Set of ids. */
const issuedIds = async (userId, kind, ids) => {
    for (const id of ids) await syncCompetition(kind, id);
    const certs = await IssuedCertificate.find({ competitionKey: { $in: ids.map((id) => `${kind}:${id}`) }, 'recipient.userId': userId, revokedAt: null }).select('competitionKey').lean();
    return new Set(certs.map((c) => c.competitionKey.split(':')[1]));
};

module.exports = { GAME_TYPES, finished, finishedOfType, recipientsOf, syncDesign, syncCompetition, forStudent, issuedIds, withCompetition };
