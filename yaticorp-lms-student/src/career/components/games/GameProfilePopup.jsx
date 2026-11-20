import { useState } from 'react';
import { CalendarDays, GraduationCap, Loader2, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import Portal from '../../../components/Portal';

const CLASSES = Array.from({ length: 12 }, (_, i) => i + 1);
const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Student details (2026-11-17, the user: after Individual / Group, "a popup for date of birth and class, as the
 * organisation asks it, in a professional way"). Asked once: saved on the server (POST /games/profile), which then
 * sets the student's games section from the class. `defaultClass` prefills from Career Path when known.
 */
export default function GameProfilePopup({ defaultClass = null, onSaved }) {
  const [dob, setDob] = useState('');
  const [cls, setCls] = useState(defaultClass ? String(defaultClass) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    if (!dob) { setError('Please enter your date of birth.'); return; }
    if (!cls) { setError('Please select your class.'); return; }
    setBusy(true); setError('');
    try {
      const body = cls === 'college' ? { dateOfBirth: dob, level: 'college' } : { dateOfBirth: dob, level: 'school', classNumber: Number(cls) };
      const { data } = await api.post('/games/profile', body);
      onSaved?.(data?.zone || null, body);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save your details. Please try again.');
    } finally { setBusy(false); }
  };

  const field = 'mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] font-semibold text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15';
  return (
    <Portal>
      <div className="gs-fade fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/70 p-4 sm:backdrop-blur-sm" data-game-profile>
        <form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="gp-title"
          className="gs-pop-in w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md">
            <GraduationCap className="h-6 w-6" />
          </span>
          <h2 id="gp-title" className="mt-4 text-xl font-black text-slate-900">Student details</h2>
          <p className="mt-1 text-sm text-slate-600">Please confirm your date of birth and current class. We use them to show games suited to your age group.</p>

          <label className="mt-5 block text-sm font-bold text-slate-800">
            <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-violet-600" /> Date of birth</span>
            <input type="date" value={dob} max={todayIso()} min="1960-01-01" onChange={(e) => setDob(e.target.value)} required className={field} data-gp-dob />
          </label>
          <label className="mt-4 block text-sm font-bold text-slate-800">
            <span className="flex items-center gap-1.5"><GraduationCap className="h-4 w-4 text-violet-600" /> Class</span>
            <select value={cls} onChange={(e) => setCls(e.target.value)} required className={field} data-gp-class>
              <option value="" disabled>Select your class</option>
              {CLASSES.map((c) => <option key={c} value={c}>Class {c}</option>)}
              <option value="college">College / Above Class 12</option>
            </select>
          </label>

          {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-200" role="alert">{error}</p>}

          <button type="submit" disabled={busy}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-violet-600 to-indigo-700 py-3.5 text-base font-black text-white shadow-[0_10px_22px_-10px_rgba(79,70,229,0.9)] transition hover:brightness-110 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save and continue
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="h-3.5 w-3.5" /> Your details are kept private to your account.</p>
        </form>
      </div>
    </Portal>
  );
}
