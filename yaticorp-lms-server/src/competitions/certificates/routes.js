/**
 * The Certificate Builder (asked 2026-10-31): one set of routes, mounted twice like the competition management —
 *   /api/competitions/admin/certificates   the platform admin (super admin): every competition, Yaticorp branding
 *   /api/competitions/org/certificates     an organization admin: the competitions it hosted, and its own students
 *                                          in the ones it took part in; its own branding if it wants
 *
 *   GET    /templates                         the template gallery { id, name, swatch, dark }
 *   GET    /defaults                          the branding the form starts with (Yaticorp's, or the organization's name)
 *   GET    /competitions                      the competition types: Chess, Rapid Fire, Code Clash, Brain Sprint, Quiz Arena
 *   GET    /competitions/:kind/:id/participants   who took part, with their place
 *   GET    /designs/for/game/:game            a competition type's certificate design, and how many issued
 *   PUT    /designs/for/game/:game            save it: issued to the winners (and participants) of every competition of that type
 *   POST   /issue                             Certificate Configuration: formal certificates from typed-in details, one or many
 *   GET    /issued?q=&design=                 the certificates made here, newest first
 *   GET    /issued/:certId                    one, with its design (for its preview)
 *   GET    /issued/:certId/pdf                its PDF
 *   GET    /designs/:designId/pdf             a whole batch, one certificate a page
 *   DELETE /issued/:certId                    revoke it (verification then says so)
 *
 * And, with no sign-in (mounted in ../index.js): GET /api/competitions/certificates/verify/:certId.
 */
const express = require('express');
const mongoose = require('mongoose');
const Competition = require('../models/Competition');
const Team = require('../models/Team');
const { ArenaCompetition, ArenaEntry } = require('../arena/models');
const { CertificateDesign, IssuedCertificate } = require('./models');
const T = require('./templates');
const render = require('./render');
const auto = require('./auto');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((err) => {
    if (err?.status) return res.status(err.status).json({ message: err.message });
    if (err?.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors)[0]?.message || 'Check the details.' });
    // Anything else: logged in full, and its reason shown to the admin (these routes are for admins only), so a
    // failed Issue says why instead of "Something went wrong".
    console.error('[certificates]', req.method, req.originalUrl, err);
    if (/cannot create a new collection/i.test(err?.message || '')) {
        return res.status(507).json({ message: 'Could not save: the database has reached its limit of 500 collections, so the certificates’ collection cannot be created. Remove unused collections or upgrade the database plan, then try again.' });
    }
    return res.status(500).json({ message: `Could not save the certificate: ${err?.message || 'unknown error'}` });
});
const fail = (status, message) => Object.assign(new Error(message), { status });
const isId = (id) => mongoose.isValidObjectId(id);
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const MAX_PICTURE = 3 * 1024 * 1024;       // a data URL, as sent (signatures, logo, seal)

/** A picture from the form: a PNG or JPEG data URL, not too big, or ''. */
const picture = (v, what, max = MAX_PICTURE) => {
    const s = String(v || '');
    if (!s) return '';
    if (!render.bytesOf(s)) throw fail(400, `${what}: upload a PNG or JPG picture.`);
    if (s.length > max) throw fail(400, `${what} is too large: keep it under ${Math.floor(max / 1.4 / 1024 / 1024) || 1} MB.`);
    return s;
};

// As the dashboards list them: Quiz and Hackathon (removed 2026-10-28) are not among them.
const SHOWN = { game: { $nin: require('../services/challengeService').CHALLENGES } };

/** An organiser's element edits, checked: known kinds of change only, numbers in range. */
const cleanElements = (raw) => {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const [key, v] of Object.entries(raw).slice(0, 80)) {
        if (!/^[A-Za-z0-9]{1,20}$/.test(key) || !v || typeof v !== 'object') continue;
        const n = (x, lo, hi) => (x === undefined || x === null || x === '' || !Number.isFinite(Number(x)) ? undefined : Math.min(hi, Math.max(lo, Number(x))));
        const e = { dx: n(v.dx, -4000, 4000), dy: n(v.dy, -4000, 4000), s: n(v.s, 0.1, 8), rot: n(v.rot, -360, 360), z: n(v.z, -100, 100) };
        if (typeof v.text === 'string') e.text = v.text.slice(0, 400);
        if (['serif', 'sans', 'mono'].includes(v.family)) e.family = v.family;
        if (typeof v.bold === 'boolean') e.bold = v.bold;
        if (typeof v.italic === 'boolean') e.italic = v.italic;
        if (/^#[0-9a-f]{6}$/i.test(String(v.color || ''))) e.color = v.color;
        if (['left', 'center', 'right'].includes(v.align)) e.align = v.align;
        if (v.hidden === true) e.hidden = true;
        if (v.locked === true) e.locked = true;
        Object.keys(e).forEach((k) => e[k] === undefined && delete e[k]);
        if (Object.keys(e).length) out[key] = e;
    }
    return out;
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '');

/** The public check of a certificate's ID — in the shape the student app's verify page reads (as Group Brain's). */
const verify = async (certId) => {
    const id = String(certId || '').toUpperCase().trim();
    const cert = /^YC-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(id) ? await IssuedCertificate.findOne({ certId: id }).lean() : null;
    if (!cert) return { found: false };
    const design = await CertificateDesign.findById(cert.designId).select('competition date venue branding.name scope organizationId').lean();
    let issuer = design?.branding?.name || '';
    if (!issuer && design?.organizationId) issuer = (await require('../../organizations/models/Organization').findById(design.organizationId).select('name').lean())?.name || '';
    const award = T.awardOf(cert.award);
    return {
        found: true, valid: !cert.revokedAt, certId: cert.certId, name: cert.recipient.name,
        title: award.kind === 'participation' ? 'Certificate of Participation' : award.title.replace(/\b\w+/g, (w) => w[0] + w.slice(1).toLowerCase()),
        line: cert.recipient.institution || '',
        eventName: [design?.competition?.name, design?.date, design?.venue].filter(Boolean).join(' · '),
        issuedBy: issuer || 'Yaticorp India Pvt Ltd',
        issuedAt: cert.createdAt, revokedAt: cert.revokedAt
    };
};

const certificateRoutes = (scope = 'platform') => {
    const router = express.Router();
    const org = (req) => (scope === 'organization' ? req.organization._id : null);
    const mine = (req) => (scope === 'organization' ? { organizationId: req.organization._id } : {});

    /** The competitions this side may certify: { kind, id, name, date, hosted }. */
    const competitionsFor = async (req) => {
        const orgId = org(req);
        let comps; let arenas;
        if (orgId) {
            const entered = await Team.distinct('competitionId', { organizationId: orgId, status: 'approved' });
            // Every one the dashboard lists (its drafts too): the ones it hosts, and the ones it entered.
            comps = await Competition.find({ ...SHOWN, $or: [{ hostOrganizationId: orgId }, { _id: { $in: entered } }] }).select('name startsAt completedAt hostOrganizationId status').sort({ startsAt: -1 }).lean();
            const played = await ArenaEntry.distinct('competitionId', { organizationId: orgId, status: 'approved' });
            arenas = await ArenaCompetition.find({ $or: [{ hostOrganizationId: orgId }, { _id: { $in: played } }] }).select('title startsAt hostOrganizationId status').sort({ startsAt: -1 }).lean();
        } else {
            // Every competition in Games & Competitions, drafts included.
            comps = await Competition.find(SHOWN).select('name startsAt completedAt hostOrganizationId status').sort({ startsAt: -1 }).limit(300).lean();
            arenas = await ArenaCompetition.find({}).select('title startsAt hostOrganizationId status').sort({ startsAt: -1 }).limit(300).lean();
        }
        const hosted = (c) => (orgId ? String(c.hostOrganizationId) === String(orgId) : !c.hostOrganizationId);
        return [
            ...comps.map((c) => ({ kind: 'competition', id: String(c._id), name: c.name, date: fmtDate(c.completedAt || c.startsAt), status: c.status, hosted: hosted(c) })),
            ...arenas.map((a) => ({ kind: 'arena', id: String(a._id), name: a.title, date: fmtDate(a.startsAt), status: a.status, hosted: hosted(a) }))
        ];
    };

    /** One competition this side may certify, or 404. */
    const competitionOf = async (req, kind, id) => {
        if (!['competition', 'arena'].includes(kind) || !isId(id)) throw fail(404, 'Competition not found.');
        const found = (await competitionsFor(req)).find((c) => c.kind === kind && c.id === String(id));
        if (!found) throw fail(404, 'Competition not found.');
        return found;
    };

    router.get('/templates', (req, res) => res.json({ templates: T.TEMPLATES }));

    /*
     * The organisation's own templates (2026-10-31): uploaded on Certificate Configuration, kept on its record (no new
     * collection), listed, and deleted with the bin. At most 12, each a picture under ~2 MB.
     */
    // Kept on the organization's record, or (the platform admin's) on the platform settings: no new collection.
    const Organization = require('../../organizations/models/Organization');
    const Setting = require('../../models/Setting');
    const holder = async (req) => {
        if (scope === 'organization') return { Model: Organization, _id: req.organization._id };
        const doc = await Setting.findOne().select('_id').lean() || await Setting.create({});
        return { Model: Setting, _id: doc._id };
    };
    const ownTemplates = async (req) => {
        const { Model, _id } = await holder(req);
        return (await Model.findById(_id).select('+certificateTemplates').lean())?.certificateTemplates || [];
    };
    const ownView = (t) => ({ id: String(t._id), name: t.name, image: t.image });
    router.get('/own-templates', wrap(async (req, res) => res.json({ templates: (await ownTemplates(req)).map(ownView) })));
    router.post('/own-templates', wrap(async (req, res) => {
        const image = picture(req.body?.image, 'The template', 3 * 1024 * 1024);
        if (!image) throw fail(400, 'Choose a picture for the template.');
        if ((await ownTemplates(req)).length >= 12) throw fail(400, 'At most 12 templates: delete one first.');
        const name = str(req.body?.name, 80) || 'My template';
        const _id = new mongoose.Types.ObjectId();
        const h = await holder(req);
        await h.Model.updateOne({ _id: h._id }, { $push: { certificateTemplates: { _id, name, image } } });
        res.status(201).json({ template: { id: String(_id), name, image } });
    }));
    router.delete('/own-templates/:id', wrap(async (req, res) => {
        if (!isId(req.params.id)) throw fail(404, 'Template not found.');
        const h = await holder(req);
        const r = await h.Model.updateOne({ _id: h._id }, { $pull: { certificateTemplates: { _id: req.params.id } } });
        if (!r.modifiedCount) throw fail(404, 'Template not found.');
        res.json({ ok: true });
    }));

    /*
     * The organisation's defaults (2026-10-31): what it saved once — logo, seal, signatures, the college's lines, the
     * template, the element edits — loaded into every new certificate. Kept on its record (no new collection).
     */
    if (scope === 'organization') {
        router.get('/org-defaults', wrap(async (req, res) => {
            const org = await Organization.findById(req.organization._id).select('+certificateDefaults').lean();
            res.json({ defaults: org?.certificateDefaults || null });
        }));
        router.put('/org-defaults', wrap(async (req, res) => {
            const b = req.body || {};
            const br = b.branding || {};
            const defaults = {
                template: T.TEMPLATES.some((x) => x.id === b.template) ? b.template : 'custom',
                details: { type: b.details?.type === 'inter' ? 'inter' : 'intra', college: str(b.details?.college, 160), department: str(b.details?.department, 160), address: str(b.details?.address, 120), affiliation: str(b.details?.affiliation, 120), tagline: str(b.details?.tagline, 80), title: str(b.details?.title, 80), intro: str(b.details?.intro, 80) },
                description: str(b.description, 600),
                signatories: (Array.isArray(b.signatories) ? b.signatories : []).slice(0, 3).map((x, i) => ({ name: str(x?.name, 80), designation: str(x?.designation, 80), signature: picture(x?.signature, `Signature ${i + 1}`) })),
                branding: { logo: picture(br.logo, 'The logo'), seal: picture(br.seal, 'The seal'), background: picture(br.background, 'The template', 3 * 1024 * 1024), logoShape: ['circle', 'square'].includes(br.logoShape) ? br.logoShape : 'original', org: str(br.org, 100) },
                elements: cleanElements(b.elements),
                showQr: Boolean(b.showQr),
                participation: b.participation !== false,
                places: [1, 2, 3].filter((n) => (Array.isArray(b.places) ? b.places.map(Number) : [1, 2, 3]).includes(n)),
                savedAt: new Date()
            };
            await Organization.updateOne({ _id: req.organization._id }, { $set: { certificateDefaults: defaults } });
            res.json({ ok: true, savedAt: defaults.savedAt });
        }));
    }

    /**
     * The live preview as a PDF (2026-11-02, a Download button over the preview): the design as it stands in the form,
     * with a stand-in recipient. Nothing is saved.
     */
    router.post('/preview-pdf', wrap(async (req, res) => {
        const b = req.body || {};
        const br = b.branding || {};
        const design = {
            scope, template: T.TEMPLATES.some((x) => x.id === b.template) ? b.template : 'custom',
            competition: { name: str(b.competition?.name, 160) }, description: str(b.description, 600), date: str(b.date, 60),
            details: { mode: b.details?.type === 'inter' ? 'inter' : 'intra', college: str(b.details?.college, 160), department: str(b.details?.department, 160), address: str(b.details?.address, 120), affiliation: str(b.details?.affiliation, 120), tagline: str(b.details?.tagline, 80), title: str(b.details?.title, 80), intro: str(b.details?.intro, 80) },
            signatories: (Array.isArray(b.signatories) ? b.signatories : []).slice(0, 3).map((x, i) => ({ name: str(x?.name, 80), designation: str(x?.designation, 80), signature: picture(x?.signature, `Signature ${i + 1}`) })),
            branding: {
                yaticorp: scope === 'platform' ? br.yaticorp !== false : Boolean(br.yaticorp), name: str(br.name, 80), tagline: str(br.tagline, 80), org: str(br.org, 100),
                logo: picture(br.logo, 'The logo'), seal: picture(br.seal, 'The seal'), background: picture(br.background, 'The template', 3 * 1024 * 1024),
                logoShape: ['circle', 'square'].includes(br.logoShape) ? br.logoShape : 'original', logoAt: br.logoAt || null, sealAt: br.sealAt || null
            },
            elements: cleanElements(b.elements), showQr: Boolean(b.showQr)
        };
        const kind = T.AWARDS[b.sample] ? b.sample : 'first';
        const name = str(b.sampleName, 100) || (kind === 'participation' ? 'Participant Name' : 'Winner Name');
        await render.pdf(res, design, [{ certId: 'YC-PREVIEW', recipient: { name, institution: design.details.mode === 'inter' ? 'Participating College' : '' }, award: { kind, title: '' } }], `Certificate_preview.pdf`);
    }));

    // What the form starts with: Yaticorp's branding on the platform's certificates; an organization's own name on its.
    router.get('/defaults', (req, res) => res.json(scope === 'platform'
        ? { scope, yaticorp: true, brandName: 'Inter College Competition', tagline: 'Learn · Compete · Grow', org: 'Yaticorp India Pvt Ltd' }
        : { scope, yaticorp: false, brandName: 'Inter College Competition', tagline: 'Learn · Compete · Grow', org: req.organization.name || '' }));

    // The dropdown: the competition types students see in Competitions (2026-10-31).
    router.get('/competitions', (req, res) => res.json({ competitions: auto.GAME_TYPES.map(([id, name]) => ({ kind: 'game', id, name })) }));

    router.get('/competitions/:kind/:id/participants', wrap(async (req, res) => {
        const c = await competitionOf(req, req.params.kind, req.params.id);
        // An organization certifies all of a competition it hosted, and only its own students in one it entered.
        const own = scope === 'organization' && !c.hosted ? { organizationId: req.organization._id } : {};
        let rows = [];
        if (c.kind === 'competition') {
            const teams = await Team.find({ competitionId: c.id, status: 'approved', ...own }).select('teamName collegeName players place').lean();
            rows = teams.flatMap((t) => t.players.map((p) => ({ userId: String(p.userId), name: p.name, institution: t.collegeName || '', team: t.teamName, place: t.place || null })));
        } else {
            const entries = await ArenaEntry.find({ competitionId: c.id, status: 'approved', ...own }).select('userId name collegeName rank score').sort({ rank: 1, name: 1 }).lean();
            rows = entries.map((e) => ({ userId: String(e.userId), name: e.name, institution: e.collegeName || '', place: e.rank && e.rank <= 3 ? e.rank : null, rank: e.rank, score: e.score }));
        }
        // Names missing on old entries: from the accounts.
        const missing = rows.filter((r) => !r.name).map((r) => r.userId);
        if (missing.length) {
            const users = await require('../../models/User').find({ _id: { $in: missing } }).select('name').lean();
            rows.forEach((r) => { if (!r.name) r.name = users.find((u) => String(u._id) === r.userId)?.name || 'Student'; });
        }
        rows.sort((a, b) => (a.place || 99) - (b.place || 99) || a.name.localeCompare(b.name));
        res.json({ competition: c, participants: rows });
    }));

    /** The saved design for a competition (this side's), or null. */
    /** A saved certificate's look and wording from the form; the competition's name and date are filled in later. */
    const fieldsOf = (b) => {
        const brandingIn = b.branding || {};
        return {
            template: T.TEMPLATES.some((x) => x.id === b.template) ? b.template : T.TEMPLATES[0].id,
            description: str(b.description, 600), date: '', venue: str(b.venue, 120),
            signatories: (Array.isArray(b.signatories) ? b.signatories : []).slice(0, 3).map((s, i) => ({ name: str(s?.name, 80), designation: str(s?.designation, 80), signature: picture(s?.signature, `Signature ${i + 1}`) }))
                .filter((s) => s.name || s.designation || s.signature),
            branding: {
                // Yaticorp's own competitions carry its branding; an organization may use its own, or none.
                yaticorp: scope === 'platform' ? brandingIn.yaticorp !== false : Boolean(brandingIn.yaticorp),
                name: str(brandingIn.name, 80), tagline: str(brandingIn.tagline, 80), org: str(brandingIn.org, 100),
                logo: picture(brandingIn.logo, 'The logo'), seal: picture(brandingIn.seal, 'The seal'),
                background: picture(brandingIn.background, 'Your template', 3 * 1024 * 1024),
                logoAt: (() => {
                    const l = brandingIn.logoAt || {};
                    const n = (v, lo, hi) => (v == null || v === '' || !Number.isFinite(Number(v)) ? undefined : Math.min(hi, Math.max(lo, Number(v))));
                    const out = { fx: n(l.fx, 0, 1), fy: n(l.fy, 0, 1), fs: n(l.fs, 0.2, 5) };
                    return Object.values(out).some((v) => v !== undefined) ? out : null;
                })(),
                logoShape: ['circle', 'square'].includes(brandingIn.logoShape) ? brandingIn.logoShape : 'original',
                sealAt: (() => {
                    const l = brandingIn.sealAt || {};
                    const n = (v, lo, hi) => (v == null || v === '' || !Number.isFinite(Number(v)) ? undefined : Math.min(hi, Math.max(lo, Number(v))));
                    const out = { fx: n(l.fx, 0, 1), fy: n(l.fy, 0, 1), fs: n(l.fs, 0.2, 5) };
                    return Object.values(out).some((v) => v !== undefined) ? out : null;
                })()
            },
            participation: b.participation !== false,
            places: [1, 2, 3].filter((n) => (Array.isArray(b.places) ? b.places.map(Number) : [1, 2, 3]).includes(n)),
            elements: cleanElements(b.elements),
            showQr: Boolean(b.showQr),
            // Organisations (Certificate Configuration): intra- or inter-college, the organising college and department.
            details: { mode: ['intra', 'inter'].includes(b.details?.type) ? b.details.type : '', college: str(b.details?.college, 160), department: str(b.details?.department, 160), address: str(b.details?.address, 120), affiliation: str(b.details?.affiliation, 120), tagline: str(b.details?.tagline, 80), title: str(b.details?.title, 80), intro: str(b.details?.intro, 80) },
            auto: true
        };
    };


    /** A competition type from the dropdown (chess, rapidfire, codeclash, brainsprint, arena), or 404. */
    const typeOf = (game) => {
        const t = auto.GAME_TYPES.find(([id]) => id === game);
        if (!t) throw fail(404, 'Choose one of the competitions.');
        return { kind: 'game', id: t[0], name: t[1] };
    };
    /** This side's saved design for a type, or null. */
    const designFor = (req, game) => CertificateDesign.findOne({ auto: true, 'competition.kind': 'game', 'competition.game': game, scope, organizationId: org(req) }).lean();

    // A type's certificate design, and how many of its competitions are over and certificates issued.
    router.get('/designs/for/game/:game', wrap(async (req, res) => {
        const t = typeOf(req.params.game);
        const design = await designFor(req, t.id);
        if (design) await auto.syncDesign(design);
        const done = await auto.finishedOfType({ competition: { game: t.id }, organizationId: org(req) });
        res.json({
            competition: t,
            design: design ? { ...design, id: String(design._id), details: design.details ? { type: design.details.mode, college: design.details.college, department: design.details.department, address: design.details.address, affiliation: design.details.affiliation, tagline: design.details.tagline, title: design.details.title, intro: design.details.intro } : undefined } : null,
            finished: done.length,
            issued: design ? await IssuedCertificate.countDocuments({ designId: design._id }) : 0
        });
    }));

    /**
     * Save a type's certificate — the template, wording, signatories and branding — and issue it: every competition
     * of that type whose results are out gives it to its placed players (and, with `participation`, everyone else who
     * took part) now; the ones still running, the moment their results are published. Saving again changes the
     * certificates already issued too (they are drawn from this design).
     */
    router.put('/designs/for/game/:game', wrap(async (req, res) => {
        const t = typeOf(req.params.game);
        const b = req.body || {};
        if (Array.isArray(b.places) && !b.places.length && b.participation === false) throw fail(400, 'Tick at least one: 1st, 2nd, 3rd or Participation.');
        const fields = { ...fieldsOf(b), competition: { kind: 'game', game: t.id, id: null, name: '' } };
        const existing = await designFor(req, t.id);
        const design = existing
            ? await CertificateDesign.findByIdAndUpdate(existing._id, { $set: fields }, { new: true, runValidators: true }).lean()
            : (await CertificateDesign.create({ ...fields, scope, organizationId: org(req), createdBy: { id: req.admin?._id || null, name: req.admin?.name || req.admin?.email || '' } })).toObject();
        const issuedNow = await auto.syncDesign(design);
        const issued = await IssuedCertificate.countDocuments({ designId: design._id });
        res.json({ design: { ...design, id: String(design._id) }, issuedNow, issued, resultsOut: issued > 0 });
    }));

    /** A position as typed ("1st Place", "Winner", …) → the award it is filed under. */
    const awardFor = (position) => {
        const p = str(position, 80) || 'Participation';
        const kind = /^1(st)?\b|first/i.test(p) ? 'first' : /^2(nd)?\b|second/i.test(p) ? 'second' : /^3(rd)?\b|third/i.test(p) ? 'third' : /^participation$/i.test(p) ? 'participation' : 'custom';
        return { kind, title: p };
    };

    /**
     * Certificate Configuration (organisations, 2026-10-31): intra- or inter-college certificates from the details
     * typed in — one student or many — on the formal A4 template. Each gets its own ID and QR code.
     * { mode: 'intra' | 'inter', college, department, competition, date, venue, signatories, branding: { logo },
     *   students: [{ name, course, college, position }] }
     */
    router.post('/issue', wrap(async (req, res) => {
        const b = req.body || {};
        const mode = b.mode === 'inter' ? 'inter' : 'intra';
        const competition = str(b.competition, 160);
        if (!competition) throw fail(400, 'Enter the competition name.');
        const students = (Array.isArray(b.students) ? b.students : []).map((x) => ({
            name: str(x?.name, 100), course: str(x?.course, 160), institution: mode === 'inter' ? str(x?.college, 140) : '', award: awardFor(x?.position)
        })).filter((x) => x.name);
        if (!students.length) throw fail(400, 'Add at least one student with a name.');
        if (students.length > 500) throw fail(400, 'At most 500 certificates at a time.');
        const design = await CertificateDesign.create({
            scope, organizationId: org(req), createdBy: { id: req.admin?._id || null, name: req.admin?.name || req.admin?.email || '' },
            template: 'formal',
            competition: { kind: 'none', name: competition },
            date: str(b.date, 60), venue: str(b.venue, 120),
            details: { mode, college: str(b.college, 160), department: str(b.department, 160) },
            signatories: (Array.isArray(b.signatories) ? b.signatories : []).slice(0, 3).map((x, i) => ({ name: str(x?.name, 80), designation: str(x?.designation, 80), signature: picture(x?.signature, `Signature ${i + 1}`) }))
                .filter((x) => x.name || x.designation || x.signature),
            branding: { yaticorp: false, org: str(b.college, 100), logo: picture(b.branding?.logo, 'The logo') },
            count: students.length
        });
        const { newId } = require('./ids');
        const docs = [];
        for (const x of students) {
            for (let tries = 0; ; tries += 1) {
                try {
                    docs.push(await IssuedCertificate.create({ certId: newId(), designId: design._id, scope, organizationId: org(req), competitionName: competition, date: str(b.date, 60), recipient: { name: x.name, institution: x.institution, course: x.course }, award: x.award }));
                    break;
                } catch (err) {
                    if (err?.code !== 11000 || tries > 4) throw err;       // an ID already taken: draw another
                }
            }
        }
        res.status(201).json({ designId: String(design._id), certificates: docs.map(view) });
    }));

    /**
     * The saved certificates (2026-11-03): Certificate 1, 2, 3 … — each a template a competition picks when it is
     * created; its winners (and participants) get it, with their own name, place, and the competition's name and date.
     */
    const savedDesigns = (req) => CertificateDesign.find({ ...mine(req), auto: true, 'competition.kind': 'template' });
    router.get('/designs', wrap(async (req, res) => {
        const designs = await savedDesigns(req).select('competition label template places participation updatedAt createdAt').sort({ createdAt: 1 }).lean();
        for (const d of designs) await auto.syncDesign(d).catch(() => {});
        const counts = await IssuedCertificate.aggregate([{ $match: { designId: { $in: designs.map((d) => d._id) } } }, { $group: { _id: '$designId', n: { $sum: 1 } } }]);
        res.json({
            designs: designs.map((d, i) => ({
                id: String(d._id), label: d.label || `Certificate ${i + 1}`, template: d.template, places: d.places || [1, 2, 3], participation: d.participation !== false,
                issued: counts.find((c) => String(c._id) === String(d._id))?.n || 0, savedAt: d.updatedAt || d.createdAt, createdAt: d.createdAt
            }))
        });
    }));

    const designView = (design) => ({ ...design, id: String(design._id), details: design.details ? { type: design.details.mode, college: design.details.college, department: design.details.department, address: design.details.address, affiliation: design.details.affiliation, tagline: design.details.tagline, title: design.details.title, intro: design.details.intro } : undefined });
    const savedDesign = async (req) => {
        const design = isId(req.params.id) && await savedDesigns(req).findOne({ _id: req.params.id }).lean();
        if (!design) throw fail(404, 'That certificate was not found.');
        return design;
    };
    const checkPlaces = (b) => { if (Array.isArray(b.places) && !b.places.length && b.participation === false) throw fail(400, 'Tick at least one: 1st, 2nd, 3rd or Participation.'); };

    router.get('/designs/:id', wrap(async (req, res) => res.json({ design: designView(await savedDesign(req)) })));

    // A new saved certificate: the next number.
    router.post('/designs', wrap(async (req, res) => {
        const b = req.body || {};
        checkPlaces(b);
        const n = await savedDesigns(req).countDocuments();
        const design = (await CertificateDesign.create({
            ...fieldsOf(b), competition: { kind: 'template', game: '', id: null, name: '' }, label: `Certificate ${n + 1}`,
            scope, organizationId: org(req), createdBy: { id: req.admin?._id || null, name: req.admin?.name || req.admin?.email || '' }
        })).toObject();
        res.status(201).json({ design: designView(design), issued: 0 });
    }));

    // A saved certificate changed: the ones it already issued change with it (they are drawn from it).
    router.put('/designs/:id', wrap(async (req, res) => {
        const b = req.body || {};
        checkPlaces(b);
        const current = await savedDesign(req);
        const design = await CertificateDesign.findByIdAndUpdate(current._id, { $set: fieldsOf(b) }, { new: true, runValidators: true }).lean();
        await auto.syncDesign(design);
        res.json({ design: designView(design), issued: await IssuedCertificate.countDocuments({ designId: design._id }) });
    }));

    const view = (c) => ({ certId: c.certId, designId: String(c.designId), name: c.recipient.name, institution: c.recipient.institution, course: c.recipient.course || '', award: c.award, revoked: Boolean(c.revokedAt), issuedAt: c.createdAt });

    router.get('/issued', wrap(async (req, res) => {
        // Results published since: their certificates issued before the list is read.
        for (const d of await CertificateDesign.find({ ...mine(req), auto: true }).select('-signatories -branding').lean()) await auto.syncDesign(d).catch(() => {});
        const q = str(req.query.q, 80);
        const filter = { ...mine(req) };
        if (isId(req.query.design)) filter.designId = req.query.design;
        if (q) {
            const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const designs = await CertificateDesign.find({ ...mine(req), 'competition.name': rx }).select('_id').lean();
            filter.$or = [{ 'recipient.name': rx }, { certId: rx }, { competitionName: rx }, { designId: { $in: designs.map((d) => d._id) } }];
        }
        const certs = await IssuedCertificate.find(filter).sort({ createdAt: -1 }).limit(500).lean();
        const designs = await CertificateDesign.find({ _id: { $in: [...new Set(certs.map((c) => String(c.designId)))] } }).select('template competition date createdBy').lean();
        const byId = Object.fromEntries(designs.map((d) => [String(d._id), d]));
        res.json({
            certificates: certs.map((c) => ({ ...view(c), competition: byId[String(c.designId)]?.competition?.name || c.competitionName || '', template: byId[String(c.designId)]?.template || '', date: byId[String(c.designId)]?.date || '', issuedBy: byId[String(c.designId)]?.createdBy?.name || '' }))
        });
    }));

    const certOf = async (req) => {
        const cert = await IssuedCertificate.findOne({ certId: String(req.params.certId || '').toUpperCase(), ...mine(req) }).lean();
        if (!cert) throw fail(404, 'Certificate not found.');
        return cert;
    };

    router.get('/issued/:certId', wrap(async (req, res) => {
        const cert = await certOf(req);
        const design = auto.withCompetition(await CertificateDesign.findById(cert.designId).lean(), cert);
        res.json({ certificate: view(cert), design: { template: design.template, competition: design.competition, description: design.description, date: design.date, venue: design.venue, signatories: design.signatories, branding: design.branding, details: design.details ? { type: design.details.mode, college: design.details.college, department: design.details.department, address: design.details.address, affiliation: design.details.affiliation, tagline: design.details.tagline, title: design.details.title, intro: design.details.intro } : undefined, elements: design.elements || {}, showQr: Boolean(design.showQr), scope: design.scope } });
    }));

    router.get('/issued/:certId/pdf', wrap(async (req, res) => {
        const cert = await certOf(req);
        const design = auto.withCompetition(await CertificateDesign.findById(cert.designId).lean(), cert);
        await render.pdf(res, design, [cert], `Certificate_${cert.recipient.name}_${cert.certId}.pdf`);
    }));

    router.get('/designs/:designId/pdf', wrap(async (req, res) => {
        if (!isId(req.params.designId)) throw fail(404, 'Not found.');
        const design = await CertificateDesign.findOne({ _id: req.params.designId, ...mine(req) }).lean();
        if (!design) throw fail(404, 'Not found.');
        const certs = await IssuedCertificate.find({ designId: design._id, revokedAt: null }).sort({ createdAt: 1 }).lean();
        if (!certs.length) throw fail(404, 'Every certificate of this batch was revoked.');
        await render.pdf(res, (c) => auto.withCompetition(design, c), certs, `Certificates_${design.competition.name || design.competition.game || 'batch'}.pdf`);
    }));

    router.delete('/issued/:certId', wrap(async (req, res) => {
        const cert = await certOf(req);
        await IssuedCertificate.updateOne({ _id: cert._id }, { $set: { revokedAt: cert.revokedAt || new Date() } });
        res.json({ ok: true });
    }));

    return router;
};

module.exports = { certificateRoutes, verify };
