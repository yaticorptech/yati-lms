/**
 * @description Three answers and the board opens: when you were born, which
 *              dates you want work, what you're interested in.
 *
 * The date of birth comes first because everything else depends on it: the
 * server derives the age band from it on every request, and the form shows
 * the band as soon as it is typed so nobody is surprised by what the section
 * then does or does not show.
 */
import { useState } from 'react';
import { Check, Loader2, Sparkles, X, CalendarDays, Heart, User } from 'lucide-react';
import { opportunitiesApi } from './api';
import { ageFromDob, bandFromAge, toDateInput } from './helpers';

const BAND_NOTE = {
    explore: { tone: 'border-sky-200 bg-sky-50 text-sky-900', text: 'Under 14 · Local jobs aren\'t open yet — you\'ll see how to explore skills and career paths instead.' },
    teen: { tone: 'border-amber-200 bg-amber-50 text-amber-900', text: '14–17 · Supervised, verified, daytime local jobs open to your age, with guardian approval before anything is arranged.' },
    adult: { tone: 'border-emerald-200 bg-emerald-50 text-emerald-900', text: '18+ · All local jobs, including late shifts and delivery.' }
};

const Chip = ({ on, onClick, children, icon }) => (
    <button type="button" onClick={onClick} aria-pressed={on}
        className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 sm:min-h-10 ${
            on ? 'border-indigo-300 bg-indigo-50 text-indigo-800 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40'
        }`}>
        {icon && <span aria-hidden="true">{icon}</span>}
        {on && <Check size={14} aria-hidden="true" />}
        {children}
    </button>
);

const Section = ({ icon: Icon, n, title, hint, children }) => (
    <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
        <h3 className="flex items-center gap-2 font-bold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">{n}</span>
            <Icon size={17} className="text-indigo-500" aria-hidden="true" /> {title}
        </h3>
        {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
        <div className="mt-3">{children}</div>
    </section>
);

const INPUT = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500';
const LABEL = 'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500';

export default function ProfileOnboarding({ vocab, initial, onSaved, onCancel }) {
    const today = toDateInput(new Date());
    const [form, setForm] = useState(() => ({
        dateOfBirth: toDateInput(initial?.dateOfBirth),
        wantFrom: toDateInput(initial?.wantFrom) || today,
        wantTo: toDateInput(initial?.wantTo) || toDateInput(initial?.wantFrom) || today,
        interests: initial?.interests || []
    }));
    const [oneDay, setOneDay] = useState(() => !initial || toDateInput(initial.wantFrom) === toDateInput(initial.wantTo));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const age = ageFromDob(form.dateOfBirth);
    const band = bandFromAge(age);
    const update = (patch) => { setError(''); setForm((f) => ({ ...f, ...patch })); };
    const toggle = (id) => update({ interests: form.interests.includes(id) ? form.interests.filter((x) => x !== id) : [...form.interests, id] });

    const save = async (e) => {
        e.preventDefault();
        if (age == null) return setError('Enter your date of birth — it decides which jobs you can see.');
        if (age < 5 || age > 100) return setError('That date of birth doesn\'t look right.');
        if (!form.wantFrom) return setError('Pick the date you want work on.');
        const wantTo = oneDay ? form.wantFrom : form.wantTo;
        if (wantTo < form.wantFrom) return setError('The end date is before the start date.');
        if (!form.interests.length) return setError('Pick at least one interest.');
        setBusy(true);
        try {
            const res = await opportunitiesApi.saveProfile({ ...form, wantTo });
            onSaved(res);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={save} aria-labelledby="opp-onboarding-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 animate-fade-in-up">
            <div className="mb-5">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">
                    <Sparkles size={13} aria-hidden="true" /> {initial ? 'Your details' : 'Three quick answers'}
                </p>
                <h2 id="opp-onboarding-title" className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                    {initial ? 'Update your dates and interests' : 'Tell us when you want work, and what kind'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">No resume, no CV — jobs on your dates that match your interests.</p>
            </div>

            <div className="space-y-4">
                <Section icon={User} n={1} title="Your date of birth" hint="Used only to decide which jobs are open to you. Never shown to organisations.">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="opp-dob" className={LABEL}>Date of birth</label>
                            <input id="opp-dob" type="date" value={form.dateOfBirth} max={today} required
                                onChange={(e) => update({ dateOfBirth: e.target.value })} className={INPUT} />
                        </div>
                        {band && (
                            <p className={`self-end rounded-xl border px-4 py-2.5 text-sm font-medium ${BAND_NOTE[band].tone}`} role="status">
                                {BAND_NOTE[band].text}
                            </p>
                        )}
                    </div>
                </Section>

                <Section icon={CalendarDays} n={2} title="When do you want work?" hint="Only jobs running on these dates are shown. You can change them any time.">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="opp-from" className={LABEL}>{oneDay ? 'Date' : 'From'}</label>
                            <input id="opp-from" type="date" value={form.wantFrom} min={today} required
                                onChange={(e) => update({ wantFrom: e.target.value, wantTo: form.wantTo < e.target.value ? e.target.value : form.wantTo })} className={INPUT} />
                        </div>
                        {!oneDay && (
                            <div>
                                <label htmlFor="opp-to" className={LABEL}>To</label>
                                <input id="opp-to" type="date" value={form.wantTo} min={form.wantFrom || today} required
                                    onChange={(e) => update({ wantTo: e.target.value })} className={INPUT} />
                            </div>
                        )}
                    </div>
                    <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                        <input type="checkbox" checked={oneDay} onChange={(e) => setOneDay(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                        Just one day
                    </label>
                </Section>

                <Section icon={Heart} n={3} title="What are you interested in?" hint="Pick as many as you like — jobs in these lines come first.">
                    <div className="flex flex-wrap gap-2">
                        {vocab.interests.map((i) => (
                            <Chip key={i.id} on={form.interests.includes(i.id)} onClick={() => toggle(i.id)} icon={i.icon}>{i.label}</Chip>
                        ))}
                    </div>
                </Section>
            </div>

            {error && <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700"><X size={14} aria-hidden="true" /> {error}</p>}

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
                {onCancel && (
                    <button type="button" onClick={onCancel} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:min-h-10">Cancel</button>
                )}
                <button type="submit" disabled={busy}
                    className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 sm:min-h-10">
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} aria-hidden="true" />} {initial ? 'Save' : 'Show my jobs'}
                </button>
            </div>
        </form>
    );
}
