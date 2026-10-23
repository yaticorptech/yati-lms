/**
 * Every certificate in the frame shows a picture of itself.
 *
 *   - one the LMS issued shows the certificate — its design, with the
 *     student's name, the course and the certificate number — where it used
 *     to show only a seal
 *   - an uploaded PDF goes up with a picture of its first page, drawn in the
 *     browser (utils/pdfPageOne.js), which the frame then shows
 *   - a Games & Competitions certificate is there once the competition is
 *     over, drawn as the PDF is; its PDF button downloads it, and Delete takes
 *     it out of the frame
 *   - the frame holds two rows on a laptop (12) and four on a phone (8): a
 *     new upload goes in at the front, the oldest leaves the end, and nothing
 *     is deleted
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { screen, srcFile, ROOT, skipWithoutStyles, DEVICES } from './harness.js';
import { apiModule } from './fixtures.js';

const files = {
    '/certificates/cert_template.jpg': readFileSync(path.join(ROOT, 'public', 'certificates', 'cert_template.jpg')),
    '/certificates/competition_winner.jpg': readFileSync(path.join(ROOT, 'public', 'certificates', 'competition_winner.jpg'))
};
const CERT = { _id: 'c1', courseId: { title: 'Full Stack Web Development' }, certificateNumber: 'YATI240100034472-01', issuedAt: '2026-10-01T10:00:00.000Z' };
const UPLOADED_PDF = { id: 'a1', title: 'Hackathon', issuer: 'College', fileType: 'pdf', fileUrl: 'https://cdn.example/a.pdf', thumbnailUrl: '/certificates/cert_template.jpg', createdAt: '2026-09-01T10:00:00.000Z' };

const entry = (certs) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import CertificatesFrame from '${srcFile('components/CertificatesFrame.jsx')}';
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: { name: 'Demo1' } }}><MemoryRouter>
    <div style={{ width: 1000 }}><CertificatesFrame certificates={${JSON.stringify(certs)}} loading={false} certError={null} downloadingId={null} onDownload={() => {}} onRemoved={() => {}} /></div>
  </MemoryRouter></AuthContext.Provider>);`;

describe('certificate pictures', { skip: skipWithoutStyles }, () => {
    test('a certificate the LMS issued shows the certificate itself, not a seal', async () => {
        const { result, errors } = await screen({
            entry: entry([CERT]), api: apiModule({ '/user/achievements': { achievements: [UPLOADED_PDF], max: 30 } }), styles: true, files, width: 1100,
            screenshot: undefined, script: `
            await sleep(900);
            const card = $('[data-certificate-preview]');
            const img = card && card.querySelector('img');
            return { text: card && text(card), template: img && img.complete && img.naturalWidth > 0, wide: card && Math.round(card.getBoundingClientRect().width),
                     uploadedPicture: $$('article img').some((i) => i.getAttribute('src') === '/certificates/cert_template.jpg' && !i.closest('[data-certificate-preview]')) };` });
        assert.deepEqual(errors, []);
        assert.match(result.text, /Demo1/);
        assert.match(result.text, /Full Stack Web Development/);
        assert.match(result.text, /YATI240100034472-01/);
        assert.match(result.text, /Issued on: 01\/10\/2026/);
        assert.equal(result.template, true, 'drawn on the certificate design');
        assert.equal(result.uploadedPicture, true, 'an uploaded PDF with a picture shows it');
    });

    test('an uploaded PDF goes up with a picture of its first page', async () => {
        const { result, errors } = await screen({
            entry: entry([]), styles: true, files,
            api: apiModule({ '/user/achievements': { achievements: [], max: 30 } }, `(url, body) => ({ achievement: { id: 'n1', title: 'X', fileType: 'pdf', fileUrl: 'u', thumbnailUrl: 't', createdAt: new Date().toISOString() } })`),
            modules: { 'utils/pdfPageOne': "export const pdfPageOne = async () => new Blob([new Uint8Array([255, 216, 255, 217])], { type: 'image/jpeg' });" },
            script: `
            await sleep(700);
            click(/Upload Certificate/); await sleep(300);
            const input = $('input[type=file]');
            const pdf = new File(['%PDF-1.4'], 'certificate.pdf', { type: 'application/pdf' });
            input[Object.keys(input).find((k) => k.startsWith('__reactProps'))].onChange({ target: { files: [pdf] } });
            await sleep(200);
            const form = $('form');
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            await sleep(600);
            const sent = window.__calls.find((c) => c[0] === 'POST' && c[1].includes('/user/achievements'));
            const fd = sent && sent[2];
            return { sent: !!sent, file: fd && fd.get('file') && fd.get('file').name, thumb: fd && fd.get('thumbnail') && { name: fd.get('thumbnail').name, type: fd.get('thumbnail').type } };` });
        assert.deepEqual(errors, []);
        assert.equal(result.sent, true);
        assert.equal(result.file, 'certificate.pdf');
        assert.deepEqual(result.thumb, { name: 'page-1.jpg', type: 'image/jpeg' });
    });

    test('a Games & Competitions certificate is in the frame once the competition is over, downloads as a PDF, and can be deleted', async () => {
        const WON = { competitionId: 'k9', name: 'Inter-College Chess Championship', game: 'chess', gameLabel: 'Chess', organizedBy: 'YATICORP', completedAt: '2026-10-17T10:00:00.000Z',
            teamName: 'St Agnes Knights', collegeName: 'St Agnes College', place: 1, title: 'Winner', playerName: 'Demo1',
            words: { subtitle: 'of Achievement — Winner', lead: 'has won first place in the', date: '17/10/2026',
                paragraph: 'This certificate is awarded in recognition of your outstanding performance with St Agnes Knights (St Agnes College) in Chess.' } };
        const { result, errors } = await screen({
            entry: entry([CERT]), styles: true, files, width: 1100,
            api: apiModule({ '/user/achievements': { achievements: [], max: 30 }, '/competitions/certificates': { certificates: [WON] } }),
            modules: { 'native/saveFile': 'export const saveBlob = async (blob, name) => { window.__saved = name; }; export const openExternal = async () => {};' },
            script: `
            await sleep(900);
            const pic = $('[data-competition-certificate]');
            const card = pic.closest('article');
            const pdf = [...card.querySelectorAll('button')].find((b) => /PDF/.test(b.innerText));
            pdf.click(); await sleep(300);
            const design = pic.querySelector('img');
            const before = { design: design && design.getAttribute('src'), drawn: design && design.complete && design.naturalWidth > 0, text: text(pic), ribbon: /verified/i.test(card.innerText), canDelete: !!card.querySelector('button[aria-label^="Delete"]'),
                     count: text($('h3')), asked: window.__calls.some((c) => c[0] === 'GET' && c[1] === '/competitions/k9/certificate'), saved: window.__saved,
                     order: $$('article').map((a) => (a.querySelector('[data-competition-certificate]') ? 'competition' : 'course')) };
            // Delete: asked first — in the app's own dialog, not the browser's — then gone from the frame.
            card.querySelector('button[aria-label^="Delete"]').click(); await sleep(300);
            const dialog = $('[role=alertdialog][aria-modal=true]');
            const asked = text(dialog);
            [...dialog.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Delete').click(); await sleep(300);
            return { ...before, confirm: asked, named: !!(dialog && dialog.getAttribute('aria-labelledby')), deleted: window.__calls.some((c) => c[0] === 'DELETE' && c[1] === '/competitions/certificates/k9'),
                     left: !!$('[data-competition-certificate]'), countAfter: text($('h3')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.design, '/certificates/competition_winner.jpg', 'a winner\'s is drawn on the designed certificate');
        assert.equal(result.drawn, true);
        for (const words of ['of Achievement — Winner', 'Demo1', 'has won first place in the', 'Inter-College Chess Championship', 'with St Agnes Knights (St Agnes College)', 'Date: 17/10/2026']) {
            assert.ok(result.text.toUpperCase().includes(words.toUpperCase()), `the picture says "${words}"`);
        }
        assert.equal(result.ribbon, true, 'marked Verified, as the LMS gave it');
        assert.equal(result.canDelete, true, 'it can be deleted from the frame, like any other');
        assert.match(result.count, /2 achievements/, 'it counts alongside the course certificate');
        assert.deepEqual(result.order, ['competition', 'course'], 'newest first');
        assert.equal(result.asked, true, 'PDF asks the server for this competition\'s certificate');
        assert.equal(result.saved, 'Certificate_Inter-College_Chess_Championship.pdf');
        assert.match(result.confirm, /stays yours in Competitions/, 'Delete asks first, and says where it still is');
        assert.equal(result.named, true, 'the question is a named dialog');
        assert.equal(result.deleted, true, 'the server is told');
        assert.equal(result.left, false, 'and it leaves the frame');
        assert.match(result.countAfter, /1 achievement\b/);
    });

    // Thirteen uploads, one a day through September, and a course certificate
    // from before them all: fourteen, more than two rows hold.
    const MANY = Array.from({ length: 13 }, (_, i) => ({ id: `u${i + 1}`, title: `Upload ${i + 1}`, issuer: 'College', fileType: 'image', fileUrl: `https://cdn.example/${i + 1}.png`,
        thumbnailUrl: '/certificates/cert_template.jpg', createdAt: `2026-09-${String(i + 2).padStart(2, '0')}T10:00:00.000Z` }));
    const OLD_COURSE = { ...CERT, createdAt: '2026-08-01T10:00:00.000Z', issuedAt: '2026-08-01T10:00:00.000Z' };
    const shown = `$$('article').map((a) => (a.querySelector('[data-certificate-preview]') ? 'course' : (a.querySelector('a[href]') || {}).getAttribute?.('href')?.match(/\\/(\\d+)\\.png/)?.[1] || 'new'))`;

    test('on a laptop the frame holds two rows of six: a new upload goes in front, the oldest leaves, nothing is deleted', async () => {
        const { result, errors } = await screen({
            entry: entry([OLD_COURSE]), styles: true, files, width: 1100,
            api: apiModule({ '/user/achievements': { achievements: MANY, max: 30 } }, `(url, body) => ({ achievement: { id: 'n1', title: 'Hackathon 2020', fileType: 'image', fileUrl: 'https://cdn.example/new.jpg', thumbnailUrl: '/certificates/cert_template.jpg', issuedOn: '2020-01-01', createdAt: new Date().toISOString() } })`),
            script: `
            await sleep(900);
            const before = { shown: ${shown}, note: (($('[data-out-of-frame]') || {}).innerText || ''), count: text($('h3')) };
            click(/Upload Certificate/); await sleep(300);
            const input = $('input[type=file]');
            const png = new File([new Uint8Array([137, 80, 78, 71])], 'hackathon.png', { type: 'image/png' });
            input[Object.keys(input).find((k) => k.startsWith('__reactProps'))].onChange({ target: { files: [png] } });
            await sleep(200);
            $('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            await sleep(800);
            return { before, after: { shown: ${shown}, note: (($('[data-out-of-frame]') || {}).innerText || ''), count: text($('h3')) },
                     deleted: window.__calls.filter((c) => c[0] === 'DELETE').length };` });
        assert.deepEqual(errors, []);
        assert.equal(result.before.shown.length, 12, 'two rows of six');
        assert.deepEqual(result.before.shown.slice(0, 3), ['13', '12', '11'], 'the most recently added first');
        assert.equal(result.before.shown.includes('course'), false, 'the oldest — the course certificate — and Upload 1 are past the frame');
        assert.equal(result.before.shown.includes('1'), false);
        assert.match(result.before.note, /newest 12/);
        assert.match(result.before.note, /2 oldest certificates are not\s+in the frame, but nothing is deleted/);
        assert.match(result.before.count, /14 achievements/, 'the count is all of them');

        assert.equal(result.after.shown.length, 12, 'still two rows');
        assert.equal(result.after.shown[0], 'new', 'the new upload goes in at the front, though it is dated 2020');
        assert.equal(result.after.shown.includes('2'), false, 'and the oldest in the frame, Upload 2, leaves it');
        assert.match(result.after.note, /3 oldest certificates/);
        assert.match(result.after.count, /15 achievements/);
        assert.equal(result.deleted, 0, 'nothing was deleted to make room');
    });

    test('on a phone the frame holds four rows of two', async () => {
        const { result, errors } = await screen({
            entry: entry([OLD_COURSE]).replace('width: 1000', "width: '100%'"), styles: true, files, device: DEVICES.galaxyA55,
            api: apiModule({ '/user/achievements': { achievements: MANY, max: 30 } }),
            script: `await sleep(900); return { shown: ${shown}, note: (($('[data-out-of-frame]') || {}).innerText || '') };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.shown, ['13', '12', '11', '10', '9', '8', '7', '6'], 'eight, newest first');
        assert.match(result.note, /newest 8/);
        assert.match(result.note, /6 oldest certificates/);
    });
});
