/**
 * Every certificate in the frame shows a picture of itself.
 *
 *   - one the LMS issued shows the certificate — its design, with the
 *     student's name, the course and the certificate number — where it used
 *     to show only a seal
 *   - an uploaded PDF goes up with a picture of its first page, drawn in the
 *     browser (utils/pdfPageOne.js), which the frame then shows
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { screen, srcFile, ROOT, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const files = { '/certificates/cert_template.jpg': readFileSync(path.join(ROOT, 'public', 'certificates', 'cert_template.jpg')) };
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
});
