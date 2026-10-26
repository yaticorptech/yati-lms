/**
 * A step-by-step learning guide: the steps down the side (a step picker on a
 * phone), the chosen step's explanation, to-do list, examples, tips and free
 * tools, with Previous / Next. Used for publishing a paper, avoiding
 * plagiarism and academic writing. All content is in the app — no service.
 */
import { BookOpenText, ChevronLeft, ChevronRight, CheckCircle2, Lightbulb, ExternalLink, ChevronDown, XCircle } from 'lucide-react';
import { btn, selectClass } from './kit';
import Select from '../components/Select';

// Written out in full: Tailwind cannot see class names put together at runtime.
const TONES = {
    violet: { head: 'bg-violet-50/70 hover:bg-violet-50', border: 'border-violet-200', icon: 'border-violet-600 bg-violet-600 text-white', label: 'text-violet-600', on: 'bg-violet-50 font-semibold text-violet-800 ring-1 ring-violet-200', num: 'bg-violet-600 text-white', done: 'bg-violet-100 text-violet-700', check: 'text-violet-500' },
    indigo: { head: 'bg-indigo-50/70 hover:bg-indigo-50', border: 'border-indigo-200', icon: 'border-indigo-600 bg-indigo-600 text-white', label: 'text-indigo-600', on: 'bg-indigo-50 font-semibold text-indigo-800 ring-1 ring-indigo-200', num: 'bg-indigo-600 text-white', done: 'bg-indigo-100 text-indigo-700', check: 'text-indigo-500' },
    slate: { head: 'bg-slate-50 hover:bg-slate-100', border: 'border-slate-200', icon: 'border-slate-700 bg-slate-700 text-white', label: 'text-slate-600', on: 'bg-slate-100 font-semibold text-slate-900 ring-1 ring-slate-300', num: 'bg-slate-800 text-white', done: 'bg-slate-200 text-slate-700', check: 'text-sky-600' },
    rose: { head: 'bg-rose-50/70 hover:bg-rose-50', border: 'border-rose-200', icon: 'border-rose-600 bg-rose-600 text-white', label: 'text-rose-600', on: 'bg-rose-50 font-semibold text-rose-800 ring-1 ring-rose-200', num: 'bg-rose-600 text-white', done: 'bg-rose-100 text-rose-700', check: 'text-rose-500' }
};

const EXAMPLE_TONE = {
    good: ['border-emerald-200 bg-emerald-50/60', CheckCircle2, 'text-emerald-600'],
    bad: ['border-rose-200 bg-rose-50/60', XCircle, 'text-rose-600'],
    neutral: ['border-slate-200 bg-white', null, '']
};

export default function StepGuide({ id, title, subtitle, steps, open, onToggle, step, onStep, tone = 'violet', icon: Icon = BookOpenText }) {
    const t = TONES[tone];
    const index = Math.max(0, steps.findIndex((s) => s.key === step));
    const current = steps[index];
    return (
        <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-24 overflow-hidden rounded-xl border ${t.border} bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]`}>
            <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={`${id}-body`}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors sm:px-5 ${t.head} ${open ? `border-b ${t.border}` : ''}`}>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${t.icon}`}><Icon size={18} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                    <span id={`${id}-title`} className="block text-sm font-semibold text-slate-900 sm:text-base">{title}</span>
                    {/* The description only where there is room; a phone gets the title alone. */}
                    {subtitle && <span className="hidden text-xs text-slate-500 sm:block">{subtitle}</span>}
                </span>
                <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>

            {open && (
                // grid-cols-1 is minmax(0, 1fr): the step picker's long option names
                // would otherwise widen the phone column past the screen.
                <div id={`${id}-body`} className="grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-[16rem_minmax(0,1fr)]">
                    <div className="min-w-0 md:hidden">
                        <label htmlFor={`${id}-step`} className="mb-1 block text-xs font-semibold text-slate-600">Step</label>
                        <Select tone="emerald" id={`${id}-step`} value={current.key} onChange={(e) => onStep(e.target.value)} className={selectClass}>
                            {steps.map((s, i) => <option key={s.key} value={s.key}>{i + 1}. {s.title}</option>)}
                        </Select>
                    </div>
                    <ol className="hidden space-y-0.5 md:block" aria-label="Steps">
                        {steps.map((s, i) => (
                            <li key={s.key}>
                                <button type="button" onClick={() => onStep(s.key)} aria-current={s.key === current.key ? 'step' : undefined}
                                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm ${s.key === current.key ? t.on : 'text-slate-600 hover:bg-slate-50'}`}>
                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${s.key === current.key ? t.num : i < index ? t.done : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                                    <span className="min-w-0">{s.title}</span>
                                </button>
                            </li>
                        ))}
                    </ol>

                    <article className="min-w-0 space-y-4" aria-live="polite">
                        <div>
                            <p className={`text-xs font-semibold uppercase tracking-wider ${t.label}`}>Step {index + 1} of {steps.length}</p>
                            <h3 className="mt-0.5 text-lg font-semibold text-slate-900">{current.title}</h3>
                            <p className="mt-1 text-sm leading-relaxed text-slate-600">{current.summary}</p>
                        </div>
                        {current.todo?.length > 0 && (
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                                <h4 className="mb-2 text-sm font-semibold text-slate-900">{current.todoTitle || 'What to do'}</h4>
                                <ul className="space-y-2">
                                    {current.todo.map((x) => <li key={x} className="flex gap-2 text-sm leading-relaxed text-slate-700"><CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${t.check}`} aria-hidden="true" />{x}</li>)}
                                </ul>
                            </div>
                        )}
                        {current.examples?.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-slate-900">{current.examplesTitle || 'Examples'}</h4>
                                {current.examples.map((ex) => {
                                    const [cls, ExIcon, iconTone] = EXAMPLE_TONE[ex.tone || 'neutral'];
                                    return (
                                        <div key={ex.label} className={`rounded-xl border p-3 ${cls}`}>
                                            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{ExIcon && <ExIcon size={14} className={iconTone} aria-hidden="true" />}{ex.label}</p>
                                            <p className="mt-1 whitespace-pre-line font-serif text-[15px] leading-7 text-slate-800">{ex.text}</p>
                                            {ex.note && <p className="mt-1 text-xs text-slate-500">{ex.note}</p>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {current.tips?.length > 0 && (
                            <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                                <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-900"><Lightbulb size={15} className="text-amber-500" aria-hidden="true" /> Tips</h4>
                                <ul className="space-y-1.5">{current.tips.map((x) => <li key={x} className="text-sm leading-relaxed text-slate-700">{x}</li>)}</ul>
                            </div>
                        )}
                        {current.links?.length > 0 && (
                            <div>
                                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Useful resources</h4>
                                <div className="flex flex-wrap gap-2">
                                    {current.links.map(([label, url]) => (
                                        <a key={url} href={url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400">
                                            {label} <ExternalLink size={12} aria-hidden="true" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                            <button type="button" onClick={() => onStep(steps[index - 1].key)} disabled={index === 0} className={btn.secondary}><ChevronLeft size={15} /> Previous</button>
                            <button type="button" onClick={() => onStep(steps[index + 1].key)} disabled={index === steps.length - 1} className={btn.primary}>Next <ChevronRight size={15} /></button>
                        </div>
                    </article>
                </div>
            )}
        </section>
    );
}
