/**
 * Thesis Writing → the check before a download (asked 2026-10-27): what a
 * university's checker or a supervisor would send back, found in the app
 * before the PDF or Word file is made. Rules only, no outside service.
 *
 *   - an abstract and a reference list, both written
 *   - the chapters in the usual order, and numbered headings (2.1, 2.2…)
 *     with none skipped
 *   - figures and tables numbered with no gaps, first mentioned in order
 *   - chapters (and the thesis) over their word targets
 *   - chapters not written yet, notes left in the text (TODO, ???)
 *   - the title page's details, and chapters not marked Done
 *
 * checkThesis(thesis) → { issues: [{ id, level: 'warn' | 'info', title,
 * detail, chapterId?, action? }], passed: [title] }.
 */
import { countWords, fmtNum } from './kit.js';

// The usual order of a thesis, and how each part is recognised by its title.
// Tried in this order, so "Results and Discussion" is a results chapter and
// "Conclusion & Future Work" a conclusion.
const KINDS = [
    ['abstract', 0, /\b(abstract|synopsis)\b/i],
    ['references', 7, /\b(references?|bibliography|works cited)\b/i],
    ['appendix', 8, /\b(appendix|appendices|annexures?)\b/i],
    ['conclusion', 6, /\bconclu/i],
    ['results', 4, /\b(results?|findings)\b/i],
    ['discussion', 5, /\bdiscussion\b/i],
    ['methodology', 3, /\b(method|methods|methodology|research design)\b/i],
    ['literature', 2, /\b(literature|related work|review of)\b/i],
    ['introduction', 1, /\bintroduc/i]
];
export const kindOf = (title) => KINDS.find(([, , re]) => re.test(title || '')) || null;

// What a writer leaves to come back to.
const PLACEHOLDER = /\b(TODO|TBD|FIXME|XXX)\b|\[(citation needed|cite|ref|reference)\??\]|\?{3,}/i;
// In-text citations: (Rao, 2019), (Rao et al., 2019a), [12], [3, 4].
const CITATION = /\([A-Z][^()]{0,80}?,?\s(19|20)\d{2}[a-z]?\)|\[\d+(?:[,–-]\s?\d+)*\]/g;
const NUMBERED_HEADING = /^(\d+(?:\.\d+)+)\.?\s+\S/;
const FIGURE = /\b(Figure|Fig\.|Table)\s+(\d+(?:\.\d+)?)\b/g;
const HAS_FIGURE = /\b(Figure|Fig\.|Table)\s+\d/;
const hasNumberedHeading = (content) => String(content || '').split('\n').some((l) => NUMBERED_HEADING.test(l.trim()));

const list = (items) => (items.length <= 2 ? items.join(' and ') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

/** "2.3 follows 2.1": numbered headings in a chapter where one was skipped or out of place. */
const headingProblems = (content) => {
    const numbers = String(content || '').split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length <= 120 && l.split(/\s+/).length <= 16)
        .map((l) => l.match(NUMBERED_HEADING)?.[1])
        .filter(Boolean)
        .map((n) => n.split('.').map(Number));
    const problems = [];
    numbers.forEach((b, i) => {
        if (i === 0) {
            if (b.at(-1) !== 1) problems.push(`it starts at ${b.join('.')}`);
            return;
        }
        const a = numbers[i - 1];
        // Fine: the first child (2.1 → 2.1.1), or the next of the heading or
        // of one it sits under (2.1.3 → 2.1.4, 2.2 or 3.1).
        const child = b.length === a.length + 1 && b.at(-1) === 1 && a.every((x, k) => x === b[k]);
        const next = b.length <= a.length && b.slice(0, -1).every((x, k) => x === a[k]) && b.at(-1) === a[b.length - 1] + 1;
        const nextTop = b.length >= 2 && b[0] === a[0] + 1 && b.slice(1).every((x) => x === 1);
        if (!child && !next && !nextTop) problems.push(`${b.join('.')} follows ${a.join('.')}`);
    });
    return problems;
};

/** Gaps and order of "Figure n" / "Table n" across the whole thesis. */
const numberingProblems = (chapters) => {
    const seen = { Figure: [], Table: [] };
    for (const c of chapters) {
        for (const m of String(c.content || '').matchAll(FIGURE)) {
            const kind = m[1] === 'Table' ? 'Table' : 'Figure';
            if (!seen[kind].includes(m[2])) seen[kind].push(m[2]);
        }
    }
    const problems = [];
    for (const [kind, order] of Object.entries(seen)) {
        if (!order.length) continue;
        // Numbered straight through (1, 2, 3) or by chapter (3.1, 3.2): each
        // group is checked on its own.
        const groups = new Map();
        for (const n of order) {
            const [head, tail] = n.includes('.') ? n.split('.') : ['', n];
            if (!groups.has(head)) groups.set(head, []);
            groups.get(head).push(Number(tail));
        }
        for (const [head, nums] of groups) {
            const label = (x) => `${kind} ${head ? `${head}.` : ''}${x}`;
            const missing = [];
            for (let x = 1; x < Math.max(...nums); x += 1) if (!nums.includes(x)) missing.push(label(x));
            if (missing.length) problems.push(`${list(missing.slice(0, 4))}${missing.length > 4 ? ` and ${missing.length - 4} more` : ''} ${missing.length === 1 ? 'is' : 'are'} never mentioned, though ${label(Math.max(...nums))} is`);
            const late = nums.find((x, i) => i > 0 && x < nums[i - 1]);
            if (late !== undefined) problems.push(`${label(late)} is first mentioned after ${label(nums[nums.indexOf(late) - 1])}`);
        }
    }
    return problems;
};

export function checkThesis(thesis) {
    const chapters = (thesis?.chapters || []).map((c, i) => ({ ...c, n: i + 1, words: countWords(c.content), kind: kindOf(c.title) }));
    const issues = [];
    const passed = [];
    const warn = (id, title, detail, extra = {}) => issues.push({ id, level: 'warn', title, detail, ...extra });
    const info = (id, title, detail, extra = {}) => issues.push({ id, level: 'info', title, detail, ...extra });
    const named = (kind) => chapters.find((c) => c.kind?.[0] === kind);

    // The abstract.
    const abstract = named('abstract');
    if (!abstract) warn('abstract-missing', 'No abstract', 'Most universities want an abstract before the first chapter. Add a chapter called "Abstract".');
    else if (!abstract.words) warn('abstract-empty', 'The abstract is empty', 'Write a short summary of the aim, method, main findings and conclusion.', { chapterId: abstract._id });
    else if (abstract.words > 500) warn('abstract-long', `The abstract is long (${fmtNum(abstract.words)} words)`, 'Most universities ask for 150 to 350 words. Check your university\'s rule.', { chapterId: abstract._id });
    else passed.push(`Abstract written (${fmtNum(abstract.words)} words)`);

    // The reference list.
    const refs = named('references');
    const cited = chapters.filter((c) => c !== refs).reduce((n, c) => n + (String(c.content || '').match(CITATION) || []).length, 0);
    const citedNote = cited ? ` Your chapters cite sources ${fmtNum(cited)} ${cited === 1 ? 'time' : 'times'}.` : '';
    if (!refs) warn('references-missing', 'No reference list', `Add a chapter called "References" listing every source you cite.${citedNote}`);
    else if (!refs.words) warn('references-empty', 'The reference list is empty', `List every source you cite, in your university's style (APA, MLA…).${citedNote}`, { chapterId: refs._id });
    else passed.push('Reference list written');

    // The order of the chapters.
    let furthest = null;
    const misplaced = [];
    for (const c of chapters.filter((x) => x.kind)) {
        if (furthest && c.kind[1] < furthest.kind[1]) misplaced.push({ c, after: furthest });
        else furthest = c;
    }
    misplaced.slice(0, 3).forEach(({ c, after }) => warn(`order-${c._id}`, `"${c.title}" comes after "${after.title}"`, `It usually comes before it. Move it up in the chapter list.`, { chapterId: c._id }));
    if (!misplaced.length && chapters.some((c) => c.kind)) passed.push('Chapters in the usual order');

    // Numbered headings inside each chapter.
    for (const c of chapters) {
        const problems = headingProblems(c.content);
        if (problems.length) warn(`headings-${c._id}`, `Heading numbers skip in "${c.title}"`, `${problems.slice(0, 3).join('; ')}${problems.length > 3 ? '…' : ''}. Check no heading was missed or misnumbered.`, { chapterId: c._id });
    }
    if (chapters.some((c) => hasNumberedHeading(c.content)) && !issues.some((x) => x.id.startsWith('headings-'))) passed.push('Heading numbers in order');

    // Figures and tables.
    const numbering = numberingProblems(chapters);
    numbering.forEach((p, i) => warn(`numbering-${i}`, 'Figure or table numbers have a gap', `${p}.`));
    if (!numbering.length && chapters.some((c) => HAS_FIGURE.test(c.content || ''))) passed.push('Figures and tables numbered in order');

    // Word targets.
    const over = chapters.filter((c) => c.targetWords > 0 && c.words > c.targetWords * 1.1);
    over.forEach((c) => warn(`over-${c._id}`, `"${c.title}" is over its word target`, `${fmtNum(c.words)} words against a target of ${fmtNum(c.targetWords)} (${fmtNum(c.words - c.targetWords)} over). Check your university's limit.`, { chapterId: c._id }));
    const total = chapters.reduce((n, c) => n + c.words, 0);
    if (thesis?.targetWords > 0 && total > thesis.targetWords * 1.1) warn('over-thesis', 'The thesis is over its word target', `${fmtNum(total)} words against a target of ${fmtNum(thesis.targetWords)}.`, { action: 'details' });
    if (!over.length && chapters.some((c) => c.targetWords > 0)) passed.push('No chapter over its word target');

    // Chapters not written, and notes left in the text.
    const empty = chapters.filter((c) => !c.words && c !== abstract && c !== refs && c.kind?.[0] !== 'appendix');
    empty.slice(0, 4).forEach((c) => warn(`empty-${c._id}`, `"${c.title}" is not written yet`, 'It will show as "(Not written yet.)" in the file.', { chapterId: c._id }));
    if (empty.length > 4) warn('empty-more', `${empty.length - 4} more chapters are not written yet`, list(empty.slice(4).map((c) => `"${c.title}"`)));
    const noted = chapters.filter((c) => PLACEHOLDER.test(c.content || ''));
    noted.forEach((c) => warn(`note-${c._id}`, `A note is left in "${c.title}"`, `"${String(c.content).match(PLACEHOLDER)[0]}" is still in the text. Finish or remove it before you submit.`, { chapterId: c._id }));
    if (!noted.length) passed.push('No TODO or ??? notes left in the text');

    // The title page, and what is not marked Done.
    const missing = [['degree', 'degree'], ['university', 'university'], ['supervisor', 'supervisor']].filter(([k]) => !String(thesis?.[k] || '').trim()).map(([, l]) => l);
    if (missing.length) info('title-page', 'The title page is missing details', `Add the ${list(missing)} in Details, so they appear on the title page.`, { action: 'details' });
    else passed.push('Title page details filled in');
    const notDone = chapters.filter((c) => c.status !== 'done' && c.words);
    if (notDone.length) info('not-done', `${notDone.length} ${notDone.length === 1 ? 'chapter is' : 'chapters are'} not marked Done`, `${list(notDone.slice(0, 5).map((c) => `"${c.title}"`))}${notDone.length > 5 ? '…' : ''}. Fine for a draft; mark each Done when it is final.`);

    return { issues, passed };
}
