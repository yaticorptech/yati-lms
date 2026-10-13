import { useEffect, useSyncExternalStore } from 'react';

/**
 * Pages that need the screen to themselves hide Loop while they do: a game in
 * play, where a mascot walking over the board and talking about buttons gets
 * in the way. A count rather than a flag, so two of them overlapping (a page
 * hands over to the next before it unmounts) never shows Loop too early.
 */
let hiders = 0;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const snapshot = () => hiders > 0;

/** Hides Loop for as long as `hide` is true and the calling component is mounted. */
export function useHideLoop(hide = true) {
  useEffect(() => {
    if (!hide) return undefined;
    hiders += 1; emit();
    return () => { hiders -= 1; emit(); };
  }, [hide]);
}

/** True while any page is hiding Loop. */
export const useLoopHidden = () => useSyncExternalStore(subscribe, snapshot, snapshot);
