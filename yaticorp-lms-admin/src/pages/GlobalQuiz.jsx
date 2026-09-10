/**
 * @author Preethesh Kulal
 * @description Admin page for the Global Quiz — a bank of general questions
 *              every student draws from.
 *
 * These questions belong to no course. They are written here, and the student
 * gets a random paper from whatever is published, so the Global Quiz is
 * general knowledge rather than a re-run of the quizzes inside their courses.
 */
import React, { useMemo, useState } from 'react';
import { Globe, Plus, Trash2, Edit3, CheckCircle2, Loader2, X, EyeOff, Search } from 'lucide-react';
import api from '../utils/api';
import useAutoRefresh from '../hooks/useAutoRefresh';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

const BLANK = { question: '', options: ['', '', '', ''], correctAnswerIndex: 0, explanation: '', category: 'General', difficulty: 'medium', isPublished: true };
const DIFFICULTY = { easy: 'bg-emerald-100 text-emerald-700', medium: 'bg-indigo-100 text-indigo-700', hard: 'bg-rose-100 text-rose-700' };

const Stat = ({ value, label, tone = 'text-slate-900' }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <p className={`text-3xl font-black tabular-nums ${tone}`}>{value}</p>
        <p className="text-sm font-semibold text-slate-600 mt-1">{label}</p>
    </div>
);

const GlobalQuiz = () => {
    const [data, setData] = useState(null);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState('');
    const [form, setForm] = useState(null);          // null = closed, otherwise the question being written
    const [editingId, setEditingId] = useState(null);
    const [formError, setFormError] = useState('');
    const [confirm, setConfirm] = useState(null);    // the question awaiting a delete confirmation
    const [query, setQuery] = useState('');

    const load = async () => {
        try {
            const [bank, s] = await Promise.all([api.get('/admin/global-quiz'), api.get('/admin/settings')]);
            setData(bank.data); setSettings(s.data); setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Could not load the question bank.');
        } finally { setLoading(false); }
    };
    useAutoRefresh(load, 60000);

    const saveSetting = async (globalQuiz, key) => {
        setSaving(key);
        try { setSettings((await api.put('/admin/settings', { globalQuiz })).data); setError(''); }
        catch (err) { setError(err.response?.data?.message || 'Could not save that setting.'); }
        finally { setSaving(''); }
    };

    const openNew = () => { setForm({ ...BLANK, options: ['', '', '', ''] }); setEditingId(null); setFormError(''); };
    const openEdit = (q) => {
        setForm({ ...q, options: [...q.options, '', '', '', ''].slice(0, Math.max(4, q.options.length)) });
        setEditingId(q._id); setFormError('');
    };

    const submitForm = async (e) => {
        e.preventDefault();
        setSaving('form'); setFormError('');
        const payload = { ...form, options: form.options.map((o) => o.trim()).filter(Boolean) };
        try {
            if (editingId) await api.put(`/admin/global-quiz/${editingId}`, payload);
            else await api.post('/admin/global-quiz', payload);
            setForm(null); setEditingId(null);
            await load();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Could not save that question.');
        } finally { setSaving(''); }
    };

    const remove = async () => {
        const id = confirm?._id; setConfirm(null);
        try { await api.delete(`/admin/global-quiz/${id}`); await load(); }
        catch (err) { setError(err.response?.data?.message || 'Could not delete that question.'); }
    };

    const questions = useMemo(() => data?.questions || [], [data]);
    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? questions.filter((x) => x.question.toLowerCase().includes(q) || (x.category || '').toLowerCase().includes(q)) : questions;
    }, [questions, query]);

    if (loading) return <div className="flex justify-center p-16"><Loader2 size={36} className="animate-spin text-indigo-500" /></div>;

    const config = settings?.globalQuiz || {};
    const enabled = config.enabled !== false;
    const length = config.defaultLength || 10;
    const t = data?.totals || {};
    const tooFew = (t.published || 0) < length;

    return (
        <div className="space-y-6 pb-12">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <span className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600"><Globe size={22} /></span>
                        Global Quiz
                    </h1>
                    <p className="text-slate-500 mt-1 max-w-2xl text-sm">
                        General questions every student can be asked, written here rather than taken from any course.
                        The quiz is practice: it awards no credits, XP or course progress.
                    </p>
                </div>
                <button onClick={openNew} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm">
                    <Plus size={18} /> Add question
                </button>
            </div>

            {error && <p className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl px-4 py-3">{error}</p>}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat value={t.published ?? 0} label="Questions students can be asked" tone={tooFew ? 'text-amber-600' : 'text-slate-900'} />
                <Stat value={t.drafts ?? 0} label="Drafts, held back" />
                <Stat value={t.categories ?? 0} label="Categories in use" />
                <Stat value={length} label="Questions per paper" />
            </div>

            {tooFew && (
                <p className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
                    The bank holds {t.published ?? 0} published question{(t.published ?? 0) === 1 ? '' : 's'} but a paper asks for {length}.
                    Students will get a shorter quiz until you add more.
                </p>
            )}

            {/* ── Settings ─────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h2 className="font-bold text-slate-800 mb-4">Settings</h2>
                <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-100">
                    <div>
                        <p className="font-semibold text-slate-800">Offer the Global Quiz to students</p>
                        <p className="text-sm text-slate-500">Switching this off removes the tab from their dashboard and closes the endpoints behind it.</p>
                    </div>
                    <button type="button" role="switch" aria-checked={enabled} aria-label="Offer the Global Quiz to students"
                        onClick={() => saveSetting({ enabled: !enabled }, 'enabled')} disabled={saving === 'enabled'}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                </div>
                <div className="flex items-center justify-between gap-4 pt-4">
                    <div>
                        <p className="font-semibold text-slate-800">Questions per paper</p>
                        <p className="text-sm text-slate-500">What a student gets before they choose a different length. Between 3 and 25.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {[5, 10, 15, 20].map((n) => (
                            <button key={n} type="button" onClick={() => saveSetting({ defaultLength: n }, `len-${n}`)} disabled={saving.startsWith('len')}
                                className={`px-3 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${length === n ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{n}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Write a question ─────────────────────────────── */}
            {form && (
                <form onSubmit={submitForm} className="bg-white border-2 border-indigo-200 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-slate-800">{editingId ? 'Edit question' : 'New question'}</h2>
                        <button type="button" onClick={() => setForm(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                    </div>

                    <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Question</span>
                        <textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} rows={2} maxLength={500}
                            placeholder="Which planet is closest to the Sun?"
                            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    </label>

                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Answers &mdash; mark the correct one</span>
                        <div className="mt-2 space-y-2">
                            {form.options.map((opt, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <button type="button" onClick={() => setForm({ ...form, correctAnswerIndex: i })}
                                        aria-label={`Mark answer ${i + 1} as correct`} aria-pressed={form.correctAnswerIndex === i}
                                        className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center font-black text-sm transition-colors ${form.correctAnswerIndex === i ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                        {form.correctAnswerIndex === i ? <CheckCircle2 size={16} /> : String.fromCharCode(65 + i)}
                                    </button>
                                    <input value={opt} onChange={(e) => { const options = [...form.options]; options[i] = e.target.value; setForm({ ...form, options }); }}
                                        maxLength={200} placeholder={i < 2 ? `Answer ${i + 1} (required)` : `Answer ${i + 1} (optional)`}
                                        className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                    {form.options.length > 2 && (
                                        <button type="button" aria-label={`Remove answer ${i + 1}`}
                                            onClick={() => {
                                                const options = form.options.filter((_, k) => k !== i);
                                                const correct = form.correctAnswerIndex >= options.length ? options.length - 1 : form.correctAnswerIndex > i ? form.correctAnswerIndex - 1 : form.correctAnswerIndex;
                                                setForm({ ...form, options, correctAnswerIndex: Math.max(0, correct) });
                                            }}
                                            className="shrink-0 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {form.options.length < 6 && (
                            <button type="button" onClick={() => setForm({ ...form, options: [...form.options, ''] })} className="mt-2 text-sm font-bold text-indigo-600 hover:text-indigo-700">+ Another answer</button>
                        )}
                    </div>

                    <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Why that is right <span className="font-medium normal-case text-slate-400">(shown after they answer)</span></span>
                        <input value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} maxLength={600}
                            placeholder="Mercury orbits closest to the Sun."
                            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <label className="block">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</span>
                            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={60} list="gq-categories"
                                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                            <datalist id="gq-categories">
                                {[...new Set(questions.map((q) => q.category).filter(Boolean))].map((c) => <option key={c} value={c} />)}
                                <option value="General Knowledge" /><option value="Aptitude" /><option value="Reasoning" /><option value="Current Affairs" />
                            </datalist>
                        </label>
                        <label className="block">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Difficulty</span>
                            <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                            </select>
                        </label>
                        <label className="flex items-end gap-2 pb-2.5">
                            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="h-4 w-4 rounded border-slate-300 accent-indigo-600" />
                            <span className="text-sm font-semibold text-slate-700">Ask students this</span>
                        </label>
                    </div>

                    {formError && <p className="text-sm font-semibold text-red-600">{formError}</p>}

                    <div className="flex gap-2">
                        <button type="submit" disabled={saving === 'form'} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl">
                            {saving === 'form' && <Loader2 size={16} className="animate-spin" />} {editingId ? 'Save changes' : 'Add to the bank'}
                        </button>
                        <button type="button" onClick={() => setForm(null)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                    </div>
                </form>
            )}

            {/* ── The bank ─────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                    <h2 className="font-bold text-slate-800">The question bank</h2>
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions or categories"
                            className="w-64 max-w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
                    </div>
                </div>

                {shown.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <p className="font-bold text-slate-700">{questions.length ? 'Nothing matches that search.' : 'The bank is empty.'}</p>
                        <p className="text-sm text-slate-500 mt-1">{questions.length ? 'Try another word.' : 'Add your first general question and students can take the quiz straight away.'}</p>
                        {!questions.length && <button onClick={openNew} className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl"><Plus size={18} /> Add question</button>}
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {shown.map((q) => (
                            <li key={q._id} className="px-6 py-4 hover:bg-slate-50">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">{q.category || 'General'}</span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${DIFFICULTY[q.difficulty] || DIFFICULTY.medium}`}>{q.difficulty || 'medium'}</span>
                                            {q.isPublished === false && <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-flex items-center gap-1"><EyeOff size={10} /> Draft</span>}
                                        </div>
                                        <p className="font-semibold text-slate-800">{q.question}</p>
                                        <p className="text-sm text-slate-500 mt-1">
                                            <CheckCircle2 size={13} className="inline text-emerald-500 mr-1 -mt-0.5" />
                                            {q.options[q.correctAnswerIndex]}
                                            <span className="text-slate-400"> &middot; {q.options.length} answers</span>
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                        <button onClick={() => openEdit(q)} aria-label="Edit question" className="p-2 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"><Edit3 size={17} /></button>
                                        <button onClick={() => setConfirm(q)} aria-label="Delete question" className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={17} /></button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <DeleteConfirmModal
                isOpen={!!confirm}
                onClose={() => setConfirm(null)}
                onConfirm={remove}
                title="Delete this question?"
                message="It will be removed from the bank and no student will be asked it again."
                itemName={confirm?.question}
            />
        </div>
    );
};

export default GlobalQuiz;
