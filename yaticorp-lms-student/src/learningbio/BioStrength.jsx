/**
 * Profile Strength: the bar, the number and the one thing that would raise it
 * most. `areas` opens a breakdown per area when asked for.
 */
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function BioStrength({ percent = 0, nextStep, areas, compact = false }) {
    // Animate from zero on mount so the bar visibly fills.
    const [width, setWidth] = useState(0);
    const [open, setOpen] = useState(false);
    useEffect(() => { const t = setTimeout(() => setWidth(percent), 60); return () => clearTimeout(t); }, [percent]);
    const tone = percent >= 80 ? 'from-emerald-500 to-teal-500' : percent >= 50 ? 'from-indigo-500 to-violet-500' : 'from-amber-400 to-orange-500';
    return (
        <div>
            <div className="flex items-center justify-between text-sm">
                <p className="font-semibold text-slate-700">Profile Strength</p>
                <p className="font-black tabular-nums text-slate-900">{percent}%</p>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Profile strength">
                <div className={`h-full rounded-full bg-gradient-to-r ${tone} transition-[width] duration-1000 ease-out`} style={{ width: `${width}%` }} />
            </div>
            {!compact && nextStep && <p className="mt-2 text-xs text-slate-600">Your profile is {percent}% complete. <span className="font-semibold text-indigo-700">{nextStep}</span></p>}
            {!compact && areas?.length > 0 && (
                <div className="mt-2">
                    <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600">
                        What counts <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                        <ul className="stagger mt-2 grid gap-1.5 sm:grid-cols-2">
                            {areas.map((a) => (
                                <li key={a.key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs">
                                    <span className={`h-2 w-2 shrink-0 rounded-full ${a.percent >= 100 ? 'bg-emerald-500' : a.percent > 0 ? 'bg-indigo-400' : 'bg-slate-300'}`} />
                                    <span className="flex-1 text-slate-700">{a.label}</span>
                                    <span className="tabular-nums text-slate-500">{a.have}/{a.target}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
