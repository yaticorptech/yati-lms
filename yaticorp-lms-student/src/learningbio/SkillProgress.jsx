/** Skills as bars with a status the LMS can actually stand behind. */
import { useEffect, useState } from 'react';
import { CheckCircle2, BadgeCheck } from 'lucide-react';
import { STATUS_TONE } from './api';
import { Empty } from './ui';

export default function SkillProgress({ skills = [], limit }) {
    const [go, setGo] = useState(false);
    useEffect(() => { const t = setTimeout(() => setGo(true), 80); return () => clearTimeout(t); }, []);
    const rows = limit ? skills.slice(0, limit) : skills;
    if (!rows.length) return <Empty title="No skills yet">Skills appear as you finish lessons, quizzes and roadmap tasks.</Empty>;
    return (
        <ul className="stagger space-y-3">
            {rows.map((s) => {
                const tone = STATUS_TONE[s.status] || STATUS_TONE.Learning;
                return (
                    <li key={s.name}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                            <span className="flex min-w-0 items-center gap-1.5 font-semibold text-slate-800">
                                <span className="truncate">{s.name}</span>
                                {s.evidence?.certified && <BadgeCheck size={14} className="shrink-0 text-emerald-600" aria-label="Certified" />}
                                {s.evidence?.assessed && !s.evidence?.certified && <CheckCircle2 size={14} className="shrink-0 text-emerald-600" aria-label="Assessed" />}
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${tone.chip}`}>{s.status}</span>
                                <span className="w-9 text-right text-xs tabular-nums text-slate-500">{s.percent}%</span>
                            </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={s.percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.name} ${s.status}`}>
                            <div className={`h-full rounded-full bg-gradient-to-r ${tone.bar} transition-[width] duration-700 ease-out`} style={{ width: go ? `${s.percent}%` : '0%' }} />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
