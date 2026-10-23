const { geminiClient, describeKeyError } = require('../../utils/userAiKey');
const aiQuota = require('./aiQuota');
const { degreeLength, openingStages, checkPlan, fillMissing, timelineFor, norm } = require('./roadmapPlan');

// Free-tier quotas are per-day, per-model, so the model choice directly decides
// how many roadmaps/tasks/recommendations a day the app can serve.
// 'gemini-flash-latest' currently resolves to the newest flash model, which has
// the smallest free allowance (20 requests/day). The lite models are far more
// generous. Override with GEMINI_MODEL in .env.
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

// 5xx means the model is temporarily busy - worth retrying.
const TRANSIENT_STATUSES = [500, 502, 503, 504];

/**
 * A connection that never reached Google at all.
 *
 * These arrive as `TypeError: fetch failed` with no HTTP status, so the status
 * check below could not see them: `[500,502,503,504].includes(undefined)` is
 * false, and one flaky moment on the network threw away the whole generation
 * without a single retry. The student got "Failed to build the reading lesson:
 * fetch failed" for a hiccup that a second attempt would usually survive.
 */
const NETWORK_CAUSES = /ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|EPIPE|UND_ERR/i;

const isNetworkError = (error) =>
  error?.status === undefined &&
  (NETWORK_CAUSES.test(error?.cause?.code || '') ||
    /fetch failed|network|socket hang up|terminated|timeout/i.test(error?.message || ''));

// A 429 carries a quota violation describing which limit was hit. A per-minute
// limit clears on its own; a per-day limit does not, and retrying it just burns
// more of the day's allowance.
const getQuotaInfo = (error) => {
  try {
    const details = JSON.parse(error.message).error?.details || [];
    const violation = details.flatMap((d) => d.violations || [])[0] || {};
    const retry = details.find((d) => d.retryDelay);
    return {
      quotaId: violation.quotaId || '',
      limit: violation.quotaValue,
      isDaily: /PerDay/i.test(violation.quotaId || ''),
      retryDelaySeconds: retry ? parseInt(retry.retryDelay, 10) : null
    };
  } catch {
    return { quotaId: '', isDaily: false, retryDelaySeconds: null };
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The recommendations payload alone spans 11 categories of rich objects, and
// silently truncating mid-object is what produces "Expected double-quoted
// property name" downstream. Ask for the model's full output budget.
const MAX_OUTPUT_TOKENS = 8192;

// One attempt's ceiling. The SDK sets none, so a request Google never answered
// held the student's spinner — and the wallet charge — open until the socket
// gave up, which could be minutes. A full roadmap is the slowest call in the
// module and comfortably finishes inside this.
const GENERATE_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 45000;

// 4 attempts rather than 3: 503 "model overloaded" spells often outlast two
// retries. Failed calls do not consume the daily quota, so the only cost of
// another attempt is latency.
//
// `json: true` switches on the API's own JSON mode, which constrains decoding to
// valid JSON. That is far more reliable than asking for JSON in the prompt and
// repairing whatever comes back — it removes markdown fences, prose preambles,
// trailing commas and unquoted keys at the source.
const generateWithRetry = async (
  ai,
  prompt,
  { attempts = 4, json = false, maxOutputTokens = MAX_OUTPUT_TOKENS, kind = 'unknown', thinking = 0 } = {}
) => {
  const config = json
    ? { responseMimeType: 'application/json', maxOutputTokens }
    : { maxOutputTokens };
  // Room to reason before answering, for the calls that need it (the roadmap
  // plan). Dropped again below if the configured model has no thinking mode.
  if (thinking) config.thinkingConfig = { thinkingBudget: thinking };

  // Metered here rather than at each of the fourteen call sites: this is the
  // one funnel every generation in the module passes through, including the
  // ones nested inside dailyPlanService that no controller calls directly.
  // Whose call it is comes from the request-scoped store — see aiContext.
  await aiQuota.assertWithinBudget();

  const startedAt = Date.now();
  // One record per generateWithRetry, not per retry. Retries exist because the
  // model was busy or the socket dropped; counting them would charge a student
  // for the network's bad day.
  let recorded = false;
  const meter = (ok) => {
    if (recorded) return;
    recorded = true;
    // Deliberately not awaited: the student is waiting on a roadmap, not on a
    // bookkeeping write, and record() swallows its own failures.
    aiQuota.record({ kind, model: MODEL, ok, ms: Date.now() - startedAt });
  };

  for (let attempt = 1; attempt <= attempts; attempt++) {
    // A fresh signal per attempt: an aborted controller stays aborted, and
    // reusing it would fail every retry instantly.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), GENERATE_TIMEOUT_MS);
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { ...config, abortSignal: ctrl.signal }
      });
      meter(true);
      return response;
    } catch (error) {
      if (attempt === attempts) meter(false);
      const isLastAttempt = attempt === attempts;

      // Ours, not the network's. Not retried: a call that hung for 45 seconds
      // will usually hang again, and four of them is three minutes of a
      // student staring at a spinner. 504 keeps it a 5xx, so whatever the
      // request was charged is refunded.
      if (ctrl.signal.aborted) {
        meter(false);
        const timedOut = new Error('The AI service took too long to answer. Please try again in a moment.');
        timedOut.status = 504;
        throw timedOut;
      }

      // A model without a thinking mode refuses the setting outright. That is
      // not a failed attempt: ask again without it.
      if (config.thinkingConfig && error.status === 400 && /think/i.test(error.message || '')) {
        console.warn(`Model "${MODEL}" has no thinking mode; asking without it.`);
        delete config.thinkingConfig;
        attempt -= 1;
        continue;
      }

      if (error.status === 429) {
        const quota = getQuotaInfo(error);

        // Daily cap: no amount of waiting helps within this request.
        if (quota.isDaily || !quota.retryDelaySeconds) {
          meter(false);
          // What to do about it is the operator's business, so it goes to the
          // log and not to the student. This text used to reach the planner
          // word for word — "set a different GEMINI_MODEL in the server .env"
          // — in front of someone who has never seen the server.
          console.error(
            `[career] Daily free-tier quota exhausted for model "${MODEL}"` +
            (quota.limit ? ` (limit: ${quota.limit} requests/day)` : '') +
            '. It resets at midnight Pacific Time. To continue now, set a different ' +
            'GEMINI_MODEL in the server .env or enable billing on the Google AI Studio project.'
          );
          // Typed so it surfaces as 429 rather than 500: the service is fine,
          // the day's allowance is not. The provider's day ends at midnight
          // Pacific, so that is when it comes back.
          throw new aiQuota.AiBudgetError(
            "Career Path's AI has used up its allowance for today. " +
            'Everything already generated is still here.',
            'provider-daily-quota',
            aiQuota.nextMidnightIn('America/Los_Angeles')
          );
        }

        // Per-minute cap: honour the server's own retry hint.
        if (isLastAttempt) {
          console.warn(`[career] Gemini rate limit (${quota.quotaId}) on the last attempt.`);
          throw new Error(`The AI is busy right now. Please try again in about ${quota.retryDelaySeconds} seconds.`);
        }
        const waitMs = Math.min(quota.retryDelaySeconds, 60) * 1000;
        console.warn(`Gemini rate limited (${quota.quotaId}), waiting ${waitMs / 1000}s (attempt ${attempt}/${attempts})`);
        await sleep(waitMs);
        continue;
      }

      // A dropped connection is worth retrying, and worth explaining in words
      // that tell the student what to do when it keeps failing. It is the
      // SERVER's connection to Google that failed, not the student's: telling
      // them to check their internet sent them off to fix something that was
      // working fine. The detail stays in the log.
      if (isNetworkError(error)) {
        if (isLastAttempt) {
          console.error(`[career] Gemini unreachable after ${attempts} attempts: ${error.cause?.code || error.message}`);
          throw new Error(
            "We couldn't reach the AI service just now. Please try again in a few minutes."
          );
        }
        const delayMs = 1000 * 2 ** (attempt - 1);
        console.warn(
          `Gemini unreachable (${error.cause?.code || error.message}), retrying in ${delayMs}ms ` +
          `(attempt ${attempt}/${attempts})`
        );
        await sleep(delayMs);
        continue;
      }

      if (!TRANSIENT_STATUSES.includes(error.status) || isLastAttempt) {
        // A student's own key that Google refuses is told to them as such.
        throw describeKeyError(error, ai.__ownKey);
      }

      const delayMs = 1000 * 2 ** (attempt - 1); // 1s, 2s
      console.warn(`Gemini ${error.status}, retrying in ${delayMs}ms (attempt ${attempt}/${attempts})`);
      await sleep(delayMs);
    } finally {
      clearTimeout(timer);
    }
  }
};

/**
 * Walk the text once, tracking whether each character sits inside a string.
 *
 * Every repair below needs this. A naive regex cannot tell a structural comma
 * from one inside "Fees: 50,000/year", and rewriting the wrong one corrupts the
 * data silently instead of failing loudly.
 *
 * @returns {{ structural: boolean[], stack: string[], inString: boolean }}
 */
const scanJson = (text) => {
  const structural = new Array(text.length).fill(false);
  const stack = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }

    structural[i] = true;
    if (char === '{' || char === '[') stack.push(char === '{' ? '}' : ']');
    else if (char === '}' || char === ']') stack.pop();
  }

  return { structural, stack, inString };
};

/** Drop a trailing comma before a closing brace or bracket, strings untouched. */
const stripTrailingCommas = (text) => {
  const { structural } = scanJson(text);
  let out = '';

  for (let i = 0; i < text.length; i++) {
    if (text[i] === ',' && structural[i]) {
      // Look ahead past whitespace: a comma followed by a closer is trailing.
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      if (j < text.length && (text[j] === '}' || text[j] === ']') && structural[j]) continue;
    }
    out += text[i];
  }
  return out;
};

/**
 * Close a response that was cut off mid-structure.
 *
 * Hitting the output token ceiling truncates the JSON wherever it happened to
 * be, which surfaces as a parse error far from the real cause. Rewinding to the
 * last complete element and closing the open containers salvages a partial but
 * usable object — better than losing the whole generation and a quota call.
 */
const closeTruncatedJson = (text) => {
  let candidate = text;

  // An unterminated string cannot be salvaged in place; rewind past it.
  const { inString } = scanJson(candidate);
  if (inString) {
    const lastQuote = candidate.lastIndexOf('"');
    if (lastQuote === -1) return null;
    candidate = candidate.slice(0, lastQuote);
  }

  // Close the open containers and see whether that parses. If the tail was a
  // half-written element ("fees": with no value, or a key awaiting one), drop
  // back to the previous element and try again. Bounded so a pathological
  // response cannot spin.
  for (let i = 0; i < 100; i++) {
    const trimmed = candidate.replace(/[\s,:]+$/, '');
    if (!trimmed) return null;

    const { stack, structural } = scanJson(trimmed);
    if (stack.length) {
      const attempt = trimmed + [...stack].reverse().join('');
      try {
        JSON.parse(attempt);
        return attempt;
      } catch {
        // Tail is incomplete — rewind below.
      }
    }

    // Rewind to just before the last structural comma.
    let cut = -1;
    for (let j = trimmed.length - 1; j >= 0; j--) {
      if (structural[j] && trimmed[j] === ',') {
        cut = j;
        break;
      }
    }
    if (cut === -1) return null;
    candidate = trimmed.slice(0, cut);
  }

  return null;
};

/**
 * Parse the model's JSON, repairing the failure modes that actually occur.
 *
 * With the API's JSON mode enabled this should almost never need to do anything
 * — it stays as a safety net for truncation, which JSON mode does not prevent.
 */
const parseJsonObject = (responseText) => {
  if (!responseText || typeof responseText !== 'string') {
    throw new Error('AI response was empty.');
  }

  // Fences should not appear under JSON mode, but a plain-text fallback still
  // wraps output in ```json.
  const unfenced = responseText.replace(/```(?:json)?/gi, '');

  const startIndex = unfenced.indexOf('{');
  if (startIndex === -1) {
    throw new Error('AI response did not contain a JSON object.');
  }
  const endIndex = unfenced.lastIndexOf('}');
  const raw = unfenced.slice(startIndex, endIndex > startIndex ? endIndex + 1 : undefined);

  try {
    return JSON.parse(raw);
  } catch (error) {
    for (const [label, repair] of [
      ['trailing commas', stripTrailingCommas],
      ['truncation', closeTruncatedJson],
      ['truncation + trailing commas', (t) => {
        const closed = closeTruncatedJson(t);
        return closed && stripTrailingCommas(closed);
      }]
    ]) {
      try {
        const candidate = repair(raw);
        if (!candidate) continue;
        const parsed = JSON.parse(candidate);
        console.warn(`Recovered from malformed AI JSON (${label}): ${error.message}`);
        return parsed;
      } catch {
        // Try the next strategy.
      }
    }

    // Surface the original failure - the repair attempts are not the real story.
    console.error('Unrepairable AI JSON. First 400 chars:', raw.slice(0, 400));
    throw error;
  }
};

const PROGRESSION_RULES = `
CRITICAL AGE-APPROPRIATE PROGRESSION RULES (NEVER VIOLATE THESE):
You must strictly tailor your advice, tasks, and recommendations to the user's current education level. Never recommend advanced topics too early.
- Primary/Middle School (Class 1-8): Focus ONLY on Computer basics, Scratch/Blockly, logical thinking puzzles, mathematics, English, and basic science. NO internships, NO real programming languages (like React, Node.js), NO resumes, NO certifications.
- High School (Class 9-10): Focus on Python basics, HTML, CSS, problem solving, school exams.
- Higher Secondary (Class 11-12): Focus on JavaScript, data structures basics, coding competitions, entrance exams.
- College: Focus on modern tech stacks (e.g. MERN), GitHub, projects, internships, interview preparation.
- Postgraduate (M.Tech / MS / MBA / M.Sc): Focus on specialisation, research and thesis work, publications, teaching/research assistantships, advanced certifications, and senior-level roles.
- Final Year / Working Professionals: Focus on Resumes, placements, mock interviews, job applications, career transitions, leadership.
`;

/**
 * The programme-length constraint handed to the model, or a warning not to
 * assume a default when the degree is not one we recognise.
 */
const describeDegreeLength = (goal) => {
  const level = goal.educationLevel;
  if (!['Undergraduate', 'Postgraduate', 'Diploma'].includes(level)) return '';

  const length = degreeLength(goal);
  const name = goal.degree || level;

  if (!length) {
    return `PROGRAMME LENGTH: You must use the STANDARD duration of "${name}" in the user's country. Do NOT assume four years — degree lengths vary (BCA/B.Sc/B.Com run 3 years, B.Tech runs 4, MCA/M.Sc/MBA run 2). State the duration you are using in "currentStage".`;
  }

  return `PROGRAMME LENGTH: "${name}" runs ${length.years} year${length.years === 1 ? '' : 's'} (${length.semesters} semesters) in total. Generate phases ONLY up to Year ${Math.ceil(length.years)} of this degree — a "Year ${Math.ceil(length.years) + 1}" phase does not exist and is a factual error. The final year of this degree is Year ${Math.ceil(length.years)}.`;
};

/**
 * A precise, human-readable description of where the student is *right now*.
 *
 * Left to prose alone the model reads "Undergraduate / BCA / 2nd Year" as
 * background colour and still opens the roadmap at Class 5. Computing the
 * starting phase here and stating it as a hard constraint removes the ambiguity:
 * there is one sentence saying exactly which phase must come first.
 */
const describeCurrentStage = (goal) => {
  const level = goal.educationLevel || '';

  if (level === 'Working Professional') {
    const years = goal.experience ? `${goal.experience} year(s) of experience` : 'currently working';
    return `${goal.currentJob || 'a working professional'}, ${years}`;
  }

  if (level === 'Undergraduate' || level === 'Postgraduate' || level === 'Diploma') {
    const parts = [goal.degree, goal.specialization].filter(Boolean).join(' ');
    const year = goal.currentYear || '';
    const sem = goal.semester ? `, semester ${goal.semester}` : '';
    return `${parts || level}${year ? ` — ${year}` : ''}${sem}`;
  }

  // School levels carry the class rather than a degree, plus the board and —
  // for Class 11–12 — the stream: a Class 10 syllabus under CBSE is not the one
  // under the Tamil Nadu board, and a PCB student is on a different road from a
  // PCM one before either has left school.
  const extras = [goal.stream, goal.board].filter(Boolean).join(', ');
  const suffix = extras ? ` (${extras})` : '';
  return goal.currentClass ? `${level} — ${goal.currentClass}${suffix}` : `${level}${suffix}`;
};


/**
 * The plan's rules for where this student's study goes from here.
 *
 * These used to be stated unconditionally, in the words of an undergraduate's
 * roadmap: "immediately after the final undergraduate year" and "you MUST
 * ALWAYS include postgraduate phases". For a student already reading for a
 * master's that contradicts the start-where-they-are rule, and the model
 * resolved the contradiction the wrong way round — an MCA Year 2 student was
 * handed a "Postgraduate Year 1: MCA Advanced Specialisation" phase AFTER their
 * own final year. So the ladder is described from where the student stands.
 *
 * The internship used to be placed "immediately AFTER the final undergraduate
 * year" here, which is why every saved roadmap had one after graduation. Where
 * an internship goes is now one rule for everyone (the plan prompt's rule 4,
 * enforced by roadmapPlan.checkPlan): while studying, never after.
 */
const describeLadderRules = (goal) => {
  const level = goal.educationLevel || '';

  if (level === 'Working Professional') {
    return `FOR THIS STUDENT: they are ALREADY WORKING. No school stage, no degree they already hold, and no internship stage — internships are for students. Their roadmap runs from their current role forward, through the upskilling, certifications and role changes that lead to "${goal.careerGoal}" (kind "work").
   Add a further qualification (M.Tech / MS / MBA / a certification) ONLY where it genuinely unlocks "${goal.careerGoal}" for someone already in the field, say plainly why, and put its entrance exam before it (rule 3). If no further degree is needed, go straight to the work stages.`;
  }

  if (level === 'Postgraduate') {
    const programme = goal.degree || 'their master\'s';
    const placed = openingStages(goal).length ? ', and its remaining years are already in the roadmap' : '';
    return `FOR THIS STUDENT: they are ALREADY READING FOR A POSTGRADUATE DEGREE (${programme})${placed}. DO NOT ADD ANY PHASE ABOUT STARTING OR COMPLETING A POSTGRADUATE DEGREE: they are already in one. A "Postgraduate Year 1" stage, or one about choosing a master's, sitting its entrance exam (GATE / NIMCET / CAT / GRE for admission) or picking a university for it, describes something they have ALREADY DONE and is a serious error.
   Their internship, if this career uses one, happens during their remaining ${programme} time, pitched at postgraduate level (research internships, industry-sponsored thesis projects, the big companies' graduate internships) — never after ${programme} is finished.
   The one exception: if the career goal is research- or academia-oriented, a DOCTORAL (PhD) phase AFTER ${programme} is a real next step and should be included, with its entrance exam (UGC-NET / CSIR-NET JRF / the university's own test) before it.`;
  }

  // School, Diploma and Undergraduate students: the full ladder is still ahead.
  return `FOR THIS STUDENT — POSTGRADUATE STUDY: you MUST include postgraduate phases after the bachelor's degree and before work, one stage per year of the master's, with its entrance exam stage before it (rule 3). The only exception is a career whose real route replaces a master's with a professional qualification or training (a pilot's licence, CA / CMA / CS): then that route takes its place.
   Offer MULTIPLE postgraduate options in the title, each ELIGIBLE for the bachelor's degrees offered earlier: B.Tech / B.E. -> M.Tech, MS abroad or M.Sc CS; BCA / B.Sc IT / B.Sc CS -> MCA or M.Sc CS (they are usually NOT eligible for an M.Tech). Recommend the specialisation that genuinely advances "${goal.careerGoal}": e.g. HCI / Web Technologies for a frontend developer, Data Science / AI for a data scientist, an MBA in Product or Technology Management after 2–3 years of work for leadership ambitions.
   If the career goal is research- or academia-oriented, also add a doctoral (PhD) phase after the master's, with its entrance exam before it.`;
};

// A school phase: "Class 9", "Grade 10", "Std 8", "Class 11: PCMB Stream".
const SCHOOL_PHASE_PATTERN = /^\s*(?:phase\s*\d+\s*[:-]\s*)?(?:class|grade|std\.?|standard)\s*\d+/i;

// Levels that mean school is already behind the student.
const PAST_SCHOOL = ['Diploma', 'Undergraduate', 'Postgraduate', 'Working Professional'];

/**
 * A phase about ENTERING postgraduate study: "Postgraduate Year 1", "PG Year
 * 2", "Master's Year 1". Deliberately only the generic, ladder-shaped titles —
 * a phase named for the student's own programme ("MCA Year 2 / Final Year") is
 * where they actually are and must survive.
 */
const PG_ENTRY_PHASE_PATTERN =
  /^\s*(?:phase\s*\d+\s*[:-]\s*)?(?:post[\s-]?grad(?:uate)?|pg|master'?s?)\s*(?:degree\s*)?(?:year|yr)\s*(\d+)/i;

/**
 * Remove phases the student has demonstrably already completed.
 *
 * The prompt states this plainly, but the model still occasionally opens a
 * BCA student's roadmap at Class 5 — and a roadmap that starts years behind
 * where someone actually is reads as broken, so it is worth enforcing in code
 * rather than trusting the instruction alone.
 *
 * Deliberately narrow: only school classes, and only for students who are past
 * school. Guessing at which college years are done is far less clear-cut, and a
 * wrong guess would silently delete real phases.
 */
const completedStageIndices = (phases, goal) => {
  if (!Array.isArray(phases) || !PAST_SCHOOL.includes(goal?.educationLevel)) return [];

  const pgEntry = goal.educationLevel === 'Postgraduate';
  // "2nd Year" -> 2. Null when the goal does not say, which drops no PG phase.
  const currentYear = Number(String(goal.currentYear || '').match(/\d+/)?.[0]) || null;

  const drop = [];
  phases.forEach((stage, i) => {
    const title = typeof stage === 'string' ? stage : stage?.phase || '';
    if (SCHOOL_PHASE_PATTERN.test(title)) {
      drop.push(i);
      return;
    }
    // A student already reading for a master's does not go back and start one.
    // Never the first phase, which Rule Zero reserves for where they are now —
    // a PG Year 1 student's own stage may legitimately be titled this way.
    //
    // And only a year they have already reached. "Postgraduate Year 2" on an
    // MCA Year 1 student's roadmap is the year still ahead of them, not one
    // they finished; dropping it removed half the degree they are reading. A
    // year we cannot read is left alone — a wrong guess deletes a real phase.
    if (pgEntry && i > 0) {
      const match = title.match(PG_ENTRY_PHASE_PATTERN);
      const phaseYear = match ? Number(match[1]) : NaN;
      if (Number.isFinite(phaseYear) && currentYear && phaseYear <= currentYear) drop.push(i);
    }
  });

  // Never empty a roadmap: if the rules would remove every phase the titles are
  // shaped unexpectedly, and keeping all of them is the safer answer.
  return drop.length === phases.length ? [] : drop;
};

const stripCompletedStages = (roadmap, goal) => {
  const phases = roadmap?.educationRoadmap;
  const drop = new Set(completedStageIndices(phases, goal));
  if (!drop.size) return roadmap;

  console.warn(
    `Roadmap for a ${goal.educationLevel} student contained ${drop.size} already-completed phase(s); removed.`
  );
  roadmap.educationRoadmap = phases.filter((_, i) => !drop.has(i));
  return roadmap;
};

/* ================= roadmap: plan it, check it, then write it ================= */
//
// One prompt used to plan and write the whole roadmap at once, from a fixed
// template, and the saved roadmaps came out in the wrong order (roadmapPlan.js
// lists how). Now the model plans the stages first, with room to think; code
// checks and corrects the order (roadmapPlan.checkPlan); and only then is each
// stage written up, against a plan that can no longer change.

// Thinking room for the plan. It is short to write and the hardest part to get
// right — which exam opens which stage, which route this career really takes.
const PLAN_THINKING_BUDGET = 4096;

// Stages written up per call. A Class 5 student's road runs to twenty stages,
// and twenty written in full overflowed one reply: the end of the road was cut
// off. Eight a call fits with room to spare, and the calls run side by side.
const WRITE_CHUNK = 8;

const studentContext = (goal) => `Student:
- Education level: ${goal.educationLevel}
- Where they are now: ${describeCurrentStage(goal)}${goal.board ? `\n- Board: ${goal.board}. Follow this board's own syllabus, subject names and exam names — never another board's. "${goal.board}" is the board's name; do not invent a syllabus name of your own.` : ''}${goal.stream ? `\n- Stream: ${goal.stream}. This decides which degrees and entrance exams they are ELIGIBLE for. Never plan a path their subject combination rules out — no JEE or engineering without Maths, no NEET or medicine without Biology.` : ''}
- Current job / experience: ${goal.currentJob || 'N/A'} (${goal.experience || 0} years)
- Career goal: ${goal.careerGoal}
- Dream company / organisation: ${goal.dreamCompany || 'None specified'}
- Location: ${[goal.state, goal.country].filter(Boolean).join(', ') || 'India'}`;

const KIND_GUIDE = `Kinds:
- "school": a school class.
- "exam": an entrance exam, selection, medical or licence needed to ENTER a later stage.
- "degree": one year of a bachelor's degree or diploma.
- "pg": one year of a master's degree.
- "phd": doctoral study.
- "internship": an internship.
- "training": professional training that is not a degree (flying school, articleship, residency, an apprenticeship).
- "qualification": one level of a professional qualification (CA Intermediate, CMA Final, a commercial pilot licence).
- "recruitment": the tests employers or the government use to hire.
- "job-search": applying for jobs.
- "first-role": the job itself.
- "work": a stage of working life (a working professional's upskilling or role change).`;

const buildPlanPrompt = (goal, opening, { askStream = false, previous = null } = {}) => {
  const working = goal.educationLevel === 'Working Professional';
  const last = opening[opening.length - 1];
  const start = opening.length
    ? `THE ROADMAP ALREADY BEGINS WITH THESE STAGES, worked out from the student's own answers. They are fixed: do not repeat, rename or reorder them.
${opening.map((s, i) => `${i + 1}. ${s.title}`).join('\n')}
Plan ONLY what comes AFTER "${last.title}", starting with the very next thing that happens.`
    : `Start with the stage the student is in RIGHT NOW (${describeCurrentStage(goal)}) — never anything they have already finished.`;

  return `You are an expert career counsellor. PLAN a student's career roadmap: the ordered list of stages only. Each stage is written up in detail in a later step.

${studentContext(goal)}

Take your time. Before answering, think it through: work out the REAL route people take from where this student is to "${goal.careerGoal}", then put every stage in the order the student will actually live it, and check that order again. A stage in the wrong place is the worst mistake you can make here.

${start}
${askStream ? `\nThe student has not chosen a Class 11–12 stream yet. Choose the stream this career needs and return it as "stream" (e.g. "Science – PCM", "Science – PCB", "Commerce", "Arts"). It is written into their Class 11 and Class 12 stages.\n` : ''}
${describeDegreeLength(goal)}

ORDER RULES. The plan is checked against these in code, and a plan that breaks them is sent back:
1. Only stages still ahead of the student, each in the place it really happens.
2. One stage per year of study: one per class, one per degree year. NEVER merge years ("Year 2–3", "Class 6–8"). Degrees have their real lengths: B.Tech / B.E. 4 years; BCA / B.Sc / B.Com / BBA / BA / Diploma 3; B.Arch 5; MBBS 4.5 years of study (Year 4 is 1.5 years) and then a 1-year compulsory internship; MCA / M.Tech / M.Sc / MBA / M.Com 2; an MS abroad 1–2. Never a year a degree does not have.
3. Every entrance exam, selection, medical or licence needed to ENTER a stage is its own stage of kind "exam", placed IMMEDIATELY BEFORE the stage it opens, with "unlocks" set to that stage's exact title. For example: JEE / NEET / CUET / NATA / CLAT between Class 12 and college; CAT / XAT before an MBA; GATE before an M.Tech; NIMCET before an MCA; IIT JAM before an IIT M.Sc; CEED before an M.Des; NEET-PG before MD / MS; UGC-NET or CSIR-NET JRF before a PhD; the DGCA medicals before flying training. Never put such an exam after the stage it opens, and never collect them at the end of the roadmap.
   Every stage that starts a new degree, training or qualification also says in "entry" which exam or selection admits the student: the exam's name (e.g. "CAT / XAT"), or "merit" when admission is on marks alone.
4. Internships happen WHILE studying — in the vacation before the final year, or during it — never after the last degree is finished. Use kind "internship". The one exception is an internship the degree itself requires after its final exams (the MBBS / BDS compulsory rotating internship, a BPT or nursing internship): it stays right after that degree's final year, and its title says it is compulsory. Leave internships out for careers that are not entered through them, and use that career's own step instead (an airline cadet programme or type rating for a pilot, articleship for a CA).
5. Follow THIS career's real route, not a generic one. A pilot: Class 12 with Physics and Maths → DGCA medicals → flying school (CPL training and the DGCA papers) → type rating → airline. A Chartered or Cost Accountant: Foundation → Intermediate → articleship / practical training → Final. A doctor: MBBS years → compulsory internship year → NEET-PG → MD / MS. Professional qualifications and their levels are stages of their own (kind "qualification" or "training").
${describeLadderRules(goal)}
6. The roadmap ENDS with getting the job, as its last stages, in this order:
   (a) kind "recruitment" — "Recruitment Exams & Hiring Tests": the tests employers or the government use to hire for this career (company hiring tests, PSU recruitment through GATE, UPSC / SSC / IBPS / state PSC, a licensing exam the job requires). Leave it out only if this career genuinely has none.
${working ? '' : '   (b) kind "job-search" — "Job Applications & Placement Preparation".\n'}   (${working ? 'b' : 'c'}) kind "first-role" — "${working ? 'Next Role' : 'First Role'} → ${goal.careerGoal}". Nothing comes after it.
7. Titles are short and specific: "B.Tech CSE Year 2", "JEE Main & Advanced", "MBA Year 1 (HR)". Where the student must choose between degrees, put the options in the title ("College Year 1: B.Tech CSE / BCA / B.Sc IT").

${KIND_GUIDE}
${previous ? `
YOUR PREVIOUS PLAN had these problems. Fix every one of them and keep everything that was right:
${previous.problems.map((p) => `- ${p.text}`).join('\n')}
That plan was:
${previous.stages.map((s, i) => `${i + 1}. [${s.kind}] ${s.title}`).join('\n')}
` : ''}
Return raw JSON only, no markdown:
{
${askStream ? '  "stream": "the Class 11–12 stream this career needs",\n' : ''}  "route": [
    { "title": "...", "kind": "...", "duration": "e.g. '1 year', '3–6 months'", "entry": "only on a stage that starts a degree, training or qualification", "unlocks": "only on an exam: the exact title of the stage it opens", "why": "one short sentence: what this stage is for" }
  ]
}`;
};

const hasHard = (checked) => checked.problems.some((p) => p.hard);
const needsAnotherLook = (checked) => checked.problems.some((p) => p.hard || p.missing);

/**
 * The roadmap's stages, in an order code has checked. Throws (502, so the
 * charge is refunded) when the model cannot produce a plan without a wrong
 * order in it, even after being shown its mistakes: a wrong roadmap is worse
 * than none, and the student can simply try again.
 */
const planRoadmap = async (ai, goal) => {
  let opening = openingStages(goal);
  const askStream = !goal.stream && opening.some((s) => s.kind === 'school' && /^Class 1[12]\b/.test(s.title));
  const ask = async (previous) => {
    const response = await generateWithRetry(ai, buildPlanPrompt(goal, opening, { askStream: askStream && !previous, previous }), {
      json: true, kind: 'roadmap-plan', thinking: PLAN_THINKING_BUDGET
    });
    return parseJsonObject(response.text);
  };

  const first = await ask(null);
  const stream = askStream && typeof first.stream === 'string' ? first.stream.trim().slice(0, 40) : '';
  if (stream) opening = openingStages(goal, { stream });

  let checked = checkPlan(first.route, goal, opening);
  if (checked.fixes.length) console.warn(`Roadmap plan corrected: ${checked.fixes.join('; ')}`);

  if (needsAnotherLook(checked)) {
    console.warn(`Roadmap plan sent back: ${checked.problems.map((p) => p.text).join(' | ')}`);
    const second = await ask({ stages: checked.stages.slice(opening.length), problems: checked.problems });
    const again = checkPlan(second.route, goal, opening);
    // The second plan is kept only when it is no worse: a reply that fixed
    // one thing and broke the order elsewhere is not an improvement.
    if (!hasHard(again) && (hasHard(checked) || again.problems.length <= checked.problems.length)) checked = again;
  }

  if (hasHard(checked)) {
    const error = new Error('The roadmap could not be put in a correct order this time. Nothing was saved — please try again.');
    error.status = 502;
    error.problems = checked.problems;
    throw error;
  }
  const soft = checked.problems.filter((p) => !p.missing);
  if (soft.length) console.warn(`Roadmap plan accepted with: ${soft.map((p) => p.text).join(' | ')}`);

  // What is still missing is filled in plain words, and the stages a student
  // has already finished go, by the same rule a saved roadmap is repaired by.
  const stages = fillMissing(checked.stages, checked.problems, goal);
  const done = new Set(completedStageIndices(stages.map((s) => ({ phase: s.title })), goal));
  return { stages: stages.filter((_, i) => !done.has(i)), stream };
};

const EXTRAS_RULES = (goal) => `
ALSO RETURN, alongside the stages:
- "currentStage": the student's current stage and what to focus on now.
- "skills" (technical, soft, life), "subjects", "courses", "books", "certifications", "projects", "internships", "careerTips": arrays of strings, right for this student's age and stage.
- "entranceExams": EVERY exam in the plan, academic and recruitment, in the order the student will sit them, each as "EXAM NAME — what it gets you and when it is held".
- "colleges": 8 to 12 OBJECTS, REAL, NAMED institutions that offer the programmes in this plan. Never placeholders like "Your Current University" or "Top Engineering Colleges". Label each honestly with "tier": "Reach", "Target" or "Safe" (at least two of each); mix government and private; prefer ${goal.state || "the student's state"}, ${goal.country || 'India'}, plus the strongest national options and, where genuinely relevant, 1 to 2 international ones.
- "motivation": encouraging advice.`;

const EXTRAS_JSON = `,
  "skills": { "technical": ["..."], "soft": ["..."], "life": ["..."] },
  "subjects": ["..."], "courses": ["..."], "books": ["..."], "certifications": ["..."], "projects": ["..."],
  "entranceExams": ["EXAM — what it gets you and when it is held"],
  "colleges": [
    { "name": "Real, named institution", "location": "City, State", "type": "Government | Private | Deemed | International",
      "programme": "The exact degree to apply for here, matching the plan", "tier": "Reach | Target | Safe",
      "entranceExam": "The exam or route that gets the student in", "eligibility": "Marks / score / qualification actually needed",
      "approxFees": "Realistic total programme cost with currency", "placement": "Typical placement outcome",
      "whyThisFits": "One or two sentences on why THIS college suits THIS student's goal" }
  ],
  "internships": ["..."], "careerTips": ["..."],
  "motivation": "..."`;

const buildWritePrompt = (goal, stages, part, courseContext, withExtras) => `
You are an expert career counsellor AI. Below is a student's roadmap plan. Its stages and their order are FINAL and have already been checked: your job is to write them up in full.
Do not output any markdown formatting other than the JSON itself. Do not use code blocks. Only return a raw JSON object.

${studentContext(goal)}
${courseContext ? `
${courseContext}
Where a stage of the roadmap is covered by one of these courses, say so in that
stage's steps by name — "Work through YATICORP's <title>" — instead of naming an
outside platform. Do not stretch: a stage nothing here covers should still point
wherever genuinely serves the student best.
` : ''}
${PROGRESSION_RULES}

THE PLAN (all ${stages.length} stages, in order):
${stages.map((s, i) => `${i + 1}. ${s.title}${s.duration ? ` — ${s.duration}` : ''}${s.why ? ` — ${s.why}` : ''}`).join('\n')}

WRITE STAGES ${part.from + 1} TO ${part.to} ONLY. Return "educationRoadmap" with exactly ${part.to - part.from} entries, one per stage, in the same order, with "phase" copied EXACTLY from the plan. Never add, drop, merge or reorder a stage.

Each stage is written for the place it holds in the plan. An exam stage covers that exam: eligibility, when it is held, how to prepare and what score is needed. "Recruitment Exams & Hiring Tests" names the ACTUAL hiring tests for this career, with eligibility, timing and how long to prepare. "Job Applications & Placement Preparation" covers the resume and portfolio, where and when to apply, referrals, and tracking applications. The first-role stage covers the realistic entry title and starting salary band for this location, the first 6–12 months, and the promotion path to "${goal.careerGoal}".

For EVERY stage provide:
- "duration": how long it lasts (e.g. "1 year", "6 months", "Ongoing").
- "focus": one sentence naming the single most important thing in it.
- "description": 3 to 4 SHORT sentences on what this stage IS and why it matters for "${goal.careerGoal}". Concrete and specific to this career, never generic. WRITE FOR A 16-YEAR-OLD, NOT A CONSULTANT: one idea per sentence, plain words. This is the overview only: do NOT list the things to do here, they belong in "actionItems".
- "actionItems": 5 to 8 SPECIFIC, doable actions naming real technologies, platforms, exams and programmes. "Learn programming" is a failure; "Build a React portfolio site and deploy it on Vercel" is correct.
- "milestones": 3 to 4 things the student can POINT AT when the stage is over (a project, a score, a certificate, an offer).
- "pitfalls": 2 to 3 mistakes students make in this exact stage, and what to do instead.
${withExtras ? EXTRAS_RULES(goal) : ''}

Required JSON Structure:
{${withExtras ? '\n  "currentStage": "...",' : ''}
  "educationRoadmap": [
    { "phase": "the exact title from the plan", "duration": "...", "focus": "...", "description": "...", "actionItems": ["..."], "milestones": ["..."], "pitfalls": ["..."] }
  ]${withExtras ? EXTRAS_JSON : ''}
}
`;

/** Every stage of the plan written up, in the plan's order and under its titles. */
const writeRoadmap = async (ai, goal, stages, courseContext) => {
  const written = new Array(stages.length).fill(null);
  let extras = null;
  let partialExtras = null;

  const writePart = async (part, withExtras) => {
    const response = await generateWithRetry(ai, buildWritePrompt(goal, stages, part, courseContext, withExtras), { json: true, kind: 'roadmap' });
    const reply = parseJsonObject(response.text);
    const phases = Array.isArray(reply.educationRoadmap) ? reply.educationRoadmap.filter((p) => p && typeof p === 'object') : [];
    const wanted = stages.slice(part.from, part.to);
    wanted.forEach((stage, k) => {
      // By title; by place only when the reply has exactly the stages asked for.
      const phase = phases.find((p) => norm(p.phase) === norm(stage.title)) || (phases.length === wanted.length ? phases[k] : null);
      if (phase && (phase.description || (Array.isArray(phase.actionItems) && phase.actionItems.length))) written[part.from + k] = phase;
    });
    // Only a complete set: "motivation" comes last, so a reply cut off on
    // the way (one came back with a single college) is missing it, and is
    // asked for again below.
    if (withExtras) {
      const { educationRoadmap, ...rest } = reply;
      if (rest.motivation) extras = rest;
      else partialExtras = partialExtras || rest;
    }
  };

  const parts = [];
  for (let from = 0; from < stages.length; from += WRITE_CHUNK) parts.push({ from, to: Math.min(stages.length, from + WRITE_CHUNK) });
  const results = await Promise.allSettled(parts.map((part, n) => writePart(part, n === 0)));
  for (const r of results) {
    if (r.status === 'rejected' && r.reason instanceof aiQuota.AiBudgetError) throw r.reason;
    if (r.status === 'rejected') console.warn('A roadmap part could not be written:', r.reason?.message);
  }

  // One more try for whatever did not come back, in runs of missing stages.
  const runs = [];
  written.forEach((w, i) => {
    if (w) return;
    const run = runs[runs.length - 1];
    if (run && run.to === i && run.to - run.from < WRITE_CHUNK) run.to = i + 1;
    else runs.push({ from: i, to: i + 1 });
  });
  if (!extras && !runs.length) runs.push({ from: 0, to: 1 });
  if (runs.length) {
    const retry = await Promise.allSettled(runs.map((part, n) => writePart(part, !extras && n === 0)));
    for (const r of retry) if (r.status === 'rejected' && r.reason instanceof aiQuota.AiBudgetError) throw r.reason;
  }

  if (written.some((w) => !w)) {
    const error = new Error('Part of the roadmap could not be written this time. Nothing was saved — please try again.');
    error.status = 502;
    throw error;
  }

  const educationRoadmap = stages.map((stage, i) => ({
    ...written[i],
    phase: stage.title,
    duration: stage.duration || written[i].duration,
    kind: stage.kind
  }));
  return {
    // A cut-off set twice over still beats none: its colleges and skills are real.
    ...(extras || partialExtras || {}),
    // Arithmetic, so not the model's: see timelineFor.
    timeline: timelineFor(educationRoadmap.map((p) => ({ title: p.phase, kind: p.kind, duration: p.duration }))),
    educationRoadmap
  };
};

const generateRoadmapFromAI = async (goal, courseContext = '') => {
  const ai = await geminiClient();
  try {
    const { stages } = await planRoadmap(ai, goal);
    return await writeRoadmap(ai, goal, stages, courseContext);
  } catch (error) {
    console.error('Roadmap generation error:', error.message);
    // A spent allowance is not a generation failure. Re-wrapping it would
    // strip the 429 and the reset time off it and report a healthy service
    // as broken, so it passes through untouched. So does anything that
    // already says what happened and carries its status.
    if (error instanceof aiQuota.AiBudgetError || error.status) throw error;
    throw new Error('Failed to generate roadmap from AI: ' + error.message);
  }
};

const generateTasksFromAI = async (goal, roadmap) => {
  const ai = await geminiClient();

  const prompt = `
You are an expert education and career planner AI. Based on the user's career roadmap, generate a structured list of initial Daily, Weekly, and Monthly learning tasks.

User Context:
- Education Level: ${goal.educationLevel}
- Desired Career Goal: ${goal.careerGoal}
- Current Stage: ${roadmap.roadmapData.currentStage}

${PROGRESSION_RULES}

Follow these STRICT rules:
1. Do not assign advanced tasks to beginners.
2. If Primary School: generate tasks like reading, observing, drawing, basic science activities. NO internships, coding projects, or certifications.
3. If High School: subject practice, exam prep.
4. If College: coding, projects, certifications, internships.
5. If Working Professional: career growth, certifications, leadership, networking.
6. "skill" on each task names which of your own "skillsToDevelop" entries that task moves
   forward. Copy the skillName EXACTLY as you wrote it below — the two lists are checked against
   each other, and a name that matches nothing is discarded, leaving the task counting towards
   nothing. Omit "skill" when a task genuinely advances none of them. Do not reach for the
   closest-sounding one: crediting the wrong skill is worse than crediting none, because the
   student's skill profile is what gets shown to employers.
7. Return AT MOST 8 entries in "skillsToDevelop". More than that is a list, not a focus.
8. Return raw JSON matching the structure below. Do NOT use markdown code blocks.

Required JSON Structure:
{
  "currentFocus": ["Focus point 1", "Focus point 2"],
  "tasks": [
    {
      "title": "Task title",
      "description": "Task description",
      "category": "Daily|Weekly|Monthly",
      "duration": "e.g., 30 mins",
      "skill": "OPTIONAL. Exact skillName copied from skillsToDevelop below. Omit if none applies."
    }
  ],
  "skillsToDevelop": [
    {
      "skillName": "skill name",
      "level": "Beginner|Intermediate|Advanced|Expert",
      "progress": 0
    }
  ],
  "learningResources": {
    "courses": ["Course 1", "Course 2"],
    "books": ["Book 1", "Book 2"]
  }
}
`;

  try {
    const response = await generateWithRetry(ai, prompt, { json: true, kind: 'tasks' });
    return parseJsonObject(response.text);
  } catch (error) {
    console.error('Gemini API Error for Tasks:', error);
    // A spent allowance is not a generation failure. Re-wrapping it would
    // strip the 429 and the reset time off it and report a healthy service
    // as broken, so it passes through untouched.
    if (error instanceof aiQuota.AiBudgetError) throw error;
    throw new Error('Failed to generate tasks from AI: ' + error.message);
  }
};

const generateRecommendationsFromAI = async (goal, roadmap, courseContext = '') => {
  const ai = await geminiClient();

  const prompt = `
You are an expert career and education counselor AI. Based on the user's details and roadmap, generate a massive list of customized recommendations in structured JSON format.

User Context:
- Education Level: ${goal.educationLevel}
- Degree/Class: ${goal.currentClass || goal.degree} ${goal.specialization || ''}
- Career Goal: ${goal.careerGoal}
- Location: ${goal.country || 'Global'}
- Current Stage: ${roadmap?.roadmapData?.currentStage || 'Starting out'}
${courseContext ? `
${courseContext}
` : ''}
${PROGRESSION_RULES}

Rules:
1. Primary School: NO internships, NO advanced certifications, NO college admissions. Focus on basic skills, kids science sites, etc.
2. High School: Recommend subjects, competitions, scholarships, entrance exams.
3. College Students: Internships, certifications, advanced courses, GitHub, LinkedIn.
4. Working Professionals: Career transition courses, leadership, networking, advanced certs.
5. The "colleges" array MUST cover EVERY education stage the user still has ahead of them, from their CURRENT education level all the way to their career goal - not just the undergraduate stage. Walk the same path as their roadmap:
   - If they are in Class 10 or below: recommend schools/PU colleges for Class 11-12 FIRST, then undergraduate colleges, then postgraduate institutes.
   - If they are in Class 11-12: recommend undergraduate colleges FIRST, then postgraduate institutes.
   - If they are already an undergraduate: recommend postgraduate institutes.
   Every entry MUST carry a "stage" field naming the exact stage it is for (e.g. "Class 11-12 (PU / Pre-University)", "Undergraduate (B.Tech / BCA / B.Sc)", "Postgraduate (M.Tech / MCA / M.Sc)"). Order the array by stage, earliest first.
   Give roughly 2-4 institutions per stage, and prefer options realistic for the user's stated location and budget. Include one or two strong national or international options where relevant.
6. The "internships" array MUST be filled with opportunities the user can REALISTICALLY get at their stage, and each entry MUST carry a "stage" field saying when they can apply. Be honest about what is available at each level:
   - School / Class 11-12: virtual and open-to-all programmes only - e.g. open-source contribution programmes, Google Summer of Code prep, GirlScript Summer of Code, online skill internships, NGO or school tech-club projects, freelance micro-projects. Do NOT list corporate SDE internships they cannot apply for yet.
   - Undergraduate: summer internships at real companies, Google STEP / Microsoft Engage / Amazon SDE intern style programmes, startup internships, research internships (IIT/IISc), and internship platforms (Internshala, LetsIntern, Unstop).
   - Postgraduate: research internships, teaching/research assistantships, and senior industry internships.
   Order the array by stage, earliest first. If the user is in Primary or Middle School, return an EMPTY array for internships - they are not age-appropriate.
7. Return ONLY a valid JSON object matching the exact keys below. Provide arrays of objects for each key.

JSON Schema (Strict):
{
  "colleges": [{ "stage": "Which education stage this is for, e.g. 'Class 11-12 (PU)' / 'Undergraduate (B.Tech)' / 'Postgraduate (M.Tech)'", "name": "Name", "location": "Location", "programs": "Programs", "why": "Why recommend", "requirements": "Reqs", "fees": "Fees", "link": "URL" }],
  "internships": [{ "stage": "When the user can realistically do this, e.g. 'Class 11-12' / 'Undergraduate Year 2-3' / 'Postgraduate'", "title": "Internship / programme name", "organisation": "Company or organisation", "mode": "Remote / On-site / Hybrid", "duration": "e.g. 8 weeks", "eligibility": "Who can apply", "stipend": "Paid or unpaid, and typical amount", "whenToApply": "Typical application window", "link": "URL" }],
  "yaticorpCourses": [{ "courseId": "The id in square brackets from the YATICORP list above - copy it EXACTLY", "title": "The course title, copied exactly", "why": "One sentence on what this course gives them for their goal", "when": "Now / After finishing X / Before applying for internships" }],
  "courses": [{ "title": "Title", "provider": "Provider", "duration": "Duration", "difficulty": "Level", "skills": "Skills", "pricing": "Free/Paid", "link": "URL" }],
  "certifications": [{ "title": "Title", "provider": "Provider", "description": "Desc", "link": "URL" }],
  "books": [{ "title": "Title", "author": "Author", "description": "Desc", "why": "Why useful" }],
  "scholarships": [{ "name": "Name", "eligibility": "Reqs", "deadline": "Deadline", "link": "URL" }],
  "youtubeChannels": [{ "name": "Name", "description": "Desc", "link": "URL" }],
  "practiceResources": [{ "name": "Name", "type": "Platform Type", "link": "URL" }],
  "competitions": [{ "name": "Name", "type": "Type", "description": "Desc", "link": "URL" }],
  "communities": [{ "name": "Name", "platform": "Platform", "description": "Desc", "link": "URL" }],
  "careerTips": [{ "title": "Tip Title", "description": "Tip Desc" }]
}

"yaticorpCourses" is for courses from the YATICORP list above and NOTHING else.
Never invent a course or an id for it: every entry must copy a title and id given
above verbatim. Return an empty array if no YATICORP course genuinely fits, and
never pad it. Put outside platforms (Coursera, Udemy, NPTEL and the like) in
"courses" instead, and leave out of "courses" anything already covered by a
YATICORP course you listed - the student should not be sent to pay for something
they can already open.

If a category is completely inapplicable (e.g., certifications for a 10 year old), return an empty array for that key. Do NOT use markdown code blocks, just raw JSON.
`;

  try {
    const response = await generateWithRetry(ai, prompt, { json: true, kind: 'recommendations' });
    return parseJsonObject(response.text);
  } catch (error) {
    console.error('Gemini API Error for Recommendations:', error);
    // A spent allowance is not a generation failure. Re-wrapping it would
    // strip the 429 and the reset time off it and report a healthy service
    // as broken, so it passes through untouched.
    if (error instanceof aiQuota.AiBudgetError) throw error;
    throw new Error('Failed to generate recommendations from AI: ' + error.message);
  }
};

/**
 * A scholarship list for one student: real, named schemes they can actually
 * apply to from where they are, with who each is for and when it closes.
 */
/**
 * The eligibility facts a student chose to give, as prompt lines. Anything
 * left blank is simply absent: telling the model "category: not given" invites
 * it to assume one, and an assumed caste produces a list of schemes the
 * student cannot actually apply for.
 */
const eligibilityLines = (profile) => {
  if (!profile) return '';
  const bits = [];
  if (profile.category) bits.push(`- Category: ${profile.category}`);
  if (profile.minority && profile.minority !== 'Not applicable') bits.push(`- Minority community: ${profile.minority}`);
  if (profile.familyIncome) bits.push(`- Annual family income: ${profile.familyIncome}`);
  if (profile.gender && profile.gender !== 'Prefer not to say') bits.push(`- Gender: ${profile.gender}`);
  if (profile.disability) {
    bits.push(`- Has a disability${profile.disabilityPercent ? ` (${profile.disabilityPercent}%)` : ''}`);
  }
  if (profile.lastScore) bits.push(`- Most recent result: ${profile.lastScore}`);
  if (profile.institutionType) bits.push(`- Institution type: ${profile.institutionType}`);
  if (profile.circumstances?.length) bits.push(`- Also applies: ${profile.circumstances.join(', ')}`);
  return bits.length ? `\n\nEligibility the student has declared:\n${bits.join('\n')}` : '';
};

const generateScholarshipsFromAI = async (goal, roadmap, profile) => {
  const ai = await geminiClient();

  const prompt = `
You are an expert education-funding counsellor. Build a list of scholarships this student can realistically apply for.

Student:
- Education level: ${goal.educationLevel}
- Class / degree: ${goal.currentClass || goal.degree || ''} ${goal.specialization || ''}
- Stream / board: ${goal.stream || ''} ${goal.board || ''}
- Career goal: ${goal.careerGoal}
- Country: ${goal.country || 'India'}
- Current stage on their roadmap: ${roadmap?.roadmapData?.currentStage || describeCurrentStage(goal)}${eligibilityLines(profile)}

Rules:
1. Only REAL, currently running scholarships, fellowships and grants. Government schemes, national scholarship portals, foundations, corporate CSR programmes, university merit awards and international programmes that fit this student's country and stage. Never invent a scheme.
2. Match the student's stage: a school student gets school and pre-university awards and entrance-linked scholarships; an undergraduate gets degree, internship-linked and postgraduate-entry awards; a postgraduate gets research, fellowship and study-abroad funding; a working professional gets upskilling and executive-education funding.
3. Prefer schemes tied to the career goal and stream, then broad merit and need-based ones.
3a. Where the student has declared eligibility above, put the schemes reserved for them first: category, minority, income, gender, disability and special-track awards are usually far less competitive than open merit ones, and are the whole reason those details were asked for.
3b. Never assume anything the student did not declare. If no category is given, do not guess one; offer open schemes instead of reserved ones.
3c. Say plainly in "eligibility" when a scheme has an income ceiling or a category requirement, so nobody applies for something they cannot get.
4. Return 10 to 14 entries, most relevant first.
5. "deadline": the usual application window, as a short phrase ("Usually July to October", "Rolling", "Announced each January"). Give an exact date only if it is fixed every year.
6. "link": the official application or information page. Leave it "" if unsure - never guess a URL.
7. "amount": what it is worth, in the student's currency, briefly. "" if it varies too much to say.

Return ONLY raw JSON, no markdown:
{
  "scholarships": [
    { "name": "Official name", "provider": "Who runs it", "amount": "What it is worth", "eligibility": "One or two sentences on who can apply", "deadline": "When to apply", "link": "URL or empty", "why": "One sentence on why it fits THIS student" }
  ]
}
`;

  try {
    const response = await generateWithRetry(ai, prompt, { json: true, kind: 'scholarships' });
    return parseJsonObject(response.text);
  } catch (error) {
    console.error('Gemini API Error for Scholarships:', error);
    if (error instanceof aiQuota.AiBudgetError) throw error;
    throw new Error('Failed to find scholarships: ' + error.message);
  }
};

// Local copy rather than an import from dailyPlanService, which requires this
// file — importing it back would be a cycle. Three lines is cheaper than the
// refactor that would remove the duplication.
const mentorStartOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Where the student actually stands, for the mentor prompt.
 *
 * `currentStage` alone is not enough: it is a sentence written once when the
 * roadmap was generated, so it says the same thing after the student has ticked
 * off four phases as it did on day one. This reads the live position instead —
 * which phase is open now, what is on today's plan, what was left unfinished.
 *
 * Without this the mentor was handed two integers and a skill list, so "what
 * should I do next?" could only ever be answered in general terms. It now has
 * the same view of the student that the dashboard has.
 */
const buildMentorContext = (goal, roadmap, tasks = [], skills = [], events = [], courses = []) => {
  const lines = [];

  // What the student put on their own calendar. This is the most consequential
  // thing the mentor was missing: an exam on Thursday changes the right answer
  // to almost every question asked on Tuesday, and the app already knows about
  // it. Without this the mentor cheerfully suggests starting a new topic to
  // someone sitting a paper in two days.
  const todayStart = mentorStartOfDay();
  const upcoming = events
    .map((e) => {
      const when = mentorStartOfDay(new Date(`${e.date}T00:00:00`));
      return { ...e, days: Math.round((when - todayStart) / 86400000) };
    })
    .filter((e) => e.days >= 0 && e.days <= 30)
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);

  if (upcoming.length) {
    lines.push('- On their own calendar (dates THEY entered — trust these):');
    upcoming.forEach((e) => {
      const when =
        e.days === 0 ? 'TODAY' : e.days === 1 ? 'TOMORROW' : `in ${e.days} days`;
      lines.push(`    • ${e.type}: "${e.title}" — ${when} (${e.date})`);
    });
  }

  const phases = roadmap?.roadmapData?.educationRoadmap;
  if (Array.isArray(phases) && phases.length) {
    const done = new Set(roadmap.completedPhases || []);
    const currentIndex = phases.findIndex((_, i) => !done.has(i));
    const current = currentIndex >= 0 ? phases[currentIndex] : null;

    if (current) {
      lines.push(`- Roadmap phase now: "${current.phase}" (phase ${currentIndex + 1} of ${phases.length}, ${done.size} ticked off)`);
      if (current.focus) lines.push(`- What that phase is for: ${current.focus}`);
    } else {
      lines.push(`- Roadmap: all ${phases.length} phases ticked off; due for a regenerate.`);
    }
  }
  if (roadmap?.roadmapData?.timeline) {
    lines.push(`- Timeline on their roadmap: ${roadmap.roadmapData.timeline}`);
  }

  // Today's plan, verbatim. This is the single most common thing a student is
  // actually asking about when they open the mentor.
  const today = mentorStartOfDay().getTime();
  const todays = tasks.filter(
    (t) => t.assignedDate && mentorStartOfDay(t.assignedDate).getTime() === today
  );
  if (todays.length) {
    lines.push('- On their plan today:');
    todays.forEach((t) =>
      lines.push(`    • ${t.title}${t.duration ? ` (${t.duration})` : ''} — ${t.status}`)
    );
  } else {
    lines.push('- Nothing on their plan today yet.');
  }

  // Unfinished work from earlier days, which is usually what "am I behind?"
  // really means. Capped so a long backlog cannot crowd out the question.
  const open = tasks.filter(
    (t) =>
      t.status !== 'Completed' &&
      (!t.assignedDate || mentorStartOfDay(t.assignedDate).getTime() < today)
  );
  if (open.length) {
    const names = open.slice(0, 5).map((t) => `"${t.title}"`).join(', ');
    lines.push(`- Left unfinished from earlier days (${open.length}): ${names}${open.length > 5 ? ', …' : ''}`);
  }

  const completed = tasks.filter((t) => t.status === 'Completed').length;
  lines.push(`- Tasks finished in Career Path so far: ${completed}`);

  lines.push(
    skills.length
      ? `- Skills they are tracking here: ${skills.map((s) => `${s.skillName} (${s.level}, ${s.progress}%)`).join(', ')}`
      : '- Skills they are tracking here: none added'
  );

  // The courses they actually own. Until this was added the mentor could be
  // asked "what should I learn next?" by a student sitting on a half-finished
  // YATICORP course and would answer with a YouTube channel, because a course
  // they had already paid for was the one thing it could not see.
  if (courses.length) {
    lines.push('- Their YATICORP courses right now:');
    for (const c of courses) {
      const state = c.progress >= 100 ? 'finished'
        : c.started ? `${c.progress}% done`
        : 'not started';
      lines.push(`    • "${c.title}" — ${state} [${c.courseId}]`);
    }
    const unfinished = courses.filter((c) => c.started && c.progress < 100);
    if (unfinished.length) {
      lines.push(
        `    (Half-finished work is the first thing to point at when they ask what to do next: ${unfinished
          .map((c) => `"${c.title}"`)
          .join(', ')}.)`
      );
    }
  }

  return lines.join('\n');
};

const generateMentorResponse = async (user, goal, roadmap, tasks, skills, chatHistory, newQuestion, events = [], courses = []) => {
  const ai = await geminiClient();

  const liveContext = buildMentorContext(goal, roadmap, tasks, skills, events, courses);

  // The model has no clock. Without this it cannot work out how long is left
  // before an exam it has just been told the date of, and it will happily
  // answer "how long do I have?" with arithmetic it cannot do.
  const todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const systemInstruction = `
You are an experienced AI Career Mentor for YATICORP's "Career Path" section.
Do NOT give generic advice. Base all your answers strictly on the user's context provided below.

You are talking to a student. They are often young, usually anxious about their
future, and they have to want to come back tomorrow. Be warm, patient and
respectful — and be honest with them.

Those two are not in tension. The kindest thing you can do is tell them the
truth gently and then show them the way forward. Flattery that leaves them
unprepared is not kindness, and bluntness that makes a sixteen-year-old close
the app helps nobody either. Say the true thing, say it kindly.

User Profile:
- Name: ${user.name}
- Education Level: ${goal?.educationLevel || 'N/A'}
- Degree/Class: ${goal?.degree || goal?.currentClass || 'N/A'} ${goal?.specialization || ''}
- Board: ${goal?.board || 'N/A'}
- Stream / subject combination: ${goal?.stream || 'N/A'}
- Where they live: ${[goal?.state, goal?.country].filter(Boolean).join(', ') || 'N/A'}
- Career Goal: ${goal?.careerGoal || 'N/A'}
- Dream Company: ${goal?.dreamCompany || 'N/A'}
- Current Stage: ${roadmap?.roadmapData?.currentStage || 'N/A'}

Today's date: ${todayLabel}

Where they are right now:
${liveContext}

${PROGRESSION_RULES}

Rules:
1. Age-appropriate advice (e.g., simple language and no advanced coding/internships for Primary School; focus on placements/projects for College students).

2. USE the "Where they are right now" block to make the answer specific — name their actual phase or their actual task when the question is about what to do next. But do NOT recite it.
   - Never open a reply with their statistics. "You have 0 tasks completed and no skills tracked" is not an answer to anything.
   - Mention a number ONLY if they asked about their progress, or if the number changes your recommendation. Most replies should contain none.
   - Never repeat a fact about their progress that you have already mentioned earlier in this conversation.
   - Name a task only when it genuinely answers what they asked. A physiology task is not revision for a physics paper, and stapling today's task onto an unrelated question makes the advice wrong, not personal. If nothing in their data fits the question, answer the question on its own.

2a. THAT DATA MEASURES THIS APP, NOT THE STUDENT. Counts of 0 and "none added" mean Career Path has not recorded anything — a student who has never opened the tracker looks identical to one who has never studied.
   - NEVER tell them they are "behind", "starting from scratch", "at zero" or "further along than they think" on the strength of empty tracking data.
   - The reverse is equally false, and being kind is not a reason to say it. Do NOT reassure them that they are "not behind", "right on track" or "doing fine" either — with no data, that is a guess dressed up as comfort. Say plainly that you cannot tell from what is here, then help them find out.
   - If their real level actually matters to the answer, ask them one short question instead of inferring it.
   - Unfinished tasks and ticked-off phases ARE real evidence — those they did in the app. Use those freely.

2b. THEIR CALENDAR OUTRANKS THE ROADMAP. An exam they entered is a fixed date; the roadmap is a plan that can move.
   - If an exam is TODAY or TOMORROW, do not hand them a new topic to learn. Revision, sleep and logistics are the whole answer.
   - When something is within a week, say how long is left in plain words ("three days") and shape the answer around it.
   - Count days from "Today's date" above and the date on the event. Never guess at how far away something is, and never contradict a date they entered.
   - Career Path deliberately leaves the day before an exam free of tasks. If they ask why there is nothing on their plan, that is the reason — it is not a fault.

3. BE KIND IN HOW YOU SAY IT. The substance never softens; the delivery always does.
   - Suggest rather than command. "I'd leave Kubernetes for a bit later" — not "Stop looking at Kubernetes". Prefer "you could", "I'd suggest", "it's worth", "let's". Avoid "you need to", "you must", "you have to" and "focus entirely on" — say the same thing as a recommendation.
   - When they tell you something is going badly, answer the feeling in your first sentence before you answer the question. Do not brush past it to the advice, and do not tell them what their focus should be instead of how they feel.
   - Never answer with a bare "No." When you disagree, name the sensible part of their thinking in a few words first, then give your actual answer.
   - When the news is bad — a timeline that will not work, a real flaw in their plan, work they have not done — say it plainly but without judgement, and follow it immediately with the concrete next step. Never leave them holding only the problem.
   - Never use words that shame: "waste of time", "nowhere near", "pointless", "obviously", "you failed", "just do X". Describe the situation, never the person.
   - Use their name when it falls naturally, not in every reply.
   - Politeness is NOT vagueness, and it is NOT licence to pad. Stay inside the length limit — the warmth belongs in your word choice, not in extra sentences.

4. BE HONEST. Kindly, but without flinching:
   - NEVER invent specifics. Cut-offs, salary figures, fee amounts, exam dates, acceptance rates, hiring numbers, programme names, course titles — if you are not confident it is true, do not state it. Say "I'm not certain of the current figure — check the official site" in a few words instead. A made-up number that sounds right is the worst thing you can give them.
   - Use ONLY the profile and progress data above. If it does not contain what you need, say so, or ask ONE short clarifying question. Never guess at their marks, budget, location, or skill level, and never claim progress they do not have.
   - If "Skills Tracked" is "None yet" or a field is "N/A", treat it as unknown. Do not describe them as being partway through something.
   - Do not dodge the uncomfortable thing when it is true. If a goal will not fit their timeline, or their plan has a real flaw, say so gently and clearly, then give the concrete gap to close. Softening it into meaninglessness is not politeness — it just leaves them unprepared.
   - Disagree when they are wrong, courteously. If their question rests on a false premise, correct it in one gentle sentence before answering.
   - No hollow praise. Do not compliment effort that has not happened. Encouragement must be earned by something actually in their data.
   - Do not hedge everything either. Where you do know, commit to a clear recommendation rather than listing caveats.
   - "I don't know" is a complete and acceptable answer when paired with where to find out.
   - Their board, stream and state decide which syllabus, exams and quotas actually apply to them. Use them. Never answer a Karnataka PUC student with CBSE subject names, or point a state-board student at an exam their state does not use.
   - Anything that changes year to year — dates, cut-offs, fees, seat counts, eligibility rules, syllabi — may have moved since you last saw it. Name the official source and let them check rather than stating a figure with confidence.

5. LENGTH — THIS IS A CHAT, NOT AN ARTICLE. These limits are hard:
   - Default to 80 WORDS OR FEWER. That is two or three short sentences, or three or four bullets. Most questions deserve less.
   - Put the actual answer in the FIRST sentence — or, when you are disagreeing with them, after at most one short clause acknowledging their thinking. Never open with empty praise ("Great question!", "Absolutely!", "That's a smart thing to be thinking about"), never restate the question back, never close with a sign-off ("Hope this helps!", "Let me know if..."). Warmth is not filler.
   - One idea per bullet, roughly 12 words each. No sub-bullets. No headings. Bold at most two or three words in the whole reply.

5a. HOW TO LAY IT OUT. Markdown, and it has to render as markdown:
   - Write list items as "- item", each on ITS OWN LINE, with a real line break between them. NEVER string them along one line, and NEVER use the "•" character — it renders as a paragraph and three separate points arrive as one block of text.
   - When the items happen in an order — steps to follow, a sequence to work through — number them "1." "2." "3." on their own lines. Use "-" only for things that have no order, like a set of options.
   - One short lead-in line before a list, and at most one line after it. Do not repeat the items in prose as well.
   - Two or more items is a list. A single point is a sentence, not a one-item list.
   - Give the single best next step. Do NOT enumerate every option you can think of — one recommendation plus at most two alternatives.
   - Do not re-explain anything already said earlier in this conversation. Refer back to it in a few words instead.
   - Go longer ONLY when they ask for it — a plan, a list, a comparison, "in detail", "explain more", "more", "expand", "go on", "elaborate", "tell me more", "why" — and even then stop at 200 words.
   - "more" and its cousins mean GO DEEPER ON WHAT YOU JUST SAID, not "here is another short list of different things". Expand the points already made: explain the reasoning, add the detail you left out, give an example. Only introduce new items if they explicitly asked for more items.
   - Once they have asked for detail, stay detailed for that thread until they change subject. Do not snap back to two sentences on the next follow-up.
   - A correct answer in 30 words is better than the same answer in 150. Length is not helpfulness.

6. If the user asks a question unrelated to education or career, steer them back warmly, in ONE sentence.
  `;

  // Format history for Gemini API (if using gemini-2.5-flash with chat history)
  // For simplicity with generateContent, we can construct a unified prompt string 
  // or use the chat sessions API. Let's use a unified prompt string for statelessness.
  
  let conversationContext = `System Instruction:\n${systemInstruction}\n\nChat History:\n`;
  chatHistory.forEach(msg => {
    conversationContext += `${msg.role === 'user' ? 'User' : 'Mentor'}: ${msg.message}\n`;
  });
  // Restated at the very end as well as in the system block. The length rule is
  // the one most easily lost in a long prompt, and the last instruction before
  // generation is the one a model weights most heavily.
  conversationContext += `\nUser's New Question: ${newQuestion}\n\n(Reply in 80 words or fewer unless they asked for detail. Warm and respectful — suggest, never command, and never shame. Answer first, no empty praise, no sign-off.)\nMentor: `;

  try {
    // A ceiling, not a target — roughly 600 words. The prompt does the real
    // work; this only stops a runaway essay, and sits far enough above the
    // 80-word target that a normal reply is never cut mid-sentence.
    const response = await generateWithRetry(ai, conversationContext, { maxOutputTokens: 800, kind: 'mentor' });
    return response.text;
  } catch (error) {
    console.error('Gemini API Error for Mentor Chat:', error);
    // A spent allowance is not a generation failure. Re-wrapping it would
    // strip the 429 and the reset time off it and report a healthy service
    // as broken, so it passes through untouched.
    if (error instanceof aiQuota.AiBudgetError) throw error;
    throw new Error('Failed to get response from AI Mentor: ' + error.message);
  }
};

const generateStudyMaterialFromAI = async (skillName, goal, level) => {
  const ai = await geminiClient();

  const prompt = `
You are an expert tutor. Build a compact study pack for ONE skill so a student can learn it, watch good videos on it, and test themselves.

Skill to teach: ${skillName}
Student's education level: ${goal?.educationLevel || 'Not specified'}
Student's career goal: ${goal?.careerGoal || 'Not specified'}
Student's current level in this skill: ${level || 'Beginner'}

${PROGRESSION_RULES}

Rules:
1. Pitch everything at the student's education level and their current level in this skill. A Class 8 student and a final-year undergraduate must not get the same notes.
2. Notes must TEACH, not merely list topics. Each point should be a complete, self-contained statement a student can revise from.
3. For videos, DO NOT invent YouTube URLs, video IDs, or video titles - you cannot know them and wrong ones waste the student's time. Instead give a precise "searchQuery" that reliably surfaces good material, and name a "channel" genuinely known for teaching this topic well.
4. Quiz questions must test understanding, not trivia recall. Exactly 4 options each. "correctIndex" is the 0-based index of the correct option and MUST be accurate.
5. Vary which position the correct answer sits in across the questions - do not make it always the same index.
6. Every explanation must say WHY the correct answer is right, not just restate it.
7. Return ONLY raw JSON matching the structure below. No markdown code fences.

Required JSON Structure:
{
  "notes": {
    "summary": "2-3 sentence plain-language overview of what this skill is and why it matters for the student's goal.",
    "sections": [
      { "heading": "Section title", "points": ["Complete teaching statement 1", "Complete teaching statement 2", "Complete teaching statement 3"] }
    ],
    "keyTerms": [
      { "term": "Term", "definition": "One-sentence definition in plain language." }
    ]
  },
  "videos": [
    { "topic": "What this video should cover", "searchQuery": "exact phrase to search on YouTube", "channel": "A channel genuinely known for this topic", "why": "One line on what the student will get from it." }
  ],
  "quiz": [
    { "question": "Question text", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "Why that answer is correct." }
  ]
}

Provide 3-5 sections, 4-6 key terms, 4 videos, and at least 5 quiz questions (5 or 6 — never fewer than 5).
`;

  try {
    const response = await generateWithRetry(ai, prompt, { json: true, kind: 'study-material' });
    return parseJsonObject(response.text);
  } catch (error) {
    console.error('Gemini API Error for Study Material:', error);
    // A spent allowance is not a generation failure. Re-wrapping it would
    // strip the 429 and the reset time off it and report a healthy service
    // as broken, so it passes through untouched.
    if (error instanceof aiQuota.AiBudgetError) throw error;
    throw new Error('Failed to generate study material: ' + error.message);
  }
};

/**
 * Build ONE day's tasks, given what the student has already done and missed.
 *
 * Separate from generateTasksFromAI, which produces the opening batch and has no
 * memory. Here the recent history goes into the prompt, so each day moves the
 * student forward instead of restating yesterday — and repeatedly skipped work
 * comes back in a smaller form rather than being silently dropped.
 *
 * @param {object} goal      the student's goal
 * @param {object} roadmap   their roadmap, for the current stage
 * @param {object} history   { completed: [], skipped: [], dayNumber }
 * @param {number} minutes   how much time the student actually has today
 */
/**
 * How many tasks a given budget may produce.
 *
 * A short day must produce a genuinely short plan. Left to itself the model
 * returns "3-5 tasks" regardless of the budget, which is exactly what makes a
 * busy person give up — so the count is derived here and stated as a hard cap.
 *
 * Exported because dailyPlanService enforces the same ceiling on what actually
 * comes back. Two copies of this rule would drift, and the drift would show up
 * as a plan that quietly ignores the time the student chose.
 */
/**
 * One task a day, with no exception.
 *
 * A plan is only a plan if it gets finished, and a list of five is a list that
 * gets abandoned on day three. The short-task exception that used to live here
 * — a second task when the first was under thirty minutes — is gone: the
 * planner offers "Generate another task" instead, so a student who wants more
 * asks for it rather than being handed it. dailyPlanService enforces the same
 * single-task rule on whatever comes back, because a prompt is a request.
 */
const generateDailyTasksFromAI = async (goal, roadmap, history = {}, minutes = 60, trackedSkills = []) => {
  const ai = await geminiClient();

  const list = (items, empty) =>
    items?.length ? items.map((t) => `- ${t}`).join('\n') : `(${empty})`;

  const prompt = `
You are a personal education consultant writing ONE student's plan for today.

Student:
- Education Level: ${goal.educationLevel}
- Career Goal: ${goal.careerGoal}
${goal.dreamCompany ? `- Dream Company: ${goal.dreamCompany}` : ''}
- Current Stage: ${roadmap?.roadmapData?.currentStage || 'Just starting'}
- This is day ${history.dayNumber || 1} of their plan.

Tasks they have COMPLETED recently (do NOT repeat these):
${list(history.completed, 'nothing yet - this is their first day')}

Tasks they SKIPPED and never finished:
${list(history.skipped, 'none')}

${PROGRESSION_RULES}

SKILLS BEING TRACKED for this student (choose "skill" from exactly this list):
${list(trackedSkills, 'none tracked yet - omit the skill field entirely')}

TIME AVAILABLE TODAY: ${minutes} minutes. This is the single most important constraint.

Rules for today's plan:
1. GIVE EXACTLY ONE TASK. One real, finishable task is the entire plan for today. There are no exceptions — never return two, and never return more.
2. If a student wants more work they will ask for it themselves; the app has a button for that. Your job is the one task the day opens with, not the whole day's capacity.
3. Prefer one substantial task over a small one. Splitting a good 45-minute task into halves, or shrinking it so a second could fit, is exactly the padding this rule exists to prevent.
4. The total duration must be AT OR UNDER ${minutes} minutes. Never pad to fill the time — a short honest plan that gets finished beats a full one that gets abandoned.
5. Today's task must be DIFFERENT from everything in the completed list. Move them forward to the next thing, never restate what they already did.
6. Build on the completed work — today should be the logical next step after it, not an unrelated jump.
7. If something was skipped, you may bring the idea back ONCE, but broken into a smaller, easier first step. A task skipped repeatedly was too big or too dull; change the approach rather than reissuing it.
8. Every task must be concrete and finishable today. "Learn React" is not a task; "Build a counter component using useState" is.
9. Category is "Daily" for today's work. Use "Weekly" or "Monthly" only for a larger piece of work today contributes to.
10. "duration" must be realistic for the task and the numbers must add up to ${minutes} minutes or fewer.

11. "learning" says how the student should learn this task. Most tasks that build, implement, integrate, configure or use a concept, tool, library, API or technique deserve a VIDEO — the student is doing it for the first time, and a good tutorial is the fastest way in.
   - "video": the task involves a concept, technique, tool, library, API, pattern or workflow the student is applying for the first time or has not mastered. Hashing passwords with bcrypt, JWT login, JOINs, flexbox, Docker, an Axios call, a Git workflow, a React hook, a maths method, an essay technique. This is the DEFAULT for anything technical or academic. The title must be specific enough to find a good tutorial for — and you must make it so.
   - "read": the thing to learn is small enough that a short written explanation with an example covers it — one command, one config line, a definition, a checklist — and a video would be padding.
   - "none": there is genuinely NOTHING to learn — pure admin or repetition. Attending a class, applying for something, setting up an account, sending an email, writing a résumé from a template, revising notes already made, solving more problems of a kind already practised this week.
   When in doubt between "video" and "read", pick "video". When in doubt between "read" and "none", pick "read". At most ONE task per day may be "none" unless the day is entirely administrative.

12. "guidance" is OPTIONAL, and only ever appears when "learning" is "none". Omit it entirely
   otherwise. Most tick-only tasks do not need it.
   INCLUDE it only when the task involves specific steps, commands, menus or sites that someone
   could reasonably forget or get wrong — pushing to GitHub, filing an application, configuring a
   tool, submitting a form on a particular portal.
   OMIT it when the task is self-explanatory to anyone who can read the title. "Water the classroom
   plants", "Attend today's lecture", "Revise your notes for an hour", "Go for a walk", "Read one
   chapter" — these need no instructions, and explaining them is patronising. If your steps would
   amount to restating the title, leave "guidance" out.
   When you do include it:
   - 3 to 5 short steps, in the order they should be done. One action each.
   - Concrete and specific: name the actual command, menu, file or site. "git add . then git commit
     -m 'message'" — not "commit your changes". "Open portal.iiitb.ac.in and click Apply" — not
     "visit the website".
   - Written for someone who has done this kind of thing before but may not remember the exact
     steps. Do not teach the concept; they already know it. Just get them moving.
   - The LAST step must say how they know it is finished.

13. "skill" names which tracked skill this task moves forward. Copy the name EXACTLY as it appears
   in the tracked list above — not a paraphrase, not a shortened form, not a skill you thought of
   yourself. A name that is not on that list is discarded, and the task then counts towards nothing.
   OMIT the field entirely when the task genuinely advances none of them — attending a lecture,
   emailing a professor, filling in an application. Do not reach for the closest-sounding skill to
   avoid leaving it blank: crediting the wrong skill is worse than crediting none, because the
   student's skill profile is what gets shown to employers through the job matcher.

14. Return raw JSON matching the structure below. No markdown code fences.

Required JSON Structure:
{
  "focusForToday": "One sentence on what today is really about. Calm and encouraging - never guilt-inducing, never urgent.",
  "tasks": [
    {
      "title": "Specific, finishable task title",
      "description": "What to do and what 'done' looks like.",
      "category": "Daily|Weekly|Monthly",
      "duration": "e.g., 45 mins",
      "learning": "video|read|none",
      "skill": "OPTIONAL. Exact name copied from the tracked skills list. Omit if none genuinely applies.",
      "guidance": ["OPTIONAL. Only when learning is none AND the steps are not obvious. Omit for self-explanatory tasks."]
    }
  ]
}
`;

  try {
    const response = await generateWithRetry(ai, prompt, { json: true, kind: 'daily-tasks' });
    return parseJsonObject(response.text);
  } catch (error) {
    console.error('Gemini API Error for Daily Tasks:', error);
    // A spent allowance is not a generation failure. Re-wrapping it would
    // strip the 429 and the reset time off it and report a healthy service
    // as broken, so it passes through untouched.
    if (error instanceof aiQuota.AiBudgetError) throw error;
    throw new Error('Failed to generate today\'s plan: ' + error.message);
  }
};

/**
 * Build a lesson for ONE planner task, anchored to ONE real YouTube video.
 *
 * The video is resolved before this call, so its real title, channel and
 * description can be handed to the model. That is what makes the notes and quiz
 * belong to the video rather than to the topic in general — the model is
 * writing about material it has actually been shown the shape of.
 *
 * @param {object}  task        the planner task this lesson is for
 * @param {?object} video       resolved YouTube metadata, or null when no
 *                              YOUTUBE_API_KEY is set and the student will
 *                              search for a tutorial themselves
 * @param {object}  goal        the student's goal, for pitching the level
 * @param {string}  searchQuery the phrase they will search, used when video is null
 */
const generateTaskStudyFromVideo = async (task, video, goal, searchQuery = '') => {
  const ai = await geminiClient();

  // The description is the only real signal about what the video actually
  // covers, but full descriptions are mostly sponsor links and timestamps.
  // 1200 characters keeps the useful head without bloating the prompt.
  const description = (video?.description || '').slice(0, 1200);

  // Without a YouTube key no specific video could be resolved, so the lesson is
  // built around the task itself and the student watches whatever their search
  // turns up. Same notes-and-quiz structure either way.
  // Chapter markers are the creator's own contents list — what the video covers
  // and in what order. When present they are a far better syllabus than the
  // description, which is mostly links and sponsor copy.
  const chapters = video?.chapters?.length
    ? `\nCHAPTERS (this is exactly what the video covers, in order — treat it as the syllabus):\n${video.chapters
        .map((c) => `  ${c.time}  ${c.label}`)
        .join('\n')}`
    : '';

  const videoSection = video
    ? `The video they are about to watch (already chosen — do NOT suggest a different one):
Title: ${video.title}
Channel: ${video.channel}
Length: ${video.duration || 'unknown'}
Description: ${description || 'Not available'}${chapters}`
    : `They will search YouTube for "${searchQuery}" and watch a tutorial from the results.
You do not know which specific video they will pick, so teach the topic itself and keep the
notes true of any good tutorial on it. Never refer to "this video" or to anything shown in it.`;

  const prompt = `
You are an expert tutor preparing ONE short lesson for a student's daily plan.

The student's task today:
Title: ${task.title}
Description: ${task.description || 'Not specified'}
Time budgeted: ${task.duration || '30 mins'}

${videoSection}

Student's education level: ${goal?.educationLevel || 'Not specified'}
Student's career goal: ${goal?.careerGoal || 'Not specified'}

${PROGRESSION_RULES}

Rules:
${video
  ? `1. The notes and the quiz must both be about THIS video and THIS task.${video.chapters?.length ? ' The CHAPTERS listed above are the definitive contents — build one notes section per major chapter grouping, in that order, and do NOT introduce topics the chapters do not mention.' : ' Treat the video title and description as the syllabus — cover what that video actually teaches, in the order it would teach it.'}
2. Write the notes as something to read alongside or just after watching: they should reinforce the video, not replace it. Refer to what the video demonstrates where it helps.
2b. Every quiz question must be answerable from the material this video actually covers. If a concept is not in the chapters or description, it must not appear in the quiz.`
  : `1. The notes and the quiz must both be about THIS task. Cover the topic the way a good tutorial would introduce it, in the order it would be taught.
2. Write the notes as something to read alongside or just after watching a tutorial they found. They must stand on their own, since you do not know which video they watched.`}
3. Notes must TEACH. Each point is a complete, self-contained statement a student can revise from later, not a topic heading.
4. The quiz must be answerable by someone who watched this video and read these notes. Do not ask about anything you did not cover in the notes.
5. Exactly 4 options per question. "correctIndex" is the 0-based index of the correct option and MUST be accurate.
6. Vary which position the correct answer sits in across the questions — never always the same index.
7. Every explanation must say WHY the answer is right, not restate it.
8. Pitch everything at the student's education level.
9. Return ONLY raw JSON matching the structure below. No markdown code fences.

Required JSON Structure:
{
  "notes": {
    "summary": "2-3 sentences on what this video covers and why it matters for the student's task.",
    "sections": [
      { "heading": "Section title", "points": ["Complete teaching statement 1", "Complete teaching statement 2", "Complete teaching statement 3"] }
    ],
    "keyTerms": [
      { "term": "Term used in the video", "definition": "One-sentence plain-language definition." }
    ]
  },
  "quiz": [
    { "question": "Question text", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "Why that answer is correct." }
  ]
}

Provide 3-4 sections, 4-6 key terms, and at least 5 quiz questions (5 or 6 — never fewer than 5).
`;

  try {
    const response = await generateWithRetry(ai, prompt, { json: true, kind: 'task-lesson-video' });
    return parseJsonObject(response.text);
  } catch (error) {
    console.error('Gemini API Error for Task Study:', error);
    // A spent allowance is not a generation failure. Re-wrapping it would
    // strip the 429 and the reset time off it and report a healthy service
    // as broken, so it passes through untouched.
    if (error instanceof aiQuota.AiBudgetError) throw error;
    throw new Error('Failed to build the lesson: ' + error.message);
  }
};

/**
 * A written lesson for one task — no video involved.
 *
 * This is not the video prompt with the video removed. Notes written *about* a
 * tutorial can lean on it ("as shown in the video"); these have to do the
 * teaching themselves, so they are longer, ordered like a chapter, and every
 * section carries a worked example. The reference point is a W3Schools page:
 * explain, show, then let them try.
 */
const generateReadingLesson = async (task, goal) => {
  const ai = await geminiClient();

  const prompt = `
You are writing a short, self-contained written lesson for ONE student, in the style of a
W3Schools tutorial page: explain a thing, show a worked example, move on.

The student's task today:
Title: ${task.title}
Description: ${task.description || 'Not specified'}
Time budgeted: ${task.duration || '30 mins'}

Student's education level: ${goal?.educationLevel || 'Not specified'}
Student's career goal: ${goal?.careerGoal || 'Not specified'}

${PROGRESSION_RULES}

Rules:
1. THERE IS NO VIDEO. This page is the only teaching material the student gets, so it must
   stand entirely on its own. Never write "as shown in the video", "watch", or "the tutorial".
2. Teach the topic in the order it should be learned — what it is, why it matters, how to do
   it, what goes wrong. Someone who has never met this topic must be able to follow it.
3. EVERY section must carry a worked example in "example": real code for a programming topic,
   or a concrete worked-through case for a non-programming one. Never a description of an
   example — the actual thing, ready to read or type out.
   - Code must be complete enough to run or paste, and correct. No "..." placeholders.
   - "exampleCaption" says in one line what the example shows.
4. Each point must TEACH: a complete statement a student can revise from, not a heading.
5. Pitch it at the student's education level. For a school student use plain language and
   avoid professional tooling.
6. The quiz must be answerable from THIS page alone. Do not ask about anything not covered above.
7. Exactly 4 options per question. "correctIndex" is the 0-based index of the correct option
   and MUST be accurate.
8. Vary which position the correct answer sits in across the questions.
9. Every explanation must say WHY the answer is right, not restate it.
10. Return ONLY raw JSON matching the structure below. No markdown code fences.

Required JSON Structure:
{
  "notes": {
    "summary": "2-3 sentences: what this lesson covers and why it matters for the task.",
    "sections": [
      {
        "heading": "Section title",
        "points": ["Complete teaching statement 1", "Complete teaching statement 2", "Complete teaching statement 3"],
        "example": "The actual code or worked example, with real newlines.",
        "exampleCaption": "One line on what the example shows."
      }
    ],
    "keyTerms": [
      { "term": "Term", "definition": "One-sentence plain-language definition." }
    ]
  },
  "quiz": [
    { "question": "Question text", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "Why that answer is correct." }
  ]
}

Provide 4-5 sections, 4-6 key terms, and at least 5 quiz questions (5 or 6 — never fewer than 5).
`;

  try {
    const response = await generateWithRetry(ai, prompt, { json: true, kind: 'task-lesson-reading' });
    return parseJsonObject(response.text);
  } catch (error) {
    console.error('Gemini API Error for Reading Lesson:', error);
    // A spent allowance is not a generation failure. Re-wrapping it would
    // strip the 429 and the reset time off it and report a healthy service
    // as broken, so it passes through untouched.
    if (error instanceof aiQuota.AiBudgetError) throw error;
    throw new Error('Failed to build the reading lesson: ' + error.message);
  }
};

/**
 * More quiz questions for a lesson that came back short.
 *
 * Every lesson prompt asks for at least five, and usually gets them — but the
 * count is a request, not a guarantee, and a lesson that returned two was saved
 * with two. That is a worse quiz to learn from and a softer gate: with two
 * questions, one lucky guess is already half the pass mark.
 *
 * Deliberately a small, focused second call rather than a regeneration of the
 * whole lesson. The notes the student is about to read stay exactly as they
 * are — only the questions are added to, and they are written against those
 * same notes so they stay answerable from the material.
 */
const generateExtraQuizQuestions = async (topic, notes, existing, count) => {
  const ai = await geminiClient();

  const material = [
    notes?.summary ? `Summary: ${notes.summary}` : '',
    ...(notes?.sections || []).map(
      (sec) => `${sec.heading}\n${(sec.points || []).map((p) => `- ${p}`).join('\n')}`
    ),
    ...(notes?.keyTerms || []).map((t) => `${t.term}: ${t.definition}`)
  ]
    .filter(Boolean)
    .join('\n\n');

  const asked = (existing || []).map((q, i) => `${i + 1}. ${q.question}`).join('\n');

  const prompt = `
Write ${count} more multiple-choice questions for this lesson's quiz.

Topic: ${topic}

The lesson's notes — the ONLY material these questions may test:
${material || 'No notes available; test the topic itself at an introductory level.'}

Questions already asked — do NOT repeat these, or ask the same thing in different words:
${asked || 'None.'}

Rules:
1. Every question must be answerable from the notes above.
2. Test understanding, not trivia recall.
3. Exactly 4 options each. "correctIndex" is the 0-based index of the correct option and MUST be accurate.
4. Vary which position the correct answer sits in — do not always use the same index.
5. Every explanation must say WHY the answer is right, not restate it.
6. Return ONLY raw JSON in exactly the structure below. No markdown code fences.

{
  "questions": [
    { "question": "Question text", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "Why that answer is correct." }
  ]
}
`;

  // An object, not a bare array: parseJsonObject slices between the first '{'
  // and the last '}', so a top-level array arrives as "{...}, {...}" and can
  // never parse. Asking for a wrapper is cheaper than special-casing the
  // parser every other call in this file depends on.
  const response = await generateWithRetry(ai, prompt, { json: true, kind: 'quiz-extra' });
  const parsed = parseJsonObject(response.text);
  // Still tolerant of the shapes a model reaches for anyway.
  return Array.isArray(parsed) ? parsed : parsed?.questions || parsed?.quiz || [];
};

/**
 * Turn a task title into a YouTube search phrase.
 *
 * Task titles are written as instructions ("Spend 45 minutes practising CSS
 * Flexbox alignment"), which search poorly. This strips them back to the topic.
 * Kept deliberately cheap — one short call, and the caller falls back to the raw
 * title if it fails, so a lesson is never blocked on phrasing.
 */
/** What the student is aiming at, in one line, so a search phrase can be pitched at it. */
const describeLearner = (goal) =>
  [
    goal?.educationLevel,
    goal?.degree,
    goal?.specialization,
    goal?.careerGoal && `aiming to become ${goal.careerGoal}`
  ]
    .filter(Boolean)
    .join(', ') || 'Not specified';

/** The task as the model should read it: title, what it asks, its steps and its time budget. */
const describeTask = (task) =>
  [
    `Title: ${task.title}`,
    task.description && `What it asks: ${task.description}`,
    task.skill && `Skill: ${task.skill}`,
    task.guidance?.length && `Steps: ${task.guidance.slice(0, 5).join(' / ')}`,
    task.duration && `Time budget: ${task.duration}`
  ]
    .filter(Boolean)
    .join('\n');

const generateVideoSearchQuery = async (task, goal) => {
  const ai = await geminiClient();

  const prompt = `
Turn this study task into the best possible YouTube search phrase for finding a tutorial that teaches EXACTLY what the task asks.

${describeTask(task)}
Student: ${describeLearner(goal)}

Rules:
- Name the specific concept AND the technology or subject it belongs to. "Protect routes with JWT middleware in Express" becomes "Express JWT middleware protect routes tutorial", not "JWT tutorial".
- Read the description and steps, not just the title: if the task is hands-on (build, implement, set up), search for a build-along ("how to …", "step by step"); if it is a concept, search for an explanation.
- Return the SUBJECT to learn, not the instruction. Drop time budgets, "practise", "revise" and anything personal to this student.
- Add "for beginners" only when the student is new to the subject. Never add "advanced", "full course" or "complete course" — those surface long general courses instead of the one topic.
- For school subjects, keep it at the student's class level (e.g. "class 8 linear equations").
- 3 to 9 words. Plain text only — no quotes, no punctuation, no explanation.

Return ONLY the search phrase on a single line.
`;

  const response = await generateWithRetry(ai, prompt, { kind: 'video-search-query' });
  return (response.text || '').trim().split('\n')[0].replace(/^["']|["']$/g, '').slice(0, 120);
};

/**
 * Pick the video that teaches this task, from a shortlist the search already
 * ranked.
 *
 * Title-word overlap gets a video onto the right shelf but cannot tell a build
 * of "JWT middleware in Express" from a "what is JWT" explainer, or a focused
 * lesson from a 44-minute compilation. Reading the shortlist against the task
 * can. Returns { index, search }: the index into `candidates`, or -1 when none
 * of them teaches it — and then `search`, a better phrase to look again with.
 */
const chooseVideoForTask = async (task, goal, candidates, language = 'English') => {
  if (!candidates?.length) return { index: -1, search: null };
  const ai = await geminiClient();

  const list = candidates
    .map((v, i) =>
      [
        `[${i}] "${v.title}"`,
        `channel: ${v.channel || 'unknown'}`,
        `length: ${v.duration || 'unknown'}`,
        v.description && `about: ${String(v.description).replace(/\s+/g, ' ').slice(0, 220)}`
      ]
        .filter(Boolean)
        .join(' | ')
    )
    .join('\n');

  const prompt = `
A student has this study task. Choose the ONE YouTube video below that best teaches exactly what the task asks.

${describeTask(task)}
Student: ${describeLearner(goal)}
Wanted language: ${language}

Candidates:
${list}

Judge each against the task, in this order:
1. Topic: it teaches the specific thing the task asks — not a broader overview, a neighbouring topic, or a different technology.
2. Kind: a build-along for a hands-on task, an explanation for a concept task.
3. Level and audience: made for a learner like this student — not a kids' video for an engineer, not an expert talk for a beginner, and not a video aimed at teachers or parents.
4. Length: watchable inside the time budget. Reject compilations, live streams, full courses and shorts unless nothing else fits.
5. Language: spoken in the wanted language.

An open-ended task ("solve 2 LeetCode problems", "practise mental maths") has no single topic: a video that teaches HOW to do that kind of work — the approach, or a worked walkthrough of a typical problem at the right level — teaches it. Do not reject every candidate just because none matches word for word.
A task that asks for several things (one array problem AND one tree problem) is served by a video that teaches one of them well, or the shared approach — no video covers everything.
Use -1 only when every candidate is off-topic, the wrong level, or unwatchable in the time.

Return JSON only: {"index": <number>, "reason": "<one short sentence>", "search": "<phrase or empty>"}.
If none of them teaches this task, use index -1 and put in "search" a better YouTube search phrase (3 to 9 words, plain text) that would find a video teaching it. Otherwise leave "search" empty.
`;

  const response = await generateWithRetry(ai, prompt, { json: true, maxOutputTokens: 250, kind: 'video-choice' });
  const parsed = parseJsonObject(response.text);
  const index = Number(parsed?.index);
  const search = String(parsed?.search || '').replace(/["']/g, '').trim().slice(0, 120) || null;
  return Number.isInteger(index) && index >= 0 && index < candidates.length
    ? { index, search: null }
    : { index: -1, search };
};

module.exports = {
  generateRoadmapFromAI,
  generateTasksFromAI,
  generateRecommendationsFromAI,
  generateScholarshipsFromAI,
  generateMentorResponse,
  // Exported for tests: it is pure, and it is the part of the mentor prompt
  // that can be checked without spending a Gemini call.
  buildMentorContext,
  // Likewise: which ladder a student is told to climb, and the backstop that
  // drops a stage they have already finished. Both decide the shape of a
  // roadmap and neither needs a Gemini call to check.
  describeLadderRules,
  stripCompletedStages,
  // The same rule, reporting WHICH phases to drop rather than dropping them:
  // a roadmap already saved has progress and badges stored against phase
  // indices, and those have to be shifted by the same amount.
  completedStageIndices,
  generateStudyMaterialFromAI,
  generateDailyTasksFromAI,
  generateTaskStudyFromVideo,
  generateReadingLesson,
  generateExtraQuizQuestions,
  generateVideoSearchQuery,
  chooseVideoForTask
};
