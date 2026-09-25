/**
 * `true` while `loading` is true — and no longer.
 *
 * This used to hold the loader for a fixed 900ms even when the data had
 * already arrived, which made every tab switch feel slow. The flicker that
 * hold was guarding against is now handled by YatiLoader itself: it fades in
 * only after a short delay, so a fast request never shows it at all and a
 * slow one still gets the full mascot.
 *
 * Kept as a hook, rather than inlining `loading`, so the pages that use it
 * need no change and there is one place to tune this again.
 */
export default function useMinimumLoading(loading) {
  return loading;
}
