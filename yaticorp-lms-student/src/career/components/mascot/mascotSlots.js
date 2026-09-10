/**
 * Where the one mascot is allowed to rest.
 *
 * A slot is a logical docking place, not a cage. A page declares "a mascot
 * belongs here, this big, doing this" and draws nothing itself. The single
 * mascot docks into whichever slot is most worth occupying, and leaves it
 * freely whenever it is guiding someone.
 *
 * Slots are held in module state rather than React context so that any part
 * of the app can declare one without a provider above it, and so the registry
 * survives the route changes that would otherwise churn it.
 */
const slots = new Map();
const listeners = new Set();
let seq = 0;

const emit = () => {
  version += 1;
  for (const fn of listeners) fn();
};

let version = 0;

/** A counter the view can subscribe to, since slots live outside React. */
export const slotsVersion = () => version;

export const subscribeSlots = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/**
 * Declare a slot. `el` is the empty box the page reserved, and is the only
 * thing that decides where the mascot stands: its position is measured live,
 * never stored, so a slot that moves takes the mascot with it.
 */
export const registerSlot = (id, entry) => {
  slots.set(id, { id, order: (seq += 1), priority: 0, ...entry });
  emit();
  return () => unregisterSlot(id);
};

export const unregisterSlot = (id) => {
  if (slots.delete(id)) emit();
};

export const updateSlot = (id, patch) => {
  const prev = slots.get(id);
  if (!prev) return;
  slots.set(id, { ...prev, ...patch });
  emit();
};

export const slotCount = () => slots.size;

/** A slot is usable only if its box is still in the document and on screen. */
const usable = (slot) => {
  const el = slot.el?.current || slot.el;
  if (!el || !el.isConnected) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  const onScreen = r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
  return onScreen ? { slot, rect: r } : null;
};

/**
 * Which slot the mascot should dock into, or null for the corner.
 *
 * Deterministic on purpose, so the character cannot oscillate between two
 * equally good places: a named preference wins, then declared priority, then
 * whichever sits nearest the middle of the viewport, then declaration order.
 */
export const chooseSlot = (preferredName = null) => {
  const live = [];
  for (const slot of slots.values()) {
    const hit = usable(slot);
    if (hit) live.push(hit);
  }
  if (live.length === 0) return null;

  if (preferredName) {
    const named = live.find((h) => h.slot.name === preferredName);
    if (named) return named;
  }

  const middle = window.innerHeight / 2;
  live.sort((a, b) => {
    if (b.slot.priority !== a.slot.priority) return b.slot.priority - a.slot.priority;
    const da = Math.abs(a.rect.top + a.rect.height / 2 - middle);
    const db = Math.abs(b.rect.top + b.rect.height / 2 - middle);
    if (Math.abs(da - db) > 1) return da - db;
    return a.slot.order - b.slot.order;
  });
  return live[0];
};

/** For tests. */
export const resetSlots = () => {
  slots.clear();
  seq = 0;
  emit();
};
