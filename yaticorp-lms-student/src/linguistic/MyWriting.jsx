/**
 * Linguistic Ability — the Writing tab: the student's paragraphs, emails,
 * letters and passage translations. Since 2026-10-26 they are checked in the
 * lesson, each sentence's grammar corrected, and never sent to a teacher
 * (whose review pages are gone); older ones show as saved, or reviewed with
 * the teacher's score and comment. The model answer and tips beside them.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle2, MessageSquare, ChevronDown, PenLine, NotebookPen } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS, MODULES } from './meta';
import { LevelChip, Loading, Mascot, Panel, Problem } from './ui';
import { Corrections } from './session/exercises';
import Notepad from './Notepad';

function Row({ s }) {
    const [open, setOpen] = useState(false);
    const reviewed = s.status === 'reviewed', checked = s.status === 'checked';
    const c = reviewed ? COLORS.green : checked ? COLORS.blue : COLORS.gold;
    const clean = (s.sentences || []).filter((x) => !x.mistakes?.length).length;
    const tips = (s.autoFeedback || []).filter((f) => f.kind === 'tip');
    return (
        <Panel as="li" data-submission={s.id} data-status={s.status}>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-3 p-4 text-left">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: c.light, color: c.ink }}>{reviewed || checked ? <CheckCircle2 size={20} /> : <Clock size={20} />}</span>
                <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-extrabold text-[#3c3c3c]">{s.lessonTitle} · <span className="capitalize">{s.taskType || s.kind}</span></span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-[#AFAFAF]"><LevelChip level={s.level} /> {MODULES[s.module]?.short} · {new Date(s.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    <span className="mt-1 block text-sm font-extrabold" style={{ color: c.ink }}>{reviewed ? `Reviewed by ${s.reviewedBy}: ${s.score}/100` : checked ? (s.sentences?.length ? `Checked: ${clean} of ${s.sentences.length} sentences with no mistakes` : 'Checked: compare it with the model') : 'Saved'}</span>
                </span>
                <ChevronDown size={20} className={`mt-2 shrink-0 text-[#AFAFAF] transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="space-y-3 border-t-2 border-[#E5E5E5] px-4 pb-4 pt-3">
                    {s.prompt && <p className="text-[15px] font-semibold text-[#777]"><span className="font-extrabold">Task:</span> {s.prompt}</p>}
                    <div className="rounded-xl bg-[#F7F7F7] px-3.5 py-2.5"><p className="text-xs font-extrabold uppercase tracking-wider text-[#AFAFAF]">Your answer</p><p className="mt-1 whitespace-pre-line break-words text-[15px] font-semibold text-[#4b4b4b]">{s.answer}</p></div>
                    {reviewed && s.comment && <div className="rounded-xl px-3.5 py-2.5" style={{ background: COLORS.green.light }}><p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider" style={{ color: COLORS.green.ink }}><MessageSquare size={13} /> Your teacher says</p><p className="mt-1 text-[15px] font-semibold text-[#4b4b4b]">{s.comment}</p></div>}
                    {checked && s.sentences?.length > 0 && <Corrections r={s} T={(x) => x} said="You wrote" />}
                    {tips.length > 0 && <div className="rounded-xl px-3.5 py-2.5" style={{ background: COLORS.gold.light }}><p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: COLORS.gold.ink }}>Tips</p><ul className="mt-1 space-y-0.5">{tips.map((f) => <li key={f.text} className="text-[15px] font-semibold text-[#4b4b4b]">• {f.text}</li>)}</ul></div>}
                    {s.model && <div className="rounded-xl px-3.5 py-2.5" style={{ background: COLORS.blue.light }}><p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: COLORS.blue.ink }}>Model answer</p><p className="mt-1 whitespace-pre-line break-words text-[15px] font-semibold text-[#4b4b4b]">{s.model}</p></div>}
                    {s.open !== false && <Link to={`/linguistic/${s.module}/${s.lessonId}`} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-extrabold uppercase tracking-wide" style={{ color: COLORS.blue.ink }}><PenLine size={15} /> Open the lesson</Link>}
                </div>
            )}
        </Panel>
    );
}

export default function MyWriting() {
    const [data, setData] = useState(undefined);
    const [error, setError] = useState(null);
    const [notes, setNotes] = useState(false);
    const load = useCallback(() => linguisticApi.submissions().then((d) => { setData(d); setError(null); }).catch((e) => { setError(e); setData(null); }), []);
    useEffect(() => { load(); }, [load]);
    if (data === undefined) return <Loading label="Loading your writing…" />;
    if (!data) return <Problem error={error} onRetry={load} />;
    return (
        <div className="space-y-4" data-writing-page>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl font-extrabold text-[#3c3c3c]">Your writing</h1>
                    <p className="mt-1 text-[15px] font-semibold text-[#777]">Paragraphs, emails, letters and passage translations you wrote, each sentence checked and corrected.</p>
                </div>
                {/* The notepad (2026-10-29): the student's own notes, whatever they want to keep. */}
                <button type="button" onClick={() => setNotes(true)} title="My notes" aria-label="Open my notes"
                    className="group flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-b from-sky-500 to-sky-600 px-3.5 py-2.5 text-sm font-extrabold text-white shadow-[0_4px_0_#0369a1,0_8px_18px_rgba(2,132,199,.3)] transition-all hover:brightness-105 active:translate-y-[3px] active:shadow-[0_1px_0_#0369a1]" data-open-notepad>
                    <NotebookPen size={20} className="transition-transform group-hover:-rotate-12" /> <span className="hidden sm:inline">My notes</span>
                </button>
            </div>
            {notes && <Notepad onClose={() => setNotes(false)} />}
            {data.submissions.length
                ? <ul className="space-y-3">{data.submissions.map((s) => <Row key={s.id} s={s} />)}</ul>
                : (
                    <Panel className="flex flex-col items-center gap-2 p-8 text-center">
                        <Mascot pose="presenting" className="h-28 w-28" />
                        <p className="text-[17px] font-extrabold text-[#3c3c3c]">Nothing yet</p>
                        <p className="max-w-sm text-[15px] font-semibold text-[#777]">Writing tasks in Reading and Writing, and passages in Translation, are checked in the lesson and kept here.</p>
                    </Panel>
                )}
        </div>
    );
}
