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
  GraduationCap, Search, X, ExternalLink, ArrowRight, CalendarDays, BadgeCheck, Sparkles, Coins, ShieldCheck, Compass, Building2, Loader2, RotateCw
} from 'lucide-react';
import api from '../career/services/api';
import AiBudgetNotice from '../career/components/AiBudgetNotice';
import { readAiBudgetError } from '../career/utils/aiBudget';
import { SearchFundingArt } from '../components/ScholarshipArt';
import YatiLoader from '../components/YatiLoader';
import useMinimumLoading from '../hooks/useMinimumLoading';
import PriceTag from '../components/rewards/PriceTag';
import './scholarships.css';

// A hue per card, round the wheel: the stripe along its top, its cap tile and its Apply button share it.
const HUES = [
  { grad: 'from-violet-600 to-indigo-600', shadow: 'shadow-violet-500/25', hover: 'hover:shadow-violet-500/15' }
];

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

  // Why the first read failed, when it did: 'locked' for the Career Path
  // switch being off, 'error' for anything else. Every failure used to be
  // read as hasGoal:false, which sent a student who already had a goal and a
  // list off to set up Career Path again because of one dropped request.
  // Only the server saying hasGoal:false means there is no goal.
  const [loadFailure, setLoadFailure] = useState(null);

  const load = () => {
    setLoading(true);
    setLoadFailure(null);
    api
      .get('/scholarships')
      .then((res) => setData(res.data))
      .catch((err) => {
        const locked = err.response?.status === 403 && err.response?.data?.code === 'CAREER_PATH_LOCKED';
        setLoadFailure(locked ? 'locked' : 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
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

  if (loadFailure) {
    const locked = loadFailure === 'locked';
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div
          role="alert"
          className={`rounded-2xl border p-6 ${locked ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-rose-200 bg-rose-50 text-rose-800'}`}
        >
          <h1 className="text-lg font-black">
            {locked ? 'Scholarships are unavailable right now' : 'Your scholarships did not load'}
          </h1>
          <p className="mt-1 text-sm">
            {locked
              ? 'Career Path has been switched off for the moment. Please check back later.'
              : 'Check your connection and try again. Your saved list has not changed.'}
          </p>
          {!locked && (
            <button
              type="button"
              onClick={load}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-rose-700 shadow-sm ring-1 ring-rose-200 transition-colors hover:bg-rose-100"
            >
              <RotateCw size={16} />
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

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
    <div className="lms-stagger w-full space-y-6 pb-12">
      {aiBudget && <AiBudgetNotice {...aiBudget} />}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>
      )}

      {/* ---- Search, with the eligibility form on its right ---------------
          The banner that stood above went on 2026-10-27; the one action it
          carried sits here, small, beside the search. */}
      <div className="flex items-center gap-2.5">
        {all.length > 0 ? (
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search scholarships…"
              aria-label="Search scholarships"
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white py-3 pr-10 pl-11 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(30,27,75,0.18)] transition-all placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 focus:outline-none"
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
        ) : <div className="flex-1" />}
        {data.hasGoal ? (
            <button
              type="button"
              onClick={() => setAsking(true)}
              disabled={finding}
              className="group inline-flex min-h-12 shrink-0 items-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-black whitespace-nowrap text-white shadow-md shadow-violet-500/25 transition-all hover:-translate-y-0.5 hover:bg-violet-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {finding ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} className="transition-transform group-hover:scale-110" />}
              {finding ? 'Finding…' : <>Eligibility<span className="hidden sm:inline">&nbsp;form</span></>}
            </button>
          ) : (
            <Link
              to="/career"
              className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-black whitespace-nowrap text-white shadow-md shadow-violet-500/25 transition-all hover:-translate-y-0.5 hover:bg-violet-700"
            >
              <Compass size={16} /> Set up goal
            </Link>
          )}
      </div>

      {/* ---- The list ---------------------------------------------------- */}
      {all.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-8 text-center sm:p-12">
          <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-violet-200/50 blur-3xl" />
          <div className="relative mx-auto flex h-40 w-44 items-end justify-center" aria-hidden>
            <span className="absolute bottom-1 left-1/2 h-5 w-28 -translate-x-1/2 rounded-full bg-violet-400/30 blur-lg" />
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
              className="lms-pop relative mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/30 transition-all hover:-translate-y-0.5 hover:brightness-110 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              style={{ animationDelay: '0.3s' }}
            >
              {finding ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {finding ? 'Finding scholarships…' : <>Find scholarships for me <PriceTag action="find_scholarship" /></>}
            </button>
          ) : (
            <Link
              to="/career"
              className="lms-pop relative mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/30 transition-all hover:-translate-y-0.5 hover:brightness-110 hover:shadow-xl active:scale-[0.98]"
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
        <ul className="lms-stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((s, i) => {
            const days = daysUntil(s.deadline);
            const soon = days !== null && days >= 0 && days <= 30;
            const passed = days !== null && days < 0;
            const hue = HUES[i % HUES.length];
            return (
              <li
                key={`${s.name}-${i}`}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 pt-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_-16px_rgba(30,27,75,0.2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${hue.hover}`}
              >
                {/* The card's colour, as a stripe along its top. */}
                <span aria-hidden className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${hue.grad}`} />
                {/* Head: the cap tile, the name, and who gives it. */}
                <div className="flex items-start gap-3">
                  <span className={`sch-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${hue.grad} text-white shadow-md ${hue.shadow}`}>
                    <GraduationCap size={19} strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[0.95rem] leading-snug font-black text-indigo-950">{s.name}</h3>
                    {s.provider && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-slate-500">
                        <Building2 size={12} className="shrink-0" />
                        <span className="min-w-0 truncate" title={s.provider}>{s.provider}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* The two facts, as labelled rows on one left edge. */}
                {(s.amount || s.deadline) && (
                  <dl className="mt-4 divide-y divide-slate-100 rounded-xl bg-slate-50/80 ring-1 ring-slate-100 ring-inset">
                    {s.amount && (
                      <div className="flex items-start gap-3 px-3 py-2.5">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><Coins size={14} /></span>
                        <div className="min-w-0">
                          <dt className="text-[0.65rem] font-black tracking-wider text-slate-400 uppercase">Amount</dt>
                          <dd className="text-sm leading-snug font-bold text-emerald-700">{s.amount}</dd>
                        </div>
                      </div>
                    )}
                    {s.deadline && (
                      <div className="flex items-start gap-3 px-3 py-2.5">
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${passed ? 'bg-slate-100 text-slate-400' : soon ? 'sch-soon bg-amber-100 text-amber-600' : 'bg-violet-100 text-violet-600'}`}><CalendarDays size={14} /></span>
                        <div className="min-w-0">
                          <dt className="text-[0.65rem] font-black tracking-wider text-slate-400 uppercase">
                            {passed ? 'Deadline passed' : soon ? `Closes in ${days} ${days === 1 ? 'day' : 'days'}` : 'Deadline'}
                          </dt>
                          <dd className={`text-sm leading-snug font-bold ${passed ? 'text-slate-500' : soon ? 'text-amber-800' : 'text-indigo-950'}`}>{s.deadline}</dd>
                        </div>
                      </div>
                    )}
                  </dl>
                )}

                {s.eligibility && (
                  <div className="mt-4">
                    <p className="flex items-center gap-1.5 text-[0.65rem] font-black tracking-wider text-slate-400 uppercase">
                      <BadgeCheck size={13} className="text-emerald-500" /> Who can apply
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.eligibility}</p>
                  </div>
                )}
                {s.why && (
                  <div className="mt-3 rounded-xl bg-violet-50/70 px-3 py-2.5 ring-1 ring-violet-100 ring-inset">
                    <p className="flex items-center gap-1.5 text-[0.65rem] font-black tracking-wider text-violet-700 uppercase"><Sparkles size={12} /> Why it fits you</p>
                    <p className="mt-1 text-[0.8rem] leading-relaxed text-slate-700">{s.why}</p>
                  </div>
                )}

                {/* Every entry that reaches this page has an application link
                    that answered: the server drops the rest rather than
                    listing a scholarship it cannot send anyone to. There is no
                    linkless branch here any more because there is no linkless
                    entry — the old one told the student to go and search for
                    the page themselves, which is the job the page exists to
                    do. */}
                <div className="mt-auto pt-4">
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group/btn inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${hue.grad} px-4 py-2.5 text-sm font-black text-white shadow-md ${hue.shadow} transition-all hover:-translate-y-0.5 hover:brightness-110 hover:shadow-lg active:scale-[0.98]`}
                  >
                    Apply
                    <ExternalLink size={14} className="transition-transform group-hover/btn:translate-x-0.5" />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
