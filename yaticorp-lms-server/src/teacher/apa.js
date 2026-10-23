/**
 * Publications as an APA 7 reference list, and as a spreadsheet.
 *
 * A reference is a list of segments ({ text, italic }) so the Word file can
 * set journal names and book titles in italics; `text` joins them for
 * copying. Authors are tidied into APA's "Surname, A. B." when they were
 * typed as "Asha B. Rao" or "Rao AB"; anything already in APA form is kept.
 */
const XLSX = require('xlsx');
const { buildDocx, paragraph } = require('./docx');

const LABELS = {
    type: { journal: 'Journal article', conference: 'Conference paper', chapter: 'Book chapter', book: 'Book', patent: 'Patent', preprint: 'Preprint', other: 'Other' },
    status: { idea: 'Idea', drafting: 'Drafting', submitted: 'Submitted', under_review: 'Under review', revision: 'Revision', accepted: 'Accepted', published: 'Published', rejected: 'Rejected' }
};

const INITIALS = /^(?:\p{Lu}\.\s*-?\s*)+$/u;
const TITLES = /^(?:dr|prof|professor|mr|mrs|ms|miss|shri|sri|smt|kum)\.?\s+/i;

/** Already "Surname, A. B." (one name, or a list joined by commas and "&"). */
const isApa = (text) => {
    const parts = text.replace(/&/g, ',').split(',').map((s) => s.trim()).filter(Boolean);
    return parts.length >= 2 && parts.length % 2 === 0
        && parts.every((part, i) => (i % 2 ? INITIALS.test(part) : !/\./.test(part)));
};

/** One name as "Surname, A. B.". */
const apaName = (raw) => {
    let name = raw.replace(/\s+/g, ' ').trim();
    while (TITLES.test(name)) name = name.replace(TITLES, '');
    if (!name) return '';
    if (isApa(name)) return name.replace(/,\s*$/, '');
    const parts = name.replace(/\./g, '. ').replace(/\s+/g, ' ').trim().split(' ');
    if (parts.length === 1) return parts[0];
    const last = parts[parts.length - 1];
    // "Rao AB" or "Rao A B" (Vancouver): the surname comes first.
    if (/^\p{Lu}{1,3}$/u.test(last.replace(/\./g, '')) && !/\./.test(last) && parts.length === 2) {
        return `${parts[0]}, ${[...last].map((c) => `${c}.`).join(' ')}`;
    }
    const initials = parts.slice(0, -1).map((p) => {
        const letters = p.replace(/\./g, '');
        return letters ? letters.split('-').map((x) => `${x[0].toUpperCase()}.`).join('-') : '';
    }).filter(Boolean).join(' ');
    return `${last}, ${initials}`;
};

/** The authors field as APA: "Rao, A., & Iyer, M." */
const apaAuthors = (raw) => {
    const text = String(raw || '').trim();
    if (!text) return '';
    if (isApa(text)) return text.replace(/\s+/g, ' ');
    const names = text.split(/\s*;\s*|\s*,\s*(?:and\s+)?|\s+and\s+|\s*&\s*/i).map(apaName).filter(Boolean);
    if (names.length === 1) return names[0];
    if (names.length <= 20) return `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}`;
    return `${names.slice(0, 19).join(', ')}, … ${names[names.length - 1]}`;
};

/** A sentence closed with a full stop, unless it already ends in one (or ? !). */
const closed = (s) => (/[.?!]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

const yearOf = (p) => (p.status === 'accepted' ? 'in press' : p.year ? String(p.year) : 'n.d.');
const linkOf = (p) => (p.doi ? `https://doi.org/${p.doi}` : p.url || '');

/** One publication's reference, as segments. */
const reference = (p) => {
    const seg = [];
    const add = (text, italic = false) => { if (text) seg.push({ text, italic }); };
    const authors = apaAuthors(p.authors);
    const title = String(p.title || '').trim();
    const italicTitle = ['book', 'patent', 'preprint', 'other'].includes(p.type);
    if (authors) add(`${closed(authors)} (${yearOf(p)}). `);
    // No author: the title takes the author's place (APA 9.12).
    if (italicTitle) {
        add(title, true);
        if (p.type === 'patent') add(p.venue ? ` (${p.venue})` : '');
        if (p.type === 'preprint') add(' [Preprint]');
        add('. ');
        if (!authors) add(`(${yearOf(p)}). `);
        if (p.type === 'book') add(p.publisher ? closed(p.publisher) + ' ' : '');
        else if (p.venue && p.type !== 'patent') add(closed(p.venue) + ' ');
    } else {
        add(`${closed(title)} `);
        if (!authors) add(`(${yearOf(p)}). `);
        if (p.type === 'journal') {
            add(p.venue || 'Journal', true);
            if (p.volume) { add(', '); add(p.volume, true); }
            if (p.issue) add(`(${p.issue})`);
            if (p.pages) add(`, ${p.pages}`);
            add('. ');
        } else {
            add('In ');
            add(p.venue || (p.type === 'conference' ? 'Proceedings' : 'Edited book'), true);
            add(p.pages ? ` (pp. ${p.pages}). ` : '. ');
            if (p.publisher) add(`${closed(p.publisher)} `);
        }
    }
    add(linkOf(p));
    // Tidy the end: no trailing space, and a full stop unless it ends with a link.
    const last = seg[seg.length - 1];
    if (last) last.text = last.text.replace(/\s+$/, '');
    return seg;
};

const textOf = (segments) => segments.map((s) => s.text).join('');

/** The reference list: accepted and published work, alphabetical as APA asks. */
const references = (publications) => publications
    .filter((p) => ['published', 'accepted'].includes(p.status))
    .map((p) => ({ _id: p._id, segments: reference(p) }))
    .map((r) => ({ ...r, text: textOf(r.segments) }))
    .sort((a, b) => a.text.localeCompare(b.text, 'en', { sensitivity: 'base' }));

const referencesDocx = (publications, author) => {
    const list = references(publications);
    const body = [
        paragraph({ text: 'Publications', bold: true, size: 18 }, { spaceAfter: 80 }),
        paragraph({ text: `${author || ''}${author ? ' · ' : ''}${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, color: '4B5563', size: 11 }, { spaceAfter: 360 }),
        paragraph('References', { style: 'Heading1' })
    ];
    if (!list.length) body.push(paragraph({ text: 'No accepted or published work yet.', italic: true }));
    for (const r of list) body.push(paragraph(r.segments, { hanging: 720 }));
    return buildDocx({ title: 'Publications', author, body, firstPageNumbered: true });
};

const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

/** Every publication as an Excel sheet, with its APA reference in the last column. */
const publicationsXlsx = (publications) => {
    const rows = publications.map((p) => ({
        Title: p.title,
        Type: LABELS.type[p.type] || p.type,
        Status: LABELS.status[p.status] || p.status,
        Authors: p.authors || '',
        'Journal / venue': p.venue || '',
        Year: p.year || '',
        Volume: p.volume || '',
        Issue: p.issue || '',
        Pages: p.pages || '',
        Publisher: p.publisher || '',
        DOI: p.doi || '',
        URL: p.url || '',
        Indexing: (p.indexing || []).join(', '),
        Quartile: p.quartile || '',
        'Impact factor': p.impactFactor ?? '',
        Citations: p.citations || 0,
        'Submitted on': day(p.submittedOn),
        'Decision on': day(p.decisionOn),
        'Published on': day(p.publishedOn),
        Deadline: day(p.deadline),
        Notes: p.notes || '',
        'APA reference': ['published', 'accepted'].includes(p.status) ? textOf(reference(p)) : ''
    }));
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Title: '' }]);
    sheet['!cols'] = [50, 16, 12, 30, 30, 6, 7, 6, 9, 20, 24, 30, 24, 8, 8, 8, 12, 12, 12, 12, 30, 80].map((wch) => ({ wch }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Publications');
    return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = { reference, references, referencesDocx, publicationsXlsx, apaAuthors, textOf };
