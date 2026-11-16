/**
 * Kokoro-82M, run in the browser (kokoro-js on transformers.js / ONNX Runtime Web).
 * The 8-bit model (~80 MB) is downloaded from the Hugging Face Hub once and kept by
 * transformers.js in the browser's Cache Storage, so every later visit loads it from the
 * device and speech is made locally, with nothing sent to our server.
 *
 * English only (kokoro-js phonemises English): other languages keep their existing voice.
 */
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
export const KOKORO_VOICE = 'af_heart'; // the model's best-rated voice

let modelP = null;
let chain = Promise.resolve(); // one generation at a time: an ONNX session cannot run two at once

/** Load (or reuse) the model. `onProgress(fraction 0..1)` while it downloads the first time. */
export const loadKokoro = (onProgress) => {
    if (!modelP) {
        modelP = (async () => {
            const { KokoroTTS } = await import('kokoro-js');
            const files = new Map();
            const progress_callback = (p) => {
                if (!onProgress || p?.status !== 'progress' || !p.total) return;
                files.set(p.file, [p.loaded, p.total]);
                let l = 0, t = 0;
                for (const [a, b] of files.values()) { l += a; t += b; }
                onProgress(t ? l / t : 0);
            };
            // WASM + 8-bit: the ~80 MB model, and the path that works in every browser and the app's web view.
            const tts = await KokoroTTS.from_pretrained(MODEL, { dtype: 'q8', device: 'wasm', progress_callback });
            console.info('[kokoro] model ready');
            return tts;
        })();
        modelP.catch((e) => { console.error('[kokoro] model failed to load:', e); modelP = null; }); // tried again next time
    }
    return modelP;
};

/** Whether this browser can run the model at all. */
export const kokoroSupported = () => typeof WebAssembly !== 'undefined' && typeof window !== 'undefined';

/*
 * The clips are made in a Web Worker (kokoro.worker.js, 2026-11-13): on the page's own thread every clip froze the
 * page ("Page Unresponsive"). Where a worker cannot start, the model runs here as before.
 */
let worker = null, workerFailed = false, nextId = 0;
const waiting = new Map();
const viaWorker = () => {
    if (workerFailed || typeof Worker === 'undefined') return null;
    if (!worker) {
        try {
            worker = new Worker(new URL('./kokoro.worker.js', import.meta.url), { type: 'module' });
            worker.onmessage = (e) => {
                const { id, blob, error } = e.data || {};
                const w = waiting.get(id);
                if (!w) return;
                waiting.delete(id);
                if (error) w.reject(new Error(error)); else w.resolve(blob);
            };
            worker.onerror = (e) => {
                // The worker could not start (an old browser): every clip waiting is made on the page instead.
                console.warn('[kokoro] worker failed, using the page:', e?.message);
                workerFailed = true; worker = null;
                for (const w of waiting.values()) w.fallback();
                waiting.clear();
            };
        } catch { workerFailed = true; return null; }
    }
    return worker;
};
const onPage = async (text, opts) => {
    const tts = await loadKokoro();
    const audio = await tts.generate(text, { voice: opts.voice || KOKORO_VOICE, speed: opts.speed || 1 });
    return audio.toBlob();
};
const generate = (text, opts) => {
    const w = viaWorker();
    if (!w) return onPage(text, opts);
    return new Promise((resolve, reject) => {
        const id = ++nextId;
        waiting.set(id, { resolve, reject, fallback: () => onPage(text, opts).then(resolve, reject) });
        w.postMessage({ id, text, voice: opts.voice || KOKORO_VOICE, speed: opts.speed || 1 });
    });
};

/** Speak `text` into a WAV Blob. `opts`: { voice, speed }. A failed clip is tried once more. */
export const kokoroBlob = (text, opts = {}) => {
    const t = String(text || '').trim();
    const job = chain.then(async () => {
        if (!t) throw new Error('empty text');
        try { return await generate(t, opts); } catch (e) {
            console.warn('[kokoro] retrying after error:', e, JSON.stringify(t));
            return generate(t, opts);
        }
    });
    chain = job.catch(() => {});
    return job;
};
