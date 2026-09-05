/**
 * @description The details behind the part-time board, asked in a popup:
 *              which dates you want work, what you are interested in, and a
 *              parent's phone number. The date of birth is not asked here —
 *              it comes from the Jobs verification the student already did.
 */
import { useState } from 'react';
import { Check, Loader2, Sparkles, X, CalendarDays, Heart, Smartphone } from 'lucide-react';
import { opportunitiesApi } from './api';
import { toDateInput } from './helpers';

const phoneDigits = (raw) => String(raw || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '').slice(0, 10);

const Chip = ({ on, onClick, children, icon }) => (
    <button type="button" onClick={onClick} aria-pressed={on}
        className={`inline-flex min-h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
            on ? 'border-indigo-300 bg-indigo-50 text-indigo-800 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40'
        }`}>
        {icon && <span aria-hidden="true">{icon}</span>}
        {on && <Check size={14} aria-hidden="true" />}
        {children}
    </button>
);

const Section = ({ icon: Icon, n, title, hint, children }) => (
    <section className="rounded-2xl border border-slate-200 p-3.5 sm:p-4">
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-black text-white">{n}</span>
            <Icon size={17} className="text-indigo-500" aria-hidden="true" /> {title}
        </h3>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
        <div className="mt-2.5">{children}</div>
    </section>
);

const INPUT = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500';
const LABEL = 'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500';

export default function ProfileOnboarding({ vocab, initial, onSaved, onCancel }) {
    const today = toDateInput(new Date());
    const [form, setForm] = useState(() => ({
        guardianPhone: phoneDigits(initial?.guardianPhone),
        wantFrom: toDateInput(initial?.wantFrom) || today,
        wantTo: toDateInput(initial?.wantTo) || toDateInput(initial?.wantFrom) || today,
        interests: initial?.interests || []
    }));
    const [oneDay, setOneDay] = useState(() => !initial || toDateInput(initial.wantFrom) === toDateInput(initial.wantTo));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const phoneOk = /^[6-9]\d{9}$/.test(form.guardianPhone);
    const update = (patch) => { setError(''); setForm((f) => ({ ...f, ...patch })); };
    const toggle = (id) => update({ interests: form.interests.includes(id) ? form.interests.filter((x) => x !== id) : [...form.interests, id] });

    const save = async (e) => {
        e.preventDefault();
        if (!form.wantFrom) return setError('Pick the date you want work on.');
        const wantTo = oneDay ? form.wantFrom : form.wantTo;
        if (wantTo < form.wantFrom) return setError('The end date is before the start date.');
        if (!form.interests.length) return setError('Pick at least one interest.');
        if (form.guardianPhone && !phoneOk) return setError('Enter a 10-digit Indian mobile number for your parent.');
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
        <form onSubmit={save} aria-labelledby="opp-onboarding-title" className="relative rounded-3xl bg-white p-5 sm:p-6">
            <div className="mb-4 pr-10">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">
                    <Sparkles size={13} aria-hidden="true" /> {initial ? 'Your details' : 'Three quick answers'}
                </p>
                <h2 id="opp-onboarding-title" className="mt-0.5 text-lg font-bold text-slate-900 sm:text-xl">
                    {initial ? 'Update your dates and interests' : 'Tell us when you want work, and what kind'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">No resume, no CV — jobs on your dates that match your interests.</p>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.75fr)]">
              <div className="space-y-3">
                <Section icon={CalendarDays} n={1} title="When do you want work?" hint="Only jobs running on these dates are shown. You can change them any time.">
                    <div className="grid gap-3">
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
                    <label className="mt-2.5 flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                        <input type="checkbox" checked={oneDay} onChange={(e) => setOneDay(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                        Just one day
                    </label>
                </Section>
                <Section icon={Smartphone} n={2} title="Parent's phone number" hint="A parent or guardian we can reach about the work. Needed for students under 18.">
                    <div className="grid gap-3">
                        <div>
                            <label htmlFor="opp-guardian-phone" className={LABEL}>Mobile number</label>
                            <div className={`${INPUT} flex items-center gap-2 p-0 ${form.guardianPhone.length === 10 && !phoneOk ? 'border-rose-300' : ''}`}>
                                <span className="pl-4 text-sm font-bold text-slate-500">+91</span>
                                <input id="opp-guardian-phone" inputMode="numeric" autoComplete="off" placeholder="98765 43210"
                                    value={form.guardianPhone} onChange={(e) => update({ guardianPhone: phoneDigits(e.target.value) })}
                                    className="w-full bg-transparent py-2 pr-4 tracking-wider text-slate-800 outline-none" />
                            </div>
                        </div>
                    </div>
                </Section>
              </div>
                <Section icon={Heart} n={3} title="What are you interested in?" hint="Pick as many as you like — jobs in these lines come first.">
                    <div className="flex flex-wrap gap-1.5">
                        {vocab.interests.map((i) => (
                            <Chip key={i.id} on={form.interests.includes(i.id)} onClick={() => toggle(i.id)} icon={i.icon}>{i.label}</Chip>
                        ))}
                    </div>
                </Section>
            </div>

            {error && <p role="alert" className="mt-3 flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700"><X size={14} aria-hidden="true" /> {error}</p>}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
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
