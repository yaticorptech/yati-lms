/** The Certificate Builder (src/competitions/certificates): its templates, and the PDF they make. No database. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const T = require('../../src/competitions/certificates/templates');
const render = require('../../src/competitions/certificates/render');

test('the admin app (live preview) and the student app (My Profile) draw with exact copies of the templates', () => {
    const server = fs.readFileSync(path.join(__dirname, '../../src/competitions/certificates/templates.js'), 'utf8');
    for (const app of ['yaticorp-lms-admin', 'yaticorp-lms-student']) {
        const copy = fs.readFileSync(path.join(__dirname, `../../../${app}/src/certificates/templates.shared.js`), 'utf8');
        assert.strictEqual(copy, server, `copy src/competitions/certificates/templates.js to ${app}/src/certificates/templates.shared.js`);
    }
});

test('every template lays out every award, with the recipient and the QR code', () => {
    for (const t of T.TEMPLATES) {
        for (const kind of ['first', 'second', 'third', 'participation', 'custom']) {
            const shapes = T.layout(t.id, { recipient: { name: 'Hari Kiran' }, award: { kind, title: 'Best Speaker' }, competition: 'Inter College Competition' });
            assert.ok(shapes.some((s) => s.t === 'text' && s.text === 'Hari Kiran'), `${t.id}/${kind}: the name`);
            assert.ok(shapes.some((s) => s.t === 'img' && s.slot === 'qr'), `${t.id}/${kind}: the QR code`);
        }
    }
});

test('the description fills in each recipient', () => {
    const d = T.words({ recipient: { name: 'Asha', institution: 'RVCE' }, award: { kind: 'second' }, competition: 'Code Clash', description: '{name} of {institution}: {award} in {competition}.' });
    assert.strictEqual(d.description, 'Asha of RVCE: second place in Code Clash.');
});

test('a batch is one PDF, a page each', async () => {
    const design = { template: 'college', competition: { name: 'Inter College Competition' }, date: '27 Oct 2026', signatories: [{ name: 'A', designation: 'B' }], branding: { yaticorp: true } };
    const buf = await render.pdf(null, design, [{ certId: 'YC-AAAA-BBBB', recipient: { name: 'One' }, award: { kind: 'first' } }, { certId: 'YC-CCCC-DDDD', recipient: { name: 'Two' }, award: { kind: 'participation' } }]);
    assert.strictEqual(buf.subarray(0, 5).toString(), '%PDF-');
    assert.strictEqual((buf.toString('latin1').match(/\/Type \/Page\b/g) || []).length, 2);
});

test('element edits (the Smart Certificate Builder) move, restyle, hide, turn and layer elements', () => {
    const input = { hasLogo: true, noQr: true, details: { college: 'X', title: 'Certificate' }, recipient: { name: 'Asha' }, award: { kind: 'first' }, competition: 'Chess' };
    const plain = T.layout('custom', input);
    const before = plain.find((s) => s.key === 'title');
    const shapes = T.layout('custom', { ...input, elements: { title: { dx: 10, dy: -5, s: 2, family: 'sans', italic: true, color: '#ff0000', rot: 15 }, logo: { hidden: true }, name: { z: 5 } } });
    const t = shapes.find((s) => s.key === 'title');
    assert.deepStrictEqual([t.x, t.y, t.size, t.font, t.color, t.rot], [before.x + 10, before.y - 5, before.size * 2, 'sansBoldItalic', '#ff0000', 15]);
    assert.ok(!shapes.some((s) => s.key === 'logo'), 'hidden');
    assert.strictEqual(shapes[shapes.length - 1].key, 'name', 'brought to the front');
});
