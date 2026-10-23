/**
 * Independent Writing: a daily word goal, the last two weeks, prompts to
 * start from, and every piece the teacher keeps — articles, essays, grant
 * proposals, reflections, notes.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PenLine, Plus, Target, Loader2, Shuffle, Pencil } from 'lucide-react';
import teacherApi, { messageOf } from '../teacherSession';
import { useTeacher } from '../useTeacher';
import { PageHeader, Card, CardTitle, Loading, ErrorNote, EmptyState, Modal, Field, Badge } from '../ui';
import { btn, inputClass, fmtNum, fmtDate, WRITING_KINDS } from '../kit';
import StepGuide from '../StepGuide';
import useGuideRead from '../useGuideRead';
import { WRITING_STEPS } from '../content/writing';

const KINDS = WRITING_KINDS;

const PROMPTS = [
    ['reflection', 'What did a class this week teach you about how your students learn?'],
    ['article', 'Explain your research in 300 words for a newspaper reader.'],
    ['notes', 'List three questions your field cannot yet answer, and why each matters.'],
    ['grant', 'Draft the "problem and significance" section of a grant proposal for your current project.'],
    ['essay', 'Argue for one change to how your subject is taught in Indian colleges.'],
    ['reflection', 'Describe a paper that changed your thinking, and what it changed.'],
    ['article', 'Write the abstract of the paper you want to publish next year.'],
    ['notes', 'Summarise the last three articles you read in two sentences each.'],
    ['essay', 'What does good mentoring of a research student look like?'],
    ['grant', 'Describe the method of your next study as if to a funding committee.'],
    ['reflection', 'Which part of your research process is slowest, and how could you speed it up?'],
    ['article', 'Write a blog post about a common misconception in your field.']
];

export default function Writing() {
    const navigate = useNavigate();
    const { teacher, setTeacher } = useTeacher();
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [prompt, setPrompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
    const [creating, setCreating] = useState(null);       // { title, kind }
    const [busy, setBusy] = useState(false);
    const [formError, setFormError] = useState('');
    const [goalOpen, setGoalOpen] = useState(false);
    const [goal, setGoal] = useState('');
    // "Academic writing, step by step": open until the first piece is written.
    const [guideOpen, setGuideOpen] = useState(null);
    const [guideStep, setGuideStep] = useState(WRITING_STEPS[0].key);
    const isGuideOpen = guideOpen ?? (data ? !data.pieces.length : false);
    const guideRead = useGuideRead('writing');

    const load = useCallback(() => teacherApi.get('/writing')
        .then((r) => { setData(r.data); setError(''); })
        .catch((e) => setError(messageOf(e, 'Your writing could not be loaded.'))), []);
    useEffect(() => { load(); }, [load]);

    const create = async (e) => {
        e?.preventDefault();
        setBusy(true); setFormError('');
        try { const r = await teacherApi.post('/writing', creating); navigate(`/teacher/writing/${r.data._id}`); }
        catch (err) { setFormError(messageOf(err, 'The piece could not be created.')); setBusy(false); }
    };
    const saveGoal = async (e) => {
        e.preventDefault();
        setFormError('');
        try { const r = await teacherApi.put('/me', { dailyWordGoal: Number(goal) }); setTeacher(r.data); setGoalOpen(false); load(); }
        catch (err) { setFormError(messageOf(err, 'The goal could not be saved.')); }
    };

    const stats = data?.stats;
    const max = stats ? Math.max(stats.goal, ...stats.last14.map((d) => d.words)) : 1;
    const pct = stats ? Math.min(100, Math.round((stats.today / stats.goal) * 100)) : 0;

    return (
        <div className="space-y-6">
            <PageHeader icon={PenLine} tone="from-rose-500 to-pink-600" title="Independent Writing" subtitle="A little every day: articles, essays, proposals and reflections."
                actions={<button type="button" onClick={() => setCreating({ title: '', kind: 'article' })} className={btn.primary}><Plus size={15} /> New piece</button>} />

            <ErrorNote onRetry={load}>{error}</ErrorNote>
            {!data && !error && <Loading label="Loading your writing…" />}

            {data && (
                <>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card className="flex items-center gap-4">
                            <div className="relative h-24 w-24 shrink-0">
                                <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90" aria-hidden="true">
                                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
                                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 97.4} 97.4`} />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-slate-900">{pct}%</span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Today</p>
                                <p className="text-2xl font-black text-slate-900">{fmtNum(stats.today)}</p>
                                <p className="text-xs text-slate-500">of {fmtNum(stats.goal)} words</p>
                                <button type="button" onClick={() => { setGoal(String(teacher?.dailyWordGoal || stats.goal)); setFormError(''); setGoalOpen(true); }} className={`${btn.ghost} -ml-2 mt-1`}><Target size={13} /> Change goal</button>
                            </div>
                        </Card>
                        <Card>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Last 14 days</p>
                            <div className="flex h-20 items-end gap-1">
                                {stats.last14.map((d) => <div key={d.day} title={`${d.day}: ${fmtNum(d.words)} words`} className={`flex-1 rounded-t ${d.words >= stats.goal ? 'bg-emerald-500' : d.words > 0 ? 'bg-emerald-300' : 'bg-slate-100'}`} style={{ height: `${Math.max(6, (d.words / max) * 100)}%` }} />)}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">Thesis chapters count too.</p>
                        </Card>
                    </div>

                    <StepGuide id="writing-guide" tone="rose" icon={PenLine} steps={WRITING_STEPS} open={isGuideOpen} onToggle={() => setGuideOpen(!isGuideOpen)} step={guideStep} onStep={setGuideStep}
                        read={guideRead.read} onToggleRead={guideRead.toggle}
                        title="Academic writing, step by step" subtitle="A daily habit, planning, clear paragraphs and style, hedging, linking ideas, editing and feedback." />

                    <Card className="border-rose-100 bg-gradient-to-br from-rose-50 to-white">
                        <CardTitle icon={Pencil} right={<button type="button" onClick={() => setPrompt(PROMPTS[(PROMPTS.indexOf(prompt) + 1) % PROMPTS.length])} className={btn.ghost}><Shuffle size={13} /> Another</button>}>Today&apos;s prompt</CardTitle>
                        <p className="text-base font-semibold text-slate-800">{prompt[1]}</p>
                        <button type="button" onClick={() => setCreating({ title: prompt[1].slice(0, 120), kind: prompt[0] })} className={`${btn.primary} mt-3`}><PenLine size={15} /> Write from this prompt</button>
                    </Card>

                    {!data.pieces.length ? (
                        <EmptyState icon={PenLine} title="Nothing written yet" action={<button type="button" onClick={() => setCreating({ title: '', kind: 'article' })} className={btn.primary}><Plus size={15} /> Start a piece</button>}>
                            Start with the prompt above, or a piece of your own. Everything saves as you type.
                        </EmptyState>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {data.pieces.map((p) => (
                                <Link key={p._id} to={`/teacher/writing/${p._id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md">
                                    <div className="flex items-start justify-between gap-2"><p className="min-w-0 text-sm font-black text-slate-900 [overflow-wrap:anywhere]">{p.title}</p><Badge tone="bg-rose-50 text-rose-600">{KINDS[p.kind]}</Badge></div>
                                    {p.excerpt && <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{p.excerpt}</p>}
                                    <p className="mt-2 text-xs text-slate-400">{fmtNum(p.words)} words{p.wordGoal ? ` of ${fmtNum(p.wordGoal)}` : ''} · {fmtDate(p.updatedAt)}</p>
                                </Link>
                            ))}
                        </div>
                    )}
                </>
            )}

            {creating && (
                <Modal title="New piece" onClose={() => setCreating(null)}
                    footer={<><button type="button" onClick={() => setCreating(null)} className={btn.secondary}>Cancel</button><button type="submit" form="piece-form" disabled={busy} className={btn.primary}>{busy && <Loader2 size={15} className="animate-spin" />} Start writing</button></>}>
                    <form id="piece-form" onSubmit={create} className="space-y-3">
                        <ErrorNote>{formError}</ErrorNote>
                        <Field id="piece-title" label="Title"><input id="piece-title" value={creating.title} onChange={(e) => setCreating((c) => ({ ...c, title: e.target.value }))} maxLength={300} className={inputClass} placeholder="Untitled" /></Field>
                        <Field id="piece-kind" label="Kind"><select id="piece-kind" value={creating.kind} onChange={(e) => setCreating((c) => ({ ...c, kind: e.target.value }))} className={inputClass}>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
                    </form>
                </Modal>
            )}
            {goalOpen && (
                <Modal title="Daily writing goal" onClose={() => setGoalOpen(false)}
                    footer={<><button type="button" onClick={() => setGoalOpen(false)} className={btn.secondary}>Cancel</button><button type="submit" form="goal-form" className={btn.primary}>Save</button></>}>
                    <form id="goal-form" onSubmit={saveGoal} className="space-y-3">
                        <ErrorNote>{formError}</ErrorNote>
                        <Field id="daily-goal" label="Words a day" hint="Between 50 and 20,000. 250–500 is a sustainable pace for most researchers.">
                            <input id="daily-goal" type="number" min={50} max={20000} step={50} value={goal} onChange={(e) => setGoal(e.target.value)} className={inputClass} />
                        </Field>
                    </form>
                </Modal>
            )}
        </div>
    );
}
