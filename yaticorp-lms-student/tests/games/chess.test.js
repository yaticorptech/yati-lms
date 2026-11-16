/** Chess against the computer (2026-11-16). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';

const B = await import('../../src/career/data/bands/chessBot.js');
const { seeded } = await import('../../src/career/data/seeded.js');

test('Chess: the computer takes a mate in one and only plays legal moves', () => {
  const g = new Chess();
  ['f3', 'e5', 'g4'].forEach((m) => g.move(m));
  assert.equal(B.bestMove(g.fen(), 2).san, 'Qh4#');
  const cfg = B.chessConfig('intermediate', 1, 1);
  for (let i = 0; i < 5; i += 1) {
    const m = B.computerMove(new Chess().fen(), cfg, seeded(i));
    assert.ok(new Chess().moves({ verbose: true }).some((x) => x.from === m.from && x.to === m.to));
  }
  assert.ok(B.chessConfig('analytical', 3, 30).depth > B.chessConfig('intermediate', 1, 1).depth);
});
