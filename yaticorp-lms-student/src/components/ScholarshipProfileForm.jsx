import { useEffect, useState } from 'react';
import { Check, Info, Loader2, ShieldCheck, X } from 'lucide-react';
import api from '../career/services/api';

/**
 * The details scholarship schemes ask for, which the career goal does not
 * already hold.
 *
 * Two rules shaped this form. It never asks anything the student has already
 * given: education level, class, stream, board, career goal, country and state
 * are all on their Goal, and asking twice is how forms get abandoned. And
 * every field is optional. Category, religion, disability and household income
 * are sensitive, and a feature that refuses to work until a student discloses
 * their caste shuts out the people it exists to help. Leave it all blank and
 * a list still comes back, just a broader one.
 */
const FIELDS = [
  { key: 'category', label: 'Category', why: 'Most government schemes are reserved by category.' },
  {
    key: 'familyIncome',
    label: 'Annual family income',
    why: 'Nearly every need-based scheme has an income ceiling. A band is enough.'
  },
  {
    key: 'minority',
    label: 'Minority community',
    why: 'Minority schemes run alongside category ones, so you may qualify for both.'
  },
  { key: 'gender', label: 'Gender', why: 'Several national schemes are for girl students only.' },
  {
    key: 'institutionType',
    label: 'Your institution',
    why: 'Some awards are only for government or aided institutions.'
  }
];

/**
 * The choices, held here as well as on the server.
 *
 * They are static lists, so making the form wait on a request for them bought
 * nothing and cost everything: if that call failed the form never rendered at
 * all. It now draws immediately from these and quietly upgrades to the
 * server's copy if it arrives, so a cold or restarting backend delays the
 * saved values rather than hiding the whole form.
 */
const FALLBACK_OPTIONS = {
  category: ['General', 'OBC', 'SC', 'ST', 'EWS'],
  minority: ['Not applicable', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Parsi', 'Other'],
  familyIncome: ['Below ₹1 lakh', '₹1–2.5 lakh', '₹2.5–5 lakh', '₹5–8 lakh', 'Above ₹8 lakh'],
  gender: ['Female', 'Male', 'Other', 'Prefer not to say'],
  institutionType: ['Government', 'Government-aided', 'Private', 'Not studying right now'],
  circumstances: [
    'Single girl child',
    'Orphan',
    'Ward of ex-serviceman',
    'Farmer family',
    'First in family to study',
    'Parent is a construction or unorganised worker'
  ]
};

export default function ScholarshipProfileForm({ onSaved, onClose, gated = false }) {
  const [options, setOptions] = useState(FALLBACK_OPTIONS);
  const [form, setForm] = useState({
    category: '',
    familyIncome: '',
    minority: '',
    gender: '',
    institutionType: '',
    disability: false,
    disabilityPercent: 0,
    lastScore: '',
    circumstances: []
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    // Settled, not all: a failure on either side must not take the other with
    // it, and neither may stop the form appearing.
    Promise.allSettled([api.get('/scholarships/profile/options'), api.get('/scholarships/profile')]).then(
      ([o, p]) => {
        if (!alive) return;
        if (o.status === 'fulfilled' && o.value?.data) setOptions(o.value.data);
        if (p.status === 'fulfilled' && p.value?.data) {
          // Only the keys this form owns; the stored document also has timestamps.
          setForm((prev) => ({
            ...prev,
            ...Object.fromEntries(Object.keys(prev).map((k) => [k, p.value.data?.[k] ?? prev[k]]))
          }));
        }
      }
    );
    return () => {
      alive = false;
    };
  }, []);

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleCircumstance = (c) =>
    setForm((prev) => ({
      ...prev,
      circumstances: prev.circumstances.includes(c)
        ? prev.circumstances.filter((x) => x !== c)
        : [...prev.circumstances, c]
    }));

  const save = async (values = form) => {
    setBusy(true);
    setError('');
    try {
      await api.put('/scholarships/profile', values);
      onSaved?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-slate-900">What the schemes ask for</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Every field is optional. The more you fill in, the more reserved schemes we can find that
            you would otherwise never see.
          </p>
        </div>
        {onClose && !gated && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="block text-xs font-bold text-slate-700">{f.label}</span>
              <select
                value={form[f.key]}
                onChange={(e) => set(f.key)(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400"
              >
                <option value="">Prefer not to say</option>
                {options[f.key].map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[0.7rem] leading-relaxed text-slate-400">{f.why}</span>
            </label>
          ))}

          <label className="block">
            <span className="block text-xs font-bold text-slate-700">Most recent result</span>
            <input
              value={form.lastScore}
              onChange={(e) => set('lastScore')(e.target.value)}
              placeholder="82% or 8.4 CGPA"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400"
            />
            <span className="mt-1 block text-[0.7rem] leading-relaxed text-slate-400">
              Merit awards publish a cut-off. Yours decides which ones are worth your time.
            </span>
          </label>
        </div>

        {/* A checkbox plus a percentage, because schemes are written against a
            certified percentage rather than a yes or no. */}
        <div className="rounded-xl bg-slate-50 p-3.5">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={form.disability}
              onChange={(e) => set('disability')(e.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
            <span className="text-sm font-bold text-slate-800">I have a certified disability</span>
          </label>
          {form.disability && (
            <label className="mt-3 block">
              <span className="block text-xs font-bold text-slate-700">Percentage on the certificate</span>
              <input
                type="number"
                min="0"
                max="100"
                value={form.disabilityPercent || ''}
                onChange={(e) => set('disabilityPercent')(Number(e.target.value))}
                className="mt-1 w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400"
              />
              <span className="mt-1 block text-[0.7rem] text-slate-400">
                Most schemes set their floor at 40%.
              </span>
            </label>
          )}
        </div>

        <div>
          <span className="block text-xs font-bold text-slate-700">Does any of this apply to you?</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {options.circumstances.map((c) => {
              const on = form.circumstances.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCircumstance(c)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                    on ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {on && <Check className="h-3 w-3" />}
                  {c}
                </button>
              );
            })}
          </div>
          <span className="mt-2 block text-[0.7rem] leading-relaxed text-slate-400">
            Each of these opens schemes that nothing else reaches.
          </span>
        </div>

        <p className="flex items-start gap-2 rounded-xl bg-indigo-50 px-3.5 py-3 text-[0.75rem] leading-relaxed text-indigo-900">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Kept on your account and used only to match you to schemes. It is never shown to anyone
          else, and you can clear any field by choosing “Prefer not to say”.
        </p>

        {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
        {onClose && !gated && (
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={() => save()}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {gated ? 'Save and show my scholarships' : 'Save and find scholarships'}
        </button>
      </div>
    </div>
  );
}
