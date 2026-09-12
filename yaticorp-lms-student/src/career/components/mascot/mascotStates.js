/**
 * The mascot's vocabulary: every state the application can put it in.
 *
 * This is the contract between the product and the renderer. Pages and the
 * controller name a STATE — "celebrating", "pointing", "streakBroken" — and
 * never a file, a pose or a CSS class. The renderer alone turns a state into
 * something visible.
 *
 * Each state carries three things. `clip` is the Rive animation it plays and
 * is the one the product cares about. `pose` and `body` are the PNG backend's
 * columns, kept alongside so both renderers can run from the same table while
 * the rig is trialled behind its flag, and so the mascot never breaks if the
 * rig is pulled. Every page, every reaction and the whole event system keep
 * working through all of it. That is the entire reason this table exists.
 *
 * Nothing here is on a timer. A state holds until the application reports
 * something new — see mascotBus.js.
 */
export const STATES = {
  /* -- Resting and moving ------------------------------------------------ */
  idle: { clip: 'idle', pose: 'care', body: 'mc-breathe' },
  walking: { clip: 'walk', pose: 'walk', body: 'mc-gait' },
  meditating: { clip: 'idle', pose: 'meditate', body: 'mc-breathe' },

  /* -- Addressing the student -------------------------------------------- */
  welcoming: { clip: 'wave', pose: 'welcome', body: 'mc-wave-whole' },
  waving: { clip: 'wave', pose: 'hello', body: 'mc-wave-whole' },
  talking: { clip: 'talk', pose: 'hello', body: 'mc-talk' },
  pointing: { clip: 'point', pose: 'guide', body: 'mc-lean' },
  presenting: { clip: 'point', pose: 'present', body: 'mc-nod' },
  leaving: { clip: 'wave', pose: 'bye', body: 'mc-wave-whole' },

  /* -- Working it out ---------------------------------------------------- */
  thinking: { clip: 'think', pose: 'thinking', body: 'mc-think' },
  pondering: { clip: 'think', pose: 'ponder', body: 'mc-think' },
  confused: { clip: 'confused', pose: 'confused', body: 'mc-wonder' },
  worried: { clip: 'confused', pose: 'worried', body: 'mc-worry' },
  shocked: { clip: 'confused', pose: 'shocked', body: 'mc-wonder' },
  reading: { clip: 'reading', pose: 'focus', body: 'mc-breathe' },
  progressing: { clip: 'point', pose: 'progress', body: 'mc-nod' },

  /* -- Mood -------------------------------------------------------------- */
  happy: { clip: 'idle', pose: 'thumbs', body: 'mc-breathe' },
  caring: { clip: 'idle', pose: 'heart', body: 'mc-breathe' },
  excited: { clip: 'celebrate', pose: 'excited', body: 'mc-bounce' },
  tired: { clip: 'tired', pose: 'meditate', body: 'mc-tired' },
  sad: { clip: 'sad', pose: 'sad', body: 'mc-sad' },

  /* -- Cheering the student on ------------------------------------------- */
  encouraging: { clip: 'encourage', pose: 'nexttry', body: 'mc-encourage' },
  determined: { clip: 'encourage', pose: 'flex', body: 'mc-encourage' },
  cheering: { clip: 'encourage', pose: 'cheer', body: 'mc-encourage' },
  clapping: { clip: 'encourage', pose: 'clap', body: 'mc-clap' },

  /* -- Results the product reports --------------------------------------- */
  celebrating: { clip: 'celebrate', pose: 'confetti', body: 'mc-dance' },
  success: { clip: 'celebrate', pose: 'hooray', body: 'mc-clap' },
  starred: { clip: 'celebrate', pose: 'star', body: 'mc-leap' },
  levelUp: { clip: 'levelUp', pose: 'levelup', body: 'mc-leap' },
  taskDone: { clip: 'levelUp', pose: 'taskdone', body: 'mc-nod' },
  streakKept: { clip: 'celebrate', pose: 'streak', body: 'mc-bounce' },
  streakBroken: { clip: 'sad', pose: 'streakbroken', body: 'mc-idle' },
  quizPassed: { clip: 'celebrate', pose: 'clear', body: 'mc-dance' },
  quizFailed: { clip: 'sad', pose: 'wrong', body: 'mc-idle' },
  // Still states, no longer reactions: the games section does not speak to
  // the companion, but the day-cleared celebration wears gameWon.
  gameWon: { clip: 'celebrate', pose: 'win', body: 'mc-dance' },
  gameLost: { clip: 'sad', pose: 'lose', body: 'mc-idle' }
};

/*
 * There is deliberately no `blinking` state. Blinking cannot be done on this
 * artwork: the eyes are drawn into each cut-out, so a blink would mean either
 * altering the art or flicking between two pictures. Both are ruled out. It
 * arrives with the skeletal renderer, where the eyes become their own layer.
 */

export const isState = (name) => Object.prototype.hasOwnProperty.call(STATES, name);

/**
 * Application events, and the state each one puts the mascot in.
 *
 * A page reports what happened. It does not choose a pose, a class or a
 * duration. `ms` is how long the accompanying words stay on screen; the
 * mascot itself holds the state until the next event.
 *
 * `anchor` names the element the reaction belongs beside. Every reaction
 * that can have one does, because a reaction with nowhere to point has
 * nowhere to appear — the character has no corner to float in any more, by
 * design — and is simply not shown. Naming the panel a moment happened in
 * is what puts the celebration on the game rather than in the corner of
 * the window.
 */
export const REACTIONS = {
  /* -- The ten moments that must be covered ------------------------------ */
  quizPassed: { state: 'quizPassed', message: 'Quiz cleared! That is the whole lesson locked in.', anchor: 'quiz' },
  quizFailed: { state: 'encouraging', message: 'Not this time. Read it again and go once more.', anchor: 'quiz' },
  levelUp: { state: 'levelUp', message: 'Level up! Your work is adding up.' },
  newBadge: { state: 'starred', message: 'A new badge. That one is yours for good.' },
  noRoadmap: {
    state: 'confused',
    message: 'There is no roadmap here yet. Shall we build one?',
    cta: { label: 'Build my roadmap', anchor: 'build-roadmap' },
    anchor: 'build-roadmap',
    ms: 9000
  },
  noTasks: { state: 'pondering', message: 'Nothing planned for today. Want me to find your next step?', ms: 8000 },
  examTomorrow: { state: 'reading', message: 'You have an exam tomorrow. Today is a revision day.', ms: 8000 },
  lateEveningWithTasks: { state: 'tired', message: 'It is getting late. One small task, then rest.', ms: 8000 },
  streakAtRisk: { state: 'worried', message: 'Your streak ends tonight unless you finish something.', ms: 8000 },
  taskCompleted: { state: 'taskDone', message: 'Task done. On to the next one.', anchor: 'today-tasks' },

  /* -- Everything else the interface already reports --------------------- */
  streakKept: { state: 'streakKept', message: 'Streak kept. Same time tomorrow.' },
  streakBroken: { state: 'encouraging', message: 'The streak went. Start a new one today.' },
  quizStart: { state: 'pondering', message: 'Take your time. Read each one twice.', anchor: 'quiz' },
  taskStart: { state: 'reading', message: 'Watch it through and the task ticks itself off.' },
  dayCleared: { state: 'success', message: "That is today's plan finished. Well done.", anchor: 'today-tasks' },
  greeting: { state: 'welcoming', message: 'Welcome back! Ready for your next career step?' }
};

export const isReaction = (key) => Object.prototype.hasOwnProperty.call(REACTIONS, key);
