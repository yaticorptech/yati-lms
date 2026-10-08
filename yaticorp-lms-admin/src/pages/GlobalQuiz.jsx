/**
 * @author Preethesh Kulal
 * @description Admin page for the Global Quiz.
 *
 * The administrator writes quizzes — "Weekly GK" with 5 questions, "Aptitude"
 * with 10 — each a draft until it is full and published. One quiz is published
 * at a time, and that is the paper every student is given, shuffled. The
 * questions belong to no course, so the Global Quiz is general knowledge rather
 * than a re-run of the quizzes inside their courses.
 *
 * Two views on one page: every quiz (`/global-quiz`), and one quiz's questions
 * (`/global-quiz?quiz=<id>`), so a quiz can be linked to and the browser's back
 * button returns to the list.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Globe, Plus, Trash2, Edit3, CheckCircle2, Loader2, X, Search, FolderX, ArrowLeft,
    Send, EyeOff, Copy, Eye, Radio, AlertTriangle, ListChecks, Timer, CalendarClock
} from 'lucide-react';
import api from '../utils/api';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import Select from '../components/Select';

const BLANK_QUESTION = { question: '', options: ['', '', '', ''], correctAnswerIndex: 0, explanation: '', category: 'General', difficulty: 'medium' };
const DIFFICULTY = { easy: 'bg-emerald-100 text-emerald-700', medium: 'bg-indigo-100 text-indigo-700', hard: 'bg-rose-100 text-rose-700' };
const SIZES = [5, 10, 15, 20];
// Time limits offered at a click, in minutes; 0 is no limit. Any other whole
// number of minutes can be typed in beside them.
const TIME_LIMITS = [0, 5, 10, 15, 30];
// Days a published quiz stays open for new attempts; 0 is no limit.
const OPEN_DAYS = [0, 1, 3, 7, 14, 30];
const INPUT = 'mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';
const LABEL = 'text-xs font-bold uppercase tracking-wider text-slate-500';
const BTN = 'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none';
const BTN2 = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

const categoryOf = (q) => q.category || 'General';
const errorOf = (err, fallback) => err.response?.data?.message || fallback;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
/** "10 min limit", or "no time limit". */
const fmtLimit = (quiz) => (quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} min limit` : 'no time limit');
/** "open 7 days", "closes 9 Oct 2026", "closed 2 Oct 2026" or "always open". */
const fmtOpen = (quiz) => {
    if (!quiz.openDays) return 'always open';
    if (!quiz.closesAt) return `open ${quiz.openDays} day${quiz.openDays === 1 ? '' : 's'} once published`;
    return new Date(quiz.closesAt) <= new Date() ? `closed ${fmtDate(quiz.closesAt)}` : `closes ${fmtDate(quiz.closesAt)}`;
};

const StatusPill = ({ status }) => status === 'published'
    ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-700"><Radio size={12} /> Live</span>
    : <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-slate-500">Draft</span>;

/** How full a quiz is: "3 of 5 added · 2 left", green once full. */
const Meter = ({ count, size }) => {
    const full = count >= size;
    return (
        <div className="flex items-center gap-3" aria-label={`${count} of ${size} questions added`}>
            <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100 sm:w-36">
                <div className={`h-full rounded-full transition-all ${full ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(100, (count / size) * 100)}%` }} />
            </div>
            <span className={`text-xs font-bold tabular-nums ${full ? 'text-emerald-600' : 'text-slate-500'}`}>
                {count} of {size} added{full ? ' · full' : ` · ${size - count} left`}
            </span>
        </div>
    );
};

/** Why Publish is not available yet, or null when it is. */
const notReady = (quiz) => (quiz.questionCount < quiz.size
    ? `Add ${quiz.size - quiz.questionCount} more question${quiz.size - quiz.questionCount === 1 ? '' : 's'} to publish`
    : null);

/* ── A centred dialog: a sheet from the bottom on a phone ─────────────── */
const Dialog = ({ label, onClose, children, footer, wide }) => (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={label}
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-2xl'}`}>
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                <h2 className="min-w-0 font-bold text-slate-800 [overflow-wrap:anywhere]">{label}</h2>
                <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">{children}</div>
            {footer && <div className="flex shrink-0 flex-wrap gap-2 border-t border-slate-100 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:justify-end sm:px-6 sm:pb-4">{footer}</div>}
        </div>
    </div>
);

/* ── Name and size of a quiz ──────────────────────────────────────────── */
function QuizForm({ quiz, limits, onClose, onSaved }) {
    const editing = Boolean(quiz?._id);
    const count = quiz?.questionCount || 0;
    const [form, setForm] = useState({ title: quiz?.title || '', description: quiz?.description || '', size: quiz?.size || 10, timeLimitMinutes: quiz?.timeLimitMinutes || 0, openDays: quiz?.openDays || 0 });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const min = Math.max(limits.min, count);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        try {
            const body = { ...form, size: Number(form.size), timeLimitMinutes: Number(form.timeLimitMinutes) || 0, openDays: Number(form.openDays) || 0 };
            const r = editing ? await api.put(`/admin/global-quiz/quizzes/${quiz._id}`, body) : await api.post('/admin/global-quiz/quizzes', body);
            onSaved(r.data, editing);
        } catch (err) { setError(errorOf(err, 'Could not save the quiz.')); }
        finally { setBusy(false); }
    };

    return (
        <form onSubmit={submit}>
            <Dialog label={editing ? 'Edit quiz' : 'New quiz'} onClose={onClose}
                footer={<>
                    <button type="button" onClick={onClose} className={`${BTN2} flex-1 sm:flex-none`}>Cancel</button>
                    <button type="submit" disabled={busy} className={`${BTN} flex-1 sm:flex-none`}>{busy && <Loader2 size={16} className="animate-spin" />} {editing ? 'Save changes' : 'Create quiz'}</button>
                </>}>
                <label className="block">
                    <span className={LABEL}>Quiz name</span>
                    <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={80} placeholder="Weekly General Knowledge" className={INPUT} autoFocus />
                </label>
                <label className="block">
                    <span className={LABEL}>Description <span className="font-medium normal-case text-slate-400">(optional)</span></span>
                    <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={300} placeholder="Ten quick questions on science and current affairs." className={INPUT} />
                </label>
                <div>
                    <span className={LABEL}>Number of questions</span>
                    <p className="mt-0.5 text-xs text-slate-500">The quiz holds exactly this many, and can be published once it is full.{count ? ` It already has ${count}.` : ''}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {SIZES.map((n) => (
                            <button key={n} type="button" disabled={n < min} onClick={() => setForm({ ...form, size: n })} aria-pressed={Number(form.size) === n}
                                title={n < min ? `This quiz already has ${count} questions` : undefined}
                                className={`min-w-14 rounded-xl px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${Number(form.size) === n ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{n}</button>
                        ))}
                        <label className="flex items-center gap-2 text-sm text-slate-500">
                            or
                            <input type="number" min={min} max={limits.max} value={form.size} aria-label="Custom number of questions"
                                onChange={(e) => setForm({ ...form, size: e.target.value })}
                                className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none" />
                        </label>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Between {min} and {limits.max}.</p>
                </div>
                <div>
                    <span className={LABEL}>Time limit</span>
                    <p className="mt-0.5 text-xs text-slate-500">How long students get for the whole quiz. Their clock starts when they press Start, and the paper closes when it runs out.</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {TIME_LIMITS.map((n) => (
                            <button key={n} type="button" onClick={() => setForm({ ...form, timeLimitMinutes: n })} aria-pressed={Number(form.timeLimitMinutes) === n}
                                className={`min-w-14 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${Number(form.timeLimitMinutes) === n ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{n ? `${n} min` : 'No limit'}</button>
                        ))}
                        <label className="flex items-center gap-2 text-sm text-slate-500">
                            or
                            <input type="number" min={0} max={limits.timeLimitMax || 180} value={form.timeLimitMinutes} aria-label="Custom time limit in minutes"
                                onChange={(e) => setForm({ ...form, timeLimitMinutes: e.target.value })}
                                className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none" />
                            min
                        </label>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Whole minutes, up to {limits.timeLimitMax || 180}. 0 means no limit.</p>
                </div>
                <div>
                    <span className={LABEL}>Open for</span>
                    <p className="mt-0.5 text-xs text-slate-500">How many days students can start it, counted from when you publish. After that no new attempts — anyone already taking it can finish.</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {OPEN_DAYS.map((n) => (
                            <button key={n} type="button" onClick={() => setForm({ ...form, openDays: n })} aria-pressed={Number(form.openDays) === n}
                                className={`min-w-14 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${Number(form.openDays) === n ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{n ? `${n} day${n === 1 ? '' : 's'}` : 'No limit'}</button>
                        ))}
                        <label className="flex items-center gap-2 text-sm text-slate-500">
                            or
                            <input type="number" min={0} max={limits.openDaysMax || 365} value={form.openDays} aria-label="Custom number of days"
                                onChange={(e) => setForm({ ...form, openDays: e.target.value })}
                                className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none" />
                            days
                        </label>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Whole days, up to {limits.openDaysMax || 365}. 0 means it stays open while published.</p>
                </div>
                {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
            </Dialog>
        </form>
    );
}

/* ── One question ─────────────────────────────────────────────────────── */
function QuestionForm({ initial, categories, onClose, onSubmit }) {
    const editing = Boolean(initial?._id);
    const [form, setForm] = useState(() => ({ ...BLANK_QUESTION, ...initial, options: [...(initial?.options || []), '', '', '', ''].slice(0, Math.max(4, initial?.options?.length || 0)) }));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        try { await onSubmit({ ...form, options: form.options.map((o) => o.trim()).filter(Boolean) }); }
        catch (err) { setError(errorOf(err, 'Could not save that question.')); setBusy(false); }
    };

    return (
        <form onSubmit={submit}>
            <Dialog label={editing ? 'Edit question' : 'New question'} onClose={onClose}
                footer={<>
                    <button type="button" onClick={onClose} className={`${BTN2} flex-1 sm:flex-none`}>Cancel</button>
                    <button type="submit" disabled={busy} className={`${BTN} flex-1 sm:flex-none`}>{busy && <Loader2 size={16} className="animate-spin" />} {editing ? 'Save changes' : 'Add to the quiz'}</button>
                </>}>
                <label className="block">
                    <span className={LABEL}>Question</span>
                    <textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} rows={2} maxLength={500} placeholder="Which planet is closest to the Sun?" className={INPUT} />
                </label>

                <div>
                    <span className={LABEL}>Answers &mdash; mark the correct one</span>
                    <div className="mt-2 space-y-2">
                        {form.options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2 sm:gap-3">
                                <button type="button" onClick={() => setForm({ ...form, correctAnswerIndex: i })}
                                    aria-label={`Mark answer ${i + 1} as correct`} aria-pressed={form.correctAnswerIndex === i}
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black transition-colors ${form.correctAnswerIndex === i ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                    {form.correctAnswerIndex === i ? <CheckCircle2 size={16} /> : String.fromCharCode(65 + i)}
                                </button>
                                <input value={opt} onChange={(e) => { const options = [...form.options]; options[i] = e.target.value; setForm({ ...form, options }); }}
                                    maxLength={200} placeholder={i < 2 ? `Answer ${i + 1} (required)` : `Answer ${i + 1} (optional)`}
                                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:px-4" />
                                {form.options.length > 2 && (
                                    <button type="button" aria-label={`Remove answer ${i + 1}`}
                                        onClick={() => {
                                            const options = form.options.filter((_, k) => k !== i);
                                            const correct = form.correctAnswerIndex >= options.length ? options.length - 1 : form.correctAnswerIndex > i ? form.correctAnswerIndex - 1 : form.correctAnswerIndex;
                                            setForm({ ...form, options, correctAnswerIndex: Math.max(0, correct) });
                                        }}
                                        className="shrink-0 p-1 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                                )}
                            </div>
                        ))}
                    </div>
                    {form.options.length < 6 && (
                        <button type="button" onClick={() => setForm({ ...form, options: [...form.options, ''] })} className="mt-2 text-sm font-bold text-indigo-600 hover:text-indigo-700">+ Another answer</button>
                    )}
                </div>

                <label className="block">
                    <span className={LABEL}>Why that is right <span className="font-medium normal-case text-slate-400">(shown after they answer)</span></span>
                    <input value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} maxLength={600} placeholder="Mercury orbits closest to the Sun." className={INPUT} />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className={LABEL}>Category</span>
                        <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={60} list="gq-categories" className={INPUT} />
                        <datalist id="gq-categories">
                            {categories.map((c) => <option key={c} value={c} />)}
                            <option value="General Knowledge" /><option value="Aptitude" /><option value="Reasoning" /><option value="Current Affairs" />
                        </datalist>
                    </label>
                    <label className="block">
                        <span className={LABEL}>Difficulty</span>
                        <Select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className={INPUT}>
                            <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                        </Select>
                    </label>
                </div>

                {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
            </Dialog>
        </form>
    );
}

/* ── What the quiz looks like, with its answers ───────────────────────── */
function Preview({ quiz, questions, onClose }) {
    return (
        <Dialog label={`Preview: ${quiz.title}`} onClose={onClose} wide footer={<button type="button" onClick={onClose} className={`${BTN} flex-1 sm:flex-none`}>Done</button>}>
            <p className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                Students get these {questions.length} question{questions.length === 1 ? '' : 's'} in a shuffled order, one at a time, without the answers, and each student gets one attempt.
                {quiz.timeLimitMinutes ? ` They have ${quiz.timeLimitMinutes} minute${quiz.timeLimitMinutes === 1 ? '' : 's'} from pressing Start.` : ' There is no time limit.'}
                The correct answer and its explanation show here for you, and appear to students after they answer.
            </p>
            <ol className="space-y-3">
                {questions.map((q, i) => (
                    <li key={q._id} className="rounded-2xl border border-slate-200 p-4">
                        <p className="text-[11px] font-black uppercase tracking-wider text-indigo-600">Question {i + 1} · {categoryOf(q)}</p>
                        <p className="mt-1 font-bold text-slate-900 [overflow-wrap:anywhere]">{q.question}</p>
                        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                            {q.options.map((o, k) => (
                                <li key={k} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${k === q.correctAnswerIndex ? 'border-emerald-300 bg-emerald-50 font-semibold text-emerald-800' : 'border-slate-200 text-slate-700'}`}>
                                    <span className="font-black text-slate-400">{String.fromCharCode(65 + k)}</span> <span className="min-w-0 [overflow-wrap:anywhere]">{o}</span>
                                    {k === q.correctAnswerIndex && <CheckCircle2 size={15} className="ml-auto shrink-0 text-emerald-600" aria-label="Correct answer" />}
                                </li>
                            ))}
                        </ul>
                        {q.explanation && <p className="mt-2 text-xs text-slate-500">{q.explanation}</p>}
                    </li>
                ))}
            </ol>
        </Dialog>
    );
}

/* ── A yes/no before something that changes what students see ─────────── */
const Confirm = ({ title, message, action, onCancel, onConfirm }) => (
    <Dialog label={title} onClose={onCancel} footer={<>
        <button type="button" onClick={onCancel} className={`${BTN2} flex-1 sm:flex-none`}>Cancel</button>
        <button type="button" onClick={onConfirm} className={`${BTN} flex-1 sm:flex-none`}>{action}</button>
    </>}>
        <p className="text-sm text-slate-600">{message}</p>
    </Dialog>
);

/* ── Every quiz ───────────────────────────────────────────────────────── */
function QuizList({ quizzes, settings, onOpen, onNew, onAction, onSetting, savingSetting }) {
    const enabled = settings?.globalQuiz?.enabled !== false;
    const live = quizzes.find((q) => q.status === 'published');
    const drafts = quizzes.filter((q) => q.status !== 'published').length;
    const ready = quizzes.filter((q) => q.status !== 'published' && !notReady(q)).length;
    const written = quizzes.reduce((n, q) => n + (q.questionCount || 0), 0);

    // On the green live card an emerald "on" track disappears into the card,
    // so there it is a dark track with a white ring.
    const switchFor = (onDark) => (
        <button type="button" role="switch" aria-checked={enabled} aria-label="Offer the Global Quiz to students"
            onClick={() => onSetting({ enabled: !enabled })} disabled={savingSetting}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                enabled ? (onDark ? 'bg-emerald-900/50 ring-1 ring-white/60' : 'bg-emerald-500') : (onDark ? 'bg-white/25 ring-1 ring-white/40' : 'bg-slate-300')}`}>
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
    );
    const toggle = switchFor(false);

    return (
        <div className="space-y-5 sm:space-y-6 pb-12">
            {/* ── Header ── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
                        <Globe size={24} />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 lg:text-3xl">Global Quiz</h1>
                        <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
                            Quizzes for every student — any size, optional time limit, one live at a time. A win pays XP and starting can cost wallet balance: set both in Rewards → Reward rules.
                        </p>
                    </div>
                </div>
                <button onClick={onNew} className={`${BTN} shrink-0 px-5 shadow-md shadow-indigo-500/20`}><Plus size={18} /> New quiz</button>
            </div>

            {/* ── Numbers at a glance ── */}
            <div className="relative grid grid-cols-2 gap-2 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-2.5 shadow-sm sm:grid-cols-4 sm:gap-4 sm:p-4">
                <div aria-hidden className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-indigo-200 opacity-30 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -right-16 -bottom-16 h-40 w-40 rounded-full bg-purple-200 opacity-30 blur-3xl" />
                {[
                    { label: 'Quizzes', value: quizzes.length, icon: ListChecks, tone: 'text-slate-800', chip: 'bg-slate-100 text-slate-600' },
                    { label: 'Live now', value: live ? 1 : 0, icon: Radio, tone: 'text-emerald-600', chip: 'bg-emerald-100 text-emerald-700' },
                    { label: ready ? `Drafts · ${ready} ready` : 'Drafts', value: drafts, icon: Edit3, tone: 'text-amber-600', chip: 'bg-amber-100 text-amber-700' },
                    { label: 'Questions', value: written, icon: CheckCircle2, tone: 'text-indigo-600', chip: 'bg-indigo-100 text-indigo-700' }
                ].map(({ label, value, icon: Icon, tone, chip }) => (
                    <div key={label} className="relative flex min-w-0 items-center gap-2.5 rounded-xl bg-white/70 p-3 backdrop-blur-sm sm:gap-3 sm:p-4">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${chip}`}><Icon size={17} /></span>
                        <div className="min-w-0">
                            <p className={`text-xl font-black tabular-nums leading-none sm:text-2xl ${tone}`}>{value}</p>
                            {/* Wraps rather than cutting off: "Drafts · 1 ready" was "Drafts · 1 re…" on a phone. */}
                            <p className="mt-1 text-[11px] font-bold uppercase leading-snug tracking-wide text-slate-500 [overflow-wrap:anywhere]">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── What students have right now, and the switch that offers it ── */}
            {live ? (
                <div className={`relative overflow-hidden rounded-2xl p-4 text-white shadow-lg sm:p-6 ${enabled ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 shadow-emerald-500/20' : 'bg-gradient-to-br from-slate-500 to-slate-700 shadow-slate-500/20'}`}>
                    <div aria-hidden className="pointer-events-none absolute -top-20 -right-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
                    <div className="relative flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 sm:h-12 sm:w-12 sm:rounded-2xl">
                                <Radio className="h-[18px] w-[18px] sm:h-[22px] sm:w-[22px]" />
                                {enabled && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-white" /></span>}
                            </span>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/80 sm:text-[11px] sm:tracking-[0.18em]">{enabled ? 'Live for students' : 'Published · hidden from students'}</p>
                                {/* Wraps on a phone rather than cutting the quiz's name short. */}
                                <p className="mt-0.5 text-lg font-black leading-snug [overflow-wrap:anywhere] sm:truncate sm:text-xl" title={live.title}>{live.title}</p>
                                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold sm:gap-2 sm:text-xs">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1"><ListChecks size={13} /> {live.questionCount} question{live.questionCount === 1 ? '' : 's'}</span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1"><Timer size={13} /> {fmtLimit(live)}</span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1"><Send size={13} /> published {fmtDate(live.publishedAt)}</span>
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${live.closesAt && new Date(live.closesAt) <= new Date() ? 'bg-rose-500/80' : 'bg-white/15'}`}><CalendarClock size={13} /> {fmtOpen(live)}</span>
                                </div>
                            </div>
                        </div>
                        {/* One row of two equal halves on a phone; side by side from sm. */}
                        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                            <label className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/20 sm:justify-start sm:gap-3">
                                <span className="text-xs font-bold leading-tight sm:text-sm">{enabled ? 'Shown on dashboard' : 'Hidden'}</span>
                                {switchFor(true)}
                            </label>
                            <button onClick={() => onOpen(live._id)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-emerald-700 shadow-sm transition-transform hover:-translate-y-0.5"><Eye size={16} /> Open quiz</button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 text-sm text-amber-800">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100"><AlertTriangle size={18} /></span>
                        <p><span className="block font-black text-amber-900">No quiz is live</span>Students see “No quiz questions yet” until you publish one. A quiz can be published once all its questions are added.</p>
                    </div>
                    <label className="flex shrink-0 items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-amber-200">
                        <span className="text-sm font-bold text-slate-700">Offer to students</span>
                        {toggle}
                    </label>
                </div>
            )}

            {/* ── Every quiz ── */}
            <div>
                <div className="mb-3 flex items-center gap-2">
                    <h2 className="font-black text-slate-800">Your quizzes</h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">{quizzes.length}</span>
                </div>
                {quizzes.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-14 text-center">
                        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500"><ListChecks size={28} /></span>
                        <p className="mt-3 font-black text-slate-800">No quizzes yet</p>
                        <p className="mt-1 text-sm text-slate-500">Create a quiz, choose how many questions it has, fill it, and publish it.</p>
                        <button onClick={onNew} className={`${BTN} mt-5`}><Plus size={18} /> New quiz</button>
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {quizzes.map((q) => {
                            const reason = notReady(q);
                            const isLive = q.status === 'published';
                            const stripe = isLive ? 'from-emerald-400 to-teal-500' : reason ? 'from-slate-200 to-slate-300' : 'from-indigo-500 to-violet-500';
                            return (
                                <li key={q._id} aria-label={`Quiz: ${q.title}`} className={`group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${isLive ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-200'}`}>
                                    <span aria-hidden className={`h-1.5 bg-gradient-to-r ${stripe}`} />
                                    <div className="flex flex-1 flex-col p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <button onClick={() => onOpen(q._id)} className="flex min-w-0 items-start gap-3 text-left">
                                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isLive ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}><ListChecks size={18} /></span>
                                                <span className="min-w-0">
                                                    <span className="block truncate font-black text-slate-900 group-hover:text-indigo-700" title={q.title}>{q.title}</span>
                                                    {q.description && <span className="mt-0.5 line-clamp-2 block text-sm text-slate-500 [overflow-wrap:anywhere]" title={q.description}>{q.description}</span>}
                                                </span>
                                            </button>
                                            <StatusPill status={q.status} />
                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-500">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 ring-1 ring-slate-100"><Timer size={12} /> {fmtLimit(q)}</span>
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ring-1 ${q.closesAt && new Date(q.closesAt) <= new Date() ? 'bg-rose-50 text-rose-600 ring-rose-100' : 'bg-slate-50 ring-slate-100'}`}><CalendarClock size={12} /> {fmtOpen(q)}</span>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 ring-1 ring-slate-100">{q.categories.length} categor{q.categories.length === 1 ? 'y' : 'ies'}</span>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 ring-1 ring-slate-100">updated {fmtDate(q.updatedAt)}</span>
                                        </div>

                                        <div className="mt-4"><Meter count={q.questionCount} size={q.size} /></div>
                                        {reason && !isLive && <p className="mt-2 text-xs font-semibold text-amber-600">{reason}.</p>}

                                        <div className="min-h-4 flex-1" />
                                        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                                            <button onClick={() => onOpen(q._id)} className={`${BTN2} px-3 py-2`}><Edit3 size={15} /> Open</button>
                                            {isLive
                                                ? <button onClick={() => onAction('unpublish', q)} className={`${BTN2} px-3 py-2`}><EyeOff size={15} /> Unpublish</button>
                                                : <button onClick={() => onAction('publish', q)} disabled={Boolean(reason)} title={reason || undefined} className={`${BTN} px-3 py-2`}><Send size={15} /> Publish</button>}
                                            <span className="ml-auto flex gap-1">
                                                <button onClick={() => onAction('duplicate', q)} aria-label={`Duplicate ${q.title}`} title="Duplicate" className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"><Copy size={16} /></button>
                                                <button onClick={() => onAction('delete', q)} aria-label={`Delete ${q.title}`} title="Delete" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                                            </span>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                        {/* A quiet way to start the next one, where the eye already is. */}
                        <li>
                            <button onClick={onNew} className="group flex h-full min-h-[14rem] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-5 text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600">
                                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 transition-colors group-hover:bg-indigo-100"><Plus size={20} /></span>
                                <span className="font-black">Add a quiz</span>
                                <span className="text-xs">5, 10, 15 or 20 questions</span>
                            </button>
                        </li>
                    </ul>
                )}
            </div>
        </div>
    );
}

/* ── One quiz's questions ─────────────────────────────────────────────── */
function QuizDetail({ quizId, onBack, onAction, onEditQuiz, reloadKey }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [form, setForm] = useState(null);          // the question being written, or null
    const [confirm, setConfirm] = useState(null);    // { kind: 'question' | 'set' | 'all', ... }
    const [preview, setPreview] = useState(false);

    const load = useCallback(() => api.get(`/admin/global-quiz/quizzes/${quizId}/questions`)
        .then((r) => { setData(r.data); setError(''); })
        .catch((err) => setError(errorOf(err, 'Could not load this quiz.'))), [quizId]);
    useEffect(() => { load(); }, [load, reloadKey]);

    const questions = useMemo(() => data?.questions || [], [data]);
    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? questions.filter((x) => x.question.toLowerCase().includes(q) || categoryOf(x).toLowerCase().includes(q)) : questions;
    }, [questions, query]);
    // In sets, one per category, alphabetical. A set's `total` is the whole
    // category, not just what the search left showing — that is what
    // "Remove set" takes away.
    const sets = useMemo(() => {
        const totals = new Map();
        questions.forEach((q) => totals.set(categoryOf(q), (totals.get(categoryOf(q)) || 0) + 1));
        const groups = new Map();
        shown.forEach((q) => { const c = categoryOf(q); if (!groups.has(c)) groups.set(c, []); groups.get(c).push(q); });
        return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => ({ category, items, total: totals.get(category) || items.length }));
    }, [questions, shown]);

    if (error && !data) return (
        <div className="space-y-4">
            <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-indigo-600"><ArrowLeft size={16} /> All quizzes</button>
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
        </div>
    );
    if (!data) return <div className="flex justify-center p-16"><Loader2 size={36} className="animate-spin text-indigo-500" /></div>;

    const quiz = data.quiz;
    const held = questions.length;
    const full = held >= quiz.size;
    const left = Math.max(0, quiz.size - held);
    const reason = notReady(quiz);
    const categories = [...new Set(questions.map(categoryOf))];

    const saveQuestion = async (payload) => {
        if (form._id) await api.put(`/admin/global-quiz/${form._id}`, payload);
        else await api.post(`/admin/global-quiz/quizzes/${quiz._id}/questions`, payload);
        setForm(null);
        await load();
    };
    const remove = async () => {
        const target = confirm; setConfirm(null);
        try {
            if (target.kind === 'question') await api.delete(`/admin/global-quiz/${target.question._id}`);
            else await api.delete(`/admin/global-quiz/quizzes/${quiz._id}/questions`, { params: target.kind === 'set' ? { category: target.category } : { all: true } });
            await load();
        } catch (err) { setError(errorOf(err, 'Could not delete that.')); }
    };
    const confirmText = !confirm ? {} : confirm.kind === 'question'
        ? { title: 'Delete this question?', message: 'It will be removed from this quiz.', item: confirm.question.question }
        : confirm.kind === 'set'
            ? { title: `Delete the “${confirm.category}” category?`, message: `All ${confirm.count} question${confirm.count === 1 ? '' : 's'} in this category will be deleted from this quiz.`, item: confirm.category }
            : { title: 'Delete all questions in this quiz?', message: `All ${confirm.count} questions in this quiz will be deleted, in every category. The quiz itself stays, so you can add new ones.`, item: `${confirm.count} questions` };

    return (
        <div className="space-y-4 sm:space-y-6 pb-12">
            <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-indigo-600"><ArrowLeft size={16} /> All quizzes</button>

            {/* The quiz itself, and what can be done with it. */}
            <div className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-6 ${quiz.status === 'published' ? 'border-emerald-300' : 'border-slate-200'}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><StatusPill status={quiz.status} />{quiz.status === 'published' && <span className="text-xs text-emerald-700">Students are taking this quiz · since {fmtDate(quiz.publishedAt)}</span>}</div>
                        <h1 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl [overflow-wrap:anywhere]">{quiz.title}</h1>
                        {quiz.description && <p className="mt-1 max-w-2xl text-sm text-slate-500 [overflow-wrap:anywhere]">{quiz.description}</p>}
                        <div className="mt-3"><Meter count={held} size={quiz.size} /></div>
                        <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500"><Timer size={14} className="text-indigo-500" /> {quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} minute limit · the clock starts when a student presses Start` : 'No time limit'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:shrink-0">
                        <button onClick={() => onEditQuiz({ ...quiz, questionCount: held })} className={BTN2}><Edit3 size={16} /> Edit details</button>
                        <button onClick={() => setPreview(true)} disabled={!held} className={BTN2}><Eye size={16} /> Preview</button>
                        {quiz.status === 'published'
                            ? <button onClick={() => onAction('unpublish', quiz, load)} className={BTN2}><EyeOff size={16} /> Unpublish</button>
                            : <button onClick={() => onAction('publish', { ...quiz, questionCount: held }, load)} disabled={Boolean(reason)} title={reason || undefined} className={BTN}><Send size={16} /> Publish</button>}
                    </div>
                </div>
                {quiz.status !== 'published' && reason && <p className="mt-3 text-xs text-slate-500">{reason}. Students keep their current quiz until then.</p>}
            </div>

            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <h2 className="font-bold text-slate-800">Questions <span className="text-sm font-semibold text-slate-400">{sets.length} set{sets.length === 1 ? '' : 's'}</span></h2>
                    <div className="flex items-center gap-2">
                        <div className="relative min-w-0 flex-1 sm:flex-none">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions or categories"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none sm:w-64" />
                        </div>
                        {held > 0 && (
                            <button onClick={() => setConfirm({ kind: 'all', count: held })} title="Delete every question in this quiz"
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50">
                                <FolderX size={16} /><span className="hidden sm:inline">Delete all questions</span><span className="sm:hidden">Delete all</span>
                            </button>
                        )}
                    </div>
                </div>

                {shown.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <p className="font-bold text-slate-700">{held ? 'Nothing matches that search.' : 'This quiz has no questions yet.'}</p>
                        <p className="mt-1 text-sm text-slate-500">{held ? 'Try another word.' : `Add ${quiz.size} to fill it, then publish it.`}</p>
                    </div>
                ) : sets.map(({ category, items, total }) => (
                    <section key={category} aria-label={`${category} questions`}>
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5 sm:px-6">
                            <p className="min-w-0 break-words text-xs font-black uppercase tracking-wider text-indigo-600">
                                {category}
                                <span className="block font-bold normal-case tracking-normal text-slate-400 sm:ml-2 sm:inline">{items.length === total ? `${total} question${total === 1 ? '' : 's'}` : `${items.length} of ${total} shown`}</span>
                            </p>
                            <div className="flex shrink-0 items-center gap-1">
                                {!full && <button onClick={() => setForm({ ...BLANK_QUESTION, category })} aria-label={`Add a question to ${category}`} title={`Add a question to ${category}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-100 hover:text-indigo-600"><Plus size={16} /></button>}
                                <button onClick={() => setConfirm({ kind: 'set', category, count: total })} aria-label={`Delete the ${category} category`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600">
                                    <Trash2 size={14} />Delete<span className="hidden sm:inline">this category</span>
                                </button>
                            </div>
                        </div>
                        <ul className="divide-y divide-slate-100 border-b border-slate-100">
                            {items.map((q) => (
                                <li key={q._id} className="px-4 py-4 hover:bg-slate-50 sm:px-6">
                                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                                        <div className="min-w-0">
                                            <span className={`mb-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${DIFFICULTY[q.difficulty] || DIFFICULTY.medium}`}>{q.difficulty || 'medium'}</span>
                                            <p className="font-semibold text-slate-800 [overflow-wrap:anywhere]">{q.question}</p>
                                            <p className="mt-1 text-sm text-slate-500 [overflow-wrap:anywhere]">
                                                <CheckCircle2 size={13} className="-mt-0.5 mr-1 inline text-emerald-500" />
                                                {q.options[q.correctAnswerIndex]}
                                                <span className="text-slate-400"> &middot; {q.options.length} answers</span>
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 gap-1">
                                            <button onClick={() => setForm(q)} aria-label="Edit question" className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"><Edit3 size={17} /></button>
                                            <button onClick={() => setConfirm({ kind: 'question', question: q })} aria-label="Delete question" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={17} /></button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}

                {/* Under the last question: the next step after reading down the quiz. */}
                <div className="p-4 sm:p-5">
                    {full ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-center text-sm text-emerald-800" role="status">
                            <p className="font-bold">All {quiz.size} questions are in.</p>
                            <p className="mt-0.5">{quiz.status === 'published' ? 'This is the quiz students are taking.' : 'Publish it when you are happy with it.'} To add another, remove one or make the quiz bigger.</p>
                        </div>
                    ) : (
                        <button onClick={() => setForm({ ...BLANK_QUESTION })} aria-label="Add question at the end"
                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-3.5 text-sm font-bold text-indigo-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50">
                            <Plus size={18} /> Add question <span className="font-semibold text-indigo-400">· {left} of {quiz.size} left</span>
                        </button>
                    )}
                </div>
            </div>

            {form && <QuestionForm initial={form} categories={categories} onClose={() => setForm(null)} onSubmit={saveQuestion} />}
            {preview && <Preview quiz={quiz} questions={questions} onClose={() => setPreview(false)} />}
            <DeleteConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={remove}
                title={confirmText.title} message={confirmText.message} itemName={confirmText.item} />
        </div>
    );
}

/* ── The page ─────────────────────────────────────────────────────────── */
const GlobalQuiz = () => {
    const [params, setParams] = useSearchParams();
    const openId = params.get('quiz');
    const [quizzes, setQuizzes] = useState(null);
    const [limits, setLimits] = useState({ min: 3, max: 50, timeLimitMax: 180 });
    const [settings, setSettings] = useState(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [savingSetting, setSavingSetting] = useState(false);
    const [quizForm, setQuizForm] = useState(null);     // {} = new, a quiz = editing
    const [ask, setAsk] = useState(null);               // { kind: 'publish' | 'delete', quiz, after }
    const [reloadKey, setReloadKey] = useState(0);

    const loadQuizzes = useCallback(() => Promise.all([api.get('/admin/global-quiz/quizzes'), api.get('/admin/settings')])
        .then(([q, s]) => { setQuizzes(q.data.quizzes); setLimits(q.data.limits || limits); setSettings(s.data); setError(''); })
        // eslint-disable-next-line react-hooks/exhaustive-deps
        .catch((err) => setError(errorOf(err, 'Could not load the quizzes.'))), []);
    useEffect(() => { loadQuizzes(); }, [loadQuizzes]);

    const open = (id) => setParams(id ? { quiz: id } : {});
    const flash = (text) => { setNotice(text); setTimeout(() => setNotice(''), 4000); };

    const saveSetting = async (globalQuiz) => {
        setSavingSetting(true);
        try { setSettings((await api.put('/admin/settings', { globalQuiz })).data); }
        catch (err) { setError(errorOf(err, 'Could not save that setting.')); }
        finally { setSavingSetting(false); }
    };

    const run = async (kind, quiz, after) => {
        try {
            if (kind === 'publish') { await api.post(`/admin/global-quiz/quizzes/${quiz._id}/publish`); flash(`“${quiz.title}” is now the quiz students take.`); }
            if (kind === 'unpublish') { await api.post(`/admin/global-quiz/quizzes/${quiz._id}/unpublish`); flash(`“${quiz.title}” is a draft again. Students have no quiz until you publish one.`); }
            if (kind === 'duplicate') { const r = await api.post(`/admin/global-quiz/quizzes/${quiz._id}/duplicate`); flash(`Copied into “${r.data.title}”, as a draft.`); }
            if (kind === 'delete') { await api.delete(`/admin/global-quiz/quizzes/${quiz._id}`); flash(`“${quiz.title}” was deleted.`); if (openId === quiz._id) open(null); }
            await loadQuizzes();
            after?.();
        } catch (err) { setError(errorOf(err, 'That did not work.')); }
    };

    // Publishing over another live quiz, and deleting, are asked about first.
    const onAction = (kind, quiz, after) => {
        const live = quizzes?.find((q) => q.status === 'published' && q._id !== quiz._id);
        if (kind === 'publish' && live) return setAsk({ kind, quiz, live, after });
        if (kind === 'delete') return setAsk({ kind, quiz, after });
        return run(kind, quiz, after);
    };

    const onQuizSaved = (quiz, editing) => {
        setQuizForm(null);
        loadQuizzes();
        if (editing) { setReloadKey((n) => n + 1); flash('Quiz details saved.'); }
        else open(quiz._id);   // straight into the new quiz to fill it
    };

    if (!quizzes && !error) return <div className="flex justify-center p-16"><Loader2 size={36} className="animate-spin text-indigo-500" /></div>;

    return (
        <>
            {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}
            {error && <p className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}<button onClick={() => setError('')} aria-label="Dismiss" className="opacity-60 hover:opacity-100"><X size={16} /></button></p>}

            {openId
                ? <QuizDetail quizId={openId} reloadKey={reloadKey} onBack={() => open(null)} onAction={onAction} onEditQuiz={(q) => setQuizForm(q)} />
                : <QuizList quizzes={quizzes || []} settings={settings} onOpen={open} onNew={() => setQuizForm({})} onAction={onAction} onSetting={saveSetting} savingSetting={savingSetting} />}

            {quizForm && <QuizForm quiz={quizForm} limits={limits} onClose={() => setQuizForm(null)} onSaved={onQuizSaved} />}
            {ask?.kind === 'publish' && (
                <Confirm title={`Publish “${ask.quiz.title}”?`} action="Publish"
                    message={`Students will get this quiz instead of “${ask.live.title}”, which goes back to being a draft. You can switch back at any time.`}
                    onCancel={() => setAsk(null)} onConfirm={() => { const a = ask; setAsk(null); run(a.kind, a.quiz, a.after); }} />
            )}
            <DeleteConfirmModal isOpen={ask?.kind === 'delete'} onClose={() => setAsk(null)}
                onConfirm={() => { const a = ask; setAsk(null); run(a.kind, a.quiz, a.after); }}
                title="Delete this quiz?"
                message={ask?.quiz?.status === 'published'
                    ? 'This is the quiz students are taking. Deleting it removes it and all its questions, and students will have no quiz until you publish another.'
                    : 'The quiz and all its questions will be deleted.'}
                itemName={ask?.quiz?.title} />
        </>
    );
};

export default GlobalQuiz;
