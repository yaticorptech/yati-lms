/**
 * The details that are not derivable from the code and must be filled in
 * before the legal pages go in front of Google or a student.
 *
 * They are gathered here, once, rather than scattered through the prose, so
 * that filling them in is a single edit and nothing can be left stale in a
 * paragraph someone forgot to read. A module of its own, not legalShell.jsx:
 * a file that exports components and a constant breaks Vite's fast refresh.
 */
// A detail is "filled" once its TODO is replaced. Until then the pages leave it
// out rather than print "TODO: …" to a student (found in QA, 2026-10-16) — the
// TODOs below still have to be filled in before launch.
export const filled = (value) => (value && !/^TODO\b/.test(value) ? value : null);

export const COMPANY = {
  legalName: 'YATICORP',                          // TODO: registered legal name, e.g. "Yaticorp Technologies Pvt. Ltd."
  address: 'TODO: registered address',            // TODO: full postal address
  jurisdiction: 'TODO: city, India',              // TODO: courts of which city
  privacyEmail: 'yaticorp.tech@gmail.com',
  grievanceOfficer: 'TODO: name of grievance officer',
  effectiveDate: 'TODO: date these were published'
};
