/**
 * Record yourself speaking, with the browser's own microphone recording
 * (MediaRecorder), and play it back. The recording stays on this device — it
 * is not uploaded and nothing scores the pronunciation; the student listens
 * and checks themselves against the checklist.
 */
import { useEffect, useRef, useState } from 'react';
import { Mic, Square, RotateCcw, AlertCircle } from 'lucide-react';
import { COLORS } from '../meta';

const MAX_SECONDS = 120;
const supported = () => typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined';

export default function VoiceRecorder({ onRecorded, disabled = false }) {
    const [state, setState] = useState('idle');      // idle | recording | done
    const [url, setUrl] = useState('');
    const [seconds, setSeconds] = useState(0);
    const [error, setError] = useState('');
    const rec = useRef(null);
    const stream = useRef(null);
    const timer = useRef(null);
    const chunks = useRef([]);

    const release = () => { clearInterval(timer.current); stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
    useEffect(() => () => { release(); }, []);
    useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

    const start = async () => {
        setError('');
        if (!supported()) { setError('This browser cannot record audio. Try Chrome, Edge or Safari, or practise speaking aloud and use the checklist.'); return; }
        try {
            stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
            setError(e?.name === 'NotAllowedError' ? 'The microphone is blocked. Allow it in your browser\'s settings for this site, then try again.' : 'No microphone was found. Connect one, or practise aloud and use the checklist.');
            return;
        }
        chunks.current = [];
        const r = new MediaRecorder(stream.current);
        rec.current = r;
        r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
        r.onstop = () => {
            release();
            const blob = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' });
            setUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
            setState('done');
            onRecorded?.();
        };
        r.start();
        setSeconds(0); setState('recording');
        timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    };
    const stop = () => { if (rec.current?.state === 'recording') rec.current.stop(); };
    // The time limit: stop on its own.
    useEffect(() => { if (seconds >= MAX_SECONDS && rec.current?.state === 'recording') rec.current.stop(); }, [seconds]);
    const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    const recording = state === 'recording';
    const c = recording ? COLORS.red : COLORS.blue;

    return (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-[#E5E5E5] p-4" data-recorder={state}>
            <button type="button" onClick={recording ? stop : start} disabled={disabled}
                aria-label={recording ? 'Stop recording' : state === 'done' ? 'Record again' : 'Start recording'}
                className={`lingo-btn flex h-20 w-20 items-center justify-center !rounded-full !border-b-[6px] ${recording ? 'animate-pulse' : ''}`}
                style={{ background: c.face, borderColor: c.edge, color: '#fff' }}>
                {recording ? <Square size={28} fill="currentColor" /> : state === 'done' ? <RotateCcw size={30} strokeWidth={2.5} /> : <Mic size={34} strokeWidth={2.5} />}
            </button>
            <p className="text-[15px] font-extrabold" style={{ color: recording ? COLORS.red.ink : '#777' }} aria-live="polite">
                {recording ? `Recording… ${mmss} — tap to stop` : state === 'done' ? 'Tap to record again' : 'Tap the microphone and speak'}
            </p>
            {state === 'done' && url && (
                <div className="w-full">
                    <p className="mb-1 text-center text-xs font-extrabold uppercase tracking-wider text-[#AFAFAF]">Listen to yourself</p>
                    <audio controls src={url} className="w-full" data-playback />
                </div>
            )}
            {state === 'idle' && !error && <p className="text-center text-xs font-semibold text-[#AFAFAF]">Your recording stays on this device. Up to {MAX_SECONDS / 60} minutes.</p>}
            {error && <p className="flex items-start gap-2 text-sm font-semibold" style={{ color: COLORS.red.ink }} role="alert"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}</p>}
        </div>
    );
}
