/**
 * The college's public admission link (2026-11-16): /api/organizations/apply/:orgCode.
 * A new student opens the link the college shares (student app /apply/<orgCode>), sees the college's
 * name and logo, and fills the full admission form for the 1st year. The application waits in
 * Campus → Admissions → Applications, where the admission office admits it with the student's AI card.
 * No sign-in; stored on Organization.campus.applications (the cluster is at its collection limit).
 */
const express = require('express');
const Organization = require('../organizations/models/Organization');
const C = require('./core');
const { authLimiter, lookupLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
const MODES = ['off', 'optional', 'required'];
// Unless the college says otherwise: these four required, the rest optional.
const FORM_DEFAULTS = { dob: 'required', gender: 'required', fatherName: 'required', address: 'required' };
/** Each detail field's mode on this college's form: { key: 'off' | 'optional' | 'required' }. */
const formModes = (campus) => {
    const set = campus.admissionForm?.fields || {};
    return Object.fromEntries(C.DETAILS.map(([k]) => [k, MODES.includes(set[k]) ? set[k] : FORM_DEFAULTS[k] || 'optional']));
};
// The page's words the college may change (2026-11-16, Customize form). Not set: the page's own words.
const TEXT_KEYS = ['heading', 'sub', 'submit', 'note', 'done', 'closed'];
const SECTION_KEYS = ['course', 'about', 'personal', 'parents', 'address', 'education', 'other', 'more'];
// Field labels it may rename: the standard details, and the four always asked.
const LABEL_KEYS = [...C.DETAILS.map(([k]) => k), 'course', 'section', 'name', 'email', 'phone'];
const cleanText = (t = {}) => ({
    ...Object.fromEntries(TEXT_KEYS.map((k) => [k, C.str(t?.[k], k === 'done' || k === 'note' || k === 'sub' ? 400 : 120)]).filter(([, v]) => v)),
    sections: Object.fromEntries(SECTION_KEYS.map((k) => [k, { title: C.str(t?.sections?.[k]?.title, 80), sub: C.str(t?.sections?.[k]?.sub, 300) }])
        .filter(([, v]) => v.title || v.sub))
});
const cleanLabels = (l = {}) => Object.fromEntries(LABEL_KEYS.map((k) => [k, C.str(l?.[k], 80)]).filter(([, v]) => v));

/** The college's own questions as the office sent them, cleaned (at most 30). */
const cleanQuestions = (list) => {
    const seen = new Set();
    return (Array.isArray(list) ? list : []).slice(0, 30).map((q) => {
        const type = C.QUESTION_TYPES.includes(q?.type) ? q.type : 'text';
        let id = /^q_[a-z0-9]{4,16}$/.test(q?.id) ? q.id : `q_${Math.random().toString(36).slice(2, 10)}`;
        while (seen.has(id)) id = `q_${Math.random().toString(36).slice(2, 10)}`;
        seen.add(id);
        const options = ['select', 'multi'].includes(type)
            ? [...new Set((Array.isArray(q.options) ? q.options : String(q.options || '').split('\n')).map((o) => C.str(o, 80)).filter(Boolean))].slice(0, 40)
            : [];
        return { id, label: C.str(q?.label, 150), type, options, required: Boolean(q?.required) };
    }).filter((q) => q.label && (!['select', 'multi'].includes(q.type) || q.options.length));
};
/** A form setting as the office sent it, cleaned: { intro, fields, custom, text, labels }. */
const cleanForm = (b = {}) => ({
    text: cleanText(b.text),
    labels: cleanLabels(b.labels),
    intro: C.str(b.intro, 1000),
    fields: Object.fromEntries(C.DETAILS.map(([k]) => [k, MODES.includes(b.fields?.[k]) ? b.fields[k] : FORM_DEFAULTS[k] || 'optional'])),
    custom: cleanQuestions(b.custom)
});
/** One answer to a college question, checked: { value } or { error }. Multi answers are joined with ", ". */
const readAnswer = (q, raw) => {
    if (q.type === 'multi') {
        const picked = (Array.isArray(raw) ? raw : String(raw || '').split(',')).map((x) => C.str(x, 80)).filter((x) => q.options.includes(x));
        return { value: picked.join(', ') };
    }
    const v = C.str(raw, q.type === 'long' ? 1000 : 300);
    if (!v) return { value: '' };
    if (q.type === 'select' && !q.options.includes(v)) return { error: `Choose one of the options for “${q.label}”.` };
    if (q.type === 'yesno' && !['Yes', 'No'].includes(v)) return { error: `Answer yes or no for “${q.label}”.` };
    if (q.type === 'number' && !Number.isFinite(Number(v))) return { error: `Enter a number for “${q.label}”.` };
    if (q.type === 'date' && !C.DATE.test(v)) return { error: `Enter a date for “${q.label}”.` };
    return { value: v };
};
/** An application's own fields, checked against the college's form: { value } or { error: [message, field] }. */
const readApplication = (campus, b, { strict = true } = {}) => {
    const dept = campus.departments.find((d) => String(d._id) === String(b.departmentId || ''));
    if (!dept) return { error: ['Choose the course.', 'departmentId'] };
    const sections = dept.sections || [];
    const section = C.str(b.section, 10).toUpperCase();
    if (sections.length > 1 && !sections.includes(section)) return { error: ['Choose the section.', 'section'] };
    const name = C.str(b.name, 100);
    if (name.length < 2) return { error: ['Enter the full name.', 'name'] };
    const email = C.str(b.email, 120).toLowerCase();
    if (!EMAIL.test(email)) return { error: ['Enter a valid email address.', 'email'] };
    const phone = C.str(b.phone, 20).replace(/[^\d+]/g, '');
    if (!/^\+?\d{10,13}$/.test(phone)) return { error: ['Enter a valid 10-digit mobile number.', 'phone'] };
    const modes = formModes(campus);
    const details = Object.fromEntries(C.DETAILS.map(([k]) => [k, C.str(b.details?.[k], 300)]).filter(([k, v]) => v && (!strict || modes[k] !== 'off')));
    if (strict) {
        for (const [k, label] of C.DETAILS) if (modes[k] === 'required' && !details[k]) return { error: [`Enter your ${label.toLowerCase()}.`, k] };
    }
    // The college's own questions (2026-11-16).
    for (const q of C.customQuestions(campus)) {
        const { value, error } = readAnswer(q, b.details?.[q.id]);
        if (error) return { error: [error, q.id] };
        if (strict && q.required && !value) return { error: [`Please answer “${q.label}”.`, q.id] };
        if (value) details[q.id] = value;
    }
    return { value: { departmentId: dept._id, section: section || (sections.length === 1 ? sections[0] : ''), name, email, phone, details }, dept };
};
const MAX_WAITING = 2000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The college, when it takes online applications: { org, campus } or null. */
const openCollege = async (code) => {
    const orgCode = String(code || '').trim().toLowerCase().slice(0, 40);
    if (!orgCode) return null;
    const org = await Organization.findOne({ orgCode: { $regex: `^${orgCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }, status: 'active', campusAllowed: true })
        .select('_id').lean();
    if (!org) return null;
    return C.loadCampus(org._id);
};

const view = ({ org, campus }) => ({
    organization: { name: org.name, orgCode: org.orgCode, logo: org.logo || '', address: org.address || '', phone: org.phone || '', email: org.email || '' },
    open: campus.admissionsOpen !== false && campus.departments.length > 0,
    departments: campus.departments.map((d) => ({ _id: d._id, name: d.name, code: d.code || '', sections: d.sections || [] })),
    // The college's form: its note, each field's mode, its own questions, and its own words (2026-11-16).
    form: formOf(campus),
    // Every standard field with its usual label, so the page (and the editor's live preview) can lay it out.
    catalog: C.DETAILS.map(([key, label]) => ({ key, label }))
});
/** The college's form settings as the page and the editor read them. */
const formOf = (campus) => ({
    intro: campus.admissionForm?.intro || '',
    fields: formModes(campus),
    custom: C.customQuestions(campus).map(({ id, label, type, options, required }) => ({ id, label, type, options, required })),
    text: campus.admissionForm?.text || { sections: {} },
    labels: campus.admissionForm?.labels || {}
});

router.get('/:orgCode', lookupLimiter, async (req, res) => {
    try {
        const found = await openCollege(req.params.orgCode);
        if (!found) return res.status(404).json({ message: 'This admission link is not valid. Please check it with the college.' });
        res.json(view(found));
    } catch (error) {
        console.error('[apply] read failed:', error.message);
        res.status(500).json({ message: 'The admission form could not be loaded. Please try again.' });
    }
});

router.post('/:orgCode', authLimiter, async (req, res) => {
    try {
        const found = await openCollege(req.params.orgCode);
        if (!found) return res.status(404).json({ message: 'This admission link is not valid. Please check it with the college.' });
        const { org, campus } = found;
        if (campus.admissionsOpen === false) return res.status(403).json({ message: `${org.name} is not taking applications right now.` });
        const { value, dept, error } = readApplication(campus, req.body || {});
        if (error) return res.status(400).json({ message: error[0], field: error[1] });
        const { email, phone } = value;
        const waiting = campus.applications || [];
        if (waiting.some((a) => a.email === email || a.phone === phone)) {
            return res.status(409).json({ message: 'An application with this email or mobile number is already waiting. The college will contact you.' });
        }
        if (waiting.length >= MAX_WAITING) return res.status(503).json({ message: 'The college has too many applications waiting. Please try again later.' });
        await C.pushItem(org._id, 'applications', { ...value, createdAt: new Date(), updatedAt: new Date() });
        res.status(201).json({ message: `Your application to ${org.name} for ${dept.name} has been sent.` });
    } catch (error) {
        console.error('[apply] send failed:', error.message);
        res.status(500).json({ message: 'Your application could not be sent. Please try again.' });
    }
});

module.exports = router;
module.exports.formModes = formModes;
module.exports.formOf = formOf;
module.exports.cleanForm = cleanForm;
module.exports.readApplication = readApplication;
