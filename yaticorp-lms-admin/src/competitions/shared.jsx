/**
 * What the admin panel's competition pages share: the games, status labels,
 * dates, and the create / edit form.
 */
import { useState } from 'react';
import { X, Save, Loader2, Rocket, ImagePlus, Trash2 } from 'lucide-react';
import { INPUT, LABEL, BTN, BTN2 } from '../components/orgUi';
import { GAMES, STATUS, ORDINAL, toLocalInput, errorOf } from './constants';

export const Chip = ({ status }) => {
    const [label, cls] = STATUS[status] || [status, 'bg-slate-100 text-slate-600'];
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>{label}</span>;
};

/** "2026-10-25T10:00" → ["2026-10-25", "10:00"], for a date and a time field. */
const split = (local) => (local ? [local.slice(0, 10), local.slice(11, 16)] : ['', '']);

const blank = (organizer) => {
    const start = new Date(Date.now() + 7 * 86400e3); start.setHours(10, 0, 0, 0);
    const deadline = new Date(start.getTime() - 2 * 86400e3);
    const [startDate, startTime] = split(toLocalInput(start));
    return {
        name: '', organizedBy: organizer, description: '', game: 'chess',
        startDate, startTime, registrationOpensAt: '', registrationDeadline: toLocalInput(deadline),
        maxTeams: 16, playersPerTeam: 2, playersPerSide: 1, teamsPerMatch: 4,
        gameOptions: { clockMinutes: 10, turnSeconds: 30, tokensPerPlayer: 4, handSize: 7 },
        rules: '', prizeDetails: '', bannerUrl: '', participationXp: 20, certificates: true, participationCertificates: true,
        prizes: [{ place: 1, title: 'Winner', xp: 300, rewardPoints: 100 }, { place: 2, title: 'Runner-up', xp: 200, rewardPoints: 50 }, { place: 3, title: 'Third place', xp: 100, rewardPoints: 25 }]
    };
};

const fromCompetition = (c) => ({
    ...c,
    startDate: split(toLocalInput(c.startsAt))[0],
    startTime: split(toLocalInput(c.startsAt))[1],
    registrationOpensAt: toLocalInput(c.registrationOpensAt),
    registrationDeadline: toLocalInput(c.registrationDeadline),
    participationCertificates: c.participationCertificates !== false,
    gameOptions: { clockMinutes: 10, turnSeconds: 30, tokensPerPlayer: 4, handSize: 7, ...(c.gameOptions || {}) },
    prizes: [1, 2, 3].map((place) => c.prizes.find((p) => p.place === place) || { place, title: '', xp: 0, rewardPoints: 0 })
});

/**
 * Create or edit a competition. `locked` once the matches are drawn: the game
 * and the team format can no longer change. `uploadBanner(file)` resolves to
 * the uploaded image's address. `organizer` fills "Organized by" for a new one.
 */
export const CompetitionForm = ({ competition = null, locked = false, organizer = 'YATICORP', uploadBanner, onCancel, onSave }) => {
    const [f, setF] = useState(() => (competition ? fromCompetition(competition) : blank(organizer)));
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const pickBanner = (file) => {
        if (!file || !uploadBanner) return;
        setBusy('banner'); setError('');
        uploadBanner(file).then((url) => set({ bannerUrl: url })).catch((err) => setError(errorOf(err))).finally(() => setBusy(''));
    };
    const set = (patch) => setF((x) => ({ ...x, ...patch }));
    const setOpt = (k, v) => setF((x) => ({ ...x, gameOptions: { ...x.gameOptions, [k]: v } }));
    const setPrize = (place, patch) => setF((x) => ({ ...x, prizes: x.prizes.map((p) => (p.place === place ? { ...p, ...patch } : p)) }));

    const submit = (open) => {
        setBusy(open ? 'open' : 'save'); setError('');
        const { startDate, startTime, ...rest } = f;
        const body = {
            ...rest,
            startsAt: startDate ? new Date(`${startDate}T${startTime || '10:00'}`).toISOString() : '',
            registrationOpensAt: f.registrationOpensAt ? new Date(f.registrationOpensAt).toISOString() : null,
            registrationDeadline: f.registrationDeadline ? new Date(f.registrationDeadline).toISOString() : '',
            prizes: f.prizes.filter((p) => p.title || Number(p.xp) || Number(p.rewardPoints)),
            open
        };
        onSave(body).catch((err) => setError(errorOf(err))).finally(() => setBusy(''));
    };
    const multi = f.game === 'ludo' || f.game === 'uno';

    return (
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-3 backdrop-blur-sm sm:p-6" onClick={onCancel}>
            <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); submit(false); }}
                className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" aria-labelledby="comp-form-title">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                    <h2 id="comp-form-title" className="font-bold text-slate-800">{competition ? 'Edit competition' : 'New inter-college competition'}</h2>
                    <button type="button" onClick={onCancel} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"><X size={18} /></button>
                </div>
                <div className="space-y-5 p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="sm:col-span-2"><span className={LABEL}>Competition name</span>
                            <input required maxLength={140} value={f.name} onChange={(e) => set({ name: e.target.value })} className={INPUT} placeholder="e.g. Inter-College Chess Championship 2026" /></label>
                        <label><span className={LABEL}>Organized by</span>
                            <input maxLength={140} value={f.organizedBy} onChange={(e) => set({ organizedBy: e.target.value })} className={INPUT} /></label>
                        <label><span className={LABEL}>Game</span>
                            <select value={f.game} disabled={locked} onChange={(e) => set({ game: e.target.value, teamsPerMatch: ['ludo', 'uno'].includes(e.target.value) ? 4 : 2, playersPerSide: 1 })} className={INPUT}>
                                {Object.entries(GAMES).map(([id, g]) => <option key={id} value={id}>{g.emoji} {g.label}</option>)}
                            </select>
                            <span className="mt-1 block text-xs text-slate-500">{GAMES[f.game].note}</span></label>
                        <div><span className={LABEL}>Competition type</span>
                            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">Inter-College</p></div>
                        <label className="sm:col-span-2"><span className={LABEL}>Competition description <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span></span>
                            <textarea rows={2} maxLength={2000} value={f.description} onChange={(e) => set({ description: e.target.value })} className={INPUT} /></label>
                        <label><span className={LABEL}>Registration start <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span></span>
                            <input type="datetime-local" value={f.registrationOpensAt} onChange={(e) => set({ registrationOpensAt: e.target.value })} className={INPUT} />
                            <span className="mt-1 block text-xs text-slate-500">Empty: registration opens when you publish.</span></label>
                        <label><span className={LABEL}>Registration end</span>
                            <input type="datetime-local" required value={f.registrationDeadline} onChange={(e) => set({ registrationDeadline: e.target.value })} className={INPUT} /></label>
                        <label><span className={LABEL}>Competition date</span>
                            <input type="date" required value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} className={INPUT} /></label>
                        <label><span className={LABEL}>Start time</span>
                            <input type="time" required value={f.startTime} onChange={(e) => set({ startTime: e.target.value })} className={INPUT} /></label>
                    </div>

                    <div>
                        <span className={LABEL}>Competition banner / image <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span></span>
                        {f.bannerUrl ? (
                            <div className="relative overflow-hidden rounded-xl border border-slate-200">
                                <img src={f.bannerUrl} alt="Banner" className="h-32 w-full object-cover" />
                                <button type="button" onClick={() => set({ bannerUrl: '' })} className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-bold text-rose-700 shadow"><Trash2 size={13} /> Remove</button>
                            </div>
                        ) : (
                            <label className={`flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-500 hover:border-indigo-300 hover:text-indigo-700 ${uploadBanner ? '' : 'pointer-events-none opacity-50'}`}>
                                {busy === 'banner' ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />} Upload an image (wide works best)
                                <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickBanner(e.target.files?.[0])} />
                            </label>
                        )}
                    </div>

                    <fieldset className="grid gap-4 rounded-2xl border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
                        <legend className="px-1 text-sm font-bold text-slate-700">Player / team limit</legend>
                        <label><span className={LABEL}>Number of colleges allowed</span>
                            <input type="number" min={2} max={256} value={f.maxTeams} onChange={(e) => set({ maxTeams: e.target.value })} className={INPUT} /></label>
                        <label><span className={LABEL}>Players per team</span>
                            <input type="number" min={1} max={10} disabled={locked} value={f.playersPerTeam} onChange={(e) => set({ playersPerTeam: e.target.value })} className={INPUT} /></label>
                        {f.game === 'carrom' && (
                            <label><span className={LABEL}>At the board</span>
                                <select disabled={locked} value={f.playersPerSide} onChange={(e) => set({ playersPerSide: Number(e.target.value) })} className={INPUT}>
                                    <option value={1}>Singles (1)</option><option value={2}>Doubles (2)</option>
                                </select></label>
                        )}
                        {multi && (
                            <label><span className={LABEL}>Teams per match</span>
                                <select disabled={locked} value={f.teamsPerMatch} onChange={(e) => set({ teamsPerMatch: Number(e.target.value) })} className={INPUT}>
                                    <option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
                                </select></label>
                        )}
                        {f.game === 'chess' && (
                            <label><span className={LABEL}>Clock (minutes each)</span>
                                <input type="number" min={1} max={60} value={f.gameOptions.clockMinutes} onChange={(e) => setOpt('clockMinutes', e.target.value)} className={INPUT} /></label>
                        )}
                        {f.game !== 'chess' && (
                            <label><span className={LABEL}>Seconds per turn</span>
                                <input type="number" min={10} max={120} value={f.gameOptions.turnSeconds} onChange={(e) => setOpt('turnSeconds', e.target.value)} className={INPUT} /></label>
                        )}
                        {f.game === 'ludo' && (
                            <label><span className={LABEL}>Tokens each</span>
                                <select value={f.gameOptions.tokensPerPlayer} onChange={(e) => setOpt('tokensPerPlayer', Number(e.target.value))} className={INPUT}>
                                    <option value={2}>2 (quick)</option><option value={3}>3</option><option value={4}>4 (classic)</option>
                                </select></label>
                        )}
                        {f.game === 'uno' && (
                            <label><span className={LABEL}>Cards dealt</span>
                                <input type="number" min={5} max={7} value={f.gameOptions.handSize} onChange={(e) => setOpt('handSize', e.target.value)} className={INPUT} /></label>
                        )}
                    </fieldset>

                    <label className="block"><span className={LABEL}>Competition rules</span>
                        <textarea rows={4} maxLength={5000} value={f.rules} onChange={(e) => set({ rules: e.target.value })} className={INPUT} placeholder="Fair play, timing, what happens if a player does not join…" /></label>

                    <label className="block"><span className={LABEL}>Prize details</span>
                        <textarea rows={2} maxLength={600} value={f.prizeDetails} onChange={(e) => set({ prizeDetails: e.target.value })} className={INPUT} placeholder="e.g. Winner: trophy and ₹5,000 · Runner-up: medals" /></label>

                    <fieldset className="rounded-2xl border border-slate-200 p-4">
                        <legend className="px-1 text-sm font-bold text-slate-700">Reward points (for every player of the team)</legend>
                        <div className="space-y-3">
                            {f.prizes.map((p) => (
                                <div key={p.place} className="grid items-end gap-2 sm:grid-cols-[3rem_1fr_7rem_8rem]">
                                    <span className="pb-2.5 text-sm font-black text-slate-700">{ORDINAL[p.place]}</span>
                                    <label><span className={LABEL}>Title</span><input value={p.title} maxLength={120} onChange={(e) => setPrize(p.place, { title: e.target.value })} className={INPUT} /></label>
                                    <label><span className={LABEL}>XP</span><input type="number" min={0} value={p.xp} onChange={(e) => setPrize(p.place, { xp: e.target.value })} className={INPUT} /></label>
                                    <label><span className={LABEL}>Reward points</span><input type="number" min={0} value={p.rewardPoints} onChange={(e) => setPrize(p.place, { rewardPoints: e.target.value })} className={INPUT} /></label>
                                </div>
                            ))}
                        </div>
                        <label className="mt-4 block sm:w-1/2"><span className={LABEL}>XP for taking part (every player)</span>
                            <input type="number" min={0} max={10000} value={f.participationXp} onChange={(e) => set({ participationXp: e.target.value })} className={INPUT} /></label>
                    </fieldset>

                    <fieldset className="space-y-2 rounded-2xl border border-slate-200 p-4">
                        <legend className="px-1 text-sm font-bold text-slate-700">Certificates</legend>
                        <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700">
                            <input type="checkbox" checked={f.certificates} onChange={(e) => set({ certificates: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                            Winner, Runner-up and Third Place certificates
                        </label>
                        <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700">
                            <input type="checkbox" checked={f.participationCertificates} onChange={(e) => set({ participationCertificates: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                            Participation certificates for everyone else
                        </label>
                    </fieldset>

                    {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">
                    <button type="button" onClick={onCancel} className={BTN2}>Cancel</button>
                    <button type="submit" disabled={!!busy} className={BTN2}>{busy === 'save' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {competition ? 'Save changes' : 'Save Draft'}</button>
                    {!competition && (
                        <button type="button" disabled={!!busy} onClick={() => submit(true)} className={BTN}>{busy === 'open' ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />} Publish Competition</button>
                    )}
                </div>
            </form>
        </div>
    );
};
