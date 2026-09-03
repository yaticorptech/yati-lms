import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Search, Sparkles } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/ui/Button';
import api from '../services/api';
import SuggestField from '../components/common/SuggestField';
import GeneratingRoadmap from '../components/journey/GeneratingRoadmap';
import {
  CAREER_GOALS,
  CAREER_GOALS_BY_FIELD,
  CAREER_OTHER,
  COMPANIES,
  COUNTRIES,
  EXPERIENCE_YEARS,
  JOB_TITLES,
  SEMESTERS,
  SPECIALISATIONS,
  YEARS,
  classesFor,
  coursesFor,
  statesFor
} from '../utils/profileOptions';

const EDUCATION_LEVELS = [
  'Primary School (Class 1–5)',
  'Middle School (Class 6–8)',
  'High School (Class 9–10)',
  'Higher Secondary (Class 11–12)',
  'Diploma',
  'Undergraduate',
  'Postgraduate',
  'Working Professional'
];

/**
 * The five steps, named.
 *
 * They were "Step 3 of 5" and a bar — which says how much is left but never
 * what any of it asks, so the student cannot tell whether they are two
 * questions from the end or two sections. The labels are only a description of
 * the steps that already exist; nothing was added, merged or reordered.
 */
/**
 * A visual anchor per career field.
 *
 * `CAREER_GOALS_BY_FIELD` already groups all 170 careers; this only puts a face
 * on each group so the most important question in onboarding can be browsed
 * rather than typed at. Every key below is a field that already exists — a
 * field with no entry here simply shows no emoji.
 */
const FIELD_EMOJI = {
  'Software & IT': '💻',
  'Data & AI': '📊',
  'Security': '🔐',
  'Design & Product': '🎨',
  'Medicine & Health': '🩺',
  'Core Engineering': '⚙️',
  'Science & Research': '🔬',
  'Agriculture & Environment': '🌾',
  'Finance & Commerce': '💰',
  'Business & Management': '📈',
  'Law & Government': '⚖️',
  'Defence & Aviation': '✈️',
  'Education': '🎓',
  'Architecture & Planning': '🏛️',
  'Media & Creative': '🎬',
  'Service & Social': '🍳'
};

const STEPS = [
  { label: 'You', emoji: '👤' },
  { label: 'Your stage', emoji: '🎓' },
  { label: 'Your goal', emoji: '🎯' },
  { label: 'Dream company', emoji: '🏢' },
  { label: 'Location', emoji: '📍' }
];

/** The heading and the line under it for each step. */
const PROMPTS = {
  1: {
    title: 'Where are you right now?',
    hint: 'Everything else is built on this — the roadmap starts at your stage, not at the beginning.'
  },
  2: {
    title: 'Tell us a bit more',
    hint: 'The specifics decide which routes are actually open to you.'
  },
  3: {
    title: 'What do you want to become?',
    hint: "Pick the closest match. Your whole path is mapped backwards from this."
  },
  4: {
    title: 'Anywhere you dream of working?',
    hint: 'Optional — but if you name one, your roadmap aims at what it actually hires for.'
  },
  5: {
    title: 'Where are you based?',
    hint: 'Optional — this is what lets us name real colleges, exams and employers near you.'
  }
};


export default function Onboarding() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    educationLevel: '',
    currentClass: '',
    degree: '',
    specialization: '',
    currentYear: '',
    semester: '',
    currentJob: '',
    experience: '',
    careerGoal: '',
    dreamCompany: '',
    country: '',
    state: ''
  });
  const [error, setError] = useState(null);
  // Set when the student picks "Other" and types their own. Kept apart from
  // formData.careerGoal so switching back to a listed career discards it
  // rather than leaving a stale answer behind.
  const [careerIsOther, setCareerIsOther] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  // Which career field's cards are open. Purely presentational — the answer
  // saved is still whatever `formData.careerGoal` holds.
  const [openField, setOpenField] = useState(null);
  // Generation finished. The old flow navigated away the instant the request
  // resolved, so the one genuinely triumphant moment in the product — five
  // questions answered and a whole roadmap built — was a page transition the
  // student never saw.
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Check if user already has a goal
    const checkExistingGoal = async () => {
      try {
        await api.get('/goals');
        navigate('/career');
      } catch {
        // 404 means no goal, which is expected
      }
    };
    if (user) checkExistingGoal();
  }, [user, navigate]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  /**
   * A class only means something under the level it belongs to, so an answer
   * the new level does not contain is dropped rather than carried forward.
   */
  const chooseLevel = (value) => {
    const isSchool = value.includes('School') || value.includes('Secondary');
    const isCourse = ['Undergraduate', 'Postgraduate', 'Diploma'].includes(value);
    const isJob = value === 'Working Professional';
    const keep = (condition, current) => (condition ? current : '');

    setFormData(prev => ({
      ...prev,
      educationLevel: value,
      // Only a class the new level actually contains.
      currentClass: keep(isSchool && classesFor(value).includes(prev.currentClass), prev.currentClass),
      // Course details belong to a course, job details to a job. Going back a
      // step and switching level otherwise leaves the roadmap prompt holding a
      // degree that the student never claimed under this level.
      degree: keep(isCourse && coursesFor(value).includes(prev.degree), prev.degree),
      specialization: keep(isCourse, prev.specialization),
      currentYear: keep(isCourse, prev.currentYear),
      semester: keep(isCourse, prev.semester),
      currentJob: keep(isJob, prev.currentJob),
      experience: keep(isJob, prev.experience)
    }));
  };

  /** A state belongs to a country, so changing the country drops a stale one. */
  const chooseCountry = (value) => {
    setFormData(prev => ({
      ...prev,
      country: value,
      state: statesFor(value).includes(prev.state) ? prev.state : ''
    }));
  };

  /**
   * Choosing from the list, or opening the free-text escape hatch.
   *
   * The sentinel is never stored as the answer — picking it clears the goal and
   * waits for the student to say what they mean.
   */
  const handleCareerSelect = (value) => {
    if (value === CAREER_OTHER) {
      setCareerIsOther(true);
      handleInputChange('careerGoal', '');
      return;
    }
    setCareerIsOther(false);
    handleInputChange('careerGoal', value);
  };


  const nextStep = () => {
    // Basic validation per step
    setError(null);
    if (step === 1 && !formData.educationLevel) return setError('Please select an education level.');
    if (step === 2) {
      const ed = formData.educationLevel;
      if ((ed.includes('School') || ed.includes('Secondary')) && !formData.currentClass) return setError('Please select your class.');
      if ((ed === 'Undergraduate' || ed === 'Postgraduate') && (!formData.degree || !formData.specialization || !formData.currentYear)) {
        return setError('Please fill all required details.');
      }
      if (ed === 'Working Professional' && (!formData.currentJob || !formData.experience)) {
        return setError('Please enter your job details.');
      }
    }
    if (step === 3 && !formData.careerGoal) {
      return setError(
        careerIsOther
          ? 'Please tell us which career you want.'
          : 'Please pick your career goal from the list.'
      );
    }

    if (step < 5) setStep(s => s + 1);
  };
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  const handleSubmit = async () => {
    try {
      setError(null);
      setIsGenerating(true);
      await api.post('/goals', formData);
      await api.post('/roadmap/generate');
      setIsGenerating(false);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
      setIsGenerating(false);
    }
  };

  // 🎉 The payoff. Five questions in, a whole roadmap out — worth one screen
  // before the student is dropped into it. Uses the existing navigation; the
  // roadmap is already saved by the time this renders.
  if (done) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4 py-12">
        <div className="fp-journey-gradient animate-pop-in relative w-full max-w-2xl overflow-hidden rounded-3xl p-8 text-center text-white shadow-float sm:p-12">
          <div aria-hidden className="fp-stars pointer-events-none absolute inset-0" />
          <div
            aria-hidden
            className="fp-float pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-fuchsia-500/30 blur-3xl"
          />
          <div
            aria-hidden
            className="fp-float-slow pointer-events-none absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-cyan-400/25 blur-3xl"
          />

          <div className="relative">
            <p className="animate-badge-burst text-6xl" aria-hidden>🎉</p>
            <h1 className="mt-5 text-3xl leading-tight font-black sm:text-4xl">
              Your career path is ready!
            </h1>
            <p className="mt-3 leading-relaxed text-journey-100">
              Every stage between where you are now and{' '}
              <span className="font-black text-white">{formData.careerGoal}</span> is mapped —
              the classes, the exams, the steps inside each one.
            </p>

            <button
              type="button"
              onClick={() => navigate('/career/roadmap')}
              className="fp-sweep fp-press group relative mt-8 inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-white px-7 py-3.5 text-sm font-black text-journey-800 shadow-lg shadow-journey-900/30 transition-transform hover:scale-[1.03]"
            >
              🗺️ Explore my roadmap
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Generation takes about ten seconds and is the payoff for the five steps
  // just answered. It takes the whole panel rather than shrinking to a spinner
  // inside a button the student has stopped looking at.
  if (isGenerating) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4 py-12">
        <div className="w-full max-w-2xl">
          <GeneratingRoadmap />
        </div>
      </div>
    );
  }

  const prompt = PROMPTS[step];

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="fp-journey-gradient relative mb-5 overflow-hidden rounded-3xl p-6 text-center text-white shadow-float sm:p-8">
          <div aria-hidden className="fp-stars pointer-events-none absolute inset-0" />
          <div
            aria-hidden
            className="fp-float pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full bg-fuchsia-500/25 blur-3xl"
          />
          <div className="relative">
            <p className="text-[0.68rem] font-black tracking-[0.18em] text-journey-300 uppercase">
              Build your future
            </p>
            <h1 className="mt-2 text-2xl leading-tight font-black sm:text-4xl">
              🚀 Five questions, then your roadmap
            </h1>
            <p className="mt-2.5 text-sm text-journey-100">
              Answer these and your mentor maps every stage to your goal.
            </p>
          </div>
        </div>

        {/* ---- The five steps, named and walked through ----
            Numbers alone said how far along the student was; the labels say
            what is actually being asked, so "two to go" stops being a guess.
            Compressed to the current step's name on a phone, where five labels
            in a row do not fit and would wrap into a paragraph. ---- */}
        <ol
          className="mb-6 flex flex-wrap items-center gap-x-1.5 gap-y-2 sm:gap-x-2"
          aria-label={`Step ${step} of 5: ${STEPS[step - 1].label}`}
        >
          {STEPS.map((entry, index) => {
            const number = index + 1;
            const isDone = number < step;
            const active = number === step;

            return (
              <li key={entry.label} className="flex shrink-0 items-center gap-2">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black tabular-nums transition-all ${
                    isDone
                      ? 'fp-done-gradient text-white shadow-sm shadow-emerald-500/30'
                      : active
                        ? 'bg-gradient-to-br from-journey-600 to-indigo-600 text-white shadow-md shadow-journey-600/30'
                        : 'bg-surface-100 text-ink-400'
                  }`}
                >
                  {isDone ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : active ? (
                    <span className="text-base" aria-hidden>{entry.emoji}</span>
                  ) : (
                    `0${number}`
                  )}
                </span>

                {/* The name shows for the step being answered on every screen,
                    and for the rest only where there is room. */}
                <span
                  className={`text-xs font-black tracking-wide whitespace-nowrap uppercase ${
                    active ? 'text-journey-700' : 'hidden text-ink-400 lg:inline'
                  }`}
                >
                  {entry.label}
                </span>

                {number < STEPS.length && (
                  <span
                    aria-hidden
                    className={`hidden h-0.5 w-3 shrink-0 rounded-full sm:block ${
                      isDone ? 'bg-emerald-400' : 'bg-line-200'
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>

      <div className="animate-fade-in-up w-full rounded-2xl border border-line-200/80 bg-surface p-5 shadow-float sm:p-8">
        <div className="mb-7">
          <h2 className="text-xl leading-snug font-black text-ink-900 sm:text-2xl">
            {prompt.title}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{prompt.hint}</p>
        </div>

        {error && (
          <div
            role="alert"
            className="animate-scale-in mb-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1 — the eight levels as things to pick rather than a dropdown
            to open. Same eight values, same handler; a select hides every
            option behind a click and makes the first question of the product
            feel like a form to fill in. Radios under the hood, so keyboard and
            screen reader behaviour is the native one. */}
        {step === 1 && (
          <fieldset className="grid gap-2.5 sm:grid-cols-2">
            <legend className="sr-only">Current education level</legend>
            {EDUCATION_LEVELS.map((lvl) => {
              const selected = formData.educationLevel === lvl;
              return (
                <label
                  key={lvl}
                  className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm font-semibold transition-all ${
                    selected
                      ? 'border-brand-500 bg-brand-50 text-link-strong ring-1 ring-brand-200'
                      : 'border-line-200 bg-surface text-ink-700 hover:border-brand-300 hover:bg-surface-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="educationLevel"
                    value={lvl}
                    checked={selected}
                    onChange={() => chooseLevel(lvl)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      selected ? 'border-brand-600 bg-brand-600' : 'border-line-300'
                    }`}
                  >
                    {selected && <Check className="h-3 w-3 text-white" strokeWidth={3.5} />}
                  </span>
                  <span className="min-w-0">{lvl}</span>
                </label>
              );
            })}
          </fieldset>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            {(formData.educationLevel.includes('School') || formData.educationLevel.includes('Secondary')) && (
              /* Picked from a list rather than typed, for the same reason as the
                 career goal below: "10th", "Class X" and "class 10" all reached
                 the roadmap prompt as different answers. Only the classes the
                 chosen level actually contains are offered — a Middle School
                 student could otherwise say Class 12. */
              <SuggestField
                label="Current Class"
                value={formData.currentClass}
                onChange={(value) => handleInputChange('currentClass', value)}
                options={classesFor(formData.educationLevel)}
                placeholder={`e.g. ${classesFor(formData.educationLevel)[0]}`}
                required
              />
            )}
            
            {(formData.educationLevel === 'Undergraduate' || formData.educationLevel === 'Postgraduate' || formData.educationLevel === 'Diploma') && (
              <>
                {/* The course list follows the level: diplomas for Diploma,
                    master's for Postgraduate, bachelor's otherwise. */}
                <SuggestField
                  label="Degree / Diploma Name"
                  value={formData.degree}
                  onChange={(value) => handleInputChange('degree', value)}
                  options={coursesFor(formData.educationLevel)}
                  placeholder={`e.g. ${coursesFor(formData.educationLevel)[0]}`}
                  required
                />
                <SuggestField
                  label="Branch / Specialization"
                  value={formData.specialization}
                  onChange={(value) => handleInputChange('specialization', value)}
                  options={SPECIALISATIONS}
                  placeholder="e.g. Computer Science"
                  required
                />
                <SuggestField
                  label="Current Year"
                  value={formData.currentYear}
                  onChange={(value) => handleInputChange('currentYear', value)}
                  options={YEARS}
                  placeholder="e.g. 3rd Year"
                  required
                />
                <SuggestField
                  label="Semester (Optional)"
                  value={formData.semester}
                  onChange={(value) => handleInputChange('semester', value)}
                  options={SEMESTERS}
                  placeholder="e.g. 5th Semester"
                />
              </>
            )}

            {formData.educationLevel === 'Working Professional' && (
              <>
                <SuggestField
                  label="Current Job Title"
                  value={formData.currentJob}
                  onChange={(value) => handleInputChange('currentJob', value)}
                  options={JOB_TITLES}
                  placeholder="e.g. Frontend Developer"
                  required
                />
                {/* Left as text, not number: the list is what should be typed
                    into, and a number input rejects the keystrokes that filter
                    it. The value is still a plain year count. */}
                <SuggestField
                  label="Years of Experience"
                  value={formData.experience}
                  onChange={(value) => handleInputChange('experience', value)}
                  options={EXPERIENCE_YEARS}
                  placeholder="e.g. 3"
                  required
                />
              </>
            )}
          </div>
        )}

        {/* Step 3 — the most important answer in the product, so it stops
            being a text box.

            All 170 careers are already grouped by field in profileOptions;
            this puts a face on each group and lets a student browse to theirs
            instead of having to know its exact name first. Nothing is invented
            — every chip is an existing field and every card an existing
            career. The search box stays, because browsing sixteen fields is
            slower than typing when you already know the answer, and "Other"
            still lives inside it. */}
        {step === 3 && (
          <div className="space-y-5">
            {/* What they have picked, if anything. A choice this important
                should be visible without scrolling back to find it. */}
            {formData.careerGoal && !careerIsOther && (
              <div className="fp-journey-gradient animate-scale-in flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-white sm:p-5">
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-black tracking-[0.16em] text-journey-200 uppercase">
                    Your goal
                  </p>
                  <p className="mt-1 text-lg font-black sm:text-xl">🎯 {formData.careerGoal}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('careerGoal', '')}
                  className="fp-press shrink-0 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-black ring-1 ring-white/20 ring-inset transition-colors hover:bg-white/25"
                >
                  Change
                </button>
              </div>
            )}

            {!formData.careerGoal && !careerIsOther && (
              <>
                <div>
                  <p className="mb-2.5 text-[0.68rem] font-black tracking-[0.14em] text-ink-400 uppercase">
                    Browse by field
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(CAREER_GOALS_BY_FIELD).map((field) => {
                      const open = openField === field;
                      return (
                        <button
                          key={field}
                          type="button"
                          onClick={() => setOpenField(open ? null : field)}
                          aria-pressed={open}
                          className={`fp-press inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition-all ${
                            open
                              ? 'bg-gradient-to-r from-journey-600 to-indigo-600 text-white shadow-md shadow-journey-600/25'
                              : 'bg-surface-50 text-ink-700 ring-1 ring-line-200 ring-inset hover:bg-journey-50 hover:text-journey-700'
                          }`}
                        >
                          <span aria-hidden>{FIELD_EMOJI[field]}</span>
                          {field}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {openField && (
                  <div className="animate-fade-in-up grid gap-2.5 sm:grid-cols-2">
                    {CAREER_GOALS_BY_FIELD[openField].map((career) => (
                      <button
                        key={career}
                        type="button"
                        onClick={() => handleCareerSelect(career)}
                        className="fp-lift fp-press flex min-h-14 items-center gap-3 rounded-2xl border border-line-200 bg-surface p-3.5 text-left text-sm font-bold text-ink-800 transition-colors hover:border-journey-300 hover:bg-journey-50"
                      >
                        <span
                          aria-hidden
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-journey-50 text-base ring-1 ring-journey-100 ring-inset"
                        >
                          {FIELD_EMOJI[openField]}
                        </span>
                        <span className="min-w-0">{career}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Chosen from a list rather than typed. Free text gave the roadmap
                prompt "sofware engg", "SDE" and "Software Engineer" as three
                different careers, and made the admin breakdown of what students
                want unreadable. The list opens in full on focus and filters as
                they type, so browsing and searching are the same gesture. */}
            <div className="rounded-2xl border border-line-200 bg-surface-50/60 p-4">
              <p className="mb-2.5 flex items-center gap-1.5 text-[0.68rem] font-black tracking-[0.14em] text-ink-400 uppercase">
                <Search className="h-3.5 w-3.5" />
                {formData.careerGoal && !careerIsOther
                  ? 'Or pick a different one'
                  : `Or search all ${CAREER_GOALS.length}`}
              </p>
              <SuggestField
                label="Search or select your career"
                value={careerIsOther ? CAREER_OTHER : formData.careerGoal}
                onChange={handleCareerSelect}
                options={[...CAREER_GOALS, CAREER_OTHER]}
                placeholder="Start typing, or pick from the list"
                required
              />
            </div>

            {careerIsOther && (
              <Input
                label="What would you like to become?"
                value={formData.careerGoal}
                onChange={(e) => handleInputChange('careerGoal', e.target.value)}
                placeholder="e.g. Sommelier"
                hint="We will build your roadmap around this."
                required
                autoFocus
              />
            )}
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="space-y-4">
            <SuggestField
              label="Company Name"
              value={formData.dreamCompany}
              onChange={(value) => handleInputChange('dreamCompany', value)}
              options={COMPANIES}
              placeholder="e.g. Google, ISRO, Indian Army"
            />
          </div>
        )}

        {/* Step 5 */}
        {step === 5 && (
          <div className="space-y-4">
            <SuggestField
              label="Country"
              value={formData.country}
              onChange={chooseCountry}
              options={COUNTRIES}
              placeholder="e.g. India"
            />
            <SuggestField
              label="State"
              value={formData.state}
              onChange={(value) => handleInputChange('state', value)}
              // Only India has a list. Elsewhere the field stays a plain text
              // box rather than showing an empty dropdown, which would read as
              // "no valid answers" instead of "type yours".
              options={statesFor(formData.country)}
              placeholder="e.g. Maharashtra"
            />
          </div>
        )}

        <div className="mt-8 flex justify-between gap-3">
          {step > 1 ? (
            <Button variant="secondary" icon={ArrowLeft} onClick={prevStep} className="shrink-0">
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <Button
              onClick={nextStep}
              className="shrink-0 bg-gradient-to-r from-journey-600 to-indigo-600 hover:from-journey-700 hover:to-indigo-700"
            >
              Next
            </Button>
          ) : (
            /* The generating label is long, so let this button shrink and centre */
            <Button
              variant="accent"
              icon={Sparkles}
              onClick={handleSubmit}
              loading={isGenerating}
              loadingText="Generating roadmap (about 10s)…"
              className="min-w-0 bg-gradient-to-r from-journey-600 via-fuchsia-600 to-indigo-600"
            >
              ✨ Build my roadmap
            </Button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
