/**
 * The live Quiz Arena. The page asks the server where the quiz is about once
 * a second; the server works it out from the clock (competitions/arena/
 * timeline.js), so every student sees the same question with the same time
 * left, and a student who reloads or reconnects lands exactly where the quiz
 * is. The countdown is drawn here between polls, corrected for how far this
 * device's clock is from the server's.
 *
 * waiting → round intro → question (answer once) → answer shown → … → finished
 *
 * The correct answer arrives only once a question has closed. Keys 1–4 or
 * A–D answer too.
 */
import CompetitionGuard from '../CompetitionGuard';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, Timer, Trophy, Sparkles, Image as ImageIcon, WifiOff } from 'lucide-react';
import { arenaApi, ROUND_NAMES, ROUND_BLURBS } from './api';
import client from '../../utils/api';
import { useHideLoop } from '../../components/loopVisibility';
import { PlaySkeleton } from '../Skeletons';
import useGoBack from '../../hooks/useGoBack';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function ArenaPlay() {
    const goBack = useGoBack();
    useHideLoop();
    const { id } = useParams();
    const [s, setS] = useState(null);
    const [fatal, setFatal] = useState('');
    const [offline, setOffline] = useState(false);
    const [picked, setPicked] = useState(null);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [now, setNow] = useState(Date.now());
    const skew = useRef(0);
    // The question's picture, fetched through the server (signed in): its real
    // address can name the answer, so the browser never sees it.
    // Loaded once each, and the next one ahead of time, so a picture question
    // shows its picture the moment it opens.
    const [pictures, setPictures] = useState({});
    const loading = useRef(new Set());
    const fetchPicture = useCallback((path) => {
        if (!path || loading.current.has(path)) return;
        loading.current.add(path);
        client.get(path, { responseType: 'blob' })
            .then((r) => setPictures((m) => ({ ...m, [path]: URL.createObjectURL(r.data) })))
            .catch(() => { loading.current.delete(path); });
    }, []);
    const imagePath = s?.question?.imagePath || null;
    const picture = imagePath ? pictures[imagePath] || null : null;
    useEffect(() => { fetchPicture(imagePath); }, [imagePath, fetchPicture]);
    const key = s ? `${s.stage}:${s.index ?? s.round ?? ''}` : '';

    const accept = useCallback((data) => { skew.current = data.serverNow - Date.now(); setS(data); setOffline(false); }, []);

    // Ask the server again the moment the current stage ends (so the next
    // question appears right away), and at least once a second. A single
    // slow or failed answer is retried at once; only repeated failures show
    // "Reconnecting".
    useEffect(() => {
        let alive = true; let timer = null; let fails = 0;
        const tick = () => arenaApi.live(id).then((d) => {
            if (!alive) return;
            fails = 0;
            accept(d);
            // Over: keep looking until the results are out, so they show here at once.
            if (d.stage === 'finished') { if (!d.resultsPublished) timer = setTimeout(tick, 5000); return; }
            const toEnd = d.endsAt ? d.endsAt - d.serverNow + 60 : 1000;
            timer = setTimeout(tick, d.stage === 'waiting' ? 3000 : Math.max(60, Math.min(1000, toEnd)));
        }).catch((e) => {
            if (!alive) return;
            if ([403, 404, 410].includes(e.status)) { setFatal(e.message); return; }
            fails += 1;
            if (fails >= 3) setOffline(true);
            timer = setTimeout(tick, fails < 3 ? 300 : 1500);
        });
        tick();
        return () => { alive = false; clearTimeout(timer); };
    }, [id, accept]);

    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(t); }, []);
    useEffect(() => { setPicked(null); setError(''); }, [key]);

    const serverNow = now + skew.current;
    const leftMs = s?.endsAt ? Math.max(0, s.endsAt - serverNow) : 0;
    const share = s?.endsAt ? leftMs / Math.max(1, s.endsAt - s.startedAt) : 0;
    const mineChoice = s?.mine?.choice ?? picked;
    const canAnswer = s?.stage === 'question' && mineChoice == null && leftMs > 0;

    // The next picture, a few seconds before its question opens.
    const nextPath = s?.nextImagePath || null;
    const soon = leftMs > 0 && leftMs <= 3500;
    useEffect(() => { if (soon) fetchPicture(nextPath); }, [soon, nextPath, fetchPicture]);

    const answer = useCallback((choice) => {
        if (!canAnswer) return;
        setPicked(choice); setError('');
        arenaApi.answer(id, s.index, choice).catch((e) => { setError(e.message); if (e.status !== 409) setPicked(null); });
    }, [canAnswer, id, s?.index]);
    const answerRef = useRef(answer);
    answerRef.current = answer;
    useEffect(() => {
        const onKey = (e) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const k = e.key.toUpperCase();
            const i = /^[1-4]$/.test(k) ? Number(k) - 1 : LETTERS.indexOf(k);
            if (i >= 0) answerRef.current(i);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    if (fatal) {
        return (
            <div className="mx-auto max-w-lg rounded-3xl border border-rose-200 bg-white p-6 text-center shadow-sm">
                <p className="font-bold text-slate-900">{fatal}</p>
                <Link to={`/competitions/arena/${id}`} className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Back</Link>
            </div>
        );
    }
    if (!s) return <PlaySkeleton />;
    // Not in yet: only my own joining code lets me in.
    // Not started yet: no code exists for me to see.
    if (s.needsCode && !s.started) {
        return (
            <div className="mx-auto max-w-md space-y-4 pb-10 -mt-4 sidebar:-mt-8" data-arena-code>
                <Link to={`/competitions/arena/${id}`} onClick={goBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={16} /> Back</Link>
                <div className="space-y-2 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                    <Sparkles size={26} className="mx-auto text-indigo-600" />
                    <p className="text-xl font-black text-slate-900">Waiting for the start</p>
                    <p className="text-sm text-slate-600">Your joining code appears in a pop-up and your notifications as soon as the organizer starts the quiz. Stay on this page.</p>
                </div>
            </div>
        );
    }
    if (s.needsCode) {
        const submit = (e) => {
            e.preventDefault();
            setError('');
            arenaApi.join(id, code).then(() => arenaApi.live(id)).then(accept).catch((err) => setError(err.message));
        };
        return (
            <div className="mx-auto max-w-md space-y-4 pb-10 -mt-4 sidebar:-mt-8" data-arena-code>
                <Link to={`/competitions/arena/${id}`} onClick={goBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={16} /> Back</Link>
                <form onSubmit={submit} className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                    <Sparkles size={26} className="mx-auto text-indigo-600" />
                    <p className="text-xl font-black text-slate-900">Enter your joining code</p>
                    <p className="text-sm text-slate-600">{s.codeIssued ? 'The quiz has started. Your own 6-character code is in the pop-up and your notifications. Only your code lets you in.' : 'Your code is issued once your entry is approved.'}</p>
                    <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} autoFocus aria-label="Joining code" placeholder="______"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-center font-mono text-2xl font-black tracking-[0.4em] text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
                    <button type="submit" disabled={code.length !== 6} className="w-full rounded-2xl bg-indigo-600 py-3 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-50">Join the quiz</button>
                </form>
            </div>
        );
    }

    const secs = Math.ceil(leftMs / 1000);
    const q = s.question;
    const reveal = s.stage === 'reveal';
    const mark = (i) => {
        if (i === mineChoice) return 'mine';
        if (mineChoice != null || leftMs <= 0) return 'dim';
        return 'open';
    };
    const tone = {
        mine: 'border-indigo-400 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-300',
        dim: 'border-slate-200 bg-white text-slate-400',
        open: 'border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md'
    };

    return (
        <div className="mx-auto max-w-5xl space-y-4 pb-10 -mt-4 sidebar:-mt-8" data-arena-play={s.stage}>
            {/* While the quiz is on: no copying, no screenshots, no leaving. */}
            <CompetitionGuard active={s.stage !== 'finished'} />
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Link to={`/competitions/arena/${id}`} onClick={goBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={16} /> Back</Link>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white"><Trophy size={13} /> {s.answered} of {s.total} answered</span>
            </div>
            {offline && <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800"><WifiOff size={15} /> Reconnecting… the quiz keeps running; you will rejoin where it is.</p>}

            {/* Rounds, and where we are. */}
            <ol className="grid grid-cols-3 gap-2" aria-label="Rounds">
                {s.rounds.map((r) => {
                    const cur = s.round === r.round && s.stage !== 'finished' && s.stage !== 'waiting';
                    const done = s.stage === 'finished' || (s.round && r.round < s.round);
                    return (
                        <li key={r.round} className={`rounded-2xl px-3 py-2 text-center text-xs font-bold ${cur ? 'bg-indigo-600 text-white shadow-md' : done ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>
                            <span className="block text-[10px] uppercase tracking-wider opacity-80">Round {r.round}</span>{r.name}
                        </li>
                    );
                })}
            </ol>

            {s.stage === 'waiting' && (
                <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 p-8 text-center text-white shadow-lg" data-waiting>
                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/80">Starting in</p>
                    <p className="mt-2 text-5xl font-black tabular-nums">{Math.max(0, Math.ceil((s.startsAt - serverNow) / 1000))}s</p>
                    <p className="mt-3 text-sm text-white/85">Stay on this page. The first question opens on its own.</p>
                </section>
            )}

            {s.stage === 'intro' && (
                <section className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-8 text-center text-white shadow-lg" data-intro>
                    <Sparkles size={28} className="mx-auto opacity-80" />
                    <p className="mt-2 text-sm font-bold uppercase tracking-[0.25em] text-white/80">Round {s.round}</p>
                    <h1 className="mt-1 text-3xl font-black">{ROUND_NAMES[s.round]}</h1>
                    <p className="mx-auto mt-2 max-w-md text-sm text-white/85">{ROUND_BLURBS[s.round]}</p>
                    <p className="mt-4 text-sm font-semibold">{s.roundSize} questions · {s.secondsPerQuestion} s each · first question in <span className="tabular-nums">{secs}s</span></p>
                </section>
            )}

            {q && (
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" data-question={s.index}>
                    <div className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-3 text-white">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/85">Question {s.index + 1} of {s.total} · R{s.round} {s.inRound}/{s.roundSize}</p>
                            {s.stage === 'question'
                                ? <span data-timer={secs} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-black tabular-nums ${secs <= 5 ? 'animate-pulse bg-white text-rose-600 motion-reduce:animate-none' : 'bg-white/20'}`}><Timer size={14} /> {secs}s</span>
                                : <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">Answer</span>}
                        </div>
                        <div className="mt-2.5 flex gap-1" aria-hidden="true">
                            {Array.from({ length: s.total }, (_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < s.index ? 'bg-white' : i === s.index ? 'bg-white/70' : 'bg-white/25'}`} />)}
                        </div>
                    </div>
                    {s.stage === 'question' && <div className="h-1.5 bg-slate-100"><div className={`h-full ${share < 0.25 ? 'bg-rose-500' : 'bg-indigo-500'} transition-[width] duration-100 ease-linear`} style={{ width: `${share * 100}%` }} /></div>}
                    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
                        {/* Every round's card is the same size: a question with no
                            picture fills the picture's space with the question itself. */}
                        {q.imagePath
                            ? <h2 className="text-lg font-black leading-snug text-slate-900 sm:text-xl lg:text-2xl">{q.prompt}</h2>
                            : <h2 className="flex min-h-56 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 p-6 text-center text-xl font-black leading-snug text-slate-900 ring-1 ring-indigo-100 sm:min-h-72 sm:text-2xl lg:min-h-[28.5rem] lg:px-12 lg:text-3xl">{q.prompt}</h2>}
                        {q.imagePath && (
                            <div className="flex h-56 items-center justify-center rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 sm:h-72 lg:h-96" data-question-picture>
                                {picture
                                    ? <img src={picture} alt="The picture for this question" className="h-full w-full rounded-xl object-contain" />
                                    : <span className="flex items-center gap-2 text-sm text-slate-400"><ImageIcon size={16} /> Loading the picture…</span>}
                            </div>
                        )}
                        <div className="grid gap-2.5 sm:grid-cols-2" role="group" aria-label="Answers">
                            {q.options.map((o, i) => {
                                const m = mark(i);
                                return (
                                    <button key={i} type="button" data-option={i} data-mark={m} disabled={!canAnswer} onClick={() => answer(i)}
                                        className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm font-semibold shadow-sm transition-[transform,box-shadow,border-color] duration-150 disabled:cursor-default sm:text-[15px] lg:min-h-16 lg:px-4 lg:text-base ${tone[m]}`}>
                                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black ${m === 'right' ? 'bg-emerald-500 text-white' : m === 'wrong' ? 'bg-rose-500 text-white' : m === 'mine' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                            {m === 'right' ? <Check size={16} /> : m === 'wrong' ? <X size={16} /> : LETTERS[i]}
                                        </span>
                                        <span className="min-w-0 flex-1 break-words">{o}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {s.stage === 'question' && (
                            <p className="rounded-2xl bg-indigo-50 px-4 py-2.5 text-center text-sm font-semibold text-indigo-700" data-status>
                                {mineChoice != null ? 'Answer saved. The next question opens when time is up.' : leftMs <= 0 ? 'Time is up — this question is locked.' : 'Pick your answer.'}
                            </p>
                        )}
                        {reveal && (
                            <p className="rounded-2xl bg-slate-50 px-4 py-2.5 text-center text-sm font-semibold text-slate-600 ring-1 ring-slate-100" data-status>
                                {s.mine ? 'Answer saved.' : 'No answer for this one.'} Next question coming up…
                            </p>
                        )}
                        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-center text-sm font-semibold text-rose-700">{error}</p>}
                    </div>
                </section>
            )}

            {s.stage === 'finished' && (
                <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center" data-finished>
                    <Trophy size={30} className="mx-auto text-emerald-600" />
                    <p className="mt-2 text-2xl font-black text-slate-900">Quiz complete!</p>
                    {s.score != null
                        ? <p className="mt-1 text-slate-700">You scored <b>{s.score}</b> of {s.total * s.pointsPerQuestion} points ({s.correct} of {s.total} correct).</p>
                        : <p className="mt-1 text-slate-700">You answered {s.answered} of {s.total} questions.</p>}
                    <p className="mt-1 text-sm text-slate-600">{s.resultsPublished ? 'The results are out.' : 'Rankings and certificates appear once the organizer publishes the results.'}</p>
                    <Link to={`/competitions/arena/${id}`} className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">{s.resultsPublished ? 'See the results' : 'Back to the competition'}</Link>
                </section>
            )}
        </div>
    );
}
