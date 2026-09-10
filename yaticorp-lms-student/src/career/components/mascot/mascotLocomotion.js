/**
 * How the mascot gets from one place to another.
 *
 * This is the difference between a character walking across the page and a
 * picture whose coordinates changed. It is a small kinematic model: the
 * mascot gathers itself, accelerates, cruises, brakes as it nears the target,
 * stops without overshooting, then turns to face what it came for.
 *
 * Deliberately a pure function of state and elapsed time, with no DOM and no
 * React in it, so the whole of the walk can be tested by running it.
 *
 * Rive is not involved here and must not be. This decides WHERE the character
 * is and how fast it is going; Rive decides how a body moving at that speed
 * should look. The `speed` this reports is what keeps the two in step, so the
 * legs never slide across the floor.
 */

/** Anticipation before setting off. Nothing in nature starts at full speed. */
export const PREPARE_MS = 140;
/** And a beat to turn on the spot once it has arrived. */
export const TURN_MS = 180;

const ACCEL = 2600; // px per second squared
const DECEL = 2200;
const MIN_CRUISE = 170; // px per second
const MAX_CRUISE = 560;
/** Closer than this and the journey is over. */
export const ARRIVED = 1.0;
/** Shorter than this is a shuffle, not a walk: no gait, no anticipation. */
export const WORTH_WALKING = 10;

export const PHASES = ['idle', 'prepare', 'accelerate', 'cruise', 'decelerate', 'turn'];

/** A character standing still at a point. */
export const createBody = (x = 0, y = 0, facingLeft = false) => ({
  x,
  y,
  speed: 0,
  phase: 'idle',
  facingLeft,
  timer: 0,
  cruise: MIN_CRUISE
});

const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);

/**
 * Advance the body by `dt` seconds toward `target`.
 *
 * `target.facingLeft`, when given, is which way it should end up looking —
 * the direction of whatever it walked over to point at, which is usually not
 * the direction it travelled in.
 */
export const step = (body, target, dt) => {
  const b = { ...body };
  const dx = target.x - b.x;
  const dy = target.y - b.y;
  const dist = Math.hypot(dx, dy);
  const wantFacing = target.facingLeft;

  // Already there: settle, then turn to face the thing if needed.
  if (dist < ARRIVED) {
    b.x = target.x;
    b.y = target.y;
    b.speed = 0;
    if (b.phase !== 'idle' && b.phase !== 'turn') {
      b.phase = wantFacing !== undefined && wantFacing !== b.facingLeft ? 'turn' : 'idle';
      b.timer = b.phase === 'turn' ? TURN_MS : 0;
    }
    if (b.phase === 'turn') {
      b.timer -= dt * 1000;
      if (b.timer <= 0) {
        b.facingLeft = wantFacing ?? b.facingLeft;
        b.phase = 'idle';
        b.timer = 0;
      }
    }
    return b;
  }

  // A shuffle of a few pixels: just move, no performance.
  if (dist < WORTH_WALKING && b.phase === 'idle') {
    b.x = target.x;
    b.y = target.y;
    b.speed = 0;
    if (wantFacing !== undefined) b.facingLeft = wantFacing;
    return b;
  }

  // Setting off. Face the way we are about to travel and gather ourselves.
  if (b.phase === 'idle') {
    b.phase = 'prepare';
    b.timer = PREPARE_MS;
    b.facingLeft = dx < 0;
    // A long journey is walked faster than a short one, within reason. The
    // ceiling matters: above roughly 600 px a second a character stops
    // reading as walking and starts reading as being thrown.
    b.cruise = clamp(dist * 1.3, MIN_CRUISE, MAX_CRUISE);
    b.speed = 0;
    return b;
  }

  if (b.phase === 'prepare') {
    b.timer -= dt * 1000;
    if (b.timer <= 0) {
      b.phase = 'accelerate';
      b.timer = 0;
    }
    return b;
  }

  // Braking distance at the current speed. Start slowing early enough to stop
  // exactly on the mark rather than skidding past it and easing back.
  const brakingDistance = (b.speed * b.speed) / (2 * DECEL);
  const wantSpeed = dist <= brakingDistance ? 0 : b.cruise;

  if (wantSpeed > b.speed) {
    b.speed = Math.min(wantSpeed, b.speed + ACCEL * dt);
    b.phase = b.speed >= b.cruise * 0.98 ? 'cruise' : 'accelerate';
  } else {
    b.speed = Math.max(0, b.speed - DECEL * dt);
    b.phase = 'decelerate';
  }

  const travel = b.speed * dt;
  if (travel >= dist) {
    b.x = target.x;
    b.y = target.y;
    b.speed = 0;
    b.phase = wantFacing !== undefined && wantFacing !== b.facingLeft ? 'turn' : 'idle';
    b.timer = b.phase === 'turn' ? TURN_MS : 0;
    return b;
  }

  b.x += (dx / dist) * travel;
  b.y += (dy / dist) * travel;
  return b;
};

/** Put it there at once, for a reduced-motion preference. */
export const teleport = (body, target) => ({
  ...body,
  x: target.x,
  y: target.y,
  speed: 0,
  phase: 'idle',
  timer: 0,
  facingLeft: target.facingLeft ?? body.facingLeft
});

/** Is it going anywhere? */
export const isTravelling = (body) => body.phase !== 'idle';

/**
 * How fast the legs should be moving, as a multiple of the walk clip's
 * authored speed. This is what stops the feet sliding: at half pace the
 * cycle plays at half rate.
 */
export const gaitRate = (body) => (body.speed <= 0 ? 0 : clamp(body.speed / 320, 0.45, 2.2));

/** The animation state a body in this phase should be playing. */
export const motionState = (body) => {
  switch (body.phase) {
    case 'prepare':
      return 'preparing';
    case 'accelerate':
    case 'cruise':
    case 'decelerate':
      return 'walking';
    case 'turn':
      return 'turning';
    default:
      return null; // nothing to say; the controller's own state stands
  }
};
