/**
 * The interview's speech layer with a fake browser: a recogniser that we
 * drive by hand, a clock we control (long pauses are 2.5 s apart), and a
 * microphone that answers however the test says. Run with `npm test`.
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

/* ── A fake Web Speech recogniser the page can drive ─────────────────── */
let instances = [];
class FakeRecognition {
    constructor() { this.started = false; this.stopped = false; instances.push(this); }
    start() { this.started = true; }
    stop() { this.stopped = true; setTimeout(() => this.onend?.(), 0); }
    result(text, isFinal) { this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal })] }); }
}
let clock = 1_000_000; const realNow = Date.now;
globalThis.window = { SpeechRecognition: FakeRecognition };
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true, writable: true });  // Node ships a read-only navigator
const speech = await import('../../src/interview/speech.js');

beforeEach(() => { instances = []; clock = 1_000_000; Date.now = () => clock; });
const flush = () => new Promise((r) => setTimeout(r, 5));

describe('createListener', () => {
    test('is supported when the browser has a recogniser', () => { assert.equal(speech.createListener().supported, true); });
    test('streams interim text, assembles the final answer, and measures duration and long pauses', async () => {
        const l = speech.createListener(); const interim = []; let final = null;
        l.start({ onInterim: (t) => interim.push(t), onFinal: (t, m) => { final = { t, m }; } });
        const r = instances[0]; assert.equal(r.started, true); assert.equal(r.lang, 'en-IN'); assert.equal(r.interimResults, true);
        clock += 1000; r.result('my name', false);
        clock += 500; r.result('my name is Asha', true);
        clock += 3000; r.result('and I build dashboards', true);      // a 3 s silence: one long pause
        clock += 800; r.result('in Python', true);
        assert.deepEqual(interim, ['my name', 'my name is Asha', 'my name is Asha and I build dashboards', 'my name is Asha and I build dashboards in Python']);
        r.onend(); await flush();
        assert.equal(final.t, 'my name is Asha and I build dashboards in Python');
        assert.equal(final.m.durationMs, 5300); assert.equal(final.m.longPauses, 1); assert.equal(final.m.pauseMs, 3000);
    });
    test('the first phrase after silence is not a pause, and stop() ends the session', async () => {
        const l = speech.createListener(); let final = null; let ended = 0;
        l.start({ onFinal: (t, m) => { final = { t, m }; }, onEnd: () => { ended += 1; } });
        const r = instances[0]; clock += 6000; r.result('hello there', true);   // long think before the first word: not counted
        l.stop(); await flush();
        assert.equal(r.stopped, true); assert.equal(final.m.longPauses, 0); assert.equal(final.t, 'hello there'); assert.equal(ended, 1);
    });
    test('maps recogniser errors to the page and ignores no-speech once speech was heard', async () => {
        const l = speech.createListener(); const errors = [];
        l.start({ onError: (c) => errors.push(c) });
        const r = instances[0]; r.onerror({ error: 'no-speech' });            // nothing heard yet: reported
        r.result('some words', true); r.onerror({ error: 'no-speech' });      // heard already: swallowed
        r.onerror({ error: 'not-allowed' });
        assert.deepEqual(errors, ['no-speech', 'not-allowed']);
        l.stop();
    });
    test('starting again replaces the previous recogniser', () => {
        const l = speech.createListener(); l.start({}); l.start({});
        assert.equal(instances.length, 2); assert.equal(instances[0].stopped, true); assert.equal(instances[1].started, true);
        l.stop();
    });
});

describe('listenerErrorMessage', () => {
    test('gives every failure a plain message with the typing fallback, and aborted none', () => {
        assert.match(speech.listenerErrorMessage('not-allowed'), /Microphone access was blocked.*type your answer/);
        assert.match(speech.listenerErrorMessage('audio-capture'), /No microphone/);
        assert.match(speech.listenerErrorMessage('network'), /internet connection/);
        assert.match(speech.listenerErrorMessage('no-speech'), /did not catch/);
        assert.match(speech.listenerErrorMessage('service-not-allowed'), /not available in this browser/);
        assert.equal(speech.listenerErrorMessage('aborted'), '');
        assert.match(speech.listenerErrorMessage('something-new'), /Try again, or type/);
    });
});

describe('createSpeaker without speech synthesis', () => {
    test('reports unsupported and resolves at once so the interview goes on', async () => {
        const s = speech.createSpeaker(); let started = 0; let ended = 0;
        assert.equal(s.supported, false);
        const spoke = await s.speak('Tell me about yourself.', { onStart: () => { started += 1; }, onEnd: () => { ended += 1; } });
        assert.equal(spoke, false); assert.equal(started, 1); assert.equal(ended, 1);
        s.setMuted(true); s.stop();  // no synthesis to cancel: must not throw
    });
});

describe('requestMicrophone', () => {
    test('reports no microphone API', async () => { assert.deepEqual(await speech.requestMicrophone(), { ok: false, code: 'audio-capture' }); });
    test('maps a refused permission and a missing device, and releases a granted stream', async () => {
        Date.now = realNow;
        const err = (name) => Object.assign(new Error(name), { name });
        globalThis.navigator.mediaDevices = { getUserMedia: async () => { throw err('NotAllowedError'); } };
        assert.deepEqual(await speech.requestMicrophone(), { ok: false, code: 'not-allowed' });
        globalThis.navigator.mediaDevices = { getUserMedia: async () => { throw err('NotFoundError'); } };
        assert.deepEqual(await speech.requestMicrophone(), { ok: false, code: 'audio-capture' });
        let stopped = 0; globalThis.navigator.mediaDevices = { getUserMedia: async () => ({ getTracks: () => [{ stop: () => { stopped += 1; } }] }) };
        assert.deepEqual(await speech.requestMicrophone(), { ok: true }); assert.equal(stopped, 1);
    });
});
