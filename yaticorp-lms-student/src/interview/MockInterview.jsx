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
import { createPortal } from 'react-dom';
import { useNavigate, useParams, Link, useLocation, useSearchParams } from 'react-router-dom';
import { Mic, MicOff, Volume2, VolumeX, Square, Check, RotateCcw, Keyboard, Bot, User, ArrowLeft, ArrowRight, Sparkles, Clock, MessageSquareText, ChevronDown, ChevronUp, ShieldCheck, Send, Loader2, AlertTriangle, Briefcase, Code2 } from 'lucide-react';
import Dropdown from '../components/Dropdown';
import { interviewApi, TYPE_META, DURATION, STAGE_LABEL, ROLES, ROLE_OTHER, announceProgress } from './api';
import { BotScene, FeatureRow } from './IntroArt';
import { createSpeaker, createListener, requestMicrophone, listenerErrorMessage } from './speech';
import { Btn, ErrorBox, Analyzing } from '../learningbio/ui';
import { markReturn } from './scrollMemory';
import PriceTag from '../components/rewards/PriceTag';
import { Room, Bubble } from './InterviewRoom';
import { useHideLoop } from '../components/loopVisibility';

const mmss = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

/* ── Small pieces ─────────────────────────────────────────────────────── */

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

    const field = 'relative w-full appearance-none rounded-2xl border border-violet-100 bg-white py-3.5 pl-11 pr-10 text-sm font-semibold text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 disabled:bg-slate-50 disabled:text-slate-500';
    const label = 'text-[11px] font-black uppercase tracking-[0.16em] text-slate-500';
    const leading = 'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-violet-500';

    return (
        <div className="w-full pb-12 animate-fade-in">
            <div className="flex items-center justify-between gap-3">
                <Link to="/interview" onClick={markReturn} className="group inline-flex items-center gap-2.5 text-base font-black text-slate-900">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors group-hover:border-violet-300 group-hover:text-violet-600"><ArrowLeft size={17} /></span>
                    Interview
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
                        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-500">
                            The AI interviewer will ask you questions out loud, and you can answer naturally using your voice. It listens, understands your answer, and asks the next question — just like a real interviewer.
                        </p>
                    </div>
                    <BotScene className="hidden shrink-0 lg:block" />
                </div>

                <FeatureRow className="mt-6" />

                <hr className="my-6 border-violet-100" />

                {/* ── What kind of interview ───────────────────────── */}
                {/* Each type's length sits beside it in the list, so there is
                    no separate duration box that looked like a field. */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className={label}>Interview type</span>
                        <div className="relative mt-2">
                            <Briefcase size={17} className={leading} />
                            <Dropdown
                                label="Interview type" icon={Briefcase} disabled={resuming} className={field}
                                value={type} onChange={setType}
                                options={Object.entries(TYPE_META).map(([id, m]) => ({ value: id, label: m.label, hint: DURATION[id]?.replace('minutes', 'min') }))} />
                        </div>
                    </label>
                    <label className="block">
                        <span className={label}>Job role</span>
                        <div className="relative mt-2">
                            <Code2 size={17} className={leading} />
                            <Dropdown
                                label="Job role" icon={Code2} disabled={resuming} className={field}
                                value={roleOptions.includes(role) ? role : ROLE_OTHER} onChange={setRole}
                                options={[...roleOptions.map((x) => ({ value: x, label: x })), { value: ROLE_OTHER, label: 'Other role…' }]} />
                        </div>
                    </label>
                </div>
                {role === ROLE_OTHER && !resuming && (
                    <input autoFocus value={customRole} onChange={(e) => setCustomRole(e.target.value)} maxLength={80}
                        placeholder="Type the role you are preparing for"
                        className="mt-2 w-full rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25" />
                )}

                {/* ── Why the microphone ───────────────────────────── */}
                {/* Phones: a compact note — icon beside the title, the gist in
                    one sentence, privacy as a closing line. The full version
                    ran to eight lines of small print here. */}
                <div className="mt-5 rounded-2xl bg-violet-100/50 px-4 py-3.5 sm:hidden">
                    <p className="flex items-center gap-2.5 text-sm font-black text-violet-800">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-violet-600 shadow-sm"><Mic size={16} /></span>
                        Why we need your microphone
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-violet-900/70">
                        {listenerSupported
                            ? 'Your voice is turned into text on your device. Nothing is recorded, and you can type instead anytime.'
                            : 'This browser can’t turn speech into text, so you’ll type your answers. Chrome, Edge or Safari support voice.'}
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-violet-700">
                        <ShieldCheck size={13} className="shrink-0" /> Your privacy is safe with us.
                    </p>
                </div>
                <div className="mt-6 hidden flex-col gap-4 rounded-[1.4rem] bg-violet-100/50 px-5 py-4 sm:flex sm:flex-row sm:items-center">
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
                    {starting ? 'Preparing your interviewer…' : resuming ? `Continue interview (${answered} answered)` : <>Start Interview <PriceTag action="start_mock_interview" /></>}
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
    const [voiceNote, setVoiceNote] = useState('');  // this question's note: nothing heard, the voice could not play…
    // Why voice is off, when the browser or the microphone turned it off. It
    // stays for as long as voice is off: it used to share voiceNote, which each
    // new question clears, so a student who refused the microphone was put in
    // typing mode with no word of why.
    const [voiceOff, setVoiceOff] = useState('');
    const [clarify, setClarify] = useState('');      // the interviewer could not use the last answer
    const [muted, setMuted] = useState(false);
    const [showTranscript, setShowTranscript] = useState(false);
    const [finishing, setFinishing] = useState(false);
    // Loop, the mascot, stays off the interview itself: from Start to the
    // report, the student is listening and answering out loud, and a figure
    // walking about and talking pulls them out of it. It is there on the
    // introduction, to explain Start, and on the report.
    useHideLoop(live || starting);
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

    /* Listen for one answer. A recogniser that fails always ends straight
       after, with nothing heard. That end used to say "I did not catch
       anything" over the real reason (no connection, a blocked microphone),
       and kept the empty recording's timings, so the answer then typed was
       labelled "Heard by voice" and saved as spoken. Only words actually
       heard make an answer a spoken one. */
    const listen = useCallback(() => {
        if (!listener.supported || !mountedRef.current) return;
        setHeard(''); setDraft(''); metricsRef.current = null; setPhase('listening');
        let failed = false;
        listener.start({
            onInterim: (t) => setHeard(t),
            onFinal: (text, metrics) => {
                if (!mountedRef.current) return;
                metricsRef.current = text ? metrics : null;
                setDraft(text); setPhase('review');
                if (!text && !failed) setVoiceNote('I did not catch anything. Tap the mic to try again, or type your answer.');
            },
            onError: (code) => {
                if (!mountedRef.current) return;
                failed = true;
                const msg = listenerErrorMessage(code);
                if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(code)) { setVoiceMode(false); setVoiceOff(msg); }
                else if (msg) setVoiceNote(msg);
                setPhase('review'); setTimeout(() => inputRef.current?.focus(), 50);
            }
        });
    }, [listener]);

    /* Speak the open question, then listen. The interviewer's first question
       greets and welcomes on its own, so nothing is prepended to it — doing
       that made the welcome play twice before the first question. */
    const askAloud = useCallback(async (turn) => {
        if (!turn || spokenRef.current.has(turn.index)) return;
        spokenRef.current.add(turn.index);
        setVoiceNote(''); setHeard(''); setDraft('');
        await speaker.speak(turn.question, { onStart: () => mountedRef.current && setPhase('speaking'), onError: (why) => mountedRef.current && setVoiceNote(`The voice could not play on this phone: ${why}`) });
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
            if (listener.supported) { const mic = await requestMicrophone(); if (!mic.ok) { setVoiceMode(false); setVoiceOff(listenerErrorMessage(mic.code)); } }
            let s = session;
            if (!s) { s = await interviewApi.start(type, role); navigate(`/interview/mock/${s.id}`, { replace: true, state: { autostart: true } }); setSession(s); }
            setLive(true);
        } catch (e) { setError(e); } finally { setStarting(false); }
    };
    useEffect(() => { if (location.state?.autostart && session && !live) setLive(true); }, [location.state, session, live]);

    const tryAgain = () => { speaker.stop(); listener.stop(); setVoiceNote(''); if (voiceMode && listener.supported) listen(); else { setDraft(''); setPhase('review'); } };
    const stopListening = () => { listener.stop(); };
    /* Switch to voice and listen at once: `tryAgain` would still see the old voiceMode in this same tick. */
    const startVoice = () => { speaker.stop(); listener.stop(); setVoiceNote(''); setVoiceOff(''); setVoiceMode(true); listen(); };
    const toggleMic = () => { if (phase === 'listening') stopListening(); else if (phase === 'review' || phase === 'idle') { if (!listener.supported) return; startVoice(); } };

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
                await speaker.speak(next.clarification, { onStart: () => mountedRef.current && setPhase('speaking'), onError: (why) => mountedRef.current && setVoiceNote(`The voice could not play on this phone: ${why}`) });
                if (!mountedRef.current) return;
                if (voiceMode && listener.supported) listen(); else { setPhase('review'); setTimeout(() => inputRef.current?.focus(), 50); }
                return;
            }
            setClarify('');
            setPhase(next.done ? 'done' : 'next');
            if (next.done) speaker.speak(next.closingMessage || '');
        } catch (e) { setError(e); setPhase('review'); }
    };

    // Ending with fewer than two answers: no report can be made, so ask first, then leave (2026-10-27).
    const [askEnd, setAskEnd] = useState(false);
    const endInterview = () => { if (answered >= 2) finish(); else setAskEnd(true); };
    const leave = () => { speaker.stop(); listener.stop(); navigate('/interview'); };

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
        <div className="w-full pb-10 animate-fade-in">
            {/* ── Top bar: type, question count, timer ───────────── */}
            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${meta.tone} px-4 py-3 text-white shadow-lg sm:rounded-3xl sm:p-5`}>
                <div className="flex items-center gap-3">
                    <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-xl ring-1 ring-white/40 sm:flex" aria-hidden="true">{meta.emoji}</span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-white/80 sm:text-[11px] sm:tracking-[0.16em]">{meta.label}{session.role ? ` · ${session.role}` : ''}</p>
                        <p className="truncate text-sm font-black sm:text-base">{done ? 'Interview complete' : `Question ${qNumber} of ${session.maxQuestions}`}{current && !done ? <span className="hidden font-semibold text-white/80 sm:inline"> · {STAGE_LABEL[current.stage] || current.stage}{current.isFollowUp ? ' · follow-up' : ''}</span> : null}</p>
                    </div>
                    <div className="shrink-0 text-right">
                        <p className="hidden text-[10px] font-bold uppercase tracking-wider text-white/80 sm:block">Interview time</p>
                        <p className={`font-mono text-lg sm:text-xl font-black tabular-nums leading-none ${overTime ? 'text-amber-200' : ''}`}>{mmss(elapsed)}</p>
                    </div>
                </div>
                <div className="mt-2.5 flex items-center gap-3 sm:mt-3">
                    <div className="h-1 flex-1 sm:h-1.5 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white transition-[width] duration-700" style={{ width: `${session.progress}%` }} /></div>
                    <span className="shrink-0 text-[10px] font-bold text-white/90 sm:text-[11px]">{answered} answered</span>
                </div>
                {overTime && !done && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-100"><AlertTriangle size={13} /> You are past the planned {session.plannedMinutes} minutes. Finish this question, or end the interview when you are ready.</p>}
            </div>

            {/* ── The room on the left; the question, your answer and the mic on the right ── */}
            <div className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
                <div><Room phase={done ? 'done' : phase} /></div>
                <div className="min-w-0 space-y-4">
                    <Bubble talking={phase === 'speaking'}>
                    <div key={current?.index ?? 'end'} className="animate-fade-in-up">
                        {done ? (
                            <p className="text-[0.85rem] font-semibold leading-snug text-slate-800 sm:text-lg sm:leading-relaxed lg:text-xl">{session.closingMessage}</p>
                        ) : (
                            <p className="text-[0.95rem] font-bold leading-snug text-indigo-950 sm:text-lg sm:leading-relaxed lg:text-2xl">{current?.question}</p>
                        )}
                    </div>
                    {!done && clarify && (
                        <div role="status" className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left animate-fade-in-up">
                            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-600" />
                            <p className="text-sm font-semibold text-amber-900">{clarify}</p>
                        </div>
                    )}
                    {!done && phase === 'speaking' && <button type="button" onClick={() => { speaker.stop(); if (voiceMode && listener.supported) listen(); else setPhase('review'); }} className="mt-3 text-[0.7rem] font-bold text-indigo-600 hover:underline sm:mt-4 sm:text-xs">Skip to answering →</button>}
                    </Bubble>
                    {!done && phase === 'listening' && (
                        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-100 bg-rose-50/70 px-3.5 py-2.5 text-left animate-fade-in-up sm:px-4 sm:py-3">
                            <span className="relative mt-1 flex h-2.5 w-2.5 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" /></span>
                            <p className="min-w-0 text-sm leading-snug text-slate-800 sm:text-[15px]">{heard || <span className="text-slate-400">Listening… speak your answer.</span>}</p>
                        </div>
                    )}

                </div>
            </div>

            {/* ── Row two: your answer and the controls, across the full width ── */}
            <div className="mt-4 space-y-4">
            {/* ── Your answer ────────────────────────────────────── */}
            {!done && (phase === 'review' || phase === 'analyzing' || phase === 'next') && (
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 animate-fade-in-up">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Your answer</p>
                        {metricsRef.current ? <span className="text-[11px] font-semibold text-slate-400">Heard by voice · you can edit it</span> : <span className="text-[11px] font-semibold text-slate-400">{voiceMode && listener.supported ? 'Type, or tap the mic to speak' : 'Typing mode'}</span>}
                    </div>
                    <textarea ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} maxLength={4000} disabled={phase !== 'review'}
                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
                        placeholder={phase === 'analyzing' ? 'Analyzing your answer…' : 'Your spoken answer appears here. You can also type.'}
                        className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-[15px] leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:bg-slate-50" />
                    {!voiceMode && voiceOff && <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-amber-700"><MicOff size={13} className="mt-0.5 shrink-0" /> {voiceOff}</p>}
                    {voiceNote && <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-amber-700"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> {voiceNote}</p>}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                            {listener.supported && <Btn icon={RotateCcw} onClick={tryAgain} disabled={phase !== 'review'}>Try again</Btn>}
                            {!voiceMode && listener.supported && <Btn icon={Mic} onClick={startVoice} disabled={phase !== 'review'}>Use voice</Btn>}
                            {voiceMode && listener.supported && <Btn icon={Keyboard} onClick={() => { setVoiceMode(false); setVoiceNote(''); setTimeout(() => inputRef.current?.focus(), 50); }} disabled={phase !== 'review'}>Type instead</Btn>}
                        </div>
                        <Btn tone="primary" icon={phase === 'analyzing' ? Loader2 : Send} onClick={submit} loading={phase === 'analyzing'} disabled={!canSubmit}>{phase === 'analyzing' ? 'Analyzing…' : 'Submit answer'}</Btn>
                    </div>
                </div>
            )}

            {error && <div><ErrorBox error={error} /></div>}

            {/* ── Completed ──────────────────────────────────────── */}
            {done && (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center animate-fade-in-up">
                    <span className="animate-pop-in mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-3xl text-white shadow-lg shadow-emerald-200">🎉</span>
                    <p className="mt-3 text-xl font-black text-emerald-900">Interview Completed</p>
                    <p className="mt-1 text-sm text-emerald-800">{answered} questions answered in {mmss(elapsed)}. Ready for your evaluation?</p>
                    <Btn tone="primary" icon={Sparkles} onClick={finish} loading={finishing} className="mt-4">{finishing ? 'Evaluating your answers…' : 'Get my Interview Report'}</Btn>
                </div>
            )}

            {/* ── Controls ───────────────────────────────────────── */}
            {!done && (
                <div className="z-20 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur max-lg:sticky max-lg:bottom-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex-wrap sm:gap-3 sm:rounded-3xl sm:px-4 sm:py-3">
                    <button type="button" onClick={() => setMuted((m) => !m)} aria-pressed={muted} aria-label={muted ? 'Unmute the interviewer' : 'Mute the interviewer'} title={muted ? 'Interviewer muted — questions are shown, not spoken' : 'Speaker on'}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors sm:h-12 sm:w-12 ${muted ? 'border-slate-300 bg-slate-100 text-slate-500' : 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>{muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
                    <button type="button" onClick={toggleMic} disabled={!listener.supported || phase === 'speaking' || phase === 'analyzing' || phase === 'next'} aria-pressed={phase === 'listening'} aria-label={phase === 'listening' ? 'Stop listening' : 'Answer by voice'} title={!listener.supported ? 'Voice answers are not supported in this browser' : phase === 'listening' ? 'Stop listening' : 'Speak your answer'}
                        className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg transition-all disabled:opacity-40 sm:h-16 sm:w-16 ${phase === 'listening' ? 'bg-rose-600 shadow-rose-300' : 'bg-gradient-to-br from-indigo-600 to-violet-600 shadow-indigo-300 hover:scale-105'}`}>
                        {phase === 'listening' && <span aria-hidden="true" className="iv-ring absolute inset-0 rounded-full text-rose-400" />}
                        {phase === 'listening' ? <Square size={22} fill="currentColor" /> : listener.supported ? <Mic size={26} /> : <MicOff size={26} />}
                    </button>
                    <Btn tone="danger" icon={Square} onClick={endInterview} loading={finishing} className="shrink-0 !px-3 sm:!px-4" title={answered < 2 ? 'End now (a report needs two answers)' : 'End and get your report'}>End Interview</Btn>
                    <button type="button" onClick={() => setShowTranscript((v) => !v)} aria-expanded={showTranscript} aria-label="Transcript" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 sm:px-3"><MessageSquareText size={14} /> <span className="hidden sm:inline">Transcript</span> {showTranscript ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                </div>
            )}

            </div>

            {/* Ending with fewer than two answers: a popup over the page, on document.body
                (the page slides in with a transform, which would trap a fixed box inside it). */}
            {askEnd && !done && createPortal(
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="presentation"
                    onKeyDown={(e) => { if (e.key === 'Escape') setAskEnd(false); }}>
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-fade-in" onClick={() => setAskEnd(false)} aria-hidden="true" />
                    <div role="alertdialog" aria-modal="true" aria-labelledby="end-title" aria-describedby="end-text"
                        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white text-center shadow-2xl animate-scale-in">
                        <div className="p-6">
                            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600"><Square size={22} fill="currentColor" /></span>
                            <p id="end-title" className="mt-4 text-lg font-black text-slate-900">End the interview now?</p>
                            <p id="end-text" className="mt-1.5 text-sm leading-relaxed text-slate-500">
                                A report needs at least two answers{answered ? ` — you have ${answered}` : ''}. You can come back to this interview later.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50 p-4">
                            <Btn autoFocus onClick={() => setAskEnd(false)} className="w-full">Keep going</Btn>
                            <button type="button" onClick={leave} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-sm font-bold text-white shadow-md shadow-rose-500/25 transition-colors hover:bg-rose-700">End interview</button>
                        </div>
                    </div>
                </div>,
                document.body
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
