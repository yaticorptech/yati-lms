const Chat = require('../models/Chat');
const User = require('../models/User');
const Goal = require('../models/Goal');
const Roadmap = require('../models/Roadmap');
const Task = require('../models/Task');
const SkillProgress = require('../models/SkillProgress');
const CalendarEvent = require('../models/CalendarEvent');
const { generateMentorResponse } = require('../services/geminiService');
const { getEnrolledCourses } = require('../services/lmsContext');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');

// Roughly ten exchanges. Enough that a student can refer back to something a
// few questions ago, short enough that the mentor's own context stays the
// dominant part of the prompt.
const HISTORY_MESSAGES = 20;

// @desc    Send a message to AI Mentor
// @route   POST /api/chat
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required' });

    // Fetch all user context
    const user = await User.findById(req.user._id);
    const goal = await Goal.findOne({ userId: req.user._id });
    const roadmap = await Roadmap.findOne({ userId: req.user._id });
    const tasks = await Task.find({ userId: req.user._id });
    const skills = await SkillProgress.find({ userId: req.user._id });

    // Their own calendar. An exam on Thursday is the single most important
    // thing about a question asked on Tuesday, and until now the mentor was
    // the only part of the app that could not see one. Only from today
    // forward — a paper they already sat is not what they are asking about.
    const events = await CalendarEvent.find({
      userId: req.user._id,
      date: { $gte: new Date().toLocaleDateString('en-CA') }
    })
      .sort({ date: 1 })
      .limit(12)
      .lean();
    
    // The LAST 20 messages, which is not what `.sort({ createdAt: 1 }).limit(10)`
    // returned: ascending order plus a limit takes the OLDEST ten. Once a
    // student had exchanged five messages the mentor was pinned to the opening
    // of the conversation forever and never saw a word of what was just said —
    // so "should I do it?" arrived with no idea what "it" was, and the mentor
    // either guessed or re-answered a question from days ago.
    //
    // Sort descending to take the newest, then put them back in reading order
    // before they go into the prompt.
    const history = (
      await Chat.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(HISTORY_MESSAGES)
        .lean()
    ).reverse();

    // Call Gemini BEFORE persisting anything. Saving the user's message first
    // left it orphaned in the history whenever the AI call failed, so reloading
    // the page showed a question with no answer.
    // Their real courses and how far through each they are. Asked "what next?",
    // a mentor that cannot see a half-finished course they already own has no
    // business answering.
    const courses = await getEnrolledCourses(req.user._id).catch(() => []);

    const aiResponseText = await generateMentorResponse(user, goal, roadmap, tasks, skills, history, message, events, courses);

    const userChat = await Chat.create({
      userId: req.user._id,
      role: 'user',
      message: message
    });

    const aiChat = await Chat.create({
      userId: req.user._id,
      role: 'assistant',
      message: aiResponseText
    });

    res.status(200).json({ userMessage: userChat, aiMessage: aiChat });
  } catch (error) {
    console.error('Chat Error:', error);
    res.status(statusFor(error)).json(aiAwareBody(error, 'Failed to communicate with mentor.'));
  }
};

// @desc    Get chat history
// @route   GET /api/chat
// @access  Private
const getChatHistory = async (req, res) => {
  try {
    const history = await Chat.find({ userId: req.user._id }).sort({ createdAt: 1 });
    res.status(200).json(history);
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @desc    Clear chat history
// @route   DELETE /api/chat
// @access  Private
const clearChatHistory = async (req, res) => {
  try {
    await Chat.deleteMany({ userId: req.user._id });
    res.status(200).json({ message: 'Chat history cleared.' });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = {
  sendMessage,
  getChatHistory,
  clearChatHistory
};
