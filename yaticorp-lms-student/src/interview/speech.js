/**
 * Voice for the mock interview, behind two small interfaces so a hosted
 * speech service can replace the browser's later without touching the page:
 *   createSpeaker()  → { supported, speak(text, {onStart,onEnd}), stop(), setMuted(bool) }
 *   createListener() → { supported, start({onInterim,onFinal,onEnd,onError}), stop() }
 * Both use the Web Speech API today. Chrome cuts utterances longer than
 * ~15 s, so text is spoken sentence by sentence; recognition results carry no
 * word timings, so pace and pauses are estimated from result timings.
 */
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
const Recognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

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

export const listenerErrorMessage = (code) => ({
    'not-allowed': 'Microphone access was blocked. Allow the microphone in your browser, or type your answer instead.',
    'service-not-allowed': 'Speech recognition is not available in this browser. Type your answer instead.',
    'audio-capture': 'No microphone was found. Plug one in, or type your answer instead.',
    'no-speech': 'I did not catch anything. Tap the mic and try again, or type your answer.',
    network: 'Speech recognition needs an internet connection. Check your connection, or type your answer.',
    aborted: ''
}[code] ?? 'Speech recognition stopped unexpectedly. Try again, or type your answer.');

export const createListener = () => {
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
