/* global module */
/**
 * The Certificate Builder's templates (2026-10-31): the six designs the account owner chose — Navy & Gold, Emerald
 * & Gold, Lavender, Maroon, Classic and Games — each its picture with every word taken out (public/assets/
 * certificates/<id>.jpg, the same in the server and both apps), and the words written back where the design had
 * them, from what the organiser types and each certificate's recipient. The same shapes are drawn twice — into the
 * PDF on the server (render.js, pdfkit) and into the live previews in the admin and student apps (exact copies of
 * this file: <app>/src/certificates/templates.shared.js; tests/competitions/certificateBuilder.test.js fails when
 * they drift apart) — so what the organiser sees is what is printed.
 *
 * Plain JavaScript, no imports: it runs under Node and in the browser as it is.
 *
 * Every position is in the design picture's own pixels (its `size`). The shapes ('t' is the kind):
 *   bg     { src } | { slot: 'background' }                               the design picture (or the organiser's own), the whole page
 *   rect   { x, y, w, h, fill?, stroke?, sw?, r?, opacity? }
 *   poly   { pts: [[x, y], …], fill, opacity? }
 *   circle { cx, cy, r, fill?, stroke?, sw?, opacity? }
 *   line   { x1, y1, x2, y2, stroke, sw }
 *   text   { x, y, text, size, font, color, align?, maxW?, spacing? }    y is the top of the line; shrinks to fit maxW
 *   para   { x, y, w, text, size, font, color, align?, lineH, maxLines }  wrapped to w (both sides wrap the same way)
 *   rich   { x, y, w, size, lineH, color, boldColor, runs: [{ text, bold }], maxLines }   centred, bold runs bold (richLines)
 *   pic    { src, x, y, w, h }                                            a picture of ours (public/assets/certificates), fitted
 *   img    { slot: 'logo' | 'seal' | 'sig0' | 'sig1' | 'sig2' | 'qr', x, y, w, h }   fitted inside, centred
 * Fonts: serif, serifBold, serifItalic, script, sans, sansBold.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.CERTIFICATE_TEMPLATES = api;
}(typeof self !== 'undefined' ? self : this, () => {
    const AWARDS = {
        first: { title: 'FIRST PLACE', short: '1st', ribbon: 'WINNER', lead: 'for securing', games: 'has won first place in the', tail: 'Winner' },
        second: { title: 'SECOND PLACE', short: '2nd', ribbon: 'RUNNER-UP', lead: 'for securing', games: 'has won second place in the', tail: 'Runner-up' },
        third: { title: 'THIRD PLACE', short: '3rd', ribbon: 'THIRD', lead: 'for securing', games: 'has won third place in the', tail: 'Third Place' },
        participation: { title: 'PARTICIPATION', short: '★', ribbon: 'PARTICIPANT', lead: 'for active', games: 'has taken part in the', tail: '' },
        custom: { title: '', short: '★', ribbon: 'AWARD', lead: 'for being awarded', games: 'has been awarded', tail: '' }
    };
    const DESCRIPTION = {
        award: 'This certificate is awarded in recognition of your outstanding performance and achievement in the competition{ held on {date}}.',
        participation: 'This certificate is presented in appreciation of your enthusiastic participation in the competition{ held on {date}}.'
    };

    /** A recipient's award: { kind, title } → the words it puts on the page. */
    const awardOf = (award = {}) => {
        const kind = AWARDS[award.kind] ? award.kind : 'participation';
        const a = AWARDS[kind];
        const title = kind === 'custom' ? String(award.title || 'Special Award').toUpperCase() : a.title;
        return { kind, ...a, title };
    };
    /** The line under CERTIFICATE: the organiser's own tagline when typed (2026-10-31), else "OF ACHIEVEMENT" / "OF PARTICIPATION". */
    const subOf = (d, upper = true) => (d.subtitle ? (upper ? d.subtitle.toUpperCase() : d.subtitle) : null);
    /** The tagline as typed; otherwise `def`, except on an organisation's certificate (blank). */
    const subLine = (d, def, upper = true) => subOf(d, upper) || (d.plain ? '' : def);
    /** The heading ("Certificate") and the line before the name, as typed; the standard ones only off organisations' certificates. */
    const headOf = (d, def) => d.title || (d.plain ? '' : def);
    const introOf = (d, def) => d.intro || (d.plain ? '' : def);
    /** Heading and intro where the design had them (the design pictures no longer carry them). */
    const heading = (d, h) => [
        ...(headOf(d, 'Certificate') ? [at(h.cx, h.base, h.upper === false ? headOf(d, 'Certificate') : headOf(d, 'Certificate').toUpperCase(), h.size, 'serifBold', h.color, { align: h.align || 'center', maxW: h.w, spacing: h.spacing ?? 3 })] : []),
        ...(h.intro && introOf(d, h.introDef) ? [at(h.icx ?? h.cx, h.intro, h.introUpper ? introOf(d, h.introDef).toUpperCase() : introOf(d, h.introDef), h.introSize || 20, h.introFont || 'serif', h.introColor || '#333333', { align: h.align || 'center', maxW: h.w, spacing: h.introSpacing ?? (h.introUpper ? 4 : 0) })] : [])
    ];
    /** "28/10/2026" → "28th October 2026"; anything else as typed. */
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const niceDate = (v) => {
        const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(v || '').trim());
        if (!m || +m[2] < 1 || +m[2] > 12) return v;
        const day = +m[1];
        const th = day % 100 >= 11 && day % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][day % 10] || 'th';
        return `${day}${th} ${MONTHS[+m[2] - 1]} ${m[3]}`;
    };
    const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

    /** {name}, {competition}, {award}, {institution}, {date} filled in; "{ held on {date}}" only when there is a date. */
    const fill = (text, d) => String(text || '')
        .replace(/\{([^{}]*)\{date\}([^{}]*)\}/g, (_, a, b) => (d.date ? `${a}${d.date}${b}` : ''))
        .replace(/\{(name|competition|award|institution|date)\}/gi, (_, k) => ({
            name: d.name, competition: d.competition, date: d.date, institution: d.institution,
            award: d.award.kind === 'participation' ? 'participation' : d.award.title.toLowerCase()
        })[k.toLowerCase()] || '');

    /**
     * Everything the page says, from what the organiser entered and one recipient:
     * { recipient: { name, institution }, award: { kind, title }, competition, description, date, venue,
     *   signatories: [{ name, designation, signature? }], brand: { name, tagline, org }, hasLogo, ownLogo, hasSeal, certId }
     */
    const words = (input = {}) => {
        const award = awardOf(input.award);
        const d = {
            award,
            name: String(input.recipient?.name || 'Recipient Name').trim(),
            institution: String(input.recipient?.institution || '').trim(),
            competition: String(input.competition || '').trim(),
            date: String(input.date || '').trim(),
            venue: String(input.venue || '').trim(),
            brand: { name: String(input.brand?.name || '').trim(), tagline: String(input.brand?.tagline || '').trim(), org: String(input.brand?.org || '').trim() },
            hasLogo: Boolean(input.hasLogo), ownLogo: Boolean(input.ownLogo), hasSeal: Boolean(input.hasSeal),
            certId: String(input.certId || 'CERT-PREVIEW'),
            signatories: (input.signatories || []).filter((s) => s && (s.name || s.designation || s.signature)).slice(0, 2)
                .map((s, i) => ({ name: String(s.name || '').trim(), designation: String(s.designation || '').trim(), slot: s.signature ? `sig${i}` : null }))
        };
        // The formal certificate (organisations, 2026-10-31): every signatory (up to three), the student's course, the
        // organiser's college and department, intra- or inter-college, and the position exactly as typed.
        d.allSignatories = (input.signatories || []).filter((s) => s && (s.name || s.designation || s.signature)).slice(0, 3)
            .map((s, i) => ({ name: String(s.name || '').trim(), designation: String(s.designation || '').trim(), slot: s.signature ? `sig${i}` : null }));
        d.course = String(input.recipient?.course || '').trim();
        d.subtitle = String(input.details?.tagline || '').trim();
        d.title = String(input.details?.title || '').trim();
        // One field for the heading (2026-11-02): "Certificate of Achievement" is drawn as the big "CERTIFICATE" and,
        // under it, "OF ACHIEVEMENT" — split at its first "of".
        const split = /^(.*?\S)\s+(of\s+.+)$/i.exec(d.title);
        if (split) { d.title = split[1]; d.subtitle = split[2]; }
        // Organisations' certificates (2026-10-31): only what was typed is written — no default heading, tagline, intro or wording.
        d.plain = Boolean(input.plain ?? input.noQr);
        d.typedDescription = String(input.description || '').trim();
        d.intro = String(input.details?.intro || '').trim();
        d.position = String(input.award?.title || '').trim() || (award.kind === 'participation' ? 'Participation' : titleCase(award.title));
        d.details = {
            type: input.details?.type === 'inter' ? 'inter' : 'intra', college: String(input.details?.college || '').trim() || d.brand.org,
            department: String(input.details?.department || '').trim(), address: String(input.details?.address || '').trim(), affiliation: String(input.details?.affiliation || '').trim()
        };
        d.description = fill(String(input.description || '').trim() || DESCRIPTION[award.kind === 'participation' ? 'participation' : 'award'], d);
        if (d.venue && !String(input.description || '').trim()) d.description = d.description.replace(/\.$/, ` at ${d.venue}.`);
        d.issuer = d.brand.org || 'Yaticorp India Pvt Ltd';
        return d;
    };

    /* ---- Pieces ------------------------------------------------------------------------------------------- */

    const ASC = { serif: 0.683, serifBold: 0.683, serifItalic: 0.683, script: 0.683, sans: 0.718, sansBold: 0.718 };
    /** Text placed by its baseline, as it sits in the design. */
    const at = (x, base, text, size, font, color, extra = {}) => ({ t: 'text', x, y: base - size * ASC[font], text, size, font, color, align: 'center', ...extra });
    const para = (x, base, w, text, size, font, color, lineH, maxLines, align = 'center') => ({ t: 'para', x, y: base - size * ASC[font], w, text, size, font, color, align, lineH, maxLines });

    /** The event's name and tagline beside the design's emblem (an uploaded logo over the emblem when `ownLogo`). */
    const brandBlock = (d, b, page) => {
        // The event's emblem and title were taken off every design (2026-10-31): nothing is written there now.
        if (!b.keep) return [];
        const out = [];
        void page;
        const name = d.brand.name.toUpperCase();
        if (name) {
            // Two lines at most, as the design sets "INTER COLLEGE / COMPETITION".
            const half = name.length > 16 ? name.lastIndexOf(' ', Math.ceil(name.length / 2) + 3) : -1;
            const lines = half > 0 ? [name.slice(0, half), name.slice(half + 1)] : [name];
            lines.forEach((l, i) => out.push(at(b.x, lines.length === 2 ? b.base1 + i * b.gap : b.base1 + b.gap / 2, l, b.size, 'serif', b.color, { align: 'left', maxW: b.w, spacing: 3 })));
        }
        if (d.brand.tagline) out.push(at(b.x, b.tagBase, d.brand.tagline.toUpperCase(), b.tagSize || 12, 'sans', b.tagColor || '#4b4b4b', { align: 'left', maxW: b.w, spacing: 3 }));
        return out;
    };

    /**
     * The college, centred (2026-10-31, "the college name and logo should be in the centre"): its logo — uploaded, or
     * Yaticorp's while that is ticked — with its name under it, centred on `cx` in the design's free space at the top.
     */
    const collegeTop = (d, o) => {
        const out = [];
        // The college's address and affiliation, one line under its name (2026-10-31); the block moves up to make room.
        const where = placeLine(d);
        const up = where ? 16 : 0;
        if (d.hasLogo) out.push({ t: 'img', slot: 'logo', x: o.cx - o.logoW / 2, y: o.logoY - up, w: o.logoW, h: o.logoH });
        const base = (d.hasLogo ? o.base : o.base - o.logoH / 2) - up;
        const name = d.details.college || d.brand.org;
        if (name) out.push(at(o.cx, base, name.toUpperCase(), o.size || 18, 'serifBold', o.color, { maxW: o.w || 420, spacing: 2 }));
        if (where) out.push(at(o.cx, base + 19, where.toUpperCase(), 11, 'sans', o.color, { maxW: (o.w || 420) + 40, spacing: 3 }));
        return out;
    };
    /** "Mangaluru, Karnataka · Affiliated to Mangalore University" — what the college typed, or ''. */
    const placeLine = (d) => [d.details?.address, d.details?.affiliation].filter(Boolean).join('  ·  ');


    /** The signatories in the design's places: their signature (uploaded), a line, the name and the designation. */
    const signs = (d, places, ink, muted, lineColor) => d.signatories.slice(0, places.length).flatMap((s, i) => {
        const p = places[i];
        const out = [];
        if (s.slot) out.push({ t: 'img', slot: s.slot, x: p.cx - p.w / 2 - 10, y: p.lineY - 76, w: p.w + 20, h: 72, key: `sig${i}` });
        if (p.line) out.push({ t: 'line', x1: p.cx - p.w / 2, y1: p.lineY, x2: p.cx + p.w / 2, y2: p.lineY, stroke: lineColor, sw: 1.5, key: `sigline${i}` });
        const x = p.align === 'left' ? p.x : p.cx;
        if (s.name) out.push(at(x, p.nameBase, s.name, p.nameSize || 22, p.nameFont || 'serif', ink, { align: p.align || 'center', maxW: p.w + 40, key: `signame${i}` }));
        if (s.designation) out.push(at(x, p.desBase, s.designation, p.desSize || 19, p.desFont || 'serif', muted, { align: p.align || 'center', maxW: p.w + 40, key: `sigdes${i}` }));
        return out;
    });

    /** "✓ Signature Valid — Digitally signed by … — Date: …", as the design has it. */
    const valid = (d, v, ink, muted) => {
        if (d.plain) return [];
        const tick = [[v.x + 9, v.y + 20], [v.x + 16, v.y + 27], [v.x + 31, v.y + 12], [v.x + 34, v.y + 15], [v.x + 16, v.y + 33], [v.x + 6, v.y + 23]];
        return [
            { t: 'circle', cx: v.x + 20, cy: v.y + 21, r: 19, fill: '#22a447' }, { t: 'poly', pts: tick, fill: '#ffffff' },
            at(v.tx, v.base, 'Signature Valid', v.size || 22, 'sansBold', ink, { align: 'left', maxW: 230 }),
            at(v.tx, v.base + v.gap, 'Digitally signed by', v.small || 16, v.font || 'serif', muted, { align: 'left', maxW: 230 }),
            at(v.tx, v.base + v.gap * 2, d.issuer, v.small || 16, v.font || 'serif', muted, { align: 'left', maxW: 230 }),
            ...(d.date ? [at(v.tx, v.base + v.gap * 3, `Date: ${d.date}`, v.small || 16, v.font || 'serif', muted, { align: 'left', maxW: 230 })] : [])
        ];
    };

    /** The QR code that verifies it, and its ID under it. */
    const qr = (d, q, color) => [
        { t: 'rect', x: q.x - 4, y: q.y - 4, w: q.size + 8, h: q.size + 8, fill: '#ffffff', qrPart: true, key: 'qr' },
        { t: 'img', slot: 'qr', x: q.x, y: q.y, w: q.size, h: q.size, qrPart: true, key: 'qr' },
        at(q.x + q.size / 2, q.idBase, d.certId, 14, 'serif', color, { maxW: q.size + 60, qrPart: true, key: 'qr' })
    ];

    /** An uploaded seal, over what the design has there. */
    const seal = (d, s, page) => (d.hasSeal ? [
        ...(s.cover ? [{ t: 'circle', cx: s.cx, cy: s.cy, r: s.cover, fill: page, sealPart: true }] : []),
        { t: 'img', slot: 'seal', x: s.cx - s.size / 2, y: s.cy - s.size / 2, w: s.size, h: s.size }
    ] : []);

    /** The words on the medal's face (Navy & Gold, Emerald & Gold). */
    const medal = (d, m) => {
        // Kept well inside the face, between the laurels (2026-10-31: "1st doesn't fit").
        const out = [at(m.cx, m.ribbonBase, d.award.ribbon, 17, 'serif', m.light, { spacing: 2, maxW: 96 })];
        if (d.award.short === '★') {
            const star = [];
            for (let i = 0; i < 10; i += 1) { const a = -Math.PI / 2 + (Math.PI * i) / 5; const r = i % 2 ? 14 : 32; star.push([m.cx + Math.cos(a) * r, m.shortBase - 24 + Math.sin(a) * r]); }
            out.push({ t: 'poly', pts: star, fill: m.gold });
        } else out.push(at(m.cx, m.shortBase, d.award.short, 56, 'serifBold', m.gold, { maxW: 92 }));
        return out;
    };

    /** The centred designs: subtitle, name, the award between the laurels, the competition, the description. */
    const centred = (d, c) => {
        const GOLD = c.gold || '#a8741e';
        const sub = subLine(d, d.award.kind === 'participation' ? 'OF PARTICIPATION' : 'OF ACHIEVEMENT');
        return [
            at(c.cx, c.sub, sub, c.subSize || 40, 'serifBold', GOLD, { spacing: 8, maxW: c.subW || 460, key: 'tagline' }),
            at(c.cx, c.name, d.name, c.nameSize || 92, 'script', c.nameColor, { maxW: c.nameW || 520, key: 'name' }),
            // The student's college (inter-college), from the results, under the name.
            ...(c.inst && d.institution ? [at(c.cx, c.inst, d.institution, 21, 'serifItalic', c.ink, { maxW: c.nameW || 520, key: 'inst' })] : []),
            at(c.cx, c.lead, d.award.lead, 25, 'serif', c.ink, { key: 'lead' }),
            at(c.cx, c.award, d.award.title, c.awardSize || 70, 'serifBold', GOLD, { maxW: c.awardW || 420, spacing: 1, key: 'award' }),
            ...(d.competition ? [at(c.cx, c.inThe, 'in the', 23, 'serif', c.ink, { key: 'inThe' }), at(c.cx, c.comp, d.competition, c.compSize || 44, 'serifBold', c.compColor, { maxW: c.compW || 480, key: 'comp' })] : []),
            ...(d.plain && !d.typedDescription ? [] : [{ ...para(c.cx, c.desc, c.descW || 600, d.description, c.descSize || 22, 'serif', c.ink, c.descLH || 29, c.descLines || 3), key: 'desc' }])
        ].filter((x) => x.t !== 'text' || x.text);
    };

    /* ---- The six designs ------------------------------------------------------------------------------------ */

    /**
     * Classic Ivory, and the same design in other colours (2026-10-31, "more templates like this, different colours"):
     * the picture's navy recoloured (public/assets/certificates/classic-<colour>.jpg), the words in the matching ink.
     */
    const classicDesign = (id, name, main, ink) => ({
        id, name, swatch: [main, '#c9a227', '#fefdf9'], size: [1420, 1108],
        draw: (d) => {
            const PAGE = '#fefdf9';
            return [
                { t: 'bg', src: `${id}.jpg` },
                ...heading(d, { cx: 710, base: 300, size: 108, w: 820, color: main, intro: 408, introDef: 'This certificate is proudly presented to', introUpper: true, introColor: '#2b2b2b' }),
                ...brandBlock(d, { icon: [125, 66, 137, 114], x: 280, base1: 99, gap: 27, size: 22, w: 215, color: ink, tagBase: 152 }, PAGE),
                ...collegeTop(d, { cx: 710, logoY: 62, logoW: 170, logoH: 58, base: 158, size: 19, w: 400, color: ink }),
                ...centred(d, { cx: 710, sub: 340, subW: 440, name: 500, nameSize: 96, nameW: 500, lead: 572, award: 645, awardW: 450, inThe: 683, comp: 733, compW: 490, desc: 780, descW: 650, descLH: 30, descSize: 23, nameColor: main, compColor: ink, ink: '#2b2b2b' }),
                ...signs(d, [{ cx: 378, w: 255, lineY: 965, line: true, nameBase: 997, nameSize: 23, desBase: 1027, desSize: 20 }, { cx: 1000, w: 260, lineY: 967, line: true, nameBase: 999, nameSize: 23, desBase: 1029, desSize: 20 }], '#1f1f1f', '#333333', '#c9a227'),
                ...seal(d, { cx: 710, cy: 952, size: 165, cover: 0 }, PAGE),
                ...qr(d, { x: 1206, y: 888, size: 112, idBase: 1025 }, ink)
            ];
        }
    });

    /**
     * The words of "Your template" and of the plain white designs (2026-11-02): the college at the top, the title, the
     * name, one paragraph, the signatures — the same on the organiser's own picture and on our white pages.
     */
    const customText = (d, INK = '#14203f', ACC = '#a8741e', TXT = '#26293a', o = {}) => {
        const out = [];
        if (d.hasLogo) out.push({ t: 'img', slot: 'logo', x: 625, y: 26, w: 170, h: 150, key: 'logo' });
        const college = d.details.college || d.brand.org;
        if (college) out.push(at(710, 239, college.toUpperCase(), 48, 'serifBold', INK, { maxW: 980, spacing: 1, key: 'college' }));
        if (d.details.affiliation) out.push(at(710, 272, d.details.affiliation, 26, 'serif', TXT, { maxW: 900, key: 'affil' }));
        if (d.details.address) out.push(at(710, d.details.affiliation ? 303 : 272, d.details.address, 22, 'serif', TXT, { maxW: 900, key: 'address' }));
        const title = headOf(d, 'Certificate');
        if (title) out.push(at(710, o.titleBase || 432, title.toUpperCase(), o.titleSize || 96, 'serifBold', INK, { maxW: 760, spacing: 2, key: 'title' }));
        const tag = subLine(d, d.award.kind === 'participation' ? 'OF PARTICIPATION' : 'OF ACHIEVEMENT');
        if (tag) out.push(at(710, o.tagBase || 478, tag, o.tagSize || 30, 'serifBold', o.tagColor || ACC, { maxW: o.tagW || 640, spacing: 5, key: 'tagline' }));
        const intro = introOf(d, 'This is to certify that');
        if (intro) out.push(at(710, 540, intro, 30, 'serifItalic', TXT, { maxW: 700, key: 'intro' }));
        out.push(at(710, 609, d.name, 72, 'script', INK, { maxW: 780, key: 'name' }));
        out.push({ t: 'line', x1: 383, y1: 632, x2: 1037, y2: 632, stroke: ACC, sw: 1.5, key: 'nameline' });
        if (d.institution) out.push(at(710, 662, d.institution, 22, 'serifItalic', TXT, { maxW: 780, key: 'inst' }));
        const off = d.institution ? 26 : 0;
        // One paragraph (2026-11-02): the standard sentence from the fields, run on, and then the description —
        // the organiser's, or two standard lines when they wrote none.
        const pos = d.position;
        const part = pos.toLowerCase() === 'participation';
        const college2 = college && `at ${college}`;
        const by = [d.details.department && `organised by the ${d.details.department}`, college2].filter(Boolean).join(' ');
        const runs = part
            ? [{ text: `has actively participated${d.competition ? ' in the' : ''}` }]
            : [{ text: 'has secured' }, { text: ` ${pos}`, bold: true, color: ACC }, ...(d.competition ? [{ text: ' in the' }] : [])];
        if (d.competition) runs.push({ text: ` ${d.competition}`, bold: true });
        const tail = [by, d.date && `held on ${niceDate(d.date)}`].filter(Boolean).join(', ');
        runs.push({ text: tail ? `, ${tail}.` : '.' });
        const extra = d.typedDescription || (part
            ? 'This certificate is presented in appreciation of the enthusiasm, effort and sportsmanship shown. We wish you continued success in all your future endeavours.'
            : 'This certificate is awarded in recognition of outstanding performance, dedication and excellence. We wish you continued success in all your future endeavours.');
        runs.push({ text: ` ${extra}` });
        const size = 27;
        out.push({ t: 'rich', key: 'sentence', x: 710, y: 682 + off - size * ASC.serif, w: 1080, size, lineH: 37, color: TXT, boldColor: INK, italic: true, maxLines: 5, runs });
        // The signatures: two at the sides with the seal between them; three share the row equally.
        const signs3 = d.allSignatories;
        const xs = signs3.length >= 3 ? [237, 710, 1183] : signs3.length === 2 ? [360, 1060] : [360];
        const half = signs3.length >= 3 ? 112 : 132;
        signs3.forEach((sg, i) => {
            const cx = xs[i];
            if (sg.slot) out.push({ t: 'img', slot: sg.slot, x: cx - half, y: signs3.length >= 3 ? 893 : 868, w: half * 2, h: signs3.length >= 3 ? 52 : 76, key: `sig${i}` });
            out.push({ t: 'line', x1: cx - half, y1: 949, x2: cx + half, y2: 949, stroke: ACC, sw: 1.5, key: `sigline${i}` });
            if (sg.name) out.push(at(cx, 978, sg.name, 22, 'serifBold', INK, { maxW: half * 2 + 20, key: `signame${i}` }));
            if (sg.designation) out.push(at(cx, sg.name ? 1004 : 978, sg.designation, 19, 'serif', TXT, { maxW: half * 2 + 20, key: `sigdes${i}` }));
        });
        out.push(...qr(d, { x: 1236, y: 838, size: 92, idBase: 948 }, INK));
        return out;
    };

    /*
     * Plain white designs for that layout (2026-11-02): a white page, a frame in one colour, nothing where the words go.
     */
    const frame = (style, main, accent) => {
        const W = 1420, H = 1108;
        const out = [{ t: 'rect', x: 0, y: 0, w: W, h: H, fill: '#ffffff' }];
        if (style === 'double') {
            out.push({ t: 'rect', x: 26, y: 26, w: W - 52, h: H - 52, stroke: main, sw: 10 }, { t: 'rect', x: 46, y: 46, w: W - 92, h: H - 92, stroke: accent, sw: 2 });
        } else if (style === 'corners') {
            out.push({ t: 'rect', x: 34, y: 34, w: W - 68, h: H - 68, stroke: accent, sw: 2.5 });
            const c = (x, y, sx, sy) => ({ t: 'poly', pts: [[x, y], [x + sx * 150, y], [x + sx * 150, y + sy * 14], [x + sx * 14, y + sy * 14], [x + sx * 14, y + sy * 150], [x, y + sy * 150]], fill: main });
            out.push(c(18, 18, 1, 1), c(W - 18, 18, -1, 1), c(18, H - 18, 1, -1), c(W - 18, H - 18, -1, -1));
        } else if (style === 'ribbon') {
            out.push({ t: 'poly', pts: [[0, 0], [190, 0], [0, 190]], fill: main }, { t: 'poly', pts: [[W, H], [W - 190, H], [W, H - 190]], fill: main },
                { t: 'poly', pts: [[205, 0], [225, 0], [0, 225], [0, 205]], fill: accent }, { t: 'poly', pts: [[W - 205, H], [W - 225, H], [W, H - 225], [W, H - 205]], fill: accent },
                { t: 'rect', x: 40, y: 40, w: W - 80, h: H - 80, stroke: accent, sw: 2 });
        } else if (style === 'band') {
            out.push({ t: 'rect', x: 0, y: 0, w: W, h: 16, fill: main }, { t: 'rect', x: 0, y: H - 16, w: W, h: 16, fill: main },
                { t: 'rect', x: 0, y: 16, w: W, h: 4, fill: accent }, { t: 'rect', x: 0, y: H - 20, w: W, h: 4, fill: accent },
                { t: 'rect', x: 36, y: 44, w: W - 72, h: H - 88, stroke: accent, sw: 1.5 });
        } else {
            out.push({ t: 'rect', x: 30, y: 30, w: W - 60, h: H - 60, stroke: main, sw: 3, r: 18 }, { t: 'rect', x: 44, y: 44, w: W - 88, h: H - 88, stroke: accent, sw: 1, r: 12 });
        }
        return out;
    };
    const whiteDesign = (id, name, style, main, accent, ink) => ({
        id, name, swatch: [main, accent, '#ffffff'], size: [1420, 1108], custom: true, white: true,
        sealDefault: (d) => (d.allSignatories.length >= 3 ? { cx: 710, cy: 852, side: 88 } : { cx: 710, cy: 945, side: 160 }),
        draw: (d) => [...frame(style, main, accent), ...customText(d, ink, accent)]
    });

    const TEMPLATES = [
        {
            id: 'emerald', name: 'Emerald & Gold', swatch: ['#0f3b2e', '#c9a227', '#f9f7f1'], size: [1420, 1108],
            draw: (d) => {
                const PAGE = '#f9f7f1';
                return [
                    { t: 'bg', src: 'emerald.jpg' },
                    ...heading(d, { cx: 712, base: 268, size: 104, w: 760, color: '#0f3b2e', intro: 383, introDef: 'This certificate is proudly presented to', introUpper: true, introColor: '#2b2b2b' }),
                    ...collegeTop(d, { cx: 712, logoY: 28, logoW: 150, logoH: 46, base: 100, size: 17, w: 380, color: '#1c2a26' }),
                    ...brandBlock(d, { icon: [90, 60, 122, 95], x: 225, base1: 87, gap: 25, size: 21, w: 220, color: '#1c2a26', tagBase: 136 }, PAGE),
                    ...medal(d, { cx: 1241, ribbonBase: 254, shortBase: 318, light: '#f1dfae', gold: '#e2b552' }),
                    ...centred(d, { cx: 712, sub: 309, name: 480, lead: 554, award: 628, inThe: 670, comp: 718, desc: 768, descLines: 4, nameColor: '#0f3b2e', compColor: '#10241e', ink: '#2b2b2b' }),
                    ...signs(d, [{ cx: 543, w: 190, lineY: 950, nameBase: 976, desBase: 1003, desFont: 'sans' }], '#1f1f1f', '#333333'),
                    ...valid(d, { x: 812, y: 912, tx: 860, base: 945, gap: 20 }, '#111111', '#222222'),
                    ...seal(d, { cx: 722, cy: 966, size: 100, cover: 0 }, PAGE),
                    ...qr(d, { x: 1091, y: 897, size: 118, idBase: 1040 }, '#0f3b2e')
                ];
            }
        },
        {
            id: 'lavender', name: 'Lavender', swatch: ['#3b1d6e', '#c9a227', '#f8f3f2'], size: [1420, 1108],
            draw: (d) => {
                const PAGE = '#faf6f4';
                return [
                    { t: 'bg', src: 'lavender.jpg' },
                    ...heading(d, { cx: 880, base: 292, size: 104, w: 820, color: '#2a1650', intro: 395, introDef: 'This certificate is proudly presented to', introUpper: true, introColor: '#2b2b2b' }),
                    ...brandBlock(d, { icon: [228, 72, 132, 106], x: 372, base1: 100, gap: 25, size: 20, w: 200, color: '#2a2350', tagBase: 150 }, PAGE),
                    ...collegeTop(d, { cx: 862, logoY: 40, logoW: 160, logoH: 54, base: 128, size: 18, w: 420, color: '#2a2350' }),
                    ...centred(d, { cx: 862, sub: 333, subW: 450, name: 503, lead: 570, award: 638, awardW: 400, inThe: 674, comp: 724, compW: 450, desc: 767, descW: 590, descLH: 27, nameColor: '#2a1650', compColor: '#221a3a', ink: '#2b2b2b' }),
                    ...signs(d, [{ cx: 700, w: 180, lineY: 930, line: true, nameBase: 953, nameSize: 19, desBase: 976, desSize: 17 }, { cx: 1020, w: 170, lineY: 930, line: true, nameBase: 953, nameSize: 19, desBase: 976, desSize: 17 }], '#1f1f1f', '#333333', '#b98a3e'),
                    ...seal(d, { cx: 862, cy: 935, size: 90, cover: 0 }, PAGE),
                    ...qr(d, { x: 1166, y: 875, size: 106, idBase: 998 }, '#2a2350')
                ];
            }
        },
        {
            id: 'maroon', name: 'Maroon Royal', swatch: ['#5a0f17', '#c9a227', '#fdf9f2'], size: [1420, 1108],
            draw: (d) => {
                const PAGE = '#fdf9f2';
                return [
                    { t: 'bg', src: 'maroon.jpg' },
                    ...heading(d, { cx: 655, base: 292, size: 106, w: 760, color: '#5a0f17', intro: 418, introDef: 'This certificate is proudly presented to', introUpper: true, introColor: '#2b2b2b' }),
                    ...brandBlock(d, { icon: [82, 64, 124, 106], x: 220, base1: 93, gap: 26, size: 21, w: 215, color: '#3b1a1a', tagBase: 145 }, PAGE),
                    ...collegeTop(d, { cx: 655, logoY: 40, logoW: 160, logoH: 54, base: 130, size: 18, w: 400, color: '#3b1a1a' }),
                    ...centred(d, { cx: 655, sub: 333, subW: 470, name: 515, nameSize: 96, lead: 590, award: 662, awardW: 440, inThe: 700, comp: 748, desc: 793, descW: 620, descLH: 28, descSize: 23, nameColor: '#5a0f17', compColor: '#4a0d14', ink: '#2b2b2b' }),
                    ...signs(d, [{ cx: 442, w: 230, lineY: 963, line: true, nameBase: 992, desBase: 1018 }, { cx: 987, w: 225, lineY: 965, line: true, nameBase: 993, desBase: 1019 }], '#1f1f1f', '#333333', '#b98a3e'),
                    ...seal(d, { cx: 713, cy: 958, size: 140, cover: 74 }, PAGE),
                    ...qr(d, { x: 1191, y: 896, size: 120, idBase: 1040 }, '#3b1a1a')
                ];
            }
        },
        classicDesign('classic', 'Classic Ivory', '#0f1f4a', '#14203f'),
        classicDesign('classic-maroon', 'Classic Maroon', '#5a1018', '#3e0c12'),
        classicDesign('classic-emerald', 'Classic Emerald', '#0f4a2c', '#0b3420'),
        classicDesign('classic-royal', 'Classic Royal Purple', '#3b1f63', '#2a1648'),
        classicDesign('classic-teal', 'Classic Teal', '#0e4f55', '#0a3a3f'),
        classicDesign('classic-charcoal', 'Classic Charcoal', '#2f3338', '#1f2226'),
        {
            id: 'games', name: 'Games Champion', swatch: ['#0b3b52', '#c9a227', '#fdfdfd'], size: [1448, 1086],
            draw: (d) => {
                const PAGE = '#fdfdfd', TEAL = '#106a82', INK = '#1f2937';
                const sub = subLine(d, d.award.kind === 'participation' ? 'of Participation' : `of Achievement — ${d.award.kind === 'custom' ? titleCase(d.award.title) : d.award.tail}`, false);
                const lead = d.award.kind === 'custom' ? `has been awarded ${titleCase(d.award.title)} in the` : d.award.games;
                return [
                    { t: 'bg', src: 'games.jpg' },
                    ...heading(d, { cx: 165, base: 342, size: 104, w: 760, color: '#13213a', align: 'left', upper: false, spacing: 0 }),
                    ...collegeTop(d, { cx: 790, logoY: 102, logoW: 160, logoH: 52, base: 182, size: 17, w: 280, color: '#1f2a44' }),
                    ...brandBlock(d, { icon: [160, 104, 160, 126], x: 335, base1: 145, gap: 26, size: 23, w: 265, color: '#1f2a44', tagBase: 197, tagSize: 13 }, PAGE),
                    at(170, 395, sub, 36, 'sans', INK, { align: 'left', maxW: 760 }),
                    at(170, 535, d.name, 82, 'serifBold', TEAL, { align: 'left', maxW: 790 }),
                    at(170, 594, lead, 24, 'sans', INK, { align: 'left', maxW: 790 }),
                    at(170, 643, d.competition, 40, 'serifBold', TEAL, { align: 'left', maxW: 790 }),
                    ...(d.plain && !d.typedDescription ? [] : [para(170, 693, 760, d.description, 23, 'sans', '#374151', 34, 4, 'left')]),
                    ...signs(d, [{ cx: 332, x: 205, align: 'left', w: 325, lineY: 928, line: true, nameBase: 963, nameSize: 24, nameFont: 'sansBold', desBase: 992, desSize: 21, desFont: 'sans' }], INK, '#374151', '#c9a227'),
                    ...valid(d, { x: 766, y: 893, tx: 818, base: 920, gap: 23, font: 'sans', small: 17 }, '#111111', '#222222'),
                    ...seal(d, { cx: 628, cy: 940, size: 100, cover: 0 }, PAGE),
                    ...qr(d, { x: 1133, y: 872, size: 128, idBase: 1030 }, '#1f2a44')
                ];
            }
        }
    ];

    /** The two serif Games designs (Navy, Peach): the same layout, their own colours. */
    const gamesSerif = (id, name, swatch, ink, nameColor, compColor, accent) => ({
        id, name, swatch, size: [1448, 1086],
        draw: (d) => {
            const PAGE = '#fdfcf8';
            const sub = subLine(d, d.award.kind === 'participation' ? 'of Participation' : `of Achievement — ${d.award.kind === 'custom' ? titleCase(d.award.title) : d.award.tail}`, false);
            const lead = d.award.kind === 'custom' ? `has been awarded ${titleCase(d.award.title)} in the` : d.award.games;
            return [
                { t: 'bg', src: `${id}.jpg` },
                ...heading(d, { cx: 150, base: 362, size: 112, w: 800, color: '#13213a', align: 'left', upper: false, spacing: 0 }),
                // Right of the line beside the event's name: the design's place for the organisation's logo.
                ...collegeTop(d, { cx: 855, logoY: 98, logoW: 150, logoH: 50, base: 176, size: 16, w: 240, color: ink }),
                ...brandBlock(d, { icon: id === 'games-peach' ? [198, 85, 155, 125] : [170, 88, 162, 130], x: id === 'games-peach' ? 372 : 352, base1: id === 'games-peach' ? 122 : 125, gap: 30, size: 24, w: 270, color: ink, tagBase: id === 'games-peach' ? 181 : 186, tagSize: 14 }, PAGE),
                at(152, 418, sub, 44, 'serif', ink, { align: 'left', maxW: 560 }),
                at(152, 557, d.name, 100, 'serifBold', nameColor, { align: 'left', maxW: 790 }),
                at(156, 622, lead, 28, 'serif', ink, { align: 'left', maxW: 790 }),
                at(156, 677, d.competition, 44, 'serifBold', compColor, { align: 'left', maxW: 790 }),
                ...(d.plain && !d.typedDescription ? [] : [para(156, 734, 820, d.description, 26, 'serif', ink, 34, 4, 'left')]),
                ...signs(d, [{ cx: 297, w: 335, lineY: 948, line: true, nameBase: 982, nameSize: 25, nameFont: 'serifBold', desBase: 1013, desSize: 22 }], ink, ink, accent),
                ...valid(d, { x: 775, y: 898, tx: 832, base: 924, gap: 24, small: 17 }, '#111111', ink),
                ...seal(d, { cx: 650, cy: 950, size: 100, cover: 0 }, PAGE),
                ...qr(d, { x: 1136, y: 874, size: 126, idBase: id === 'games-navy' ? 1018 : 1032 }, ink)
            ];
        }
    });
    TEMPLATES.push(
        gamesSerif('games-navy', 'Games Navy & Gold', ['#0f1d3a', '#c9a227', '#fdfcf8'], '#26324a', '#a8741e', '#0f1d3a', '#c9a227'),
        gamesSerif('games-peach', 'Games Peach', ['#e2725b', '#c9a227', '#fdfcf8'], '#2f3a4f', '#c9503a', '#c9503a', '#d9a35b')
    );

    /**
     * The organiser's own design (2026-10-31, "an upload button for their own template"): their picture as the page
     * (the `background` slot), and every word written over it in the Classic layout — the heading too, since their
     * picture has none of our words.
     */
    TEMPLATES.push({
        id: 'custom', name: 'Your template', swatch: ['#0f1f4a', '#c9a227', '#ffffff'], size: [1420, 1108], custom: true,
        /*
         * The words on the organiser's own picture (2026-11-02, the account owner's reference): the college at the top —
         * logo, name, affiliation, address — then the title, the tagline, "This is to certify that", the name large over
         * a gold rule, and the standard sentence of every certificate built from the fields in two or three centred
         * lines ("has secured First Place in the / Code Clash 2026 / held on 28th October 2026 at St Agnes College.");
         * the signatures left and right with the seal between them — three signatories share the row equally.
         */
        sealDefault: (d) => (d.allSignatories.length >= 3 ? { cx: 710, cy: 852, side: 88 } : { cx: 710, cy: 945, side: 160 }),
        draw: (d) => [{ t: 'bg', slot: 'background' }, ...customText(d)]
    });

    /**
     * The formal certificate (organisations' Certificate Configuration, 2026-10-31): premium, minimal, A4 landscape —
     * the organising college and department at the top, the student's name large, and everything else in one
     * paragraph with the position and the competition in bold; signatures and the QR code at the bottom.
     */
    const NAVY = '#1f2a44', GOLD = '#b8913a', MUTED = '#5b6474';
    /** The paragraph, as runs of plain and bold words. */
    const formalRuns = (d, positionColor) => {
        const p = d.position;
        const lower = p.toLowerCase();
        const verb = lower === 'participation' ? null
            : /^(winner|runner[- ]?up|champion)$/.test(lower) ? 'has emerged as the'
                : /place|position|prize|rank/.test(lower) ? 'has secured' : 'has been awarded';
        const runs = [];
        const T = (text, bold = false, color) => runs.push({ text, bold, color });
        const who = d.details.type === 'inter' ? [d.course, d.institution].filter(Boolean).join(', ') : d.course;
        if (who) T(`of ${who}`);
        if (verb) { T(`${who ? ' ' : ''}${verb}`); T(` ${p}`, true, positionColor); if (d.competition) T(verb === 'has emerged as the' ? ' of' : ' in the'); }
        else T(`${who ? ' ' : ''}has actively participated${d.competition ? ' in' : ''}`);
        if (d.competition) T(` ${d.competition}`, true);
        const by = [d.details.department, d.details.college].filter(Boolean).join(', ');
        T(d.details.type === 'inter' ? `, an inter-college competition${by ? ` organised by the ${by}` : ''}` : (by ? `, organised by the ${by}` : ''));
        if (d.date) T(`, held on ${d.date}`);
        if (d.venue) T(` at ${d.venue}`);
        T('.');
        return runs;
    };
    /** The formal page. */
    const formalPage = (d) => {
        const cx = 800;
        const corner = (x, y, sx, sy) => ({ t: 'poly', pts: [[x, y], [x + sx * 70, y], [x + sx * 70, y + sy * 6], [x + sx * 6, y + sy * 6], [x + sx * 6, y + sy * 70], [x, y + sy * 70]], fill: GOLD });
        const signs3 = d.allSignatories;
        const span = [170, 1300];
        const out = [
            { t: 'rect', x: 0, y: 0, w: 1600, h: 1131, fill: '#fffdf8' },
            { t: 'rect', x: 36, y: 36, w: 1528, h: 1059, stroke: GOLD, sw: 4 },
            { t: 'rect', x: 54, y: 54, w: 1492, h: 1023, stroke: NAVY, sw: 1.2 },
            corner(70, 70, 1, 1), corner(1530, 70, -1, 1), corner(70, 1061, 1, -1), corner(1530, 1061, -1, -1),
            // The college: its logo and name at the top, the department under it.
            ...(d.hasLogo ? [{ t: 'img', slot: 'logo', x: cx - 80, y: 84, w: 160, h: 104 }] : []),
            ...(d.details.college ? [at(cx, d.hasLogo ? 238 : 168, d.details.college.toUpperCase(), 32, 'serifBold', NAVY, { spacing: 2, maxW: 1200 })] : []),
            ...(d.details.department ? [at(cx, d.hasLogo ? 270 : 202, d.details.department.toUpperCase(), 16, 'sans', MUTED, { spacing: 4, maxW: 1000 })] : []),
            ...(placeLine(d) ? [at(cx, (d.hasLogo ? 270 : 202) + (d.details.department ? 24 : 0), placeLine(d).toUpperCase(), 13, 'sans', MUTED, { spacing: 3, maxW: 1000 })] : []),
            at(cx, 368, headOf(d, 'Certificate').toUpperCase(), 70, 'serifBold', NAVY, { spacing: 12 }),
            at(cx, 410, subLine(d, d.award.kind === 'participation' ? 'OF PARTICIPATION' : 'OF ACHIEVEMENT'), 22, 'sansBold', GOLD, { spacing: 9 }),
            { t: 'line', x1: cx - 160, y1: 436, x2: cx + 160, y2: 436, stroke: GOLD, sw: 1.5 },
            { t: 'poly', pts: [[cx, 429], [cx + 7, 436], [cx, 443], [cx - 7, 436]], fill: GOLD },
            at(cx, 490, introOf(d, 'This is to certify that'), 26, 'serifItalic', MUTED),
            // The name, large; everything else in one paragraph, the position and the competition in bold.
            at(cx, 594, d.name, 90, 'script', NAVY, { maxW: 1100 }),
            { t: 'line', x1: cx - 280, y1: 622, x2: cx + 280, y2: 622, stroke: GOLD, sw: 1.2 },
            { t: 'rich', x: cx, y: 672 - 25 * ASC.serif, w: 1080, size: 25, lineH: 40, color: '#2b2f38', boldColor: NAVY, maxLines: 4, runs: formalRuns(d) }
        ];
        signs3.forEach((s, i) => {
            const x = span[0] + ((span[1] - span[0]) / signs3.length) * (i + 0.5);
            if (s.slot) out.push({ t: 'img', slot: s.slot, x: x - 135, y: 870, w: 270, h: 80 });
            out.push({ t: 'line', x1: x - 130, y1: 954, x2: x + 130, y2: 954, stroke: NAVY, sw: 1 });
            if (s.name) out.push(at(x, 986, s.name, 22, 'serifBold', NAVY, { maxW: 290 }));
            if (s.designation) out.push(at(x, 1014, s.designation, 17, 'sans', MUTED, { maxW: 290 }));
        });
        out.push(...qr(d, { x: 1360, y: 870, size: 116, idBase: 1020 }, NAVY));
        out.push(at(1418, 1040, 'Scan to verify', 11, 'sans', MUTED, { qrPart: true }));
        return out;
    };
    /**
     * The college certificate (2026-10-31, the account owner's reference, "exactly as it is"): the college's crest
     * large at the top, its name, its place and its affiliation; CERTIFICATE / OF ACHIEVEMENT; the name in gold in the
     * design's frame; one paragraph; three signatories with their lines; the college seal and the QR code.
     */
    const COL = { navy: '#13284a', gold: '#9a6b1f', name: '#8a5a12', ink: '#2b3245', muted: '#3e4a5e' };
    const collegeDesign = (d) => {
        const out = [{ t: 'bg', src: 'college.jpg' }];
        out.push(...heading(d, { cx: 768, base: 396, size: 112, w: 700, color: COL.navy, intro: 503, introDef: 'This is to certify that', introSize: 28, introColor: COL.navy }));
        // The crest, large: from the top border down to just above the college's name.
        if (d.hasLogo) out.push({ t: 'img', slot: 'logo', x: 653, y: 8, w: 230, h: 166 });
        const top = d.hasLogo ? 0 : -70;
        if (d.details.college) out.push(at(768, 217 + top, d.details.college.toUpperCase(), 56, 'serifBold', COL.navy, { maxW: 700 }));
        if (d.details.address) out.push(at(768, 246 + top, d.details.address.toUpperCase(), 18, 'sans', COL.navy, { spacing: 5, maxW: 560 }));
        if (d.details.affiliation) out.push(at(768, 274 + top, d.details.affiliation.toUpperCase(), 15, 'sans', COL.navy, { spacing: 4, maxW: 560 }));
        out.push(at(768, 436, subLine(d, d.award.kind === 'participation' ? 'OF PARTICIPATION' : 'OF ACHIEVEMENT'), 34, 'serifBold', COL.gold, { spacing: 6, maxW: 420 }));
        out.push(at(768, 605, d.name, 80, 'serifBold', COL.name, { maxW: 600 }));
        out.push({ t: 'rich', x: 768, y: 668 - 27 * ASC.serif, w: 1130, size: 27, lineH: 37, color: COL.ink, boldColor: COL.navy, maxLines: 3, runs: formalRuns(d, COL.name) });
        // Signatories: three places, as the design has them (fewer share the same row).
        const signs3 = d.allSignatories;
        const slots = signs3.length === 3 ? [275, 598, 910] : signs3.length === 2 ? [340, 830] : [585];
        signs3.forEach((s, i) => {
            const cx = slots[i];
            if (s.slot) out.push({ t: 'img', slot: s.slot, x: cx - 135, y: 766, w: 270, h: 92 });
            out.push({ t: 'line', x1: cx - 122, y1: 861, x2: cx + 122, y2: 861, stroke: '#b98a3e', sw: 1.5 });
            out.push({ t: 'poly', pts: [[cx, 856], [cx + 5, 861], [cx, 866], [cx - 5, 861]], fill: '#b98a3e' });
            if (s.name) out.push(at(cx, 891, s.name, 20, 'serifBold', COL.navy, { maxW: 300 }));
            // "Faculty Coordinator, Department of …": two lines, at the first comma, as the design sets it.
            if (s.designation) {
                const cut = s.designation.indexOf(',');
                const lines = cut > 0 ? [s.designation.slice(0, cut), s.designation.slice(cut + 1).trim()] : [s.designation];
                lines.forEach((l, j) => out.push(at(cx, 913 + j * 21, l, 16, 'serif', COL.muted, { maxW: 300 })));
            }
        });
        if (d.hasSeal) out.push({ t: 'img', slot: 'seal', x: 1076, y: 766, w: 184, h: 184 });
        out.push({ t: 'rect', x: 1310, y: 782, w: 104, h: 104, fill: '#ffffff', qrPart: true });
        out.push({ t: 'img', slot: 'qr', x: 1314, y: 786, w: 96, h: 96, qrPart: true });
        out.push(at(1361, 905, 'Certificate ID', 16, 'serifBold', COL.navy, { maxW: 160, qrPart: true }));
        out.push(at(1361, 925, d.certId, 15, 'serif', COL.navy, { maxW: 160, qrPart: true }));
        return out;
    };
    TEMPLATES.push({ id: 'college', name: 'College Classic', swatch: [COL.navy, '#c9a227', '#fbfaf5'], size: [1536, 1024], formal: true, draw: collegeDesign });

    /**
     * College Elegant (2026-10-31, the account owner's reference with blanks to fill): the logo in the gold circle, the
     * college's name under it, the name in the frame, and the three lines of the reference — "has secured ___ in the
     * ___, / organised by the ___, / held on ___." — with the blanks filled in bold, each line centred where it was.
     */
    const elegantDesign = (d) => {
        const N = '#13284a', G = '#9a6b1f';
        const out = [{ t: 'bg', src: 'elegant.jpg' }];
        if (d.hasLogo) out.push({ t: 'img', slot: 'logo', x: 712, y: 64, w: 112, h: 112 });
        const where = placeLine(d);
        if (d.details.college || d.brand.org) out.push(at(768, where ? 254 : 264, (d.details.college || d.brand.org).toUpperCase(), where ? 40 : 46, 'serifBold', N, { maxW: 760, spacing: 1 }));
        if (where) out.push(at(768, 282, where.toUpperCase(), 14, 'sans', N, { spacing: 4, maxW: 700 }));
        // Only the name's frame is part of the page (2026-10-31): the title, the tagline and the intro are what is typed.
        if (headOf(d, 'Certificate')) out.push(at(768, 420, headOf(d, 'Certificate').toUpperCase(), 104, 'serifBold', N, { spacing: 2, maxW: 780 }));
        if (subLine(d, d.award.kind === 'participation' ? 'OF PARTICIPATION' : 'OF ACHIEVEMENT')) out.push(at(768, 470, subLine(d, d.award.kind === 'participation' ? 'OF PARTICIPATION' : 'OF ACHIEVEMENT'), 32, 'serifBold', G, { spacing: 7, maxW: 640 }));
        if (introOf(d, 'This is to certify that')) out.push(at(768, 524, introOf(d, 'This is to certify that'), 30, 'serif', N, { maxW: 640 }));
        out.push(at(768, 608, d.name, 66, 'serifBold', '#8a5a12', { maxW: 680 }));
        const p = d.position;
        const by = [d.details.department, d.details.college || d.brand.org].filter(Boolean).join(', ');
        // A line of plain and bold words, centred; smaller when it is long, so it stays inside the border.
        const line = (base, runs) => {
            const len = runs.reduce((n, r) => n + r.text.length, 0);
            const size = Math.max(19, Math.min(28, Math.floor(28 * 66 / Math.max(66, len))));
            out.push({ t: 'rich', x: 768, y: base - size * ASC.serif, w: 1200, size, lineH: 34, color: N, boldColor: N, maxLines: 1, runs });
        };
        if (d.competition) line(689, p.toLowerCase() === 'participation'
            ? [{ text: 'has participated in the' }, { text: ` ${d.competition}`, bold: true }, { text: ',' }]
            : [{ text: 'has secured' }, { text: ` ${p}`, bold: true, color: G }, { text: ' in the' }, { text: ` ${d.competition}`, bold: true }, { text: ',' }]);
        if (by) line(736, [{ text: 'organised by the' }, { text: ` ${by}`, bold: true }, { text: d.date ? ',' : '.' }]);
        if (d.date) line(by ? 780 : 736, [{ text: 'held on' }, { text: ` ${d.date}`, bold: true }, { text: '.' }]);
        // The two signature lines of the design.
        d.allSignatories.slice(0, 2).forEach((s, i) => {
            const cx = [475, 1060][i];
            if (s.slot) out.push({ t: 'img', slot: s.slot, x: cx - 135, y: 784, w: 270, h: 88 });
            out.push({ t: 'line', x1: cx - 155, y1: 877, x2: cx + 155, y2: 877, stroke: '#b98a3e', sw: 1.5 });
            out.push({ t: 'poly', pts: [[cx, 872], [cx + 5, 877], [cx, 882], [cx - 5, 877]], fill: '#b98a3e' });
            if (s.name) out.push(at(cx, 910, s.name, 21, 'serifBold', N, { maxW: 330 }));
            if (s.designation) out.push(at(cx, 934, s.designation, 17, 'serif', '#3e4a5e', { maxW: 330 }));
        });
        // The QR code between them; the seal, if any, to the left of the first.
        out.push({ t: 'rect', x: 721, y: 818, w: 94, h: 94, fill: '#ffffff', qrPart: true });
        out.push({ t: 'img', slot: 'qr', x: 725, y: 822, w: 86, h: 86, qrPart: true });
        out.push(at(768, 930, d.certId, 13, 'serif', N, { maxW: 160, qrPart: true }));
        if (d.hasSeal) out.push({ t: 'img', slot: 'seal', x: 110, y: 800, w: 130, h: 130 });
        return out;
    };
    TEMPLATES.push({ id: 'elegant', name: 'College Elegant', swatch: ['#13284a', '#c9a227', '#fbf6ec'], size: [1536, 1024], formal: true, draw: elegantDesign });

    /**
     * Crimson Elegant (2026-10-31, the account owner's reference with blanks): the white-and-gold page with the crimson
     * ribbons and the medal on the ribbon (public/assets/certificates/crimson.jpg). The college at the top, the name in
     * the frame, the reference's three lines — "has secured ___ in the ___, / organised by the ___, / held on ___." —
     * filled in bold where the blanks were, the signatures under them, the organisation's seal on the medal.
     */
    const crimsonDesign = (d) => {
        const R = '#7a1020', G = '#a8741e', N = '#1d2440';
        const out = [{ t: 'bg', src: 'crimson.jpg' }];
        out.push(...heading(d, { cx: 768, base: 316, size: 134, w: 880, color: '#7a1020', intro: 468, introDef: 'This is to certify that', introSize: 32, introColor: '#1d2440' }));
        out.push(...collegeTop(d, { cx: 768, logoY: 34, logoW: 120, logoH: 46, base: 104, size: 21, w: 620, color: R }));
        out.push(at(768, 353, subLine(d, d.award.kind === 'participation' ? 'OF PARTICIPATION' : 'OF ACHIEVEMENT'), 38, 'serifBold', G, { spacing: 9, maxW: 580 }));
        out.push(at(768, 574, d.name, 66, 'serifBold', R, { maxW: 720 }));
        const p = d.position;
        const by = [d.details.department, d.details.college || d.brand.org].filter(Boolean).join(', ');
        const line = (base, runs) => {
            const len = runs.reduce((n, r) => n + r.text.length, 0);
            const size = Math.max(19, Math.min(29, Math.floor(29 * 62 / Math.max(62, len))));
            out.push({ t: 'rich', x: 768, y: base - size * ASC.serif, w: 1100, size, lineH: 34, color: N, boldColor: N, maxLines: 1, runs });
        };
        if (d.competition) line(672, p.toLowerCase() === 'participation'
            ? [{ text: 'has participated in the' }, { text: ` ${d.competition}`, bold: true }, { text: ',' }]
            : [{ text: 'has secured' }, { text: ` ${p}`, bold: true, color: R }, { text: ' in the' }, { text: ` ${d.competition}`, bold: true }, { text: ',' }]);
        if (by) line(718, [{ text: 'organised by the' }, { text: ` ${by}`, bold: true }, { text: d.date ? ',' : '.' }]);
        if (d.date) line(by ? 758 : 718, [{ text: 'held on' }, { text: ` ${d.date}`, bold: true }, { text: '.' }]);
        // Two signatories under the lines, inside the swooshes.
        d.allSignatories.slice(0, 2).forEach((s, i) => {
            const cx = [520, 1016][i];
            if (s.slot) out.push({ t: 'img', slot: s.slot, x: cx - 130, y: 808, w: 260, h: 84 });
            out.push({ t: 'line', x1: cx - 125, y1: 898, x2: cx + 125, y2: 898, stroke: G, sw: 1.5 });
            out.push({ t: 'poly', pts: [[cx, 893], [cx + 5, 898], [cx, 903], [cx - 5, 898]], fill: G });
            if (s.name) out.push(at(cx, 928, s.name, 21, 'serifBold', R, { maxW: 300 }));
            if (s.designation) out.push(at(cx, 952, s.designation, 17, 'serif', N, { maxW: 300 }));
        });
        // The organisation's seal, on the medal.
        if (d.hasSeal) out.push({ t: 'circle', cx: 1375, cy: 268, r: 92, fill: '#5a0d18', sealPart: true }, { t: 'img', slot: 'seal', x: 1290, y: 183, w: 170, h: 170, shape: 'circle' });
        out.push(...qr(d, { x: 722, y: 812, size: 92, idBase: 925 }, R));
        return out;
    };
    TEMPLATES.push({ id: 'crimson', name: 'Crimson Elegant', swatch: ['#7a1020', '#c9a227', '#fbf7ef'], size: [1536, 1024], formal: true, draw: crimsonDesign });

    TEMPLATES.push({ id: 'formal', name: 'Formal A4', swatch: [NAVY, GOLD, '#fffdf8'], size: [1600, 1131], formal: true, draw: (d) => formalPage(d) });

    /**
     * A paragraph of plain and bold runs, wrapped to `width` and centred: [{ width, words: [{ text, bold, x }] }].
     * `measure(text, bold)` gives a width. A run that does not begin with a space joins the word before it, so
     * "Competition" + ", held on…" reads "Competition, held on…". Used the same way by the PDF and the previews.
     */
    const richLines = (runs, width, measure, maxLines = 99) => {
        const words = [];
        let glue = false;
        for (const r of runs) {
            String(r.text).split(/(\s+)/).forEach((part) => {
                if (!part) return;
                if (/^\s+$/.test(part)) { glue = false; return; }
                if (glue && words.length) words[words.length - 1].parts.push({ text: part, bold: r.bold, color: r.color });
                else words.push({ parts: [{ text: part, bold: r.bold, color: r.color }] });
                glue = true;
            });
        }
        const space = measure(' ', false);
        const wOf = (w) => w.parts.reduce((n, p) => n + measure(p.text, p.bold), 0);
        const lines = [];
        let line = [];
        let lw = 0;
        for (const w of words) {
            const ww = wOf(w);
            if (line.length && lw + space + ww > width) { lines.push({ line, lw }); line = []; lw = 0; }
            lw += (line.length ? space : 0) + ww;
            line.push({ w, ww });
        }
        if (line.length) lines.push({ line, lw });
        return lines.slice(0, maxLines).map(({ line: l, lw: total }) => {
            let x = -total / 2;
            const out = [];
            l.forEach(({ w, ww }, i) => {
                let px = x;
                w.parts.forEach((p) => { out.push({ text: p.text, bold: p.bold, color: p.color, x: px }); px += measure(p.text, p.bold); });
                x += ww + (i < l.length - 1 ? space : 0);
            });
            return { width: total, words: out };
        });
    };

    TEMPLATES.push(
        whiteDesign('white-gold', 'White · Gold frame', 'double', '#b8913a', '#d9bf7a', '#1f2a44'),
        whiteDesign('white-navy', 'White · Navy corners', 'corners', '#1f2a44', '#b8913a', '#1f2a44'),
        whiteDesign('white-maroon', 'White · Maroon ribbons', 'ribbon', '#7a1020', '#c9a227', '#5a0f17'),
        whiteDesign('white-emerald', 'White · Emerald bands', 'band', '#0f4a2c', '#c9a227', '#0f3b2e'),
        whiteDesign('white-classic', 'White · Classic', 'rounded', '#3a3f4b', '#b8913a', '#1f2433'),
        // Navy ribbon (2026-11-02, the account owner's picture): the title above the ribbon, the tagline on it.
        {
            id: 'navy-ribbon', name: 'Navy ribbon', swatch: ['#123a7a', '#d4a63a', '#fdfaf3'], size: [1420, 1108], custom: true, white: true,
            sealDefault: (d) => (d.allSignatories.length >= 3 ? { cx: 710, cy: 852, side: 88 } : { cx: 710, cy: 945, side: 160 }),
            draw: (d) => [{ t: 'bg', src: 'navy-ribbon.jpg' }, ...customText(d, '#14284f', '#b8862a', '#26293a', { titleBase: 380, titleSize: 88, tagBase: 466, tagSize: 26, tagColor: '#f3d27a', tagW: 420 })]
        }
    );

    // Designs saved with the first templates (before 2026-10-31's six) open in the nearest of these.
    // Navy & Gold removed (2026-10-31): a design saved with it opens as College Classic.
    const OLD = { 'trophy-panel': 'crimson', 'trophy-ribbon': 'crimson', navy: 'college', royal: 'college', midnight: 'college', rose: 'lavender', indigo: 'lavender', sky: 'classic', trophy: 'formal' };
    const templateOf = (id) => TEMPLATES.find((t) => t.id === (OLD[id] || id)) || TEMPLATES[0];
    const sizeOf = (id) => templateOf(id).size;

    /** The shapes of one certificate. */
    // `noQr` (organisations' certificates, 2026-10-31): the QR code, its box and the ID under it left out.
    const layout = (templateId, input) => {
        const t = templateOf(templateId);
        let shapes = t.draw(words(input));
        if (input?.noQr) shapes = shapes.filter((x) => !x.qrPart);
        // The logo as the organiser set it (2026-10-31): `logoAt` — its centre (fx, fy) as shares of the page and its
        // size (fs) as a multiple of the template's own — and its shape: 'original', 'circle' or 'square'.
        const la = input?.logoAt || {};
        const shape = ['circle', 'square'].includes(input?.logoShape) ? input.logoShape : 'original';
        if (input?.hasLogo && (Number.isFinite(la.fx) || Number.isFinite(la.fs) || shape !== 'original')) {
            const [W, H] = t.size;
            const i = shapes.findIndex((x) => x.t === 'img' && x.slot === 'logo');
            const own = i >= 0 ? shapes[i] : { t: 'img', slot: 'logo', x: W * 0.45, y: H * 0.05, w: W * 0.1, h: W * 0.1, key: 'logo' };
            const fs = Number.isFinite(la.fs) ? Math.min(5, Math.max(0.2, la.fs)) : 1;
            let w = own.w * fs, h = own.h * fs;
            if (shape !== 'original') { w = Math.min(w, h); h = w; }
            const cx = Number.isFinite(la.fx) ? Math.min(1, Math.max(0, la.fx)) * W : own.x + own.w / 2;
            const cy = Number.isFinite(la.fy) ? Math.min(1, Math.max(0, la.fy)) * H : own.y + own.h / 2;
            const logo = { ...own, x: cx - w / 2, y: cy - h / 2, w, h, shape, fs, base: { w: own.w, h: own.h } };
            shapes = i >= 0 ? shapes.map((x, j) => (j === i ? logo : x)) : [...shapes, logo];
        }
        // The seal (2026-10-31): the same on every design — in the middle at the bottom when uploaded, then wherever
        // the organiser drags it (`sealAt`: centre as shares of the page, fs its size as a multiple of 1).
        shapes = shapes.filter((x) => x.slot !== 'seal' && !x.sealPart);
        if (input?.hasSeal) {
            const [W, H] = t.size;
            const sa = input.sealAt || {};
            const fs = Number.isFinite(sa.fs) ? Math.min(5, Math.max(0.2, sa.fs)) : 1;
            // The design's own place for it, if it has one (Your template: between the signatures).
            const own = t.sealDefault ? t.sealDefault(words(input)) : { cx: 0.5 * W, cy: 0.86 * H, side: W * 0.1 };
            const side = own.side * fs;
            const cx = Number.isFinite(sa.fx) ? Math.min(1, Math.max(0, sa.fx)) * W : own.cx;
            const cy = Number.isFinite(sa.fy) ? Math.min(1, Math.max(0, sa.fy)) * H : own.cy;
            shapes.push({ t: 'img', slot: 'seal', x: cx - side / 2, y: cy - side / 2, w: side, h: side, fs, base: { w: own.side, h: own.side }, key: 'seal' });
        }
        // Every element as the organiser edited it (the Smart Certificate Builder, 2026-10-31).
        return applyElements(shapes.filter((x) => x.t !== 'text' || x.text), input?.elements);
    };

    /*
     * Fonts: a family (serif, sans, mono) and bold / italic. Each shape's font is one key of the renderers' FONTS.
     */
    const familyOf = (f) => (String(f).startsWith('sans') ? 'sans' : String(f).startsWith('mono') ? 'mono' : 'serif');
    const styleOf = (f) => ({ bold: /Bold/.test(f) || f === 'script', italic: /Italic/.test(f) || f === 'script' });
    const fontKey = (family, bold, italic) => (family === 'serif'
        ? (bold && italic ? 'script' : bold ? 'serifBold' : italic ? 'serifItalic' : 'serif')
        : `${family}${bold ? 'Bold' : ''}${italic ? 'Italic' : ''}`);

    /**
     * The organiser's edits, element by element (`key`), over the design's own layout. Each edit is a change, not a
     * copy — dx/dy (a move), s (a scale: an image's size, a text's font size), rot (degrees, about its centre), z (layer),
     * text, family / bold / italic, color, align, hidden — so the design underneath can change and the edits still sit.
     */
    const applyElements = (shapes, els) => {
        if (!els || typeof els !== 'object') return shapes;
        const out = [];
        shapes.forEach((s, i) => {
            const e = s.key ? els[s.key] : null;
            if (!e) { out.push({ ...s, i }); return; }
            if (e.hidden) return;
            const o = { ...s, i };
            const dx = Number(e.dx) || 0, dy = Number(e.dy) || 0, sc = Number(e.s) || 1;
            if (o.t === 'text' || o.t === 'para') {
                if (typeof e.text === 'string') o.text = e.text;
                if (sc !== 1) {
                    o.size *= sc;
                    if (o.maxW) o.maxW *= sc;
                    if (o.lineH) o.lineH *= sc;
                    if (o.t === 'para') o.w *= sc;
                    if (o.spacing) o.spacing *= sc;
                }
                if (e.family || typeof e.bold === 'boolean' || typeof e.italic === 'boolean') {
                    const st = styleOf(o.font);
                    o.font = fontKey(e.family || familyOf(o.font), typeof e.bold === 'boolean' ? e.bold : st.bold, typeof e.italic === 'boolean' ? e.italic : st.italic);
                }
                if (e.color) o.color = e.color;
                if (e.align) o.align = e.align;
                o.x += dx; o.y += dy;
            } else if (o.t === 'rich') {
                if (sc !== 1) { o.size *= sc; o.lineH *= sc; o.w *= sc; }
                if (e.color) { o.color = e.color; o.boldColor = e.color; }
                if (typeof e.italic === 'boolean') o.italic = e.italic;
                o.x += dx; o.y += dy;
            } else if (o.t === 'img' || o.t === 'rect' || o.t === 'pic') {
                if (sc !== 1) { const cx = o.x + o.w / 2, cy = o.y + o.h / 2; o.w *= sc; o.h *= sc; o.x = cx - o.w / 2; o.y = cy - o.h / 2; }
                o.x += dx; o.y += dy;
            } else if (o.t === 'line') {
                if (sc !== 1) { const cx = (o.x1 + o.x2) / 2; o.x1 = cx + (o.x1 - cx) * sc; o.x2 = cx + (o.x2 - cx) * sc; }
                o.x1 += dx; o.x2 += dx; o.y1 += dy; o.y2 += dy;
                if (e.color) o.stroke = e.color;
            } else if (o.t === 'poly') o.pts = o.pts.map(([x, y]) => [x + dx, y + dy]);
            else if (o.t === 'circle') { o.cx += dx; o.cy += dy; }
            if (Number(e.rot)) o.rot = Number(e.rot);
            if (Number.isFinite(Number(e.z))) o.z = Number(e.z);
            out.push(o);
        });
        return out.sort((a, b) => (a.z || 0) - (b.z || 0) || a.i - b.i).map((s) => { const o = { ...s }; delete o.i; return o; });
    };

    /** Lines of `text` at most `width` wide, by `measure(text) → width` (used the same way on both sides). */
    const wrap = (text, width, measure, maxLines = 99) => {
        const lines = [];
        let line = '';
        for (const word of String(text || '').split(/\s+/).filter(Boolean)) {
            const next = line ? `${line} ${word}` : word;
            if (measure(next) <= width || !line) line = next;
            else { lines.push(line); line = word; }
        }
        if (line) lines.push(line);
        if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[\s,.;:]+$/, '')}…`; }
        return lines;
    };

    return {
        AWARDS, awardOf, words, layout, wrap, richLines, templateOf, sizeOf, familyOf, styleOf, fontKey,
        TEMPLATES: TEMPLATES.map(({ id, name, swatch, size, custom = false, formal = false, white = false }) => ({ id, name, swatch, size, custom, formal, white, bg: (custom && id !== 'navy-ribbon') || (formal && !['college', 'elegant', 'crimson'].includes(id)) ? null : `${id}.jpg`, dark: false }))
    };
}));
