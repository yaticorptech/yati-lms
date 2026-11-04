/**
 * The student's 360 page (2026-10-31): the organization's activities by
 * category, the marks so far, and proof uploaded for an activity (a picture
 * or PDF with a note) for their 360 teachers to check.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';

const DATA = {
    enabled: true, organization: 'St Agnes College',
    teachers: [{ name: 'Geeta Rao', subjects: ['Java'], phone: '9845000001', email: '' }],
    activityGroups: [
        { _id: 'g1', name: 'Academic Excellence', activities: [{ _id: 'a1', name: 'Presentations', mode: 'max', marks: 10 }, { _id: 'a2', name: 'Research Projects (Bonus)', mode: 'max', marks: 10 }] },
        { _id: 'g2', name: 'Earn While Learn', activities: [{ _id: 'a3', name: 'Individual activities', mode: 'each', marks: 1 }] }
    ],
    proofs: [
        { _id: 'p1', activityId: 'a1', activityName: 'Presentations', groupName: 'Academic Excellence', fileUrl: 'https://cdn.example.com/p1.jpg', fileType: 'image', fileName: 'seminar.jpg', status: 'approved', marks: 0, reviewerName: 'Geeta Rao' },
        { _id: 'p2', activityId: 'a2', activityName: 'Research Projects (Bonus)', groupName: 'Academic Excellence', fileUrl: 'https://cdn.example.com/p2.pdf', fileType: 'pdf', fileName: 'paper.pdf', status: 'rejected', reviewNote: 'Not readable', reviewerName: 'Geeta Rao' }
    ],
    marks: [{ activityId: 'a1', marks: 8, byName: 'Geeta Rao' }],
    totals: { total: 8, byActivity: { a1: 8, a2: 0, a3: 0 } }
};

const api = (data = DATA) => `
window.__calls = [];
export default {
  get: (url) => { window.__calls.push(['GET', url]); return Promise.resolve({ data: ${JSON.stringify(data)} }); },
  post: (url, body) => {
    window.__calls.push(['POST', url, body instanceof FormData ? { activityId: body.get('activityId'), note: body.get('note'), file: body.get('file') && body.get('file').name } : body]);
    return Promise.resolve({ data: { proof: { _id: 'p9', activityId: body.get('activityId'), activityName: 'Individual activities', groupName: 'Earn While Learn', fileUrl: 'https://cdn.example.com/p9.jpg', fileType: 'image', fileName: 'gig.jpg', note: body.get('note'), status: 'pending' } } });
  },
  delete: (url) => { window.__calls.push(['DELETE', url]); return Promise.resolve({ data: { message: 'Proof removed.' } }); }
};`;

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Student360 from '${srcFile('pages/Student360.jsx')}';
createRoot(document.getElementById('root')).render(<MemoryRouter><Student360 /></MemoryRouter>);`;

describe('the student’s 360 page', { skip: skipWithoutStyles }, () => {
    test('shows the activities and marks, uploads proof with a note, and removes proof sent back', async () => {
        const { result, errors } = await screen({ entry, api: api(), styles: true, width: 390, height: 860, script: `
            const setInput = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
            await sleep(500);
            const first = document.body.innerText;
            const firstSideways = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
            // The + (Add proof): submitting with nothing chosen says what is missing.
            $$('button').find((b) => b.offsetParent && /Add proof/.test(b.innerText)).click(); await sleep(250);
            $$('[role=dialog] button').find((b) => b.innerText.trim() === 'Submit').click(); await sleep(150);
            const empty = $('[role=dialog]').innerText;
            // Search: "indiv act" suggests Individual activities; a tap fills the category and activity.
            const search = $('#proof-search');
            search.focus(); setInput(search, 'indiv act'); await sleep(200);
            const suggested = $('[role=listbox]')?.innerText || '';
            $$('[role=listbox] button').find((b) => /Individual activities/.test(b.innerText)).click(); await sleep(200);
            const dialog = $('[role=dialog]').innerText;
            const picked = [$('#proof-category').innerText.trim(), $('#proof-activity').innerText.trim()];
            const camera = !!$('[role=dialog] input[type=file][capture]');
            const input = $('[role=dialog] input[aria-label="Proof file"]');
            const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array([255, 216, 255])], 'gig.jpg', { type: 'image/jpeg' }));
            input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); await sleep(150);
            const ta = $('#proof-note');
            Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, 'Weekend event, 2 Nov');
            ta.dispatchEvent(new Event('input', { bubbles: true })); await sleep(100);
            $$('[role=dialog] button').find((b) => b.innerText.trim() === 'Submit').click(); await sleep(400);
            const afterUpload = document.body.innerText;
            $('[aria-label="Remove proof paper.pdf"]').click(); await sleep(200);
            const ask = $('[role=alertdialog]')?.innerText || '';
            $$('[role=alertdialog] button').find((b) => b.innerText.trim() === 'Remove').click(); await sleep(300);
            return { first, firstSideways, empty, suggested, picked, camera, dialog, ask, post: window.__calls.find((c) => c[0] === 'POST'), del: window.__calls.find((c) => c[0] === 'DELETE'),
                afterUpload, after: document.body.innerText, approvedRemovable: !!$('[aria-label="Remove proof seminar.jpg"]'),
                sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };` });
        assert.deepEqual(errors, []);
        // The dashboard (2026-11-04): the marks in the 360 ring, no list of every activity.
        assert.match(result.first, /360\s*8\s*marks/, 'the marks inside the ring');
        assert.match(result.first, /Your 360 marks\s*8/i);
        assert.match(result.first, /of 20, plus marks per proof/, 'per-proof marks come on top of the 20, never "23 of 20"');
        assert.doesNotMatch(result.first, /marked by|checked by/);
        assert.doesNotMatch(result.first, /Individual activities/, 'activities with no proof are not listed');
        assert.doesNotMatch(result.first, /was sent back\./, 'no separate note above (2026-11-04)');
        assert.match(result.first, /Your uploads[\s\S]*paper\.pdf[\s\S]*seminar\.jpg/, 'sent back is listed first');
        assert.match(result.first, /Your 360 teacher: Geeta Rao/);
        assert.match(result.first, /Presentations[\s\S]*seminar\.jpg\s*Accepted · 8 \/ 10/);
        assert.match(result.first, /paper\.pdf\s*Sent back[\s\S]*Teacher: Not readable/);
        assert.ok(!result.firstSideways, 'the dashboard does not scroll sideways on a phone');
        // The popup.
        assert.match(result.empty, /Search for the activity/);
        assert.ok(!/Category/.test(result.empty), 'no dropdowns before a search');
        assert.match(result.suggested, /Individual activities\s*Earn While Learn · 1 mark per proof/);
        assert.deepEqual(result.picked, ['Earn While Learn', 'Individual activities'], 'the suggestion fills both dropdowns');
        assert.ok(result.camera, 'Take photo opens the camera');
        assert.match(result.dialog, /Earn While Learn › Individual activities · 1 mark per proof/);
        assert.match(result.ask, /Remove this proof\?/);
        assert.deepEqual(result.post, ['POST', '/user/360/proofs', { activityId: 'a3', note: 'Weekend event, 2 Nov', file: 'gig.jpg' }]);
        assert.match(result.afterUpload, /Proof uploaded/);
        assert.match(result.afterUpload, /gig\.jpg\s*Waiting/);
        assert.deepEqual(result.del, ['DELETE', '/user/360/proofs/p2']);
        assert.doesNotMatch(result.after, /paper\.pdf/);
        assert.equal(result.approvedRemovable, false, 'approved proof stays');
        assert.ok(!result.sideways, 'nothing scrolls sideways on a phone');
    });

    test('Submit with Drive not linked opens a Link your Google Drive popup over Add proof, keeping what was chosen (2026-11-04)', async () => {
        const noDrive = api().replace("post: (url, body) => {", "post: (url, body) => { if (url === '/user/360/proofs') return Promise.reject(Object.assign(new Error('409'), { response: { status: 409, data: { code: 'DRIVE_REQUIRED', message: 'Link your Google Drive first.' } } }));");
        const { result, errors } = await screen({ entry, api: noDrive, styles: true, width: 390, height: 860, script: `
            const setInput = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
            await sleep(500);
            $$('button').find((b) => b.offsetParent && /Add proof/.test(b.innerText)).click(); await sleep(250);
            const search = $('#proof-search'); search.focus(); setInput(search, 'presentations'); await sleep(200);
            $$('[role=listbox] button')[0].click(); await sleep(150);
            const input = $('[role=dialog] input[aria-label="Proof file"]');
            const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array([255, 216, 255])], 'p.jpg', { type: 'image/jpeg' }));
            input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); await sleep(150);
            $$('[role=dialog] button').find((b) => b.innerText.trim() === 'Submit').click(); await sleep(400);
            const drive = $('[aria-labelledby=drive-title]');
            const said = drive ? drive.innerText : '';
            const r = drive.getBoundingClientRect();
            const onTop = drive.contains(document.elementFromPoint(r.left + r.width / 2, r.top + 30));
            [...drive.querySelectorAll('button')].find((b) => /Close|Done/.test(b.innerText)).click(); await sleep(200);
            return { said, onTop, inline: /Link your Google Drive first/.test($('[aria-labelledby=proof-title]').innerText), kept: $('#proof-activity').innerText.trim(), file: /p\\.jpg/.test($('[aria-labelledby=proof-title]').innerText) };` });
        assert.deepEqual(errors, []);
        assert.match(result.said, /Link your Google Drive/);
        assert.match(result.said, /kept in your own Google Drive/);
        assert.ok(result.onTop, 'the popup is above Add proof');
        assert.equal(result.inline, false, 'no red line inside Add proof');
        assert.equal(result.kept, 'Presentations', 'what was chosen stays');
        assert.ok(result.file);
    });

    test('a failed load says so, and Try again loads the page (2026-11-02)', async () => {
        const failing = `
window.__gets = 0;
export default { get: () => { window.__gets += 1; return window.__gets === 1 ? Promise.reject(new Error('down')) : Promise.resolve({ data: ${JSON.stringify(DATA)} }); } };`;
        const { result, errors } = await screen({ entry, api: failing, script: `
            await sleep(400);
            const failed = document.body.innerText;
            $$('button').find((b) => b.innerText.trim() === 'Try again').click(); await sleep(400);
            return { failed, after: document.body.innerText, gets: window.__gets };` });
        assert.deepEqual(errors, []);
        assert.match(result.failed, /360 could not be loaded just now/);
        assert.equal(result.gets, 2);
        assert.match(result.after, /Your 360 marks\s*8/i);
    });

    test('a student no 360 teacher has added is told so', async () => {
        const { result, errors } = await screen({ entry, api: api({ enabled: false, notAdded: true }), script: `
            await sleep(400);
            return document.body.innerText;` });
        assert.deepEqual(errors, []);
        assert.match(result, /Your 360 teacher has not added you yet/);
        assert.doesNotMatch(result, /Activities/);
    });
});
