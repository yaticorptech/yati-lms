/**
 * @description The popup a student meets at /jobs before their skills are far
 *              enough along to open it. Drawn to the supplied mock: lock in a
 *              peach disc with faint rings and sparkles, soft blobs in the
 *              corners, a round close button and one big gradient action.
 *
 * The rule is five Career Path skills, each at 25% or more (see
 * hooks/useJobsAccess). The popup shows how many are there already and each
 * skill against the bar, because "two more to go" is a far better answer than
 * "no" when they are most of the way there.
 *
 * On <body>, through a portal: rendered in place it sits inside the page's
 * animated wrappers, where the app's header and bottom bar can paint over it.
 */
import { Link } from 'react-router-dom';
import { Lock, ArrowRight, X, Check, Sparkles, RefreshCw, Home } from 'lucide-react';
import Portal from '../components/Portal';

/** The skills shown: enough to see the way to five, never a long list. */
const SHOWN = 6;

const Skill = ({ name, progress, bar }) => {
    const done = progress >= bar;
    return (
        <li className="flex items-center gap-3">
            <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                {done ? <Check size={14} strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-semibold text-slate-700">{name}</span>
                    <span className={`shrink-0 tabular-nums font-bold ${done ? 'text-emerald-600' : 'text-slate-500'}`}>{progress}%</span>
                </div>
                {/* The bar, with a tick where 25% is. */}
                <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}
                    aria-label={`${name}: ${progress} percent, ${bar} percent needed`}>
                    <div className={`h-full rounded-full ${done ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`}
                        style={{ width: `${Math.max(2, progress)}%` }} />
                    <span aria-hidden="true" className="absolute inset-y-0 w-0.5 bg-slate-400/70" style={{ left: `${bar}%` }} />
                </div>
            </div>
        </li>
    );
};

export default function JobsLockedNotice({
    failed = false, retry, ready = 0, required = { skills: 5, percent: 25 }, skills = [], careerPathEnabled = true
}) {
    const need = required.skills;
    const bar = required.percent;
    const left = Math.max(0, need - ready);
    const fewer = Math.max(0, need - skills.length);
    const action = 'relative flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3.5 text-lg font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2';

    return (
        <Portal>
            <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                <div className="flex min-h-full items-center justify-center p-4">
                    <div role="dialog" aria-modal="true" aria-labelledby="jobs-locked-title"
                        className="relative w-full max-w-lg overflow-hidden rounded-[32px] bg-white px-6 pb-8 pt-10 text-center shadow-2xl sm:px-10">
                        {/* corner blobs */}
                        <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-indigo-100/80 blur-2xl" />
                        <span aria-hidden="true" className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-orange-100/70 blur-2xl" />

                        {/* close */}
                        <Link to="/" aria-label="Close"
                            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50/80 text-indigo-600 transition-colors hover:bg-indigo-100">
                            <X size={20} strokeWidth={2.5} />
                        </Link>

                        {/* lock with rings and sparkles */}
                        <div className="relative mx-auto mb-5 h-32 w-32">
                            <span aria-hidden="true" className="absolute inset-0 rounded-full border border-indigo-100/80" />
                            <span aria-hidden="true" className="absolute inset-3 rounded-full border border-indigo-100" />
                            <div className="animate-pop-in absolute inset-6 flex items-center justify-center rounded-full bg-gradient-to-br from-orange-50 to-amber-100 shadow-lg shadow-orange-100">
                                <Lock size={38} strokeWidth={2} className="text-orange-400" />
                            </div>
                            <span aria-hidden="true" className="absolute left-2 top-5 h-2 w-2 rounded-full bg-indigo-300" />
                            <span aria-hidden="true" className="absolute right-1 top-1/2 h-1.5 w-1.5 rounded-full bg-indigo-300" />
                            <span aria-hidden="true" className="absolute right-3 top-2 text-lg text-orange-300">✦</span>
                            <span aria-hidden="true" className="absolute bottom-4 left-0 text-lg text-indigo-300">✦</span>
                        </div>

                        {failed ? (
                            <>
                                <h2 id="jobs-locked-title" className="relative mb-2 text-2xl font-extrabold text-slate-800 sm:text-3xl">We couldn&apos;t check just now</h2>
                                <p className="relative mx-auto mb-6 max-w-sm text-base text-slate-500">Whether the Jobs section is open for you could not be checked. Check your connection and try again.</p>
                                <button type="button" onClick={retry} className={action}>
                                    <RefreshCw size={22} /> <span>Try again</span> <ArrowRight size={22} />
                                </button>
                            </>
                        ) : (
                            <>
                                <h2 id="jobs-locked-title" className="relative mb-2 text-2xl font-extrabold text-slate-800 sm:text-3xl">
                                    {ready ? 'Keep growing your skills' : 'Grow your skills to open Jobs'}
                                </h2>
                                <p className="relative mx-auto mb-5 max-w-sm text-base text-slate-500">
                                    The Jobs section opens when <strong className="font-bold text-slate-700">{need} skills</strong> in Career Path are each at <strong className="font-bold text-slate-700">{bar}%</strong> or more.
                                    {' '}{ready
                                        ? <>You have <strong className="font-bold text-slate-700">{ready} of {need}</strong> — {left} more to go.</>
                                        : <>None are there yet.</>}
                                </p>

                                {/* Skills ready, out of the five needed */}
                                <div className="relative mx-auto mb-5 max-w-sm" data-skills-ready={ready}>
                                    <div className="mb-1.5 flex items-baseline justify-between text-sm font-bold">
                                        <span className="text-slate-600">Skills ready</span>
                                        <span className="tabular-nums text-indigo-600">{ready} / {need}</span>
                                    </div>
                                    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${need}, minmax(0, 1fr))` }} aria-hidden="true">
                                        {Array.from({ length: need }, (_, i) => (
                                            <span key={i} className={`h-2.5 rounded-full ${i < ready ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-slate-100'}`} />
                                        ))}
                                    </div>
                                </div>

                                {skills.length > 0 && (
                                    <ul className="relative mx-auto mb-4 max-w-sm space-y-2.5 rounded-2xl border border-slate-100 bg-white/80 p-3.5 text-left">
                                        {skills.slice(0, SHOWN).map((s) => <Skill key={s.name} {...s} bar={bar} />)}
                                    </ul>
                                )}
                                {fewer > 0 && (
                                    <p className="relative mx-auto mb-5 max-w-sm text-sm text-slate-500">
                                        <Sparkles size={14} className="mr-1 inline text-amber-400" aria-hidden="true" />
                                        {skills.length ? <>Add {fewer} more {fewer === 1 ? 'skill' : 'skills'} in Career Path to reach {need}.</> : <>Set up your skills in Career Path to start.</>}
                                    </p>
                                )}

                                {careerPathEnabled ? (
                                    <Link to="/career/skills" className={action}>
                                        <Sparkles size={22} /> <span>Grow my skills</span> <ArrowRight size={22} />
                                    </Link>
                                ) : (
                                    <>
                                        <p className="relative mx-auto mb-4 max-w-sm rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">Career Path is switched off for now. Ask your admin to turn it on so your skills can grow.</p>
                                        <Link to="/" className={action}>
                                            <Home size={22} /> <span>Back to home</span> <ArrowRight size={22} />
                                        </Link>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Portal>
    );
}
