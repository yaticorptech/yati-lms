import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles, RefreshCw, Trophy, MonitorPlay, FileText, HelpCircle, BookOpen, Play, Target, Clock, ArrowRight, ArrowLeft, Languages, Check
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import NotesReader from './NotesReader';
import QuizRunner from './QuizRunner';
import LessonVideo from './LessonVideo';
import LessonSteps from './LessonSteps';
import { QuizMarkArt } from '../ui/PanelArt';
import { useCelebrate } from '../ui/Celebration';
import { useMascot } from '../../mascot/useMascot';

// The languages a video lesson can be in. Names in their own script, so a
// student finds theirs at a glance.
const VIDEO_LANGUAGES = [
  { code: 'en', label: 'English', hint: 'Taught in English' },
  { code: 'hi', label: 'हिंदी', hint: 'Hindi' }
];
const LANGUAGE_NAMES = { en: 'English', hi: 'Hindi' };

/**
 * The lesson for ONE planner task: watch the video, read the notes written about
 * it, then take the quiz drawn from the same material.
 *
 * Deliberately one continuous flow rather than three tabs — the notes and quiz
 * are generated *from* the chosen video, so splitting them apart would hide the
 * fact that they belong together.
 */
export default function TaskStudyPanel({ task, onCompleted, onLessonReady }) {
  const [study, setStudy] = useState(null);
  const [loading, setLoading] = useState(true);
  // Which mode is building, or null. Not a boolean: with two buttons, a shared
  // flag would put the spinner on both.
  const [generating, setGenerating] = useState(null);
  // Opening a task ends the mascot's pointing at it.
  const mascot = useMascot();
  useEffect(() => {
    mascot.taskStarted();
  }, [mascot]);
  const [submitting, setSubmitting] = useState(false);
  // The quiz waits behind a Start button, so a student scrolling past it to
  // the notes is not dropped into question one before they have learnt anything.
  const [quizStarted, setQuizStarted] = useState(false);
  const quizRef = useRef(null);
  const toast = useToast();
  const celebrate = useCelebrate();
  // The language of the current video, so "Different video" keeps it. A video
  // we could not place ('other') is searched again in English.
  const currentLang = study?.video?.language === 'hi' ? 'hi' : 'en';
  // After "Watch a video", the chooser asks which language before building.
  const [choosingLanguage, setChoosingLanguage] = useState(false);

  /** Open the quiz and bring it into view. */
  const startQuiz = useCallback(() => {
    setQuizStarted(true);
    window.requestAnimationFrame(() =>
      quizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  }, []);

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
          xp: (data.xpAwarded || 0) + (data.completionXp || 0),
          // Set only when the quiz was the step that finished the task, so the
          // planner's celebration can show the score alongside the XP.
          score: data.total ? `${data.score} / ${data.total} correct` : undefined
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
   *
   * `replaceVideo` is the "Different video" / "Find another video" path: the
   * server swaps the video and keeps the notes, the quiz and the score, which
   * is what those buttons promise.
   */
  const handleGenerate = async (mode = 'video', lang = 'en', { replaceVideo = false } = {}) => {
    // Which button is busy. A first build names its language, so only the
    // language that was picked shows the spinner.
    setGenerating(mode === 'video' && !study ? `lang-${lang}` : mode);
    try {
      const { data } = await api.post(`/tasks/${task._id}/study`, {
        mode,
        lang,
        ...(replaceVideo ? { replace: 'video' } : {})
      });
      setStudy(data);
      // Any rebuild restarts at least the watch gate server-side, so the
      // completion announcement is due again if the student re-earns it.
      announcedRef.current = false;
      // A full rebuild writes a new quiz. Leaving it open would show the old
      // attempt's state against questions it was never about; a video swap
      // keeps the quiz, so it stays where it was.
      if (!replaceVideo) setQuizStarted(false);
      // The task is gated from now on — the planner drops its manual tick.
      onLessonReady?.(task._id);
      toast.success(
        replaceVideo
          ? 'Here is a different video. Your notes and quiz are unchanged.'
          : mode === 'read'
          ? 'Your notes and quiz are ready.'
          : data?.video?.videoId && lang !== 'en' && data.video.language !== lang
            ? `No ${LANGUAGE_NAMES[lang]} video found for this one, so here is an English one.`
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
      // A pass gets its own moment: the score and the XP, with confetti.
      // Skipped when the quiz was the last gate — the planner's "Task complete"
      // celebration carries the score then, and two pop-ups stacked is the
      // same news twice.
      if (data.passed && !data.autoCompleted) {
        const remaining = [
          data.gates?.needsVideo && !data.gates.videoWatched && 'watch the video',
          data.gates?.needsNotes && !data.gates.notesRead && 'read the notes'
        ].filter(Boolean);
        celebrate({
          kind: 'task',
          icon: Trophy,
          tone: 'amber',
          title: 'You passed the quiz!',
          message:
            data.xpAwarded > 0
              ? remaining.length
                ? `Every answer right. ${remaining.join(' and ').replace(/^./, (c) => c.toUpperCase())} to finish this task.`
                : 'Every answer right — nice work.'
              : 'Every answer right again. You had already earned the XP for this one.',
          score: `${data.score} / ${data.total} correct`,
          xp: data.xpAwarded
        });
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
      <div className="space-y-3 px-4 pb-6 sm:px-6">
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
        <div className="px-4 pb-6 sm:px-6">
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

    // Second step of "Watch a video": which language to watch it in.
    if (choosingLanguage) {
      return (
        <div className="px-4 pb-6 sm:px-6">
          <div className="rounded-xl border border-dashed border-line-300 bg-surface-50/60 p-6">
            <div className="text-center">
              <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Languages className="h-5 w-5" />
              </span>
              <h4 className="font-bold text-ink-900">Which language do you want the video in?</h4>
              <p className="mx-auto mt-1 mb-5 max-w-md text-sm leading-relaxed text-ink-500">
                We&apos;ll find a tutorial in that language. If there isn&apos;t one for this topic,
                you&apos;ll get an English one.
              </p>
            </div>

            <div className="mx-auto grid max-w-md gap-3 sm:grid-cols-2">
              {VIDEO_LANGUAGES.map(({ code, label, hint }) => (
                <button
                  key={code}
                  type="button"
                  disabled={generating !== null}
                  onClick={() => handleGenerate('video', code)}
                  className="group flex flex-col items-center gap-1 rounded-xl border border-line-200 bg-surface px-4 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex items-center gap-1.5 text-lg font-black text-ink-900">
                    {generating === `lang-${code}` && <RefreshCw className="h-4 w-4 animate-spin text-link" />}
                    {label}
                  </span>
                  <span className="text-xs text-ink-500">
                    {generating === `lang-${code}` ? 'Finding your video…' : hint}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4 text-center">
              <button
                type="button"
                disabled={generating !== null}
                onClick={() => setChoosingLanguage(false)}
                className="inline-flex items-center gap-1 text-xs font-bold text-ink-500 hover:text-ink-900 disabled:opacity-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Two ways in, offered as equals. Some students learn from a video and some
    // would rather read; making one of them the default and the other a
    // fallback would be guessing on their behalf.
    return (
      <div className="px-4 pb-6 sm:px-6">
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
              onClick={() => setChoosingLanguage(true)}
              className="group rounded-xl border border-line-200 bg-surface p-4 text-left transition-all hover:border-brand-200 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <MonitorPlay className="h-4.5 w-4.5" />
              </span>
              <span className="block text-sm font-bold text-ink-900">Watch a video</span>
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
    <div className="space-y-7 px-4 pb-6 sm:px-6">
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
              onClick={() => handleGenerate('video', currentLang, { replaceVideo: true })}
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
              loadingText="Finding one…"
              onClick={() => handleGenerate('video', currentLang, { replaceVideo: true })}
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

      {/* 2 — Read: notes written about the video above. Shown whenever the
          server counts them as a gate — a summary OR sections — or a lesson
          with sections but no summary could never be finished. */}
      {(study.notes?.summary || study.notes?.sections?.length > 0) && (
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
        <section ref={quizRef} className="scroll-mt-4 border-t border-line-100 pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h4 className="flex items-center gap-3 text-lg font-black text-ink-900">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-journey-50 text-journey-600 ring-1 ring-journey-100 ring-inset">
                <HelpCircle className="h-5 w-5" strokeWidth={2.2} />
              </span>
              Check you got it
            </h4>
            {/* Before the quiz opens, the start card shows the best score itself. */}
            {quizStarted && study.attempts > 0 && (
              <p className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100 ring-inset">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                Best: {study.bestScore}/{study.quiz.length} over {study.attempts}{' '}
                {study.attempts === 1 ? 'attempt' : 'attempts'}
              </p>
            )}
          </div>
          {quizStarted ? (
            <QuizRunner
              material={study}
              onSubmit={handleSubmitQuiz}
              submitting={submitting}
              requireAllCorrect
            />
          ) : (
            <QuizStartCard
              total={study.quiz.length}
              best={study.bestScore || 0}
              attempts={study.attempts || 0}
              passed={Boolean(study.gates?.quizPassed)}
              onStart={startQuiz}
            />
          )}
        </section>
      )}
    </div>
  );
}

/**
 * The door to the quiz: what it asks of the student, how close they came last
 * time, and one big button. Worded for where they are — a first go, a retry
 * after a near miss, or a retake once it is already passed.
 */
function QuizStartCard({ total, best, attempts, passed, onStart }) {
  const headline = passed
    ? 'Quiz passed!'
    : attempts > 0
      ? best >= total - 1
        ? 'So close! One more go?'
        : 'Ready for another try?'
      : 'Ready to test yourself?';
  const subline = passed
    ? 'Every answer right — this step is done.'
    : attempts > 0
      ? 'Take your time — every answer is explained after you submit.'
      : 'Quick questions on what you just learnt.';
  const cta = attempts > 0 ? 'Try again' : 'Start quiz';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-journey-600 via-indigo-600 to-fuchsia-600 px-5 py-4 text-white shadow-lg shadow-journey-500/25 sm:px-6">
      {/* Soft light and drifting sparkles, behind everything. */}
      <div aria-hidden className="fp-float pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full bg-pink-400/40 blur-3xl" />
      <div aria-hidden className="fp-float-slow pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-sky-400/30 blur-3xl" />
      {[
        ['8%', '18%', '-0.4s', '✨'], ['88%', '14%', '-2.1s', '⭐'], ['78%', '78%', '-1.2s', '✦'], ['14%', '80%', '-3s', '✦']
      ].map(([left, top, delay, glyph]) => (
        <span
          key={`${left}-${top}`}
          aria-hidden
          className="fp-drift-icon pointer-events-none absolute text-xs text-white/80"
          style={{ left, top, animationDelay: delay }}
        >
          {glyph}
        </span>
      ))}

      <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <div className="fp-float relative shrink-0">
          <span aria-hidden className="absolute inset-0 rounded-full bg-white/30 blur-lg" />
          <QuizMarkArt className="relative h-12 w-12 drop-shadow-lg" />
        </div>

        <div className="min-w-0 flex-1">
          <h5 className="text-base font-black tracking-tight sm:text-lg">{headline}</h5>
          <p className="mt-0.5 text-xs text-white/80">{subline}</p>

          <div className="mt-2.5 flex flex-wrap justify-center gap-1.5 sm:justify-start">
            {[
              [HelpCircle, `${total} ${total === 1 ? 'question' : 'questions'}`],
              [Target, 'All correct to finish'],
              [Clock, 'No timer']
            ].map(([Icon, label]) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[0.7rem] font-bold ring-1 ring-white/25 backdrop-blur-sm ring-inset"
              >
                <Icon className="h-3 w-3" />
                {label}
              </span>
            ))}
          </div>

          {attempts > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Trophy className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-xs font-black text-white/90">
                Best {best}/{total}
              </span>
              <span className="flex gap-1" aria-hidden>
                {Array.from({ length: total }, (_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-4 rounded-full ${i < best ? 'bg-amber-300 shadow-sm shadow-amber-300/60' : 'bg-white/25'}`}
                  />
                ))}
              </span>
              <span className="text-xs text-white/70">
                · {attempts} {attempts === 1 ? 'attempt' : 'attempts'}
              </span>
            </div>
          )}
        </div>

        {/* Once passed there is nothing to retake — a done badge instead of a button. */}
        {passed ? (
          <span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white/95 px-4 py-2.5 text-sm font-black text-emerald-700 shadow-lg">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            Passed
          </span>
        ) : (
          <button
            type="button"
            onClick={onStart}
            className="fp-btn fp-glow-violet group inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-journey-700 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-journey-500 to-fuchsia-500 text-white">
              <Play className="h-3 w-3 fill-current" />
            </span>
            {cta}
            <ArrowRight className="fp-btn-arrow h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
