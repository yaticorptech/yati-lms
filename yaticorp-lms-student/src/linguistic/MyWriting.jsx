/**
 * Linguistic Ability — the Writing tab: the student's paragraphs, emails,
 * letters and passage translations as sent for review: waiting, or reviewed
 * with the teacher's score and comment, beside the model answer and the
 * automatic tips.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle2, MessageSquare, ChevronDown, PenLine } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS, MODULES } from './meta';
import { LevelChip, Loading, Mascot, Panel, Problem } from './ui';

function Row({ s }) {
    const [open, setOpen] = useState(false);
    const reviewed = s.status === 'reviewed';
    const c = reviewed ? COLORS.green : COLORS.gold;
    const tips = (s.autoFeedback || []).filter((f) => f.kind === 'tip');
    return (
        <Panel as="li" data-submission={s.id} data-status={s.status}>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-3 p-4 text-left">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: c.light, color: c.ink }}>{reviewed ? <CheckCircle2 size={20} /> : <Clock size={20} />}</span>
                <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-extrabold text-[#3c3c3c]">{s.lessonTitle} · <span className="capitalize">{s.taskType || s.kind}</span></span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-[#AFAFAF]"><LevelChip level={s.level} /> {MODULES[s.module]?.short} · {new Date(s.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    <span className="mt-1 block text-sm font-extrabold" style={{ color: c.ink }}>{reviewed ? `Reviewed by ${s.reviewedBy}: ${s.score}/100` : 'Waiting for your teacher\'s review'}</span>
                </span>
                <ChevronDown size={20} className={`mt-2 shrink-0 text-[#AFAFAF] transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="space-y-3 border-t-2 border-[#E5E5E5] px-4 pb-4 pt-3">
                    {s.prompt && <p className="text-[15px] font-semibold text-[#777]"><span className="font-extrabold">Task:</span> {s.prompt}</p>}
                    <div className="rounded-xl bg-[#F7F7F7] px-3.5 py-2.5"><p className="text-xs font-extrabold uppercase tracking-wider text-[#AFAFAF]">Your answer</p><p className="mt-1 whitespace-pre-line break-words text-[15px] font-semibold text-[#4b4b4b]">{s.answer}</p></div>
                    {reviewed && s.comment && <div className="rounded-xl px-3.5 py-2.5" style={{ background: COLORS.green.light }}><p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider" style={{ color: COLORS.green.ink }}><MessageSquare size={13} /> Your teacher says</p><p className="mt-1 text-[15px] font-semibold text-[#4b4b4b]">{s.comment}</p></div>}
                    {tips.length > 0 && <div className="rounded-xl px-3.5 py-2.5" style={{ background: COLORS.gold.light }}><p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: COLORS.gold.ink }}>Tips</p><ul className="mt-1 space-y-0.5">{tips.map((f) => <li key={f.text} className="text-[15px] font-semibold text-[#4b4b4b]">• {f.text}</li>)}</ul></div>}
                    {s.model && <div className="rounded-xl px-3.5 py-2.5" style={{ background: COLORS.blue.light }}><p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: COLORS.blue.ink }}>Model answer</p><p className="mt-1 whitespace-pre-line break-words text-[15px] font-semibold text-[#4b4b4b]">{s.model}</p></div>}
                    <Link to={`/linguistic/${s.module}/${s.lessonId}`} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-extrabold uppercase tracking-wide" style={{ color: COLORS.blue.ink }}><PenLine size={15} /> Open the lesson</Link>
                </div>
            )}
        </Panel>
    );
}

export default function MyWriting() {
    const [data, setData] = useState(undefined);
    const [error, setError] = useState(null);
    const load = useCallback(() => linguisticApi.submissions().then((d) => { setData(d); setError(null); }).catch((e) => { setError(e); setData(null); }), []);
    useEffect(() => { load(); }, [load]);
    if (data === undefined) return <Loading label="Loading your writing…" />;
    if (!data) return <Problem error={error} onRetry={load} />;
    return (
        <div className="space-y-4" data-writing-page>
            <div>
                <h1 className="text-2xl font-extrabold text-[#3c3c3c]">Your writing</h1>
                <p className="mt-1 text-[15px] font-semibold text-[#777]">Paragraphs, emails, letters and passage translations you sent, with your teacher&apos;s feedback.</p>
            </div>
            {data.submissions.length
                ? <ul className="space-y-3">{data.submissions.map((s) => <Row key={s.id} s={s} />)}</ul>
                : (
                    <Panel className="flex flex-col items-center gap-2 p-8 text-center">
                        <Mascot pose="presenting" className="h-28 w-28" />
                        <p className="text-[17px] font-extrabold text-[#3c3c3c]">Nothing yet</p>
                        <p className="max-w-sm text-[15px] font-semibold text-[#777]">Writing tasks in Reading and Writing, and passages in Translation, are sent to your teacher from the lesson.</p>
                    </Panel>
                )}
        </div>
    );
}
