const Goal = require('../models/Goal');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');

// The Goal schema requires different fields depending on the education level —
// a class for a school student, a degree for an undergraduate, a job title and
// years of experience for someone already working. When one is missing Mongoose
// says so in its own words: "Goal validation failed: currentJob: Path
// `currentJob` is required." That went straight to the student as a 500, which
// reads as a broken app rather than an unanswered question, and names a
// database path rather than anything they can see on their screen.
const FIELD_NAMES = {
  educationLevel: 'education level',
  currentClass: 'current class',
  degree: 'degree',
  specialization: 'branch or specialisation',
  currentYear: 'current year',
  currentJob: 'current job title',
  experience: 'years of experience',
  careerGoal: 'career goal'
};

const readable = (paths) => {
  const names = paths.map((p) => FIELD_NAMES[p] || p);
  if (names.length < 2) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

/**
 * Answer a failed save in words a student can act on. Anything that is not a
 * validation problem is still a server fault and still a 500.
 */
const sendGoalError = (res, error) => {
  if (error.name === 'ValidationError') {
    const paths = Object.keys(error.errors);
    // A value that could not be read as a number arrives here too, wrapped in
    // the same error. "Please fill in your years of experience" is the wrong
    // thing to say to someone who filled it in with "about five".
    const unreadable = paths.filter((p) => error.errors[p].name === 'CastError');
    const blank = paths.filter((p) => !unreadable.includes(p));

    const parts = [];
    if (blank.length > 0) parts.push(`fill in your ${readable(blank)}`);
    if (unreadable.length > 0) parts.push(`give your ${readable(unreadable)} as a number`);

    return res.status(400).json({
      message: `Please ${parts.join(', and ')}.`,
      fields: paths
    });
  }
  if (error.name === 'CastError') {
    return res.status(400).json({
      message: `Please give your ${FIELD_NAMES[error.path] || error.path} as a number.`,
      fields: [error.path]
    });
  }
  return res.status(statusFor(error)).json(aiAwareBody(error));
};

// @desc    Create a new goal for the user
// @route   POST /api/goals
// @access  Private
/**
 * The fields a student may change on their own goal.
 *
 * Everything createGoal accepts, and nothing else. updateGoal used to be
 * `Object.assign(goal, req.body)`, which writes whatever the request contains —
 * including `userId`. Sending one was enough to reassign the goal to another
 * account: the document detached from its owner, whose planner and roadmap
 * then had no goal to read, and landed on whoever the id named.
 *
 * A whitelist rather than a blacklist, so a field added to the schema later is
 * not silently editable the day it appears.
 */
const EDITABLE_GOAL_FIELDS = [
  'educationLevel',
  'currentClass',
  'board',
  'stream',
  'degree',
  'specialization',
  'currentYear',
  'semester',
  'currentJob',
  'experience',
  'careerGoal',
  'dreamCompany',
  'country',
  'state'
];

const createGoal = async (req, res) => {
  try {
    // Check if user already has an active goal
    const existingGoal = await Goal.findOne({ userId: req.user._id });
    if (existingGoal) {
      return res.status(400).json({ message: 'You already have an active career goal.' });
    }

    const {
      educationLevel,
      currentClass,
      board,
      stream,
      degree,
      specialization,
      currentYear,
      semester,
      currentJob,
      experience,
      careerGoal,
      dreamCompany,
      country,
      state
    } = req.body;

    const goal = await Goal.create({
      userId: req.user._id,
      educationLevel,
      currentClass,
      board,
      stream,
      degree,
      specialization,
      currentYear,
      semester,
      currentJob,
      experience,
      careerGoal,
      dreamCompany,
      country,
      state
    });

    res.status(201).json(goal);
  } catch (error) {
    sendGoalError(res, error);
  }
};

// @desc    Get current user's goal
// @route   GET /api/goals
// @access  Private
const getGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({ userId: req.user._id });
    if (!goal) {
      return res.status(404).json({ message: 'No career goal found.' });
    }
    res.status(200).json(goal);
  } catch (error) {
    sendGoalError(res, error);
  }
};

// @desc    Update current user's goal
// @route   PUT /api/goals
// @access  Private
const updateGoal = async (req, res) => {
  try {
    let goal = await Goal.findOne({ userId: req.user._id });
    if (!goal) {
      return res.status(404).json({ message: 'No career goal found to update.' });
    }

    for (const field of EDITABLE_GOAL_FIELDS) {
      if (req.body[field] !== undefined) goal[field] = req.body[field];
    }
    await goal.save();

    res.status(200).json(goal);
  } catch (error) {
    sendGoalError(res, error);
  }
};

// @desc    Delete current user's goal
// @route   DELETE /api/goals
// @access  Private
const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({ userId: req.user._id });
    if (!goal) {
      return res.status(404).json({ message: 'No career goal found.' });
    }

    await goal.deleteOne();
    res.status(200).json({ message: 'Career goal deleted successfully.' });
  } catch (error) {
    sendGoalError(res, error);
  }
};

module.exports = {
  createGoal,
  getGoal,
  updateGoal,
  deleteGoal
};
