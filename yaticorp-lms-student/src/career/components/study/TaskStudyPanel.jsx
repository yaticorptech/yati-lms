import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles, RefreshCw, Trophy, MonitorPlay, FileText, HelpCircle, BookOpen
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import NotesReader from './NotesReader';
import QuizRunner from './QuizRunner';
import LessonVideo from './LessonVideo';
import LessonSteps from './LessonSteps';

/**
 * The lesson for ONE planner task: watch the video, read the notes written about
 * it, then take the quiz drawn from the same material.
 *
 * Deliberately one continuous flow rather than three tabs — the notes and quiz
 * are generated *from* the chosen video, so splitting them apart would hide the
 * fact that they belong together.
 */
export default function TaskStudyPanel({ task, onCompleted, onLessonReady }) {
  // A task has been opened: the mascot gives a small confident gesture.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('mascot:task-start'));
  }, []);

  const [study, setStudy] = useState(null);
  const [loading, setLoading] = useState(true);
  // Which mode is building, or null. Not a boolean: with two buttons, a shared
  // flag would put the spinner on both.
  const [generating, setGenerating] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  // Guards the completion toast, so a re-render or a second gate landing in the
  // same moment cannot announce the same finish twice.
  const announcedRef = useRef(false);

  /**
   * Fold a gates/autoCompleted response from any of the three steps back into
   * local state, and tell the planner when the task finished itself.
   */
  const applyOutcome = useCallback(
    (data) => {
      if (!data) return;
      if (data.gates) setStudy((prev) => (prev ? { ...prev, gates: data.gates } : prev));
      if (data.progress) setStudy((prev) => (prev ? { ...prev, progress: data.progress } : prev));

      if (data.autoCompleted && !announcedRef.current) {
        announcedRef.current = true;
        // The planner announces this, not the panel. It is the only side that
        // knows whether this was one task among several or the last one of the
        // day — and those deserve different celebrations, not two stacked on
        // top of each other.
        //
        // The quiz XP and the completion XP are separate awards; reporting only
        // one of them would understate what the work was worth.
        onCompleted?.(data.task || { ...task, status: 'Completed' }, {
          xp: (data.xpAwarded || 0) + (data.completionXp || 0)
        });
      }
    },
    [onCompleted, task]
  );

  /** Report a watch/read gate. The server decides whether that finishes the task. */
  const reportProgress = useCallback(
    async (body) => {
      try {
        const { data } = await api.put(`/tasks/${task._id}/study/progress`, body);
        applyOutcome(data);
      } catch {
        // A dropped progress ping is recoverable — the gate is re-reported on
        // the next watch or read, so this must not interrupt the lesson.
      }
    },
    [applyOutcome, task._id]
  );

  const handleVideoWatched = useCallback(
    (watchedSeconds) => reportProgress({ videoWatched: true, watchedSeconds }),
    [reportProgress]
  );

  const handleNotesRead = useCallback(() => reportProgress({ notesRead: true }), [reportProgress]);

  // Lessons are cached server-side, so an already-built one loads instantly on
  // every re-expand without spending quota.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api
      .get(`/tasks/${task._id}/study`)
      .then(({ data }) => {
        if (cancelled) return;
        setStudy(data);
        // Tell the planner this task is gated by a lesson, so it drops the
        // manual tick even if the list was fetched before the lesson existed.
        if (data) onLessonReady?.(task._id);
      })
      .catch(() => {
        if (!cancelled) setStudy(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // Keyed on the task alone. `onLessonReady` is a fresh function on every
    // planner render, so including it would refetch the lesson continuously.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task._id]);

  /**
   * Build the lesson.
   *
   * `mode` is passed explicitly at every call site rather than defaulted from a
   * click handler — an earlier version of this panel wired a handler straight
   * to onClick and posted the click event as its argument.
   */
  const handleGenerate = async (mode = 'video') => {
    setGenerating(mode);
    try {
      const { data } = await api.post(`/tasks/${task._id}/study`, { mode });
      setStudy(data);
      // A rebuilt lesson clears its watch/read progress server-side, so the
      // completion announcement is due again if the student re-earns it.
      announcedRef.current = false;
      // The task is gated from now on — the planner drops its manual tick.
      onLessonReady?.(task._id);
      toast.success(
        mode === 'read'
          ? 'Your notes and quiz are ready.'
          : 'Video, notes and quiz are ready.',
        'Lesson built'
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not build this lesson.');
    } finally {
      setGenerating(null);
    }
  };

  const handleSubmitQuiz = async (answers) => {
    setSubmitting(true);
    try {
      const { data } = await api.post(`/tasks/${task._id}/study/quiz`, { answers });
      setStudy((prev) =>
        prev ? { ...prev, bestScore: data.bestScore, attempts: data.attempts } : prev
      );
      // Skipped when the quiz was the last gate: the celebration below already
      // announces the pass and the XP, and a toast on top of it is just the
      // same news twice.
      if (data.xpAwarded > 0 && !data.autoCompleted) {
        toast.success(`You passed and earned ${data.xpAwarded} XP.`, 'Quiz passed');
      }
      // Passing is usually the last gate, so this is where the task most often
      // completes itself.
      applyOutcome(data);
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
      <div className="space-y-3 px-6 pb-6">
        <div className="skeleton aspect-video w-full rounded-xl" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-4 w-1/2 rounded" />
      </div>
    );
  }

  if (!study) {
    // Some tasks do not want a video. The generator decides that per task —
    // "learn what a JOIN is" wants one, "run the migration you wrote yesterday"
    // does not — and offering to find a tutorial for the second kind sends the
    // student off to watch something they do not need.
    if (task.learning === 'read') {
      return (
        <div className="px-6 pb-6">
          <div className="rounded-xl border border-dashed border-line-300 bg-surface-50/60 p-6 text-center">
            <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-link">
              <BookOpen className="h-5 w-5" />
            </span>
            <h4 className="font-bold text-ink-900">A short written lesson</h4>
            <p className="mx-auto mt-1 mb-4 max-w-md text-sm leading-relaxed text-ink-500">
              This one does not need a video. You&apos;ll get an explanation with worked examples,
              then a 5-question quiz.
            </p>
            <Button
              icon={BookOpen}
              loading={generating === 'read'}
              loadingText="Writing your lesson…"
              onClick={() => handleGenerate('read')}
            >
              Build this lesson
            </Button>
          </div>
        </div>
      );
    }

    // Two ways in, offered as equals. Some students learn from a video and some
    // would rather read; making one of them the default and the other a
    // fallback would be guessing on their behalf.
    return (
      <div className="px-6 pb-6">
        <div className="rounded-xl border border-dashed border-line-300 bg-surface-50/60 p-6">
          <div className="text-center">
            <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-link">
              <Sparkles className="h-5 w-5" />
            </span>
            <h4 className="font-bold text-ink-900">How do you want to learn this?</h4>
            <p className="mx-auto mt-1 mb-5 max-w-md text-sm leading-relaxed text-ink-500">
              Either way you finish with revision notes and a 5-question quiz.
            </p>
          </div>

          <div className="mx-auto grid max-w-lg gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={generating !== null}
              onClick={() => handleGenerate('video')}
              className="group rounded-xl border border-line-200 bg-surface p-4 text-left transition-all hover:border-brand-200 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <MonitorPlay className="h-4.5 w-4.5" />
              </span>
              <span className="block text-sm font-bold text-ink-900">
                {generating === 'video' ? 'Finding your video…' : 'Watch a video'}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                A YouTube tutorial for this exact task, with notes written about it.
              </span>
            </button>

            <button
              type="button"
              disabled={generating !== null}
              onClick={() => handleGenerate('read')}
              className="group rounded-xl border border-line-200 bg-surface p-4 text-left transition-all hover:border-brand-200 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-link">
                <BookOpen className="h-4.5 w-4.5" />
              </span>
              <span className="block text-sm font-bold text-ink-900">
                {generating === 'read' ? 'Writing your lesson…' : 'Just read it'}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                A written lesson with worked examples — no video to sit through.
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { video } = study;
  // A reading lesson has no video by design. Without this the "no playable
  // video found" card below would fire on every one of them, apologising for
  // the absence of something the student chose not to have.
  const isReading = study.mode === 'read';

  return (
    <div className="space-y-7 px-6 pb-6">
      {/* What the automatic completion is waiting on. */}
      <LessonSteps gates={study.gates} completed={task.status === 'Completed'} />

      {/* 1 — Watch. A resolved video embeds; otherwise the student searches
          YouTube themselves, which needs no API key. */}
      {/* No video could be resolved — rare. Offer another attempt in place
          rather than a link off-site; the notes and quiz below still stand. */}
      {!isReading && video && !video.videoId && (
        <section>
          <h4 className="mb-3 flex items-center gap-2 font-bold text-ink-900">
            <MonitorPlay className="h-4 w-4 text-ink-400" />
            Watch
          </h4>

          <div className="rounded-xl border border-dashed border-line-300 bg-surface-50/60 p-5 text-center">
            <p className="font-semibold text-ink-900">No playable video found</p>
            <p className="mx-auto mt-1 mb-4 max-w-md text-sm leading-relaxed text-ink-500">
              We couldn&apos;t find one that allows playback here. Try again for a different pick —
              your notes and quiz below are unaffected.
            </p>
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              loading={generating === 'video'}
              loadingText="Looking…"
              onClick={() => handleGenerate('video')}
            >
              Find another video
            </Button>
          </div>
        </section>
      )}

      {video?.videoId && (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h4 className="flex items-center gap-3 text-lg font-black text-ink-900">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 ring-inset">
                <MonitorPlay className="h-5 w-5" strokeWidth={2.2} />
              </span>
              Watch
            </h4>
            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              loading={generating === 'video'}
              loadingText="Rebuilding…"
              onClick={() => handleGenerate('video')}
            >
              Different video
            </Button>
          </div>

          {/* Played through the IFrame API so the watch gate is measured
              rather than assumed. Title and channel only — no "open on
              YouTube" link, which would drop the student into a
              recommendation feed instead of their notes. */}
          <LessonVideo
            video={video}
            watched={study.gates?.videoWatched}
            onWatched={handleVideoWatched}
          />
        </section>
      )}

      {/* 2 — Read: notes written about the video above */}
      {study.notes?.summary && (
        <section className={isReading ? '' : 'border-t border-line-100 pt-6'}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h4 className="flex items-center gap-3 text-lg font-black text-ink-900">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-link ring-1 ring-brand-100 ring-inset">
                <FileText className="h-5 w-5" strokeWidth={2.2} />
              </span>
              {isReading ? 'Your lesson' : video?.videoId ? 'Notes from this video' : 'Notes'}
            </h4>
          </div>
          <NotesReader
            notes={study.notes}
            read={study.gates?.notesRead}
            onRead={handleNotesRead}
          />
        </section>
      )}

      {/* 3 — Test: questions drawn from the same material */}
      {study.quiz?.length > 0 && (
        <section className="border-t border-line-100 pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h4 className="flex items-center gap-3 text-lg font-black text-ink-900">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-journey-50 text-journey-600 ring-1 ring-journey-100 ring-inset">
                <HelpCircle className="h-5 w-5" strokeWidth={2.2} />
              </span>
              Check you got it
            </h4>
            {study.attempts > 0 && (
              <p className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100 ring-inset">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                Best: {study.bestScore}/{study.quiz.length} over {study.attempts}{' '}
                {study.attempts === 1 ? 'attempt' : 'attempts'}
              </p>
            )}
          </div>
          <QuizRunner
            material={study}
            onSubmit={handleSubmitQuiz}
            submitting={submitting}
            requireAllCorrect
          />
        </section>
      )}
    </div>
  );
}
