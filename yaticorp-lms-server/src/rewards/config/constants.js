/**
 * Defaults and time helpers for the rewards module.
 *
 * Every number here is a DEFAULT: the live values sit in the RewardConfig
 * document, which administrators edit from the admin panel. Code must read the
 * config through services/configService.js rather than these constants, so a
 * changed rule reaches every award without a redeploy.
 */

// Learning happens in the student's day, not the server's. A streak that rolls
// over at UTC midnight breaks at 5:30am for a student in India, which is the
// audience this LMS bills in rupees. One timezone for the whole platform keeps
// "today" the same for the streak, the leaderboard week, and the monthly cap.
const TIMEZONE = process.env.REWARDS_TIMEZONE || 'Asia/Kolkata';

const ACTIVITY_TYPES = [
  'lesson_complete',
  'quiz_complete',
  'quiz_pass',
  'assignment_complete',
  'course_complete',
  'certificate_earned',
  'career_task',
  'career_task_quiz',
  'skill_quiz',
  'daily_activity',
  // Interview Ready
  'interview_prep',
  'interview_practice',
  'mock_interview',
  'interview_improved',
  'interview_challenge',
  // Optional: no rule (and so no XP) until an admin adds one under Reward rules.
  'forum_post',
  'forum_comment',
  'resume_upload',
  'part_time_apply',
  'scholarship_search',
  'roadmap_milestone',     // a roadmap phase completed and its badge issued; once per phase
  'task_video_watched',    // a task lesson's video watched to the end; once per task
  'profile_picture',       // a profile photo added; once
  'achievement_added',     // an achievement added to the profile; once a day
  'global_quiz_complete',  // the Global Quiz finished; once a day
  'global_quiz_win'        // the Global Quiz finished at or above the win score; once per quiz
];

const ACCOUNT_TYPES = ['school_student', 'college_student', 'adult', 'professional', 'instructor'];

const DEFAULT_XP_RULES = {
  lesson_complete: 10,
  quiz_complete: 20,
  quiz_pass: 30,
  assignment_complete: 30,
  course_complete: 100,
  certificate_earned: 150,
  // Career Path: paid by the career module (gamificationService.addXP), which
  // reads these through configService.xpFor — so an admin edit takes effect.
  career_task: 10,
  career_task_quiz: 20,
  skill_quiz: 25,
  daily_activity: 5,
  // Interview Ready: preparing, practising a question, finishing a mock
  // interview, beating your best score, and the weekly full-interview challenge.
  interview_prep: 10,
  interview_practice: 5,
  mock_interview: 30,
  interview_improved: 20,
  interview_challenge: 50,
  // Paid once per quiz, for a final score at or above the win score below.
  global_quiz_win: 50
};

// The Global Quiz: the score (%) that counts as a win and pays global_quiz_win.
const DEFAULT_GLOBAL_QUIZ = { winScore: 60 };

// Level n starts at thresholds[n-1] XP. The first ten match the ladder the
// Career Path badges were written against, so nobody's level moves the day
// this ships. Beyond the table each level costs the same as the last gap.
const DEFAULT_LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1600, 2500, 3600, 4900, 6400];

const DEFAULT_STREAK_MILESTONES = [
  { days: 3, rewardPoints: 25, xp: 25 },
  { days: 7, rewardPoints: 100, xp: 100 },
  { days: 14, rewardPoints: 200, xp: 200 },
  { days: 30, rewardPoints: 500, xp: 500 },
  { days: 60, rewardPoints: 1000, xp: 750 },
  { days: 100, rewardPoints: 2000, xp: 1000 }
];

const DEFAULT_LEADERBOARD_REWARDS = {
  weekly: [
    { rank: 1, rewardPoints: 1000 },
    { rank: 2, rewardPoints: 750 },
    { rank: 3, rewardPoints: 500 }
  ],
  monthly: []
};

const DEFAULT_CONVERSION = {
  pointsPerUnit: 100,   // 100 reward points ...
  unitValue: 10,        // ... = ₹10
  currency: 'INR',
  minRedeemPoints: 100
};

// Opening wallet balance every student is given once, in the wallet currency.
// Spend-only: it pays for priced features but can never be withdrawn.
// An admin setting (Rewards → Reward rules); this is only the starting value.
const DEFAULT_STARTING_CREDIT = 150000;

// Brain games: minutes of play a day (0 = no limit) and the XP a level pays
// for its best result. Paid once per level per star reached, so replaying an
// easy level pays nothing; 0 stars pays nothing.
const DEFAULT_GAMES = { dailyMinutes: 15, xpOneStar: 2, xpTwoStars: 5, xpThreeStars: 10 };

const DEFAULT_LIMITS = {
  monthlyCashCap: 500,  // ₹ of reward redemptions per student per month; 0 = no cap
  minWithdrawal: 100,
  maxWithdrawal: 5000
};

// Wallet rules: what a feature costs from the student's wallet balance, in the
// wallet's currency. 0 = free (the default for all of them, so turning the
// rules on is the admin's decision). Charged on the server by
// services/walletRuleService; a failed action is refunded.
const WALLET_ACTIONS = [
  'download_resume',
  'upload_resume',
  'download_bio',
  'start_global_quiz',
  'find_job',
  'apply_part_time',
  'rebuild_roadmap',
  'start_mock_interview',
  'find_scholarship',
  // Optional: free, and not listed as a rule, until an admin adds one.
  'generate_ideas',
  'download_certificate',
  // AI features, each a real cost to run. Optional like the two above.
  'ask_mentor',
  'build_task_lesson',
  'generate_study_material',
  'add_extra_task',
  'regenerate_bio'
];
// The rules a fresh rulebook starts with; the rest of WALLET_ACTIONS (and of
// ACTIVITY_TYPES, for XP) are added from the admin panel when wanted.
const OPTIONAL_WALLET_ACTIONS = ['generate_ideas', 'download_certificate', 'ask_mentor', 'build_task_lesson', 'generate_study_material', 'add_extra_task', 'regenerate_bio'];
const DEFAULT_WALLET_RULES = Object.fromEntries(WALLET_ACTIONS.filter((a) => !OPTIONAL_WALLET_ACTIONS.includes(a)).map((a) => [a, 0]));
// Actions with no server request of their own (opening a job listing): the
// page asks POST /api/rewards/wallet/spend before it goes ahead.
const CLIENT_CHARGED_ACTIONS = ['find_job'];

const DEFAULT_WALLET_ACCESS = {
  // Account types that may turn reward points into money and request payouts.
  // Younger accounts keep XP, badges and points; an admin can override per user.
  allowedAccountTypes: ['adult', 'professional', 'instructor']
};

// Seeded into RewardBadge on first run and editable afterwards. `metric` names
// a number computed in badgeService.computeStats; the badge unlocks when it
// reaches `target`.
const DEFAULT_BADGES = [
  { key: 'streak_7', title: '7-Day Streak', description: 'Learn something seven days in a row.', emoji: '🔥', metric: 'longest_streak', target: 7, rewardPoints: 0, order: 1 },
  { key: 'streak_30', title: '30-Day Streak', description: 'Thirty straight days of learning.', emoji: '🔥', metric: 'longest_streak', target: 30, rewardPoints: 0, order: 2 },
  { key: 'first_course', title: 'First Course Completed', description: 'Finish every lesson of a course.', emoji: '📚', metric: 'courses', target: 1, rewardPoints: 50, order: 3 },
  { key: 'quiz_master', title: 'Quiz Master', description: 'Complete 10 quizzes.', emoji: '🧠', metric: 'quizzes', target: 10, rewardPoints: 100, order: 4 },
  { key: 'top_10', title: 'Top 10 Learner', description: 'Finish a week in the top 10 of the leaderboard.', emoji: '🏆', metric: 'top10_weeks', target: 1, rewardPoints: 100, order: 5 },
  { key: 'xp_1000', title: '1,000 XP', description: 'Earn 1,000 XP in total.', emoji: '⭐', metric: 'xp', target: 1000, rewardPoints: 50, order: 6 },
  { key: 'first_mock_interview', title: 'First Mock Interview', description: 'Complete your first AI mock interview.', emoji: '🎙️', metric: 'mock_interviews', target: 1, rewardPoints: 25, order: 7 },
  { key: 'interview_ready', title: 'Interview Ready', description: 'Reach 75% interview readiness.', emoji: '🎤', metric: 'interview_readiness', target: 75, rewardPoints: 100, order: 8 },
  { key: 'certificate_collector', title: 'Certificate Collector', description: 'Earn three course certificates.', emoji: '🎓', metric: 'certificates', target: 3, rewardPoints: 150, order: 7 },
  { key: 'perfect_quiz', title: 'Perfect Quiz', description: 'Score 100% on a quiz.', emoji: '💯', metric: 'perfect_quizzes', target: 1, rewardPoints: 25, order: 8 },
  // Unlocked by reward points: what points are for. Points are not spent.
  { key: 'points_500', title: 'Point Collector', description: 'Earn 500 reward points.', emoji: '🪙', metric: 'reward_points', target: 500, rewardPoints: 0, order: 20 },
  { key: 'points_2000', title: 'Point Champion', description: 'Earn 2,000 reward points.', emoji: '🏅', metric: 'reward_points', target: 2000, rewardPoints: 0, order: 21 },
  { key: 'points_5000', title: 'Point Legend', description: 'Earn 5,000 reward points.', emoji: '👑', metric: 'reward_points', target: 5000, rewardPoints: 0, order: 22 }
];

// ── Time helpers ────────────────────────────────────────────────────────────

// 'YYYY-MM-DD' for an instant, in the platform timezone.
const dayKey = (date = new Date(), tz = TIMEZONE) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

// Shift a 'YYYY-MM-DD' by whole days without touching timezones.
const addDays = (key, delta) => {
  const [y, m, d] = key.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + delta * 86400000;
  return new Date(t).toISOString().slice(0, 10);
};

// Midnight at the start of a day key, as an instant, in the platform timezone.
const startOfDay = (key, tz = TIMEZONE) => {
  const [y, m, d] = key.split('-').map(Number);
  // Guess UTC midnight, then correct by however far the zone is from UTC then.
  const guess = new Date(Date.UTC(y, m - 1, d));
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(guess);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const asIfUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'));
  return new Date(guess.getTime() - (asIfUtc - guess.getTime()));
};

// ISO-style week: Monday to Sunday.
const weekStartKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDays(key, dow === 0 ? -6 : 1 - dow);
};

/**
 * The window a leaderboard period covers, with a key that names it.
 * `offset` = -1 gives the previous period (used when paying out a finished week).
 */
const periodWindow = (period, now = new Date(), offset = 0) => {
  const today = dayKey(now);
  if (period === 'daily') {
    const day = addDays(today, offset);
    return { key: `D:${day}`, start: startOfDay(day), end: startOfDay(addDays(day, 1)) };
  }
  if (period === 'weekly') {
    const start = addDays(weekStartKey(today), 7 * offset);
    return { key: `W:${start}`, start: startOfDay(start), end: startOfDay(addDays(start, 7)) };
  }
  if (period === 'monthly') {
    let [y, m] = today.split('-').map(Number);
    m += offset;
    while (m < 1) { m += 12; y -= 1; }
    while (m > 12) { m -= 12; y += 1; }
    const first = `${y}-${String(m).padStart(2, '0')}-01`;
    const nextM = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    return { key: `M:${first.slice(0, 7)}`, start: startOfDay(first), end: startOfDay(nextM) };
  }
  return { key: 'ALL', start: null, end: null };
};

module.exports = {
  TIMEZONE,
  ACTIVITY_TYPES,
  ACCOUNT_TYPES,
  DEFAULT_XP_RULES,
  DEFAULT_LEVEL_THRESHOLDS,
  DEFAULT_STREAK_MILESTONES,
  DEFAULT_LEADERBOARD_REWARDS,
  DEFAULT_CONVERSION,
  DEFAULT_LIMITS,
  DEFAULT_STARTING_CREDIT,
  DEFAULT_GAMES,
  DEFAULT_GLOBAL_QUIZ,
  DEFAULT_WALLET_ACCESS,
  WALLET_ACTIONS,
  OPTIONAL_WALLET_ACTIONS,
  DEFAULT_WALLET_RULES,
  CLIENT_CHARGED_ACTIONS,
  DEFAULT_BADGES,
  dayKey,
  addDays,
  startOfDay,
  weekStartKey,
  periodWindow
};
