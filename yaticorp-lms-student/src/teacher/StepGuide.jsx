/**
 * A step-by-step learning guide: the steps down the side (a step picker on a
 * phone), the chosen step's explanation, to-do list, examples, tips and free
 * tools, with Previous / Next. Used for publishing a paper, avoiding
 * plagiarism and academic writing. All content is in the app — no service.
 * With `onToggleRead`, each step can be marked as read, and the guide shows
 * how many are.
 */
import { BookOpenText, ChevronLeft, ChevronRight, CheckCircle2, Lightbulb, ExternalLink, ChevronDown, XCircle, Check } from 'lucide-react';
import { btn, inputClass } from './kit';

// Written out in full: Tailwind cannot see class names put together at runtime.
const TONES = {
    violet: { head: 'from-violet-50 to-fuchsia-50', border: 'border-violet-200', icon: 'bg-violet-600', label: 'text-violet-600', on: 'bg-violet-50 font-bold text-violet-800 ring-1 ring-violet-200', num: 'bg-violet-600 text-white', done: 'bg-violet-100 text-violet-700', check: 'text-violet-500' },
    slate: { head: 'from-slate-100 to-sky-50', border: 'border-slate-300', icon: 'bg-slate-800', label: 'text-slate-600', on: 'bg-slate-100 font-bold text-slate-900 ring-1 ring-slate-300', num: 'bg-slate-800 text-white', done: 'bg-slate-200 text-slate-700', check: 'text-sky-600' },
    rose: { head: 'from-rose-50 to-pink-50', border: 'border-rose-200', icon: 'bg-rose-600', label: 'text-rose-600', on: 'bg-rose-50 font-bold text-rose-800 ring-1 ring-rose-200', num: 'bg-rose-600 text-white', done: 'bg-rose-100 text-rose-700', check: 'text-rose-500' }
};

const EXAMPLE_TONE = {
    good: ['border-emerald-200 bg-emerald-50/60', CheckCircle2, 'text-emerald-600'],
    bad: ['border-rose-200 bg-rose-50/60', XCircle, 'text-rose-600'],
    neutral: ['border-slate-200 bg-white', null, '']
};

export default function StepGuide({ id, title, subtitle, steps, open, onToggle, step, onStep, tone = 'violet', icon: Icon = BookOpenText, read = [], onToggleRead }) {
    const t = TONES[tone];
    const index = Math.max(0, steps.findIndex((s) => s.key === step));
    const current = steps[index];
    const readSet = new Set(read);
    const readCount = steps.filter((s) => readSet.has(s.key)).length;
    const currentRead = readSet.has(current.key);
    return (
        <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-24 overflow-hidden rounded-2xl border ${t.border} bg-white shadow-sm`}>
            <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={`${id}-body`}
                className={`flex w-full items-center gap-3 bg-gradient-to-r ${t.head} px-4 py-3.5 text-left sm:px-5`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.icon} text-white shadow`}><Icon size={20} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                    <span id={`${id}-title`} className="block text-sm font-black text-slate-900 sm:text-base">{title}</span>
                    {subtitle && <span className="block text-xs text-slate-500">{subtitle}</span>}
                </span>
                {onToggleRead && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black ${readCount === steps.length ? 'bg-emerald-100 text-emerald-700' : 'bg-white/80 text-slate-600 ring-1 ring-slate-200'}`}>
                        {readCount === steps.length ? 'All read' : `${readCount} of ${steps.length} read`}
                    </span>
                )}
                <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>

            {open && (
                // grid-cols-1 is minmax(0, 1fr): the step picker's long option names
                // would otherwise widen the phone column past the screen.
                <div id={`${id}-body`} className="grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-[16rem_minmax(0,1fr)]">
                    <div className="min-w-0 md:hidden">
                        <label htmlFor={`${id}-step`} className="mb-1 block text-xs font-bold text-slate-600">Step</label>
                        <select id={`${id}-step`} value={current.key} onChange={(e) => onStep(e.target.value)} className={inputClass}>
                            {steps.map((s, i) => <option key={s.key} value={s.key}>{i + 1}. {s.title}{readSet.has(s.key) ? ' ✓' : ''}</option>)}
                        </select>
                    </div>
                    <ol className="hidden space-y-0.5 md:block" aria-label="Steps">
                        {steps.map((s, i) => (
                            <li key={s.key}>
                                <button type="button" onClick={() => onStep(s.key)} aria-current={s.key === current.key ? 'step' : undefined}
                                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm ${s.key === current.key ? t.on : 'text-slate-600 hover:bg-slate-50'}`}>
                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${s.key === current.key ? t.num : readSet.has(s.key) || (!onToggleRead && i < index) ? t.done : 'bg-slate-100 text-slate-500'}`}>
                                        {readSet.has(s.key) && s.key !== current.key ? <Check size={13} strokeWidth={3} aria-label="read" /> : i + 1}
                                    </span>
                                    <span className="min-w-0">{s.title}</span>
                                </button>
                            </li>
                        ))}
                    </ol>

                    <article className="min-w-0 space-y-4" aria-live="polite">
                        <div>
                            <p className={`text-xs font-black uppercase tracking-wider ${t.label}`}>Step {index + 1} of {steps.length}</p>
                            <h3 className="mt-0.5 text-lg font-black text-slate-900">{current.title}</h3>
                            <p className="mt-1 text-sm leading-relaxed text-slate-600">{current.summary}</p>
                        </div>
                        {current.todo?.length > 0 && (
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                                <h4 className="mb-2 text-sm font-black text-slate-900">{current.todoTitle || 'What to do'}</h4>
                                <ul className="space-y-2">
                                    {current.todo.map((x) => <li key={x} className="flex gap-2 text-sm leading-relaxed text-slate-700"><CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${t.check}`} aria-hidden="true" />{x}</li>)}
                                </ul>
                            </div>
                        )}
                        {current.examples?.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-black text-slate-900">{current.examplesTitle || 'Examples'}</h4>
                                {current.examples.map((ex) => {
                                    const [cls, ExIcon, iconTone] = EXAMPLE_TONE[ex.tone || 'neutral'];
                                    return (
                                        <div key={ex.label} className={`rounded-xl border p-3 ${cls}`}>
                                            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">{ExIcon && <ExIcon size={14} className={iconTone} aria-hidden="true" />}{ex.label}</p>
                                            <p className="mt-1 whitespace-pre-line font-serif text-[15px] leading-7 text-slate-800">{ex.text}</p>
                                            {ex.note && <p className="mt-1 text-xs text-slate-500">{ex.note}</p>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {current.tips?.length > 0 && (
                            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                                <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-black text-slate-900"><Lightbulb size={15} className="text-amber-500" aria-hidden="true" /> Tips</h4>
                                <ul className="space-y-1.5">{current.tips.map((x) => <li key={x} className="text-sm leading-relaxed text-slate-700">{x}</li>)}</ul>
                            </div>
                        )}
                        {current.links?.length > 0 && (
                            <div>
                                <h4 className="mb-1.5 text-xs font-black uppercase tracking-wider text-slate-500">Useful resources</h4>
                                <div className="flex flex-wrap gap-2">
                                    {current.links.map(([label, url]) => (
                                        <a key={url} href={url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-slate-400">
                                            {label} <ExternalLink size={12} aria-hidden="true" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                            <button type="button" onClick={() => onStep(steps[index - 1].key)} disabled={index === 0} className={btn.secondary}><ChevronLeft size={15} /> Previous</button>
                            {onToggleRead && (
                                <button type="button" onClick={() => onToggleRead(current.key, !currentRead)} aria-pressed={currentRead}
                                    className={currentRead ? 'inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200' : btn.secondary}>
                                    <Check size={15} /> {currentRead ? 'Read' : 'Mark as read'}
                                </button>
                            )}
                            <button type="button" onClick={() => onStep(steps[index + 1].key)} disabled={index === steps.length - 1} className={btn.primary}>Next <ChevronRight size={15} /></button>
                        </div>
                    </article>
                </div>
            )}
        </section>
    );
}
