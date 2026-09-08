/** The learning journey as a vertical timeline, grouped by year, newest first. */
import { useState } from 'react';
import { BookOpen, Award, Rocket, Trophy, Flag, Sparkles, PlayCircle } from 'lucide-react';
import { fmtDate } from './api';
import { Empty } from './ui';

const ICON = { course: BookOpen, certificate: Award, project: Rocket, achievement: Trophy, goal: Flag, joined: Sparkles, started: PlayCircle };
const TONE = { course: 'bg-indigo-600', certificate: 'bg-amber-500', project: 'bg-emerald-500', achievement: 'bg-rose-500', goal: 'bg-violet-600', joined: 'bg-slate-400', started: 'bg-sky-500' };

export default function LearningTimeline({ events = [] }) {
    const [showAll, setShowAll] = useState(false);
    const [active, setActive] = useState(null);
    if (!events.length) return <Empty title="Your journey starts here">Finish a lesson or a course and it appears on this timeline.</Empty>;
    const rows = showAll ? events : events.slice(0, 8);
    return (
        <div>
            <ol className="stagger relative ml-3 border-l-2 border-slate-200">
                {rows.map((e, i) => {
                    const year = new Date(e.date).getFullYear();
                    const showYear = i === 0 || new Date(rows[i - 1].date).getFullYear() !== year;
                    const Icon = ICON[e.kind] || Sparkles;
                    const on = active === i;
                    return (
                        <li key={`${e.title}-${i}`} className="relative pb-5 pl-6 last:pb-0">
                            {showYear && <p className="mb-2 -ml-6 inline-block rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-black tracking-wider text-white">{year}</p>}
                            <span className={`absolute -left-[13px] ${showYear ? 'top-8' : 'top-0.5'} flex h-6 w-6 items-center justify-center rounded-full ${TONE[e.kind] || 'bg-slate-400'} text-white shadow ring-4 ring-white`}><Icon size={12} /></span>
                            <button type="button" onClick={() => setActive(on ? null : i)} aria-expanded={on}
                                className={`w-full rounded-xl border px-3 py-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${on ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'}`}>
                                <p className="text-sm font-semibold text-slate-800">{e.title}</p>
                                <p className="text-xs text-slate-500">{fmtDate(e.date)}{e.detail ? ` · ${e.detail}` : ''}</p>
                                {on && <p className="mt-1 text-xs text-indigo-700">{{ course: 'A course finished end to end.', certificate: 'Issued by YATI LMS on completion.', project: 'A completed build task on your Career Path roadmap.', achievement: 'An achievement unlocked by your activity.', goal: 'Where your Career Path roadmap is heading.', joined: 'Where it all began.', started: 'In progress — keep going.' }[e.kind]}</p>}
                            </button>
                        </li>
                    );
                })}
            </ol>
            {events.length > 8 && <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-xs font-bold text-indigo-600 hover:underline">{showAll ? 'Show less' : `Show all ${events.length} events`}</button>}
        </div>
    );
}
