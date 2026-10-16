const Task = require('../models/Task');
const TaskStudy = require('../models/TaskStudy');
const Goal = require('../models/Goal');
const { findVideoForTopic } = require('../services/youtubeService');
const {
  generateTaskStudyFromVideo,
  generateReadingLesson,
  generateVideoSearchQuery,
  chooseVideoForTask
} = require('../services/geminiService');
const { addXP } = require('../services/gamificationService');
const { ensureMinimumQuiz } = require('../services/quizService');
const { completeTask } = require('../services/taskCompletionService');
// Both amounts are the admin's rules: 'career_task_quiz' and 'career_task'.
const { xpFor } = require('../../rewards/services/configService');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');
const { toISODate } = require('../services/dailyPlanService');
const { hasFullAccess } = require('../../services/fullAccess');
const { safeRecordActivity } = require('../../rewards/services/activityService');

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

// The demo cards (services/fullAccess.js) pass with one right answer — the
// account owner's rule, 2026-10-09, for the cards used to show the product.
const DEMO_QUIZ_PASS_SCORE = 1;

/** How many right answers pass a lesson quiz of `total` questions, for this student. */
const passMarkFor = (total, user) => (total > 0 && hasFullAccess(user)
  ? Math.min(DEMO_QUIZ_PASS_SCORE, total)
  : Math.ceil(total * QUIZ_PASS_MARK));

// A video counts as watched at 90% rather than 100%: end cards, outros and
// sponsor reads mean the last tenth is rarely the lesson, and demanding the
// final second strands anyone who clicks away a moment early.
const VIDEO_WATCHED_FRACTION = 0.9;

/**
 * Whether `seconds` of distinct playback is enough to call this video watched.
 *
 * The browser counts the seconds it saw play (LessonVideo), against the
 * player's own idea of the length; the stored length comes from the YouTube
 * Data API and can differ from it by a few seconds, so the bar here sits a
 * little under 90% — 5% of the video or ten seconds, whichever is more. A
 * video whose length was never stored cannot be measured against, and is
 * taken on trust as before.
 */
const watchedEnough = (seconds, durationSeconds) => {
  const length = Number(durationSeconds) || 0;
  if (length <= 0) return true;
  const slack = Math.max(10, Math.round(length * 0.05));
  return (Number(seconds) || 0) >= Math.floor(length * VIDEO_WATCHED_FRACTION) - slack;
};

/**
 * The three gates that finish a task on their own: watch, read, pass.
 *
 * A step the lesson does not *have* is treated as already met — some lessons
 * resolve no video, and a couple have no quiz. Requiring a step that cannot
 * exist would strand the task permanently. `allMet` additionally requires at
 * least one real step, so a lesson that generated nothing never silently
 * completes the task it belongs to.
 *
 * `user` is the student the lesson belongs to: it sets the quiz's pass mark
 * (see passMarkFor). Without one, the usual mark — every answer.
 */
const lessonGates = (study, user) => {
  const total = study.quiz?.length || 0;
  const passMark = passMarkFor(total, user);

  const needsVideo = !!study.video?.videoId;
  const needsNotes = !!(study.notes?.summary || study.notes?.sections?.length);
  const needsQuiz = total > 0;

  const videoWatched = !needsVideo || !!study.progress?.videoWatched;
  const notesRead = !needsNotes || !!study.progress?.notesRead;
  const quizPassed = !needsQuiz || (study.bestScore || 0) >= passMark;

  const stepCount = [needsVideo, needsNotes, needsQuiz].filter(Boolean).length;

  return {
    needsVideo,
    needsNotes,
    needsQuiz,
    videoWatched,
    notesRead,
    quizPassed,
    passMark,
    allMet: stepCount > 0 && videoWatched && notesRead && quizPassed
  };
};

/**
 * Complete the task if — and only if — every applicable gate has been met.
 *
 * Called after any progress change, and whenever a lesson is opened.
 * `completeTask` is idempotent, so the repeated calls this produces cannot
 * double-award XP.
 *
 * The gates are judged on the lesson as it is stored NOW, read again here,
 * not on the copy the caller loaded before its own write. Two requests landing
 * together — "video watched" and "notes read" in the same second — each used
 * to check its own in-memory copy, in which only its own gate was met, and
 * the task stayed open with every gate passed. Whichever request writes last
 * now sees both.
 */
const maybeAutoComplete = async (user, loaded) => {
  const study = (loaded?._id && (await TaskStudy.findById(loaded._id))) || loaded;
  const gates = lessonGates(study, user);
  if (!gates.allMet) return { gates, autoCompleted: false, task: null, completionXp: 0, study };

  const found = await Task.findOne({ _id: study.taskId, userId: user._id });
  const { completed, xp, task } = await completeTask(user._id, found);

  if (completed) {
    // One field, written on its own, so this never overwrites a progress
    // change another request saved in the meantime.
    const at = new Date();
    await TaskStudy.updateOne({ _id: study._id }, { $set: { autoCompletedAt: at } });
    study.autoCompletedAt = at;
  }

  // Reported so the browser can show what the completion was actually worth.
  // The quiz already tells the student about its own XP; the task award on top
  // of it was invisible, which made the celebration understate the reward.
  //
  // What the ledger actually paid, not the rule: a task reopened and finished
  // again completes without being credited a second time, and reporting the
  // rule then celebrated XP the student never received.
  return { gates, autoCompleted: completed, task: task || found, completionXp: completed ? xp || 0 : 0, study };
};

/**
 * The demo cards' lesson videos come watched (the account owner's rule,
 * 2026-10-09).
 *
 * The ten cards in services/fullAccess.js are used to show the product, so
 * whenever one of them opens or builds a task's lesson, the video counts as
 * watched to its last second: the watch bar reads 100%, and nothing waits on
 * the student sitting through it — or stops them skipping about in it. Every
 * day, on any computer. Read and Quiz stay theirs to do: the task completes
 * the usual way, once the notes are read and the quiz passed by hand. Every
 * other account is untouched.
 *
 * The watch pays what it pays any student, under the same once-only ledger
 * key: opening the lesson again pays nothing twice. Never throws — a problem
 * here must not cost the card its lesson.
 */
const watchForDemoCard = async (user, study) => {
  if (!study || !hasFullAccess(user)) return null;
  try {
    const gates = lessonGates(study, user);
    let changed = false;

    if (gates.needsVideo) {
      if (!study.progress?.videoWatched) {
        study.set('progress.videoWatched', true);
        study.set('progress.videoWatchedAt', new Date());
        changed = true;
        // What PUT /study/progress pays for a watched video (see taskRoutes).
        if (await xpFor('task_video_watched')) {
          await safeRecordActivity({ userId: user._id, type: 'task_video_watched', refId: `video:${study.taskId}` });
        }
      }
      const full = Number(study.video?.durationSeconds) || 0;
      if (full > (study.progress?.watchedSeconds || 0)) {
        study.set('progress.watchedSeconds', full);
        changed = true;
      }
    }

    if (changed) await study.save();
    // The video may have been the last step left — notes read and quiz passed
    // before a "Different video" swap, or a lesson that has nothing else.
    return await maybeAutoComplete(user, study);
  } catch (error) {
    console.error('Could not mark a demo card video watched:', error.message);
    return null;
  }
};

/**
 * What a lesson response adds when the watched video just completed the task,
 * in the shape the progress and quiz answers use, so the planner marks the
 * task done and celebrates it once.
 */
const completionFields = (outcome) => (outcome?.autoCompleted
  ? { autoCompleted: true, task: outcome.task, completionXp: outcome.completionXp }
  : {});

/**
 * Strip the answer key before sending a lesson to the browser. Grading happens
 * on the server; shipping correctIndex would put every answer in the page source.
 */
const publicView = (study, user) => {
  const doc = study.toObject ? study.toObject() : study;
  return {
    ...doc,
    quiz: (doc.quiz || []).map((q) => ({
      _id: q._id,
      question: q.question,
      options: q.options
    })),
    gates: lessonGates(study, user)
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
    //
    // At most once a platform day per lesson, though. A topic with no
    // embeddable video stays that way between opens, and searching again on
    // every expand spent YouTube quota (100 units a search) to learn nothing.
    const lastLookup = study.video?.lookupAttemptedAt;
    const lookedUpToday = lastLookup && toISODate(lastLookup) === toISODate(new Date());
    if (study.mode !== 'read' && !study.video?.videoId && !lookedUpToday) {
      try {
        // Stamped before the search, so a failure (quota, network) counts as
        // today's attempt too rather than being retried on the next open.
        study.set('video.lookupAttemptedAt', new Date());
        await study.save();
        const task = await Task.findOne({ _id: req.params.id, userId: req.user._id }).select('title');
        const query = study.video?.searchQuery || task?.title;
        if (query) {
          const video = await findVideoForTopic(query, task?.title || '', { lang: study.video?.language === 'hi' ? 'hi' : 'en' });
          if (video) {
            study.video = { ...study.video?.toObject?.() ?? study.video, ...video };
            await study.save();
          }
        }
      } catch (error) {
        console.warn('Could not backfill video for lesson:', error.message);
      }
    }

    // Opening a lesson also finishes a task whose gates are all met but which
    // never completed — the state two racing progress reports used to leave
    // behind (see maybeAutoComplete). A no-op for everything else.
    const outcome = (await watchForDemoCard(req.user, study)) || (await maybeAutoComplete(req.user, study));
    res.status(200).json({ ...publicView(outcome?.study || study, req.user), ...completionFields(outcome) });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

/**
 * A lesson already exists for this task and the request did not ask to
 * replace it.
 *
 * A full build writes a new video, new notes and a new quiz, and resets the
 * best score, the attempts and the watch/read progress. The planner used to
 * reach it by accident: a lesson that failed to LOAD left the panel showing
 * its "How do you want to learn this?" chooser, and choosing rebuilt — and
 * charged for — a lesson the student already had, throwing their progress
 * away. Replacing one is now explicit: `rebuild: true`, or `replace: 'video'`
 * for the video swap. Anything else is answered with the lesson that is
 * there, so the panel can simply show it.
 */
const LESSON_EXISTS = 'LESSON_EXISTS';

const wantsLessonRebuild = (req) => req.body?.rebuild === true || req.body?.replace === 'video';

const refuseExistingLesson = (res, study, user) =>
  res.status(409).json({
    code: LESSON_EXISTS,
    message: 'This task already has its lesson.',
    lesson: publicView(study, user)
  });

/**
 * Mounted before the wallet charge as well as checked inside the controller,
 * so a refused rebuild is never priced — not even charged and refunded.
 */
const refuseLessonOverwrite = async (req, res, next) => {
  try {
    if (!wantsLessonRebuild(req)) {
      const existing = await TaskStudy.findOne({ userId: req.user._id, taskId: req.params.id });
      if (existing) return refuseExistingLesson(res, existing, req.user);
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Replace a lesson's video and nothing else.
 *
 * Notes, quiz, best score, attempts and the notes-read gate all stay: the
 * buttons that land here say so, and resetting them meant a student who had
 * already passed the quiz had to pass it again because they did not like the
 * video — while the reset bestScore re-opened the quiz XP for every swap. Only
 * the watch gate restarts, since it was measured against the old video.
 *
 * No new video found is a 404 (so the wallet charge is refunded) and the
 * lesson is left exactly as it was — swapping a working video for nothing is
 * worse than keeping it.
 */
const swapVideoOnly = async (req, res, { task, goal, study, lang }) => {
  let searchQuery = study.video?.searchQuery;
  if (!searchQuery) {
    try {
      searchQuery = await generateVideoSearchQuery(task, goal);
    } catch (error) {
      console.warn('Search-query generation failed, using task title:', error.message);
    }
  }
  if (!searchQuery) searchQuery = task.title;

  let video = null;
  try {
    video = await findVideoForTopic(searchQuery, task.title, {
      lang,
      exclude: [study.video?.videoId],
      budget: task.duration,
      choose: (shortlist) => chooseVideoForTask(task, goal, shortlist, lang === 'hi' ? 'Hindi' : 'English')
    });
  } catch (error) {
    console.warn('YouTube lookup failed during a video swap:', error.message);
  }

  if (!video?.videoId) {
    return res.status(404).json({
      message: study.video?.videoId
        ? 'No other video found for this one — your current video stays.'
        : 'Still no playable video for this one. Your notes and quiz are unaffected.'
    });
  }

  study.video = {
    videoId: video.videoId,
    title: video.title,
    channel: video.channel,
    thumbnail: video.thumbnail,
    duration: video.duration,
    durationSeconds: video.durationSeconds,
    searchQuery,
    language: video.language || lang
  };
  study.set('progress.videoWatched', false);
  study.set('progress.videoWatchedAt', undefined);
  study.set('progress.watchedSeconds', 0);
  await study.save();

  const outcome = await watchForDemoCard(req.user, study);
  return res.status(201).json({ ...publicView(study, req.user), ...completionFields(outcome) });
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

    // Never a silent rebuild over a lesson the student already has (see
    // refuseLessonOverwrite, which also runs before the charge).
    if (!wantsLessonRebuild(req)) {
      const existing = await TaskStudy.findOne({ userId: req.user._id, taskId: task._id });
      if (existing) return refuseExistingLesson(res, existing, req.user);
    }

    const goal = await Goal.findOne({ userId: req.user._id });

    // How the student asked to learn this one. Anything that is not an explicit
    // 'read' stays on the video path, so older clients that send no mode at all
    // behave exactly as they did before.
    const mode = req.body?.mode === 'read' ? 'read' : 'video';
    // The video's language: English or Hindi, as the student chose.
    const lang = req.body?.lang === 'hi' ? 'hi' : 'en';

    // "Different video" / "Find another video" promise the notes and quiz are
    // unaffected, so they swap the video and nothing else. Only honoured on a
    // video lesson that already has notes or a quiz to keep; otherwise there
    // is nothing to preserve and the full build below runs.
    if (mode === 'video' && req.body?.replace === 'video') {
      const current = await TaskStudy.findOne({ userId: req.user._id, taskId: task._id });
      const hasMaterial = current && (current.quiz?.length || current.notes?.summary || current.notes?.sections?.length);
      if (current && current.mode !== 'read' && hasMaterial) {
        return swapVideoOnly(req, res, { task, goal, study: current, lang });
      }
    }

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
        // The previous video is skipped, so "Different video" means a
        // different one. The chooser reads the top of the search against the
        // whole task; if it is out of allowance or fails, the ranking stands.
        const previous = await TaskStudy.findOne({ userId: req.user._id, taskId: task._id }).select('video.videoId').lean();
        video = await findVideoForTopic(searchQuery, task.title, {
          lang,
          exclude: [previous?.video?.videoId],
          budget: task.duration,
          choose: (shortlist) => chooseVideoForTask(task, goal, shortlist, lang === 'hi' ? 'Hindi' : 'English')
        });
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
                searchQuery,
                language: video?.language || lang
              },
        notes: generated.notes || {},
        quiz,
        // Rebuilding replaces the video and the questions, so previous scores no
        // longer describe this lesson — and neither does previous watch/read
        // progress, which was against material that no longer exists. The
        // quiz XP does not come back with it: that is keyed on the task in
        // the ledger (see submitTaskQuiz), so a rebuild cannot re-farm it.
        bestScore: 0,
        attempts: 0,
        lastAttemptAt: null,
        progress: { videoWatched: false, watchedSeconds: 0, notesRead: false },
        autoCompletedAt: null
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const outcome = await watchForDemoCard(req.user, study);
    res.status(201).json({ ...publicView(study, req.user), ...completionFields(outcome) });
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
    // Every answer, or one for a demo card (see passMarkFor).
    const passMark = passMarkFor(total, req.user);
    const passed = score >= passMark;

    // One atomic write, answered with the lesson as it was before it. A
    // read-modify-save here raced the progress route: whichever saved second
    // could carry a stale copy of the other's change. The earlier score also
    // decides the XP — first pass only, so a quiz already beaten cannot be
    // re-farmed — and two passes landing together see each other.
    const before = await TaskStudy.findOneAndUpdate(
      { _id: study._id },
      { $inc: { attempts: 1 }, $set: { lastAttemptAt: new Date() }, $max: { bestScore: score } },
      { returnDocument: 'before' }
    );
    const earnsXp = passed && (before?.bestScore || 0) < passMark;

    // Once per task, ever. bestScore says whether THIS quiz was passed before,
    // but a full rebuild writes a new quiz and zeroes it — so the ledger key is
    // the task, and a second pass after a rebuild comes back as a duplicate
    // and reports 0 rather than paying again.
    const quizRule = earnsXp ? await xpFor('career_task_quiz') : 0;
    let quizXp = 0;
    if (quizRule > 0) {
      const task = await Task.findById(study.taskId);
      quizXp = await addXP(req.user._id, quizRule, `passing the quiz for "${task?.title || 'your task'}"`, {
        refId: `taskquiz:${study.taskId}`
      });
    }

    // Passing is usually the last of the three gates, so this is where the task
    // most often finishes itself.
    const { gates, autoCompleted, completionXp, study: now } = await maybeAutoComplete(req.user, study);

    res.status(200).json({
      score,
      total,
      passed,
      xpAwarded: quizXp,
      completionXp,
      bestScore: now?.bestScore ?? Math.max(before?.bestScore || 0, score),
      attempts: now?.attempts ?? (before?.attempts || 0) + 1,
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

    const current = await TaskStudy.findOne({ userId: req.user._id, taskId: req.params.id })
      .select('video.durationSeconds progress');
    if (!current) return res.status(404).json({ message: 'No lesson found for this task.' });

    const length = Number(current.video?.durationSeconds) || 0;
    const set = {};
    const max = {};

    // Progress only ever moves forwards ($max, and flags only ever set to
    // true). The browser reports these, so treating them as a free-form
    // assignment would let a stale tab or a crafted request un-watch a video
    // the student has already finished. Seconds are capped at the video's
    // length: a request cannot claim more of it than there is.
    if (Number.isFinite(watchedSeconds)) {
      let seconds = Math.max(0, Math.floor(watchedSeconds));
      if (length > 0) seconds = Math.min(seconds, Math.ceil(length));
      max['progress.watchedSeconds'] = seconds;
    }

    // "Watched" is checked against the seconds actually seen, not taken on
    // the request's word. It used to be: `videoWatched: true` on its own
    // passed the gate (and paid the watch XP) without a second of the video
    // having played.
    const seen = Math.max(current.progress?.watchedSeconds || 0, max['progress.watchedSeconds'] || 0);
    const videoRefused = videoWatched === true && !current.progress?.videoWatched && !watchedEnough(seen, length);
    if (videoWatched === true && !current.progress?.videoWatched && !videoRefused) {
      set['progress.videoWatched'] = true;
      set['progress.videoWatchedAt'] = new Date();
    }

    if (notesRead === true && !current.progress?.notesRead) {
      set['progress.notesRead'] = true;
      set['progress.notesReadAt'] = new Date();
    }

    // One atomic write rather than load-modify-save, so two reports landing
    // together (the video gate and the notes gate) cannot each save a copy
    // missing the other's change.
    const update = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(max).length) update.$max = max;
    if (Object.keys(update).length) await TaskStudy.updateOne({ _id: current._id }, update);

    // Judged on the lesson as stored after the write (maybeAutoComplete reads
    // it again), so the last of two racing reports sees both gates.
    const { gates, autoCompleted, task, completionXp, study } = await maybeAutoComplete(req.user, current);

    // The watch XP rule (taskRoutes) pays only for a watch the server
    // accepted, once per task by its ledger key.
    req.videoWatchAccepted = videoWatched === true && !!study?.progress?.videoWatched;

    res.status(200).json({
      progress: study?.progress,
      gates,
      autoCompleted,
      completionXp,
      // Said outright, so the panel can keep the gate open rather than
      // believe the video was counted.
      videoRefused: videoRefused || undefined,
      task: autoCompleted ? task : undefined
    });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = {
  getTaskStudy,
  generateTaskStudy,
  refuseLessonOverwrite,
  LESSON_EXISTS,
  submitTaskQuiz,
  updateStudyProgress,
  watchedEnough,
  // Shared with taskController so the planner list can show how far through a
  // lesson each task is without re-deriving the gate rules and drifting from
  // the ones that actually complete the task.
  lessonGates,
  VIDEO_WATCHED_FRACTION
};
