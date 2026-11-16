/**
 * Kokoro-82M made off the page (2026-11-12, the user's "Page Unresponsive": the model ran on the page itself, and
 * while a unit's English audio was made — hundreds of clips — the page could not answer a tap). Here, in a worker,
 * it loads and speaks one clip at a time; the page only sends the text and gets the WAV back. The model is the same:
 * the 8-bit Kokoro (~80 MB) from the Hugging Face Hub, kept by transformers.js in the browser's Cache Storage.
 *
 * In:  { id, type: 'load' } | { id, type: 'speak', text, voice, speed }
 * Out: { type: 'progress', value } (0..1, while the model downloads) | { id, type: 'ready' } |
 *      { id, type: 'done', blob } | { id, type: 'error', message }
 */
import { KokoroTTS } from 'kokoro-js';

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const VOICE = 'af_heart'; // the model's best-rated voice

let ttsP = null;
const load = () => {
    if (!ttsP) {
        const files = new Map();
        const progress_callback = (p) => {
            if (p?.status !== 'progress' || !p.total) return;
            files.set(p.file, [p.loaded, p.total]);
            let l = 0, t = 0;
            for (const [a, b] of files.values()) { l += a; t += b; }
            self.postMessage({ type: 'progress', value: t ? l / t : 0 });
        };
        // WASM + 8-bit: the path that works in every browser and the app's web view.
        ttsP = KokoroTTS.from_pretrained(MODEL, { dtype: 'q8', device: 'wasm', progress_callback });
        ttsP.catch(() => { ttsP = null; }); // tried again next time
    }
    return ttsP;
};

const failed = (id, e) => self.postMessage({ id, type: 'error', message: String(e?.message || e || 'Kokoro failed') });

// One clip at a time: an ONNX session cannot run two at once.
let chain = Promise.resolve();
self.onmessage = (event) => {
    const { id, type, text, voice, speed } = event.data || {};
    if (type === 'load') {
        load().then(() => self.postMessage({ id, type: 'ready' }), (e) => failed(id, e));
        return;
    }
    if (type !== 'speak') return;
    chain = chain.then(async () => {
        try {
            const tts = await load();
            const audio = await tts.generate(String(text || ''), { voice: voice || VOICE, speed: speed || 1 });
            self.postMessage({ id, type: 'done', blob: audio.toBlob() });
        } catch (e) { failed(id, e); }
    });
};
