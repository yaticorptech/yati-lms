/**
 * Kokoro-82M in a Web Worker (2026-11-13: "Page Unresponsive" while a unit's English audio was being made). The
 * model ran on the page's own thread, so every clip froze the page — taps, Back and "Start now" did nothing until
 * it finished. Here it runs beside the page instead: the page only sends text and gets a WAV back.
 *
 * Messages in: { id, text, voice, speed }. Out: { id, blob } or { id, error }; and { progress } while the model
 * downloads the first time.
 */
import { KokoroTTS } from 'kokoro-js';

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
let model = null;

const load = () => {
    if (!model) {
        const files = new Map();
        model = KokoroTTS.from_pretrained(MODEL, {
            dtype: 'q8',
            device: 'wasm',
            progress_callback: (p) => {
                if (p?.status !== 'progress' || !p.total) return;
                files.set(p.file, [p.loaded, p.total]);
                let l = 0, t = 0;
                for (const [a, b] of files.values()) { l += a; t += b; }
                self.postMessage({ progress: t ? l / t : 0 });
            }
        });
        model.catch(() => { model = null; }); // tried again with the next clip
    }
    return model;
};

// One clip at a time: an ONNX session cannot run two at once.
let chain = Promise.resolve();
self.onmessage = (e) => {
    const { id, text, voice, speed } = e.data || {};
    chain = chain.then(async () => {
        try {
            const tts = await load();
            const audio = await tts.generate(text, { voice, speed: speed || 1 });
            self.postMessage({ id, blob: audio.toBlob() });
        } catch (err) {
            self.postMessage({ id, error: String(err?.message || err) });
        }
    });
};
