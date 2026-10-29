/**
 * Linguistic Ability — the Badges tab: achievements with their progress, the
 * level certificates (downloadable once earned), and recent results.
 */
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Download, Lock, Check } from 'lucide-react';
import { saveBlob } from '../native/saveFile';
import { linguisticApi } from './api';
import { COLORS, MODULES, levelOf } from './meta';
import { Chunky, Panel } from './ui';
import GemBadge from './parts/GemBadge';
import { BADGE_LOOK, lookOf } from './parts/gemLooks';


export default function Badges() {
    const { dash } = useOutletContext();
    const [history, setHistory] = useState([]);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    useEffect(() => { linguisticApi.history().then((h) => setHistory(h.attempts.slice(0, 8))).catch(() => {}); }, []);

    const download = (level) => {
        setBusy(level); setError('');
        linguisticApi.certificatePdf(level).then((blob) => saveBlob(blob, `${dash.course?.name || 'English'}_${levelOf(level).label}_Certificate.pdf`, { title: 'Certificate' })).catch((e) => setError(e.message)).finally(() => setBusy(''));
    };
    const earned = dash.achievements.filter((a) => a.earned).length;

    return (
        <div className="space-y-8" data-badges-page>
            {/* The certificates first (asked 2026-10-29), then the achievements. */}
            <section aria-labelledby="ling-certs">
                <h2 id="ling-certs" className="mb-1 text-2xl font-extrabold text-[#3c3c3c]">{dash.course && dash.course.code !== 'en' ? `${dash.course.name} certificates` : 'Certificates'}</h2>
                <p className="mb-3 text-[15px] font-semibold text-[#777]">Finish every lesson of a level with an average quiz score of {dash.certificateMinAverage}% or more.</p>
                {error && <p className="mb-2 text-sm font-bold" style={{ color: COLORS.red.ink }} role="alert">{error}</p>}
                <div className="grid gap-3 sm:grid-cols-3">
                    {dash.levels.map((l) => {
                        return (
                            <Panel key={l.level} className="flex flex-col items-center gap-2 p-4 text-center" data-level={l.level}>
                                {/* The level's badge: bronze, silver, gold. */}
                                <GemBadge look={BADGE_LOOK[`level_${l.level}`]} earned={!!l.certificate} size={72} />
                                <p className="text-[17px] font-extrabold text-[#3c3c3c]">{l.label}</p>
                                <p className="text-sm font-semibold text-[#777]">{l.completed}/{l.total} lessons</p>
                                {l.certificate
                                    ? <Chunky color="gold" onClick={() => download(l.level)} disabled={busy === l.level} className="!min-h-10 w-full !text-xs" data-certificate={l.level}><Download size={15} /> {busy === l.level ? 'Preparing…' : 'Download'}</Chunky>
                                    : <p className="text-xs font-extrabold uppercase tracking-wide text-[#AFAFAF]">{l.complete ? `Lift your average to ${dash.certificateMinAverage}%` : 'Not yet'}</p>}
                            </Panel>
                        );
                    })}
                </div>
            </section>
            <section aria-labelledby="ling-badges">
                <div className="mb-3 flex items-baseline justify-between gap-2">
                    <h1 id="ling-badges" className="text-2xl font-extrabold text-[#3c3c3c]">Achievements</h1>
                    <span className="text-sm font-extrabold tabular-nums text-[#AFAFAF]">{earned} of {dash.achievements.length}</span>
                </div>
                {/* Each badge on a card of its own colour, its picture in a glossy frame, its bar in its colours
                    (2026-10-27, "make it like this picture"). Earned: a sparkle and a tick; not yet, a lock. */}
                <ul className="space-y-3">
                    {dash.achievements.map((a, i) => {
                        const look = lookOf(a.key, i), v = Math.max(0, Math.min(100, (a.current / a.target) * 100));
                        return (
                            <li key={a.key} className="flex items-center gap-3 rounded-2xl border-2 p-3 sm:gap-4 sm:p-4" style={{ background: look.tint[0], borderColor: look.tint[1] }} data-badge={a.key} data-earned={a.earned}>
                                <GemBadge look={look} earned={a.earned} size={84} />
                                <div className="min-w-0 flex-1">
                                    <p className="flex items-center gap-1.5 text-[17px] font-extrabold text-[#1F2A44] sm:text-lg">
                                        {a.title}
                                        {a.earned
                                            ? <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: look.bar[1] }} title="Earned"><Check size={13} strokeWidth={3.5} /></span>
                                            : <Lock size={14} className="text-[#AFAFAF]" />}
                                    </p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="relative h-3.5 flex-1 overflow-hidden rounded-full" style={{ background: look.bar[2] }} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={`${a.title}: ${a.current} of ${a.target}`}>
                                            <div className="relative h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${v}%`, background: `linear-gradient(90deg, ${look.bar[0]}, ${look.bar[1]})` }}>
                                                {v > 6 && <span className="absolute left-2 right-2 top-[22%] h-[28%] rounded-full bg-white/35" />}
                                            </div>
                                        </div>
                                        <span className="w-11 text-right text-xs font-extrabold tabular-nums text-[#8A94A6]">{a.current}/{a.target}</span>
                                    </div>
                                    <p className="mt-1.5 text-sm font-semibold text-[#4B5568]">{a.description}</p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </section>


            {history.length > 0 && (
                <section aria-labelledby="ling-history">
                    <h2 id="ling-history" className="mb-3 text-2xl font-extrabold text-[#3c3c3c]">Recent results</h2>
                    <Panel as="ul" className="divide-y-2 divide-[#E5E5E5]">
                        {history.map((h) => (
                            <li key={h.id} className="flex items-center gap-3 px-4 py-3">
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[15px] font-extrabold text-[#4b4b4b]">{h.kind === 'placement' ? 'Placement test' : h.kind === 'daily' ? 'Daily challenge' : h.lessonTitle}</span>
                                    <span className="block text-sm font-semibold text-[#AFAFAF]">{new Date(h.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{h.module ? ` · ${MODULES[h.module]?.short || ''}` : ''}</span>
                                </span>
                                <span className="shrink-0 rounded-xl px-2.5 py-1 text-sm font-extrabold tabular-nums" style={h.kind !== 'quiz' ? { background: COLORS.blue.light, color: COLORS.blue.ink } : h.passed ? { background: COLORS.green.light, color: COLORS.green.ink } : { background: COLORS.red.light, color: COLORS.red.ink }}>{h.score}/{h.total}</span>
                            </li>
                        ))}
                    </Panel>
                </section>
            )}
        </div>
    );
}
