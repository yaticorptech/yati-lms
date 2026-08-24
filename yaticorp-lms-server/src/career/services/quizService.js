const { generateExtraQuizQuestions } = require('./geminiService');

// A quiz is a gate as well as practice, and both jobs need a few questions to
// do honestly. Below five, one lucky guess is worth too much of the pass mark
// and the lesson barely gets tested at all.
const MIN_QUIZ_QUESTIONS = 5;

/**
 * Only questions that can actually be answered.
 *
 * A question whose answer key points outside its own options can never be got
 * right, so serving it would make the quiz unpassable through no fault of the
 * student. Same for one with fewer than two options to choose between.
 */
const validQuestions = (questions) =>
  (questions || []).filter(
    (q) =>
      q &&
      typeof q.question === 'string' &&
      q.question.trim() &&
      Array.isArray(q.options) &&
      q.options.length > 1 &&
      Number.isInteger(q.correctIndex) &&
      q.correctIndex >= 0 &&
      q.correctIndex < q.options.length
  );

/** Same question asked twice, allowing for casing and stray punctuation. */
const asKey = (q) => q.question.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');

const dedupe = (questions) => {
  const seen = new Set();
  return questions.filter((q) => {
    const key = asKey(q);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Bring a generated quiz up to the minimum, topping it up if it came in short.
 *
 * The prompts ask for at least five questions and usually deliver, but the
 * count has never been enforced — whatever came back was saved, and one lesson
 * in the database ended up with two. One extra call closes the gap.
 *
 * A failed top-up costs the student nothing but the questions that were never
 * there: they still get the lesson they asked for, with the questions that did
 * generate, rather than an error page. The shortfall is logged so it is visible
 * rather than silent.
 */
const ensureMinimumQuiz = async (questions, { topic, notes }) => {
  let quiz = dedupe(validQuestions(questions));
  if (quiz.length >= MIN_QUIZ_QUESTIONS) return quiz;

  const short = MIN_QUIZ_QUESTIONS - quiz.length;
  try {
    // Asked for one spare. Some of what comes back is usually lost to the
    // validity check or to repeating a question already asked, and a second
    // round trip to recover one question is not worth the student's wait.
    const extra = await generateExtraQuizQuestions(topic, notes, quiz, short + 1);
    quiz = dedupe([...quiz, ...validQuestions(extra)]).slice(
      0,
      Math.max(MIN_QUIZ_QUESTIONS, quiz.length)
    );
  } catch (error) {
    console.warn(`Quiz top-up failed for "${topic}":`, error.message);
  }

  if (quiz.length < MIN_QUIZ_QUESTIONS) {
    console.warn(
      `Quiz for "${topic}" has ${quiz.length} question(s), below the minimum of ${MIN_QUIZ_QUESTIONS}.`
    );
  }
  return quiz;
};

module.exports = { MIN_QUIZ_QUESTIONS, validQuestions, ensureMinimumQuiz };
