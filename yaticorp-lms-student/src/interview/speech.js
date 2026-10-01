/**
 * Voice for the mock interview, behind two small interfaces so a hosted
 * speech service can replace the browser's later without touching the page:
 *   createSpeaker()  → { supported, speak(text, {onStart,onEnd}), stop(), setMuted(bool) }
 *   createListener() → { supported, start({onInterim,onFinal,onEnd,onError}), stop() }
 * Both use the Web Speech API today. Chrome cuts utterances longer than
 * ~15 s, so text is spoken sentence by sentence; recognition results carry no
 * word timings, so pace and pauses are estimated from result timings.
 */
import { Capacitor } from '@capacitor/core';
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
const Recognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
// Inside the iOS or Android app the web view has neither engine; the phone's
// own text-to-speech and speech recognition stand in through Capacitor.
const NATIVE = Capacitor.isNativePlatform();

/* ── The in-app voice log ─────────────────────────────────────────────── */

/**
 * Inside the app, every step the phone's speech engines take, for the log
 * the interview can show. It is mirrored into sessionStorage, so a page
 * reload (which empties this module) leaves its trace instead of a blank box,
 * and into the console, for a USB-attached logcat.
 */
const LOG_KEY = 'yati.voiceLog';
const LOG_MAX = 60;
const readStoredLog = () => { try { return JSON.parse(sessionStorage.getItem(LOG_KEY) || '[]').slice(-LOG_MAX); } catch { return []; } };
const voiceLogLines = NATIVE ? readStoredLog() : [];
const stamp = () => { const d = new Date(); return `${d.toTimeString().slice(0, 8)}.${String(d.getMilliseconds()).padStart(3, '0')}`; };
export const voiceLog = (line) => {
    if (!NATIVE) return;
    voiceLogLines.push(`${stamp()} ${line}`);
    while (voiceLogLines.length > LOG_MAX) voiceLogLines.shift();
    try { console.log(`[voice] ${line}`); } catch { /* no console */ }
    try { sessionStorage.setItem(LOG_KEY, JSON.stringify(voiceLogLines)); } catch { /* storage off */ }
    try { window.dispatchEvent(new CustomEvent('voice:log', { detail: [...voiceLogLines] })); } catch { /* not a browser */ }
};
export const voiceLogSnapshot = () => [...voiceLogLines];
export const voiceLogText = () => voiceLogLines.join('\n');
export const voiceLogClear = () => {
    voiceLogLines.length = 0;
    try { sessionStorage.removeItem(LOG_KEY); } catch { /* storage off */ }
    try { window.dispatchEvent(new CustomEvent('voice:log', { detail: [] })); } catch { /* not a browser */ }
};
const since = (t0) => `${Date.now() - t0}ms`;

// A crash anywhere in the page, a reload, or the app going to the background
// would each explain a voice call that never reports back: all three are logged.
if (NATIVE && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    voiceLog(`--- page loaded (build ${import.meta.env?.VITE_BUILD_STAMP || '?'}, ${Capacitor.getPlatform()}) ---`);
    window.addEventListener('error', (e) => voiceLog(`JS ERROR: ${e.message} (${String(e.filename || '').split('/').pop()}:${e.lineno})`));
    window.addEventListener('unhandledrejection', (e) => voiceLog(`UNHANDLED: ${e.reason?.message || e.reason}`));
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => voiceLog(`page ${document.hidden ? 'hidden' : 'visible'}`));
}

/** A plugin call that never answers must not hold the interview: after `ms` it counts as failed. */
const withTimeout = (promise, ms, label) =>
    new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`${label} did not answer within ${Math.round(ms / 1000)}s`)), ms);
        Promise.resolve(promise).then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
    });
// The plugin modules are separate chunks of the build; loading one is a
// network-style step of its own and is timed like any other. They resolve
// with the MODULE, never with the plugin itself: a Capacitor plugin is a
// Proxy that turns any property into a native call — `then` included — so a
// promise resolved with one calls native "then()", fails, and never settles.
const loadTts = () => withTimeout(import('@capacitor-community/text-to-speech'), 8000, 'loading the voice plugin');
const loadStt = () => withTimeout(import('@capacitor-community/speech-recognition'), 8000, 'loading the microphone plugin');

/* ── The browser's own voice ──────────────────────────────────────────── */

const pickVoice = () => {
    if (!synth) return null;
    const voices = synth.getVoices() || [];
    const prefer = ['en-IN', 'en-GB', 'en-US', 'en'];
    for (const lang of prefer) {
        const v = voices.find((x) => x.lang?.replace('_', '-').startsWith(lang) && /google|natural|premium|enhanced|samantha|daniel|rishi|veena/i.test(x.name)) || voices.find((x) => x.lang?.replace('_', '-').startsWith(lang));
        if (v) return v;
    }
    return voices[0] || null;
};
const sentences = (text) => String(text || '').replace(/\s+/g, ' ').match(/[^.!?]+[.!?]*\s*/g)?.map((s) => s.trim()).filter(Boolean) || [String(text || '')];

export const createSpeaker = () => {
    if (NATIVE) return createNativeSpeaker();
    let muted = false; let token = 0;
    const supported = !!synth;
    if (supported && synth.getVoices().length === 0) synth.addEventListener?.('voiceschanged', () => {}, { once: true });
    return {
        supported,
        setMuted(m) { muted = !!m; if (muted) synth?.cancel(); },
        stop() { token += 1; synth?.cancel(); },
        /** Resolves when the whole text has been spoken (at once when muted or unsupported). */
        speak(text, { onStart, onEnd } = {}) {
            return new Promise((resolve) => {
                if (!supported || muted || !text) { onStart?.(); onEnd?.(); resolve(false); return; }
                const my = ++token; synth.cancel();
                const parts = sentences(text); const voice = pickVoice(); let i = 0; let started = false;
                const finish = () => { if (my === token) { onEnd?.(); } resolve(true); };
                const next = () => {
                    if (my !== token) { resolve(false); return; }
                    if (i >= parts.length) return finish();
                    const u = new SpeechSynthesisUtterance(parts[i++]);
                    if (voice) u.voice = voice; u.lang = voice?.lang || 'en-IN'; u.rate = 0.98; u.pitch = 1;
                    u.onstart = () => { if (!started) { started = true; onStart?.(); } };
                    u.onend = next; u.onerror = (e) => { if (e.error === 'interrupted' || e.error === 'canceled') resolve(false); else next(); };
                    synth.speak(u);
                };
                // Safari needs voices to have loaded; a tick lets getVoices() fill.
                setTimeout(next, 30);
                // Safety: if nothing ever starts (some browsers stall), give up after 4 s so the interview goes on.
                setTimeout(() => { if (!started && my === token) { synth.cancel(); finish(); } }, 4000);
            });
        }
    };
};

/* ── The phone's own voice ────────────────────────────────────────────── */

/**
 * Spoken sentence by sentence so stop() cuts in cleanly. The engine is asked
 * which English it has before the first word (Indian, else American, else
 * British, else whatever it defaults to), and a sentence that fails is tried
 * once more after a moment: the engine can still be warming up when the
 * first question is due. Every step is logged with how long it took, and
 * nothing here can hang: each plugin call has a deadline.
 */
const budgetFor = (text) => 4000 + String(text || '').length * 90;
const createNativeSpeaker = () => {
    let muted = false; let token = 0; let langPromise = null;
    const language = (tts) => {
        if (!langPromise) {
            langPromise = (async () => {
                let languages = null; let reason = '';
                for (let i = 0; i < 4 && !languages; i++) {
                    const t0 = Date.now();
                    try {
                        ({ languages = [] } = await withTimeout(tts.getSupportedLanguages(), 3000, 'the speech engine'));
                        voiceLog(`speak: engine lists ${languages.length} languages (${since(t0)})`);
                    } catch (e) {
                        reason = e?.message || String(e);
                        voiceLog(`speak: languages try ${i + 1} failed after ${since(t0)}: ${reason}`);
                        await new Promise((r) => setTimeout(r, 500));
                    }
                }
                if (!languages) return { lang: undefined, ready: false, reason };
                const norm = (l) => String(l).replace('_', '-').toLowerCase();
                const pick = ['en-in', 'en-us', 'en-gb'].find((tag) => languages.some((l) => norm(l) === tag)) || languages.find((l) => norm(l).startsWith('en'));
                return { lang: pick, ready: true, reason: '' };
            })();
        }
        return langPromise;
    };
    const say = async (tts, text, lang) => {
        const opts = { text, rate: 0.98, pitch: 1, volume: 1, ...(lang ? { lang } : {}) };
        // Reading time plus a margin: an engine that takes the sentence but never says it is done counts as failed.
        const budget = budgetFor(text);
        let reason = '';
        for (let i = 0; i < 2; i++) {
            const t0 = Date.now();
            try { await withTimeout(tts.speak(opts), budget, 'the voice'); return { ok: true }; } catch (e) {
                reason = e?.message || String(e);
                voiceLog(`speak: try ${i + 1} failed after ${since(t0)}: ${reason}`);
                await withTimeout(tts.stop(), 2000, 'stop').catch(() => {});
            }
            await new Promise((r) => setTimeout(r, 500));
        }
        return { ok: false, reason };
    };
    return {
        supported: true,
        setMuted(m) { muted = !!m; if (muted) loadTts().then(({ TextToSpeech }) => TextToSpeech.stop()).catch(() => {}); },
        stop() { token += 1; loadTts().then(({ TextToSpeech }) => TextToSpeech.stop()).catch(() => {}); },
        /** `onError(reason)` says why the phone could not speak, so the page can show it. */
        speak(text, { onStart, onEnd, onError } = {}) {
            return (async () => {
                if (muted || !text) { onStart?.(); onEnd?.(); return false; }
                const my = ++token;
                const t0 = Date.now();
                voiceLog(`speak: asked for "${String(text).slice(0, 30)}…"`);
                try {
                    let tts;
                    try { ({ TextToSpeech: tts } = await loadTts()); voiceLog(`speak: plugin loaded (${since(t0)})`); } catch (e) {
                        voiceLog(`speak: plugin missing (${e?.message || e})`);
                        onError?.(`speech plugin missing: ${e?.message || e}`); onStart?.(); onEnd?.(); return false;
                    }
                    const { lang, ready, reason } = await language(tts);
                    voiceLog(ready ? `speak: engine ready, voice ${lang || 'default'} (${since(t0)})` : `speak: engine NOT ready (${reason || 'no engine'})`);
                    if (!ready) onError?.(`speech engine not ready: ${reason || 'no engine on this phone'}`);
                    const t1 = Date.now();
                    await withTimeout(tts.stop(), 2000, 'stop').then(() => voiceLog(`speak: queue cleared (${since(t1)})`), (e) => voiceLog(`speak: stop() failed: ${e?.message || e}`));
                    let started = false;
                    const parts = sentences(text);
                    for (const part of parts) {
                        if (my !== token) { voiceLog('speak: cut short'); return false; }
                        if (!started) { started = true; onStart?.(); voiceLog(`speak: starting ${parts.length} sentence(s), "${part.slice(0, 40)}…"`); }
                        const t2 = Date.now();
                        const said = await say(tts, part, lang);
                        if (!said.ok) {
                            voiceLog(`speak: FAILED after ${since(t2)}: ${said.reason}`);
                            onError?.(`could not speak (${lang || 'default voice'}): ${said.reason}`);
                            // The web view's own voice, should this phone have one, for the rest of the text.
                            if (synth) {
                                voiceLog('speak: trying the web voice instead');
                                await new Promise((resolve) => {
                                    const u = new SpeechSynthesisUtterance(parts.slice(parts.indexOf(part)).join(' '));
                                    u.lang = 'en-IN'; u.rate = 0.98;
                                    const done = () => resolve();
                                    u.onend = done; u.onerror = done;
                                    setTimeout(done, budgetFor(text));
                                    synth.speak(u);
                                });
                            }
                            break;
                        }
                        voiceLog(`speak: sentence done in ${since(t2)}`);
                    }
                    if (my === token) onEnd?.();
                    return my === token;
                } catch (e) {
                    // Nothing above should throw; if it does, the page still gets its turn back.
                    voiceLog(`speak: CRASHED after ${since(t0)}: ${e?.message || e}`);
                    onError?.(`voice crashed: ${e?.message || e}`);
                    if (my === token) onEnd?.();
                    return false;
                }
            })();
        }
    };
};

/* ── The phone's own recognition ──────────────────────────────────────── */

// The recogniser's English. Asking the phone for its list goes through a
// broadcast to the Google app, which some phones never answer; Indian
// English is accepted by every Google-backed recogniser, and a phone that
// refuses it is retried with its own default.
const STT_LANGUAGE = 'en-IN';

// An error this soon after starting, with nothing heard yet, is the
// recogniser dropping out, not the student staying quiet.
const BOUNCE_MS = 1500;

/**
 * Partial results as they come, the last of them as the final answer when
 * listening stops, and the same error codes the web listener reports so the
 * interview page needs no other branch.
 *
 * Each start() is a listening of its own: its listeners, timers and callbacks
 * end with it, and nothing from an earlier one can reach it. The page's "try
 * again" stops and starts in the same tick, and before this the stop's
 * fallback timer (1.2 s) landed in the new listening and ended it with
 * nothing heard: every retry on the phone died 1.2 s in. Like the web
 * listener, a clean end always reports what was heard, the empty string
 * included, so the page always gets its turn back.
 */
const createNativeListener = () => {
    let session = null;   // the listening in progress, until it ends
    const nativeStop = () => loadStt().then(({ SpeechRecognition }) => SpeechRecognition.stop()).catch(() => {});
    return {
        supported: true,
        async start({ onInterim, onFinal, onEnd, onError } = {}) {
            const t0 = Date.now();
            voiceLog('mic: asked to listen');
            // The listening before this one, if still open, is over for the page.
            // The recogniser's last word about it, should it still come, arrives
            // before this start is answered and is ignored below.
            const prev = session;
            if (prev && !prev.done) { voiceLog('mic: earlier listening superseded'); prev.muted = true; prev.end(); }
            const me = { done: false, stopped: false, muted: false, retried: false, startedAt: 0, speechEnded: false, last: '', lastResultAt: 0, longPauses: 0, pauseMs: 0, handles: [], timers: new Set() };
            session = me;
            const after = (fn, ms) => { const t = setTimeout(() => { me.timers.delete(t); fn(); }, ms); me.timers.add(t); return t; };
            const cb = (fn, ...args) => { if (!me.muted) fn?.(...args); };
            me.end = () => {
                if (me.done) return false;
                me.done = true;
                me.timers.forEach(clearTimeout); me.timers.clear();
                me.handles.forEach((h) => h.then?.((x) => x.remove?.()) ?? h.remove?.()); me.handles = [];
                if (session === me) session = null;
                return true;
            };
            const metrics = () => ({ durationMs: Math.max(0, (me.lastResultAt || me.startedAt) - me.startedAt), longPauses: me.longPauses, pauseMs: me.pauseMs });
            // The clean end: what was heard is the answer, as the web listener reports it.
            me.finish = () => {
                if (!me.end()) return;
                voiceLog(me.last ? `mic: final "${me.last.slice(0, 40)}"` : 'mic: finished with nothing heard');
                cb(onFinal, me.last, metrics()); cb(onEnd);
            };
            me.fail = (code) => { if (!me.end()) return; cb(onError, code); cb(onEnd); };
            me.stop = () => {
                if (me.stopped) return;
                me.stopped = true;
                nativeStop();
                // Should the phone stay silent about the stop, the page gets its answer anyway.
                after(me.finish, 1200);
            };
            try {
                let rec;
                try { ({ SpeechRecognition: rec } = await loadStt()); voiceLog(`mic: plugin loaded (${since(t0)})`); } catch (e) {
                    voiceLog(`mic: plugin missing (${e?.message || e})`); me.fail('service-not-allowed'); return;
                }
                const { available } = await withTimeout(rec.available(), 6000, 'the recogniser').catch((e) => { voiceLog(`mic: available() failed: ${e?.message || e}`); return { available: false }; });
                voiceLog(`mic: recogniser ${available ? 'available' : 'NOT available'} (${since(t0)})`);
                if (!available) { me.fail('service-not-allowed'); return; }
                const perm = await withTimeout(rec.requestPermissions(), 90000, 'the microphone permission').catch((e) => { voiceLog(`mic: permission call failed: ${e?.message || e}`); return { speechRecognition: 'denied' }; });
                voiceLog(`mic: permission ${perm.speechRecognition} (${since(t0)})`);
                if (perm.speechRecognition !== 'granted') { me.fail('not-allowed'); return; }
                // Stopped or superseded while the phone was being asked: nothing to start.
                if (me.done) return;
                if (me.stopped) { me.finish(); return; }
                const opts = { partialResults: true, popup: false, maxResults: 3 };
                let language = STT_LANGUAGE;
                const begin = async () => {
                    const t1 = Date.now();
                    try {
                        try {
                            voiceLog(`mic: starting (${language || 'phone default'})`);
                            await withTimeout(rec.start({ ...opts, ...(language ? { language } : {}) }), 8000, 'listening');
                        } catch (e) {
                            if (!language) throw e;
                            // A phone without Indian English gets one more try in its own language.
                            voiceLog(`mic: start (${language}) failed after ${since(t1)}: ${e?.message || e}; trying the phone's default`);
                            language = '';
                            await withTimeout(rec.start(opts), 8000, 'listening');
                        }
                        if (me.done) return;
                        me.startedAt = Date.now();
                        voiceLog(`mic: started (${since(t0)})`);
                    } catch (e) {
                        voiceLog(`mic: start FAILED (${e?.message || e})`);
                        me.fail(`native:${e?.message || e}`);
                    }
                };
                me.handles.push(rec.addListener('partialResults', ({ matches }) => {
                    if (me.done || !me.startedAt) return;
                    const text = matches?.[0] || '';
                    if (text) {
                        const now = Date.now(); const gap = now - me.lastResultAt;
                        if (me.lastResultAt && gap > 2500) { me.longPauses += 1; me.pauseMs += gap; }
                        me.lastResultAt = now; me.last = text;
                        cb(onInterim, text); voiceLog(`mic: heard "${text.slice(0, 40)}"`);
                    }
                    // After the end of speech the recogniser sends its final transcript: that is the answer.
                    if (me.speechEnded && text) me.finish();
                }));
                // The recogniser says 'stopped' at the end of speech and sends its
                // final, better transcript a moment later; so a short wait, then done.
                me.handles.push(rec.addListener('listeningState', ({ status, error, code: nativeCode }) => {
                    voiceLog(`mic: state ${status}${error ? ` (${error}${nativeCode != null ? `, code ${nativeCode}` : ''})` : ''}`);
                    // Anything before this start was answered is about the listening before it.
                    if (me.done || !me.startedAt || status !== 'stopped') return;
                    if (!error) { me.speechEnded = true; after(me.finish, 2500); return; }
                    // The recogniser's own reason (see native-plugins/speech-recognition), as the page's codes.
                    const code = /permission/i.test(error) ? 'not-allowed' : /network/i.test(error) ? 'network' : /no match|no speech|timeout/i.test(error) ? 'no-speech' : /audio/i.test(error) ? 'audio-capture' : `native:${error}${nativeCode != null ? ` [${nativeCode}]` : ''}`;
                    // Some phones drop the recogniser the moment it starts, now and
                    // then, after a quick stop-and-start; once more usually holds.
                    const bounced = !me.stopped && !me.last && !me.retried && Date.now() - me.startedAt < BOUNCE_MS && !['not-allowed', 'service-not-allowed', 'audio-capture', 'network'].includes(code);
                    if (bounced) {
                        me.retried = true; me.startedAt = 0;
                        voiceLog('mic: dropped out right after starting; trying once more');
                        after(() => { begin(); }, 400);
                        return;
                    }
                    if (code === 'no-speech') me.finish(); else me.fail(code);
                }));
                // Errors after start (no match, a timeout) arrive silently: a cap on
                // how long one answer may take keeps the interview moving.
                after(() => { nativeStop(); after(me.finish, 500); }, 45000);
                await begin();
            } catch (e) {
                voiceLog(`mic: CRASHED after ${since(t0)}: ${e?.message || e}`);
                me.fail(`native:${e?.message || e}`);
            }
        },
        stop() {
            const s = session;
            if (!s || s.done) { voiceLog('mic: stop asked (nothing listening)'); nativeStop(); return; }
            voiceLog('mic: stop asked');
            s.stop();
        }
    };
};

export const listenerErrorMessage = (code) => (typeof code === 'string' && code.startsWith('native:') ? `Speech recognition stopped on this phone: ${code.slice(7)}` : ({
    'not-allowed': 'Microphone access was blocked. Allow the microphone in your browser, or type your answer instead.',
    'service-not-allowed': 'Speech recognition is not available in this browser. Type your answer instead.',
    'audio-capture': 'No microphone was found. Plug one in, or type your answer instead.',
    'no-speech': 'I did not catch anything. Tap the mic and try again, or type your answer.',
    network: 'Speech recognition needs an internet connection. Check your connection, or type your answer.',
    aborted: ''
}[code] ?? 'Speech recognition stopped unexpectedly. Try again, or type your answer.'));

/* ── The browser's own recognition ────────────────────────────────────── */

export const createListener = () => {
    if (NATIVE) return createNativeListener();
    let rec = null; let stopped = false;
    return {
        supported: !!Recognition,
        /** Start recognising; resolves nothing — everything arrives through the callbacks. */
        start({ onInterim, onFinal, onEnd, onError, silenceMs = 6000, maxMs = 180000 } = {}) {
            if (!Recognition) { onError?.('service-not-allowed'); return; }
            this.stop(); stopped = false;
            const r = new Recognition(); rec = r;
            r.lang = 'en-IN'; r.interimResults = true; r.continuous = true; r.maxAlternatives = 1;
            const t0 = Date.now(); let lastResultAt = t0; let finalText = ''; let longPauses = 0; let pauseMs = 0; let silenceTimer = null; let maxTimer = null; let gotSpeech = false;
            const armSilence = () => { clearTimeout(silenceTimer); silenceTimer = setTimeout(() => { if (gotSpeech) r.stop(); }, silenceMs); };
            const metrics = () => ({ durationMs: Math.max(0, lastResultAt - t0), longPauses, pauseMs });
            r.onresult = (ev) => {
                const now = Date.now(); const gap = now - lastResultAt;
                if (gotSpeech && gap > 2500) { longPauses += 1; pauseMs += gap; }
                lastResultAt = now; gotSpeech = true;
                let interim = '';
                for (let i = ev.resultIndex; i < ev.results.length; i++) { const t = ev.results[i][0].transcript; if (ev.results[i].isFinal) finalText += `${t} `; else interim += t; }
                onInterim?.((finalText + interim).trim()); armSilence();
            };
            r.onerror = (e) => { if (e.error === 'no-speech' && gotSpeech) return; onError?.(e.error); };
            r.onend = () => { clearTimeout(silenceTimer); clearTimeout(maxTimer); if (rec === r) rec = null; onFinal?.(finalText.trim(), metrics()); onEnd?.(); };
            try { r.start(); armSilence(); maxTimer = setTimeout(() => { if (rec === r) r.stop(); }, maxMs); } catch { clearTimeout(silenceTimer); onError?.('aborted'); }
        },
        stop() { stopped = true; const r = rec; rec = null; try { r?.stop(); } catch { /* not running */ } return stopped; }
    };
};

/** Ask for the microphone up front, so the first question is not interrupted by the permission prompt. */
export const requestMicrophone = async () => {
    if (NATIVE) {
        // The phone's own recogniser asks for the microphone; the web view's
        // getUserMedia is not the gate here. A phone that does not answer is
        // not allowed to hold the start button: the interview goes on and the
        // recogniser reports the real answer when listening begins.
        const t0 = Date.now();
        try {
            const { SpeechRecognition } = await loadStt();
            const { available } = await withTimeout(SpeechRecognition.available(), 6000, 'the recogniser');
            if (!available) { voiceLog('start: no recogniser on this phone'); return { ok: false, code: 'service-not-allowed' }; }
            const perm = await withTimeout(SpeechRecognition.requestPermissions(), 90000, 'the microphone permission');
            voiceLog(`start: microphone permission ${perm.speechRecognition} (${since(t0)})`);
            return perm.speechRecognition === 'granted' ? { ok: true } : { ok: false, code: 'not-allowed' };
        } catch (e) {
            voiceLog(`start: microphone check failed after ${since(t0)}: ${e?.message || e}`);
            return { ok: true, undecided: true };
        }
    }
    if (!navigator.mediaDevices?.getUserMedia) return { ok: false, code: 'audio-capture' };
    // A permission prompt left unanswered must not hold the interview forever:
    // after 12 s we carry on, and the recogniser reports the real answer later.
    let timer;
    const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve({ ok: true, undecided: true }), 12000); });
    const ask = navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => { stream.getTracks().forEach((t) => t.stop()); return { ok: true }; })
        .catch((e) => ({ ok: false, code: e?.name === 'NotAllowedError' ? 'not-allowed' : e?.name === 'NotFoundError' ? 'audio-capture' : 'aborted' }))
        .finally(() => clearTimeout(timer));
    return Promise.race([ask, timeout]);
};

/* ── Diagnostics inside the app ───────────────────────────────────────── */

/**
 * What the phone's speech engines say about themselves, for the status line
 * the interview shows inside the app while voice is being made to work there.
 */
export const voiceDiagnostics = async () => {
    if (!NATIVE) return '';
    const bits = [];
    const t0 = Date.now();
    try {
        const { TextToSpeech } = await loadTts();
        let langs = null; let err = '';
        for (let i = 0; i < 3 && !langs; i++) {
            try { ({ languages: langs = [] } = await withTimeout(TextToSpeech.getSupportedLanguages(), 4000, 'the speech engine')); } catch (e) { err = e?.message || String(e); await new Promise((r) => setTimeout(r, 500)); }
        }
        const voices = langs ? await withTimeout(TextToSpeech.getSupportedVoices(), 4000, 'voices').then(({ voices: v = [] }) => v.length).catch(() => '?') : '?';
        const en = (langs || []).filter((l) => String(l).toLowerCase().startsWith('en'));
        bits.push(langs ? `voice: ready, ${langs.length} languages (${en.slice(0, 3).join(', ') || 'no English'}), ${voices} voices` : `voice: not ready (${err})`);
    } catch (e) {
        bits.push(`voice: plugin missing (${e?.message || e})`);
    }
    try {
        const { SpeechRecognition } = await loadStt();
        const { available } = await withTimeout(SpeechRecognition.available(), 6000, 'the recogniser');
        const perm = await withTimeout(SpeechRecognition.checkPermissions(), 4000, 'permissions').catch(() => ({ speechRecognition: '?' }));
        bits.push(`mic: ${available ? 'recogniser available' : 'NO recogniser'}, permission ${perm.speechRecognition}`);
    } catch (e) {
        bits.push(`mic: plugin missing (${e?.message || e})`);
    }
    voiceLog(`diagnostics done (${since(t0)}): ${bits.join(' · ')}`);
    return bits.join(' · ');
};

/**
 * For the "Test voice and mic" button inside the app. First the plugins as
 * they are, with no wrapping, so a plugin that has stopped answering shows
 * up by name; then the same speaker and listener the interview uses. Every
 * step is logged with its timing, and a failure in one step never hides the
 * next.
 */
const probe = async (label, work, ms) => {
    const t0 = Date.now();
    try { const out = await withTimeout(work(), ms, label); voiceLog(`test: ${label} ok (${since(t0)})${out ? ` ${out}` : ''}`); } catch (e) { voiceLog(`test: ${label} FAILED after ${since(t0)}: ${e?.message || e}`); }
};
export const voiceSelfTest = async () => {
    if (!NATIVE) return;
    voiceLog('test: begin');
    try {
        let tts = null; let rec = null;
        await probe('voice plugin load', async () => { ({ TextToSpeech: tts } = await loadTts()); }, 9000);
        if (tts) {
            await probe('raw languages', () => tts.getSupportedLanguages().then(({ languages = [] }) => `${languages.length} languages`), 5000);
            await probe('raw speak', () => tts.speak({ text: 'Hello.', lang: 'en-US', rate: 1, pitch: 1, volume: 1 }), 8000);
        }
        await probe('mic plugin load', async () => { ({ SpeechRecognition: rec } = await loadStt()); }, 9000);
        if (rec) await probe('raw available', () => rec.available().then(({ available }) => `available=${available}`), 5000);
        const speaker = createNativeSpeaker();
        await speaker.speak('Testing the voice. One, two, three.', { onError: (why) => voiceLog(`test: voice error: ${why}`) });
        voiceLog('test: voice step finished');
        const listener = createNativeListener();
        await new Promise((resolve) => {
            let settled = false;
            const end = () => { if (!settled) { settled = true; resolve(); } };
            listener.start({ onInterim: () => {}, onFinal: () => end(), onError: (code) => { voiceLog(`test: mic error ${code}`); end(); }, onEnd: end });
            setTimeout(() => { listener.stop(); }, 5000);
            setTimeout(end, 8000);
        });
    } catch (e) {
        voiceLog(`test: CRASHED: ${e?.message || e}`);
    }
    voiceLog('test: end');
};
