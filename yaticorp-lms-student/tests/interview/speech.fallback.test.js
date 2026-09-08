/** A browser with no speech recognition at all (Firefox): the listener must say so, not throw. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
globalThis.window = {}; Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true, writable: true });
const speech = await import('../../src/interview/speech.js');
test('the listener is unsupported and reports service-not-allowed on start', () => {
    const l = speech.createListener(); const errors = [];
    assert.equal(l.supported, false);
    l.start({ onError: (c) => errors.push(c) });
    assert.deepEqual(errors, ['service-not-allowed']);
    assert.equal(l.stop(), true);
});
