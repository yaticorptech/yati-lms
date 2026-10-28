/**
 * One Quiz Arena contest for a student: what it is, the rounds and rules,
 * whether their college entered them (as in Chess, the college coordinator
 * enters students and the organizer approves them), a countdown and Join once
 * it is on, and — once the admin publishes them — the results: the top three, my
 * score and rank, the overall and college-wise leaderboards, and my
 * certificate.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, CalendarClock, Users, Timer, Trophy, Download, Crown, Medal, Building2, ListOrdered, Clock } from 'lucide-react';
import CertificateInline from '../CertificateInline';
import Confetti from '../Confetti';
import { payOnline } from '../razorpay';
import { DetailSkeleton, ListSkeleton } from '../Skeletons';
import { GameHero, JoinCard, CollegesCard, PayCard } from '../GameInfo';
import { arenaApi, STATE, fmt, duration } from './api';
import useGoBack from '../../hooks/useGoBack';

const useNow = (ms = 1000) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
    return now;
};
const Fact = ({ icon: Icon, label, children }) => (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-slate-50 p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100"><Icon size={17} aria-hidden="true" /></span>
        <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <div className="text-sm font-semibold text-slate-800">{children}</div>
        </div>
    </div>
);
const left = (ms) => {
    if (ms <= 0) return '0s';
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60);
    return d ? `${d}d ${h}h ${m}m` : h ? `${h}h ${m}m ${s % 60}s` : `${m}m ${s % 60}s`;
};

const Results = ({ id, title, heldOn }) => {
    const [r, setR] = useState(null);
    const [tab, setTab] = useState('overall');
    const [college, setCollege] = useState('');
    const [error, setError] = useState('');
    // Live: fetched again every 20 seconds, so a late correction shows without a reload.
    useEffect(() => {
        const get = () => arenaApi.results(id).then(setR).catch((e) => setError(e.message));
        get();
        const t = setInterval(get, 20000);
        return () => clearInterval(t);
    }, [id]);
    // Party poppers the first time the results are seen here.
    const [party] = useState(() => { try { const k = `arena-party:${id}`; const seen = localStorage.getItem(k); localStorage.setItem(k, '1'); return !seen; } catch { return false; } });
    if (error && !r) return <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>;
    if (!r) return <ListSkeleton rows={4} />;
    const rows = r.overall.filter((x) => !college || x.organizationId === college);
    return (
        <section className="space-y-4" data-results>
            {r.me && party && <Confetti pieces={r.me.rank <= 3 ? 110 : 60} />}
            {r.me && (
                <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-5 text-white shadow-lg" data-my-result>
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-black ring-1 ring-white/30">#{r.me.rank}</span>
                    <div className="min-w-0 flex-1">
                        <p className="text-lg font-black sm:text-xl" data-you-won>{r.me.rank <= 3 ? `🏆 Congratulations, you won ${['1st', '2nd', '3rd'][r.me.rank - 1]} place!` : '🎉 Congratulations on taking part!'}</p>
                        <p className="text-sm font-semibold text-white/90">{title} · held on {fmt(heldOn)}</p>
                        <p className="text-sm text-white/80">You scored <b className="text-white">{r.me.score} / {r.maxScore}</b> · rank {r.me.rank} of {r.me.of} · {r.me.correctCount} of {r.questions} correct</p>
                    </div>
                </div>
            )}
            {r.me?.certificate && <CertificateInline load={() => arenaApi.certificate(id)} fileName={`Certificate_${title.replace(/\s+/g, '_')}.pdf`} />}
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            {/* The top three on a podium: 1st in the middle, tallest, in gold with a crown; 2nd silver; 3rd bronze. */}
            {r.top.length > 0 && (
                <div className="flex items-end justify-center gap-2 rounded-3xl border border-slate-200 bg-white px-3 pt-6 shadow-sm sm:gap-4 sm:px-6" data-top3>
                    {[1, 0, 2].map((k) => r.top[k] && (() => {
                        const x = r.top[k];
                        const look = [
                            { bar: 'h-36 sm:h-44 bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-600 text-amber-950', ring: 'ring-amber-400', w: 'w-[38%] sm:w-56' },
                            { bar: 'h-24 sm:h-32 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-500 text-slate-800', ring: 'ring-slate-300', w: 'w-[31%] sm:w-48' },
                            { bar: 'h-16 sm:h-24 bg-gradient-to-b from-orange-300 via-orange-400 to-orange-700 text-orange-950', ring: 'ring-orange-300', w: 'w-[31%] sm:w-48' }
                        ][k];
                        return (
                            <div key={x.rank} className={`flex flex-col items-center text-center ${look.w}`} data-podium={k + 1}>
                                {k === 0 && <Crown size={26} className="mb-1 text-amber-500 drop-shadow" aria-hidden="true" />}
                                <span className={`flex h-11 w-11 items-center justify-center rounded-full bg-white text-base font-black text-slate-800 shadow ring-2 ${look.ring}`}>{(x.name || '?').charAt(0).toUpperCase()}</span>
                                <p className={`mt-1.5 w-full truncate text-sm font-black text-slate-900 sm:text-base ${x.you ? 'text-indigo-700' : ''}`}>{x.name}{x.you ? ' (you)' : ''}</p>
                                <p className="w-full truncate text-xs text-slate-500">{x.collegeName}</p>
                                <p className="mt-0.5 text-sm font-black text-indigo-700">{x.score} <span className="text-xs font-semibold text-slate-500">pts · {x.correctCount} correct</span></p>
                                <div className={`mt-2 flex w-full items-start justify-center rounded-t-2xl pt-2 text-2xl font-black shadow-inner sm:text-3xl ${look.bar}`}>{k + 1}</div>
                            </div>
                        );
                    })())}
                </div>
            )}
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    {[['overall', 'Overall', ListOrdered], ['colleges', 'College-wise', Building2]].map(([k, label, Icon]) => (
                        <button key={k} type="button" onClick={() => setTab(k)} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold ${tab === k ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Icon size={15} /> {label}</button>
                    ))}
                    {tab === 'overall' && r.colleges.length > 1 && (
                        <select value={college} onChange={(e) => setCollege(e.target.value)} className="ml-auto rounded-xl border border-slate-200 px-2 py-1.5 text-sm">
                            <option value="">All colleges</option>
                            {r.colleges.map((c) => <option key={c.rank} value={c.organizationId || ''}>{c.collegeName}</option>)}
                        </select>
                    )}
                </div>
                {tab === 'overall' ? (
                    <ol className="divide-y divide-slate-100" data-leaderboard>
                        {rows.map((x) => (
                            <li key={x.rank} className={`flex items-center gap-3 py-2 text-sm ${x.you ? 'rounded-xl bg-indigo-50 px-2' : ''}`}>
                                <span className="w-8 shrink-0 text-center font-black text-slate-500">{x.rank}</span>
                                <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-slate-900">{x.name}{x.you ? ' (you)' : ''}</span><span className="block truncate text-xs text-slate-500">{x.collegeName}</span></span>
                                <span className="text-xs text-slate-500">{x.correctCount} correct</span>
                                <span className="w-14 text-right font-black text-slate-900">{x.score}</span>
                            </li>
                        ))}
                    </ol>
                ) : (
                    <ol className="divide-y divide-slate-100" data-college-board>
                        {r.colleges.map((c) => (
                            <li key={c.rank} className="flex items-center gap-3 py-2 text-sm">
                                <span className="w-8 shrink-0 text-center font-black text-slate-500">{c.rank}</span>
                                <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-slate-900">{c.collegeName}</span><span className="block text-xs text-slate-500">{c.participants} took part · best rank #{c.bestRank}</span></span>
                                <span className="text-right"><span className="block font-black text-slate-900">{c.averageScore}</span><span className="block text-[11px] text-slate-500">average</span></span>
                            </li>
                        ))}
                    </ol>
                )}
                <p className="mt-3 text-[11px] text-slate-400">Ranked by points, then by less total time on correct answers, then by earlier registration. Colleges by average score.</p>
            </div>
        </section>
    );
};

export default function ArenaDetail() {
    const goBack = useGoBack();
    const { id } = useParams();
    const [c, setC] = useState(null);
    const [error, setError] = useState('');
    const now = useNow();
    const load = useCallback(() => arenaApi.detail(id).then(setC).catch((e) => setError(e.message)), [id]);
    useEffect(() => { load(); }, [load]);
    // Refresh as the start comes and goes, so Join appears on its own.
    useEffect(() => { const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

    if (!c) return error ? <p className="rounded-3xl border border-rose-200 bg-white p-6 text-center font-bold text-slate-900">{error}</p> : <DetailSkeleton />;
    const [label, cls] = STATE[c.state] || [c.state, ''];
    const startsIn = new Date(c.startsAt).getTime() - now;
    const deadlineIn = new Date(c.registrationDeadline).getTime() - now;
    // Join opens only once the organizer has pressed Start: then my code shows here.
    const canPlay = c.registered && c.state === 'live';
    return (
        <div className="space-y-4 pb-10 -mt-4 sidebar:-mt-8" data-arena-detail={c.id}>
            <Link to="/competitions?tab=competitions&game=quizarena" onClick={goBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={16} aria-hidden="true" /> Back</Link>
            {/* Its status, game and kind: below Back, off the banner (asked 2026-10-28). */}
            <div className="!mt-2 flex flex-wrap items-center gap-2" data-competition-badges>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${cls}`} data-state-chip>{label}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-800 ring-1 ring-slate-200">🧠 Quiz Arena</span>
                <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-800 ring-1 ring-slate-200">Inter-College</span>
            </div>
            <GameHero game="quizarena" bannerUrl={c.bannerUrl} title={c.title} subtitle={`Organized by ${c.organizedBy || 'YATICORP'}`} description={c.description}
                meta={[[CalendarClock, fmt(c.startsAt)], [Timer, `${c.questions} questions · about ${duration(c.durationMs)}`], [Users, `${c.registeredCount} entered`]]} />

            {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}

            {/* The entry fee first: until it is paid, no code and no Join. */}
            {c.entryFee && !c.entryFee.paid && c.entryStatus === 'approved' && !['ended', 'results', 'cancelled'].includes(c.state) ? (
                <PayCard amount={c.entryFee.amount} pay={() => payOnline(() => arenaApi.pay(c.id), (r) => arenaApi.payVerify(c.id, r))} onPaid={load} />
            ) : c.state !== 'results' && c.state !== 'cancelled' && (
                <JoinCard ok={c.entryStatus === 'approved'} label="Join the quiz"
                    title={c.entryStatus === 'approved' ? 'You are in — your entry is approved'
                        : c.entryStatus === 'pending' ? 'Your college entered you — waiting for the organizer\'s approval'
                            : c.entryStatus === 'rejected' ? 'Your entry was not approved'
                                : c.state === 'registration' ? `Entries close in ${left(deadlineIn)}` : 'Entries have closed'}
                    note={<>{!c.entryStatus && c.state === 'registration' ? 'Your college coordinator enters students for Quiz Arena. Ask them to put you in.'
                        : c.state === 'live' ? (c.registered ? 'The organizer has started the quiz. Enter your joining code to join: questions you missed count as zero, and you are never removed.' : 'The quiz is on now.')
                            : c.state === 'ended' ? 'The quiz is over. The results appear here once the organizer publishes them.'
                                : c.registered ? 'Join opens when the organizer starts the quiz. Your joining code appears here then.' : startsIn > 0 ? `Planned for ${fmt(c.startsAt)}.` : 'Waiting for the organizer to start.'}
                        {!c.entryStatus && c.notEligible && c.state === 'registration' && <span className="mt-1 block font-semibold text-amber-700">{c.notEligible}</span>}</>}
                    started={canPlay} code={c.myCode} joined={c.joined} to={`/competitions/arena/${c.id}/play`}
                    showJoin={c.registered && ['registration', 'upcoming', 'live'].includes(c.state)} />
            )}

            {c.state === 'results' && <Results id={c.id} title={c.title} heldOn={c.startsAt} />}

            {/* Once the results are out the page is just the results. */}
            {c.state !== 'results' && (<>
            <section className="grid gap-2.5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
                <Fact icon={CalendarClock} label="Date & time">{fmt(c.startsAt)}</Fact>
                <Fact icon={Clock} label="Registration">{c.registrationOpensAt && new Date(c.registrationOpensAt).getTime() > now ? `Opens ${fmt(c.registrationOpensAt)}` : `Closes ${fmt(c.registrationDeadline)}`}</Fact>
                <Fact icon={Users} label="Player requirements">{c.maxParticipants} seats · up to {c.playersPerCollege} per college</Fact>
                <Fact icon={Timer} label="Each question">{c.secondsPerQuestion} s · {c.pointsPerQuestion} points if correct</Fact>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-instructions>
                <h2 className="flex items-center gap-2 font-black text-slate-900"><Trophy size={18} className="text-indigo-600" /> Rules</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    <li>Everyone gets the same questions, in the same order, at the same time. One question at a time, four options.</li>
                    <li>You have <b>{c.secondsPerQuestion} seconds</b> per question. A correct answer scores <b>{c.pointsPerQuestion} points</b>; a wrong answer scores 0.</li>
                    <li>No answer in time? The question locks with 0 points and the quiz moves on. You are never eliminated.</li>
                    <li>One answer per question — it cannot be changed. Nothing shows whether it was right: your score comes with the results.</li>
                    <li>Join only after the organizer starts the quiz: your own joining code appears then, here and in a pop-up. Enter it to take your place.</li>
                    <li>Lost your connection? Open the quiz again: you rejoin at the current question. Time keeps running on the server.</li>
                    <li>Ties are broken by less total time on correct answers, then by earlier registration.</li>
                    {c.certificates.winners && <li>The top three receive winners&apos; certificates{c.certificates.participants ? '; everyone who takes part gets a participation certificate' : ''}.</li>}
                </ul>
                {c.instructions && <p className="mt-3 whitespace-pre-line rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">{c.instructions}</p>}
            </section>

            <CollegesCard rows={(c.colleges || []).map((g) => ({ key: g.collegeName, title: g.collegeName, sub: `${g.students.length} student${g.students.length === 1 ? '' : 's'}`, names: g.students.join(', ') }))}
                empty={c.state === 'registration' ? 'Colleges are entering students now.' : 'No college has entered students yet.'} />
            </>)}
        </div>
    );
}
