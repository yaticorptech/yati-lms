/**
 * Thesis Writing → the check before a download (src/teacher/thesisCheck.js):
 * a missing abstract or reference list, chapters out of order, skipped
 * heading numbers, figure and table gaps, chapters over their targets, and
 * notes left in the text. A finished thesis passes clean.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkThesis, kindOf } from '../../src/teacher/thesisCheck.js';

const words = (n, w = 'word') => Array.from({ length: n }, () => w).join(' ');
const chapter = (title, content = '', over = {}) => ({ _id: title.toLowerCase().replace(/\W+/g, '-'), title, content, targetWords: 0, status: 'done', ...over });
const finished = () => ({
    title: 'Peer tutoring and mathematics anxiety', degree: 'PhD', university: 'Test University', supervisor: 'Dr. Rao', targetWords: 0,
    chapters: [
        chapter('Abstract', words(250)),
        chapter('Introduction', `1.1 Background\n\n${words(300)} (Rao, 2019).\n\n1.2 Aims\n\n${words(100)} as Figure 1 shows.`),
        chapter('Literature Review', `${words(400)} Figure 2 and Table 1.`),
        chapter('Research Methodology', words(300)),
        chapter('Results', `${words(300)} Table 2, Figure 3.`),
        chapter('Discussion', words(300)),
        chapter('Conclusion & Future Work', words(200)),
        chapter('References', 'Rao, A. (2019). Peer tutoring. Journal of Learning, 4(2), 1–10.'),
        chapter('Appendices', '')
    ]
});
const ids = (r) => r.issues.map((i) => i.id);

test('the chapter names are recognised', () => {
    assert.equal(kindOf('Conclusion & Future Work')[0], 'conclusion');
    assert.equal(kindOf('Results and Discussion')[0], 'results');
    assert.equal(kindOf('Review of Literature')[0], 'literature');
    assert.equal(kindOf('Bibliography')[0], 'references');
    assert.equal(kindOf('My own chapter'), null);
});

test('a finished thesis passes every check', () => {
    const r = checkThesis(finished());
    assert.deepEqual(r.issues, []);
    for (const p of ['Abstract written', 'Reference list written', 'Chapters in the usual order', 'Heading numbers in order', 'Figures and tables numbered in order', 'Title page details filled in']) {
        assert.ok(r.passed.some((x) => x.startsWith(p)), `passes: ${p}`);
    }
});

test('a missing abstract and an empty reference list are flagged, with the citations counted', () => {
    const t = finished();
    t.chapters = t.chapters.filter((c) => c.title !== 'Abstract');
    t.chapters.find((c) => c.title === 'References').content = '';
    const r = checkThesis(t);
    assert.ok(ids(r).includes('abstract-missing'));
    const refs = r.issues.find((i) => i.id === 'references-empty');
    assert.match(refs.detail, /cite sources 1 time/);
    assert.equal(refs.chapterId, 'references');
});

test('a long abstract is flagged', () => {
    const t = finished();
    t.chapters[0].content = words(620);
    assert.ok(ids(checkThesis(t)).includes('abstract-long'));
});

test('chapters out of their usual order are named', () => {
    const t = finished();
    const refs = t.chapters.splice(7, 1)[0];
    t.chapters.splice(5, 0, refs);   // References before Discussion
    const r = checkThesis(t);
    const order = r.issues.filter((i) => i.id.startsWith('order-'));
    assert.equal(order.length, 2);
    assert.equal(order[0].title, '"Discussion" comes after "References"');
});

test('a skipped heading number, and one that starts late, are found', () => {
    const t = finished();
    t.chapters[2].content = `2.1 Early studies\n\n${words(50)}\n\n2.3 Recent studies\n\n${words(50)}`;
    t.chapters[3].content = `3.2 Design\n\n${words(50)}\n\n3.2.1 Sample\n\n${words(20)}\n\n3.3 Tools\n\n${words(20)}`;
    const r = checkThesis(t);
    assert.match(r.issues.find((i) => i.id === 'headings-literature-review').detail, /2\.3 follows 2\.1/);
    const method = r.issues.find((i) => i.id === 'headings-research-methodology');
    assert.match(method.detail, /it starts at 3\.2/);
    assert.doesNotMatch(method.detail, /3\.2\.1|3\.3 follows/, '3.2 → 3.2.1 → 3.3 is fine');
});

test('figure and table gaps, and a figure first mentioned out of order, are found', () => {
    const t = finished();
    t.chapters[4].content = `${words(50)} Figure 5 and Table 4.`;
    const r = checkThesis(t);
    const gaps = r.issues.filter((i) => i.id.startsWith('numbering-')).map((i) => i.detail).join(' | ');
    assert.match(gaps, /Figure 3 and Figure 4 are never mentioned, though Figure 5 is/);
    assert.match(gaps, /Table 2 and Table 3 are never mentioned/);
    const t2 = finished();
    t2.chapters[1].content = `${words(20)} Figure 2 then Figure 1.`;
    t2.chapters[2].content = words(20);
    t2.chapters[4].content = words(20);
    assert.match(checkThesis(t2).issues.map((i) => i.detail).join(' '), /Figure 1 is first mentioned after Figure 2/);
});

test('chapters over their word targets, chapters not written and notes left behind are flagged', () => {
    const t = finished();
    t.chapters[3] = { ...t.chapters[3], targetWords: 200 };       // 300 words: over by half
    t.chapters[5] = { ...t.chapters[5], content: '' };
    t.chapters[6] = { ...t.chapters[6], content: `${words(50)} TODO add the limitations.` };
    const r = checkThesis(t);
    assert.match(r.issues.find((i) => i.id === 'over-research-methodology').detail, /300 words against a target of 200 \(100 over\)/);
    assert.ok(ids(r).includes('empty-discussion'));
    assert.ok(!ids(r).includes('empty-appendices'), 'empty appendices are fine');
    assert.match(r.issues.find((i) => i.id === 'note-conclusion-future-work').detail, /"TODO"/);
});

test('missing title page details and chapters not marked Done are told, not warned', () => {
    const t = finished();
    t.supervisor = '';
    t.chapters[2].status = 'drafting';
    const r = checkThesis(t);
    const page = r.issues.find((i) => i.id === 'title-page');
    assert.equal(page.level, 'info');
    assert.equal(page.action, 'details');
    assert.match(page.detail, /supervisor/);
    assert.equal(r.issues.find((i) => i.id === 'not-done').level, 'info');
});
