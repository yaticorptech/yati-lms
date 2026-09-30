/**
 * What the mascot shows, and in what order. Events — a quiz verdict, a
 * finished lesson — are never lost; ambient small talk only plays when the
 * mascot is free; nothing is kept while no mascot is on screen.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { mascotReducer, initialState, MAX_WAITING } = await import('../../src/mascot/mascotQueue.js');

const run = (...actions) => actions.reduce(mascotReducer, initialState);
const attach = { type: 'attach' };
const event = (name) => ({ type: 'react', name });
const ambient = (name) => ({ type: 'react', name, ambient: true });
const names = (state) => [state.current?.name ?? null, ...state.waiting.map((r) => r.name)];

test('nothing is kept while no stage is on screen', () => {
    const state = run(event('cheer-jump'), ambient('wave-hi'));
    assert.deepEqual(names(state), [null], 'a reaction with no mascot to show it would play, stale, on the next page');
});

test('small talk plays only when the mascot is free, and never queues', () => {
    assert.deepEqual(names(run(attach, ambient('wave-hi'))), ['wave-hi']);
    assert.deepEqual(names(run(attach, ambient('wave-hi'), ambient('wink-point'))), ['wave-hi']);
    assert.deepEqual(names(run(attach, event('sad'), ambient('wink-point'))), ['sad']);
});

test('an event cuts small talk short, so it lands while the moment is fresh', () => {
    assert.deepEqual(names(run(attach, ambient('wink-point'), event('sad'))), ['sad']);
});

test('events wait their turn, in the order they happened', () => {
    const state = run(attach, event('star-celebrate'), event('confetti-cheer'));
    assert.deepEqual(names(state), ['star-celebrate', 'confetti-cheer']);
    const next = mascotReducer(state, { type: 'done', id: state.current.id });
    assert.deepEqual(names(next), ['confetti-cheer']);
    assert.deepEqual(names(mascotReducer(next, { type: 'done', id: next.current.id })), [null]);
});

test('a burst is trimmed: no repeats waiting, and no more than a few behind the current one', () => {
    assert.deepEqual(names(run(attach, event('sad'), event('cheer-jump'), event('cheer-jump'))), ['sad', 'cheer-jump']);
    const burst = run(attach, event('a'), event('b'), event('c'), event('d'), event('e'), event('f'));
    assert.equal(burst.waiting.length, MAX_WAITING);
    assert.deepEqual(names(burst), ['a', 'b', 'c', 'd']);
});

test('only the reaction on screen can finish', () => {
    const state = run(attach, ambient('wink-point'), event('sad'));
    const stale = mascotReducer(state, { type: 'done', id: state.current.id - 1 });
    assert.equal(stale, state, 'a late "done" for the wink it cut short must not end the verdict');
});

test('the last stage leaving clears everything; one of two leaving clears nothing', () => {
    const busy = run(attach, attach, event('sad'), event('cheer-jump'));
    assert.deepEqual(names(mascotReducer(busy, { type: 'detach' })), ['sad', 'cheer-jump']);
    const gone = run(attach, event('sad'), event('cheer-jump'), { type: 'detach' });
    assert.deepEqual(names(gone), [null]);
    assert.equal(gone.stages, 0);
});
