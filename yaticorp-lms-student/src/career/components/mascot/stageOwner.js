/**
 * Who owns the one mascot.
 *
 * Named stageOwner rather than mascotStage so it cannot collide with
 * MascotStage.jsx on a case-insensitive filesystem, which silently resolves
 * both to the same module.
 *
 * Exactly one renderer may exist in the application. This is not enforced by
 * convention or by hiding spares: it is a module-level claim, so the second
 * MascotStage to mount cannot take ownership and renders nothing at all.
 * Being module state, it survives route changes and remounts, which is
 * precisely when duplicates would otherwise appear.
 */
let ownerId = null;
const listeners = new Set();

const emit = () => {
  for (const fn of listeners) fn();
};

/** Take ownership. Returns false if someone already holds it. */
export const claimStage = (id) => {
  if (ownerId === null) {
    ownerId = id;
    emit();
    return true;
  }
  return ownerId === id;
};

/** Give it up. A no-op unless the caller is the current owner. */
export const releaseStage = (id) => {
  if (ownerId !== id) return;
  ownerId = null;
  emit();
};

export const getStageOwner = () => ownerId;

export const subscribeStage = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** For tests and the mascot lab. Never call this from product code. */
export const resetStage = () => {
  ownerId = null;
  emit();
};
