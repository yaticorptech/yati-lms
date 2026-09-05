import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Compass, MapPin, Save, RefreshCw, Undo2, AlertTriangle, Pencil, Lock
} from 'lucide-react';
import SuggestField from '../../components/common/SuggestField';
import {
  BOARDS, STREAMS, SPECIALISATIONS, YEARS, SEMESTERS, JOB_TITLES, EXPERIENCE_YEARS,
  CAREER_GOALS, COMPANIES, COUNTRIES, classesFor, coursesFor, statesFor
} from '../../utils/profileOptions';
import Card, { CardHeader } from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import api from '../../services/api';
import YatiLoader from '../../../components/YatiLoader';
import useMinimumLoading from '../../../hooks/useMinimumLoading';

/**
 * `value` must stay byte-identical to the Goal schema's enum — it is what gets
 * saved. `label` and `note` exist only so eight long strings can be read at a
 * glance in a grid instead of hidden inside a dropdown.
 */
const EDUCATION_LEVELS = [
  { value: 'Primary School (Class 1–5)', label: 'Primary School', note: 'Class 1–5' },
  { value: 'Middle School (Class 6–8)', label: 'Middle School', note: 'Class 6–8' },
  { value: 'High School (Class 9–10)', label: 'High School', note: 'Class 9–10' },
  { value: 'Higher Secondary (Class 11–12)', label: 'Higher Secondary', note: 'Class 11–12' },
  { value: 'Diploma', label: 'Diploma', note: 'Polytechnic' },
  { value: 'Undergraduate', label: 'Undergraduate', note: 'Bachelor’s degree' },
  { value: 'Postgraduate', label: 'Postgraduate', note: 'Master’s degree' },
  { value: 'Working Professional', label: 'Working Professional', note: 'Already in a job' }
];

// The only fields this page owns. The API returns the whole Goal document —
// _id, userId, timestamps and all — and the old version dropped that straight
// into state and posted it back untouched. Narrowing it here keeps the dirty
// check honest (a server-side timestamp is not an edit the student made) and
// stops the page sending back fields it has no business rewriting.
const FIELDS = [
  'educationLevel', 'currentClass', 'degree', 'specialization', 'currentYear',
  'semester', 'currentJob', 'experience', 'careerGoal', 'dreamCompany', 'country', 'state',
  'board', 'stream'
];

const EMPTY = Object.fromEntries(FIELDS.map((f) => [f, '']));

const pickFields = (data = {}) =>
  Object.fromEntries(FIELDS.map((f) => [f, data[f] ?? '']));

// What the API will refuse to save without, for the level chosen. The Goal
// schema has required these all along, conditionally on the level — but the
// form never said so and never checked. Choosing "Working Professional" and
// pressing Save came back as a raw database error, "Goal validation failed:
// currentJob: Path `currentJob` is required.", with nothing on screen to act
// on and no clue which box was empty.
//
// The labels are the field's own words, listed back to the student in the
// message that stops the save.
const requiredForLevel = (level) => {
  if (!level) return [];
  if (level.includes('School') || level.includes('Secondary')) {
    return [{ key: 'currentClass', label: 'current class' }];
  }
  if (level === 'Undergraduate' || level === 'Postgraduate') {
    return [
      { key: 'degree', label: 'degree' },
      { key: 'specialization', label: 'branch' },
      { key: 'currentYear', label: 'current year' }
    ];
  }
  if (level === 'Diploma') return [{ key: 'currentYear', label: 'current year' }];
  if (level === 'Working Professional') {
    return [
      { key: 'currentJob', label: 'job title' },
      { key: 'experience', label: 'years of experience' }
    ];
  }
  return [];
};

/** "a, b and c" — so the message reads like a sentence, not a field dump. */
const listOf = (items) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/** Labelled group inside a card. */
const Section = ({ children }) => <div className="grid gap-x-4 sm:grid-cols-2">{children}</div>;

export default function SettingsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const [form, setForm] = useState(EMPTY);
  // What the server last confirmed. Every "has anything changed?" question is
  // answered against this rather than against a boolean that has to be reset by
  // hand at four different call sites.
  const [saved, setSaved] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // 'save' | 'rebuild'
  const [hasRoadmap, setHasRoadmap] = useState(false);
  // Whether a save has been turned away for missing details. Until it has, an
  // empty box is a box the student has not reached yet, not a mistake worth
  // announcing to them in red.
  const [attempted, setAttempted] = useState(false);
  /**
   * The page opens read-only.
   *
   * These fields are what the roadmap, the daily plan and the mentor are all
   * built from, and the form used to sit permanently open — so a stray click on
   * an education-level card, or a suggestion picked by accident while scrolling,
   * silently changed the basis of everything downstream. Reading your own
   * profile is the common case; changing it is the rare one, and it should take
   * a deliberate press.
   */
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.get('/goals').catch(() => null),
      // Only used to decide whether rebuilding actually destroys anything. A
      // student with no roadmap yet has nothing to lose and should not be shown
      // a frightening warning about it.
      api.get('/roadmap').catch(() => null)
    ]).then(([goalRes, roadmapRes]) => {
      if (cancelled) return;
      const initial = pickFields(goalRes?.data);
      setForm(initial);
      setSaved(initial);
      setHasRoadmap(Boolean(roadmapRes?.data));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  /** Leave edit mode, putting back whatever the server last confirmed. */
  const stopEditing = () => {
    setForm(saved);
    setAttempted(false);
    setEditing(false);
  };

  /**
   * Changing the education level also clears anything that level cannot hold.
   *
   * Without this, a Class 10 student switching to Higher Secondary keeps
   * "Class 10" in a field that now only offers 11 and 12 — a value the student
   * can no longer see is wrong. The same for board and stream: a leftover
   * "CBSE" on an undergraduate profile would be sent to the roadmap prompt as
   * fact.
   */
  const chooseLevel = (value) => {
    const isSchoolLevel = value.includes('School') || value.includes('Secondary');
    const keepsStream = value === 'Higher Secondary (Class 11–12)';
    const isCourseLevel = ['Undergraduate', 'Postgraduate', 'Diploma'].includes(value);
    const isJob = value === 'Working Professional';
    const allowed = classesFor(value);

    const keep = (condition, current) => (condition ? current : '');

    // A different level asks different questions, so nothing has been turned
    // away yet under this one.
    setAttempted(false);

    setForm((prev) => ({
      ...prev,
      educationLevel: value,
      // Only a class the new level actually contains.
      currentClass: keep(isSchoolLevel && allowed.includes(prev.currentClass), prev.currentClass),
      // Board belongs to school levels up to Class 10; Higher Secondary is
      // asked for its stream instead.
      board: keep(isSchoolLevel && !keepsStream, prev.board),
      stream: keep(keepsStream, prev.stream),
      // Course details belong to a course. A Class 5 profile carrying
      // degree "bca" and "2nd year" from an earlier answer is simply wrong,
      // and it is one unguarded prompt line away from being read as fact.
      degree: keep(isCourseLevel, prev.degree),
      specialization: keep(isCourseLevel, prev.specialization),
      currentYear: keep(isCourseLevel, prev.currentYear),
      semester: keep(isCourseLevel, prev.semester),
      // Likewise the job fields.
      currentJob: keep(isJob, prev.currentJob),
      experience: keep(isJob, prev.experience)
    }));
  };

  const changed = useMemo(
    () => FIELDS.filter((f) => String(form[f] ?? '') !== String(saved[f] ?? '')),
    [form, saved]
  );
  const isDirty = changed.length > 0;

  const level = form.educationLevel;
  const isSchool = level?.includes('School') || level?.includes('Secondary');
  const isHigherSecondary = level === 'Higher Secondary (Class 11–12)';

  const isCourse = ['Undergraduate', 'Postgraduate', 'Diploma'].includes(level);
  const isWorking = level === 'Working Professional';

  const goalMissing = !String(form.careerGoal || '').trim();

  const mustFill = useMemo(() => requiredForLevel(level), [level]);
  const missing = useMemo(
    () => mustFill.filter((f) => String(form[f.key] ?? '').trim() === ''),
    [mustFill, form]
  );
  const errorFor = (key) =>
    attempted && missing.some((f) => f.key === key) ? 'This one is needed.' : undefined;

  /**
   * Stop a save that the server would only reject, and say what is missing.
   * Returns true if the action should not go ahead.
   */
  const blocked = (action) => {
    if (goalMissing) {
      toast.error(`Add a career goal before ${action}.`, 'Almost there');
      return true;
    }
    if (missing.length > 0) {
      setAttempted(true);
      toast.error(`Add your ${listOf(missing.map((f) => f.label))} before ${action}.`, 'Almost there');
      return true;
    }
    return false;
  };

  /** Save the profile. Returns false if the server refused. */
  const persist = async () => {
    const { data } = await api.put('/goals', pickFields(form));
    setSaved(pickFields(data));
    return true;
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (blocked('saving')) return;
    setBusy('save');
    try {
      await persist();
      setEditing(false);
      setAttempted(false);
      toast.success('Your profile has been updated.', 'Saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save your profile.');
    } finally {
      setBusy(null);
    }
  };

  /**
   * Save AND rebuild the roadmap.
   *
   * Rebuilding is not a refresh — the server deletes the old roadmap, every
   * task, all skill progress, the planner's context and all recommendations
   * before writing a new one. The previous version of this page did that on one
   * unlabelled click, so correcting a typo in "Dream Company" could wipe weeks
   * of finished work with no warning and no way back.
   */
  const handleRebuild = async () => {
    if (blocked('rebuilding your roadmap')) return;

    if (hasRoadmap) {
      const ok = await confirm({
        title: 'Rebuild your roadmap from scratch?',
        message:
          'Your current roadmap, every task on your planner, your skill progress and your saved recommendations will be deleted and generated again from these details. Finished tasks and the XP you earned for them cannot be recovered.',
        confirmLabel: 'Delete and rebuild',
        cancelLabel: 'Keep what I have',
        destructive: true
      });
      if (!ok) return;
    }

    setBusy('rebuild');
    try {
      await persist();
      await api.post('/roadmap/generate');
      toast.success('Your new roadmap is ready.', 'Rebuilt');
      navigate('/career/roadmap');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not rebuild your roadmap.');
    } finally {
      setBusy(null);
    }
  };

  const showLoader = useMinimumLoading(loading);
  if (showLoader) return <YatiLoader label="Loading your settings" />;

  return (
    <div className="mx-auto max-w-3xl">
      {/* pb-28 keeps the last field clear of the save bar that floats over it. */}
      <form onSubmit={handleSave} className="space-y-6 pb-28">
        <PageHeader
          eyebrow="Your profile"
          title="Settings & Profile"
          subtitle={
            editing
              ? 'Change what you need, then save. Nothing is sent until you do.'
              : 'These details are what your roadmap, your daily tasks and your mentor are built from.'
          }
          action={
            editing ? (
              <Button
                type="button"
                variant="ghost"
                icon={Undo2}
                disabled={busy !== null}
                onClick={stopEditing}
              >
                Cancel
              </Button>
            ) : (
              <Button type="button" icon={Pencil} onClick={() => setEditing(true)}>
                Edit profile
              </Button>
            )
          }
        />

        {/* Says why the form is inert, so a locked field reads as deliberate
            rather than as something that has failed to load.

            The sentence sits in one span rather than loose beside the icon.
            `flex` turns every child into a flex item — including each bare
            text node — so on a narrow screen this wrapped as three separate
            boxes with gaps between them: "Locked while you read. Press" on one
            line, "Edit profile" on the next and "to change anything." on a
            third. Wrapped in a span it wraps like the sentence it is. */}
        {!editing && (
          <p className="flex items-start gap-2 text-sm text-ink-500">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Locked while you read. Press{' '}
              <span className="font-semibold whitespace-nowrap text-ink-700">Edit profile</span> to
              change anything.
            </span>
          </p>
        )}

        {/* ---------------------------------------------------------------
            Education
        --------------------------------------------------------------- */}
        <Card className="animate-fade-in-up">
          <CardHeader
            icon={GraduationCap}
            title="Where you are studying"
            subtitle="This sets the level your roadmap is pitched at."
            accent="brand"
          />

          {/* A dropdown hides seven of the eight options and gives no sense of
              the scale it is describing. Laid out as cards, the whole ladder is
              visible and one tap moves you along it.

              Real radio inputs, visually hidden: keyboard arrow-keys, tab order
              and screen-reader grouping all come for free, which a div with an
              onClick would have to reimplement badly. */}
          <fieldset>
            <legend className="mb-2.5 text-sm font-semibold text-ink-700">Education level</legend>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {EDUCATION_LEVELS.map((option) => (
                <label key={option.value} className={editing ? 'cursor-pointer' : 'cursor-default'}>
                  <input
                    type="radio"
                    name="educationLevel"
                    value={option.value}
                    checked={level === option.value}
                    onChange={() => chooseLevel(option.value)}
                    disabled={!editing}
                    className="peer sr-only"
                  />
                  <span
                    className={`flex h-full flex-col justify-center rounded-xl border p-3 text-center transition-all peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:ring-1 peer-checked:ring-brand-500 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/50 peer-focus-visible:ring-offset-1 ${
                      editing
                        ? 'border-line-200 bg-surface hover:border-line-300 hover:bg-surface-50'
                        : 'border-line-200 bg-surface-50 opacity-95'
                    }`}
                  >
                    <span className="text-sm leading-tight font-bold text-ink-900">
                      {option.label}
                    </span>
                    <span className="mt-0.5 text-xs leading-tight text-ink-500">
                      {option.note}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Only the fields that belong to the chosen level. Keyed on the level
              so switching between them animates in rather than silently swapping
              the labels under the student's cursor. */}
          {(isSchool || isCourse || isWorking) && (
            <div key={level} className="animate-fade-in mt-6 border-t border-line-100 pt-5">
              {isSchool && (
                <Section>
                  <SuggestField
                    label="Current class"
                    value={form.currentClass || ''}
                    onChange={set('currentClass')}
                    disabled={!editing}
                    // Only the classes this level contains — a Middle School
                    // student was previously offered Class 12.
                    options={classesFor(level)}
                    placeholder={`e.g. ${classesFor(level)[0]}`}
                    required
                    error={errorFor('currentClass')}
                  />
                  {/* Shown for every school level, not only below Class 10. A
                      Class 11 student sits board exams too, and the syllabus
                      differs by board all the way down — so the roadmap needs
                      it wherever a class is being asked for. */}
                  {/* One field in this slot, not two. Up to Class 10 what
                      matters is the board; at 11–12 the subject combination is
                      the thing that decides everything downstream, so it takes
                      the board's place rather than sitting beside it. */}
                  {isHigherSecondary ? (
                    <SuggestField
                      label="Stream"
                      value={form.stream || ''}
                      onChange={set('stream')}
                      disabled={!editing}
                      options={STREAMS}
                      placeholder="e.g. Science — PCMB"
                    />
                  ) : (
                    <SuggestField
                      label="Board"
                      value={form.board || ''}
                      onChange={set('board')}
                      disabled={!editing}
                      options={BOARDS}
                      placeholder="e.g. CBSE"
                    />
                  )}
                </Section>
              )}

              {isCourse && (
                <Section>
                  <SuggestField
                    label="Degree / diploma"
                    value={form.degree || ''}
                    onChange={set('degree')}
                    disabled={!editing}
                    // The list follows the chosen level, so a postgraduate is
                    // not offered B.Tech as their current course.
                    options={coursesFor(level)}
                    placeholder="e.g. BCA"
                    required
                    error={errorFor('degree')}
                  />
                  <SuggestField
                    label="Branch / specialisation"
                    value={form.specialization || ''}
                    onChange={set('specialization')}
                    disabled={!editing}
                    options={SPECIALISATIONS}
                    placeholder="e.g. Computer Science"
                    required
                    error={errorFor('specialization')}
                  />
                  <SuggestField
                    label="Current year"
                    value={form.currentYear || ''}
                    onChange={set('currentYear')}
                    disabled={!editing}
                    options={YEARS}
                    placeholder="e.g. 2nd Year"
                    required
                    error={errorFor('currentYear')}
                  />
                  <SuggestField
                    label="Semester"
                    value={form.semester || ''}
                    onChange={set('semester')}
                    disabled={!editing}
                    options={SEMESTERS}
                    placeholder="Optional"
                  />
                </Section>
              )}

              {isWorking && (
                <Section>
                  <SuggestField
                    label="Current job title"
                    value={form.currentJob || ''}
                    onChange={set('currentJob')}
                    disabled={!editing}
                    options={JOB_TITLES}
                    placeholder="e.g. QA Engineer"
                    required
                    error={errorFor('currentJob')}
                  />
                  <SuggestField
                    label="Years of experience"
                    // Typed answers go through a number field, because the API
                    // stores this as a number and "about five" would be rejected
                    // on save with nothing on screen to explain why.
                    type="number"
                    value={form.experience === null || form.experience === undefined ? '' : String(form.experience)}
                    onChange={set('experience')}
                    disabled={!editing}
                    options={EXPERIENCE_YEARS}
                    placeholder="e.g. 3"
                    required
                    error={errorFor('experience')}
                  />
                </Section>
              )}
            </div>
          )}
        </Card>

        {/* ---------------------------------------------------------------
            Goal
        --------------------------------------------------------------- */}
        <Card className="animate-fade-in-up">
          <CardHeader
            icon={Compass}
            title="Where you want to get to"
            subtitle="Everything in the app is aimed at this."
            accent="brand"
          />
          <Section>
            <SuggestField
              label="Desired career goal"
              value={form.careerGoal || ''}
              onChange={set('careerGoal')}
              disabled={!editing}
              options={CAREER_GOALS}
              placeholder="e.g. Software Engineer"
              required
              error={goalMissing ? 'Your roadmap cannot be built without this.' : undefined}
            />
            <SuggestField
              label="Dream company"
              value={form.dreamCompany || ''}
              onChange={set('dreamCompany')}
              disabled={!editing}
              options={COMPANIES}
              placeholder="Optional"
            />
          </Section>
        </Card>

        {/* ---------------------------------------------------------------
            Location
        --------------------------------------------------------------- */}
        <Card className="animate-fade-in-up">
          <CardHeader
            icon={MapPin}
            title="Where you are"
            accent="brand"
          />
          <Section>
            <SuggestField
              label="Country"
              value={form.country || ''}
              onChange={set('country')}
              disabled={!editing}
              options={COUNTRIES}
              placeholder="e.g. India"
            />
            <SuggestField
              label="State"
              value={form.state || ''}
              onChange={set('state')}
              disabled={!editing}
              // Only India has a list here. Elsewhere this falls back to a
              // dropdown holding nothing but "Other", which is honest: it says
              // "type yours" rather than implying there are no valid answers.
              options={statesFor(form.country)}
              placeholder="e.g. Karnataka"
            />
          </Section>
        </Card>

        {/* ---------------------------------------------------------------
            What happens next.

            Rebuilding sits apart from saving, and says what it costs. The two
            used to be one button, so there was no way to correct a typo without
            destroying your planner.
        --------------------------------------------------------------- */}
        {/* Deliberately NOT a <Card>. Card hardcodes `bg-surface`, and whether a
            `bg-amber-50` passed through className beats it depends on which one
            Tailwind emits later in the stylesheet — not on the order they are
            written here. It lost, and the warning rendered plain white. */}
        <section className="animate-fade-in-up rounded-2xl border border-amber-300 bg-amber-50 p-6 shadow-card">
          <div className="flex gap-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-ink-900">Rebuilding starts you over</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">
                Saving keeps everything you have done. Rebuilding generates a fresh roadmap from
                these details and <strong className="font-semibold">deletes your current roadmap,
                every task on your planner, your skill progress and your recommendations</strong>.
                Change it only when your course or your goal has genuinely changed.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                loading={busy === 'rebuild'}
                loadingText="Building your roadmap…"
                disabled={busy !== null || !editing}
                onClick={handleRebuild}
                className="mt-3.5"
              >
                Save &amp; rebuild roadmap
              </Button>
            </div>
          </div>
        </section>
      </form>

      {/* ---------------------------------------------------------------
          The save bar, which appears only once something has changed.

          Outside the form so it is not re-rendered by every keystroke's layout
          pass, and fixed rather than sticky so it stays put on a long form.
      --------------------------------------------------------------- */}
      {editing && isDirty && (
        <div className="animate-fade-in-up fixed inset-x-0 bottom-0 z-40 border-t border-line-200 bg-surface/95 px-4 py-3 shadow-[0_-4px_16px_-6px_rgb(16_24_40/0.12)] backdrop-blur md:left-64">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink-700">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-500 align-middle" />
              {changed.length} unsaved {changed.length === 1 ? 'change' : 'changes'}
            </p>
            <div className="flex gap-2.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={Undo2}
                disabled={busy !== null}
                onClick={() => setForm(saved)}
              >
                Discard
              </Button>
              <Button
                type="button"
                size="sm"
                icon={Save}
                loading={busy === 'save'}
                loadingText="Saving…"
                disabled={busy !== null}
                onClick={handleSave}
              >
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
