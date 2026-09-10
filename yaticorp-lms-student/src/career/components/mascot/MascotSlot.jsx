import { useEffect, useId, useRef } from 'react';
import { STATES, isState } from './mascotStates';
import { RATIO } from './poses';
import { registerSlot, unregisterSlot, updateSlot } from './mascotSlots';

/**
 * A place a mascot belongs, declared by a page that does not draw one.
 *
 * This renders an empty box and nothing else. It reserves exactly the
 * footprint the old inline mascot occupied, so removing that mascot cannot
 * move anything around it, and it tells the single global character that a
 * docking place exists here and what it should be doing while it stands in it.
 *
 * A slot is an anchor, not a cage. While the mascot is guiding it leaves the
 * slot freely and walks to whatever it is talking about.
 */
export default function MascotSlot({
  name,
  state = 'idle',
  height = 120,
  priority = 0,
  className = ''
}) {
  const id = useId();
  const ref = useRef(null);

  // Registration is keyed on identity alone, so a slot is not torn down and
  // rebuilt every time a page re-renders with a new height.
  useEffect(() => {
    registerSlot(id, { name, el: ref });
    return () => unregisterSlot(id);
  }, [id, name]);

  // Everything that can change while the slot stays put.
  useEffect(() => {
    updateSlot(id, { state, height, priority });
  }, [id, state, height, priority]);

  // The same width the artwork occupied at this height, so the space the old
  // mascot held is held exactly.
  const pose = STATES[isState(state) ? state : 'idle'].pose;
  const width = Math.round(height * (RATIO[pose] || 0.8));

  return (
    <span
      ref={ref}
      data-mascot-slot={name}
      aria-hidden
      className={`block ${className}`}
      style={{ width, height }}
    />
  );
}
