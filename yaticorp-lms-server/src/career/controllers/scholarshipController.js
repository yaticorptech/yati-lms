const Scholarship = require('../models/Scholarship');
const Goal = require('../models/Goal');
const Roadmap = require('../models/Roadmap');
const ScholarshipProfile = require('../models/ScholarshipProfile');
const { generateScholarshipsFromAI } = require('../services/geminiService');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');

// @desc    The student's scholarship list, or an empty one if none is built yet
// @route   GET /api/career/scholarships
// @access  Private
const getScholarships = async (req, res) => {
  try {
    const [doc, goal, profile] = await Promise.all([
      Scholarship.findOne({ userId: req.user._id }).lean(),
      Goal.findOne({ userId: req.user._id }).select('careerGoal').lean(),
      ScholarshipProfile.findOne({ userId: req.user._id }).select('_id').lean()
    ]);
    res.status(200).json({
      items: doc?.items || [],
      generatedAt: doc?.generatedAt || null,
      builtFor: doc?.builtFor || '',
      hasGoal: !!goal,
      /*
       * Whether the eligibility questions have been answered at all. The page
       * holds the list back until they have, because a list built without a
       * category or an income band is missing precisely the reserved schemes
       * a student is most likely to actually win.
       *
       * Answering them all "prefer not to say" still counts: the point is that
       * the student was asked, not that they disclosed.
       */
      hasProfile: !!profile
    });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @desc    Build (or rebuild) the student's scholarship list with the AI
// @route   POST /api/career/scholarships/generate
// @access  Private
const generateScholarships = async (req, res) => {
  try {
    const goal = await Goal.findOne({ userId: req.user._id });
    if (!goal) {
      return res.status(400).json({ message: 'Set up your Career Path goal first.' });
    }
    const [roadmap, profile] = await Promise.all([
      Roadmap.findOne({ userId: req.user._id }),
      ScholarshipProfile.findOne({ userId: req.user._id }).lean()
    ]);
    const data = await generateScholarshipsFromAI(goal, roadmap, profile);
    const items = (Array.isArray(data?.scholarships) ? data.scholarships : [])
      .filter((s) => s && s.name)
      .map((s) => ({
        name: String(s.name).trim(),
        provider: s.provider ? String(s.provider).trim() : '',
        amount: s.amount ? String(s.amount).trim() : '',
        eligibility: s.eligibility ? String(s.eligibility).trim() : '',
        deadline: s.deadline ? String(s.deadline).trim() : '',
        link: s.link && /^https?:\/\//i.test(String(s.link)) ? String(s.link).trim() : '',
        why: s.why ? String(s.why).trim() : ''
      }));

    const doc = await Scholarship.findOneAndUpdate(
      { userId: req.user._id },
      { items, builtFor: goal.careerGoal || '', generatedAt: new Date() },
      { upsert: true, new: true }
    ).lean();

    /*
     * `hasProfile` has to be here as well as on the GET. The page replaces its
     * state with whatever this returns, so leaving the flag out made the gate
     * re-arm the instant a list was built and showed the student the form
     * again, over and over.
     */
    res.status(201).json({
      items: doc.items,
      generatedAt: doc.generatedAt,
      builtFor: doc.builtFor,
      hasGoal: true,
      hasProfile: !!profile
    });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

/** The only values the form may set. Anything else is dropped. */
const CATEGORY = ['', 'General', 'OBC', 'SC', 'ST', 'EWS'];
const MINORITY = ['', 'Not applicable', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Parsi', 'Other'];
const INCOME = ['', 'Below ₹1 lakh', '₹1–2.5 lakh', '₹2.5–5 lakh', '₹5–8 lakh', 'Above ₹8 lakh'];
const GENDER = ['', 'Female', 'Male', 'Other', 'Prefer not to say'];
const INSTITUTION = ['', 'Government', 'Government-aided', 'Private', 'Not studying right now'];
const CIRCUMSTANCES = [
  'Single girl child',
  'Orphan',
  'Ward of ex-serviceman',
  'Farmer family',
  'First in family to study',
  'Parent is a construction or unorganised worker'
];

/** Everything the form offers, so the client never hard-codes these lists. */
const getProfileOptions = (req, res) => {
  res.json({
    category: CATEGORY.filter(Boolean),
    minority: MINORITY.filter(Boolean),
    familyIncome: INCOME.filter(Boolean),
    gender: GENDER.filter(Boolean),
    institutionType: INSTITUTION.filter(Boolean),
    circumstances: CIRCUMSTANCES
  });
};

// @route GET /api/career/scholarships/profile
const getProfile = async (req, res) => {
  try {
    const profile = await ScholarshipProfile.findOne({ userId: req.user._id }).lean();
    res.json(profile || {});
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @route PUT /api/career/scholarships/profile
const saveProfile = async (req, res) => {
  try {
    const b = req.body || {};
    const pick = (list, value) => (list.includes(value) ? value : '');
    const patch = {
      userId: req.user._id,
      category: pick(CATEGORY, b.category),
      minority: pick(MINORITY, b.minority),
      familyIncome: pick(INCOME, b.familyIncome),
      gender: pick(GENDER, b.gender),
      institutionType: pick(INSTITUTION, b.institutionType),
      disability: Boolean(b.disability),
      disabilityPercent: Math.min(100, Math.max(0, Number(b.disabilityPercent) || 0)),
      lastScore: String(b.lastScore || '').trim().slice(0, 20),
      circumstances: Array.isArray(b.circumstances) ? b.circumstances.filter((c) => CIRCUMSTANCES.includes(c)) : []
    };
    const saved = await ScholarshipProfile.findOneAndUpdate({ userId: req.user._id }, patch, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }).lean();
    res.json(saved);
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = { getScholarships, generateScholarships, getProfile, saveProfile, getProfileOptions };
