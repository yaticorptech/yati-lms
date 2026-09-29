/**
 * Which pages a student has already been shown around.
 *
 * Page guidance is a one-time thing: the companion appears beside the
 * element a page is about and stays until the student clicks it (or taps
 * the character away), and after that it is never shown on that page
 * again. Coming back a week later to be told where the Start button is a
 * second time is the "mascot in the way" this section exists to avoid.
 *
 * Kept in the browser rather than on the server: it is a memory of this
 * device having shown something, not a fact about the student's progress.
 * Keyed on the student as well as the page, so two people sharing a laptop
 * each get their own first time. Storage that refuses (private mode, a full
 * quota) simply means the guidance plays again next visit.
 */
const key = (userId, pageKey) => `career.mascot.done.${userId || 'anon'}.${pageKey}`;

export const guideDone = (userId, pageKey) => {
  try {
    return localStorage.getItem(key(userId, pageKey)) === '1';
  } catch {
    return false;
  }
};

export const markGuideDone = (userId, pageKey) => {
  try {
    localStorage.setItem(key(userId, pageKey), '1');
  } catch {
    // Nothing to do: the guidance will play once more next time.
  }
};
