import { Suspense, lazy, useState } from 'react';
import { STATES, isState } from './mascotStates';
import { CLIP_INDEX, riveEnabled } from './riveConfig';
import Mascot from './Mascot';

/**
 * 🎭 The one place that decides what a mascot state looks like.
 *
 * Everything upstream — pages, the controller, the event bus — speaks in
 * states: "celebrating", "pointing", "streakBroken". This turns a state into
 * something on screen, and it is the only file in the application that knows
 * how that happens.
 *
 * There are two backends behind this one component:
 *
 *   Rive     the rigged character. One skeleton, real interpolated motion,
 *            states blended by the state machine. Loaded lazily, and only
 *            when the flag is on, so the runtime costs nothing until then.
 *
 *   PNG      the official cut-outs, shown exactly as supplied and moved as
 *            whole images by CSS. What ships today.
 *
 * The PNG backend is not a stopgap to be deleted the moment the rig arrives.
 * It is the fallback that guarantees the mascot cannot break: if mascot.riv
 * is missing, fails to parse, or is switched off because the character looks
 * wrong, the product falls back to artwork that is correct by definition.
 * That is the identity checkpoint made operational.
 */
const RiveMascot = lazy(() => import('./RiveMascot'));

export default function MascotRenderer({
  state = 'idle',
  pose,
  motion,
  height = 120,
  flip = false,
  className = '',
  talking = false,
  paused = false,
  // Gait rate and gaze direction. Meaningless to the PNG backend, which moves
  // the whole picture, and essential to the rig, which moves a skeleton.
  speed = 0,
  look = 0,
  // The mascot lab passes this to trial the rig without setting the flag.
  forceRive = false
}) {
  // A rig that failed to load is never retried in this session: one failure
  // is enough to know the file is not there.
  const [riveBroken, setRiveBroken] = useState(false);

  const resolved = STATES[isState(state) ? state : 'idle'];
  const useRig = (forceRive || riveEnabled()) && !riveBroken;

  // Drawn while the rig loads and whenever it is not in use, so there is
  // never a frame with no mascot in it.
  const png = (
    <Mascot
      pose={pose || resolved.pose}
      motion={motion || resolved.body}
      height={height}
      flip={flip}
      className={className}
    />
  );

  if (!useRig) return png;

  return (
    <Suspense fallback={png}>
      <RiveMascot
        clip={resolved.clip}
        clipIndex={CLIP_INDEX[resolved.clip] ?? 0}
        height={height}
        flip={flip}
        talking={talking}
        paused={paused}
        speed={speed}
        look={look}
        className={className}
        onUnavailable={() => setRiveBroken(true)}
      />
    </Suspense>
  );
}
