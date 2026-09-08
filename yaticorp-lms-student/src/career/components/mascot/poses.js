/**
 * The official poses, each an unaltered cut-out from the brand's mascot
 * sheets (transparent background only; no redrawing). Any pose not present
 * on disk falls back to the main one.
 *
 *   Sheet one:  point · hello · wink · care · excited · thinking · sit
 *   Sheet two:  walk · jump · guide · shocked · run · confetti · worried ·
 *               heart · hooray · confused · meditate · bye · thumbs · sad ·
 *               flex · star
 *   Sheet three (games and quizzes): present · cheer · win · lose · tryagain ·
 *               ponder · clap · clear · wrong · nexttry
 *   Sheet four (moments and Overview): streak · streakbroken · levelup ·
 *               taskdone · welcome · progress · encourage · focus
 */
export const POSES = {
  // Sheet one
  point: '/mascot/point.png', // pointing to the right, the main pose
  hello: '/mascot/hello.png', // a small wave
  wink: '/mascot/wink.png',
  care: '/mascot/care.png',
  excited: '/mascot/excited.png',
  thinking: '/mascot/thinking.png',
  sit: '/mascot/sit.png',
  // Sheet two
  walk: '/mascot/walk.png', // strolling in with a wave
  jump: '/mascot/jump.png', // leaping, fists up
  guide: '/mascot/guide.png', // winking and pointing to the right
  shocked: '/mascot/shocked.png', // hands on cheeks, mouth open
  run: '/mascot/run.png', // sprinting
  confetti: '/mascot/confetti.png', // cheering in a shower of confetti
  worried: '/mascot/worried.png', // arms crossed, unsure
  heart: '/mascot/heart.png', // making a heart with both hands
  hooray: '/mascot/hooray.png', // eyes shut, arms up, one leg kicked
  confused: '/mascot/confused.png', // scratching its head under a "?"
  meditate: '/mascot/meditate.png', // sitting cross-legged, eyes closed
  bye: '/mascot/bye.png', // one arm high, waving goodbye
  thumbs: '/mascot/thumbs.png', // thumbs up with a wink
  sad: '/mascot/sad.png', // head down, teary
  flex: '/mascot/flex.png', // flexing, determined
  star: '/mascot/star.png', // star-jump among gold stars
  // Sheets three and four
  present: '/mascot/present.png', // open hand, presenting (game instructions)
  cheer: '/mascot/cheer.png', // fists up, cheering you on (playing)
  win: '/mascot/win.png', // leaping in confetti (game won)
  lose: '/mascot/lose.png', // hugging its knees, teary (game lost)
  tryagain: '/mascot/tryagain.png', // thumbs up and a wink (try again)
  ponder: '/mascot/ponder.png', // hand on chin under a "?" (thinking)
  clap: '/mascot/clap.png', // hands together, delighted (correct answer)
  clear: '/mascot/clear.png', // leaping in confetti (quiz cleared)
  wrong: '/mascot/wrong.png', // holding an X card, teary (wrong answer)
  nexttry: '/mascot/nexttry.png', // thumbs up with a heart (next try)
  streak: '/mascot/streak.png', // fist up under a flame (streak continued)
  streakbroken: '/mascot/streakbroken.png', // teary under a cracked flame (streak broken)
  levelup: '/mascot/levelup.png', // leaping past an XP hex and arrows (level up)
  taskdone: '/mascot/taskdone.png', // holding a ticked clipboard (task completed)
  welcome: '/mascot/welcome.png', // waving hello, one leg up (overview welcome)
  progress: '/mascot/progress.png', // gesturing at a progress card (overview progress)
  encourage: '/mascot/encourage.png', // hands clasped, hearts (overview encouragement)
  focus: '/mascot/focus.png' // at a laptop under a lightbulb (overview focusing)
};

// Width : height of each cut-out, so a pose is shown at its true shape.
export const RATIO = {
  point: 470 / 590,
  hello: 150 / 174,
  wink: 158 / 174,
  care: 152 / 174,
  excited: 164 / 194,
  thinking: 158 / 190,
  sit: 208 / 190,
  walk: 303 / 341,
  jump: 340 / 326,
  guide: 297 / 345,
  shocked: 242 / 341,
  run: 250 / 315,
  confetti: 333 / 330,
  worried: 234 / 319,
  heart: 250 / 320,
  hooray: 330 / 316,
  confused: 239 / 312,
  meditate: 306 / 310,
  bye: 322 / 311,
  thumbs: 286 / 315,
  sad: 248 / 309,
  flex: 292 / 319,
  star: 367 / 330,
  present: 353 / 417,
  cheer: 394 / 393,
  win: 394 / 482,
  lose: 346 / 395,
  tryagain: 312 / 400,
  ponder: 289 / 397,
  clap: 375 / 373,
  clear: 381 / 417,
  wrong: 314 / 386,
  nexttry: 330 / 380,
  streak: 402 / 449,
  streakbroken: 375 / 441,
  levelup: 434 / 465,
  taskdone: 393 / 397,
  welcome: 367 / 381,
  progress: 466 / 339,
  encourage: 413 / 372,
  focus: 414 / 366
};
