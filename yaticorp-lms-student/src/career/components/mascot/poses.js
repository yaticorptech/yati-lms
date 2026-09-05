/**
 * The official poses, each an unaltered cut-out from the brand's mascot
 * sheets (transparent background only; no redrawing). Any pose not present
 * on disk falls back to the main one.
 *
 *   Sheet one:  point · hello · wink · care · excited · thinking · sit
 *   Sheet two:  walk · jump · guide · shocked · run · confetti · worried ·
 *               heart · hooray · confused · meditate · bye · thumbs · sad ·
 *               flex · star
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
  star: '/mascot/star.png' // star-jump among gold stars
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
  star: 367 / 330
};
