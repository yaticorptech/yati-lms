/**
 * Quiz Arena in the admin panel: what its pages share — the round names, the
 * state badge, the contest form and the question form. The server is
 * yaticorp-lms-server/src/competitions/arena/.
 */
import { useState } from 'react';
import { X, Save, Loader2, ImagePlus, Trash2, Check, Crop as CropIcon, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import { INPUT, LABEL, BTN, BTN2, Dialog, DialogTitle } from '../components/orgUi';
import { toLocalInput, errorOf } from '../competitions/constants';
import { DateTimeInput } from '../components/DateTimeInput';
import ImageCropper from '../components/ImageCropper';
import { RewardsFields, EntryFeeField } from '../competitions/shared';

/*
 * The platform admin's Quiz Arena, or a hosting college's own (its question
 * bank and contests), by the panel it is opened in.
 */
const inOrg = () => window.location.pathname.startsWith('/organization');
export const arenaApi = () => (inOrg() ? '/competitions/org/host/arena' : '/competitions/arena/admin');
/** A Quiz Arena page's address in this panel. */
export const arenaPath = (p) => `${inOrg() ? '/organization' : ''}${p}`;
/** Where the competitions list is, to go back to. */
export const arenaHome = () => (inOrg() ? '/organization/competitions?tab=host' : '/competitions');
export const ROUND_NAMES = { 1: 'Live Quiz Battle', 2: 'Picture Challenge', 3: 'Current Affairs Clash' };
export const ROUND_HINTS = {
    1: 'General knowledge, science, technology, logical reasoning, mathematics, history and geography.',
    2: 'Identify a personality, monument, sport, logo or flag from a picture.',
    3: 'Indian and international news, government schemes, sports, awards, science and recent events. Verify each answer before approving.'
};
export const CATEGORIES = {
    1: ['General Knowledge', 'Science', 'Technology', 'Logical Reasoning', 'Mathematics', 'History', 'Geography'],
    2: ['Personality', 'Monument', 'Sport', 'Logo', 'Flag'],
    3: ['India', 'International', 'Government Schemes', 'Sports', 'Awards', 'Science', 'Recent Events']
};
export const LETTERS = ['A', 'B', 'C', 'D'];

const STATES = {
    draft: ['Draft', 'bg-slate-100 text-slate-600'],
    registration: ['Registration open', 'bg-emerald-50 text-emerald-700'],
    upcoming: ['Registration closed', 'bg-sky-50 text-sky-700'],
    live: ['Live', 'bg-rose-50 text-rose-700'],
    ended: ['Ended — results to publish', 'bg-amber-50 text-amber-700'],
    results: ['Results published', 'bg-indigo-50 text-indigo-700'],
    cancelled: ['Cancelled', 'bg-slate-100 text-slate-500']
};
export const StateChip = ({ state }) => {
    const [label, cls] = STATES[state] || [state, 'bg-slate-100 text-slate-600'];
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>{label}</span>;
};

export const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
export const minutes = (ms) => `${Math.floor(ms / 60000)} min ${Math.round((ms % 60000) / 1000)} s`;

/** An image, uploaded through the arena's upload; resolves to its address. */
export const uploadImage = (file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post(`${arenaApi()}/image`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.url);
};

/**
 * The question's picture. A chosen picture opens in the cropper first (crop
 * it, or use it whole) and only then uploads; an uploaded one can be cropped
 * again, replaced or removed.
 */
const ImageField = ({ value, onChange, label, required }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    // { src, name, file? } while cropping: a new file, or the current picture.
    const [cropping, setCropping] = useState(null);
    const upload = (file) => {
        setBusy(true); setError('');
        uploadImage(file).then((url) => { onChange(url); setCropping(null); }).catch((e) => setError(errorOf(e))).finally(() => setBusy(false));
    };
    const pick = (file) => {
        if (!file) return;
        setError('');
        setCropping({ src: URL.createObjectURL(file), name: file.name, file });
    };
    const chooser = (text, cls) => (
        <label className={cls}>
            {text}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
    );
    const action = 'inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-bold shadow';
    return (
        <div>
            <span className={LABEL}>{label}{required ? '' : <span className="font-normal normal-case tracking-normal text-slate-400"> (optional)</span>}</span>
            {/* The cropper, in its own pop-up over the question form, the moment a picture is chosen. */}
            {cropping && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true" aria-label="Crop the picture">
                    <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-2xl">
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-lg font-bold text-slate-800">Crop the picture</p>
                            <button type="button" onClick={() => setCropping(null)} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
                        </div>
                        <ImageCropper src={cropping.src} name={cropping.name}
                            onDone={upload}
                            onSkip={cropping.file ? () => upload(cropping.file) : null}
                            onCancel={() => setCropping(null)} />
                        {busy && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Loader2 size={13} className="animate-spin" /> Uploading…</p>}
                        {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
                    </div>
                </div>
            )}
            {value ? (
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img src={value} alt="" className="mx-auto max-h-48 object-contain" />
                    <span className="absolute right-2 top-2 flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => setCropping({ src: value, name: 'picture' })} className={`${action} text-indigo-700`}><CropIcon size={13} /> Crop</button>
                        {chooser(<><RefreshCw size={13} /> Replace</>, `${action} text-slate-700`)}
                        <button type="button" onClick={() => onChange('')} className={`${action} text-rose-700`}><Trash2 size={13} /> Remove</button>
                    </span>
                </div>
            ) : chooser(<>{busy ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />} Upload an image</>,
                'flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-500 hover:border-indigo-300 hover:text-indigo-700')}
            {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
        </div>
    );
};

/* ── A question ──────────────────────────────────────────────────────── */

const blankQuestion = (round = 1) => ({ round, category: '', difficulty: 'medium', prompt: '', imageUrl: '', options: ['', '', '', ''], answer: 0, explanation: '', source: '' });

/** Add or edit a question. Saving an approved one sends it back to review. */
export const QuestionForm = ({ question, round, onCancel, onSaved }) => {
    const [f, setF] = useState(() => (question ? { ...blankQuestion(), ...question, options: [...question.options] } : blankQuestion(round || 1)));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (patch) => setF((x) => ({ ...x, ...patch }));
    const submit = (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        const body = { round: f.round, category: f.category, difficulty: f.difficulty, prompt: f.prompt, imageUrl: f.imageUrl, options: f.options, answer: f.answer, explanation: f.explanation, source: f.source };
        (question ? api.put(`${arenaApi()}/questions/${question._id}`, body) : api.post(`${arenaApi()}/questions`, body))
            .then((r) => onSaved(r.data.question)).catch((err) => setError(errorOf(err))).finally(() => setBusy(false));
    };
    return (
        <Dialog onClose={onCancel} size="max-w-2xl" z="z-[140]">
            <form onSubmit={submit} className="flex min-h-0 flex-col">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                    <DialogTitle>{question ? 'Edit question' : 'New question'}</DialogTitle>
                    <button type="button" onClick={onCancel} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"><X size={18} /></button>
                </div>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                    {question?.status === 'approved' && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Saving changes sends this question back to draft: it must be reviewed again.</p>}
                    <div className="grid gap-3 sm:grid-cols-3">
                        <label><span className={LABEL}>Round</span>
                            <select value={f.round} onChange={(e) => set({ round: Number(e.target.value), category: '' })} className={INPUT}>
                                {[1, 2, 3].map((r) => <option key={r} value={r}>{r} · {ROUND_NAMES[r]}</option>)}
                            </select></label>
                        <label><span className={LABEL}>Category</span>
                            <input list={`cats-${f.round}`} value={f.category} onChange={(e) => set({ category: e.target.value })} className={INPUT} maxLength={60} />
                            <datalist id={`cats-${f.round}`}>{CATEGORIES[f.round].map((c) => <option key={c} value={c} />)}</datalist></label>
                        <label><span className={LABEL}>Difficulty</span>
                            <select value={f.difficulty} onChange={(e) => set({ difficulty: e.target.value })} className={INPUT}>
                                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                            </select></label>
                    </div>
                    <p className="text-xs text-slate-500">{ROUND_HINTS[f.round]}</p>
                    <label className="block"><span className={LABEL}>Question</span>
                        <textarea required rows={2} maxLength={500} value={f.prompt} onChange={(e) => set({ prompt: e.target.value })} className={INPUT} /></label>
                    <ImageField label={f.round === 2 ? 'Picture' : 'Picture'} required={f.round === 2} value={f.imageUrl} onChange={(imageUrl) => set({ imageUrl })} />
                    <fieldset>
                        <legend className={LABEL}>Options — tick the correct answer</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {f.options.map((o, i) => (
                                <div key={i} className={`flex items-center gap-2 rounded-xl border p-1.5 ${f.answer === i ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
                                    <button type="button" onClick={() => set({ answer: i })} aria-pressed={f.answer === i} aria-label={`Option ${LETTERS[i]} is correct`}
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black ${f.answer === i ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                        {f.answer === i ? <Check size={16} /> : LETTERS[i]}
                                    </button>
                                    <input required maxLength={200} value={o} onChange={(e) => set({ options: f.options.map((x, k) => (k === i ? e.target.value : x)) })} className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none" placeholder={`Option ${LETTERS[i]}`} />
                                </div>
                            ))}
                        </div>
                    </fieldset>
                    <label className="block"><span className={LABEL}>Explanation <span className="font-normal normal-case tracking-normal text-slate-400">(shown after the question closes)</span></span>
                        <textarea rows={2} maxLength={600} value={f.explanation} onChange={(e) => set({ explanation: e.target.value })} className={INPUT} /></label>
                    {f.round === 3 && (
                        <label className="block"><span className={LABEL}>Source checked</span>
                            <input maxLength={300} value={f.source} onChange={(e) => set({ source: e.target.value })} className={INPUT} placeholder="e.g. PIB press release, 12 Oct 2026" /></label>
                    )}
                    {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
                </div>
                <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-3">
                    <button type="button" onClick={onCancel} className={BTN2}>Cancel</button>
                    <button type="submit" disabled={busy} className={BTN}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save as draft</button>
                </div>
            </form>
        </Dialog>
    );
};

/* ── A contest ───────────────────────────────────────────────────────── */

const blankContest = () => {
    const start = new Date(Date.now() + 3 * 86400e3); start.setHours(11, 0, 0, 0);
    return {
        title: '', description: '', instructions: '', organizedBy: 'YATICORP', bannerUrl: '',
        startsAt: toLocalInput(start), registrationDeadline: toLocalInput(new Date(start.getTime() - 3600e3)), registrationOpensAt: '',
        maxParticipants: 500, playersPerCollege: 10, counts: { 1: 10, 2: 5, 3: 10 }, secondsPerQuestion: 20, pointsPerQuestion: 100,
        eligibility: { organizationIds: [], collegeStudentsOnly: true },
        certificates: { winners: true, participants: true, minScore: 0 },
        prizes: [{ place: 1, title: 'Winner', xp: 300, rewardPoints: 100 }, { place: 2, title: 'Runner-up', xp: 200, rewardPoints: 50 }, { place: 3, title: 'Third place', xp: 100, rewardPoints: 25 }],
        participationXp: 20,
        entryFee: { enabled: false, amount: 100 }
    };
};

/**
 * Create or edit a contest. `published`: only the words, the deadline and the
 * seats may change (the questions, timing and scoring are fixed). Every
 * college may take part (their coordinators enter students) and certificates
 * go to the top three and to everyone who takes part: the form does not ask.
 */
export const ContestForm = ({ contest, onCancel, onSaved }) => {
    const published = contest && contest.status !== 'draft';
    const [f, setF] = useState(() => (contest ? {
        ...blankContest(), ...contest,
        startsAt: toLocalInput(contest.startsAtPlanned || contest.startsAt), registrationDeadline: toLocalInput(contest.registrationDeadline), registrationOpensAt: toLocalInput(contest.registrationOpensAt),
        prizes: [1, 2, 3].map((place) => (contest.prizes || []).find((p) => p.place === place) || { place, title: '', xp: 0, rewardPoints: 0 }),
        entryFee: contest.entryFee?.enabled ? { enabled: true, amount: contest.entryFee.amount } : { enabled: false, amount: 100 },
        eligibility: { organizationIds: (contest.eligibility?.organizationIds || []).map(String), collegeStudentsOnly: contest.eligibility?.collegeStudentsOnly !== false }
    } : blankContest()));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (patch) => setF((x) => ({ ...x, ...patch }));
    const total = [1, 2, 3].reduce((n, r) => n + (Number(f.counts[r]) || 0), 0);
    const durationMs = [1, 2, 3].filter((r) => Number(f.counts[r]) > 0).reduce((t, r) => t + 8000 + Number(f.counts[r]) * (Number(f.secondsPerQuestion) * 1000 + 4000), 0);
    const submit = (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        const body = {
            title: f.title, description: f.description, instructions: f.instructions, organizedBy: f.organizedBy, bannerUrl: f.bannerUrl,
            startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : '', registrationDeadline: f.registrationDeadline ? new Date(f.registrationDeadline).toISOString() : '',
            registrationOpensAt: f.registrationOpensAt ? new Date(f.registrationOpensAt).toISOString() : '',
            maxParticipants: f.maxParticipants, playersPerCollege: f.playersPerCollege, counts: f.counts, secondsPerQuestion: f.secondsPerQuestion, pointsPerQuestion: f.pointsPerQuestion,
            eligibility: f.eligibility, certificates: f.certificates, prizes: f.prizes, participationXp: f.participationXp, entryFee: f.entryFee
        };
        (contest ? api.put(`${arenaApi()}/${contest.id}`, body) : api.post(arenaApi(), body))
            .then((r) => onSaved(r.data.competition)).catch((err) => setError(errorOf(err))).finally(() => setBusy(false));
    };
    const off = !!published;
    return (
        <Dialog onClose={onCancel} size="max-w-3xl">
            <form onSubmit={submit} className="flex min-h-0 flex-col">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                    <DialogTitle>{contest ? 'Edit Quiz Arena' : 'New Quiz Arena'}</DialogTitle>
                    <button type="button" onClick={onCancel} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"><X size={18} /></button>
                </div>
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                    {published && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Published: the questions, timing and scoring are fixed. You can still change the start time, the words, the registration dates, the seats and the rewards.</p>}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="sm:col-span-2"><span className={LABEL}>Title</span>
                            <input required maxLength={140} value={f.title} onChange={(e) => set({ title: e.target.value })} className={INPUT} placeholder="e.g. Quiz Arena — Inter-College Championship 2026" /></label>
                        <label><span className={LABEL}>Organized by</span>
                            <input maxLength={140} value={f.organizedBy} disabled={off} onChange={(e) => set({ organizedBy: e.target.value })} className={INPUT} /></label>
                        <label><span className={LABEL}>Seats (participant limit)</span>
                            <input type="number" min={1} max={100000} value={f.maxParticipants} onChange={(e) => set({ maxParticipants: e.target.value })} className={INPUT} /></label>
                        <label><span className={LABEL}>Students per college</span>
                            <input type="number" min={1} max={500} value={f.playersPerCollege} onChange={(e) => set({ playersPerCollege: e.target.value })} className={INPUT} />
                            <span className="mt-1 block text-xs text-slate-500">Each college's coordinator enters up to this many; you approve them.</span></label>
                        <label><span className={LABEL}>Starts (date and time)</span>
                            <DateTimeInput required value={f.startsAt} onChange={(v) => set({ startsAt: v })} label="Starts" /></label>
                        <label><span className={LABEL}>Registration start <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span></span>
                            <DateTimeInput value={f.registrationOpensAt} onChange={(v) => set({ registrationOpensAt: v })} label="Registration start" />
                            <span className="mt-1 block text-xs text-slate-500">Empty: registration opens when you publish.</span></label>
                        <label><span className={LABEL}>Registration deadline</span>
                            <DateTimeInput required value={f.registrationDeadline} onChange={(v) => set({ registrationDeadline: v })} label="Registration deadline" /></label>
                        <label className="sm:col-span-2"><span className={LABEL}>Description</span>
                            <textarea rows={2} maxLength={2000} value={f.description} onChange={(e) => set({ description: e.target.value })} className={INPUT} /></label>
                        <label className="sm:col-span-2"><span className={LABEL}>Instructions for students <span className="font-normal normal-case tracking-normal text-slate-400">(added to the standard rules)</span></span>
                            <textarea rows={3} maxLength={3000} value={f.instructions} onChange={(e) => set({ instructions: e.target.value })} className={INPUT} /></label>
                    </div>
                    <EntryFeeField value={f.entryFee} onChange={(entryFee) => set({ entryFee })} />
                    <RewardsFields team={false} value={{ prizes: f.prizes, participationXp: f.participationXp, winnersCert: f.certificates.winners, participantsCert: f.certificates.participants }}
                        onChange={(p) => set({ ...('prizes' in p && { prizes: p.prizes }), ...('participationXp' in p && { participationXp: p.participationXp }), certificates: { ...f.certificates, ...('winnersCert' in p && { winners: p.winnersCert }), ...('participantsCert' in p && { participants: p.participantsCert }) } })} />
                    <ImageField label="Banner" value={f.bannerUrl} onChange={(bannerUrl) => set({ bannerUrl })} />

                    <fieldset className="grid gap-4 rounded-2xl border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-5" disabled={off}>
                        <legend className="px-1 text-sm font-bold text-slate-700">Rounds, timer and marks</legend>
                        {[1, 2, 3].map((r) => (
                            <label key={r}><span className={LABEL}>R{r} · {ROUND_NAMES[r]}</span>
                                <input type="number" min={0} max={50} value={f.counts[r]} onChange={(e) => set({ counts: { ...f.counts, [r]: e.target.value } })} className={INPUT} /></label>
                        ))}
                        <label><span className={LABEL}>Seconds per question</span>
                            <input type="number" min={5} max={120} value={f.secondsPerQuestion} onChange={(e) => set({ secondsPerQuestion: e.target.value })} className={INPUT} /></label>
                        <label><span className={LABEL}>Points per correct</span>
                            <input type="number" min={1} max={1000} value={f.pointsPerQuestion} onChange={(e) => set({ pointsPerQuestion: e.target.value })} className={INPUT} /></label>
                        <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-5">{total} questions · maximum {total * (Number(f.pointsPerQuestion) || 0)} points · runs about {minutes(durationMs)} (each round opens with an 8 s intro; each answer shows for 4 s). Wrong or unanswered: 0.</p>
                    </fieldset>

                    {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
                </div>
                <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-3">
                    <button type="button" onClick={onCancel} className={BTN2}>Cancel</button>
                    <button type="submit" disabled={busy} className={BTN}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {contest ? 'Save' : 'Create draft'}</button>
                </div>
            </form>
        </Dialog>
    );
};
