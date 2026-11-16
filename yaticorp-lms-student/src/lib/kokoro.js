/**
 * Kokoro-82M, run in the browser (kokoro-js on transformers.js / ONNX Runtime Web).
 * The 8-bit model (~80 MB) is downloaded from the Hugging Face Hub once and kept by
 * transformers.js in the browser's Cache Storage, so every later visit loads it from the
 * device and speech is made locally, with nothing sent to our server.
 *
 * Since 2026-11-12 (the user's "Page Unresponsive") it runs in a worker (kokoro.worker.js), off the page: making a
 * unit's English audio — hundreds of clips — no longer freezes it. Same calls as before.
 *
 * English only (kokoro-js phonemises English): other languages keep their existing voice.
 */
export const KOKORO_VOICE = 'af_heart'; // the model's best-rated voice

let worker = null;
let modelP = null;
let ids = 0;
const waiting = new Map(); // id → { resolve, reject }
const progressFns = new Set();

const workerOf = () => {
    if (!worker) {
        worker = new Worker(new URL('./kokoro.worker.js', import.meta.url), { type: 'module' });
        worker.onmessage = (e) => {
            const m = e.data || {};
            if (m.type === 'progress') { progressFns.forEach((f) => f(m.value)); return; }
            const w = waiting.get(m.id);
            if (!w) return;
            waiting.delete(m.id);
            if (m.type === 'error') w.reject(new Error(m.message));
            else w.resolve(m.type === 'done' ? m.blob : true);
        };
        // The worker itself failed (it could not start, or crashed): every clip waiting on it fails, and the next
        // one starts a new worker.
        worker.onerror = (e) => {
            const err = new Error(e?.message || 'The Kokoro worker stopped');
            for (const w of waiting.values()) w.reject(err);
            waiting.clear();
            try { worker.terminate(); } catch { /* already gone */ }
            worker = null; modelP = null;
        };
    }
    return worker;
};
const ask = (msg) => new Promise((resolve, reject) => {
    const id = ++ids;
    waiting.set(id, { resolve, reject });
    workerOf().postMessage({ ...msg, id });
});

/** Load (or reuse) the model. `onProgress(fraction 0..1)` while it downloads the first time. */
export const loadKokoro = (onProgress) => {
    if (onProgress) progressFns.add(onProgress);
    if (!modelP) {
        modelP = ask({ type: 'load' }).then(() => { console.info('[kokoro] model ready'); return true; });
        modelP.catch((e) => { console.error('[kokoro] model failed to load:', e); modelP = null; }); // tried again next time
    }
    return modelP.finally(() => { if (onProgress) progressFns.delete(onProgress); });
};

/** Whether this browser can run the model at all (in a worker). */
export const kokoroSupported = () => typeof WebAssembly !== 'undefined' && typeof window !== 'undefined' && typeof Worker !== 'undefined';

/** Speak `text` into a WAV Blob. `opts`: { voice, speed }. A failed clip is tried once more. */
export const kokoroBlob = async (text, opts = {}) => {
    const t = String(text || '').trim();
    if (!t) throw new Error('empty text');
    const speak = () => ask({ type: 'speak', text: t, voice: opts.voice || KOKORO_VOICE, speed: opts.speed || 1 });
    try { return await speak(); } catch (e) {
        console.warn('[kokoro] retrying after error:', e, JSON.stringify(t));
        return speak();
    }
};
