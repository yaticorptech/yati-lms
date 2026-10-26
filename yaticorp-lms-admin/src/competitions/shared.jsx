/**
 * What the admin panel's competition pages share: the games, status labels,
 * dates, and the create / edit form.
 */
import { useState } from 'react';
import { X, Save, Loader2, Rocket, ImagePlus, Trash2, ChessKnight, Dices, Target, Spade, Gamepad2, Brain, Code2, Plus, Check } from 'lucide-react';
import { INPUT, LABEL, BTN, BTN2 } from '../components/orgUi';
import { GAMES, RETIRED_GAMES, CHALLENGES, STATUS, ORDINAL, toLocalInput, errorOf } from './constants';

/**
 * A game's icon, on its own colour: a knight for chess, dice for Ludo, the
 * board's centre ring for carrom (and a card for UNO, for a competition made
 * before it was removed on 2026-10-23). Drawn from the icon library
 * rather than the emoji the server sends, which every phone and computer drew
 * differently (and some as an empty box).
 */
const GAME_ICONS = {
    chess: [ChessKnight, 'bg-indigo-50 text-indigo-600'],
    ludo: [Dices, 'bg-amber-50 text-amber-600'],
    carrom: [Target, 'bg-orange-50 text-orange-600'],
    uno: [Spade, 'bg-rose-50 text-rose-600'],
    quiz: [Brain, 'bg-violet-50 text-violet-600'],
    hackathon: [Code2, 'bg-emerald-50 text-emerald-600']
};
export const GameIcon = ({ game, size = 22, className = 'h-11 w-11 rounded-xl' }) => {
    const [Icon, tone] = GAME_ICONS[game] || [Gamepad2, 'bg-slate-100 text-slate-600'];
    return <span aria-hidden className={`flex shrink-0 items-center justify-center ${tone} ${className}`}><Icon size={size} /></span>;
};

export const Chip = ({ status }) => {
    const [label, cls] = STATUS[status] || [status, 'bg-slate-100 text-slate-600'];
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>{label}</span>;
};

/** "2026-10-25T10:00" → ["2026-10-25", "10:00"], for a date and a time field. */
const split = (local) => (local ? [local.slice(0, 10), local.slice(11, 16)] : ['', '']);

const blankQuestion = () => ({ prompt: '', options: ['', '', '', ''], answer: 0, points: 1 });
/** When a quiz or hackathon closes by default: two hours after a quiz opens, two days after a hackathon starts. */
const defaultEnd = (game, startDate, startTime) => {
    const start = startDate ? new Date(`${startDate}T${startTime || '10:00'}`) : new Date(Date.now() + 7 * 86400e3);
    return toLocalInput(new Date(start.getTime() + (game === 'quiz' ? 2 * 3600e3 : 2 * 86400e3)));
};

const blank = (organizer) => {
    const start = new Date(Date.now() + 7 * 86400e3); start.setHours(10, 0, 0, 0);
    const deadline = new Date(start.getTime() - 2 * 86400e3);
    const [startDate, startTime] = split(toLocalInput(start));
    return {
        name: '', organizedBy: organizer, description: '', game: 'chess',
        startDate, startTime, registrationOpensAt: '', registrationDeadline: toLocalInput(deadline),
        maxTeams: 16, playersPerTeam: 2, playersPerSide: 1, teamsPerMatch: 4,
        entry: 'team', endsAt: '', quiz: { minutes: 15, questions: [blankQuestion()] }, hackathon: { problem: '', criteria: '' },
        gameOptions: { clockMinutes: 10, turnSeconds: 30, tokensPerPlayer: 4 },
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
    entry: c.entry || 'team',
    endsAt: toLocalInput(c.endsAt),
    quiz: { minutes: c.quiz?.minutes || 15, questions: c.quiz?.questions?.length ? c.quiz.questions.map((q) => ({ ...q, options: [...q.options, '', '', '', ''].slice(0, Math.max(4, q.options.length)) })) : [blankQuestion()] },
    hackathon: { problem: c.hackathon?.problem || '', criteria: c.hackathon?.criteria || '' },
    participationCertificates: c.participationCertificates !== false,
    gameOptions: { clockMinutes: 10, turnSeconds: 30, tokensPerPlayer: 4, ...(c.gameOptions || {}) },
    prizes: [1, 2, 3].map((place) => c.prizes.find((p) => p.place === place) || { place, title: '', xp: 0, rewardPoints: 0 })
});

/**
 * Create or edit a competition. `locked` once the matches are drawn: the game
 * and the team format can no longer change. `uploadBanner(file)` resolves to
 * the uploaded image's address. `organizer` fills "Organized by" for a new one.
 * `hosted`: a college's own competition — for its students only, with teams
 * the college makes, so it counts teams, not colleges. `hostName`: that
 * college, when someone else (the platform admin) has the form open.
 */
export const CompetitionForm = ({ competition = null, locked = false, hosted = false, hostName = null, organizer = 'YATICORP', uploadBanner, onCancel, onSave }) => {
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
    // A quiz's questions, and a hackathon's problem.
    const setQuiz = (patch) => setF((x) => ({ ...x, quiz: { ...x.quiz, ...patch } }));
    const setQuestion = (i, patch) => setF((x) => ({ ...x, quiz: { ...x.quiz, questions: x.quiz.questions.map((q, k) => (k === i ? { ...q, ...patch } : q)) } }));
    const setHack = (patch) => setF((x) => ({ ...x, hackathon: { ...x.hackathon, ...patch } }));
    const challenge = CHALLENGES.includes(f.game);
    const solo = challenge && f.entry === 'individual';

    const submit = (open) => {
        setBusy(open ? 'open' : 'save'); setError('');
        const { startDate, startTime, ...rest } = f;
        const body = {
            ...rest,
            startsAt: startDate ? new Date(`${startDate}T${startTime || '10:00'}`).toISOString() : '',
            registrationOpensAt: f.registrationOpensAt ? new Date(f.registrationOpensAt).toISOString() : null,
            registrationDeadline: f.registrationDeadline ? new Date(f.registrationDeadline).toISOString() : '',
            endsAt: challenge && f.endsAt ? new Date(f.endsAt).toISOString() : null,
            // Empty choices left out, the right one's place counted among those kept.
            quiz: f.game === 'quiz' ? {
                minutes: Number(f.quiz.minutes) || 15,
                questions: f.quiz.questions.map((q) => {
                    const kept = q.options.map((o, k) => [String(o).trim(), k]).filter(([o]) => o);
                    return { id: q.id, prompt: q.prompt, points: Number(q.points) || 1, options: kept.map(([o]) => o), answer: kept.findIndex(([, k]) => k === Number(q.answer)) };
                })
            } : undefined,
            hackathon: f.game === 'hackathon' ? f.hackathon : undefined,
            prizes: f.prizes.filter((p) => p.title || Number(p.xp) || Number(p.rewardPoints)),
            open
        };
        onSave(body).catch((err) => setError(errorOf(err))).finally(() => setBusy(''));
    };
    const multi = f.game === 'ludo';

    // One popup that fits the screen: the title and the Save / Publish buttons
    // stay put and the form scrolls between them. It used to be as tall as the
    // form, running off the bottom of a phone, with the page scrolling behind.
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:p-6" onClick={onCancel}>
            <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); submit(false); }}
                className="flex max-h-[85dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[90dvh]" aria-labelledby="comp-form-title">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                    <h2 id="comp-form-title" className="font-bold text-slate-800">{competition ? 'Edit competition' : hosted ? 'New competition for your students' : 'New inter-college competition'}</h2>
                    <button type="button" onClick={onCancel} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"><X size={18} /></button>
                </div>
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="sm:col-span-2"><span className={LABEL}>Competition name</span>
                            <input required maxLength={140} value={f.name} onChange={(e) => set({ name: e.target.value })} className={INPUT} placeholder="e.g. Inter-College Chess Championship 2026" /></label>
                        <label><span className={LABEL}>Organized by</span>
                            <input maxLength={140} value={f.organizedBy} onChange={(e) => set({ organizedBy: e.target.value })} className={INPUT} /></label>
                        <div><span className={LABEL}>Game</span>
                            <div role="radiogroup" aria-label="Game" className="grid grid-cols-3 gap-2">
                                {/* Chess; and, for a competition made before 2026-10-23, the game it was made for. */}
                                {Object.entries({ ...GAMES, ...(RETIRED_GAMES[f.game] ? { [f.game]: RETIRED_GAMES[f.game] } : {}) }).map(([id, g]) => (
                                    <button key={id} type="button" role="radio" aria-checked={f.game === id} disabled={locked}
                                        onClick={() => set({ game: id, teamsPerMatch: id === 'ludo' ? 4 : 2, playersPerSide: 1, ...(CHALLENGES.includes(id) && !f.endsAt ? { endsAt: defaultEnd(id, f.startDate, f.startTime) } : {}) })}
                                        className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${f.game === id ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                                        <GameIcon game={id} size={18} className="h-9 w-9 rounded-lg" />{g.label}
                                    </button>
                                ))}
                            </div>
                            <span className="mt-1 block text-xs text-slate-500">{(GAMES[f.game] || RETIRED_GAMES[f.game])?.note}</span></div>
                        {/* A quiz or a hackathon: college teams, or students on their own (each signs up themselves). */}
                        {challenge && (
                            <div className="sm:col-span-2"><span className={LABEL}>Who enters</span>
                                <div role="radiogroup" aria-label="Who enters" className="grid gap-2 sm:grid-cols-2">
                                    {[['team', hosted ? 'Teams of your students' : 'College teams', hosted ? 'You make the teams from your students.' : 'Each college\'s coordinator enters a team; you approve it.'],
                                        ['individual', 'Students on their own', hosted ? 'Your students sign up themselves.' : 'Any student signs up themselves, from the student app.']].map(([v, label, note]) => (
                                        <button key={v} type="button" role="radio" aria-checked={f.entry === v} onClick={() => set({ entry: v })} data-entry={v}
                                            className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${f.entry === v ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                            <span className="block text-sm font-bold text-slate-800">{label}</span>
                                            <span className="block text-xs text-slate-500">{note}</span>
                                        </button>
                                    ))}
                                </div></div>
                        )}
                        <div><span className={LABEL}>Competition type</span>
                            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">{!hosted ? 'Inter-College' : hostName ? `${hostName} only` : 'Your college only'}</p>
                            {hosted && <span className="mt-1 block text-xs text-slate-500">{hostName ? `Only ${hostName}'s students see it. The college makes the teams from them.` : 'Only your students see it. You make the teams from them.'}</span>}</div>
                        <label className="sm:col-span-2"><span className={LABEL}>Competition description <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span></span>
                            <textarea rows={2} maxLength={2000} value={f.description} onChange={(e) => set({ description: e.target.value })} className={INPUT} /></label>
                        <label><span className={LABEL}>Registration start <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span></span>
                            <input type="datetime-local" value={f.registrationOpensAt} onChange={(e) => set({ registrationOpensAt: e.target.value })} className={INPUT} />
                            <span className="mt-1 block text-xs text-slate-500">Empty: registration opens when you publish.</span></label>
                        <label><span className={LABEL}>Registration end</span>
                            <input type="datetime-local" required value={f.registrationDeadline} onChange={(e) => set({ registrationDeadline: e.target.value })} className={INPUT} /></label>
                        <label><span className={LABEL}>{f.game === 'quiz' ? 'Quiz opens on' : 'Competition date'}</span>
                            <input type="date" required value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} className={INPUT} /></label>
                        <label><span className={LABEL}>Start time</span>
                            <input type="time" required value={f.startTime} onChange={(e) => set({ startTime: e.target.value })} className={INPUT} /></label>
                        {challenge && (
                            <label className="sm:col-span-2"><span className={LABEL}>{f.game === 'quiz' ? 'Quiz closes' : 'Projects due by'}</span>
                                <input type="datetime-local" required value={f.endsAt} onChange={(e) => set({ endsAt: e.target.value })} className={INPUT} data-ends-at />
                                <span className="mt-1 block text-xs text-slate-500">{f.game === 'quiz' ? 'Players can start any time before this; it is decided by itself when it closes.' : 'Teams can hand in and change their project until then. You mark the projects after.'}</span></label>
                        )}
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

                    {f.game === 'quiz' && (
                        <fieldset className="space-y-3 rounded-2xl border border-slate-200 p-4" data-quiz-editor>
                            <legend className="px-1 text-sm font-bold text-slate-700">Questions</legend>
                            <label className="block sm:w-1/2"><span className={LABEL}>Time for each player (minutes)</span>
                                <input type="number" min={1} max={180} value={f.quiz.minutes} onChange={(e) => setQuiz({ minutes: e.target.value })} className={INPUT} /></label>
                            {f.quiz.questions.map((q, i) => (
                                <div key={i} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3" data-question={i}>
                                    <div className="flex items-start gap-2">
                                        <label className="min-w-0 flex-1"><span className={LABEL}>Question {i + 1}</span>
                                            <textarea rows={2} maxLength={1000} required value={q.prompt} onChange={(e) => setQuestion(i, { prompt: e.target.value })} className={INPUT} /></label>
                                        <label className="w-20"><span className={LABEL}>Points</span>
                                            <input type="number" min={1} max={10} value={q.points} onChange={(e) => setQuestion(i, { points: e.target.value })} className={INPUT} /></label>
                                        {f.quiz.questions.length > 1 && <button type="button" aria-label={`Remove question ${i + 1}`} onClick={() => setQuiz({ questions: f.quiz.questions.filter((_, k) => k !== i) })} className="mt-6 rounded-lg p-2 text-slate-400 hover:bg-white hover:text-rose-600"><Trash2 size={16} /></button>}
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {q.options.map((o, k) => (
                                            <div key={k} className="flex items-center gap-2">
                                                <button type="button" role="radio" aria-checked={Number(q.answer) === k} aria-label={`Choice ${k + 1} is right`} onClick={() => setQuestion(i, { answer: k })}
                                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${Number(q.answer) === k ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white text-transparent hover:border-emerald-400'}`}><Check size={15} /></button>
                                                <input value={o} maxLength={300} placeholder={`Choice ${k + 1}${k > 1 ? ' (optional)' : ''}`} onChange={(e) => setQuestion(i, { options: q.options.map((x, j) => (j === k ? e.target.value : x)) })} className={INPUT} />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500">Tick the right choice. Empty choices are left out.</p>
                                </div>
                            ))}
                            <button type="button" className={BTN2} onClick={() => setQuiz({ questions: [...f.quiz.questions, blankQuestion()] })}><Plus size={15} /> Add a question</button>
                        </fieldset>
                    )}
                    {f.game === 'hackathon' && (
                        <fieldset className="space-y-3 rounded-2xl border border-slate-200 p-4" data-hackathon-editor>
                            <legend className="px-1 text-sm font-bold text-slate-700">The challenge</legend>
                            <label className="block"><span className={LABEL}>Problem statement</span>
                                <textarea rows={5} maxLength={8000} required value={f.hackathon.problem} onChange={(e) => setHack({ problem: e.target.value })} className={INPUT} placeholder="What should the teams build? Who is it for, and what must it do?" />
                                <span className="mt-1 block text-xs text-slate-500">Shown to the teams when the hackathon starts.</span></label>
                            <label className="block"><span className={LABEL}>How projects are judged <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span></span>
                                <textarea rows={2} maxLength={2000} value={f.hackathon.criteria} onChange={(e) => setHack({ criteria: e.target.value })} className={INPUT} placeholder="e.g. Idea 30 · Working demo 40 · Code quality 30" /></label>
                        </fieldset>
                    )}

                    <fieldset className="grid gap-4 rounded-2xl border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
                        <legend className="px-1 text-sm font-bold text-slate-700">{solo ? 'Entry limit' : 'Player / team limit'}</legend>
                        <label><span className={LABEL}>{solo ? 'Number of students allowed' : hosted ? 'Number of teams allowed' : 'Number of colleges allowed'}</span>
                            <input type="number" min={2} max={solo ? 5000 : 256} value={f.maxTeams} onChange={(e) => set({ maxTeams: e.target.value })} className={INPUT} /></label>
                        {!solo && (
                            <label><span className={LABEL}>Players per team</span>
                                <input type="number" min={1} max={10} disabled={locked} value={f.playersPerTeam} onChange={(e) => set({ playersPerTeam: e.target.value })} className={INPUT} /></label>
                        )}
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
                            <label><span className={LABEL}>Clock</span>
                                <input type="number" min={1} max={60} value={f.gameOptions.clockMinutes} onChange={(e) => setOpt('clockMinutes', e.target.value)} className={INPUT} /></label>
                        )}
                        {['ludo', 'carrom', 'uno'].includes(f.game) && (
                            <label><span className={LABEL}>Seconds per turn</span>
                                <input type="number" min={10} max={120} value={f.gameOptions.turnSeconds} onChange={(e) => setOpt('turnSeconds', e.target.value)} className={INPUT} /></label>
                        )}
                        {f.game === 'ludo' && (
                            <label><span className={LABEL}>Tokens each</span>
                                <select value={f.gameOptions.tokensPerPlayer} onChange={(e) => setOpt('tokensPerPlayer', Number(e.target.value))} className={INPUT}>
                                    <option value={2}>2 (quick)</option><option value={3}>3</option><option value={4}>4 (classic)</option>
                                </select></label>
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
                <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">
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
