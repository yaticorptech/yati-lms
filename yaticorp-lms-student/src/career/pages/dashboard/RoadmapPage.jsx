import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Route, Sparkles, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import RoadmapDisplay from '../../components/RoadmapDisplay';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { SkeletonPage } from '../../components/ui/Skeleton';
import ShareBadgeDialog from '../../components/roadmap/ShareBadgeDialog';
import AiBudgetNotice from '../../components/AiBudgetNotice';
import { readAiBudgetError } from '../../utils/aiBudget';

export default function RoadmapPage() {
  const [roadmap, setRoadmap] = useState(null);
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
        const { data } = await api.get('/roadmap');
        setRoadmap(data.roadmapData);
        setCompletedPhases(data.completedPhases || []);
      } catch {
        // 404 simply means nothing generated yet — the empty state handles it.
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

  if (loading) return <SkeletonPage cards={3} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Roadmap"
        title="Your path, one step at a time"
        subtitle="Everything between where you are now and the career you're aiming for."
        action={
          roadmap && (
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              loading={generating}
              loadingText="Regenerating…"
              onClick={handleGenerateRoadmap}
            >
              Regenerate
            </Button>
          )
        }
      />

      {aiBudget && <AiBudgetNotice {...aiBudget} />}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {roadmap ? (
        <RoadmapDisplay
          data={roadmap}
          completedPhases={completedPhases}
          onShareBadge={shareBadge}
          badgeBusy={badgeBusy}
          onTogglePhase={handleTogglePhase}
          saving={saving}
        />
      ) : (
        <Card className="animate-fade-in-up text-center">
          <div className="mx-auto flex max-w-md flex-col items-center py-10">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-link">
              <Route className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-ink-900">No roadmap yet</h2>
            <p className="mt-2 leading-relaxed text-ink-500">
              Tell us your goal and current stage, and your AI mentor will map every step
              between here and there — the subjects, exams, degrees, and internships.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/career/onboarding">
                <Button variant="secondary">Start onboarding</Button>
              </Link>
              <Button
                icon={Sparkles}
                loading={generating}
                loadingText="Building your roadmap…"
                onClick={handleGenerateRoadmap}
              >
                Generate AI roadmap
              </Button>
            </div>
            {generating && (
              <p className="mt-4 text-xs text-ink-400">
                This usually takes about 10 seconds.
              </p>
            )}
          </div>
        </Card>
      )}

      {sharingBadge && (
        <ShareBadgeDialog badge={sharingBadge} onClose={() => setSharingBadge(null)} />
      )}
    </div>
  );
}
