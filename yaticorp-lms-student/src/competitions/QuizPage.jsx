/**
 * Taking a competition quiz (asked 2026-10-23): /competitions/:id/quiz.
 *
 * Start gives one go with the time the organizer set (never past the quiz's
 * close). Each choice is saved as it is picked, so a dropped connection or a
 * closed tab loses nothing; when the time runs out the quiz is handed in as it
 * stands. Once handed in: the score. Once the quiz is decided: every question
 * with the right answer beside the one picked.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Brain, Clock, Loader2, Play, Send, CheckCircle2, XCircle } from 'lucide-react';
import { competitionsApi, fmtDateTime } from './api';
import { ChallengeStandings } from './ChallengeBox';

const clock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export default function QuizPage() {
    const { id } = useParams();
    const [q, setQ] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const [answers, setAnswers] = useState({});
    const [now, setNow] = useState(() => Date.now());
    const saving = useRef(null);
    const handingIn = useRef(false);

    const take = useCallback((data) => { setQ(data); setAnswers(data.attempt?.answers || {}); setError(''); }, []);
    useEffect(() => { competitionsApi.quiz(id).then(take).catch((e) => setError(e.message)); }, [id, take]);

    const answering = !!q?.attempt && !q.attempt.submitted;
    const left = answering ? new Date(q.attempt.endsAt).getTime() - now : 0;

    const handIn = useCallback(() => {
        if (handingIn.current) return;
        handingIn.current = true;
        clearTimeout(saving.current);
        setBusy('submit');
        competitionsApi.saveQuiz(id, answers, true).then(take).catch((e) => setError(e.message)).finally(() => { setBusy(''); handingIn.current = false; });
    }, [id, answers, take]);

    // The clock, and handing in (once) when it runs out.
    const handInRef = useRef(handIn);
    useEffect(() => { handInRef.current = handIn; }, [handIn]);
    const endsAt = answering ? q.attempt.endsAt : null;
    useEffect(() => {
        if (!endsAt) return undefined;
        const end = new Date(endsAt).getTime();
        let out = false;
        const t = setInterval(() => {
            const n = Date.now();
            setNow(n);
            if (n >= end && !out) { out = true; handInRef.current(); }
        }, 500);
        return () => clearInterval(t);
    }, [endsAt]);

    const pick = (qid, choice) => {
        const next = { ...answers, [qid]: choice };
        setAnswers(next);
        // Saved a moment after the last pick (one call for quick changes of mind).
        clearTimeout(saving.current);
        saving.current = setTimeout(() => competitionsApi.saveQuiz(id, { [qid]: choice }).catch((e) => setError(e.message)), 400);
    };
    const start = () => { setBusy('start'); competitionsApi.startQuiz(id).then(take).catch((e) => setError(e.message)).finally(() => setBusy('')); };

    const back = <Link to={`/competitions/${id}`} className="-my-2.5 inline-flex min-h-10 items-center gap-1.5 py-2.5 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={16} aria-hidden="true" /> Back to the competition</Link>;
    if (!q) return <div className="space-y-4">{back}{error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : <div className="skeleton h-64 rounded-3xl" />}</div>;

    const a = q.attempt;
    const done = q.status === 'completed';
    const unanswered = q.questions.filter((x) => answers[x.id] === undefined).length;

    return (
        <div className="mx-auto max-w-3xl space-y-5 pb-10" data-quiz-page>
            {back}
            <header className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-500 p-5 text-white shadow-lg">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15"><Brain size={26} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-black">The quiz</h1>
                    <p className="text-sm text-white/90">{q.count} questions · {q.totalPoints} points · {q.minutes} minutes{q.solo ? '' : ` · for ${q.teamName}`}</p>
                </div>
                {answering && (
                    <span className={`inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-lg font-black tabular-nums ${left < 60000 ? 'bg-rose-500' : 'bg-white/20'}`} data-quiz-clock aria-live="polite">
                        <Clock size={18} aria-hidden="true" /> {clock(left)}
                    </span>
                )}
            </header>
            {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

            {!a && (
                <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                    {q.status === 'live' && q.window === 'open' && q.inTeam ? (
                        <>
                            <p className="text-sm text-slate-600">You have one go. Once you start, the clock runs for {q.minutes} minutes{new Date(q.endsAt).getTime() - now < q.minutes * 60000 ? ` — or until the quiz closes at ${fmtDateTime(q.endsAt)}, which is sooner` : ''}. Your answers are saved as you pick them.</p>
                            <button type="button" onClick={start} disabled={!!busy} data-quiz-start className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl bg-violet-600 px-6 text-base font-bold text-white shadow-md shadow-violet-600/30 hover:bg-violet-700 disabled:opacity-60">
                                {busy === 'start' ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />} Start the quiz
                            </button>
                        </>
                    ) : <p className="text-sm text-slate-600">{q.window === 'before' ? `The quiz opens ${fmtDateTime(q.startsAt)}.` : !q.inTeam ? 'Only those taking part take this quiz.' : 'The quiz is closed.'}</p>}
                </section>
            )}

            {a?.submitted && (
                <section className="flex items-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-5" data-quiz-done>
                    <CheckCircle2 size={28} className="shrink-0 text-emerald-600" aria-hidden="true" />
                    <p className="text-sm text-emerald-900">Handed in. You scored <strong className="text-lg">{a.score}/{q.totalPoints}</strong> ({a.correct} of {q.count} right).{done ? '' : ` The results come out when the quiz closes, ${fmtDateTime(q.endsAt)}.`}</p>
                </section>
            )}

            {q.questions.length > 0 && (
                <ol className="space-y-4">
                    {q.questions.map((x, i) => {
                        const right = q.answers?.[x.id];
                        return (
                            <li key={x.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-quiz-question={x.id}>
                                <p className="font-bold text-slate-900"><span className="text-violet-600">{i + 1}.</span> {x.prompt} {x.points > 1 && <span className="text-xs font-semibold text-slate-400">({x.points} points)</span>}</p>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={`Question ${i + 1}`}>
                                    {x.options.map((o, k) => {
                                        const mine = answers[x.id] === k;
                                        const tone = right != null
                                            ? (k === right ? 'border-emerald-400 bg-emerald-50 text-emerald-900' : mine ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-slate-200 text-slate-600')
                                            : mine ? 'border-violet-500 bg-violet-50 text-violet-900 ring-1 ring-violet-500' : 'border-slate-200 text-slate-700 hover:border-violet-300';
                                        return (
                                            <button key={k} type="button" role="radio" aria-checked={mine} disabled={!answering} onClick={() => pick(x.id, k)} data-choice={k}
                                                className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors ${tone}`}>
                                                {right != null && k === right ? <CheckCircle2 size={16} className="shrink-0 text-emerald-600" /> : right != null && mine ? <XCircle size={16} className="shrink-0 text-rose-500" /> : <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${mine ? 'border-violet-600 bg-violet-600' : 'border-slate-300'}`} />}
                                                {o}
                                            </button>
                                        );
                                    })}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}

            {answering && (
                <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
                    <p className="text-sm font-semibold text-slate-600">{unanswered ? `${unanswered} question${unanswered === 1 ? '' : 's'} not answered yet` : 'Every question answered'}</p>
                    <button type="button" disabled={!!busy} data-quiz-submit
                        onClick={() => { if (!unanswered || window.confirm(`${unanswered} question${unanswered === 1 ? ' is' : 's are'} not answered. Hand in anyway?`)) handIn(); }}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white shadow-md shadow-violet-600/30 hover:bg-violet-700 disabled:opacity-60">
                        {busy === 'submit' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Hand in
                    </button>
                </div>
            )}

            {q.standings && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-2 text-lg font-black text-slate-900">Final standings</h2>
                    <ChallengeStandings rows={q.standings} kind="quiz" solo={q.solo} />
                </section>
            )}
        </div>
    );
}
