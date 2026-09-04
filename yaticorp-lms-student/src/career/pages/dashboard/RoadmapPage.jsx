import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Sparkles, RefreshCw, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import RoadmapDisplay from '../../components/RoadmapDisplay';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { SkeletonRoadmap } from '../../components/ui/Skeleton';
import ShareBadgeDialog from '../../components/roadmap/ShareBadgeDialog';
import AiBudgetNotice from '../../components/AiBudgetNotice';
import { readAiBudgetError } from '../../utils/aiBudget';
import GeneratingRoadmap from '../../components/journey/GeneratingRoadmap';

export default function RoadmapPage() {
  const [roadmap, setRoadmap] = useState(null);
  // The destination the whole page is about. Fetched here rather than inside
  // RoadmapDisplay so the header can name it before a single phase is read —
  // a roadmap that never says what it leads to is just a list of school years.
  const [goal, setGoal] = useState(null);
  const [completedPhases, setCompletedPhases] = useState([]);
  const [badgeBusy, setBadgeBusy] = useState(null);
  const [sharingBadge, setSharingBadge] = useState(null);
  const [aiBudget, setAiBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const confirm = useConfirm();
  const toast = useToast();

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        // Both 404 legitimately — no goal yet, or a goal with no roadmap
        // behind it — so neither is allowed to reject the other.
        const [roadmapRes, goalRes] = await Promise.all([
          api.get('/roadmap').catch(() => null),
          api.get('/goals').catch(() => null)
        ]);
        if (roadmapRes) {
          setRoadmap(roadmapRes.data.roadmapData);
          setCompletedPhases(roadmapRes.data.completedPhases || []);
        }
        setGoal(goalRes?.data || null);
      } finally {
        setLoading(false);
      }
    };
    fetchRoadmap();
  }, []);

  const handleGenerateRoadmap = async () => {
    // Regenerating is destructive server-side: it deletes the existing roadmap
    // along with every task, tracked skill, planner context, and recommendation.
    // Only ask when there is something to lose.
    if (roadmap) {
      const ok = await confirm({
        title: 'Regenerate your roadmap?',
        message:
          'This replaces your current roadmap and permanently deletes your tasks, tracked skills, planner history, and recommendations. Your XP and badges are kept.',
        confirmLabel: 'Regenerate',
        cancelLabel: 'Keep my roadmap',
        destructive: true
      });
      if (!ok) return;
    }

    try {
      setGenerating(true);
      setError(null);
      setAiBudget(null);
      const { data } = await api.post('/roadmap/generate');
      setRoadmap(data.roadmapData);
      setCompletedPhases(data.completedPhases || []);
    } catch (err) {
      // A spent allowance is not a failure to report in red. It gets its own
      // notice, which says when it comes back and that nothing has been lost.
      const budget = readAiBudgetError(err);
      if (budget) {
        setAiBudget(budget);
      } else if (err.response?.status === 404) {
        setError('You need to complete onboarding first.');
      } else {
        setError(err.response?.data?.message || 'Failed to generate roadmap');
      }
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Fetch (or mint) this phase's milestone badge and open the share sheet.
   *
   * The badge is issued lazily rather than at the moment a phase is ticked:
   * most phases are completed by a student who is not thinking about posting
   * anything, and minting a public link nobody asked for is not something to
   * do on their behalf.
   */
  const shareBadge = async (index) => {
    setBadgeBusy(index);
    try {
      const { data } = await api.post('/milestones/badge', { index });
      setSharingBadge(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not prepare that badge. Please try again.');
    } finally {
      setBadgeBusy(null);
    }
  };

  const handleTogglePhase = async (index) => {
    // Optimistic: ticking a phase should feel instant. The server response is
    // authoritative and replaces this; a failure rolls it back.
    //
    // Mirrors the server's prefix rule — phases are sequential, so completing
    // one completes everything before it and reopening one reopens everything
    // after it. Toggling only the single index here would flash a contradictory
    // state (Class 12 done, Class 11 not) until the response landed.
    const previous = completedPhases;
    const next = previous.includes(index)
      ? Array.from({ length: index }, (_, i) => i)
      : Array.from({ length: index + 1 }, (_, i) => i);

    setCompletedPhases(next);
    setSaving(true);

    try {
      const { data } = await api.patch('/roadmap/phase', { index });
      setCompletedPhases(data.completedPhases);
    } catch {
      setCompletedPhases(previous);
      setError('Could not save your progress. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SkeletonRoadmap />;

  return (
    <div className="space-y-6">
      {/* The page title is the destination itself once a roadmap exists, and
          it is rendered inside the hero below. A generic "Your path, one step
          at a time" above it was a second heading saying less than the first. */}
      {!roadmap && !generating && (
        <PageHeader
          eyebrow="My Roadmap"
          title="Your path, one step at a time"
          subtitle="Everything between where you are now and the career you're aiming for."
        />
      )}

      {aiBudget && <AiBudgetNotice {...aiBudget} />}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* Generation replaces the page while it runs, whether or not a roadmap
          is already there. It takes about ten seconds, and a spinner on a
          button for ten seconds reads as a stall — the one moment in this
          section that is genuinely worth watching deserves to be watched. */}
      {generating ? (
        <GeneratingRoadmap />
      ) : roadmap ? (
        <RoadmapDisplay
          data={roadmap}
          goal={goal}
          headerAction={
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={handleGenerateRoadmap}
            >
              Regenerate
            </Button>
          }
          completedPhases={completedPhases}
          onShareBadge={shareBadge}
          badgeBusy={badgeBusy}
          onTogglePhase={handleTogglePhase}
          saving={saving}
        />
      ) : (
        /* No roadmap. Not a failure to report — for most students who see this
           it is simply the first screen of the feature — so it opens with what
           they are about to get rather than with what is missing. */
        <section className="animate-fade-in-up relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-900 to-slate-900 p-6 text-white shadow-float sm:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '22px 22px'
            }}
          />
          <div
            aria-hidden
            className="futurepath-orb pointer-events-none absolute -right-20 -bottom-24 h-64 w-64 rounded-full bg-brand-400/20 blur-3xl"
          />

          <div className="relative max-w-xl">
            <span className="animate-pop-in mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <Compass className="h-6 w-6 text-white" />
            </span>

            <h2 className="text-2xl leading-tight font-black sm:text-3xl">
              Your career journey starts here
            </h2>
            <p className="mt-3 leading-relaxed text-brand-200">
              {goal?.careerGoal
                ? `Tell us to map it and your mentor will lay out every stage between where you are now and ${goal.careerGoal} — the classes, exams, degrees, internships and the first role itself.`
                : 'Tell us where you want to go, and your mentor will map every stage between here and there — the classes, exams, degrees, internships and the first role itself.'}
            </p>

            {/* What the roadmap actually contains, so the button below is a
                known quantity rather than a leap. Each of these is a field the
                generator genuinely fills. */}
            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {[
                'Year-by-year phases from today',
                'The steps inside each one',
                'How you will know a phase is done',
                'Where each route can branch'
              ].map((line) => (
                <li key={line} className="flex items-center gap-2.5 text-sm font-medium text-brand-100">
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-brand-300" />
                  {line}
                </li>
              ))}
            </ul>

            {/* Without a goal there is nothing to generate FROM — the server
                answers /roadmap/generate with a 404 telling the student to
                finish onboarding. So onboarding is the only action offered
                here; generating is what the button becomes once there is
                something to build on. */}
            <div className="mt-8 flex flex-wrap gap-3">
              {goal ? (
                <Button icon={Sparkles} onClick={handleGenerateRoadmap} size="lg">
                  Map my journey
                </Button>
              ) : (
                <Link to="/career/onboarding">
                  <Button icon={Sparkles} size="lg">
                    Start onboarding
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {sharingBadge && (
        <ShareBadgeDialog badge={sharingBadge} onClose={() => setSharingBadge(null)} />
      )}
    </div>
  );
}
