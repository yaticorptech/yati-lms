/**
 * Scholarships: a list of real, named scholarships the student can apply
 * for, built by the AI from their goal, stage and country, with who each is
 * for, what it is worth and when it closes.
 *
 * The list is kept on the server and only changes when the student asks for
 * a fresh one, so the page opens instantly.
 */
import { useEffect, useMemo, useState } from 'react';
import scholarshipView from './scholarshipView';
import ScholarshipProfileForm from '../components/ScholarshipProfileForm';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Search, X, ExternalLink, CalendarDays, BadgeCheck, Sparkles, Coins, ShieldCheck, Compass, Building2, Loader2
} from 'lucide-react';
import api from '../career/services/api';
import AiBudgetNotice from '../career/components/AiBudgetNotice';
import { readAiBudgetError } from '../career/utils/aiBudget';
import { FundedArt, SearchFundingArt } from '../components/ScholarshipArt';
import YatiLoader from '../components/YatiLoader';
import useMinimumLoading from '../hooks/useMinimumLoading';

// A deadline that reads as a real date gets a "soon" flag when it is inside a
// month; anything the mentor wrote as prose ("Rolling", "Every March") is
// shown as it came.
const daysUntil = (text) => {
  const t = Date.parse(text);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
};

export default function Scholarships() {
  const [data, setData] = useState({ items: [], hasGoal: false, hasProfile: false, generatedAt: null });
  const [loading, setLoading] = useState(true);
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState(null);
  const [aiBudget, setAiBudget] = useState(null);
  const [query, setQuery] = useState('');
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    api
      .get('/scholarships')
      .then((res) => setData(res.data))
      .catch(() => setData({ items: [], hasGoal: false, hasProfile: false, generatedAt: null }))
      .finally(() => setLoading(false));
  }, []);

  const find = async () => {
    setFinding(true);
    setError(null);
    setAiBudget(null);
    try {
      const res = await api.post('/scholarships/generate');
      // Merged, not replaced. Any endpoint that answers with fewer fields than
      // the page holds would otherwise silently unset one, and unsetting
      // `hasProfile` puts the eligibility form back in front of a student who
      // has just filled it in.
      setData((prev) => ({ ...prev, ...res.data }));
      setQuery('');
    } catch (err) {
      const budget = readAiBudgetError(err);
      if (budget) setAiBudget(budget);
      else setError(err.response?.data?.message || 'Could not find scholarships right now. Please try again.');
    } finally {
      setFinding(false);
    }
  };

  const showLoader = useMinimumLoading(loading);

  const all = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const q = query.trim().toLowerCase();
  const shown = q ? all.filter((s) => JSON.stringify(s).toLowerCase().includes(q)) : all;

  if (showLoader) return <YatiLoader label="Finding scholarships for you" />;

  /*
   * Which screen to show. The rule lives in scholarshipView.js and is covered
   * by tests, because the important half of it is a negative: a list must
   * never reach a student who has not answered the eligibility questions, and
   * a negative like that is easy to break by accident and hard to notice.
   */
  const view = scholarshipView({
    loading,
    hasGoal: data.hasGoal,
    hasProfile: data.hasProfile,
    asking
  });
  // True when the page is insisting rather than the student choosing.
  const mustAnswer = view === 'form' && !asking;

  if (view === 'form') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        {mustAnswer && (
          <div className="mb-4 text-center">
            <h1 className="text-2xl font-black text-slate-900">Before we find your scholarships</h1>
            <p className="mx-auto mt-1.5 max-w-lg text-sm text-slate-500">
              A few questions the schemes themselves ask. They decide which awards you are actually
              eligible for, and most of the best ones are reserved.
            </p>
          </div>
        )}
        <ScholarshipProfileForm
          gated={mustAnswer}
          onClose={() => setAsking(false)}
          onSaved={() => {
            setAsking(false);
            // Reload so the gate lifts, then build a list against the answers.
            api
              .get('/scholarships')
              .then(({ data: fresh }) => setData((prev) => ({ ...prev, ...fresh })))
              .catch(() => {})
              .finally(find);
          }}
        />
      </div>
    );
  }

  return (
    <div className="lms-stagger mx-auto max-w-5xl space-y-6 pb-12">
      {/* ---- Hero ------------------------------------------------------- */}
      <div className="lms-sheen relative overflow-hidden rounded-3xl bg-[#3b0764] p-6 text-white shadow-xl shadow-purple-900/30 md:p-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600" />
        <div aria-hidden className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-fuchsia-300/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-16 -bottom-36 h-96 w-96 rounded-full bg-pink-400/40 blur-3xl" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        <span aria-hidden className="cm-drift pointer-events-none absolute top-6 left-[48%] hidden text-2xl md:block" style={{ animationDelay: '-1.2s' }}>🎓</span>
        <span aria-hidden className="cm-drift pointer-events-none absolute bottom-8 left-[60%] hidden text-xl md:block" style={{ animationDelay: '-3.4s' }}>💰</span>
        <span aria-hidden className="cm-drift pointer-events-none absolute top-5 right-[24%] hidden text-lg md:block" style={{ animationDelay: '-0.5s' }}>✨</span>

        <div className="relative grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[0.7rem] font-black tracking-[0.18em] text-pink-100 uppercase">
              <GraduationCap size={14} />
              Scholarships
            </p>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
              Your dreams, <span className="lms-shimmer bg-gradient-to-r from-pink-200 via-white to-pink-200 bg-clip-text text-transparent">fully funded.</span>
            </h1>
            <p className="mt-2 max-w-lg text-sm font-medium text-pink-100 sm:text-base">
              Real scholarships matched to your goal and stage, with who they are for and when to apply. Let money never be the reason you stop.
            </p>
            <div className="lms-stagger mt-5 flex flex-wrap items-center gap-2.5">
              {data.hasGoal ? (
                <button
                  type="button"
                  onClick={() => setAsking(true)}
                  disabled={finding}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-purple-700 shadow-lg shadow-purple-900/20 transition-all hover:-translate-y-0.5 hover:bg-pink-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {finding ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  {finding ? 'Finding scholarships…' : 'Eligibility form'}
                </button>
              ) : (
                <Link
                  to="/career"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-purple-700 shadow-lg shadow-purple-900/20 transition-all hover:-translate-y-0.5 hover:bg-pink-50 active:scale-[0.98]"
                >
                  <Compass size={18} />
                  Set up your Career Path first
                </Link>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold ring-1 ring-white/25 ring-inset tabular-nums">
                <Coins size={14} />
                {all.length} {all.length === 1 ? 'scholarship' : 'scholarships'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold ring-1 ring-white/25 ring-inset tabular-nums">
                <CalendarDays size={14} />
                {all.filter((s) => { const d = daysUntil(s.deadline); return d !== null && d >= 0 && d <= 30; }).length} closing this month
              </span>
            </div>
          </div>

          <div aria-hidden className="relative hidden h-52 w-64 items-end justify-center pb-3 md:flex">
            <span className="cm-glow absolute bottom-6 left-1/2 h-40 w-40 rounded-full bg-white/35 blur-2xl" />
            <span className="cm-ring absolute bottom-3 left-1/2 h-10 w-44 rounded-[50%] border-2 border-white/50" />
            <span className="absolute bottom-2 left-1/2 h-9 w-44 -translate-x-1/2 rounded-[50%] bg-purple-950/30" />
            <span className="absolute bottom-4 left-1/2 h-9 w-44 -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-white/70 to-pink-100/60 shadow-lg" />
            <span className="absolute bottom-[26px] left-1/2 h-4 w-28 -translate-x-1/2 rounded-[50%] bg-white/50" />
            <FundedArt className="mc-pop relative h-44 w-44" />
          </div>
        </div>
      </div>

      {aiBudget && <AiBudgetNotice {...aiBudget} />}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>
      )}

      {/* ---- Search ------------------------------------------------------ */}
      {all.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, eligibility or deadline…"
            aria-label="Search scholarships"
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white py-3 pr-10 pl-11 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-purple-400 focus:outline-none"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* ---- The list ---------------------------------------------------- */}
      {all.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-purple-100 bg-gradient-to-br from-violet-50 via-white to-pink-50 p-8 text-center sm:p-12">
          <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-purple-200/40 blur-3xl" />
          <div className="relative mx-auto flex h-40 w-44 items-end justify-center" aria-hidden>
            <span className="absolute bottom-1 left-1/2 h-5 w-28 -translate-x-1/2 rounded-full bg-purple-400/30 blur-lg" />
            <SearchFundingArt className="relative h-36 w-36" />
          </div>
          <h3 className="relative mt-3 text-2xl font-black text-slate-900">
            {data.hasGoal ? 'Let’s find your scholarships' : 'Tell us your goal first'}
          </h3>
          <p className="relative mx-auto mt-2 max-w-md text-slate-500">
            {data.hasGoal
              ? 'One tap builds a list of real scholarships that fit your stage, stream and career goal, with who they are for and when to apply.'
              : 'Scholarships are matched to your stage and career goal. Set up your Career Path and this page fills itself.'}
          </p>
          {data.hasGoal ? (
            <button
              type="button"
              onClick={find}
              disabled={finding}
              className="lms-pop relative mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-purple-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              style={{ animationDelay: '0.3s' }}
            >
              {finding ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {finding ? 'Finding scholarships…' : 'Find scholarships for me'}
            </button>
          ) : (
            <Link
              to="/career"
              className="lms-pop relative mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-purple-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
              style={{ animationDelay: '0.3s' }}
            >
              <Compass size={16} />
              Go to Career Path
            </Link>
          )}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
          <p className="font-black text-slate-900">Nothing matches “{query}”</p>
          <p className="mt-1 text-sm text-slate-500">Try a shorter or more general term.</p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Clear search
          </button>
        </div>
      ) : (
        <ul className="lms-stagger grid gap-4 md:grid-cols-2">
          {shown.map((s, i) => {
            const days = daysUntil(s.deadline);
            const soon = days !== null && days >= 0 && days <= 30;
            const passed = days !== null && days < 0;
            return (
              <li
                key={`${s.name}-${i}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-500/10"
              >
                <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-violet-500 to-pink-500 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-pink-600 text-white shadow-md shadow-purple-500/30">
                    <GraduationCap size={20} strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black leading-snug text-slate-900 break-words">{s.name}</h3>
                    {(s.provider || s.amount) && (
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-500">
                        {s.provider && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 size={13} />
                            {s.provider}
                          </span>
                        )}
                        {s.amount && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 font-black text-emerald-700">
                            <Coins size={12} />
                            {s.amount}
                          </span>
                        )}
                      </p>
                    )}
                    {s.deadline && (
                      <p
                        className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                          passed
                            ? 'bg-slate-100 text-slate-500'
                            : soon
                              ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-100 ring-inset'
                              : 'bg-purple-50 text-purple-800 ring-1 ring-purple-100 ring-inset'
                        }`}
                      >
                        <CalendarDays size={13} />
                        {passed ? 'Deadline passed · ' : soon ? `Closes in ${days} ${days === 1 ? 'day' : 'days'} · ` : 'Deadline · '}
                        {s.deadline}
                      </p>
                    )}
                  </div>
                </div>

                {s.eligibility && (
                  <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-slate-600">
                    <BadgeCheck size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                    <span className="min-w-0 break-words">{s.eligibility}</span>
                  </p>
                )}
                {s.why && (
                  <p className="mt-2 rounded-xl bg-pink-50/70 px-3 py-2 text-xs leading-relaxed text-purple-900 ring-1 ring-pink-100 ring-inset">
                    {s.why}
                  </p>
                )}

                <div className="mt-auto pt-4">
                  {s.link ? (
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-purple-500/25 transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
                    >
                      Apply
                      <ExternalLink size={14} />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                      <Sparkles size={13} />
                      Search the name to find the application page
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
