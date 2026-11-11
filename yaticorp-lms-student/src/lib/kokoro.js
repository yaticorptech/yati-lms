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

const generate = async (text, opts) => {
    const tts = await loadKokoro();
    const audio = await tts.generate(text, { voice: opts.voice || KOKORO_VOICE, speed: opts.speed || 1 });
    return audio.toBlob();
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
