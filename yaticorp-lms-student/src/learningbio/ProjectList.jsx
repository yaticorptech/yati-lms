/** Projects — build-type work the student completed on their Career Path roadmap. */
import { Rocket, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fmtDate } from './api';
import { Empty } from './ui';

export default function ProjectList({ projects = [] }) {
    if (!projects.length) return <Empty icon={Rocket} title="No projects yet">Complete a build task on your Career Path roadmap and it shows up here as a project.</Empty>;
    return (
        <ul className="stagger grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
                <li key={p.id} className="lift flex flex-col rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-4">
                    <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><Rocket size={20} /></span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900">{p.name}</p>
                            {p.description && <p className="mt-0.5 line-clamp-3 text-xs text-slate-600">{p.description}</p>}
                        </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {(p.skills || []).map((s) => <span key={s} className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">{s}</span>)}
                        <span className="ml-auto rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{p.status}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>{fmtDate(p.completedAt)}</span>
                        <Link to="/career/planner" className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline">View Project <ArrowRight size={12} /></Link>
                    </div>
                </li>
            ))}
        </ul>
    );
}
