/**
 * Research Methodologies: twelve design guides — when each fits, how to run
 * it, how to analyse it, how to keep it rigorous and ethical — and an
 * advisor that suggests the designs to use, from six questions answered or
 * from the research question written out.
 * The guides and the advisor are part of the app; nothing is saved here.
 * The Questionnaire builder opens from here as a popup (QuestionnaireBuilder,
 * asked 2026-10-27): its surveys are saved, and download as Word files.
 */
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FlaskConical, Sparkles, ListChecks, Lightbulb, BarChart3, Users, ShieldCheck, Scale, Wrench, AlertTriangle, HelpCircle, Search, ChevronLeft, RotateCcw, ClipboardList } from 'lucide-react';
import { PageHeader, Card, ErrorNote, Badge, Modal, Progress } from '../ui';
import { METHODS, BY_KEY, adviseByKeywords } from '../content/methodologies';
import { ADVISOR_QUESTIONS, adviseByAnswers } from '../content/methodAdvisor';
import { btn, inputClass } from '../kit';
import QuestionnaireBuilder from '../QuestionnaireBuilder';

const FAMILY_TONE = {
    Quantitative: 'bg-sky-100 text-sky-700',
    Qualitative: 'bg-violet-100 text-violet-700',
    Mixed: 'bg-amber-100 text-amber-700',
    Review: 'bg-emerald-100 text-emerald-700',
    Applied: 'bg-rose-100 text-rose-700'
};

const Section = ({ icon: Icon, title, items, text }) => (
    <section className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"><Icon size={16} className="text-emerald-600" aria-hidden="true" /> {title}</h3>
        {text && <p className="text-sm leading-relaxed text-slate-700">{text}</p>}
        {items && (
            <ul className="space-y-1.5">
                {items.map((x) => <li key={x} className="flex gap-2 text-sm leading-relaxed text-slate-700"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />{x}</li>)}
            </ul>
        )}
    </section>
);

/** The six questions, one at a time; the last answer shows the suggestions. */
const AdvisorQuestions = ({ onAdvice }) => {
    const [answers, setAnswers] = useState({});
    const [at, setAt] = useState(0);
    const q = ADVISOR_QUESTIONS[at];
    const done = at >= ADVISOR_QUESTIONS.length;
    const pick = (option) => {
        const next = { ...answers, [q.key]: option };
        setAnswers(next);
        if (at === ADVISOR_QUESTIONS.length - 1) onAdvice(adviseByAnswers(next));
        setAt(at + 1);
    };
    const restart = () => { setAnswers({}); setAt(0); onAdvice(null); };
    if (done) {
        return (
            <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-700">Here is what fits your answers.</p>
                <button type="button" onClick={() => { setAt(ADVISOR_QUESTIONS.length - 1); onAdvice(null); }} className={btn.ghost}><ChevronLeft size={14} /> Change last answer</button>
                <button type="button" onClick={restart} className={btn.ghost}><RotateCcw size={13} /> Start again</button>
            </div>
        );
    }
    return (
        <fieldset className="space-y-3">
            <legend className="sr-only">{q.question}</legend>
            <div className="flex items-center gap-3">
                <Progress value={(at / ADVISOR_QUESTIONS.length) * 100} tone="bg-sky-500" label="Questions answered" />
                <span className="shrink-0 text-xs font-semibold text-slate-500">Question {at + 1} of {ADVISOR_QUESTIONS.length}</span>
            </div>
            <p className="text-base font-semibold text-slate-900" aria-hidden="true">{q.question}</p>
            <div className="grid gap-2 sm:grid-cols-2">
                {q.options.map((o) => (
                    <button key={o.key} type="button" onClick={() => pick(o.key)} aria-pressed={answers[q.key] === o.key}
                        className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors ${answers[q.key] === o.key ? 'border-sky-400 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50/50'}`}>
                        {o.label}
                    </button>
                ))}
            </div>
            {at > 0 && <button type="button" onClick={() => setAt(at - 1)} className={btn.ghost}><ChevronLeft size={14} /> Back</button>}
        </fieldset>
    );
};

export default function Methodologies() {
    const { key } = useParams();
    const navigate = useNavigate();
    const methods = METHODS;
    const [family, setFamily] = useState('All');
    const [query, setQuery] = useState('');
    const [question, setQuestion] = useState('');
    const [advice, setAdvice] = useState(null);
    const [adviceError, setAdviceError] = useState('');
    // How the advisor is asked: six questions (for anyone), or the question written out.
    const [mode, setMode] = useState('questions');
    // ?questionnaire= opens the builder at that questionnaire (the dashboard's
    // "Continue where you left off"); closing it takes the link away.
    const [params, setParams] = useSearchParams();
    const [builderOpen, setBuilderOpen] = useState(() => Boolean(params.get('questionnaire')));
    const closeBuilder = () => { setBuilderOpen(false); if (params.get('questionnaire')) setParams({}, { replace: true }); };

    const byKey = BY_KEY;
    const open = key ? byKey.get(key) : null;
    const families = ['All', ...new Set((methods || []).map((m) => m.family))];
    const shown = (methods || []).filter((m) => (family === 'All' || m.family === family)
        && (!query.trim() || `${m.name} ${m.summary} ${m.bestFor.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())));

    // The advisor matches the question's words with each design's — in the app, at once.
    const ask = (e) => {
        e.preventDefault();
        setAdviceError('');
        if (question.trim().length < 15) { setAdviceError('Write your research question in a sentence or two.'); return; }
        setAdvice(adviseByKeywords(question.trim()));
    };

    return (
        <div className="space-y-6">
            <PageHeader icon={FlaskConical} color="sky" title="Research Methodologies"
                subtitle="Choose the right design for your question, then run it well." />

            <Card>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Sparkles size={17} className="text-sky-600" aria-hidden="true" /> Which design suits my research?</h2>
                    <div className="flex rounded-xl bg-white p-1 ring-1 ring-slate-200" role="radiogroup" aria-label="How to ask">
                        {[['questions', 'Answer 6 questions'], ['describe', 'Describe my question']].map(([k, label]) => (
                            <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => { setMode(k); setAdvice(null); setAdviceError(''); }}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === k ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>
                        ))}
                    </div>
                </div>
                {mode === 'questions' && <AdvisorQuestions onAdvice={setAdvice} />}
                {mode === 'describe' && (
                <form onSubmit={ask} className="space-y-3">
                    <label htmlFor="advisor-question" className="block text-sm font-semibold text-slate-700">Your research question</label>
                    <textarea id="advisor-question" rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={800}
                        className={`${inputClass} resize-y`} placeholder="e.g. What is the effect of peer tutoring on first-year students' mathematics anxiety in rural colleges?" />
                    <div className="flex flex-wrap items-center gap-3">
                        <button type="submit" className={btn.primary}><Sparkles size={15} /> Get advice</button>
                        <span className="text-xs text-slate-500">Name the people, the setting and what you want to find out.</span>
                    </div>
                    <ErrorNote>{adviceError}</ErrorNote>
                </form>
                )}
                {advice && (
                    <div className="mt-4 space-y-3 border-t border-sky-100 pt-4" aria-live="polite">
                        <p className="text-xs font-semibold text-slate-500">{mode === 'questions' ? 'Suggested from your answers.' : 'Matched from the words in your question.'} Read each guide to check it fits.</p>
                        <div className="grid gap-3 md:grid-cols-3">
                            {advice.recommendations.map((r) => {
                                const m = byKey.get(r.key);
                                return (
                                    <button key={r.key} type="button" onClick={() => navigate(`/teacher/methods/${r.key}`)}
                                        className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-colors hover:border-sky-300">
                                        <div className="flex flex-wrap items-center gap-1.5"><Badge tone={r.fit === 'strong' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>{r.fit === 'strong' ? 'Strong fit' : 'Possible fit'}</Badge>{m && <Badge tone={FAMILY_TONE[m.family]}>{m.family}</Badge>}</div>
                                        <p className="mt-2 text-sm font-semibold text-slate-900">{m?.name || r.key}</p>
                                        <p className="mt-1 text-xs leading-relaxed text-slate-600">{r.why}</p>
                                        <p className="mt-2 text-xs font-semibold text-sky-700">Read the guide →</p>
                                    </button>
                                );
                            })}
                        </div>
                        {advice.design && <p className="rounded-xl bg-white p-3 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200"><strong>Suggested design: </strong>{advice.design}</p>}
                        {advice.questionsToConsider?.length > 0 && (
                            <ul className="space-y-1 text-sm text-slate-700">{advice.questionsToConsider.map((q) => <li key={q} className="flex gap-2"><HelpCircle size={15} className="mt-0.5 shrink-0 text-sky-600" aria-hidden="true" />{q}</li>)}</ul>
                        )}
                    </div>
                )}
            </Card>

            <Card className="flex flex-wrap items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-600"><ClipboardList size={20} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1 basis-56">
                    <h2 className="text-sm font-semibold text-slate-900">Questionnaire builder</h2>
                    <p className="mt-0.5 text-sm text-slate-600">Build the survey for your data collection, with Likert-scale, multiple-choice and open questions, and download it as a Word file.</p>
                </div>
                <button type="button" onClick={() => setBuilderOpen(true)} className={`${btn.primary} w-full sm:w-auto`}><ClipboardList size={15} /> Open the builder</button>
            </Card>

            {(
                <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* One segmented bar: an even 3 × 2 grid on a phone, one row from sm up. */}
                        <div className="grid w-full grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 sm:inline-flex sm:w-auto" role="group" aria-label="Filter by kind">
                            {families.map((f) => (
                                <button key={f} type="button" aria-pressed={family === f} onClick={() => setFamily(f)}
                                    className={`min-w-0 truncate rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${family === f ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>{f}</button>
                            ))}
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the guides" aria-label="Search the guides" className={`${inputClass} pl-9`} />
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {shown.map((m) => (
                            <article key={m.key} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div><Badge tone={FAMILY_TONE[m.family]}>{m.family}</Badge></div>
                                <h2 className="mt-2 text-base font-semibold text-slate-900">{m.name}</h2>
                                <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-600">{m.summary}</p>
                                <button type="button" onClick={() => navigate(`/teacher/methods/${m.key}`)} className={`${btn.secondary} mt-3 w-full`}>Read the guide</button>
                            </article>
                        ))}
                        {!shown.length && <p className="text-sm text-slate-500">No guide matches that search.</p>}
                    </div>
                </>
            )}

            {open && (
                <Modal wide title={open.name} labelId="method-guide-title" onClose={() => navigate('/teacher/methods')}
                    footer={<button type="button" onClick={() => navigate('/teacher/methods')} className={btn.secondary}>Close</button>}>
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2"><Badge tone={FAMILY_TONE[open.family]}>{open.family}</Badge></div>
                        <p className="text-sm leading-relaxed text-slate-700">{open.summary}</p>
                        <div className="grid gap-3 md:grid-cols-2">
                            <Section icon={Lightbulb} title="Best for" items={open.bestFor} />
                            <Section icon={HelpCircle} title="Questions it answers" items={open.questionsLike} />
                        </div>
                        <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"><ListChecks size={16} className="text-emerald-600" aria-hidden="true" /> Steps</h3>
                            <ol className="space-y-2">
                                {open.steps.map((s, i) => <li key={s} className="flex gap-3 text-sm text-slate-700"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">{i + 1}</span><span className="pt-0.5">{s}</span></li>)}
                            </ol>
                        </section>
                        <div className="grid gap-3 md:grid-cols-2">
                            <Section icon={Users} title="Collecting data" items={open.dataCollection} />
                            <Section icon={BarChart3} title="Analysis" items={open.analysis} />
                            <Section icon={Users} title="Sampling" text={open.sampling} />
                            <Section icon={ShieldCheck} title="Rigour and quality" items={open.quality} />
                            <Section icon={Scale} title="Ethics" items={open.ethics} />
                            <Section icon={Wrench} title="Tools" items={open.tools} />
                        </div>
                        <Section icon={AlertTriangle} title="Common pitfalls" items={open.pitfalls} />
                    </div>
                </Modal>
            )}
            {builderOpen && <QuestionnaireBuilder initialId={params.get('questionnaire')} onClose={closeBuilder} />}
        </div>
    );
}
