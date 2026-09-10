/**
 * The voice mock interview. The interviewer speaks each question aloud, the
 * page listens, shows what it heard for the student to confirm, sends it,
 * and the interviewer follows up — a loop that ends in the report. Typing
 * is always one tap away, and takes over on its own when the browser has no
 * speech recognition or the microphone is refused.
 *
 *   /interview/mock/new   → the introduction (type, role, duration, why the mic)
 *   /interview/mock/:id   → the interview room
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link, useLocation, useSearchParams } from 'react-router-dom';
import { Mic, MicOff, Volume2, VolumeX, Square, Check, RotateCcw, Keyboard, Bot, User, ArrowLeft, ArrowRight, Sparkles, Clock, MessageSquareText, ChevronDown, ChevronUp, ShieldCheck, Send, Loader2, AlertTriangle, Briefcase, Code2 } from 'lucide-react';
import { interviewApi, TYPE_META, DURATION, STAGE_LABEL, ROLES, ROLE_OTHER, announceProgress } from './api';
import { BotScene, FeatureRow } from './IntroArt';
import { createSpeaker, createListener, requestMicrophone, listenerErrorMessage } from './speech';
import { Btn, ErrorBox, Analyzing } from '../learningbio/ui';

const mmss = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const PHASE = {
    speaking: { label: 'AI speaking', icon: Volume2, cls: 'bg-indigo-600 text-white' },
    listening: { label: 'Listening…', icon: Mic, cls: 'bg-rose-600 text-white' },
    review: { label: 'Your answer', icon: Check, cls: 'bg-slate-900 text-white' },
    analyzing: { label: 'Analyzing answer', icon: Sparkles, cls: 'bg-violet-600 text-white' },
    next: { label: 'Next question', icon: MessageSquareText, cls: 'bg-emerald-600 text-white' },
    done: { label: 'Interview complete', icon: Check, cls: 'bg-emerald-600 text-white' },
    idle: { label: 'Ready', icon: Mic, cls: 'bg-slate-700 text-white' }
};

/* ── Small pieces ─────────────────────────────────────────────────────── */
const Wave = ({ className = '' }) => (<span aria-hidden="true" className={`iv-wave flex h-6 items-center gap-[3px] ${className}`}>{Array.from({ length: 7 }).map((_, i) => <span key={i} />)}</span>);
const Dots = () => (<span aria-hidden="true" className="iv-dots inline-flex items-center gap-1"><span /><span /><span /></span>);
const Interviewer = ({ phase }) => (
    <div className="relative mx-auto flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32">
        {phase === 'speaking' && <span aria-hidden="true" className="iv-ring absolute inset-0 rounded-full text-indigo-400" />}
        <span className={`relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-600 to-indigo-700 text-white shadow-xl shadow-indigo-300 ring-8 ring-white sm:h-28 sm:w-28 ${phase === 'speaking' ? 'iv-breathe' : ''}`}>
            <Bot size={46} strokeWidth={1.7} />
        </span>
        <span className={`absolute -bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-white ${phase === 'speaking' ? 'bg-indigo-600' : phase === 'listening' ? 'bg-rose-500' : phase === 'analyzing' ? 'bg-violet-600' : 'bg-emerald-500'} text-white`}>
            {phase === 'speaking' ? <Volume2 size={14} /> : phase === 'listening' ? <Mic size={14} /> : phase === 'analyzing' ? <Sparkles size={14} /> : <Check size={14} />}
        </span>
    </div>
);
const StatusPill = ({ phase }) => { const p = PHASE[phase] || PHASE.idle; const Icon = p.icon; return (<span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider ${p.cls} animate-fade-in`} aria-live="polite">{phase === 'listening' ? <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> : <Icon size={13} />}{p.label}{phase === 'speaking' && <Wave className="ml-1 h-4 text-white" />}{phase === 'analyzing' && <Dots />}</span>); };

/* ── Introduction ─────────────────────────────────────────────────────── */
function Intro({ session, onStart, starting, error }) {
    const [params] = useSearchParams();
    const [type, setType] = useState(session?.type || params.get('type') || 'full');
    const incoming = session?.role || params.get('role') || '';
    // The list holds whatever role they arrived with, so it is never lost off
    // the end of it; anything else goes in the box behind "Other role…".
    const roleOptions = useMemo(
        () => (incoming && !ROLES.some((x) => x.toLowerCase() === incoming.toLowerCase()) ? [incoming, ...ROLES] : ROLES),
        [incoming]
    );
    const [role, setRole] = useState(incoming || ROLES[0]);
    const [customRole, setCustomRole] = useState('');
    const chosenRole = role === ROLE_OTHER ? customRole.trim() : role;

    const listenerSupported = useMemo(() => createListener().supported, []);
    const resuming = !!session;
    const answered = session ? session.turns.filter((t) => t.answer).length : 0;
    const meta = TYPE_META[type] || TYPE_META.full;

    const field = 'w-full appearance-none rounded-2xl border border-violet-100 bg-white py-3.5 pl-11 pr-10 text-sm font-semibold text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 disabled:bg-slate-50 disabled:text-slate-500';
    const label = 'text-[11px] font-black uppercase tracking-[0.16em] text-slate-500';
    const leading = 'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-violet-500';
    const chevron = 'pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400';

    return (
        <div className="mx-auto max-w-3xl pb-12 animate-fade-in">
            <div className="flex items-center justify-between gap-3">
                <Link to="/interview" className="group inline-flex items-center gap-2.5 text-base font-black text-slate-900">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors group-hover:border-violet-300 group-hover:text-violet-600"><ArrowLeft size={17} /></span>
                    Interview Ready
                </Link>
                <span className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white px-4 py-2 text-sm font-black text-violet-700 shadow-sm">
                    <Sparkles size={16} className="text-violet-500" /> Let&apos;s crack it!
                </span>
            </div>

            <div className="relative mt-3 overflow-hidden rounded-[1.75rem] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-violet-50/60 p-5 shadow-sm sm:p-8">
                {/* ── Welcome, with the interviewer beside it ──────── */}
                <div className="flex items-start gap-6">
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-600">AI Mock Interview</p>
                        <h1 className="mt-2 text-3xl font-black leading-tight text-slate-900 sm:text-[2.1rem]">
                            {resuming ? 'Welcome back to your mock interview!' : 'Welcome to your mock interview!'}
                        </h1>
                        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-slate-500">
                            The AI interviewer will ask you questions out loud, and you can answer naturally using your voice. It listens, understands your answer, and asks the next question — just like a real interviewer.
                        </p>
                    </div>
                    <BotScene className="hidden shrink-0 lg:block" />
                </div>

                <FeatureRow className="mt-6" />

                <hr className="my-6 border-violet-100" />

                {/* ── What kind of interview ───────────────────────── */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className={label}>Interview type</span>
                        <div className="relative mt-2">
                            <Briefcase size={17} className={leading} />
                            <select value={type} onChange={(e) => setType(e.target.value)} disabled={resuming} className={field}>
                                {Object.entries(TYPE_META).map(([id, m]) => <option key={id} value={id}>{m.label}</option>)}
                            </select>
                            <ChevronDown size={17} className={chevron} />
                        </div>
                    </label>
                    <div>
                        <span className={label}>Duration</span>
                        <div className="relative mt-2">
                            <Clock size={17} className={leading} />
                            <p className={`${field} pr-4`}>{DURATION[type]}</p>
                        </div>
                    </div>
                </div>

                <label className="mt-4 block">
                    <span className={label}>Job role</span>
                    <div className="relative mt-2">
                        <Code2 size={17} className={leading} />
                        <select value={roleOptions.includes(role) ? role : ROLE_OTHER} onChange={(e) => setRole(e.target.value)} disabled={resuming} className={field}>
                            {roleOptions.map((x) => <option key={x} value={x}>{x}</option>)}
                            <option value={ROLE_OTHER}>Other role…</option>
                        </select>
                        <ChevronDown size={17} className={chevron} />
                    </div>
                </label>
                {role === ROLE_OTHER && !resuming && (
                    <input autoFocus value={customRole} onChange={(e) => setCustomRole(e.target.value)} maxLength={80}
                        placeholder="Type the role you are preparing for"
                        className="mt-2 w-full rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25" />
                )}

                {/* ── Why the microphone ───────────────────────────── */}
                <div className="mt-6 flex flex-col gap-4 rounded-[1.4rem] bg-violet-100/50 px-5 py-4 sm:flex-row sm:items-center">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-violet-600 shadow-sm"><Mic size={21} /></span>
                    <div className="min-w-0 flex-1">
                        <p className="text-base font-black text-violet-800">Why we ask for your microphone</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-violet-900/70">
                            {listenerSupported
                                ? 'Your browser turns your spoken answers into text on the spot. Nothing is recorded or uploaded — only the text of your answer and how long it took are sent to the interviewer. You can type any answer instead at any time.'
                                : 'This browser cannot turn speech into text, so you will type your answers. The interviewer will still speak the questions aloud. Chrome, Edge or Safari support voice answers.'}
                        </p>
                    </div>
                    <p className="flex shrink-0 items-center gap-2 border-violet-200 text-xs font-semibold leading-tight text-violet-800 sm:border-l sm:pl-4">
                        <ShieldCheck size={18} className="shrink-0 text-violet-600" />
                        <span>Your privacy<br />is safe with us.</span>
                    </p>
                </div>

                {error && <div className="mt-4"><ErrorBox error={error} /></div>}

                <Btn tone="primary" icon={Mic} onClick={() => onStart({ type, role: chosenRole })} loading={starting}
                    className="mt-6 w-full !rounded-2xl !py-4 !text-base">
                    {starting ? 'Preparing your interviewer…' : resuming ? `Continue interview (${answered} answered)` : 'Start Interview'}
                    {!starting && <ArrowRight size={18} className="ml-1" />}
                </Btn>
                <p className="mt-3 text-center text-xs text-slate-500">{meta.hint}</p>
            </div>
        </div>
    );
}

/* ── The room ─────────────────────────────────────────────────────────── */
export default function MockInterview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [session, setSession] = useState(undefined);
    const [error, setError] = useState(null);
    const [live, setLive] = useState(false);
    const [starting, setStarting] = useState(false);
    const [phase, setPhase] = useState('idle');
    const [heard, setHeard] = useState('');          // what recognition has produced so far
    const [draft, setDraft] = useState('');          // the editable answer
    const [voiceMode, setVoiceMode] = useState(true);
    const [voiceNote, setVoiceNote] = useState('');  // why voice is off, when it is
    const [clarify, setClarify] = useState('');      // the interviewer could not use the last answer
    const [muted, setMuted] = useState(false);
    const [showTranscript, setShowTranscript] = useState(false);
    const [finishing, setFinishing] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const speaker = useMemo(() => createSpeaker(), []);
    const listener = useMemo(() => createListener(), []);
    const metricsRef = useRef(null);
    const spokenRef = useRef(new Set());              // turn indexes already spoken
    const mountedRef = useRef(true);
    const inputRef = useRef(null);

    const load = useCallback(() => interviewApi.session(id).then((s) => { setSession(s); setError(null); }).catch((e) => { setError(e); setSession(null); }), [id]);
    useEffect(() => { if (id !== 'new') load(); }, [id, load]);
    useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; speaker.stop(); listener.stop(); }; }, [speaker, listener]);
    useEffect(() => { if (!live) return undefined; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [live]);
    useEffect(() => { speaker.setMuted(muted); }, [muted, speaker]);

    const current = session?.turns?.[session.turns.length - 1];
    const waiting = !!(current && !current.answer && !session.closingMessage);
    const done = !!(session && (session.closingMessage || session.status !== 'active'));
    const answered = session ? session.turns.filter((t) => t.answer).length : 0;
    const elapsed = session ? now - new Date(session.startedAt).getTime() : 0;
    const plannedMs = (session?.plannedMinutes || 12) * 60_000;

    /* Listen for one answer. */
    const listen = useCallback(() => {
        if (!listener.supported || !mountedRef.current) return;
        setHeard(''); setDraft(''); metricsRef.current = null; setPhase('listening');
        listener.start({
            onInterim: (t) => setHeard(t),
            onFinal: (text, metrics) => { if (!mountedRef.current) return; metricsRef.current = metrics; setDraft(text); setPhase('review'); if (!text) setVoiceNote('I did not catch anything. Tap the mic to try again, or type your answer.'); },
            onError: (code) => { if (!mountedRef.current) return; const msg = listenerErrorMessage(code); if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(code)) { setVoiceMode(false); } if (msg) setVoiceNote(msg); setPhase('review'); setTimeout(() => inputRef.current?.focus(), 50); }
        });
    }, [listener]);

    /* Speak the open question, then listen. The interviewer's first question
       greets and welcomes on its own, so nothing is prepended to it — doing
       that made the welcome play twice before the first question. */
    const askAloud = useCallback(async (turn) => {
        if (!turn || spokenRef.current.has(turn.index)) return;
        spokenRef.current.add(turn.index);
        setVoiceNote(''); setHeard(''); setDraft('');
        await speaker.speak(turn.question, { onStart: () => mountedRef.current && setPhase('speaking') });
        if (!mountedRef.current) return;
        if (voiceMode && listener.supported) listen(); else { setPhase('review'); setTimeout(() => inputRef.current?.focus(), 50); }
    }, [speaker, listener, listen, voiceMode]);

    useEffect(() => {
        if (!live || !waiting || !current) return;
        askAloud(current);
    }, [live, waiting, current, askAloud]);

    /* Start: microphone first (with the reason already on screen), then the session. */
    const start = async ({ type, role }) => {
        setStarting(true); setError(null);
        try {
            if (listener.supported) { const mic = await requestMicrophone(); if (!mic.ok) { setVoiceMode(false); setVoiceNote(listenerErrorMessage(mic.code)); } }
            let s = session;
            if (!s) { s = await interviewApi.start(type, role); navigate(`/interview/mock/${s.id}`, { replace: true, state: { autostart: true } }); setSession(s); }
            setLive(true);
        } catch (e) { setError(e); } finally { setStarting(false); }
    };
    useEffect(() => { if (location.state?.autostart && session && !live) setLive(true); }, [location.state, session, live]);

    const tryAgain = () => { speaker.stop(); listener.stop(); setVoiceNote(''); if (voiceMode && listener.supported) listen(); else { setDraft(''); setPhase('review'); } };
    const stopListening = () => { listener.stop(); };
    const toggleMic = () => { if (phase === 'listening') stopListening(); else if (phase === 'review' || phase === 'idle') { if (!listener.supported) return; setVoiceMode(true); tryAgain(); } };

    const submit = async () => {
        const text = draft.trim();
        if (!text || !waiting || phase === 'analyzing') return;
        if (text.split(/\s+/).length < 2) { setVoiceNote('That answer is very short. Say a little more, or try again.'); return; }
        speaker.stop(); listener.stop(); setPhase('analyzing'); setError(null); setVoiceNote('');
        try {
            const usedVoice = !!metricsRef.current;
            const next = await interviewApi.answer(session.id, text, usedVoice ? 'voice' : 'text', usedVoice ? metricsRef.current : undefined);
            metricsRef.current = null; setDraft(''); setHeard('');
            setSession(next);
            // The interviewer could not use that: it says so aloud and the same
            // question stays open, rather than the interview moving on.
            if (next.clarification) {
                setClarify(next.clarification);
                await speaker.speak(next.clarification, { onStart: () => mountedRef.current && setPhase('speaking') });
                if (!mountedRef.current) return;
                if (voiceMode && listener.supported) listen(); else { setPhase('review'); setTimeout(() => inputRef.current?.focus(), 50); }
                return;
            }
            setClarify('');
            setPhase(next.done ? 'done' : 'next');
            if (next.done) speaker.speak(next.closingMessage || '');
        } catch (e) { setError(e); setPhase('review'); }
    };

    const finish = async () => {
        speaker.stop(); listener.stop(); setFinishing(true); setError(null);
        try {
            const out = await interviewApi.finish(session.id);
            if ((out.events || []).some((e) => e.kind === 'xp')) announceProgress();
            navigate(`/interview/report/${session.id}`, { replace: true });
        } catch (e) { setError(e); setFinishing(false); }
    };

    /* ── Render ─────────────────────────────────────────────────────── */
    if (id === 'new') return <Intro session={null} onStart={start} starting={starting} error={error} />;
    if (session === undefined) return <div className="mx-auto max-w-3xl pb-12"><Analyzing label="Setting up your interview…" /></div>;
    if (!session) return <div className="mx-auto max-w-3xl pb-12"><ErrorBox error={error} onRetry={load} /></div>;
    if (session.status === 'completed') { navigate(`/interview/report/${session.id}`, { replace: true }); return null; }
    if (!live) return <Intro session={session} onStart={start} starting={starting} error={error} />;

    const meta = TYPE_META[session.type] || TYPE_META.full;
    const qNumber = Math.min(session.turns.length, session.maxQuestions);
    const overTime = elapsed > plannedMs;
    const canSubmit = draft.trim().length > 0 && waiting && phase !== 'analyzing' && phase !== 'listening' && phase !== 'speaking';

    return (
        <div className="mx-auto max-w-4xl pb-10 animate-fade-in">
            {/* ── Top bar: type, question count, timer ───────────── */}
            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${meta.tone} p-4 text-white shadow-lg sm:p-5`}>
                <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-xl ring-1 ring-white/40" aria-hidden="true">{meta.emoji}</span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">{meta.label}{session.role ? ` · ${session.role}` : ''}</p>
                        <p className="truncate text-base font-black">{done ? 'Interview complete' : `Question ${qNumber} of ${session.maxQuestions}`}{current && !done ? <span className="font-semibold text-white/80"> · {STAGE_LABEL[current.stage] || current.stage}{current.isFollowUp ? ' · follow-up' : ''}</span> : null}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">Interview time</p>
                        <p className={`font-mono text-xl font-black tabular-nums leading-none ${overTime ? 'text-amber-200' : ''}`}>{mmss(elapsed)}</p>
                    </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white transition-[width] duration-700" style={{ width: `${session.progress}%` }} /></div>
                    <span className="text-[11px] font-bold text-white/90">{answered} answered</span>
                </div>
                {overTime && !done && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-100"><AlertTriangle size={13} /> You are past the planned {session.plannedMinutes} minutes. Finish this question, or end the interview when you are ready.</p>}
            </div>

            {/* ── Stage: interviewer, question, status ───────────── */}
            <div className="relative mt-4 overflow-hidden rounded-3xl border border-indigo-100 bg-white p-5 text-center shadow-sm sm:p-8">
                <span aria-hidden="true" className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-indigo-100/60 blur-3xl" />
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-violet-100/60 blur-3xl" />
                <div className="relative">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">AI Interviewer</p>
                    <div className="mt-3"><Interviewer phase={phase} /></div>
                    <div className="mt-4"><StatusPill phase={phase} /></div>
                    <div key={current?.index ?? 'end'} className="mx-auto mt-5 max-w-2xl animate-fade-in-up">
                        {done ? (
                            <p className="text-lg font-semibold leading-relaxed text-slate-800 sm:text-xl">“{session.closingMessage}”</p>
                        ) : (
                            <p className="text-lg font-semibold leading-relaxed text-slate-900 sm:text-2xl">“{current?.question}”</p>
                        )}
                    </div>
                    {!done && clarify && (
                        <div role="status" className="mx-auto mt-5 flex max-w-2xl items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left animate-fade-in-up">
                            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-600" />
                            <p className="text-sm font-semibold text-amber-900">{clarify}</p>
                        </div>
                    )}
                    {!done && phase === 'speaking' && <button type="button" onClick={() => { speaker.stop(); if (voiceMode && listener.supported) listen(); else setPhase('review'); }} className="mt-4 text-xs font-bold text-indigo-600 hover:underline">Skip to answering</button>}
                    {!done && phase === 'listening' && (
                        <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50/60 px-4 py-3 text-left">
                            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-rose-600"><span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" /></span> Listening — speak your answer</p>
                            <p className="mt-1 min-h-6 text-[15px] text-slate-800">{heard || <span className="text-slate-400">Start speaking whenever you are ready. I stop listening after a few seconds of silence.</span>}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Your answer ────────────────────────────────────── */}
            {!done && (phase === 'review' || phase === 'analyzing' || phase === 'next') && (
                <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 animate-fade-in-up">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Your answer</p>
                        {metricsRef.current ? <span className="text-[11px] font-semibold text-slate-400">Heard by voice · you can edit it</span> : <span className="text-[11px] font-semibold text-slate-400">{voiceMode && listener.supported ? 'Type, or tap the mic to speak' : 'Typing mode'}</span>}
                    </div>
                    <textarea ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} maxLength={4000} disabled={phase !== 'review'}
                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
                        placeholder={phase === 'analyzing' ? 'Analyzing your answer…' : 'Your spoken answer appears here. You can also type.'}
                        className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-[15px] leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:bg-slate-50" />
                    {voiceNote && <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-amber-700"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> {voiceNote}</p>}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                            {listener.supported && <Btn icon={RotateCcw} onClick={tryAgain} disabled={phase !== 'review'}>Try again</Btn>}
                            {!voiceMode && listener.supported && <Btn icon={Mic} onClick={() => { setVoiceMode(true); tryAgain(); }} disabled={phase !== 'review'}>Use voice</Btn>}
                            {voiceMode && listener.supported && <Btn icon={Keyboard} onClick={() => { setVoiceMode(false); setVoiceNote(''); setTimeout(() => inputRef.current?.focus(), 50); }} disabled={phase !== 'review'}>Type instead</Btn>}
                        </div>
                        <Btn tone="primary" icon={phase === 'analyzing' ? Loader2 : Send} onClick={submit} loading={phase === 'analyzing'} disabled={!canSubmit}>{phase === 'analyzing' ? 'Analyzing…' : 'Submit answer'}</Btn>
                    </div>
                </div>
            )}

            {error && <div className="mt-3"><ErrorBox error={error} /></div>}

            {/* ── Completed ──────────────────────────────────────── */}
            {done && (
                <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center animate-fade-in-up">
                    <span className="animate-pop-in mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-3xl text-white shadow-lg shadow-emerald-200">🎉</span>
                    <p className="mt-3 text-xl font-black text-emerald-900">Interview Completed</p>
                    <p className="mt-1 text-sm text-emerald-800">{answered} questions answered in {mmss(elapsed)}. Ready for your evaluation?</p>
                    <Btn tone="primary" icon={Sparkles} onClick={finish} loading={finishing} className="mt-4">{finishing ? 'Evaluating your answers…' : 'Get my Interview Report'}</Btn>
                </div>
            )}

            {/* ── Controls ───────────────────────────────────────── */}
            {!done && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <button type="button" onClick={() => setMuted((m) => !m)} aria-pressed={muted} aria-label={muted ? 'Unmute the interviewer' : 'Mute the interviewer'} title={muted ? 'Interviewer muted — questions are shown, not spoken' : 'Speaker on'}
                        className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${muted ? 'border-slate-300 bg-slate-100 text-slate-500' : 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>{muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
                    <button type="button" onClick={toggleMic} disabled={!listener.supported || phase === 'speaking' || phase === 'analyzing' || phase === 'next'} aria-pressed={phase === 'listening'} aria-label={phase === 'listening' ? 'Stop listening' : 'Answer by voice'} title={!listener.supported ? 'Voice answers are not supported in this browser' : phase === 'listening' ? 'Stop listening' : 'Speak your answer'}
                        className={`relative flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-all disabled:opacity-40 ${phase === 'listening' ? 'bg-rose-600 shadow-rose-300' : 'bg-gradient-to-br from-indigo-600 to-violet-600 shadow-indigo-300 hover:scale-105'}`}>
                        {phase === 'listening' && <span aria-hidden="true" className="iv-ring absolute inset-0 rounded-full text-rose-400" />}
                        {phase === 'listening' ? <Square size={22} fill="currentColor" /> : listener.supported ? <Mic size={26} /> : <MicOff size={26} />}
                    </button>
                    <Btn tone="danger" icon={Square} onClick={finish} loading={finishing} disabled={answered < 2} title={answered < 2 ? 'Answer at least two questions first' : 'End and get your report'}>End Interview</Btn>
                    <button type="button" onClick={() => setShowTranscript((v) => !v)} aria-expanded={showTranscript} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><MessageSquareText size={14} /> Transcript {showTranscript ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                </div>
            )}

            {/* ── Transcript ─────────────────────────────────────── */}
            {showTranscript && (
                <div className="mt-4 space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm animate-fade-in-up sm:p-5" aria-label="Live transcript">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Live transcript</p>
                    {session.turns.map((t) => (
                        <div key={t.index} className="space-y-2">
                            <div className="flex items-start gap-2.5"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white"><Bot size={14} /></span><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI{t.isFollowUp ? ' · follow-up' : ''}</p><p className="text-sm text-slate-800">“{t.question}”</p></div></div>
                            {t.answer && <div className="flex items-start gap-2.5 pl-6"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700"><User size={14} /></span><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">You{t.inputMode === 'voice' ? ' · spoken' : ''}</p><p className="text-sm text-slate-700">“{t.answer}”</p></div></div>}
                        </div>
                    ))}
                    {session.closingMessage && <p className="text-sm text-emerald-800">“{session.closingMessage}”</p>}
                </div>
            )}
        </div>
    );
}
