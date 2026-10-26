/** The Quiz Arena question bank, shared by its page and the competition form's Edit. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Brain, Plus, Pencil, Trash2, CheckCircle2, Undo2, ImageIcon, Database, Shuffle, Save, Loader2, XCircle, Newspaper } from 'lucide-react';
import api from '../utils/api';
import { BTN, SearchInput, Empty, Rows } from '../components/orgUi';
import { errorOf } from '../competitions/constants';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { arenaApi, ROUND_NAMES, LETTERS, QuestionForm } from './shared';

// How many questions a Quiz Arena takes from each round by default; the bank
// shows that many at a time, picked at random from the round's questions.
const PER_CONTEST = { 1: 10, 2: 5, 3: 10 };

/**
 * The questions' ids in a random order that takes turns between categories
 * (a monument, a logo, a flag, a person…, then round again), so a set of a
 * few is a mix rather than whichever category has the most questions.
 */
const mixedOrder = (questions) => {
    const groups = new Map();
    for (const x of pickRandom(questions, questions.length)) {
        const k = x.category || '';
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(x._id);
    }
    const lanes = pickRandom([...groups.values()], groups.size);
    const out = [];
    for (let i = 0; out.length < questions.length; i += 1) for (const lane of lanes) if (lane[i]) out.push(lane[i]);
    return out;
};

/** `n` items picked at random from `ids` (all of them, when there are not enough). */
const pickRandom = (ids, n) => {
    const a = [...ids];
    for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, n);
};

/**
 * The Quiz Arena question bank: add, edit, approve or send back, delete.
 * `counts`: how many questions each round takes (the competition form's
 * numbers), so the bank shows that many. `onChanged` hears of every change
 * (the competition form shows "Question bank updated").
 */
/** Each round's icon on its card. */
const ROUND_ICONS = { 1: Brain, 2: ImageIcon, 3: Newspaper };

/**
 * `header(generateButton)`: the page's own heading, given the Generate
 * question bank button to show in it (otherwise it is in the toolbar).
 */
export default function Bank({ counts: perRound = PER_CONTEST, onChanged = () => {}, header = null }) {
    // One round at a time: its card is the tab.
    const [round, setRound] = useState(1);
    const [q, setQ] = useState('');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(null);       // a question, or { round } for a new one
    const load = useCallback(() => {
        const params = { round, ...(q.trim() ? { q: q.trim() } : {}) };
        return api.get(`${arenaApi()}/questions`, { params }).then((r) => { setData(r.data); setError(''); }).catch((e) => setError(errorOf(e)));
    }, [round, q]);
    useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
    const act = (p) => p.then(() => { load(); onChanged(); }).catch((e) => setError(errorOf(e)));
    const counts = data?.counts || {};

    // A short message that goes away by itself ("This question is approved.").
    const [notice, setNotice] = useState('');
    // Kept live: the bank is looked at again every 15 seconds (another admin's
    // approvals, a Generate still running); unsaved choices here are kept.
    useEffect(() => { if (!notice) return undefined; const t = setTimeout(() => setNotice(''), 4000); return () => clearTimeout(t); }, [notice]);

    // Approving is a choice made on screen and kept with Save — the final
    // decision (one round at a time): `pending` holds the choices not saved
    // yet, by question id — { round, approve, at } — so a chosen question
    // turns green at once. Edit and Delete still save at once.
    const [pending, setPending] = useState({});
    const [saving, setSaving] = useState(false);
    const approvedNow = (x) => (pending[x._id] ? pending[x._id].approve : x.status === 'approved');
    const review = (x, approve) => {
        setPending((cur) => {
            const next = { ...cur };
            if (approve === (x.status === 'approved')) delete next[x._id];   // back to how it is saved
            else next[x._id] = { round: x.round, approve, at: Date.now() };
            return next;
        });
        setNotice(approve ? 'This question is approved.' : 'This question is back to draft.');
    };
    const pendingHere = Object.entries(pending).filter(([, v]) => v.round === round);
    // A round's approved count as shown: saved approvals plus the choices not saved yet.
    const approvedCount = (r) => Math.max(0, (counts[r]?.approved || 0) + Object.values(pending).filter((v) => v.round === r).reduce((n, v) => n + (v.approve ? 1 : -1), 0));
    const saveRound = async () => {
        setSaving(true); setError('');
        const failed = [];
        for (const [id, v] of pendingHere) {
            try { await api.post(`${arenaApi()}/questions/${id}/review`, { approve: v.approve }); }
            catch (e) { failed.push(errorOf(e)); continue; }
            setPending((cur) => { const next = { ...cur }; delete next[id]; return next; });
        }
        setSaving(false);
        load(); onChanged();
        if (failed.length) setError(`${failed.length} could not be saved: ${[...new Set(failed)].join(' ')}`);
        else setNotice(`Round ${round} · ${ROUND_NAMES[round]} saved — ${approvedCount(round)} approved.`);
    };

    // Generate: for all three rounds at once, bring back removed questions and import any new
    // ones from its file (in the background, followed here). No dialog.
    const [busy, setBusy] = useState('');
    const generate = async () => {
        setBusy('generate'); setError('');
        try {
            const { data: g } = await api.post(`${arenaApi()}/questions/generate`, { round: 'all' });
            await load();
            let job = g.job;
            while (job.status === 'running') {
                await new Promise((r) => { setTimeout(r, 1000); });
                job = (await api.get(`${arenaApi()}/questions/import/${job.id}`)).data.job;
            }
            await load(); onChanged();
            const added = g.restored + (job.counts?.imported || 0);
            setNotice(added ? `${added} question${added === 1 ? '' : 's'} added across the three rounds.` : 'Every question is already here, in all three rounds.');
        } catch (e) { setError(errorOf(e)); }
        setBusy('');
    };
    useEffect(() => {
        const t = setInterval(() => { if (!editing && !busy && !saving) load(); }, 15000);
        return () => clearInterval(t);
    }, [load, editing, busy, saving]);
    const generateButton = (
        <button type="button" onClick={generate} disabled={!!busy} data-generate className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-60">
            {busy === 'generate' ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />} {busy === 'generate' ? 'Generating…' : 'Generate'}
        </button>
    );
    // The Cancel / OK popup before removing: { title, message, onConfirm }.
    const [confirming, setConfirming] = useState(null);
    const removeOne = (x) => setConfirming({
        title: 'Remove this question?',
        message: 'It is taken off this page. Generate brings it back. Published competitions keep their own copy.',
        onConfirm: () => { setPending((cur) => { const next = { ...cur }; delete next[x._id]; return next; }); act(api.delete(`${arenaApi()}/questions/${x._id}`)); }
    });
    const removeAll = () => setConfirming({
        title: `Remove all ${ROUND_NAMES[round]} questions?`,
        message: 'They are taken off this page. Generate brings them back.',
        onConfirm: removeAllNow
    });
    const removeAllNow = () => {
        setBusy('remove'); setError('');
        api.post(`${arenaApi()}/questions/remove-all`, { round })
            .then((r) => {
                setPending((cur) => Object.fromEntries(Object.entries(cur).filter(([, v]) => v.round !== round)));
                setNotice(`${r.data.removed} question${r.data.removed === 1 ? '' : 's'} removed.`); return load();
            })
            .then(() => onChanged()).catch((e) => setError(errorOf(e))).finally(() => setBusy(''));
    };

    // What is shown: the approved questions on top, in the order they were
    // approved, then a random set of the rest, to make up the round. Shuffle draws
    // a new random set (a question may come up again later). Only the display
    // changes: the bank keeps every question.
    const need = Math.max(0, Number(perRound[round]) || 0);
    // An approved question's place: pending approvals last, then the saved order.
    const when = (x) => (pending[x._id] ? 8.64e15 + pending[x._id].at : (x.bankOrder ?? new Date(x.reviewedAt || x.updatedAt || 0).getTime()));
    const [order, setOrder] = useState({ key: '', ids: [] });
    const pool = data?.questions || [];
    const poolKey = `${round}|${q.trim()}`;
    useEffect(() => {
        if (!data) return;
        const all = pool.map((x) => x._id);
        setOrder((cur) => {
            if (cur.key !== poolKey) return { key: poolKey, ids: mixedOrder(pool) };
            // Keep the order; drop deleted questions, add new ones at the end.
            const kept = cur.ids.filter((id) => all.includes(id));
            return { key: poolKey, ids: [...kept, ...mixedOrder(pool.filter((x) => !kept.includes(x._id)))] };
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);
    // Every question shown approved: Shuffle reorders them for real — the
    // order Publish takes them in. Otherwise it draws another random set of
    // questions to review.
    const shownApproved = pool.filter((x) => x.status === 'approved' && !pending[x._id]);
    const allApproved = pool.length > 0 && !Object.keys(pending).length && pool.filter(approvedNow).length >= Math.min(need, pool.length);
    const [shuffling, setShuffling] = useState(false);
    const shuffle = () => {
        if (!allApproved) { setOrder({ key: poolKey, ids: mixedOrder(pool) }); return; }
        const ids = [...shownApproved].sort((a, b) => when(a) - when(b)).slice(0, need).map((x) => x._id);
        setShuffling(true); setError('');
        api.post(`${arenaApi()}/questions/shuffle`, { ids })
            .then(() => { setNotice(`${ROUND_NAMES[round]}: the order of the approved questions is shuffled.`); load(); onChanged(); })
            .catch((e) => setError(errorOf(e))).finally(() => setShuffling(false));
    };
    const visible = useMemo(() => {
        const byId = new Map(pool.map((x) => [x._id, x]));
        // The approved ones the round takes, in approval order.
        const chosen = pool.filter(approvedNow).sort((a, b) => when(a) - when(b)).slice(0, need);
        const rest = order.ids.map((id) => byId.get(id)).filter((x) => x && !approvedNow(x));
        return [...chosen, ...rest.slice(0, Math.max(0, need - chosen.length))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order, pool, pending, need]);
    const short = Math.max(0, need - pool.length);
    return (
        <div className="space-y-3">
            {header?.(generateButton)}
            {/* The rounds: one card each, the chosen one in indigo; how far its
                approved questions go towards a full round. */}
            <div className="grid gap-3 sm:grid-cols-3" role="tablist" aria-label="Rounds">
                {[1, 2, 3].map((r) => {
                    const on = round === r;
                    const Icon = ROUND_ICONS[r];
                    const got = approvedCount(r);
                    const want = Number(perRound[r]) || PER_CONTEST[r];
                    const full = Math.min(100, Math.round((got / Math.max(1, want)) * 100));
                    return (
                        <button key={r} type="button" role="tab" aria-selected={on} onClick={() => setRound(r)} data-round-tab={r}
                            className={`group relative flex h-full items-start gap-3.5 overflow-hidden rounded-2xl border p-4 text-left transition-all ${on ? 'border-transparent bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-[0_10px_24px_rgba(79,70,229,0.28)]' : 'border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md'}`}>
                            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-white/15 text-white' : 'bg-indigo-50 text-indigo-600'}`}><Icon size={22} /></span>
                            <span className="min-w-0 flex-1">
                                <span className={`block text-[11px] font-bold uppercase tracking-[0.14em] ${on ? 'text-indigo-100' : 'text-slate-500'}`}>Round {r}</span>
                                <span className={`block text-base font-black tracking-tight ${on ? 'text-white' : 'text-slate-900'}`}>{ROUND_NAMES[r]}</span>
                                <span className={`mt-1 flex flex-wrap gap-x-2 text-xs font-semibold ${on ? 'text-indigo-100' : 'text-slate-500'}`}>
                                    <span className={on ? 'text-white' : 'text-emerald-600'} data-approved-count={r}>{got} approved</span>
                                    <span>· {counts[r]?.draft || 0} to review</span>
                                </span>
                                <span className={`mt-2 block h-1.5 overflow-hidden rounded-full ${on ? 'bg-white/20' : 'bg-slate-100'}`} aria-hidden="true">
                                    <span className={`block h-full rounded-full ${on ? 'bg-white' : got >= want ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${full}%` }} />
                                </span>
                                <span className={`mt-1 block text-[11px] font-semibold ${on ? 'text-indigo-100' : 'text-slate-400'}`}>{got >= want ? 'Enough for a full round' : `${want - got} more to approve for a round of ${want}`}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <SearchInput value={q} onChange={setQ} placeholder="Search questions…" label="Search questions" className="sm:flex-1" />
                {!header && generateButton}
                <button type="button" onClick={removeAll} disabled={!!busy || !pool.length || !!q.trim()} data-remove-all className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">{busy === 'remove' ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />} Remove all</button>
                <button type="button" onClick={() => setEditing({ round })} className={BTN}><Plus size={16} /> Add question</button>
            </div>
            {/* Saved, generated…: a message that floats at the bottom of the screen, where Save is. */}
            {notice && (
                <p role="status" data-notice className="fixed bottom-6 left-1/2 z-[150] flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-2xl shadow-emerald-900/30 animate-fade-in">
                    <CheckCircle2 size={18} aria-hidden="true" /> {notice}
                </p>
            )}
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
            {!data && !error && <Rows count={4} />}
            {data?.questions.length === 0 && <Empty icon={Brain}>No {ROUND_NAMES[round]} questions here. Click Generate to load them.</Empty>}
            {pool.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200" data-round-selection>
                    <p className="text-sm text-slate-600">
                        {pool.length > need
                            ? <>Showing <b>{visible.length}</b> random questions of <b>{pool.length}</b> in {ROUND_NAMES[round]}.</>
                            : <>Showing all <b>{pool.length}</b> {ROUND_NAMES[round]} question{pool.length === 1 ? '' : 's'}.</>}
                        {short > 0 && <span className="ml-1 font-bold text-amber-700">{short} more needed for a full round of {need}.</span>}
                    </p>
                    <button type="button" onClick={shuffle} disabled={shuffling || (allApproved ? shownApproved.length < 2 : pool.filter((x) => !approvedNow(x)).length <= need - pool.filter(approvedNow).length)} data-shuffle
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
                        title={allApproved ? 'Shuffle the order of the approved questions (the order the quiz asks them in)' : pool.length <= need ? 'Every question is already shown' : `Show another random ${need}`}>
                        {shuffling ? <Loader2 size={14} className="animate-spin" /> : <Shuffle size={14} />} {allApproved ? 'Shuffle order' : 'Shuffle'}
                    </button>
                </div>
            )}
            <ul className="space-y-2">
                {visible.map((x) => (
                    <li key={x._id} data-approved={approvedNow(x) || undefined}
                        className={`flex flex-col gap-3 rounded-2xl border p-3 shadow-sm transition-colors sm:flex-row sm:items-start ${approvedNow(x) ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200' : 'border-slate-200 bg-white'}`}>
                        {/* The picture, small, beside the question (Picture Challenge). */}
                        {x.imageUrl
                            ? <img src={x.imageUrl} alt={`Picture for: ${x.prompt}`} className="h-16 w-24 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1" data-question-image />
                            : x.round === 2 && <span className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><ImageIcon size={20} /></span>}
                        <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                                {x.category && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{x.category}</span>}
                                {approvedNow(x) && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-white">Approved</span>}
                            </p>
                            <p className="mt-1 font-semibold text-slate-800">{x.prompt}</p>
                            {/* The four options, each in its own box; the right one in green. */}
                            <ol className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4" data-options>
                                {x.options.map((o, i) => (
                                    <li key={i} data-correct={i === x.answer || undefined}
                                        className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-sm ${i === x.answer ? 'border-emerald-400 bg-emerald-50 font-semibold text-emerald-900' : 'border-slate-200 bg-white text-slate-700'}`}>
                                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-black ${i === x.answer ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{i === x.answer ? <CheckCircle2 size={14} /> : LETTERS[i]}</span>
                                        <span className="min-w-0 break-words">{o}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1.5 sm:flex-col sm:items-stretch">
                            {!approvedNow(x)
                                ? <button type="button" onClick={() => review(x, true)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"><CheckCircle2 size={14} /> {x.round === 3 ? 'Verify & approve' : 'Approve'}</button>
                                : <button type="button" onClick={() => review(x, false)} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Undo2 size={14} /> {pending[x._id] ? 'Undo' : 'Back to draft'}</button>}
                            <button type="button" onClick={() => setEditing(x)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Pencil size={14} /> Edit</button>
                            <button type="button" onClick={() => removeOne(x)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-700 ring-1 ring-slate-200 hover:bg-rose-50"><Trash2 size={14} /> Delete</button>
                        </div>
                    </li>
                ))}
            </ul>
            {/* This round's choices, saved together: the final decision. */}
            {/* Save shows only while there are changes; once saved, the round says so. */}
            {pool.length > 0 && (pendingHere.length > 0 ? (
                <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-end gap-3 rounded-xl bg-white px-3 py-2.5 shadow-lg ring-1 ring-indigo-200" data-save-round={round}>
                    <span className="text-sm font-semibold text-amber-700">{pendingHere.length} change{pendingHere.length === 1 ? '' : 's'} not saved</span>
                    <button type="button" disabled={saving} onClick={saveRound} className={BTN}>
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save {ROUND_NAMES[round]}
                    </button>
                </div>
            ) : approvedCount(round) > 0 && (
                <p className="flex items-center justify-end gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700" data-round-saved={round}>
                    <CheckCircle2 size={16} aria-hidden="true" /> Round {round} saved · {approvedCount(round)} approved
                </p>
            ))}
            <DeleteConfirmModal isOpen={!!confirming} onClose={() => setConfirming(null)} onConfirm={() => confirming.onConfirm()} title={confirming?.title} message={confirming?.message} confirmLabel="OK" />
            {editing && <QuestionForm question={editing._id ? editing : null} round={editing.round} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); onChanged(); }} />}
        </div>
    );
}
