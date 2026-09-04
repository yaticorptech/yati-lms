/**
 * Hidden Opportunities.
 *
 * Extra jobs the student qualifies for, beyond what a search on their exact
 * skills surfaces: the roles their qualification and skills point at are
 * worked out here, and each is searched for anywhere in the world.
 */
import { useEffect, useMemo, useState } from 'react';
import { Globe, GraduationCap, Briefcase, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { jobsApi, learnerSkills } from './api';
import { MatchCard } from './CareerMatchTab';

const norm = (s) => String(s || '').trim().toLowerCase();

/** Roles whose core skills the student already largely has, best fit first. */
const rolesFor = (roles, skills, pastRoles = []) => {
    const mine = new Set(skills.map(norm));
    const past = new Set(pastRoles.map(norm));
    return roles
        .map((r) => {
            const name = r.name || r.title || '';
            const core = r.core || [];
            const pref = r.preferred || [];
            const coreHit = core.filter((s) => mine.has(norm(s))).length;
            const prefHit = pref.filter((s) => mine.has(norm(s))).length;
            const held = past.has(norm(name)) || (r.aliases || []).some((a) => past.has(norm(a)));
            const score = (core.length ? coreHit / core.length : 0) * 0.8 + (pref.length ? prefHit / pref.length : 0) * 0.2 + (held ? 0.5 : 0);
            return { name, score, coreHit, core: core.length, held, because: [...core, ...pref].filter((s) => mine.has(norm(s))).slice(0, 4) };
        })
        .filter((r) => r.name && (r.held || r.coreHit >= 1))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
};

export default function HiddenOpportunitiesTab({ profile, onSwitchTab, location = '' }) {
    const [roles, setRoles] = useState(null);
    // Everything the student can show for: their resume, and what the LMS
    // taught them. A course finished here opens roles too.
    const [learned, setLearned] = useState(null);
    useEffect(() => { learnerSkills().then(setLearned); }, [profile?.parsedAt]);
    const skills = useMemo(
        () => [...new Set([...(profile?.skills || []), ...(learned?.bySource.course || []), ...(learned?.bySource.career || [])])],
        [profile?.skills, learned]
    );
    const pastRoles = useMemo(() => profile?.pastRoles || [], [profile?.pastRoles]);

    useEffect(() => { jobsApi.roles().then((r) => setRoles(r.roles || [])).catch(() => setRoles([])); }, []);

    const picks = useMemo(() => (roles ? rolesFor(roles, skills, pastRoles) : []), [roles, skills, pastRoles]);

    // One search per role, anywhere, then de-duplicated: a listing that fits
    // two roles is shown once, under the better fit. The answer is tagged with
    // the query it answers, so a changed resume shows the skeleton, not stale
    // groups.
    const query = roles && skills.length && picks.length ? `${picks.map((p) => p.name).join('|')}#${skills.join('|')}#${location}` : null;
    const [answer, setAnswer] = useState({ query: null, groups: null, error: '' });
    useEffect(() => {
        if (!query) return undefined;
        let cancelled = false;
        Promise.all(picks.map((p) => jobsApi.recommend({ skills, role: p.name, jobType: 'Any', location, remoteOnly: false, strictType: false, sortBy: 'relevance', limit: 12, quiet: true })
            .then((r) => ({ role: p, jobs: r.results || [] })).catch(() => ({ role: p, jobs: [] }))))
            .then((res) => {
                if (cancelled) return;
                const seen = new Set();
                const groups = res.map((g) => ({ ...g, jobs: g.jobs.filter((j) => { if (seen.has(j.id)) return false; seen.add(j.id); return true; }).sort((a, b) => (b.match?.total ?? 0) - (a.match?.total ?? 0)).slice(0, 6) })).filter((g) => g.jobs.length);
                setAnswer({ query, groups, error: '' });
            })
            .catch((e) => !cancelled && setAnswer({ query, groups: [], error: e.message || 'Could not fetch opportunities right now.' }));
        return () => { cancelled = true; };
    }, [query, picks, skills, location]);
    const groups = answer.query === query ? answer.groups : null;
    const loading = !!query && answer.query !== query;
    const error = answer.query === query ? answer.error : '';

    if (profile === undefined || roles === null) return <div className="skeleton h-64 rounded-3xl" />;

    if (!skills.length) {
        return (
            <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-200"><Globe size={26} /></span>
                <h2 className="mt-4 text-2xl font-black text-slate-900">Hidden Opportunities</h2>
                <p className="mx-auto mt-1 max-w-md text-slate-500">Jobs you qualify for that a plain search would not show. They are worked out from your resume, so add one first.</p>
                <button type="button" onClick={() => onSwitchTab('match')} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Add your resume <ArrowRight size={15} /></button>
            </section>
        );
    }

    const edu = profile.education || {};
    const qualification = [edu.degree, edu.specialization, edu.level].filter(Boolean).join(' · ');

    return (
        <section className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><Globe size={18} className="text-sky-500" /> Hidden Opportunities</h2>
                        <p className="text-sm text-slate-500">Extra jobs you qualify for, beyond a search on your exact skills{location ? ` — around ${location} and remote` : ' — searched anywhere in the world'}.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        {qualification && <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-violet-700"><GraduationCap size={13} /> {qualification}</span>}
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-slate-700"><Briefcase size={13} /> {profile.seniority || 'Fresher'}{profile.experienceYears ? ` · ${profile.experienceYears} yr${profile.experienceYears === 1 ? '' : 's'}` : ''}</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700"><Sparkles size={13} /> {skills.length} skills{learned?.bySource.course.length ? ` · ${learned.bySource.course.length} from your courses` : ''}</span>
                    </div>
                </div>
                {picks.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        <span className="text-xs font-semibold text-slate-500">You qualify for:</span>
                        {picks.map((p) => <span key={p.name} className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{p.name}</span>)}
                    </div>
                )}
            </div>

            {error && <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700"><AlertCircle size={15} /> {error}</p>}
            {!picks.length && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Your skills do not yet cover the core of any role we track. Add a few more skills to your resume, or search jobs by hand.</p>}
            {loading && <div className="grid gap-4 xl:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-52 rounded-2xl" />)}</div>}

            {!loading && groups && groups.map((g) => (
                <div key={g.role.name}>
                    <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h3 className="text-base font-black text-slate-900">{g.role.name}</h3>
                        <p className="text-xs text-slate-500">{g.role.held ? 'A role you have held' : `Because you know ${g.role.because.join(', ')}`}</p>
                    </div>
                    <div className="grid gap-4 xl:grid-cols-2">{g.jobs.map((job) => <MatchCard key={job.id} job={job} />)}</div>
                </div>
            ))}
            {!loading && groups && groups.length === 0 && picks.length > 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
                    <p className="font-bold text-slate-800">Nothing extra right now</p>
                    <p className="mt-1 text-sm text-slate-500">The roles you qualify for have no open listings in the index at the moment. Check back after the next refresh.</p>
                </div>
            )}
        </section>
    );
}
