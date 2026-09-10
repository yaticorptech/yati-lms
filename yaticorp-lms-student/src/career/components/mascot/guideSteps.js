/**
 * What the mascot says on each CareerPath page, and what it points at.
 *
 * `target` names a `data-guide` attribute on the element. A step whose
 * element is not on the page (a card that renders only with data) is
 * skipped rather than shown pointing at nothing. Wording lives here alone,
 * so changing what the mascot says never touches a page.
 *
 * Deliberately empty: the guided tour is off across the whole section. The
 * mascot itself stays — it simply rests rather than opening with a
 * "STEP 1 OF 6" bar the student has to dismiss on every page.
 *
 * Nothing else has to change to turn it back on. MascotGuide already treats a
 * route with no steps as "rest", which is how Today's Plan, Roadmap and Skills
 * have always worked, so adding a route back here is enough to restore its
 * tour. The wording that used to be here is in the file's git history.
 */
export const GUIDE = {};
