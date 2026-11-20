/**
 * IELTS — the home of the mock tests (2026-11-17, the user: "link the IELTS exam" in Multilingo, both a mock test in
 * the app and a link to book the real one). The latest attempt's four sections, each started on its own and in any
 * order; its overall band once all four are in; the attempts before; and where to book the real exam.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ExternalLink, Loader2, Sparkles, Clock, Info, RotateCcw, CalendarCheck } from 'lucide-react';
import { linguisticApi } from '../api';
import { Loading, Problem } from '../ui';
import { BandDial } from './shared';
import { SECTIONS, fmtBand, bandWord, forgetDrafts } from './sections';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export default function IeltsHome() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [starting, setStarting] = useState(false);
    const load = useCallback(() => linguisticApi.ielts().then((d) => { setData(d); setError(null); }).catch(setError), []);
    useEffect(() => { load(); }, [load]);

    if (error && !data) return <Problem error={error} onRetry={load} />;
    if (!data) return <Loading label="Opening IELTS…" />;

    const current = data.attempts[0] || null;
    const done = current ? SECTIONS.filter((s) => current.bands[s.id] !== null).length : 0;
    const past = data.attempts.filter((a) => a.overall !== null);
    const best = past.reduce((m, a) => Math.max(m, a.overall), 0) || null;

    const start = async (testId) => {
        setStarting(testId);
        try { const a = await linguisticApi.ieltsStart(testId); setData((d) => ({ ...d, attempts: [a, ...d.attempts] })); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        catch (e) { setError(e); }
        finally { setStarting(false); }
    };
    // Restart (2026-11-17, "reset this to test again"): this attempt gone, and the same test begun afresh.
    const restart = async (a) => {
        if (!window.confirm(`Restart ${a.title}? Your answers and bands for this attempt will be deleted.`)) return;
        setStarting(a.testId);
        try {
            await linguisticApi.ieltsDiscard(a.id);
            forgetDrafts(a.id);
            const fresh = await linguisticApi.ieltsStart(a.testId);
            setData((d) => ({ ...d, attempts: [fresh, ...d.attempts.filter((x) => x.id !== a.id)] }));
        } catch (e) { setError(e); }
        finally { setStarting(false); }
    };
    // The first test not taken yet, else the first: what "Start" in the hero begins.
    const untaken = data.tests.find((t) => !data.attempts.some((a) => a.testId === t.id)) || data.tests[0];
    const open = (attemptId, section) => navigate(`/linguistic/ielts/${attemptId}/${section}`);
    const nextSection = current && SECTIONS.find((s) => current.bands[s.id] === null);

    return (
        <div className="mx-auto max-w-5xl space-y-6 pt-3" data-ielts-home>
            {/* The hero: what this is, the latest overall band, and the one main action. */}
            <section className="relative overflow-hidden rounded-[28px] border-2 border-[#E5E5E5] bg-white">
                <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-60" style={{ background: 'radial-gradient(circle, #DDF4FF 0%, transparent 70%)' }} />
                <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
                    <div className="min-w-0 flex-1">
                        <p className="inline-flex items-center gap-1.5 rounded-full bg-[#F4E5FF] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#8447B3]"><Sparkles size={13} aria-hidden="true" /> IELTS Academic &amp; General Training · mock tests</p>
                        <h1 className="mt-3 text-[26px] font-black leading-tight text-[#1F2A44] sm:text-[32px]">Know your band before exam day</h1>
                        <p className="mt-2 max-w-xl text-[15px] font-semibold leading-relaxed text-[#6B7280]">
                            All four papers, timed like the real test. Listening and Reading are marked instantly; Writing and Speaking by an AI examiner against the official band descriptors.
                        </p>
                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            {!current || current.overall !== null ? (
                                <button type="button" onClick={() => start(untaken.id)} disabled={!!starting} className="lingo-btn inline-flex min-h-12 items-center gap-2 px-6 text-[15px] text-white disabled:opacity-60" style={{ background: '#1CB0F6', borderColor: '#1899D6' }} data-ielts-start>
                                    {starting === untaken.id ? <Loader2 size={18} className="animate-spin" /> : null}{current ? `Start ${untaken.title}` : 'Start mock test'} <ArrowRight size={18} aria-hidden="true" />
                                </button>
                            ) : (
                                <button type="button" onClick={() => open(current.id, nextSection.id)} className="lingo-btn inline-flex min-h-12 items-center gap-2 px-6 text-[15px] text-white" style={{ background: '#1CB0F6', borderColor: '#1899D6' }} data-ielts-continue>
                                    Continue · {nextSection.label} <ArrowRight size={18} aria-hidden="true" />
                                </button>
                            )}
                            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#8A94A6]"><Clock size={15} aria-hidden="true" /> about 2 h 45 min in all · sections in any order</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:gap-2">
                        <BandDial band={current?.overall ?? null} size={132} />
                        <p className="text-sm font-extrabold text-[#1F2A44] sm:text-center">
                            {current?.overall != null ? bandWord(current.overall) : current ? `${done} of 4 sections done` : 'No test yet'}
                            {best && <span className="block text-xs font-bold text-[#8A94A6]">Best so far {fmtBand(best)}</span>}
                        </p>
                    </div>
                </div>
            </section>

            {!data.aiReady && (
                <p className="flex items-start gap-2 rounded-2xl bg-[#FFF5D3] px-4 py-3 text-sm font-semibold text-[#8A5A00]" role="status">
                    <Info size={17} className="mt-0.5 shrink-0" aria-hidden="true" /> The AI examiner is not available right now, so Writing and Speaking can't be marked. Listening and Reading work as usual. You can add your own Gemini key in your profile.
                </p>
            )}

            {/* The four sections of the current attempt. */}
            {current && (
                <section aria-labelledby="ielts-sections">
                    <div className="mb-3 flex items-end justify-between gap-3">
                        <h2 id="ielts-sections" className="text-lg font-black text-[#1F2A44]">{current.title} <span className="text-sm font-bold text-[#8A94A6]">· started {fmtDate(current.startedAt)}</span></h2>
                        <button type="button" onClick={() => restart(current)} disabled={!!starting} data-ielts-restart
                            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border-2 border-[#E5E5E5] bg-white px-3 text-sm font-extrabold text-[#6B7280] transition-colors hover:border-[#FFB3B3] hover:text-[#EA2B2B] disabled:opacity-50">
                            {starting === current.testId ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} aria-hidden="true" />} Restart test
                        </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {SECTIONS.map((s) => {
                            const band = current.bands[s.id];
                            const Icon = s.icon;
                            const isDone = band !== null;
                            return (
                                <button key={s.id} type="button" onClick={() => open(current.id, s.id)}
                                    className="group flex flex-col rounded-3xl border-2 border-b-4 bg-white p-4 text-left transition-colors hover:bg-[#FAFAFA] focus:outline-none focus-visible:ring-4 active:translate-y-0.5 active:border-b-2"
                                    style={{ borderColor: isDone ? s.face : '#E5E5E5', '--tw-ring-color': s.light }} data-ielts-section={s.id}>
                                    <span className="flex items-center justify-between">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: s.light, color: s.ink }}><Icon size={22} aria-hidden="true" /></span>
                                        {isDone
                                            ? <span className="rounded-full px-2.5 py-1 text-sm font-black text-white" style={{ background: s.face }}>{fmtBand(band)}</span>
                                            : <span className="text-xs font-extrabold uppercase tracking-wider text-[#AFAFAF]">{s.minutes} min</span>}
                                    </span>
                                    <span className="mt-3 block text-[17px] font-black text-[#1F2A44]">{s.label}</span>
                                    <span className="mt-0.5 block text-[13px] font-semibold text-[#8A94A6]">{s.what}</span>
                                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-extrabold uppercase tracking-wide" style={{ color: s.ink }}>
                                        {isDone ? 'See results' : 'Start'} <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Every mock test, with the question formats it practises (2026-11-17: flow-charts, tables, headings…). */}
            <section aria-labelledby="ielts-tests">
                <h2 id="ielts-tests" className="mb-3 text-lg font-black text-[#1F2A44]">Mock tests</h2>
                <div className="grid gap-3 md:grid-cols-2">
                    {data.tests.map((t, i) => {
                        const mine = data.attempts.filter((a) => a.testId === t.id);
                        const open = mine.find((a) => a.overall === null);
                        const bestHere = mine.reduce((m, a) => (a.overall !== null ? Math.max(m, a.overall) : m), 0) || null;
                        const next = open && SECTIONS.find((sec) => open.bands[sec.id] === null);
                        return (
                            <article key={t.id} className="flex flex-col rounded-3xl border-2 border-[#E5E5E5] bg-white p-5" data-ielts-test-card={t.id}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-black uppercase tracking-wider text-[#AFAFAF]">Test {i + 1} · {t.module}</p>
                                        <h3 className="text-[17px] font-black text-[#1F2A44]">{t.title}</h3>
                                    </div>
                                    {bestHere ? <span className="shrink-0 rounded-full bg-[#1F2A44] px-3 py-1 text-sm font-black text-white" title="Your best band on this test">{fmtBand(bestHere)}</span>
                                        : open ? <span className="shrink-0 rounded-full bg-[#DDF4FF] px-3 py-1 text-xs font-black text-[#1477B0]">In progress</span>
                                            : <span className="shrink-0 rounded-full bg-[#F4E5FF] px-3 py-1 text-xs font-black text-[#8447B3]">New</span>}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5">{t.formats.map((f) => <span key={f} className="rounded-lg bg-[#F3F4F6] px-2 py-1 text-xs font-bold text-[#4B5563]">{f}</span>)}</div>
                                <div className="mt-4 flex flex-1 items-end">
                                    {open ? (
                                        <button type="button" onClick={() => navigate(`/linguistic/ielts/${open.id}/${next.id}`)} className="lingo-btn inline-flex min-h-11 items-center gap-2 px-5 text-sm text-white" style={{ background: '#1CB0F6', borderColor: '#1899D6' }}>Continue · {next.label} <ArrowRight size={16} aria-hidden="true" /></button>
                                    ) : (
                                        <button type="button" onClick={() => start(t.id)} disabled={!!starting} className="lingo-btn inline-flex min-h-11 items-center gap-2 px-5 text-sm disabled:opacity-60"
                                            style={mine.length ? { background: '#fff', borderColor: '#E5E5E5', color: '#1477B0' } : { background: '#1CB0F6', borderColor: '#1899D6', color: '#fff' }}>
                                            {starting === t.id && <Loader2 size={16} className="animate-spin" />}{mine.length ? 'Take again' : 'Start test'} <ArrowRight size={16} aria-hidden="true" />
                                        </button>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                {/* The attempts before. */}
                <section className="rounded-3xl border-2 border-[#E5E5E5] bg-white p-5" aria-labelledby="ielts-history">
                    <h2 id="ielts-history" className="flex items-center gap-2 text-lg font-black text-[#1F2A44]"><RotateCcw size={18} aria-hidden="true" /> Your attempts</h2>
                    {data.attempts.length === 0 ? (
                        <p className="mt-3 text-sm font-semibold text-[#8A94A6]">Your bands will appear here after your first mock test.</p>
                    ) : (
                        <div className="mt-3 overflow-x-auto">
                            <table className="w-full min-w-[420px] text-left text-sm">
                                <thead><tr className="text-[11px] font-extrabold uppercase tracking-wider text-[#AFAFAF]"><th className="py-2 pr-2">Date</th>{SECTIONS.map((s) => <th key={s.id} className="px-2 py-2 text-center" title={s.label}>{s.label[0]}</th>)}<th className="py-2 pl-2 text-right">Overall</th></tr></thead>
                                <tbody>
                                    {data.attempts.map((a) => (
                                        <tr key={a.id} className="border-t border-[#F0F0F0]">
                                            <td className="py-2.5 pr-2 font-bold text-[#4B5563]">{fmtDate(a.startedAt)}</td>
                                            {SECTIONS.map((s) => <td key={s.id} className="px-2 py-2.5 text-center font-extrabold" style={{ color: a.bands[s.id] !== null ? s.ink : '#CFCFCF' }}>{fmtBand(a.bands[s.id])}</td>)}
                                            <td className="py-2.5 pl-2 text-right text-base font-black text-[#1F2A44]">{fmtBand(a.overall)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* The real exam: booked with the official test providers. */}
                <section className="rounded-3xl border-2 border-[#1F2A44] bg-[#1F2A44] p-5 text-white" aria-labelledby="ielts-book">
                    <h2 id="ielts-book" className="flex items-center gap-2 text-lg font-black"><CalendarCheck size={19} aria-hidden="true" /> Book the real exam</h2>
                    <p className="mt-1.5 text-sm font-semibold leading-relaxed text-white/70">
                        {best ? `Your best mock band is ${fmtBand(best)}. ` : ''}When your mock bands reach your target, book a test date with an official provider.
                    </p>
                    <div className="mt-4 space-y-2.5">
                        {data.booking.map((b) => (
                            <a key={b.url} href={b.url} target="_blank" rel="noopener noreferrer" data-ielts-book={b.name}
                                className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3 transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                                <span className="min-w-0"><span className="block text-[15px] font-extrabold">{b.name}</span><span className="block text-xs font-semibold text-white/60">{b.note}</span></span>
                                <ExternalLink size={17} className="shrink-0 opacity-80" aria-label="opens in a new tab" />
                            </a>
                        ))}
                    </div>
                    <p className="mt-3 text-[11px] font-semibold text-white/50">Mock bands are an estimate. Only the official test gives a result you can submit to universities and visa offices.</p>
                </section>
            </div>
        </div>
    );
}
