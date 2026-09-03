/**
 * @description Live job matches for the student's career goal, on the
 *              Career Path Overview.
 *
 * The bridge in the other direction from the Jobs page's prefill: Career Path
 * knows where the student is going, the job board knows who is hiring for it,
 * and until this tile neither section ever mentioned the other. Three matches,
 * ranked by the same engine the Jobs page uses, with the same goal-and-skills
 * profile the prefill sends.
 *
 * The query carries `quiet: true` — it is machine-made, so it must not enter
 * the student's search history, the admin demand charts, or (worst) become
 * the "latest search" the daily job alerts re-run.
 *
 * Renders nothing rather than an error in every failure mode: Jobs locked by
 * an admin, no goal yet, the index empty, the request failing. A dashboard
 * tile that apologises for itself earns its place on no day at all.
 */
import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, ArrowRight, MapPin } from 'lucide-react';

// Deliberate imports from outside the career section: the LMS context carries
// the admin lock on Jobs, and jobs/api carries the profile the prefill uses —
// reusing it keeps "what Career Path tells the job board" defined once.
import { AuthContext as LmsAuthContext } from '../../../context/AuthContext';
import { jobsApi, careerPrefill } from '../../../jobs/api';
import Card, { CardHeader } from '../ui/Card';

export default function JobMatchesTile() {
  const { isJobsEnabled } = useContext(LmsAuthContext);
  const [jobs, setJobs] = useState(null);
  const [role, setRole] = useState('');
  // Whether the query carried any progressed skills. Without them the ranking
  // is role-title fit, honest but not a skill match — so the % chip, which
  // reads as "how well do I fit", is withheld rather than shown hollow.
  const [hadSkills, setHadSkills] = useState(false);

  useEffect(() => {
    if (!isJobsEnabled) return;
    let alive = true;

    (async () => {
      try {
        const profile = await careerPrefill();
        if (!profile?.role && !profile?.skills?.length) return;

        const res = await jobsApi.recommend({
          skills: profile.skills ?? [],
          role: profile.role ?? '',
          jobType: 'Any',
          location: '',
          remoteOnly: false,
          strictType: false,
          sortBy: 'relevance',
          limit: 3,
          quiet: true
        });
        if (!alive) return;
        setRole(profile.role ?? '');
        setHadSkills((profile.skills?.length ?? 0) > 0);
        setJobs(res.results ?? []);
      } catch {
        /* every failure mode renders as absence */
      }
    })();

    return () => { alive = false; };
  }, [isJobsEnabled]);

  if (!isJobsEnabled || !jobs?.length) return null;

  return (
    // The grid cell lives here, not in Overview: when this tile has nothing
    // to say it returns null, and an empty wrapper cell left behind in the
    // bento would still cost a phantom row of gap.
    <div>
    <Card hover>
      <CardHeader
        icon={Briefcase}
        title="Jobs for you"
        subtitle={role ? `Hiring now for ${role}` : 'Matched to your skills'}
        accent="emerald"
        action={
          <Link
            to="/jobs"
            className="group inline-flex items-center gap-1 rounded-md bg-surface-100 px-2.5 py-1 text-xs font-bold text-link transition-colors hover:bg-brand-50"
          >
            See all matches
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        }
      />
      {/* Three across only once there is room for three. At `sm` the LMS
          sidebar is still taking 16rem, so three job cards were sharing about
          570px and every company name truncated mid-word — "Staff Data
          Scientist,…" three times over, which tells the student nothing. */}
      <div className="grid gap-3 lg:grid-cols-3">
        {jobs.map((job) => (
          <a
            key={job.id}
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border border-line-200 p-4 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              {hadSkills ? (
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600 tabular-nums">
                  {job.match.total}% match
                </span>
              ) : (
                <span className="rounded-md bg-surface-100 px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider text-ink-500">
                  Hiring now
                </span>
              )}
              {job.remote && (
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-ink-400">Remote</span>
              )}
            </div>
            <p className="line-clamp-2 text-sm font-bold leading-snug text-ink-900 group-hover:text-link">
              {job.title}
            </p>
            <p className="mt-1 truncate text-xs font-medium text-ink-500">{job.company}</p>
            {job.location && (
              <p className="mt-1.5 flex items-center gap-1 truncate text-xs text-ink-400">
                <MapPin className="h-3 w-3 shrink-0" />
                {job.location}
              </p>
            )}
          </a>
        ))}
      </div>
    </Card>
    </div>
  );
}
