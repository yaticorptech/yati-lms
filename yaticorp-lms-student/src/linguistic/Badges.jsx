/**
 * Linguistic Ability — the Badges tab: achievements with their progress, the
 * level certificates (downloadable once earned), and recent results.
 */
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Download, Lock, Award } from 'lucide-react';
import { saveBlob } from '../native/saveFile';
import { linguisticApi } from './api';
import { COLORS, MODULES, levelOf } from './meta';
import { Bar, Chunky, Panel } from './ui';

const CERT_COLOR = { beginner: 'green', intermediate: 'gold', advanced: 'red' };

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
            <section aria-labelledby="ling-badges">
                <div className="mb-3 flex items-baseline justify-between gap-2">
                    <h1 id="ling-badges" className="text-2xl font-extrabold text-[#3c3c3c]">Achievements</h1>
                    <span className="text-sm font-extrabold tabular-nums text-[#AFAFAF]">{earned} of {dash.achievements.length}</span>
                </div>
                <Panel as="ul" className="divide-y-2 divide-[#E5E5E5]">
                    {dash.achievements.map((a) => (
                        <li key={a.key} className="flex items-center gap-4 p-4" data-badge={a.key} data-earned={a.earned}>
                            <span className="flex h-16 w-14 shrink-0 items-center justify-center rounded-xl text-3xl" style={a.earned ? { background: COLORS.gold.face, boxShadow: `0 4px 0 ${COLORS.gold.edge}` } : { background: '#E5E5E5', boxShadow: '0 4px 0 #B7B7B7' }} aria-hidden="true">
                                <span className={a.earned ? '' : 'opacity-40 grayscale'}>{a.emoji}</span>
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-1.5 text-[17px] font-extrabold text-[#3c3c3c]">{a.title}{!a.earned && <Lock size={14} className="text-[#AFAFAF]" />}</p>
                                <div className="mt-1.5 flex items-center gap-2">
                                    <Bar value={(a.current / a.target) * 100} color="gold" className="h-3.5 flex-1" label={`${a.title}: ${a.current} of ${a.target}`} />
                                    <span className="w-12 text-right text-xs font-extrabold tabular-nums text-[#AFAFAF]">{a.current}/{a.target}</span>
                                </div>
                                <p className="mt-1 text-sm font-semibold text-[#777]">{a.description}</p>
                            </div>
                        </li>
                    ))}
                </Panel>
            </section>

            <section aria-labelledby="ling-certs">
                <h2 id="ling-certs" className="mb-1 text-2xl font-extrabold text-[#3c3c3c]">{dash.course && dash.course.code !== 'en' ? `${dash.course.name} certificates` : 'Certificates'}</h2>
                <p className="mb-3 text-[15px] font-semibold text-[#777]">Finish every lesson of a level with an average quiz score of {dash.certificateMinAverage}% or more.</p>
                {error && <p className="mb-2 text-sm font-bold" style={{ color: COLORS.red.ink }} role="alert">{error}</p>}
                <div className="grid gap-3 sm:grid-cols-3">
                    {dash.levels.map((l) => {
                        const c = COLORS[l.certificate ? CERT_COLOR[l.level] : 'grey'];
                        return (
                            <Panel key={l.level} className="flex flex-col items-center gap-2 p-4 text-center" data-level={l.level}>
                                <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: c.face, boxShadow: `0 4px 0 ${c.edge}` }}><Award size={28} className={l.certificate ? 'text-white' : 'text-[#AFAFAF]'} /></span>
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
