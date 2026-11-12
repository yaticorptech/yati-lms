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

test('the organiser’s own description on Your template fills in {name} and {competition}', () => {
    const shapes = T.layout('custom', { recipient: { name: 'Asha' }, award: { kind: 'first' }, competition: 'Chess', description: '{name} shone in {competition}.' });
    const text = shapes.find((s) => s.key === 'sentence').runs.map((r) => r.text).join('');
    assert.ok(text.includes('Asha shone in Chess.'), text);
    assert.ok(!/\{(name|competition)\}/.test(text), text);
});

test('a name in Kannada or Hindi is set in a font that has its letters', async () => {
    const design = { template: 'custom', competition: { name: 'ಚೆಸ್ प्रतियोगिता' }, branding: {} };
    const buf = await render.pdf(null, design, [{ certId: 'YC-AAAA-BBBB', recipient: { name: 'ಅನನ್ಯಾ Ananya' }, award: { kind: 'first' } }]);
    const pdf = buf.toString('latin1');
    assert.ok(/NotoSerifKannada/.test(pdf), 'Kannada font embedded');
    assert.ok(/NotoSerifDevanagari/.test(pdf), 'Devanagari font embedded');
});

test('a certificate only for those who took part: a game\'s players who joined a match, not a no-show or a bye', () => {
    const { whoTookPart } = require('../../src/competitions/certificates/participation');
    const team = (id, ...players) => ({ _id: id, players: players.map((userId) => ({ userId })) });
    const teams = [team('A', 'a1', 'a2'), team('B', 'b1', 'b2'), team('C', 'c1'), team('D', 'd1', 'd2'), team('E', 'e1')];
    const matches = [
        { status: 'bye', decidedBy: 'bye', sides: [{ teamId: 'C' }] },
        // The organizer decided it, no game ever opened (played away from the app): its line-up only.
        { status: 'completed', decidedBy: 'admin', gameIds: [], sides: [{ teamId: 'D', lineup: ['d2'] }, { teamId: 'E', lineup: [] }] },
        // A game nobody joined, then decided by the organizer: nobody played.
        { status: 'completed', decidedBy: 'admin', gameIds: ['g9'], sides: [{ teamId: 'C' }] }
    ];
    // a1 played; b1 came to a walkover (b2 a substitute, B's opponents never came).
    const games = [{ seats: [{ userId: 'a1', joinedAt: new Date() }, { userId: 'c1', joinedAt: null }] }, { seats: [{ userId: 'b1', joinedAt: new Date() }] }];
    const got = whoTookPart({ competition: { game: 'chess' }, teams, matches, games });
    assert.deepStrictEqual([...got].sort(), ['a1', 'b1', 'd2', 'e1']);

    assert.deepStrictEqual([...whoTookPart({ competition: { game: 'quiz' }, teams, attempts: [{ userId: 'a2' }, { userId: 'zz' }] })], ['a2']);
    assert.deepStrictEqual([...whoTookPart({ competition: { game: 'hackathon' }, teams, submissions: [{ teamId: 'D' }] })].sort(), ['d1', 'd2']);
});

test('the automatic certificates go to the placed and the participants who played, never to a listed player who did not', () => {
    const { certified } = require('../../src/competitions/certificates/auto');
    const roster = [
        { userId: 'w1', place: 1, played: true }, { userId: 'w2', place: 1, played: false },
        { userId: 'p1', place: null, played: true }, { userId: 'p2', place: null, played: false }
    ];
    const comp = { kind: 'competition', winners: true, participants: true };
    assert.deepStrictEqual(certified({ places: [1, 2, 3] }, comp, roster).map((r) => [r.userId, r.place]), [['w1', 1], ['p1', null]]);
    assert.deepStrictEqual(certified({ places: [1, 2, 3], participation: false }, comp, roster).map((r) => r.userId), ['w1']);
});
