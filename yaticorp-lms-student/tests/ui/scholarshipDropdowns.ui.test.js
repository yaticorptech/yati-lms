/**
 * The Scholarships profile form's dropdowns: the app's own list, not the
 * operating system's — a popup in the middle of a phone, a list under the
 * field on a laptop — and choosing still fills the form.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';

const entry = `
import { createRoot } from 'react-dom/client';
import ScholarshipProfileForm from '${srcFile('components/ScholarshipProfileForm.jsx')}';
createRoot(document.getElementById('root')).render(<div style={{ padding: 16 }}><ScholarshipProfileForm onClose={() => {}} /></div>);`;
const api = 'export default {}';

describe('the scholarship form dropdowns', { skip: skipWithoutStyles }, () => {
    test('no native selects are left in the form', async () => {
        const { result, errors } = await screen({
            entry, api, styles: true, width: 390, height: 900, script: `
                await sleep(500);
                return { selects: $$('select').length, fields: $$('[role=combobox]').map((b) => b.getAttribute('aria-label')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.selects, 0);
        assert.deepEqual(result.fields, ['Category', 'Annual family income', 'Minority community', 'Gender', 'Your institution']);
    });

    test('on a phone the choices open in the middle of the screen, and picking one fills the field', async () => {
        const { result, errors } = await screen({
            entry, api, styles: true, width: 390, height: 800, script: `
                await sleep(500);
                const field = $('[role=combobox][aria-label="Annual family income"]');
                field.click(); await sleep(250);
                const pop = $('[role=dialog]');
                const r = pop.getBoundingClientRect();
                const opts = $$('[role=option]').map(text);
                $$('[role=option]').find((o) => text(o) === '₹5–8 lakh').click(); await sleep(200);
                return { mid: (r.top + r.bottom) / 2, vh: window.innerHeight, left: r.left, right: r.right, vw: window.innerWidth,
                    heading: text(pop.querySelector('p')), opts, closed: !$('[role=dialog]'), after: text(field) };` });
        assert.deepEqual(errors, []);
        assert.ok(Math.abs(result.mid - result.vh / 2) < 2, 'centred on the screen');
        assert.ok(result.left > 0 && result.right < result.vw);
        assert.equal(result.heading, 'Annual family income');
        assert.deepEqual(result.opts, ['Prefer not to say', 'Below ₹1 lakh', '₹1–2.5 lakh', '₹2.5–5 lakh', '₹5–8 lakh', 'Above ₹8 lakh']);
        assert.ok(result.closed);
        assert.equal(result.after, '₹5–8 lakh');
    });

    test('on a laptop the list opens under the field', async () => {
        const { result } = await screen({
            entry, api, styles: true, width: 1280, height: 900, script: `
                await sleep(500);
                const field = $('[role=combobox][aria-label="Gender"]');
                field.click(); await sleep(200);
                const panel = $('[role=listbox]').parentElement.getBoundingClientRect();
                const f = field.getBoundingClientRect();
                return { below: panel.top >= f.bottom, left: Math.round(panel.left - f.left), popup: !!$('[role=dialog]') };` });
        assert.ok(result.below);
        assert.equal(result.left, 0, 'lined up with the field');
        assert.equal(result.popup, false, 'no phone popup on a laptop');
    });
});
