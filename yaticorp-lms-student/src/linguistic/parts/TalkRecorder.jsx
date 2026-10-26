/**
 * Speak on a topic (asked 2026-10-24): the microphone for a talk. While the
 * student speaks, the browser's own speech-to-text writes their words down
 * (each pause ends a sentence), and the talk is recorded too, to play back.
 * The text is theirs to fix before it is checked; with no speech-to-text in
 * the browser (Firefox), they type what they said.
 *
 * The recording stays on this device. Speech-to-text is the browser's: in
 * Chrome it is done by Google's speech service, in Safari by Apple's — no
 * key, nothing paid, and nothing of ours sends the audio anywhere.
 */
import { useEffect, useRef, useState } from 'react';
import { Mic, Square, AlertCircle } from 'lucide-react';
import { COLORS } from '../meta';

const MAX_SECONDS = 180;
const Recognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition || null) : null;
const canRecord = () => typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined';
const QUESTION = /^(what|where|when|why|how|who|which|do|does|did|is|are|can|could|would|will|should)\b/i;

/** One stretch of speech as a sentence: a capital letter, and a full stop (or a question mark). */
const asSentence = (t) => {
    const s = String(t || '').trim().replace(/\s+/g, ' ');
    if (!s) return '';
    const cap = s[0].toUpperCase() + s.slice(1);
    return /[.!?]$/.test(cap) ? cap : `${cap}${QUESTION.test(cap) ? '?' : '.'}`;
};
const joined = (...parts) => parts.filter(Boolean).join(' ').trim();

/**
 * @param {string}   props.value     the talk's text so far
 * @param {Function} props.onChange  with the new text
 * @param {boolean}  props.disabled
 * @param {Function} props.onListening  whether it is listening now (the text is read-only then)
 */
export default function TalkRecorder({ value, onChange, disabled = false, onListening, T = (x) => x }) {
    const [state, setState] = useState('idle');   // idle | listening | done
    const [heard, setHeard] = useState('');        // words still being made out
    const [seconds, setSeconds] = useState(0);
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const recognition = useRef(null);
    const recorder = useRef(null);
    const stream = useRef(null);
    const timer = useRef(null);
    const elapsed = useRef(0);
    const chunks = useRef([]);
    const on = useRef(false);
    const before = useRef('');
    const said = useRef([]);

    const release = () => { clearInterval(timer.current); stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
    const stopAll = () => {
        on.current = false;
        try { recognition.current?.stop(); } catch { /* not started */ }
        if (recorder.current?.state === 'recording') recorder.current.stop(); else release();
        clearInterval(timer.current);
        setHeard(''); setState('done'); onListening?.(false);
    };
    useEffect(() => () => { on.current = false; try { recognition.current?.abort(); } catch { /* none */ } release(); }, []);
    useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

    const listen = () => {
        const r = new Recognition();
        r.lang = 'en-IN'; r.continuous = true; r.interimResults = true;
        r.onresult = (e) => {
            let open = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const res = e.results[i];
                if (res.isFinal) said.current.push(asSentence(res[0].transcript)); else open += res[0].transcript;
            }
            setHeard(open);
            onChange(joined(before.current, ...said.current));
        };
        r.onerror = (e) => {
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { setError('The microphone is blocked. Allow it in your browser\'s settings for this site, then try again — or type your talk below.'); stopAll(); }
            else if (e.error === 'network') { setError('Speech-to-text needs the internet. Type what you said below.'); stopAll(); }
            // The microphone is busy with the recording (some phones): give it to speech-to-text.
            else if (e.error === 'audio-capture' && recorder.current?.state === 'recording') recorder.current.stop();
        };
        // It stops by itself after a silence: carry on until the student stops.
        r.onend = () => { if (on.current) { try { r.start(); } catch { /* starting already */ } } };
        recognition.current = r;
        r.start();
    };

    const record = () => navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
        stream.current = s;
        chunks.current = [];
        const m = new MediaRecorder(s);
        recorder.current = m;
        m.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
        m.onstop = () => {
            release();
            if (!chunks.current.length) return;
            const blob = new Blob(chunks.current, { type: m.mimeType || 'audio/webm' });
            setUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
        };
        m.start();
    });

    const start = () => {
        setError('');
        if (!Recognition && !canRecord()) { setError('This browser cannot listen. Type your talk below.'); return; }
        before.current = value || '';
        said.current = [];
        on.current = true;
        elapsed.current = 0;
        setSeconds(0); setState('listening'); onListening?.(true);
        // The time limit: it stops by itself.
        timer.current = setInterval(() => { elapsed.current += 1; setSeconds(elapsed.current); if (elapsed.current >= MAX_SECONDS) stopAll(); }, 1000);
        if (Recognition) listen();
        if (canRecord()) {
            record().catch((e) => {
                if (Recognition) return; // speech-to-text still listens
                setError(e?.name === 'NotAllowedError' ? 'The microphone is blocked. Allow it in your browser\'s settings for this site, then try again — or type your talk below.' : 'No microphone was found. Type your talk below.');
                stopAll();
            });
        }
    };

    const listening = state === 'listening';
    const c = listening ? COLORS.red : COLORS.blue;
    const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    return (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-[#E5E5E5] p-4" data-talk-recorder={state}>
            <button type="button" onClick={listening ? stopAll : start} disabled={disabled}
                aria-label={listening ? 'Stop' : state === 'done' ? 'Speak more' : 'Start speaking'}
                className={`lingo-btn flex h-20 w-20 items-center justify-center !rounded-full !border-b-[6px] ${listening ? 'animate-pulse' : ''}`}
                style={{ background: c.face, borderColor: c.edge, color: '#fff' }} data-talk-mic>
                {listening ? <Square size={28} fill="currentColor" /> : <Mic size={34} strokeWidth={2.5} />}
            </button>
            <p className="text-center text-[15px] font-extrabold" style={{ color: listening ? COLORS.red.ink : '#777' }} aria-live="polite">
                {listening ? `${T('Listening…')} ${mmss} — ${T('tap to stop')}` : state === 'done' ? T('Tap to add more') : T('Tap the microphone and speak')}
            </p>
            {listening && heard && <p className="w-full rounded-xl bg-[#F7F7F7] px-3 py-2 text-[15px] font-semibold italic text-[#777]" data-heard>{heard}…</p>}
            {state === 'done' && url && (
                <div className="w-full">
                    <p className="mb-1 text-center text-xs font-extrabold uppercase tracking-wider text-[#AFAFAF]">{T('Listen to yourself')}</p>
                    <audio controls src={url} className="w-full" data-playback />
                </div>
            )}
            {!Recognition && !error && <p className="text-center text-xs font-semibold text-[#777]">{T('This browser cannot write down speech. Speak, listen back, then type what you said below.')}</p>}
            {state === 'idle' && Recognition && !error && <p className="text-center text-xs font-semibold text-[#AFAFAF]">{T('Your browser writes down what you say. The recording stays on this device.')}</p>}
            {error && <p className="flex items-start gap-2 text-sm font-semibold" style={{ color: COLORS.red.ink }} role="alert"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}</p>}
        </div>
    );
}
