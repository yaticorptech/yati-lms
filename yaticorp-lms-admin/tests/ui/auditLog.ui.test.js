/**
 * Admin audit log on a phone: the search across the top and the three filters
 * (admin, area, period) in one row under it, each reading in full — not three
 * full-width dropdowns stacked down the screen — with nothing running off the
 * side. From lg the search and filters share one line.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, wrap, skipWithoutStyles } from './harness.js';

const ROWS = [
    { _id: 'r1', at: new Date().toISOString(), adminId: 'a1', adminName: 'YATICORP Super Admin', role: 'superadmin', label: 'Signed in', area: 'Sign-in', method: 'POST', path: '/api/auth/admin/login', status: 200, ip: '1.2.3.4', repeats: 0, target: null, org: null, details: {} }
];
const api = `
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url) => url === '/admin/audit-log'
    ? reply({ total: 1, skip: 0, limit: 50, removed: 0, admins: [{ _id: 'a1', name: 'YATICORP Super Admin', email: 'ceo@yaticorp.com', role: 'superadmin' }], rows: ${JSON.stringify(ROWS)} })
    : reply({})
};`;

const measure = `
await sleep(800);
const search = $('input[type="search"]').getBoundingClientRect();
const fields = ['Admin', 'Area', 'Period'].map((n) => $('[aria-label="' + n + '"]')).map((el) => {
  const r = el.getBoundingClientRect();
  const label = el.querySelector('.truncate') || el;
  return { top: Math.round(r.top), left: r.left, right: r.right, text: label.innerText.trim(), cut: label.scrollWidth > label.clientWidth + 1 };
});
return { searchTop: Math.round(search.top), searchRight: search.right, fields, overflow: document.documentElement.scrollWidth > window.innerWidth };`;

describe('admin audit log filters', { skip: skipWithoutStyles }, () => {
    for (const width of [320, 360, 390]) {
        test(`at ${width}px the three filters share one row under the search, each in full`, async () => {
            const { result, errors } = await screen({ entry: wrap('pages/AuditLog.jsx', 'AuditLog'), api, width, height: 900, styles: true, script: measure });
            assert.deepEqual(errors, []);
            const [admin, area, period] = result.fields;
            assert.deepEqual(result.fields.map((f) => f.text), ['All admins', 'All areas', '7 days']);
            assert.ok(admin.top === area.top && area.top === period.top, `one row: ${JSON.stringify(result.fields.map((f) => f.top))}`);
            assert.ok(admin.top > result.searchTop, 'under the search');
            assert.deepEqual(result.fields.filter((f) => f.cut).map((f) => f.text), [], 'no label cut short');
            assert.equal(result.overflow, false, 'nothing runs off the side');
        });
    }

    test('on a desktop the search and the filters share one line', async () => {
        const { result, errors } = await screen({ entry: wrap('pages/AuditLog.jsx', 'AuditLog'), api, width: 1400, styles: true, script: measure });
        assert.deepEqual(errors, []);
        assert.ok(result.fields.every((f) => Math.abs(f.top - result.searchTop) <= 2), JSON.stringify(result));
    });
});
