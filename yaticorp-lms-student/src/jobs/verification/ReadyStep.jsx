/** Every required step ticked, one button into the board. */
import { PartyPopper, Briefcase, CheckCircle2 } from 'lucide-react';
import { Card, PrimaryButton } from './ui';
export default function ReadyStep({ view, onExplore, busy }) {
    const s = view.steps, r = view.requirements || {};
    const rows = [
        r.requireAadhaar !== false && ['Aadhaar Verified', s.identity?.status === 'VERIFIED'],
        r.requireLinkedin !== false && ['LinkedIn Profile Added', s.linkedin?.status === 'ADDED'],
        r.requireResume !== false && ['Resume Uploaded', s.resume?.status === 'ADDED'],
        r.requireLocation !== false && ['Location Added', !!s.profile?.location?.label],
        r.requireSkills !== false && ['Skills Added', (s.profile?.skills?.length || 0) > 0]
    ].filter(Boolean);
    return (<Card className="animate-fade-in-up text-center"><span className="animate-pop-in mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-300 ring-8 ring-indigo-50"><PartyPopper size={36} /></span><h2 className="mt-5 text-2xl font-extrabold text-slate-900">Your Job Profile Is Ready!</h2><ul className="stagger mx-auto mt-5 max-w-xs space-y-2 text-left">{rows.map(([label, done]) => <li key={label} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold ${done ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-500'}`}><CheckCircle2 size={17} className={done ? 'text-emerald-500' : 'text-slate-300'} /> {label}</li>)}</ul><p className="mt-5 text-sm text-slate-500">We&apos;re ready to find opportunities for you.</p><PrimaryButton className="mt-6" onClick={onExplore} loading={busy} loadingText="Opening Jobs…" icon={Briefcase}>Explore Job Matches</PrimaryButton></Card>);
}
