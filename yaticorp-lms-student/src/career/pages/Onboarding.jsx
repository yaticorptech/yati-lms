import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/ui/Button';
import api from '../services/api';
import SuggestField from '../components/common/SuggestField';
import {
  CAREER_GOALS,
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
      navigate('/career/roadmap');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 py-12">
      <div className="animate-fade-in-up w-full max-w-2xl rounded-xl border border-line-200/80 bg-surface p-5 shadow-float sm:p-8">
        <div className="mb-8">
          <h1 className="mb-1 text-2xl font-bold text-ink-900 sm:text-3xl">Build Your Roadmap</h1>
          <p className="text-ink-500">Step {step} of 5</p>
          <div
            className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-surface-200"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={5}
            aria-label={`Onboarding progress: step ${step} of 5`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
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

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">What is your current education level?</h2>
            <select
              value={formData.educationLevel}
              onChange={(e) => chooseLevel(e.target.value)}
              className="w-full rounded-lg border border-line-300 bg-surface px-4 py-3 text-ink-900 transition-all hover:border-slate-400 focus:outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/40"
            >
              <option value="">Select Level</option>
              {EDUCATION_LEVELS.map(lvl => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Tell us more about your education/job.</h2>
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

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">What is your desired career goal?</h2>

            {/* Chosen from a list rather than typed. Free text gave the roadmap
                prompt "sofware engg", "SDE" and "Software Engineer" as three
                different careers, and made the admin breakdown of what students
                want unreadable. The list opens in full on focus and filters as
                they type, so browsing and searching are the same gesture. */}
            <SuggestField
              label="Search or select your career"
              value={careerIsOther ? CAREER_OTHER : formData.careerGoal}
              onChange={handleCareerSelect}
              options={[...CAREER_GOALS, CAREER_OTHER]}
              placeholder="Start typing, or pick from the list"
              hint={careerIsOther ? undefined : `${CAREER_GOALS.length} careers — type to narrow them down`}
              required
            />

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
            <h2 className="text-xl font-semibold">Dream Company or Organization <span className="text-sm font-normal text-ink-400">(Optional)</span></h2>
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
            <h2 className="text-xl font-semibold">Location <span className="text-sm font-normal text-ink-400">(Optional)</span></h2>
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
            <Button onClick={nextStep} className="shrink-0">
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
              className="min-w-0"
            >
              Submit &amp; Generate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
