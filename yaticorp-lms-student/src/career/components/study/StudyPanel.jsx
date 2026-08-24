import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Target, RefreshCw, Trophy } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import NotesReader from './NotesReader';
import VideoList from './VideoList';
import QuizRunner from './QuizRunner';

/**
 * Notes, videos, and quiz for the skill the student picks.
 *
 * All three modes share one fetch and one skill selection — they are three
 * views of the same generated pack, not three separate features.
 */
export default function StudyPanel({ mode, skills = [] }) {
  const [materials, setMaterials] = useState([]);
  const [activeSkill, setActiveSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/study');
        setMaterials(data);
      } catch {
        // Nothing generated yet is a normal state, not an error to surface.
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Default to the first tracked skill once skills arrive.
  useEffect(() => {
    if (!activeSkill && skills.length) setActiveSkill(skills[0].skillName);
  }, [skills, activeSkill]);

  const material = useMemo(
    () => materials.find((m) => m.skillName === activeSkill),
    [materials, activeSkill]
  );

  const handleGenerate = async () => {
    if (!activeSkill) return;
    setGenerating(true);
    try {
      const { data } = await api.post('/study/generate', { skillName: activeSkill });
      setMaterials((prev) => [...prev.filter((m) => m.skillName !== activeSkill), data]);
      toast.success(`Notes, videos, and a quiz for ${activeSkill}.`, 'Study pack ready');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not build your study pack.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitQuiz = async (answers) => {
    setSubmitting(true);
    try {
      const { data } = await api.post(`/study/${material._id}/quiz`, { answers });
      setMaterials((prev) =>
        prev.map((m) =>
          m._id === material._id ? { ...m, bestScore: data.bestScore, attempts: data.attempts } : m
        )
      );
      if (data.xpAwarded > 0) {
        toast.success(`You passed and earned ${data.xpAwarded} XP.`, 'Quiz passed');
      }
      return data;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit your answers.');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <div className="space-y-3">
          <div className="skeleton h-5 w-48 rounded" />
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-3/4 rounded" />
        </div>
      </Card>
    );
  }

  // No tracked skills means there is nothing to study yet.
  if (!skills.length) {
    return (
      <Card className="animate-fade-in-up">
        <EmptyState
          icon={Target}
          title="No skills to study yet"
          description="Your skills come from your roadmap. Generate a plan and they'll appear here with notes, videos, and quizzes."
          action={
            <Link to="/career/roadmap">
              <Button size="sm" variant="secondary">Go to Roadmap</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const MODE_LABEL = { notes: 'notes', videos: 'videos', quiz: 'quiz' }[mode];

  return (
    <div className="space-y-5">
      {/* Skill selector — shared across all three modes. */}
      <div className="flex flex-wrap items-center gap-2">
        {skills.map((skill) => {
          const has = materials.some((m) => m.skillName === skill.skillName);
          const active = skill.skillName === activeSkill;
          return (
            <button
              key={skill._id || skill.skillName}
              type="button"
              onClick={() => setActiveSkill(skill.skillName)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                  : 'border-line-200 bg-surface text-ink-600 hover:border-brand-300 hover:text-link-strong'
              }`}
            >
              {skill.skillName}
              {has && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-surface/70' : 'bg-emerald-500'}`}
                  title="Study pack ready"
                />
              )}
            </button>
          );
        })}
      </div>

      <Card className="animate-fade-in-up">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-ink-900">
              {activeSkill} — {MODE_LABEL}
            </h3>
            {material && mode === 'quiz' && material.attempts > 0 && (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-500">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                Best: {material.bestScore}/{material.quiz.length} over {material.attempts}{' '}
                {material.attempts === 1 ? 'attempt' : 'attempts'}
              </p>
            )}
          </div>

          {material && (
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              loading={generating}
              loadingText="Rebuilding…"
              onClick={handleGenerate}
            >
              Regenerate
            </Button>
          )}
        </div>

        {!material ? (
          <EmptyState
            icon={Sparkles}
            title={`No study pack for ${activeSkill} yet`}
            description="Your AI mentor will write revision notes, suggest videos worth watching, and set a 5-question quiz for this skill."
            action={
              <Button
                icon={Sparkles}
                loading={generating}
                loadingText="Building your pack…"
                onClick={handleGenerate}
              >
                Build study pack
              </Button>
            }
          />
        ) : (
          <>
            {mode === 'notes' && <NotesReader notes={material.notes} />}
            {mode === 'videos' && <VideoList videos={material.videos} />}
            {mode === 'quiz' && (
              <QuizRunner material={material} onSubmit={handleSubmitQuiz} submitting={submitting} />
            )}
          </>
        )}
      </Card>
    </div>
  );
}
