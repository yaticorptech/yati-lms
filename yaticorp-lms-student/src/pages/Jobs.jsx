/**
 * @description Student job board — skill-ranked listings, plus the skill gap
 *              between where the student is and the role they want.
 *
 * Ported from the standalone CareerCompass app and redrawn in the LMS's own
 * card style. The server is unchanged from the original: it ranks on skills,
 * role fit, job type and distance, ingesting fresh listings when the stored
 * index is stale for the place being searched.
 *
 * The page is one search with several views of it. A tab is not a filter the
 * student typed — it is a fixed question ("what remote work fits me?") laid
 * over the form, so the form keeps saying what the student said and the tab
 * says what the view insists on. See TABS and TAB_QUERY.
 *
 * The Opportunities tab is different in kind: it is the age-aware section
 * (src/opportunities/) with its own profile and index. Once a student's
 * opportunity profile says they are under 18, it is the ONLY view — the
 * scraped global board carries no age data and is never shown to a minor.
 */
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Briefcase, MapPin, Loader2, RotateCcw, Search, AlertCircle, Crosshair,
    Bookmark, Sparkles, Compass, Globe, Clock, Check, X, ChevronDown, Info
, GraduationCap } from 'lucide-react';

import { AuthContext } from '../context/AuthContext';
import { jobsApi, detectLocation, autoDetectLocation, careerPrefill, learnerSkills } from '../jobs/api';
import { comparePay } from '../jobs/pay';
import { FIELD_LABEL, FIELD_INPUT, FIELD_OK, FIELD_BAD } from '../jobs/ui';
import SkillInput from '../jobs/SkillInput';
import ResumeCard from '../jobs/ResumeCard';
import RoleSelect from '../jobs/RoleSelect';
import JobCard from '../jobs/JobCard';
import SkillGapCard from '../jobs/SkillGapCard';
import JobsHero from '../jobs/JobsHero';
import JobsTabs from '../jobs/JobsTabs';
import OpportunitiesTab from '../opportunities/OpportunitiesTab';
import CareerMatchTab from '../jobs/CareerMatchTab';
import HiddenOpportunitiesTab from '../jobs/HiddenOpportunitiesTab';
import JobsVerificationGate from '../jobs/JobsVerificationGate';
import { opportunitiesApi } from '../opportunities/api';

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

const TABS = [
    { id: 'jobs', label: 'Jobs', hint: 'Find Jobs', icon: Briefcase, tone: 'indigo' },
    { id: 'match', label: 'Career Match', hint: 'Smart Suggestions', icon: Sparkles, tone: 'emerald' },
    { id: 'hidden', label: 'Hidden Opportunities', hint: 'Unseen Jobs', icon: Globe, tone: 'orange' },
    { id: 'opportunities', label: 'Part-Time Jobs', hint: 'Flexible Work', icon: Clock, tone: 'sky' },
    { id: 'saved', label: 'Saved Jobs', hint: 'Your Collection', icon: Bookmark, tone: 'violet' }
];

/* Bands whose opportunity profile says the global job board is off-limits. */
const MINOR_BANDS = ['explore', 'teen'];

/* What each tab lays over the form when it asks the ranker. Hidden
   Opportunities asks for remote roles only: listings a search for the
   student's own city never surfaces. The AI match tab sends the same query
   as Jobs and narrows what comes back, below. */
// Which resume this browser has already folded into the job search. Keyed on
// the upload time, so a re-upload counts as new and a page reload does not.
const RESUME_SEEN_KEY = 'jobs:resumeSeenAt';
const isNewerResume = (resume) => {
    try {
        const seen = Number(localStorage.getItem(RESUME_SEEN_KEY) || 0);
        return new Date(resume.parsedAt || 0).getTime() > seen;
    } catch { return true; }
};
const markResumeSeen = (resume) => {
    try { localStorage.setItem(RESUME_SEEN_KEY, String(new Date(resume.parsedAt || Date.now()).getTime())); } catch { /* private mode */ }
};

const TAB_QUERY = {
    jobs: {},
    match: {},
    hidden: { remoteOnly: true }
};

/* The match tab keeps only listings the student already mostly qualifies
   for. 60 is where the ring turns indigo on the card — "worth applying". */
const STRONG_MATCH = 60;

const TAB_NOTES = {
    match: 'Listings where you already cover most of what is asked — the ones worth applying to this week.',
    hidden: 'Remote roles open to you from anywhere. A search for your own city never surfaces these.'
};

const NOUNS = {
    jobs: ['matching job', 'matching jobs'],
    match: ['strong match', 'strong matches'],
    hidden: ['remote opportunity', 'remote opportunities'],
    opportunities: ['opportunity', 'opportunities'],
    saved: ['saved job', 'saved jobs']
};

// "parttime" was this tab's name for one release; old links still land here.
const tabFromParam = (value) => (value === 'parttime' ? 'opportunities' : TABS.some((t) => t.id === value) ? value : 'jobs');

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
    if (!f.skills.length && !f.role.trim()) problems.skills = 'Add at least one skill — results are ranked on your skills.';
    if (f.salary.trim() && !/\d/.test(f.salary)) problems.salary = 'Expected salary should be an amount, like 600000.';
    return problems;
};

/**
 * One line describing what was actually searched, beside the result count.
 * A tab that already says "part-time" or "remote" in its noun passes `omit`
 * so the line doesn't say it twice.
 */
const describe = (q, data, omit = {}) => {
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
    if (!omit.type && q.jobType && q.jobType !== 'Any') bits.push(q.jobType);
    if (q.remoteOnly) { if (!omit.remote) bits.push('remote only'); }
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

/* "✓ Skills matched" and its siblings: what the ranker actually used, so a
   student reading 44 results knows whether their city counted. */
const Signal = ({ ok, children }) => (
    <li className={`inline-flex items-center gap-1.5 ${ok ? 'text-emerald-700' : 'text-amber-700'}`}>
        {ok ? <Check size={14} strokeWidth={3} /> : <AlertCircle size={14} />}
        {children}
    </li>
);

/* A filter the last search ran with, removable in place. */
const Chip = ({ label, value, onRemove }) => (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/60 py-1.5 pl-3.5 pr-1.5 text-sm">
        <span className="font-semibold text-indigo-500">{label}</span>
        <span className="font-semibold text-indigo-900">{value}</span>
        <button type="button" onClick={onRemove} aria-label={`Remove ${label} ${value}`}
            className="rounded-full p-1 text-indigo-400 transition-colors hover:bg-indigo-100 hover:text-indigo-700">
            <X size={13} />
        </button>
    </span>
);

export default function Jobs() {
    const { isCareerPathEnabled } = useContext(AuthContext);
    const [params, setParams] = useSearchParams();
    const [form, setForm] = useState(() => formFromParams(params));
    const [tab, setTab] = useState(() => tabFromParam(params.get('tab')));
    /* The student's opportunity profile — band, rules, vocab. undefined
       until the first fetch answers; null when it failed. Loaded here rather
       than in the tab because the band decides what THIS page may show. */
    const [oppData, setOppData] = useState(undefined);
    // The identity check before the board opens. undefined = not answered yet;
    // a failed request opens the board rather than locking a student out.
    const [verification, setVerification] = useState(undefined);
    // The line shown above the tabs right after verifying: where the SMS went.
    const [verifiedNotice, setVerifiedNotice] = useState(null);
    const [roles, setRoles] = useState([]);
    const [skillOptions, setSkillOptions] = useState([]);
    const [popularSkills, setPopularSkills] = useState([]);

    const [data, setData] = useState(null);
    /* Which tab `data` answers. A tab switch re-asks only when the answer on
       screen was for a different question. */
    const [fetchedFor, setFetchedFor] = useState(null);
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

    /* Resume, course and Career Path skills, and which came from where. The
       skill box says so underneath, and the match tabs search on all three. */
    const [learned, setLearned] = useState(null);

    // The profile page answers an upload before the AI reader has finished;
    // while the profile still says "parsing", look again every few seconds
    // and fold any new skills into the search when the reading lands.
    useEffect(() => {
        if (resumeProfile?.parseStatus !== 'parsing') return undefined;
        let tries = 0;
        const timer = setInterval(async () => {
            tries += 1;
            try {
                const r = await jobsApi.resumeGet();
                const next = r.profile ?? null;
                if (!next || next.parseStatus === 'parsing') { if (tries >= 12) clearInterval(timer); return; }
                clearInterval(timer);
                setResumeProfile(next);
                if (next.skills?.length) {
                    markResumeSeen(next);
                    setForm((f) => ({ ...f, skills: [...new Set([...f.skills, ...next.skills])].slice(0, 20) }));
                    setStatus({ message: `Added ${next.skills.length} skills from your resume.`, error: false });
                }
            } catch { if (tries >= 12) clearInterval(timer); }
        }, 5000);
        return () => clearInterval(timer);
    }, [resumeProfile?.parseStatus]);

    // Bookmarks. savedIds drives the icon on every card; savedJobs is the
    // saved view's own list, fetched once and edited optimistically.
    const [savedIds, setSavedIds] = useState(() => new Set());
    const [savedJobs, setSavedJobs] = useState([]);


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
        opportunitiesApi.profile().then(setOppData).catch(() => setOppData(null));
        // Every visit starts on the verification form, even for a student who
        // has done it before: `complete` is what the server remembers, not a
        // pass for this session. What it remembers is used to prefill.
        jobsApi.verificationGet()
            .then((r) => setVerification({ ...r, previous: r.verification, complete: false }))
            .catch(() => setVerification({ complete: false, previous: null }));
    }, []);

    /* A minor never sees the global board: whatever tab the URL or a click
       asked for, the page answers with Opportunities. */
    const minor = MINOR_BANDS.includes(oppData?.band);
    useEffect(() => {
        if (minor && tab !== 'opportunities') {
            setTab('opportunities');
            setParams((prev) => { const next = new URLSearchParams(prev); next.set('tab', 'opportunities'); return next; }, { replace: true });
        }
    }, [minor, tab, setParams]);

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

    const search = useCallback(async (overrides = {}, tabId = tab) => {
        // A search always lands on a results tab: submitting the form from
        // Saved Jobs means "go find them", not "re-sort my bookmarks".
        const target = tabId === 'saved' ? 'jobs' : tabId;
        const base = { ...form, ...overrides };

        const problems = validate(base);
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
        setExpectation({ amount: base.salary, currency: base.currency });

        // The tab's constraints sit on top of the form and never in it — the
        // form still reads what the student said when they come back to Jobs.
        const f = { ...base, ...TAB_QUERY[target] };

        const id = ++requestId.current;
        setLoading(true);
        setStatus({ message: 'Searching global job sources…', error: false });

        // Keep the URL in step with what is actually being searched for.
        const next = new URLSearchParams();
        if (base.skills.length) next.set('skills', base.skills.join(','));
        if (base.role.trim()) next.set('role', base.role.trim());
        if (base.jobType !== 'Any') next.set('type', base.jobType);
        if (base.salary.trim()) { next.set('salary', base.salary.trim()); next.set('cur', base.currency); }
        if (base.location.trim()) next.set('loc', base.location.trim());
        if (base.remoteOnly) next.set('remote', '1');
        if (base.sortBy !== 'relevance') next.set('sort', base.sortBy);
        if (target !== 'jobs') next.set('tab', target);
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
            setFetchedFor(target);
            setVisibleCount(PAGE);
            setTab(target);

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
    }, [form, tab, setParams]);

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

    const setTabParam = (id) => {
        setParams((prev) => {
            const next = new URLSearchParams(prev);
            if (id === 'jobs') next.delete('tab'); else next.set('tab', id);
            return next;
        }, { replace: true });
    };

    const switchTab = (id) => {
        setTab(id);
        setTabParam(id);
        // Match and Hidden work from the resume, not the form.
        if (id === 'saved' || id === 'opportunities' || id === 'match' || id === 'hidden') return;
        if (data && fetchedFor === id) return;
        const problems = validate(form);
        if (!Object.keys(problems).length) return search({}, id);
        // The form can't be searched: say so, and don't leave another tab's
        // listings sitting under this tab's name.
        setErrors(problems);
        setStatus({ message: problems.skills, error: true });
        if (data) setData(null);
    };

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
        const inboundTab = tabFromParam(params.get('tab'));

        const boot = async () => {
            let extra = {};

            // Both profiles are learned on every visit — the gap card needs
            // the goal, the panel needs the resume state — but they only fill
            // the FORM in a vacuum: a link that names skills or a role is
            // someone's deliberate search, not a blank slate. Resume skills
            // come first in the merge: they are evidence the student put in
            // writing, where roadmap progress is the LMS's own bookkeeping.
            const [fromCareer, resumeRes, learnedNow] = await Promise.all([
                careerPrefill().catch(() => null),
                jobsApi.resumeGet().catch(() => ({ profile: null })),
                learnerSkills()
            ]);
            setLearned(learnedNow);
            setCareerGoal(fromCareer?.role ?? null);
            const resume = resumeRes.profile ?? null;
            setResumeProfile(resume);

            // A resume uploaded since the last visit brings its skills into
            // the search once, even when the URL already names a search —
            // that is the whole point of uploading it. Marked as seen so a
            // student who then removes a chip is not handed it back.
            const newResume = resume?.skills?.length && isNewerResume(resume);
            if (newResume) {
                markResumeSeen(resume);
                if (inbound.skills.length || inbound.role.trim()) {
                    const skills = [...new Set([...inbound.skills, ...resume.skills])].slice(0, 20);
                    extra = { ...extra, skills };
                    setForm((f) => ({ ...f, skills }));
                    setStatus({ message: `Added ${resume.skills.length} skills from your resume.`, error: false });
                }
            }

            if (!inbound.skills.length && !inbound.role.trim()) {
                // Resume first — it is what the student wrote about themselves —
                // then what this LMS actually taught them, then Career Path
                // practice. A course finished here is evidence too.
                const skills = [...new Set([
                    ...(learnedNow.bySource.resume ?? []),
                    ...(resume?.skills ?? []),
                    ...(learnedNow.bySource.course ?? []),
                    ...(fromCareer?.skills ?? []),
                    ...(learnedNow.bySource.career ?? [])
                ])].slice(0, 15);
                const prefill = {
                    ...(skills.length ? { skills } : {}),
                    ...(fromCareer?.role ? { role: fromCareer.role } : {})
                };
                if (Object.keys(prefill).length) {
                    extra = { ...extra, ...prefill };
                    setForm((f) => ({ ...f, ...prefill }));
                    const from = [
                        resume || learnedNow.bySource.resume.length ? 'your resume' : null,
                        learnedNow.bySource.course.length ? 'the courses you have taken' : null,
                        fromCareer || learnedNow.bySource.career.length ? 'your Career Path profile' : null
                    ].filter(Boolean);
                    setStatus({
                        message: `Filled in from ${from.length > 1 ? `${from.slice(0, -1).join(', ')} and ${from.at(-1)}` : from[0] || 'your profile'}.`,
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

            // A link straight to Saved Jobs or Opportunities is a request to
            // see them, not to run a search that would flip the page onto Jobs.
            if (inboundTab === 'saved' || inboundTab === 'opportunities') return;

            const candidate = { ...inbound, ...extra };
            if (!Object.keys(validate(candidate)).length) search(candidate, inboundTab);
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

    /* "Reset filters": everything but the skills, which are the student's
       profile rather than a filter over it. The results go with the filters —
       a list ranked against a role that is no longer named is stale. */
    const onReset = () => {
        setForm((f) => ({ ...EMPTY_FORM, skills: f.skills }));
        setData(null);
        setFetchedFor(null);
        setErrors({});
        setPayGate(false);
        setExpectation({ amount: '', currency: 'INR' });
        setStatus({ message: '', error: false });
        setParams((prev) => {
            const next = new URLSearchParams();
            if (prev.get('skills')) next.set('skills', prev.get('skills'));
            if (tab !== 'jobs') next.set('tab', tab);
            return next;
        }, { replace: true });
    };

    /* Filters that read as switches rather than as form fields. Flipping one
       *is* the request — waiting for "Find jobs" makes the box look broken,
       because the list it describes keeps contradicting it. The `data` guard
       matters: before the first search there is nothing to narrow. */
    const onToggle = (patch) => {
        update(patch);
        if (data) search(patch);
    };

    /* A chip's ✕ is the same gesture: change the field, re-ask. Removing the
       role fails validation on purpose — the field lights up and the stale
       list clears, rather than the page quietly ranking on skills alone. */
    const removeFilter = (patch) => {
        update(patch);
        search(patch);
    };

    const clearSalary = () => {
        update({ salary: '' });
        setExpectation({ amount: '', currency: form.currency });
        setPayGate(false);
    };

    /* Applied at render, not at search: the verdict per card is already
       computed against the captured expectation, so the gate reuses exactly
       the comparison the pay flags show — the list and its labels can never
       disagree about who is below the bar. */
    /* Skills the LMS knows the student has earned that are not in the box —
       offered as one tap rather than added behind their back. */
    const missingLearned = useMemo(
        () => (learned ? learned.skills.filter((s) => !form.skills.some((f) => f.toLowerCase() === s.toLowerCase())).slice(0, 12) : []),
        [learned, form.skills]
    );

    const allResults = data?.results ?? [];
    const gatedResults = payGate && expectation.amount
        ? allResults.filter((j) => {
            const v = comparePay(j.salary, expectation.amount, expectation.currency);
            return !(v && !v.meets);
        })
        : allResults;
    const hiddenByPay = allResults.length - gatedResults.length;
    const strong = tab === 'match' ? gatedResults.filter((j) => (j.match?.total ?? 0) >= STRONG_MATCH) : gatedResults;
    // Matches exist, none strong: show the closest ten rather than nothing —
    // a student who just uploaded a resume should see the board move.
    const weakOnly = tab === 'match' && gatedResults.length > 0 && strong.length === 0;
    const shown = weakOnly
        ? [...gatedResults].sort((a, b) => (b.match?.total ?? 0) - (a.match?.total ?? 0)).slice(0, 10)
        : strong;

    const q = data?.query;
    const remoteLocked = tab === 'hidden';

    const count = tab === 'saved' ? savedJobs.length
        : tab === 'match' ? shown.length
            : (data?.total ?? 0);
    const noun = (NOUNS[tab] || NOUNS.jobs)[count === 1 ? 0 : 1];
    const headline = tab === 'saved' ? `${count} ${noun}`
        : loading ? 'Searching…'
            : !data ? 'Ready when you are'
                : count ? `${count} ${noun}`
                    : tab === 'match' ? 'No strong matches yet' : 'No matches';
    const showCount = tab === 'saved' || (data && !loading && count > 0);

    const money = CURRENCIES.find((c) => c.code === form.currency) ?? CURRENCIES[0];

    /* Until the band is known the board waits: a minor must never see it,
       even for the half-second before their profile answers. */
    if (oppData === undefined) {
        return (
            <div className="space-y-5 animate-fade-in pb-12" aria-busy="true">
                <div className="skeleton h-56 rounded-3xl" />
                <div className="skeleton h-14 rounded-2xl" />
                <Skeletons />
            </div>
        );
    }

    if (verification === undefined) {
        return (
            <div className="space-y-5 animate-fade-in pb-12" aria-busy="true">
                <div className="skeleton h-56 rounded-3xl" />
                <div className="skeleton h-14 rounded-2xl" />
                <Skeletons />
            </div>
        );
    }

    if (!verification.complete) {
        return (
            <div className="animate-fade-in pb-12">
                <JobsVerificationGate
                    profilePhoto={verification.profilePhoto}
                    profilePhone={verification.profilePhone}
                    previous={verification.previous}
                    onVerified={(r) => {
                        setVerification({ ...r, complete: true });
                        setVerifiedNotice(r.sms || { sent: false });
                        // Land on the job bar itself, whatever tab the URL was pointing at.
                        setTab('jobs');
                        setTabParam('jobs');
                    }}
                />
            </div>
        );
    }

    const showOpportunities = minor || tab === 'opportunities';

    return (
        <div className="space-y-5 animate-fade-in pb-12">
            {!showOpportunities && (
                <JobsHero
                    total={data?.total ?? 0}
                    loading={loading}
                    hasData={!!data}
                    topMatch={data?.results?.[0]?.match?.total ?? null}
                />
            )}

            {verifiedNotice && (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 animate-fade-in" role="status">
                    <Check size={18} className="mt-0.5 shrink-0" />
                    <p className="flex-1">
                        <span className="font-bold">You are verified.</span>{' '}
                        {verifiedNotice.sent
                            ? `A confirmation message was sent to ${verifiedNotice.to}.${verifiedNotice.simulated ? ' (Test mode: it was written to the server log.)' : ''}`
                            : 'We could not send the confirmation SMS right now, but your verification is saved.'}
                    </p>
                    <button type="button" onClick={() => setVerifiedNotice(null)} aria-label="Dismiss" className="shrink-0 text-emerald-700 hover:text-emerald-900"><X size={16} /></button>
                </div>
            )}

            {!minor && <JobsTabs tabs={TABS} active={tab} onChange={switchTab} counts={{ saved: savedJobs.length }} />}

            {showOpportunities ? (
                <OpportunitiesTab data={oppData} onData={setOppData} careerPathEnabled={isCareerPathEnabled}
                    location={form.location} onLocation={(location) => update({ location })} />
            ) : tab === 'match' ? (
                <CareerMatchTab profile={resumeProfile} onProfile={setResumeProfile} onSwitchTab={switchTab} location={form.location} />
            ) : tab === 'hidden' ? (
                <HiddenOpportunitiesTab profile={resumeProfile} onSwitchTab={switchTab} location={form.location} />
            ) : (
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

                    <div>
                        <SkillInput
                            value={form.skills}
                            options={skillOptions}
                            popular={popularSkills}
                            onChange={(skills) => update({ skills })}
                            error={errors.skills}
                        />
                        {learned && learned.skills.length > 0 && (
                            <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-slate-500">
                                <GraduationCap size={12} className="shrink-0 text-indigo-500" aria-hidden="true" />
                                <span>
                                    {[
                                        learned.bySource.course.length && `${learned.bySource.course.length} from your courses`,
                                        learned.bySource.career.length && `${learned.bySource.career.length} from your skill progress`,
                                        learned.bySource.resume.length && `${learned.bySource.resume.length} from your resume`
                                    ].filter(Boolean).join(' · ')}
                                </span>
                                {missingLearned.length > 0 && (
                                    <button type="button" onClick={() => update({ skills: [...new Set([...form.skills, ...missingLearned])].slice(0, 20) })}
                                        className="font-bold text-indigo-600 hover:underline">
                                        Add {missingLearned.length} more you have earned
                                    </button>
                                )}
                            </p>
                        )}
                    </div>

                    <RoleSelect
                        value={form.role}
                        roles={roles}
                        onChange={(role) => update({ role })}
                        error={errors.role}
                    />

                    <div>
                        <label htmlFor="job-type" className={FIELD_LABEL}>Job type</label>
                        <select
                            id="job-type"
                            value={form.jobType}
                            onChange={(e) => onToggle({ jobType: e.target.value })}
                            className={`${FIELD_INPUT} ${FIELD_OK}`}
                        >
                            {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="job-location" className={FIELD_LABEL}>Location</label>
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
                                    className={`${FIELD_INPUT} ${FIELD_OK} pl-9 pr-3`}
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
                        <label htmlFor="job-salary" className={FIELD_LABEL}>
                            Expected salary <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                id="job-salary"
                                value={form.salary}
                                onChange={(e) => update({ salary: e.target.value })}
                                placeholder={`e.g. ${money.example}`}
                                className={`${FIELD_INPUT} flex-1 min-w-0 ${errors.salary ? FIELD_BAD : FIELD_OK}`}
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
                        <label className={`flex items-center gap-2.5 ${remoteLocked ? 'cursor-default' : 'cursor-pointer'}`}>
                            <input type="checkbox" checked={remoteLocked || form.remoteOnly} disabled={remoteLocked}
                                onChange={(e) => onToggle({ remoteOnly: e.target.checked })}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-sm text-slate-700">
                                Remote roles only
                                {remoteLocked && <span className="ml-1.5 text-xs text-slate-400">(set by this tab)</span>}
                            </span>
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
                        <button type="button" onClick={onReset} title="Reset filters"
                            className="shrink-0 px-3 rounded-xl border border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors">
                            <RotateCcw size={16} />
                        </button>
                    </div>
                </form>

                {/* ── Results ─────────────────────────────────────────────── */}
                <section aria-label="Job recommendations" className="min-w-0">
                    {TAB_NOTES[tab] && (
                        <p className="mb-3 flex items-start gap-2 text-sm text-slate-500">
                            <Info size={15} className="mt-0.5 shrink-0 text-indigo-400" />
                            {TAB_NOTES[tab]}
                        </p>
                    )}

                    <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                        <div className="min-w-0">
                            <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                {showCount && (
                                    <span className="text-4xl font-black leading-none tabular-nums text-indigo-600">{count}</span>
                                )}
                                <span className="text-lg font-bold text-slate-800">
                                    {showCount ? noun : headline}
                                </span>
                                {tab !== 'saved' && data && !loading && (
                                    <span className="text-sm font-normal text-slate-500">
                                        {describe(q, data, { remote: remoteLocked })}
                                    </span>
                                )}
                            </h2>
                            {tab !== 'saved' && data && !loading && (
                                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
                                    <Signal ok={q.skills?.length > 0}>
                                        {q.skills?.length ? 'Skills matched' : 'No skills given'}
                                    </Signal>
                                    <Signal ok={data.roleRecognized && !data.roleIgnored}>
                                        {data.roleIgnored ? 'Role not found in titles'
                                            : data.roleRecognized ? 'Role considered'
                                                : 'Role matched on keywords'}
                                    </Signal>
                                    <Signal ok={q.remoteOnly || !!q.locationResolved || !q.location}>
                                        {q.remoteOnly ? 'Remote only'
                                            : q.locationResolved ? 'Location considered'
                                                : q.location ? 'Location not recognised'
                                                    : 'Any location'}
                                    </Signal>
                                </ul>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => switchTab(tab === 'saved' ? 'jobs' : 'saved')}
                                aria-pressed={tab === 'saved'}
                                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                                    tab === 'saved'
                                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600'
                                }`}
                            >
                                <Bookmark size={15} fill={tab === 'saved' ? 'currentColor' : 'none'} />
                                Saved{savedJobs.length ? ` (${savedJobs.length})` : ''}
                            </button>
                            {tab !== 'saved' && (
                                <div className="inline-flex items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white">
                                    <label htmlFor="job-sort"
                                        className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-[11px] font-bold tracking-wider text-slate-500">
                                        SORT
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="job-sort" value={form.sortBy}
                                            onChange={(e) => { update({ sortBy: e.target.value }); if (data) search({ sortBy: e.target.value }); }}
                                            className="appearance-none bg-white py-2 pl-3 pr-8 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500/40"
                                        >
                                            <option value="relevance">Best match</option>
                                            <option value="skills">Skill overlap</option>
                                            <option value="recent">Most recent</option>
                                            {form.coords && <option value="distance">Nearest</option>}
                                        </select>
                                        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* The filters the list on screen was ranked with. Each ✕
                        re-asks without it, so the chips and the list never
                        describe two different searches. */}
                    {tab !== 'saved' && data && !loading && (
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            {(q.role || q.roleText) && (
                                <Chip label="Role" value={q.role || q.roleText} onRemove={() => removeFilter({ role: '' })} />
                            )}
                            {q.remoteOnly
                                ? !remoteLocked && <Chip label="Remote" value="only" onRemove={() => removeFilter({ remoteOnly: false })} />
                                : q.location && (
                                    <Chip label="In" value={q.locationResolved || q.location} onRemove={() => removeFilter({ location: '', coords: null })} />
                                )}
                            {q.jobType && q.jobType !== 'Any' && (
                                <Chip label="Type" value={q.jobType} onRemove={() => removeFilter({ jobType: 'Any' })} />
                            )}
                            {expectation.amount && (
                                <Chip label="Pay" value={`${expectation.currency} ${expectation.amount}+`} onRemove={clearSalary} />
                            )}
                            <button type="button" onClick={onReset}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800">
                                <RotateCcw size={13} /> Reset filters
                            </button>
                        </div>
                    )}

                    {/* ── Saved view ─────────────────────────────────────── */}
                    {tab === 'saved' && (
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

                    {tab !== 'saved' && loading && <Skeletons />}

                    {tab !== 'saved' && !loading && data && (
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

                            {shown.length ? (
                                <>
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                        {weakOnly && (
                                            <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                                                No listing reaches {STRONG_MATCH}% yet — these are your closest matches. Adding the missing skills shown on each card moves them up.
                                            </p>
                                        )}
                                        {shown.slice(0, visibleCount).map((job) => (
                                            <JobCard
                                                key={job.id}
                                                job={job}
                                                expected={expectation}
                                                saved={savedIds.has(job.id)}
                                                onToggleSave={toggleSave}
                                            />
                                        ))}
                                    </div>
                                    {shown.length > visibleCount && (
                                        <div className="mt-5 text-center">
                                            <button
                                                type="button"
                                                onClick={() => setVisibleCount((n) => n + PAGE)}
                                                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                                            >
                                                Show more ({shown.length - visibleCount} remaining)
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : weakOnly ? (
                                <Empty title="No strong matches yet">
                                    {gatedResults.length} listing{gatedResults.length === 1 ? '' : 's'} matched you in part,
                                    none at {STRONG_MATCH}% or better. The core skills above are what tip a listing over —
                                    closing one or two usually moves several at once. The Jobs tab shows every match.
                                </Empty>
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
                            ) : remoteLocked ? (
                                <Empty title="No remote listings cleared the match threshold">
                                    Nothing work-from-anywhere matched this profile yet. Add more skills, or try a broader
                                    role title — remote boards tend to advertise under generic ones.
                                </Empty>
                            ) : (
                                <Empty title="No jobs cleared the match threshold">
                                    Try removing the location, switching the job type to “Any”, unchecking
                                    “only my exact job type”, or adding more skills.
                                </Empty>
                            )}
                        </>
                    )}

                    {tab !== 'saved' && !loading && !data && (
                        <Empty title="Tell us what you can do">
                            Start with your skills — they are what every listing is ranked against. Add the
                            role you are aiming for and we will show you exactly which skills you are missing.
                        </Empty>
                    )}
                </section>
            </div>
            )}
        </div>
    );
}
