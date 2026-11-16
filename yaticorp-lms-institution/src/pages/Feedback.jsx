/**
 * Feedback — forms the department opens to its students (per subject, or one
 * for the whole semester): 1–5 ratings and written comments. Answers come back
 * without names: averages, the spread of ratings, and the comments.
 */
import React, { useState } from 'react';
import { MessageSquareText, Plus, Trash2, BarChart3, Lock, Unlock, X } from 'lucide-react';
import api, { CAMPUS, errorOf } from '../api';
import { useCampus } from '../App';
import { PageHead, Card, Button, Dialog, Field, Input, Select, Toggle, Banner, Chip, Empty, Skeleton, LoadFailed, useData, useToast, useConfirm, useSubmit, semestersOf, plural, day } from '../ui';

const STARTER = [
    { text: 'The teacher explains concepts clearly', kind: 'rating' }, { text: 'Classes start and end on time', kind: 'rating' },
    { text: 'The syllabus was covered completely', kind: 'rating' }, { text: 'Doubts are answered patiently', kind: 'rating' },
    { text: 'Anything the teacher could do better?', kind: 'text' }
];

const FormDialog = ({ dept, onClose, onDone }) => {
    const [f, setF] = useState({ title: 'Course and teacher feedback', semester: 0, perSubject: true, questions: STARTER });
    const { busy, error, run } = useSubmit();
    const setQ = (i, k, v) => setF({ ...f, questions: f.questions.map((q, j) => (i === j ? { ...q, [k]: v } : q)) });
    return (
        <Dialog size="max-w-2xl" title="New feedback form" sub={dept.name} onClose={onClose}
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="fb-form" busy={busy}>Open to students</Button></>}>
            <form id="fb-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); run(async () => onDone((await api.post(`${CAMPUS}/feedback`, { ...f, departmentId: dept._id })).data.message)); }}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Title" className="sm:col-span-2"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field>
                    <Field label="For"><Select value={f.semester} onChange={(e) => setF({ ...f, semester: Number(e.target.value) })}><option value={0}>Every semester</option>{semestersOf(dept).map((n) => <option key={n} value={n}>Semester {n}</option>)}</Select></Field>
                </div>
                <Toggle label="One response per subject" hint="Students answer the questions for each of their subjects — feedback on each course and its teacher." checked={f.perSubject} onChange={(v) => setF({ ...f, perSubject: v })} />
                <div>
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[.12em] text-ink-3">Questions</span>
                    <ol className="space-y-2">{f.questions.map((q, i) => (
                        <li key={i} className="flex items-center gap-2">
                            <span className="w-5 text-right text-xs text-ink-3">{i + 1}</span>
                            <Input value={q.text} onChange={(e) => setQ(i, 'text', e.target.value)} className="flex-1" aria-label={`Question ${i + 1}`} />
                            <Select value={q.kind} onChange={(e) => setQ(i, 'kind', e.target.value)} className="w-36" aria-label="Answer"><option value="rating">Rating 1–5</option><option value="text">Written</option></Select>
                            <Button size="sm" variant="ghost" icon={X} aria-label="Remove question" onClick={() => setF({ ...f, questions: f.questions.filter((_, j) => j !== i) })} />
                        </li>
                    ))}</ol>
                    <Button size="sm" variant="ghost" icon={Plus} className="mt-2" onClick={() => setF({ ...f, questions: [...f.questions, { text: '', kind: 'rating' }] })}>Add question</Button>
                </div>
                {error && <Banner>{error}</Banner>}
            </form>
        </Dialog>
    );
};

const Stars = ({ value }) => (
    <span className="inline-flex items-center gap-2">
        <span className="relative inline-block h-2 w-28 overflow-hidden rounded-full bg-porcelain"><span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brass-500 to-petrol-500" style={{ width: `${((value || 0) / 5) * 100}%` }} /></span>
        <b className="w-9 font-display tabular-nums">{value ?? '—'}</b>
    </span>
);

const Report = ({ form, onClose }) => {
    const { data, loading } = useData(`/feedback/${form._id}/report`);
    return (
        <Dialog size="max-w-3xl" title={form.title} sub={data ? `${plural(data.responses, 'response')} · names are never shown` : ''} onClose={onClose}>
            {loading || !data ? <Skeleton rows={4} /> : !data.responses ? <Empty icon={BarChart3}>No responses yet.</Empty> : (
                <div className="space-y-5">
                    {data.groups.map((g, gi) => (
                        <Card key={gi} className="p-5">
                            <div className="mb-3 flex items-center justify-between"><h3 className="font-display text-base font-semibold">{g.subject ? `${g.subject.code ? `${g.subject.code} · ` : ''}${g.subject.name}` : 'All answers'}</h3><Chip>{plural(g.responses, 'response')}</Chip></div>
                            <ul className="space-y-3">{g.questions.map((q, i) => (
                                <li key={i}>
                                    {q.kind === 'rating' ? (
                                        <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm">{q.text}</span><Stars value={q.average} /></div>
                                    ) : (
                                        <div><p className="text-sm">{q.text}</p>
                                            {q.comments.length ? <ul className="mt-2 space-y-1.5">{q.comments.map((c, j) => <li key={j} className="rounded-lg border-l-2 border-brass-500 bg-paper px-3 py-2 text-sm text-ink-2">“{c}”</li>)}</ul> : <p className="mt-1 text-xs text-ink-3">No comments.</p>}
                                        </div>
                                    )}
                                </li>
                            ))}</ul>
                        </Card>
                    ))}
                </div>
            )}
        </Dialog>
    );
};

export default function Feedback() {
    const { dept } = useCampus();
    const toast = useToast();
    const [confirm, confirmDialog] = useConfirm();
    const { data, loading, failed, reload } = useData('/feedback', { departmentId: dept._id });
    const [adding, setAdding] = useState(false);
    const [viewing, setViewing] = useState(null);
    const forms = data?.forms || [];
    const act = async (fn) => { try { toast((await fn()).data.message); reload(); } catch (err) { toast(errorOf(err), 'error'); } };
    const remove = async (f) => { if (await confirm({ title: `Delete ${f.title}?`, body: 'Every response to it is deleted too.', action: 'Delete', danger: true })) act(() => api.delete(`${CAMPUS}/feedback/${f._id}`)); };
    return (
        <>
            <PageHead eyebrow={dept.name} title="Feedback" sub="Ask students about their courses and teachers. They answer from their Institution dashboard; you see totals and comments, never names.">
                <Button icon={Plus} onClick={() => setAdding(true)}>New form</Button>
            </PageHead>
            {loading ? <Card><Skeleton rows={3} /></Card> : failed ? <Card><LoadFailed onRetry={reload} /></Card> : !forms.length ? (
                <Card><Empty icon={MessageSquareText} title="No feedback forms yet" action={<Button icon={Plus} onClick={() => setAdding(true)}>New form</Button>}>Start with the ready-made course and teacher questions, and change them as you like.</Empty></Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">{forms.map((f) => (
                    <Card key={f._id} className="flex flex-col p-5">
                        <div className="flex items-start justify-between gap-2">
                            <div><h3 className="font-display text-lg font-semibold">{f.title}</h3><p className="text-xs text-ink-3">{f.semester ? `Semester ${f.semester}` : 'Every semester'} · {f.perSubject ? 'per subject' : 'one response'} · {plural(f.questions.length, 'question')} · {day(f.createdAt)}</p></div>
                            {f.open ? <Chip tone="green">Open</Chip> : <Chip>Closed</Chip>}
                        </div>
                        <p className="mt-4 font-display text-3xl font-semibold tabular-nums">{f.students}<span className="ml-1.5 font-sans text-sm font-normal text-ink-3">students answered · {plural(f.responses, 'response')}</span></p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <Button size="sm" icon={BarChart3} onClick={() => setViewing(f)}>Results</Button>
                            <Button size="sm" variant="secondary" icon={f.open ? Lock : Unlock} onClick={() => act(() => api.put(`${CAMPUS}/feedback/${f._id}`, { open: !f.open }))}>{f.open ? 'Close' : 'Reopen'}</Button>
                            <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(f)} aria-label="Delete" />
                        </div>
                    </Card>
                ))}</div>
            )}
            {adding && <FormDialog dept={dept} onClose={() => setAdding(false)} onDone={(m) => { setAdding(false); toast(m); reload(); }} />}
            {viewing && <Report form={viewing} onClose={() => setViewing(null)} />}
            {confirmDialog}
        </>
    );
}
