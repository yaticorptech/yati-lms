/**
 * @description Student job board — skill-ranked listings, plus the skill gap
 *              between where the student is and the role they want.
 *
 * Ported from the standalone CareerCompass app and redrawn in the LMS's own
 * card style. The server is unchanged from the original: it ranks on skills,
 * role fit, job type and distance, ingesting fresh listings when the stored
 * index is stale for the place being searched.
 *
 * Two fields the standalone form insisted on are gone — a resume upload and an
 * experience level. Neither was ever sent to the ranking endpoint, so requiring
 * them blocked a search without changing a single result.
 */
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Briefcase, MapPin, Loader2, RotateCcw, Search, AlertCircle, Crosshair,
    Bookmark, History
} from 'lucide-react';

import { AuthContext } from '../context/AuthContext';
import { jobsApi, detectLocation, autoDetectLocation, careerPrefill } from '../jobs/api';
import { comparePay } from '../jobs/pay';
import SkillInput from '../jobs/SkillInput';
import ResumeCard from '../jobs/ResumeCard';
import RoleSelect from '../jobs/RoleSelect';
import JobCard from '../jobs/JobCard';
import SkillGapCard from '../jobs/SkillGapCard';

const JOB_TYPES = ['Any', 'Full-time', 'Part-time', 'Internship', 'Contract'];

const CURRENCIES = [
    { code: 'INR', example: '6,00,000' }, { code: 'USD', example: '90,000' },
    { code: 'EUR', example: '70,000' }, { code: 'GBP', example: '60,000' },
    { code: 'AED', example: '250,000' }, { code: 'SGD', example: '110,000' },
    { code: 'AUD', example: '120,000' }, { code: 'CAD', example: '100,000' }
];

const EMPTY_FORM = {
    skills: [], role: '', jobType: 'Any', salary: '', currency: 'INR',
    location: '', coords: null, remoteOnly: false, strictType: true, sortBy: 'relevance'
};

/** Read the initial form from the URL, so a search can be shared or bookmarked. */
const formFromParams = (params) => {
    const skills = params.get('skills');
    return {
        ...EMPTY_FORM,
        skills: skills ? skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
        role: params.get('role') || '',
        jobType: params.get('type') || 'Any',
        salary: params.get('salary') || '',
        currency: params.get('cur') || 'INR',
        location: params.get('loc') || '',
        remoteOnly: params.get('remote') === '1',
        sortBy: params.get('sort') || 'relevance'
    };
};

/**
 * Skills and a role are both required, and for the same reason: they are the
 * two signals the ranking is actually built on. A recommendation drawn from
 * half a profile is not a cheaper answer, it is a wrong one.
 */
const validate = (f) => {
    const problems = {};
    if (!f.skills.length) problems.skills = 'Add at least one skill — results are ranked on your skills.';
    if (!f.role.trim()) problems.role = 'Name the role you are aiming for.';
    if (f.salary.trim() && !/\d/.test(f.salary)) problems.salary = 'Expected salary should be an amount, like 600000.';
    return problems;
};

/** One line describing what was actually searched, under the result count. */
const describe = (q, data) => {
    if (!q) return '';
    const bits = [];
    if (q.role || q.roleText) {
        const role = q.role || q.roleText;
        // Three states the header has to tell apart: an exact title match, the
        // nearest related titles, and a ranking on skills alone.
        bits.push(
            data?.roleIgnored ? `matched on your skills · nothing titled “${role}”`
                : data?.roleRelaxed ? `related to ${role}`
                    : role
        );
    }
    if (q.skills?.length) bits.push(`${q.skills.length} skill${q.skills.length === 1 ? '' : 's'}`);
    if (q.jobType && q.jobType !== 'Any') bits.push(q.jobType);
    if (q.remoteOnly) bits.push('remote only');
    else if (q.location) {
        // A corrected spelling has to be visible: these results are for a place
        // the student did not literally type.
        bits.push(
            q.locationCorrected ? `in ${q.locationResolved} (read as “${q.locationCorrected}”)`
                : q.locationResolved ? `in ${q.locationResolved}`
                    : `in ${q.location} — place not recognised`
        );
    }
    return bits.length ? `· ${bits.join(' · ')}` : '';
};

const Empty = ({ title, children }) => (
    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <Briefcase size={28} className="text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">{children}</p>
    </div>
);

const Skeletons = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
                <div className="flex justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-slate-100" />
                    <div className="w-20 h-5 rounded bg-slate-100" />
                </div>
                <div className="h-5 w-3/4 bg-slate-100 rounded mb-3" />
                <div className="space-y-2">
                    <div className="h-3 w-1/2 bg-slate-100 rounded" />
                    <div className="h-3 w-2/3 bg-slate-100 rounded" />
                </div>
            </div>
        ))}
    </div>
);

export default function Jobs() {
    const { isCareerPathEnabled } = useContext(AuthContext);
    const [params, setParams] = useSearchParams();
    const [form, setForm] = useState(() => formFromParams(params));
    const [roles, setRoles] = useState([]);
    const [skillOptions, setSkillOptions] = useState([]);
    const [popularSkills, setPopularSkills] = useState([]);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [status, setStatus] = useState({ message: '', error: false });
    const [errors, setErrors] = useState({});
    /* What the student asked to earn, captured when the search ran rather than
       read live off the form — otherwise editing the field would relabel a list
       of results that was never ranked against the new figure. */
    const [expectation, setExpectation] = useState({ amount: '', currency: 'INR' });
    /* The salary field's second job: a real filter, not just a label. Off by
       default and honest when on — only listings that DISCLOSE pay below the
       expectation are hidden. "Not disclosed" always stays: most employers
       publish no figure, and hiding them would silently empty the list. */
    const [payGate, setPayGate] = useState(false);
    /* The student's Career Path goal, held for the whole visit — it tells the
       gap card whether the role being searched is the one their roadmap is
       already building towards. null = fetched, none exists; undefined = not
       fetched yet, so the card stays silent rather than offering to build a
       roadmap the student may already have. */
    const [careerGoal, setCareerGoal] = useState(undefined);
    /* The stored resume extraction. undefined = not fetched yet (the upload
       card hides rather than inviting an upload that may already exist);
       null = fetched, none stored. */
    const [resumeProfile, setResumeProfile] = useState(undefined);

    // Bookmarks. savedIds drives the icon on every card; savedJobs is the
    // saved view's own list, fetched once and edited optimistically.
    const [savedIds, setSavedIds] = useState(() => new Set());
    const [savedJobs, setSavedJobs] = useState([]);
    const [view, setView] = useState('results');

    // The student's recent searches, rendered as chips above the results.
    const [history, setHistory] = useState([]);

    /* Client-side batching: sixty cards at once is a long first paint for a
       student who will read the top five. More arrives on request. */
    const PAGE = 12;
    const [visibleCount, setVisibleCount] = useState(PAGE);

    const bootstrapped = useRef(false);
    // Identifies the newest request so a slow earlier one cannot overwrite it.
    const requestId = useRef(0);

    const update = (patch) => {
        // Clear a field's complaint as soon as it is touched, rather than
        // leaving it red until the next submit. Re-checked on submit anyway.
        setErrors((prev) => {
            if (!Object.keys(prev).length) return prev;
            const next = { ...prev };
            for (const key of Object.keys(patch)) delete next[key];
            return next;
        });
        setForm((f) => ({ ...f, ...patch }));
    };

    useEffect(() => {
        jobsApi.roles().then((r) => setRoles(r.roles ?? [])).catch(() => {});
        jobsApi.skills().then((s) => {
            setSkillOptions(s.all ?? []);
            setPopularSkills(s.popular ?? []);
        }).catch(() => {});
        jobsApi.savedList().then((r) => {
            const rows = r.saved ?? [];
            setSavedJobs(rows);
            setSavedIds(new Set(rows.map((j) => j.id)));
        }).catch(() => {});
        jobsApi.history().then((r) => setHistory(r.items ?? [])).catch(() => {});
    }, []);

    /**
     * Optimistic either way: the icon answers the tap, the server catches up,
     * and a failure puts things back rather than leaving the icon lying.
     */
    const toggleSave = async (job) => {
        const isSaved = savedIds.has(job.id);
        setSavedIds((prev) => {
            const next = new Set(prev);
            if (isSaved) next.delete(job.id); else next.add(job.id);
            return next;
        });
        setSavedJobs((prev) => isSaved
            ? prev.filter((j) => j.id !== job.id)
            : [{ ...job, match: null, savedAt: new Date().toISOString() }, ...prev]);
        try {
            if (isSaved) await jobsApi.unsaveJob(job.id);
            else await jobsApi.saveJob(job.id);
        } catch {
            setSavedIds((prev) => {
                const next = new Set(prev);
                if (isSaved) next.add(job.id); else next.delete(job.id);
                return next;
            });
            setSavedJobs((prev) => isSaved
                ? [{ ...job, match: null }, ...prev]
                : prev.filter((j) => j.id !== job.id));
        }
    };

    /**
     * The review modal's "Use N skills": merge (never replace) into whatever
     * the student already typed, and search if the form stands on its own.
     */
    const applyResume = (skills) => {
        const merged = [...new Set([...form.skills, ...skills])].slice(0, 20);
        const patch = { skills: merged };
        update(patch);
        setStatus({ message: 'Applied your resume profile.', error: false });
        const candidate = { ...form, ...patch };
        if (!Object.keys(validate(candidate)).length) search(patch);
    };

    /** Re-run one of the recent searches, chips-to-form-to-results. */
    const applyHistory = (h) => {
        const patch = {
            skills: h.skills || [],
            role: h.role || '',
            jobType: h.jobType || 'Any',
            location: h.location || '',
            coords: null,
            remoteOnly: !!h.remoteOnly
        };
        setView('results');
        update(patch);
        search(patch);
    };

    const search = useCallback(async (overrides = {}) => {
        const f = { ...form, ...overrides };

        const problems = validate(f);
        if (Object.keys(problems).length) {
            setErrors(problems);
            // Drop whatever was showing. Leaving an old list under a "details
            // are missing" banner recommends jobs for a profile we just
            // refused to search on.
            setData(null);
            setStatus({ message: 'Fill in the highlighted fields to search.', error: true });
            return;
        }
        setErrors({});
        setExpectation({ amount: f.salary, currency: f.currency });

        const id = ++requestId.current;
        setLoading(true);
        setStatus({ message: 'Searching global job sources…', error: false });

        // Keep the URL in step with what is actually being searched for.
        const next = new URLSearchParams();
        if (f.skills.length) next.set('skills', f.skills.join(','));
        if (f.role.trim()) next.set('role', f.role.trim());
        if (f.jobType !== 'Any') next.set('type', f.jobType);
        if (f.salary.trim()) { next.set('salary', f.salary.trim()); next.set('cur', f.currency); }
        if (f.location.trim()) next.set('loc', f.location.trim());
        if (f.remoteOnly) next.set('remote', '1');
        if (f.sortBy !== 'relevance') next.set('sort', f.sortBy);
        setParams(next, { replace: true });

        try {
            const res = await jobsApi.recommend({
                skills: f.skills,
                role: f.role.trim(),
                jobType: f.jobType,
                location: f.location.trim(),
                coords: f.coords,
                remoteOnly: f.remoteOnly,
                strictType: f.strictType,
                sortBy: f.sortBy
            });

            if (id !== requestId.current) return;   // superseded by a newer search
            setData(res);
            setVisibleCount(PAGE);
            setView('results');
            // The search that just ran is now itself history.
            jobsApi.history().then((r) => setHistory(r.items ?? [])).catch(() => {});

            // res.ingest is the per-source report array, present only when a
            // blocking cold-start fetch ran for this very search.
            const report = Array.isArray(res.ingest) ? res.ingest : [];
            const ingested = report.filter((r) => r.ok && r.count);
            const failed = report.filter((r) => !r.ok).map((r) => r.source);
            let message = `Ranked ${res.poolSize} candidate listings.`;
            if (ingested.length) message += ` Refreshed from ${ingested.map((r) => r.source).join(', ')}.`;
            if (failed.length) message += ` ${failed.join(' and ')} unreachable — using the stored index.`;
            // The index answered from what it had and is topping itself up
            // behind this response — say so, or the next search finding more
            // results looks like a bug.
            if (res.refreshing || res.cityFetch?.timedOut) {
                message += ' Newer listings are still loading — search again in a minute to include them.';
            }
            setStatus({ message, error: false });
        } catch (err) {
            if (id !== requestId.current) return;
            setData(null);
            setStatus({ message: err.message, error: true });
        } finally {
            if (id === requestId.current) setLoading(false);
        }
    }, [form, setParams]);

    /* Mount: fill in what the LMS already knows, then search on it.
       Three sources are settled before the one-time search runs: the inbound
       URL (a shared link keeps exactly what it carries), the student's Career
       Path profile (goal + progressed skills, when the link brought neither),
       and a detected location. If the assembled profile validates, the first
       search runs itself — the zero-typing case this exists for. */
    useEffect(() => {
        if (bootstrapped.current) return;
        bootstrapped.current = true;

        const inbound = formFromParams(params);

        const boot = async () => {
            let extra = {};

            // Both profiles are learned on every visit — the gap card needs
            // the goal, the panel needs the resume state — but they only fill
            // the FORM in a vacuum: a link that names skills or a role is
            // someone's deliberate search, not a blank slate. Resume skills
            // come first in the merge: they are evidence the student put in
            // writing, where roadmap progress is the LMS's own bookkeeping.
            const [fromCareer, resumeRes] = await Promise.all([
                careerPrefill().catch(() => null),
                jobsApi.resumeGet().catch(() => ({ profile: null }))
            ]);
            setCareerGoal(fromCareer?.role ?? null);
            const resume = resumeRes.profile ?? null;
            setResumeProfile(resume);

            if (!inbound.skills.length && !inbound.role.trim()) {
                const skills = [...new Set([...(resume?.skills ?? []), ...(fromCareer?.skills ?? [])])].slice(0, 15);
                const prefill = {
                    ...(skills.length ? { skills } : {}),
                    ...(fromCareer?.role ? { role: fromCareer.role } : {})
                };
                if (Object.keys(prefill).length) {
                    extra = { ...extra, ...prefill };
                    setForm((f) => ({ ...f, ...prefill }));
                    setStatus({
                        message: resume && fromCareer
                            ? 'Filled in from your resume and Career Path profile.'
                            : resume
                                ? 'Filled in from your resume.'
                                : 'Filled in from your Career Path profile.',
                        error: false
                    });
                }
            }

            if (!inbound.location) {
                setDetecting(true);
                const d = await autoDetectLocation().catch(() => null);
                setDetecting(false);
                if (d?.label) {
                    // Never clobber a location typed while the lookup was in flight.
                    setForm((f) => (f.location ? f : { ...f, location: d.label, coords: d.coords }));
                    extra = { ...extra, location: d.label, coords: d.coords };
                }
            }

            const candidate = { ...inbound, ...extra };
            if (!Object.keys(validate(candidate)).length) search(candidate);
        };

        boot();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onDetectLocation = async () => {
        setDetecting(true);
        setStatus({ message: 'Detecting your location…', error: false });
        try {
            const { label, coords } = await detectLocation();
            update({ location: label, coords });
            setStatus({ message: `Location set to ${label}.`, error: false });
        } catch (err) {
            setStatus({ message: err.message, error: true });
        } finally {
            setDetecting(false);
        }
    };

    const onReset = () => {
        setForm(EMPTY_FORM);
        setData(null);
        setErrors({});
        setPayGate(false);
        setStatus({ message: '', error: false });
        setParams(new URLSearchParams(), { replace: true });
    };

    /* Filters that read as switches rather than as form fields. Flipping one
       *is* the request — waiting for "Find jobs" makes the box look broken,
       because the list it describes keeps contradicting it. The `data` guard
       matters: before the first search there is nothing to narrow. */
    const onToggle = (patch) => {
        update(patch);
        if (data) search(patch);
    };

    /* Applied at render, not at search: the verdict per card is already
       computed against the captured expectation, so the gate reuses exactly
       the comparison the pay flags show — the list and its labels can never
       disagree about who is below the bar. */
    const allResults = data?.results ?? [];
    const gatedResults = payGate && expectation.amount
        ? allResults.filter((j) => {
            const v = comparePay(j.salary, expectation.amount, expectation.currency);
            return !(v && !v.meets);
        })
        : allResults;
    const hiddenByPay = allResults.length - gatedResults.length;

    const headline = loading ? 'Searching…'
        : data ? (data.total ? `${data.total} matching ${data.total === 1 ? 'job' : 'jobs'}` : 'No matches')
            : 'Ready when you are';

    const money = CURRENCIES.find((c) => c.code === form.currency) ?? CURRENCIES[0];

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                    <span className="bg-indigo-100 text-indigo-600 p-2 rounded-xl"><Briefcase size={22} /></span>
                    Jobs
                </h1>
                <p className="text-sm lg:text-base text-slate-500 mt-1.5">
                    Listings from global job boards, ranked against your skills — and the skills you
                    still need for the role you want.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
                {/* ── Filters ─────────────────────────────────────────────── */}
                <form
                    onSubmit={(e) => { e.preventDefault(); search(); }}
                    className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 lg:sticky lg:top-6"
                >
                    <ResumeCard
                        profile={resumeProfile}
                        onProfile={setResumeProfile}
                        onApply={applyResume}
                    />

                    <SkillInput
                        value={form.skills}
                        options={skillOptions}
                        popular={popularSkills}
                        onChange={(skills) => update({ skills })}
                        error={errors.skills}
                    />

                    <RoleSelect
                        value={form.role}
                        roles={roles}
                        onChange={(role) => update({ role })}
                        error={errors.role}
                    />

                    <div>
                        <label htmlFor="job-type" className="block text-sm font-semibold text-slate-700 mb-1.5">Job type</label>
                        <select
                            id="job-type"
                            value={form.jobType}
                            onChange={(e) => onToggle({ jobType: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                        >
                            {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="job-location" className="block text-sm font-semibold text-slate-700 mb-1.5">Location</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    id="job-location"
                                    value={form.location}
                                    // Typing a place invalidates the precise fix that came with
                                    // the old one — otherwise distances would be measured from
                                    // wherever the student was standing earlier.
                                    onChange={(e) => update({ location: e.target.value, coords: null })}
                                    placeholder="City or country"
                                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                                />
                            </div>
                            <button
                                type="button" onClick={onDetectLocation} disabled={detecting}
                                title="Use my current location"
                                className="shrink-0 px-3 rounded-xl border border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                            >
                                {detecting ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="job-salary" className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Expected salary <span className="font-normal text-slate-400">(optional)</span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                id="job-salary"
                                value={form.salary}
                                onChange={(e) => update({ salary: e.target.value })}
                                placeholder={`e.g. ${money.example}`}
                                className={`flex-1 min-w-0 px-4 py-2.5 rounded-xl border bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                                    errors.salary ? 'border-rose-300 focus:ring-rose-500/40' : 'border-slate-300 focus:ring-indigo-500/40 focus:border-indigo-500'
                                }`}
                            />
                            <select
                                value={form.currency}
                                onChange={(e) => update({ currency: e.target.value })}
                                aria-label="Currency"
                                className="shrink-0 px-2 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            >
                                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                            </select>
                        </div>
                        {errors.salary
                            ? <p className="mt-1.5 text-xs text-rose-600">{errors.salary}</p>
                            : <p className="mt-1.5 text-xs text-slate-400">Labels each listing&apos;s pay against this figure.</p>}
                        <label
                            className={`mt-2 flex items-center gap-2.5 ${expectation.amount ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                            title={expectation.amount ? undefined : 'Run a search with an expected salary first.'}
                        >
                            <input
                                type="checkbox"
                                checked={payGate}
                                disabled={!expectation.amount}
                                onChange={(e) => setPayGate(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-slate-700">Hide pay below my expectation</span>
                        </label>
                        {payGate && expectation.amount && (
                            <p className="mt-1 text-xs text-slate-400">
                                Listings that don&apos;t disclose pay are kept — most employers publish no figure.
                            </p>
                        )}
                    </div>

                    <div className="space-y-2.5 pt-1">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                            <input type="checkbox" checked={form.remoteOnly}
                                onChange={(e) => onToggle({ remoteOnly: e.target.checked })}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-sm text-slate-700">Remote roles only</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                            <input type="checkbox" checked={form.strictType}
                                onChange={(e) => onToggle({ strictType: e.target.checked })}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-sm text-slate-700">Only my exact job type</span>
                        </label>
                    </div>

                    {status.message && (
                        <div className={`flex items-start gap-2 text-xs rounded-xl p-3 ${
                            status.error ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-50 text-slate-600 border border-slate-100'
                        }`}>
                            {status.error && <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                            <span>{status.message}</span>
                        </div>
                    )}

                    <div className="flex gap-2 pt-1">
                        <button type="submit" disabled={loading}
                            className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                            {loading ? 'Searching…' : 'Find jobs'}
                        </button>
                        <button type="button" onClick={onReset} title="Clear the form"
                            className="shrink-0 px-3 rounded-xl border border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors">
                            <RotateCcw size={16} />
                        </button>
                    </div>
                </form>

                {/* ── Results ─────────────────────────────────────────────── */}
                <section aria-label="Job recommendations">
                    <div className="flex items-baseline justify-between gap-4 flex-wrap mb-4">
                        <h2 className="text-lg font-bold text-slate-800">
                            {view === 'saved'
                                ? `${savedJobs.length} saved ${savedJobs.length === 1 ? 'job' : 'jobs'}`
                                : headline}
                            {view === 'results' && data && !loading && (
                                <span className="ml-2 text-sm font-normal text-slate-500">{describe(data.query, data)}</span>
                            )}
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setView(view === 'saved' ? 'results' : 'saved')}
                                aria-pressed={view === 'saved'}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                                    view === 'saved'
                                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                        : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                                }`}
                            >
                                <Bookmark size={14} fill={view === 'saved' ? 'currentColor' : 'none'} />
                                Saved{savedJobs.length ? ` (${savedJobs.length})` : ''}
                            </button>
                            {view === 'results' && (
                                <>
                                    <label htmlFor="job-sort" className="text-sm text-slate-500">Sort</label>
                                    <select
                                        id="job-sort" value={form.sortBy}
                                        onChange={(e) => { update({ sortBy: e.target.value }); if (data) search({ sortBy: e.target.value }); }}
                                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                    >
                                        <option value="relevance">Best match</option>
                                        <option value="skills">Skill overlap</option>
                                        <option value="recent">Most recent</option>
                                        {form.coords && <option value="distance">Nearest</option>}
                                    </select>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Recent searches, one tap from re-running. Hidden while a
                        search is in flight — the chips describe past intent and
                        would compete with the answer arriving. */}
                    {view === 'results' && !loading && history.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap mb-4">
                            <History size={14} className="text-slate-400 shrink-0" />
                            {history.slice(0, 5).map((h, i) => {
                                const label = [
                                    h.role || (h.skills?.length ? h.skills.slice(0, 2).join(', ') : null),
                                    h.location
                                ].filter(Boolean).join(' · ') || 'Search';
                                return (
                                    <button
                                        key={`${label}-${i}`}
                                        type="button"
                                        onClick={() => applyHistory(h)}
                                        title={`${h.skills?.length ?? 0} skill${(h.skills?.length ?? 0) === 1 ? '' : 's'} · ${h.resultCount ?? 0} results last time`}
                                        className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-1.5 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* ── Saved view ─────────────────────────────────────── */}
                    {view === 'saved' && (
                        savedJobs.length ? (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {savedJobs.map((job) => (
                                    <JobCard key={job.id} job={job} saved onToggleSave={toggleSave} />
                                ))}
                            </div>
                        ) : (
                            <Empty title="Nothing saved yet">
                                Tap the bookmark on any listing to keep it here — saved jobs survive
                                the search that found them.
                            </Empty>
                        )
                    )}

                    {view === 'results' && loading && <Skeletons />}

                    {view === 'results' && !loading && data && (
                        <>
                            <SkillGapCard
                                gap={data.gap}
                                unrecognizedRole={!data.roleRecognized && data.query.roleText ? data.query.roleText : null}
                                careerGoal={careerGoal}
                                careerPathEnabled={isCareerPathEnabled}
                            />

                            {hiddenByPay > 0 && (
                                <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 mb-4 text-sm text-slate-600">
                                    <span>
                                        {hiddenByPay} listing{hiddenByPay === 1 ? '' : 's'} hidden for disclosing pay below your expectation.
                                    </span>
                                    <button type="button" onClick={() => setPayGate(false)}
                                        className="shrink-0 font-semibold text-indigo-600 hover:text-indigo-700">
                                        Show them
                                    </button>
                                </div>
                            )}

                            {gatedResults.length ? (
                                <>
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                        {gatedResults.slice(0, visibleCount).map((job) => (
                                            <JobCard
                                                key={job.id}
                                                job={job}
                                                expected={expectation}
                                                saved={savedIds.has(job.id)}
                                                onToggleSave={toggleSave}
                                            />
                                        ))}
                                    </div>
                                    {gatedResults.length > visibleCount && (
                                        <div className="mt-5 text-center">
                                            <button
                                                type="button"
                                                onClick={() => setVisibleCount((n) => n + PAGE)}
                                                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                                            >
                                                Show more ({gatedResults.length - visibleCount} remaining)
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : hiddenByPay > 0 ? (
                                /* Everything matched — the pay gate hid it all.
                                   Saying "no matches" would send the student
                                   off to edit skills that are fine. */
                                <Empty title="Every match discloses pay below your expectation">
                                    {allResults.length} job{allResults.length === 1 ? '' : 's'} matched your profile
                                    but paid under your figure. Untick the pay filter to see them, or lower the expectation.
                                </Empty>
                            ) : data.excludedByLocation > 0 ? (
                                <Empty title={`No ${data.query.role || data.query.roleText || 'matching'} listings in ${data.query.locationResolved || data.query.location}`}>
                                    {data.excludedByLocation} job{data.excludedByLocation === 1 ? '' : 's'} matched your
                                    skills, but {data.excludedByLocation === 1 ? 'it is' : 'they are'} all somewhere else.
                                    Clear the location to see them, or search a nearby city.
                                </Empty>
                            ) : data.excludedByRole > 0 ? (
                                /* The place was right and the skills were right — it was the job
                                   title that did not match. Saying "no matches" here would send
                                   someone off to edit the wrong field. */
                                <Empty title={`Nothing titled “${data.query.role || data.query.roleText}” here`}>
                                    {data.excludedByRole} job{data.excludedByRole === 1 ? '' : 's'} nearby matched your
                                    skills, but none {data.excludedByRole === 1 ? 'is' : 'are'} advertised under that role.
                                    Clear the role to see them, or try a broader title.
                                </Empty>
                            ) : (
                                <Empty title="No jobs cleared the match threshold">
                                    Try removing the location, switching the job type to “Any”, unchecking
                                    “only my exact job type”, or adding more skills.
                                </Empty>
                            )}
                        </>
                    )}

                    {view === 'results' && !loading && !data && (
                        <Empty title="Tell us what you can do">
                            Start with your skills — they are what every listing is ranked against. Add the
                            role you are aiming for and we will show you exactly which skills you are missing.
                        </Empty>
                    )}
                </section>
            </div>
        </div>
    );
}
