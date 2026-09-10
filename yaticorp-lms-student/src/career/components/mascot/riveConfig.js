/**
 * The contract between this application and the Rive file.
 *
 * Everything the rig must expose, in one place: the artboard's state machine
 * name, its four inputs, and the fourteen animation clips with the numeric
 * value that selects each one. The rigger builds to this list and the
 * application reads from it, so neither side has to guess.
 *
 * Nothing here draws anything. If mascot.riv is absent or fails to load, the
 * renderer falls back to the official PNG artwork and the product carries on
 * exactly as it does today.
 */

/** Where the rig lives once it exists. Served from the student app's public/. */
export const RIVE_SRC = '/mascot/mascot.riv';

/** The single state machine on the Mascot artboard. */
export const STATE_MACHINE = 'MascotSM';

/**
 * The four inputs the rig must expose.
 *
 *   state     Number   which body animation to blend to
 *   blink     Trigger  fires one blink over whatever the body is doing
 *   talking   Boolean  runs the mouth loop while a speech bubble is open
 *   faceLeft  Boolean  mirrors the artboard when walking leftward
 *   speed     Number   gait rate, 0 standing and about 1 at a normal walk
 *   look      Number   -1 to 1, where the head and eyes are turned
 *
 * The last two are the ones that make the character read as alive rather than
 * as a clip being played: the legs move at the speed the body is actually
 * travelling, and the head turns toward whatever it has been sent to look at.
 */
export const INPUTS = {
  state: 'state',
  blink: 'blink',
  talking: 'talking',
  faceLeft: 'faceLeft',
  // How fast the legs should cycle, as a multiple of the walk clip's authored
  // speed. The controller measures the character's real velocity and sets
  // this, which is what stops the feet sliding across the floor.
  speed: 'speed',
  // Where the eyes and head look: -1 hard left, 0 ahead, 1 hard right. Driven
  // from the direction of whatever the mascot has been sent to.
  look: 'look'
};

/**
 * The body animations, in the order that defines their `state` value. The
 * index is the contract: clip 0 is idle, clip 8 is celebrate, and the rigger
 * must wire the Any State transitions to match.
 */
export const CLIPS = [
  'idle',
  'walk',
  'point',
  'wave',
  'talk',
  'think',
  'confused',
  'encourage',
  'celebrate',
  'sad',
  'tired',
  'reading',
  'focus',
  'levelUp'
];

export const CLIP_INDEX = Object.fromEntries(CLIPS.map((name, i) => [name, i]));

/**
 * The canonical canvas. The rig is authored at this size and the renderer
 * locks to this aspect ratio at every display height, so the character's
 * proportions are identical everywhere it is drawn. Changing these numbers
 * changes the mascot's shape, which is the one thing that must never happen.
 */
export const CANONICAL = { width: 470, height: 590, ratio: 470 / 590 };

/**
 * Whether to attempt the rig at all.
 *
 * Off by default. Set VITE_MASCOT_RIVE=1 to turn it on once mascot.riv is in
 * place. Keeping it behind a flag means the rig can be trialled, compared
 * against the canonical artwork, and pulled instantly if anything about the
 * character looks wrong — which is the identity checkpoint made operational
 * rather than aspirational.
 */
export const riveEnabled = () => import.meta.env.VITE_MASCOT_RIVE === '1';
