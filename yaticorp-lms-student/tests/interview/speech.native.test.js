/**
 * The interview's speech layer inside the app: the phone's engines stand
 * behind Capacitor plugin objects, which are Proxies that turn ANY property
 * into a native call — `then` included. A promise resolved with one calls
 * native "then()", fails, and never settles; that was the silent interview of
 * 2026-09-30. The mocks here behave the same way, so the module is exercised
 * exactly as the phone does. Run with `npm test` (needs module mocks).
 */
import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';

/* ── A browser-shaped global with an event target and no web speech ─────── */
globalThis.window = new EventTarget();
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true, writable: true });  // Node ships a read-only navigator
const unhandled = [];
process.on('unhandledRejection', (e) => unhandled.push(e?.message || String(e)));

/* ── Capacitor plugin proxies, as @capacitor/core builds them ─────────── */
const capacitorPlugin = (name, impl) => new Proxy({}, {
    get(_, prop) {
        if (prop === '$$typeof') return undefined;
        if (prop === 'toJSON') return () => ({});
        return (...args) => (impl[prop] ? impl[prop](...args) : Promise.reject(new Error(`"${name}.${String(prop)}()" is not implemented on android`)));
    }
});
const spoken = [];
let listeners = {};
const emit = (name, payload) => (listeners[name] || []).forEach((cb) => cb(payload));
const TextToSpeech = capacitorPlugin('TextToSpeech', {
    getSupportedLanguages: async () => ({ languages: ['en-US', 'en-AU', 'en-IN'] }),
    getSupportedVoices: async () => ({ voices: [{}, {}] }),
    speak: async ({ text }) => { spoken.push(text); },
    stop: async () => {}
});
/* What the phone does after each start() and stop(), set per test. The
   default is a clean answer: speech begins, a partial, the end of speech, and
   the final, better transcript Android sends after saying it stopped. */
const answer = () => {
    setTimeout(() => emit('listeningState', { status: 'started' }), 5);
    setTimeout(() => emit('partialResults', { matches: ['two years of'] }), 10);
    setTimeout(() => emit('listeningState', { status: 'stopped' }), 15);
    setTimeout(() => emit('partialResults', { matches: ['two years of react'] }), 20);
};
const phone = { onStart: answer, onStop: () => {}, starts: [], stops: 0 };
const SpeechRecognition = capacitorPlugin('SpeechRecognition', {
    available: async () => ({ available: true }),
    checkPermissions: async () => ({ speechRecognition: 'granted' }),
    requestPermissions: async () => ({ speechRecognition: 'granted' }),
    addListener: async (name, cb) => { (listeners[name] ||= []).push(cb); return { remove: async () => { listeners[name] = listeners[name].filter((x) => x !== cb); } }; },
    start: async (opts) => { phone.starts.push(opts); phone.onStart(phone.starts.length); },
    stop: async () => { phone.stops += 1; phone.onStop(); }
});
mock.module('@capacitor/core', { namedExports: { Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } } });
mock.module('@capacitor-community/text-to-speech', { namedExports: { TextToSpeech } });
mock.module('@capacitor-community/speech-recognition', { namedExports: { SpeechRecognition } });
const speech = await import('../../src/interview/speech.js');

const logText = () => speech.voiceLogText();
const tick = (ms) => new Promise((r) => setTimeout(r, ms));
const reset = (onStart = answer, onStop = () => {}) => { listeners = {}; phone.onStart = onStart; phone.onStop = onStop; phone.starts = []; phone.stops = 0; speech.voiceLogClear(); };
/** A listening with every callback recorded. */
const record = (listener) => {
    const seen = { interim: [], final: undefined, metrics: undefined, errors: [], ended: false };
    listener.start({ onInterim: (t) => seen.interim.push(t), onFinal: (t, m) => { seen.final = t; seen.metrics = m; }, onEnd: () => { seen.ended = true; }, onError: (c) => seen.errors.push(c) });
    return seen;
};

describe('inside the app', () => {
    test('the speaker says every sentence through the phone and comes back', async () => {
        const speaker = speech.createSpeaker();
        assert.equal(speaker.supported, true);
        const seen = [];
        const ok = await Promise.race([
            speaker.speak('Welcome to the interview. Tell me about React.', { onStart: () => seen.push('start'), onEnd: () => seen.push('end'), onError: (why) => seen.push(`error ${why}`) }),
            tick(3000).then(() => 'hung')
        ]);
        assert.equal(ok, true, logText());
        assert.deepEqual(spoken, ['Welcome to the interview.', 'Tell me about React.']);
        assert.deepEqual(seen, ['start', 'end']);
        assert.match(logText(), /speak: engine ready, voice en-in/);
    });

    test('the listener streams what the phone hears and finishes on its final transcript', async () => {
        reset();
        const listener = speech.createListener();
        assert.equal(listener.supported, true);
        const seen = record(listener);
        await tick(200);
        assert.deepEqual(seen.errors, [], logText());
        assert.deepEqual(seen.interim, ['two years of', 'two years of react']);
        assert.equal(seen.final, 'two years of react');
        assert.equal(seen.ended, true);
        assert.equal(typeof seen.metrics?.durationMs, 'number', 'voice metrics go with the answer, as on the web');
        assert.match(logText(), /mic: starting \(en-IN\)/);
    });

    test('"try again" (a stop, then a start at once) is not ended by the earlier stop\'s fallback', async () => {
        // The first listening hears nothing; the second answers slowly, well past
        // the 1.2 s in which the first stop's fallback timer used to fire.
        let starts = 0;
        reset((n) => { starts = n; if (n === 2) { setTimeout(() => emit('partialResults', { matches: ['react and node'] }), 1500); setTimeout(() => emit('listeningState', { status: 'stopped' }), 1600); setTimeout(() => emit('partialResults', { matches: ['react and node mostly'] }), 1650); } });
        const listener = speech.createListener();
        const first = record(listener);
        await tick(50);
        listener.stop();
        const second = record(listener);
        await tick(1400);
        assert.equal(starts, 2, logText());
        assert.equal(second.ended, false, `the second listening was ended early:\n${logText()}`);
        await tick(500);
        assert.equal(second.final, 'react and node mostly', logText());
        assert.deepEqual(second.errors, []);
        assert.equal(first.final, undefined, 'the superseded listening says nothing to the page');
        assert.deepEqual(first.errors, []);
        assert.match(logText(), /earlier listening superseded/);
    });

    test('a recogniser that drops out right after starting is started once more', async () => {
        reset((n) => { if (n === 1) setTimeout(() => emit('listeningState', { status: 'stopped', error: "Didn't understand, please try again.", code: 11 }), 5); else answer(); });
        const listener = speech.createListener();
        const seen = record(listener);
        await tick(900);
        assert.equal(phone.starts.length, 2, logText());
        assert.equal(seen.final, 'two years of react', logText());
        assert.deepEqual(seen.errors, []);
        assert.match(logText(), /code 11/);
        assert.match(logText(), /trying once more/);
    });

    test('a second drop-out is reported, not retried for ever', async () => {
        reset(() => setTimeout(() => emit('listeningState', { status: 'stopped', error: 'Client side error', code: 5 }), 5));
        const listener = speech.createListener();
        const seen = record(listener);
        await tick(900);
        assert.equal(phone.starts.length, 2, logText());
        assert.deepEqual(seen.errors, ['native:Client side error [5]']);
        assert.equal(seen.ended, true);
    });

    test('stopping before a word was said still hands the page its turn, with an empty answer', async () => {
        // Android answers a stop with no speech by ERROR_NO_MATCH.
        reset(() => {}, () => setTimeout(() => emit('listeningState', { status: 'stopped', error: 'No match', code: 7 }), 20));
        const listener = speech.createListener();
        const seen = record(listener);
        await tick(50);
        listener.stop();
        await tick(100);
        assert.equal(seen.final, '', logText());
        assert.deepEqual(seen.errors, []);
        assert.equal(seen.ended, true);
        // ...and a phone that says nothing about the stop is not waited on for ever.
        reset(() => {}, () => {});
        const silent = record(listener);
        await tick(50);
        listener.stop();
        await tick(1300);
        assert.equal(silent.final, '', logText());
        assert.equal(silent.ended, true);
    });

    test('the microphone check and the diagnostics answer promptly', async () => {
        const mic = await Promise.race([speech.requestMicrophone(), tick(3000).then(() => 'hung')]);
        assert.deepEqual(mic, { ok: true });
        const status = await Promise.race([speech.voiceDiagnostics(), tick(3000).then(() => 'hung')]);
        assert.equal(status, 'voice: ready, 3 languages (en-US, en-AU, en-IN), 2 voices · mic: recogniser available, permission granted');
    });

    test('no plugin object was ever handed to a promise: nothing called native then()', async () => {
        await tick(20);
        assert.deepEqual(unhandled, []);
        assert.doesNotMatch(logText(), /not implemented|UNHANDLED|did not answer/);
    });
});
