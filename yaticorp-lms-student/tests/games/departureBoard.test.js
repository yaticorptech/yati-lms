/** Departure Board (2026-11-16): every question has exactly one right option, read from the board AFTER the announcements. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const D = await import('../../src/career/data/bands/departureBoard.js');
const { seeded } = await import('../../src/career/data/seeded.js');

test('boards are unique per column and questions are answerable', () => {
  for (let d = 1; d <= 3; d += 1) {
    for (let lv = 1; lv <= 30; lv += 1) {
      const cfg = D.boardConfig('advanced', d, lv);
      for (let seed = 0; seed < 15; seed += 1) {
        const where = `d${d} L${lv} s${seed}`;
        const level = D.makeBoardLevel(seeded(seed * 977 + lv), cfg);
        assert.equal(level.length, cfg.boards, where);
        for (const b of level) {
          assert.equal(b.shown.length, cfg.flights, where);
          for (const f of ['dest', 'gate', 'time', 'flight']) assert.equal(new Set(b.rows.map((r) => r[f])).size, cfg.flights, `${where} ${f}`);
          assert.equal(b.notes.length, cfg.changes, where);
          for (const n of b.notes) {
            const r = b.rows.find((x) => x.dest === n.dest);
            assert.equal(r[n.kind], n.to, where);
            assert.notEqual(n.from, n.to, where);
          }
          assert.equal(b.questions.length, cfg.questions, where);
          for (const q of b.questions) {
            assert.equal(q.options.length, 4, `${where} ${q.prompt}`);
            assert.equal(new Set(q.options).size, 4, `${where} ${q.prompt} ${q.options}`);
            assert.equal(q.options.filter((o) => o === q.answer).length, 1, where);
          }
          // Each change is asked about, with its old value as a trap.
          for (const n of b.notes) {
            const q = b.questions.find((x) => x.prompt.includes(n.dest) && x.answer === (n.kind === 'time' ? D.clock(n.to) : n.to));
            assert.ok(q, `${where}: change to ${n.dest} not asked`);
            assert.ok(q.options.includes(n.kind === 'time' ? D.clock(n.from) : n.from), where);
          }
        }
      }
    }
  }
});

test('later levels get harder', () => {
  const a = D.boardConfig('advanced', 1, 1);
  const z = D.boardConfig('advanced', 3, 30);
  assert.ok(z.flights > a.flights && z.fields.length > a.fields.length && z.changes > a.changes);
});
