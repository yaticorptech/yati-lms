const Task = require('../models/Task');
const TaskStudy = require('../models/TaskStudy');
const Goal = require('../models/Goal');
const { findVideoForTopic } = require('../services/youtubeService');
const {
  generateTaskStudyFromVideo,
  generateReadingLesson,
  generateVideoSearchQuery
} = require('../services/geminiService');
const { addXP } = require('../services/gamificationService');
const { ensureMinimumQuiz } = require('../services/quizService');
const { completeTask, TASK_XP } = require('../services/taskCompletionService');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');

// Every question must be right. A task is completed by its lesson, so "passed"
// has to mean the student actually understood the material — not that they got
// three of five and guessed the rest.
//
// One threshold, used for the pass banner, the XP award and the completion
// gate alike. Two definitions would produce the state where the quiz says
// "Passed — nice work" in green while the task stubbornly stays open.
//
// Deliberately NOT shared with the skill-level quiz in studyController, which
// is revision rather than a completion gate and keeps its own 60% mark.
const QUIZ_PASS_MARK = 1;
const QUIZ_XP = 20;

// A video counts as watched at 90% rather than 100%: end cards, outros and
// sponsor reads mean the last tenth is rarely the lesson, and demanding the
// final second strands anyone who clicks away a moment early.
const VIDEO_WATCHED_FRACTION = 0.9;

/**
 * The three gates that finish a task on their own: watch, read, pass.
 *
 * A step the lesson does not *have* is treated as already met — some lessons
 * resolve no video, and a couple have no quiz. Requiring a step that cannot
 * exist would strand the task permanently. `allMet` additionally requires at
 * least one real step, so a lesson that generated nothing never silently
 * completes the task it belongs to.
 */
const lessonGates = (study) => {
  const total = study.quiz?.length || 0;

  const needsVideo = !!study.video?.videoId;
  const needsNotes = !!(study.notes?.summary || study.notes?.sections?.length);
  const needsQuiz = total > 0;

  const videoWatched = !needsVideo || !!study.progress?.videoWatched;
  const notesRead = !needsNotes || !!study.progress?.notesRead;
  const quizPassed = !needsQuiz || (study.bestScore || 0) / total >= QUIZ_PASS_MARK;

  const stepCount = [needsVideo, needsNotes, needsQuiz].filter(Boolean).length;

  return {
    needsVideo,
    needsNotes,
    needsQuiz,
    videoWatched,
    notesRead,
    quizPassed,
    passMark: Math.ceil(total * QUIZ_PASS_MARK),
    allMet: stepCount > 0 && videoWatched && notesRead && quizPassed
  };
};

/**
 * Complete the task if — and only if — every applicable gate has been met.
 *
 * Called after any progress change. `completeTask` is idempotent, so the
 * repeated calls this produces cannot double-award XP.
 */
const maybeAutoComplete = async (userId, study) => {
  const gates = lessonGates(study);
  if (!gates.allMet) return { gates, autoCompleted: false, task: null, completionXp: 0 };

  const task = await Task.findOne({ _id: study.taskId, userId });
  const { completed } = await completeTask(userId, task);

  if (completed) {
    study.autoCompletedAt = new Date();
    await study.save();
  }

  // Reported so the browser can show what the completion was actually worth.
  // The quiz already tells the student about its own XP; the task award on top
  // of it was invisible, which made the celebration understate the reward.
  return { gates, autoCompleted: completed, task, completionXp: completed ? TASK_XP : 0 };
};

/**
 * Strip the answer key before sending a lesson to the browser. Grading happens
 * on the server; shipping correctIndex would put every answer in the page source.
 */
const publicView = (study) => {
  const doc = study.toObject ? study.toObject() : study;
  return {
    ...doc,
    quiz: (doc.quiz || []).map((q) => ({
      _id: q._id,
      question: q.question,
      options: q.options
    })),
    gates: lessonGates(study)
  };
};

// @desc    Get the lesson attached to one task
// @route   GET /api/tasks/:id/study
// @access  Private
const getTaskStudy = async (req, res) => {
  try {
    const study = await TaskStudy.findOne({ userId: req.user._id, taskId: req.params.id });

    // Nothing generated yet is a normal state, not an error — the panel shows
    // its "build this lesson" prompt on null.
    if (!study) return res.status(200).json(null);

    // Lessons built before in-page playback existed stored only a search phrase.
    // Resolve a real video for them on read so they start embedding, rather than
    // making the student rebuild every lesson (which would rewrite their notes
    // and quiz, reset their score, and spend a Gemini call for nothing).
    // Never for a reading lesson: the absence of a video there is the point,
    // not a gap to fill in.
    //
    // Attempted whether or not a search phrase was stored. A video lesson with
    // no videoId has no video gate — `lessonGates` cannot require watching
    // something that is not there — so the student completes a lesson meant to
    // teach by video without ever seeing one. That used to be unrecoverable
    // when the phrase was missing too, which is exactly the case where the
    // lookup had failed hardest. The task's own title is a good enough query;
    // it is what the search would have been built from anyway.
    if (study.mode !== 'read' && !study.video?.videoId) {
      try {
        const task = await Task.findOne({ _id: req.params.id, userId: req.user._id }).select('title');
        const query = study.video?.searchQuery || task?.title;
        if (query) {
          const video = await findVideoForTopic(query, task?.title || '');
          if (video) {
            study.video = { ...study.video?.toObject?.() ?? study.video, ...video };
            await study.save();
          }
        }
      } catch (error) {
        console.warn('Could not backfill video for lesson:', error.message);
      }
    }

    res.status(200).json(publicView(study));
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @desc    Build (or rebuild) the video + notes + quiz lesson for one task
// @route   POST /api/tasks/:id/study
// @access  Private
const generateTaskStudy = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const goal = await Goal.findOne({ userId: req.user._id });

    // How the student asked to learn this one. Anything that is not an explicit
    // 'read' stays on the video path, so older clients that send no mode at all
    // behave exactly as they did before.
    const mode = req.body?.mode === 'read' ? 'read' : 'video';

    let searchQuery;
    let video = null;
    let generated;

    if (mode === 'read') {
      // No search, no YouTube call, no quota spent. The written lesson has to
      // teach the topic on its own, so it gets its own prompt rather than the
      // video prompt with the video left out.
      generated = await generateReadingLesson(task, goal);
    } else {
      // Step 1 — turn the task into a searchable topic. A failure here is not
      // worth aborting the lesson for, so fall back to the raw title.
      try {
        searchQuery = await generateVideoSearchQuery(task, goal);
      } catch (error) {
        console.warn('Search-query generation failed, using task title:', error.message);
      }
      if (!searchQuery) searchQuery = task.title;

      // Step 2 — resolve one real, embeddable video. Returns null when no
      // YOUTUBE_API_KEY is set, or when nothing suitable came back; either way
      // the lesson still gets built and the student searches YouTube themselves.
      try {
        video = await findVideoForTopic(searchQuery, task.title);
      } catch (error) {
        // A quota or key problem should cost the video, not the whole lesson.
        console.warn('YouTube lookup failed, falling back to a search link:', error.message);
      }

      // Step 3 — write the notes and quiz, about the video when there is one.
      generated = await generateTaskStudyFromVideo(task, video, goal, searchQuery);
    }

    // Drop questions that cannot be answered, then top the quiz back up to the
    // minimum if the model returned fewer than it was asked for.
    const quiz = await ensureMinimumQuiz(generated.quiz, {
      topic: task.title,
      notes: generated.notes
    });

    const study = await TaskStudy.findOneAndUpdate(
      { userId: req.user._id, taskId: task._id },
      {
        userId: req.user._id,
        taskId: task._id,
        mode,
        // Emptied outright for a reading lesson. Leaving a searchQuery behind
        // would make getTaskStudy try to "backfill" a video onto a lesson the
        // student deliberately chose not to have one for.
        video:
          mode === 'read'
            ? {}
            : {
                videoId: video?.videoId,
                title: video?.title,
                channel: video?.channel,
                thumbnail: video?.thumbnail,
                duration: video?.duration,
                durationSeconds: video?.durationSeconds,
                searchQuery
              },
        notes: generated.notes || {},
        quiz,
        // Rebuilding replaces the video and the questions, so previous scores no
        // longer describe this lesson — and neither does previous watch/read
        // progress, which was against material that no longer exists.
        bestScore: 0,
        attempts: 0,
        lastAttemptAt: null,
        progress: { videoWatched: false, watchedSeconds: 0, notesRead: false },
        autoCompletedAt: null
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(publicView(study));
  } catch (error) {
    console.error('Task study generation error:', error);
    res.status(statusFor(error)).json(aiAwareBody(error, 'Failed to build the lesson.'));
  }
};

// @desc    Submit quiz answers for a task lesson and get graded results
// @route   POST /api/tasks/:id/study/quiz
// @access  Private
const submitTaskQuiz = async (req, res) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: 'answers must be an array.' });
    }

    const study = await TaskStudy.findOne({ userId: req.user._id, taskId: req.params.id });
    if (!study) {
      return res.status(404).json({ message: 'No lesson found for this task.' });
    }
    if (!study.quiz?.length) {
      return res.status(400).json({ message: 'This lesson has no quiz.' });
    }

    const results = study.quiz.map((q, i) => {
      const selected = answers[i];
      return {
        selected: Number.isInteger(selected) ? selected : null,
        correctIndex: q.correctIndex,
        correct: selected === q.correctIndex,
        explanation: q.explanation
      };
    });

    const score = results.filter((r) => r.correct).length;
    const total = study.quiz.length;
    const passed = score / total >= QUIZ_PASS_MARK;

    // First pass only — a quiz already beaten cannot be re-farmed for XP.
    const earnsXp = passed && study.bestScore / total < QUIZ_PASS_MARK;

    study.attempts += 1;
    study.lastAttemptAt = new Date();
    study.bestScore = Math.max(study.bestScore, score);
    await study.save();

    if (earnsXp) {
      const task = await Task.findById(study.taskId);
      await addXP(req.user._id, QUIZ_XP, `passing the quiz for "${task?.title || 'your task'}"`);
    }

    // Passing is usually the last of the three gates, so this is where the task
    // most often finishes itself.
    const { gates, autoCompleted, completionXp } = await maybeAutoComplete(req.user._id, study);

    res.status(200).json({
      score,
      total,
      passed,
      xpAwarded: earnsXp ? QUIZ_XP : 0,
      completionXp,
      bestScore: study.bestScore,
      attempts: study.attempts,
      results,
      gates,
      autoCompleted
    });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @desc    Record that the student watched the video or finished the notes,
//          and complete the task once every gate has been met
// @route   PUT /api/tasks/:id/study/progress
// @access  Private
const updateStudyProgress = async (req, res) => {
  try {
    const { videoWatched, notesRead, watchedSeconds } = req.body;

    const study = await TaskStudy.findOne({ userId: req.user._id, taskId: req.params.id });
    if (!study) return res.status(404).json({ message: 'No lesson found for this task.' });

    if (!study.progress) study.progress = {};

    // Progress only ever moves forwards. The browser reports these, so treating
    // them as a free-form assignment would let a stale tab or a crafted request
    // un-watch a video the student has already finished.
    if (Number.isFinite(watchedSeconds)) {
      study.progress.watchedSeconds = Math.max(
        study.progress.watchedSeconds || 0,
        Math.max(0, Math.floor(watchedSeconds))
      );
    }

    if (videoWatched === true && !study.progress.videoWatched) {
      study.progress.videoWatched = true;
      study.progress.videoWatchedAt = new Date();
    }

    if (notesRead === true && !study.progress.notesRead) {
      study.progress.notesRead = true;
      study.progress.notesReadAt = new Date();
    }

    await study.save();

    const { gates, autoCompleted, task, completionXp } = await maybeAutoComplete(req.user._id, study);

    res.status(200).json({
      progress: study.progress,
      gates,
      autoCompleted,
      completionXp,
      task: autoCompleted ? task : undefined
    });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = {
  getTaskStudy,
  generateTaskStudy,
  submitTaskQuiz,
  updateStudyProgress,
  // Shared with taskController so the planner list can show how far through a
  // lesson each task is without re-deriving the gate rules and drifting from
  // the ones that actually complete the task.
  lessonGates,
  VIDEO_WATCHED_FRACTION
};
