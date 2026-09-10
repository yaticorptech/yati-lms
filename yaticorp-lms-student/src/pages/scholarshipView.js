/**
 * Which of the four screens the Scholarships page shows.
 *
 * Pulled out of the component and made a pure function so the one rule that
 * matters can actually be tested: a scholarship list is never shown to a
 * student who has not answered the eligibility form.
 *
 *   loading    still fetching
 *   need-goal  no career goal, so there is nothing to match against
 *   form       the eligibility questions
 *   list       the scholarships
 */
export default function scholarshipView({ loading, hasGoal, hasProfile, asking }) {
  if (loading) return 'loading';

  // Without a goal there is nothing to match scholarships against, and asking
  // about caste and income before that would be collecting sensitive answers
  // the page cannot yet use.
  if (!hasGoal) return 'need-goal';

  // The gate. `asking` is the student reopening the form on purpose; the
  // second half is the page insisting before it will show anything.
  if (asking || !hasProfile) return 'form';

  return 'list';
}
