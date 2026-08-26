const { GoogleGenAI } = require('@google/genai');
const aiQuota = require('./aiQuota');

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
  { attempts = 4, json = false, maxOutputTokens = MAX_OUTPUT_TOKENS, kind = 'unknown' } = {}
) => {
  const config = json
    ? { responseMimeType: 'application/json', maxOutputTokens }
    : { maxOutputTokens };

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
    try {
      const response = await ai.models.generateContent({ model: MODEL, contents: prompt, config });
      meter(true);
      return response;
    } catch (error) {
      if (attempt === attempts) meter(false);
      const isLastAttempt = attempt === attempts;

      if (error.status === 429) {
        const quota = getQuotaInfo(error);

        // Daily cap: no amount of waiting helps within this request.
        if (quota.isDaily || !quota.retryDelaySeconds) {
          meter(false);
          // Typed so it surfaces as 429 rather than 500: the service is fine,
          // the day's allowance is not, and an operator reading the logs should
          // not be sent looking for a fault.
          throw new aiQuota.AiBudgetError(
            `Daily free-tier quota exhausted for model "${MODEL}"` +
            (quota.limit ? ` (limit: ${quota.limit} requests/day)` : '') +
            '. It resets at midnight Pacific Time. To continue now, set a different ' +
            'GEMINI_MODEL in the server .env or enable billing on your Google AI Studio project.',
            'provider-daily-quota'
          );
        }

        // Per-minute cap: honour the server's own retry hint.
        if (isLastAttempt) {
          throw new Error(`Gemini rate limit reached. Please try again in about ${quota.retryDelaySeconds} seconds.`);
        }
        const waitMs = Math.min(quota.retryDelaySeconds, 60) * 1000;
        console.warn(`Gemini rate limited (${quota.quotaId}), waiting ${waitMs / 1000}s (attempt ${attempt}/${attempts})`);
        await sleep(waitMs);
        continue;
      }

      // A dropped connection is worth retrying, and worth explaining in words
      // that tell the student what to do when it keeps failing.
      if (isNetworkError(error)) {
        if (isLastAttempt) {
          throw new Error(
            'Could not reach the AI service — check your internet connection and try again.'
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
        throw error;
      }

      const delayMs = 1000 * 2 ** (attempt - 1); // 1s, 2s
      console.warn(`Gemini ${error.status}, retrying in ${delayMs}ms (attempt ${attempt}/${attempts})`);
      await sleep(delayMs);
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
 * Standard programme lengths, in years, for the degrees this app actually sees.
 *
 * Degrees are NOT all four years: BCA, B.Sc, B.Com and BBA run three, most
 * master's run two, and MBBS runs five and a half. Left to itself the model
 * defaults to a four-year bachelor's and a two-year master's, which produces a
 * "Year 4" phase for a BCA student whose course ends at Year 3.
 *
 * Keys are matched against a normalised (lowercased, punctuation-stripped)
 * degree name, longest first, so "b.tech" wins over "b" and "m.sc" over "sc".
 */
const DEGREE_YEARS = {
  // Undergraduate
  'btech': 4, 'be': 4, 'bengineering': 4,
  'bca': 3, 'bsc': 3, 'bcom': 3, 'bba': 3, 'ba': 3, 'bbm': 3, 'bms': 3,
  'bscagriculture': 4, 'bscnursing': 4, 'bpharm': 4, 'bdes': 4, 'bfa': 4,
  'barch': 5, 'mbbs': 5.5, 'bds': 5, 'bvsc': 5, 'pharmd': 6,
  'llb': 3, 'balllb': 5, 'bbaLlb': 5,
  'diploma': 3, 'polytechnic': 3,
  // Postgraduate
  'mtech': 2, 'me': 2, 'mca': 2, 'msc': 2, 'mcom': 2, 'mba': 2, 'ma': 2,
  'mpharm': 2, 'mdes': 2, 'llm': 2, 'ms': 2, 'md': 3, 'phd': 4
};

/** Normalise a degree name for lookup: "B.Tech (Hons)" -> "btech". */
const normaliseDegree = (degree = '') =>
  degree.toLowerCase().replace(/[^a-z]/g, '');

/**
 * How long the student's current programme runs, or null when unrecognised.
 * Returns years and the semester count, since Indian programmes are usually
 * discussed in semesters.
 */
const degreeLength = (goal) => {
  const key = normaliseDegree(goal.degree);
  if (!key) return null;

  // Longest key first so "btech" is not shadowed by a shorter partial match.
  const match = Object.keys(DEGREE_YEARS)
    .sort((a, b) => b.length - a.length)
    .find((k) => key.startsWith(k) || key === k);

  if (!match) return null;
  const years = DEGREE_YEARS[match];
  return { years, semesters: Math.round(years * 2) };
};

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

// A school phase: "Class 9", "Grade 10", "Std 8", "Class 11: PCMB Stream".
const SCHOOL_PHASE_PATTERN = /^\s*(?:phase\s*\d+\s*[:-]\s*)?(?:class|grade|std\.?|standard)\s*\d+/i;

// Levels that mean school is already behind the student.
const PAST_SCHOOL = ['Diploma', 'Undergraduate', 'Postgraduate', 'Working Professional'];

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
const stripCompletedStages = (roadmap, goal) => {
  const phases = roadmap?.educationRoadmap;
  if (!Array.isArray(phases) || !PAST_SCHOOL.includes(goal.educationLevel)) return roadmap;

  const kept = phases.filter((stage) => {
    const title = typeof stage === 'string' ? stage : stage?.phase || '';
    return !SCHOOL_PHASE_PATTERN.test(title);
  });

  // Never hand back an empty roadmap: if the filter would remove everything the
  // titles are shaped unexpectedly, and the original is the safer answer.
  if (!kept.length || kept.length === phases.length) return roadmap;

  console.warn(
    `Roadmap for a ${goal.educationLevel} student contained ${phases.length - kept.length} school phase(s); removed.`
  );
  roadmap.educationRoadmap = kept;
  return roadmap;
};

// Matches the ways a postgraduate stage tends to be labelled, so we can tell
// whether the model actually carried the roadmap past the bachelor's degree.
const PG_PATTERN = /post[\s-]?grad|masters?\b|m\.?tech|m\.?sc|m\.?c\.?a|\bmba\b|\bms\b|\bphd\b|doctoral/i;

// Matches the phases that carry the user from "qualified" to "employed". A
// roadmap missing these stops at a degree, which is not what the user is here
// for — they want the job.
const CAREER_ENTRY_PATTERN =
  /job\s*application|placement|recruitment|hiring|first\s*role|career\s*launch|job\s*search|getting\s*hired|interview\s*prep/i;

const hasCareerEntryPhase = (roadmap) =>
  (roadmap?.educationRoadmap || []).some((stage) => {
    const text = typeof stage === 'string' ? stage : `${stage?.phase || ''} ${stage?.description || ''}`;
    return CAREER_ENTRY_PATTERN.test(text);
  });

const buildCareerEntryPrompt = (goal, roadmap) => `
You previously generated a career roadmap for this user but it stopped at their studies.
Generate ONLY the missing phases that take them from finishing their education to actually
working as "${goal.careerGoal}".

User Context:
- Education Level: ${goal.educationLevel}
- Desired Career Goal: ${goal.careerGoal}
- Dream Company/Organization: ${goal.dreamCompany || 'None specified'}
- Location: ${goal.state || ''} ${goal.country || ''}
- Final phase already covered: ${
  (roadmap?.educationRoadmap || []).at(-1)?.phase || 'their final academic year'
}

Produce EXACTLY three phases, in this order:
1. "Job Applications & Placement Preparation" - what the resume and portfolio must show, WHERE to apply (campus drives, named portals such as LinkedIn / Naukri / Instahyre / Wellfound, company career pages, referrals), the real hiring calendar, and how to run and track the search.
2. "Entrance & Recruitment Exams" - name the ACTUAL exams standing between the user and this job: company hiring tests (TCS NQT, Infosys InfyTQ/HackWithInfy, Wipro Elite NTH, AMCAT, eLitmus, Cocubes), coding/online-assessment rounds, government and PSU routes if relevant (GATE for PSU, UPSC, SSC, IBPS, state PSC, NET/SET), and any licensing exam the career legally requires. For each give eligibility, when it is held, and how long to prepare. If a category genuinely does not apply, say so explicitly.
3. "First Role → ${goal.careerGoal}" - the realistic entry-level title and starting salary band for this location, what the first 6-12 months look like, and the promotion path to "${goal.careerGoal}" with rough timeframes.

Be concrete and specific to this career and location. No generic filler.
Return raw JSON only. No markdown, no code blocks.

Required JSON Structure:
{
  "careerEntryRoadmap": [
    { "phase": "Job Applications & Placement Preparation", "description": "...", "actionItems": ["...", "...", "..."] },
    { "phase": "Entrance & Recruitment Exams", "description": "...", "actionItems": ["...", "...", "..."] },
    { "phase": "First Role → ${goal.careerGoal}", "description": "...", "actionItems": ["...", "...", "..."] }
  ],
  "entranceExams": ["EXAM NAME — what it gets you and when it is held"]
}
`;

const hasPostgraduatePhase = (roadmap) =>
  (roadmap?.educationRoadmap || []).some((stage) => {
    const text = typeof stage === 'string' ? stage : `${stage?.phase || ''} ${stage?.description || ''}`;
    return PG_PATTERN.test(text);
  });

const buildPostgraduatePrompt = (goal, roadmap) => `
You previously generated a career roadmap for this user but stopped at the undergraduate stage.
Generate ONLY the missing postgraduate phases that continue from where it ended.

User Context:
- Education Level: ${goal.educationLevel}
- Desired Career Goal: ${goal.careerGoal}
- Location: ${goal.state || ''} ${goal.country || ''}
- Final phase already covered: ${
  (roadmap?.educationRoadmap || []).at(-1)?.phase || 'Undergraduate final year'
}

Rules:
1. Break the postgraduate stage down year-by-year, using each programme's REAL length — most Indian master's degrees (MCA, M.Tech, M.Sc, MBA) run 2 years / 4 semesters, while an MS abroad may run 1 year. Never generate a "Year 3" phase for a 2-year programme.
2. Offer EVERY eligible postgraduate option in the phase title, matched to the undergraduate degrees available (B.Tech -> M.Tech / MS abroad; BCA or B.Sc IT -> MCA / M.Sc CS, since they are usually not eligible for M.Tech), e.g. "M.Tech CSE / MCA / M.Sc CS (HCI & Web Technologies)". Say which undergraduate path leads to which option, recommend a specialisation suited to "${goal.careerGoal}", and name real universities to target.
3. Cover entrance exams (GATE, GRE, TOEFL/IELTS, CAT, NET), specialisation choice, research/thesis, and assistantships.
4. State whether the degree is strictly REQUIRED for "${goal.careerGoal}" or a career ACCELERATOR toward senior/architect/research roles - but recommend a concrete programme either way. Never reduce it to "optional, you may skip it".
5. If the goal is research- or academia-oriented, add a PhD phase as well.
6. Return raw JSON only. No markdown, no code blocks.

Required JSON Structure:
{
  "postgraduateRoadmap": [
    {
      "phase": "Postgraduate Year 1: M.Tech / MS / MBA",
      "description": "Detailed explanation.",
      "actionItems": ["Action 1", "Action 2", "Action 3"]
    }
  ],
  "timeline": "Updated timeline from the user's current stage onward, using each programme's real length."
}
`;

const generateRoadmapFromAI = async (goal, courseContext = '') => {
  // Ensure the API key is present
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Construct the prompt based on the user's goal
  const prompt = `
You are an expert career counselor AI. Generate a step-by-step career roadmap for the following user. 
Do not output any markdown formatting other than the JSON itself. Do not use code blocks. Only return a raw JSON object.

User Context:
- Education Level: ${goal.educationLevel}
- Current Class/Degree/Semester: ${goal.currentClass || goal.degree + ' ' + (goal.specialization || '') + ' ' + (goal.currentYear || '') + ' ' + (goal.semester || '')}${goal.board ? `\n- Board: ${goal.board}. Follow this board's own syllabus, subject names and exam names — never another board's. "${goal.board}" is the board's name; do not invent a syllabus name of your own.` : ''}${goal.stream ? `\n- Stream: ${goal.stream}. This decides which degrees and entrance exams they are ELIGIBLE for. Never plan a path that their subject combination rules out — no JEE or engineering for a student without Maths, no NEET or medicine for one without Biology.` : ''}
- Current Job/Experience: ${goal.currentJob || 'N/A'} (${goal.experience || 0} years)
- Desired Career Goal: ${goal.careerGoal}
- Dream Company/Organization: ${goal.dreamCompany || 'None specified'}
- Location: ${goal.state || ''} ${goal.country || ''}
${courseContext ? `
${courseContext}
Where a phase of the roadmap is covered by one of these courses, say so in that
phase's steps by name — "Work through YATICORP's <title>" — instead of naming an
outside platform. Do not stretch: a phase nothing here covers should still point
wherever genuinely serves the student best.
` : ''}
########################################################################
# RULE ZERO - START POINT. THIS OVERRIDES EVERY OTHER RULE BELOW.
########################################################################
THE USER IS RIGHT NOW AT: ${describeCurrentStage(goal)}

The FIRST entry in "educationRoadmap" MUST be this exact stage. The roadmap
covers ONLY the journey from HERE to their career goal.

You MUST NOT include any phase the user has already finished. A student in a
bachelor's degree has already completed school, so their roadmap must NOT
contain Class 5, Class 10, Class 12, or any earlier college year. A working
professional's roadmap must not contain any school or degree phase they already
hold. Starting earlier than the user's current stage is the single worst error
you can make here - it makes the roadmap useless and insulting.

Walk forward from the stage above to the goal. Never backwards.

${describeDegreeLength(goal)}
########################################################################

${PROGRESSION_RULES}

Follow these STRICT rules:
1. The roadmap must adapt to the user's specific education level.
2. The educationRoadmap MUST be broken down year-by-year or class-by-class, STARTING AT THE STAGE NAMED IN RULE ZERO. Do NOT group multiple years together (e.g., NEVER write "Class 6-8"): generate a distinct phase for each year or class from the current stage onward, continuing through whatever stages genuinely remain for this user (remaining school years if they are still at school, then undergraduate, then POSTGRADUATE) and into the target job. The roadmap must not stop at the undergraduate degree. Only include earlier stages the user has NOT yet reached.
3. When reaching Higher Secondary (Class 11/12), you MUST explicitly state which stream to choose (e.g., PCMB, PCMC, Commerce, Arts).
4. When reaching College (Year 1, 2, etc.), you MUST provide multiple viable degree options if applicable (e.g., "College Year 1: B.Tech CSE / BCA / B.Sc IT") instead of forcing only one path like B.Tech.
4b. DEGREE LENGTHS DIFFER AND YOU MUST RESPECT THEM. Generate exactly as many year-phases as the degree actually has, never a fixed four:
   - B.Tech / B.E. / B.Pharm / B.Sc Agriculture -> 4 years (8 semesters)
   - BCA / B.Sc / B.Com / BBA / BA / Diploma -> 3 years (6 semesters)
   - B.Arch -> 5 years, MBBS -> 5.5 years, Pharm.D -> 6 years
   - MCA / M.Tech / M.Sc / MBA / M.Com / LLM -> 2 years (4 semesters)
   - MS abroad -> 1 to 2 years depending on the country and programme
   A "Year 4" phase for a 3-year BCA, or a "Year 3" phase for a 2-year MCA, is a factual error. If you offer several degree options in one phase, say plainly that their lengths differ (e.g. "B.Tech takes 4 years, BCA and B.Sc take 3").
5. Immediately AFTER the final undergraduate year and BEFORE the postgraduate phases, you MUST include a distinct "Internships & Industry Experience" phase. This phase is MANDATORY and must:
   - name specific, realistic programmes for this career goal (e.g. Google STEP, Microsoft Engage, Amazon SDE Internship, GSoC, research internships at IIT/IISc, startup internships via Internshala or Unstop),
   - say when to apply and what the selection process involves,
   - explain how to convert an internship into a full-time offer (PPO),
   - cover the portfolio, GitHub, and interview preparation needed to get selected.
   Keep it as its own entry in educationRoadmap - do NOT merge it into a college year or into the postgraduate phases.
6. After that internship phase, you MUST ALWAYS include postgraduate phases in the educationRoadmap, broken down year-by-year.
   Just like the college phases, you MUST offer MULTIPLE VIABLE POSTGRADUATE OPTIONS in the phase title rather than forcing a single degree - and each option must be ELIGIBLE for the undergraduate degrees you listed earlier. Eligibility matters:
   - B.Tech / B.E. graduates -> M.Tech, MS (abroad), or M.Sc in Computer Science.
   - BCA / B.Sc IT / B.Sc CS graduates -> MCA or M.Sc in Computer Science (they are usually NOT eligible for M.Tech directly).
   So if the college phase offered "B.Tech CSE / BCA / B.Sc IT", the postgraduate phase MUST offer something like "M.Tech CSE / MCA / M.Sc CS (Human-Computer Interaction & Web Technologies)" and briefly say which undergraduate path leads to which postgraduate option.
   Within those options, RECOMMEND A SUITABLE SPECIALISATION that genuinely advances THIS user's stated career goal. For example:
   - Frontend / Web Developer -> specialise in Human-Computer Interaction (HCI), UI/UX, or Web Technologies; MS in HCI abroad (Georgia Tech, CMU, TU Delft) as the international option.
   - Data Scientist -> Data Science, Artificial Intelligence, or Statistics.
   - Leadership / product ambitions -> MBA in Product Management or Technology Management after 2-3 years of work experience.
   Each postgraduate phase MUST cover:
   - the specific programme and specialisation you recommend, and WHY it suits this exact career goal,
   - the PG entrance exams required (e.g., GATE, GRE, TOEFL/IELTS, CAT, NET) and when to start preparing,
   - research, thesis, publications, and assistantship opportunities,
   - realistic universities for the user's location and budget (name actual institutions).
   Also state plainly whether the degree is strictly REQUIRED to enter the career or whether it is a career ACCELERATOR that leads to senior, research, or architect-level roles - but recommend a concrete suitable programme either way. Never reduce this phase to "optional, you may skip it".
7. If the career goal is research- or academia-oriented, also add a doctoral (PhD) phase after the postgraduate phases.
7b. THE ROADMAP MUST NOT END AT GRADUATION. A degree is not the goal — the job is. After the final academic phase you MUST add these three phases, in this order, as separate entries in educationRoadmap:

   (i) "Job Applications & Placement Preparation" — the practical mechanics of getting hired:
       - what the resume and portfolio must contain for "${goal.careerGoal}", and what recruiters screen for,
       - WHERE to apply: campus placements, named job portals (LinkedIn, Naukri, Instahyre, Wellfound, company career pages), and how to get referrals,
       - WHEN to apply: the real hiring calendar (campus drives in the final year, off-campus cycles, fresher hiring windows),
       - how many applications a realistic search takes, and how to track them.

   (ii) "Entrance & Recruitment Exams" — every test standing between the user and this job. Name the ACTUAL exams:
       - company hiring tests where relevant (e.g. TCS NQT, Infosys InfyTQ / HackWithInfy, Wipro Elite NTH, Accenture / Capgemini assessments, AMCAT, eLitmus, Cocubes),
       - online assessment and coding rounds for product companies (DSA rounds on HackerRank / Codility, machine-coding rounds),
       - government and PSU routes if they apply to this career (GATE for PSU recruitment, UPSC, SSC, IBPS/banking, state PSC, RRB, NET/SET for teaching),
       - professional licensing or certification exams where the career legally requires them (e.g. NEET-PG, bar exam, CA/CS/CMA, FRM, PMP),
       - for EACH exam: eligibility, when it is held, and how long to prepare.
       If a particular category genuinely does not apply to this career, say so explicitly rather than omitting it silently.

   (iii) "First Role → ${goal.careerGoal}" — what happens after the offer:
       - the realistic entry-level title and starting salary band for the user's location,
       - what the first 6-12 months look like (probation, onboarding, what "good" looks like),
       - the promotion path from that entry role to "${goal.careerGoal}" with rough timeframes,
       - what to keep learning on the job to get there.

   These three phases are MANDATORY for EVERY user regardless of education level. A roadmap that stops at a degree is incomplete and useless.
8. The "entranceExams" array MUST list EVERY exam the user will face on this path, each with what it is for. Include:
   - academic entrance exams still ahead of them (undergraduate and postgraduate: GATE, NIMCET, state PGCET, GRE, TOEFL/IELTS, CAT, NET),
   - AND recruitment/job exams from phase (ii) above (TCS NQT, AMCAT, eLitmus, PSU via GATE, UPSC, SSC, IBPS, state PSC, licensing exams).
   Format each entry as "EXAM NAME — what it gets you and when it is held". Do not list only academic exams.
9. If Primary School, do not recommend internships, resumes, or certifications.
10. If High School, recommend subject choices and entrance exams.
11. If College, recommend skills, projects, internships, and certifications.
12. Start the roadmap at the user's CURRENT stage in every case, never before it (see RULE ZERO):
   - Higher Secondary (Class 11/12) -> begin at their current class, then college, then postgraduate. No Class 5-10 phases.
   - Diploma or Undergraduate (B.Tech, BCA, B.Sc, B.Com, ...) -> begin at their CURRENT year of that degree, then the remaining years, then internships, then postgraduate. NO school phases at all, and no earlier college years they have already passed.
   - Postgraduate -> begin at their current PG year and continue into specialisation, research, and senior industry roles. No school or undergraduate phases.
   - Working Professional -> begin at their current role and continue into upskilling, transitions, and senior positions. No school or degree phases they already hold.
13. If Working Professional, recommend upskilling and career transitions.
14. The JSON must exactly match the schema below. Fill arrays with strings.
15. EVERY phase in "educationRoadmap" MUST be filled in properly. A phase with a
   one-line description is useless — the student is reading this to find out what
   to actually DO. For each phase you MUST provide:
   - "duration": how long this phase lasts (e.g. "1 year", "6 months", "Ongoing").
   - "focus": one sentence naming the single most important thing in this phase.
   - "description": 3 to 4 SHORT sentences. Explain what this stage IS and why
     it matters for "${goal.careerGoal}". Be concrete and specific to this
     career - never generic advice that would suit any student.
     WRITE FOR A 16-YEAR-OLD, NOT A CONSULTANT. One idea per sentence, plain
     words, no stacked jargon and no clauses piled up with semicolons. This
     field is the overview only: do NOT list the things to do here, because
     "actionItems" below is where they belong and repeating them turns the
     phase into a wall of text the student skips.
   - "actionItems": 5 to 8 SPECIFIC, doable actions. Name real technologies,
     real platforms, real exams, real programmes. "Learn programming" is a
     failure; "Build a React portfolio site and deploy it on Vercel" is correct.
   - "milestones": 3 to 4 things the student should be able to POINT AT when this
     phase is over (a deployed project, a score, a certificate, an offer).
   - "pitfalls": 2 to 3 mistakes students commonly make in this exact phase, and
     what to do instead.
16. "colleges" MUST be an array of OBJECTS, not strings, and MUST contain 8 to 12
   REAL, NAMED institutions. Never write placeholders like "Your Current
   University", "a good local college", or "Top Engineering Colleges" - naming
   nothing is the same as saying nothing.
   - Cover a RANGE, and label each one honestly with "tier":
     "Reach" (highly competitive), "Target" (realistic), "Safe" (very likely).
     Include at least two of each.
   - Include a MIX of government and private institutions.
   - Prefer institutions in or near ${goal.state || 'the user\'s state'}, ${goal.country || 'India'},
     but also include the strongest national options and, where genuinely
     relevant to this career, 1 to 2 international ones.
   - Every college must be one that actually offers the programme you name and
     that fits the degree path in the roadmap above.

Required JSON Structure:
{
  "currentStage": "Explain the user's current stage and what to focus on.",
  "educationRoadmap": [
    {
      "phase": "Stage 1 Title",
      "duration": "How long this phase lasts, e.g. '1 year'",
      "focus": "One sentence: the single most important thing in this phase.",
      "description": "4-6 sentences. What this stage is, why it matters for this exact career goal, and where the student's time should go. Specific, never generic.",
      "actionItems": ["5-8 specific, doable actions naming real tools, platforms, exams and programmes"],
      "milestones": ["3-4 things the student can point at when this phase is over"],
      "pitfalls": ["2-3 mistakes students make in this exact phase, and what to do instead"]
    },
    {
      "phase": "<FINAL year of the user's actual degree - use its real length, e.g. 'BCA Year 3 / Final Year' for a 3-year BCA, 'B.Tech Year 4 / Final Year' for a 4-year B.Tech. Never invent a year the degree does not have.>",
      "description": "...",
      "actionItems": ["..."]
    },
    {
      "phase": "Internships & Industry Experience",
      "description": "This entry is MANDATORY and must sit between the final undergraduate year and the postgraduate phases. Name specific programmes suited to this career goal, when to apply, how selection works, and how to convert an internship into a full-time offer.",
      "actionItems": ["Apply to Google STEP / Microsoft Engage / Amazon SDE internships", "Contribute to open source (GSoC, Hacktoberfest)", "Build a portfolio and prepare for interviews"]
    },
    {
      "phase": "Postgraduate Year 1: <list every eligible degree option AND the specialisation, e.g. 'M.Tech CSE / MCA / M.Sc CS (HCI & Web Technologies)'>",
      "description": "This entry is MANDATORY - the array must always continue past the final undergraduate year into postgraduate study. List all postgraduate options that the undergraduate degrees you offered actually qualify for (B.Tech -> M.Tech/MS; BCA or B.Sc -> MCA/M.Sc), say which UG path leads to which, explain why the specialisation suits this exact career goal, and name the entrance exams and real universities to target.",
      "actionItems": ["Prepare for GATE (for M.Tech) or NIMCET / university MCA entrance", "Shortlist named universities", "..."]
    },
    {
      "phase": "Postgraduate Year 2: <specialisation, thesis/research focus tied to the career goal>",
      "description": "...",
      "actionItems": ["..."]
    },
    {
      "phase": "Job Applications & Placement Preparation",
      "description": "MANDATORY. The mechanics of actually getting hired: what the resume and portfolio must show, where to apply (campus drives, named portals, referrals), the real hiring calendar, and how to run and track the search.",
      "actionItems": ["Build a resume targeted at this role and get it reviewed", "Register on named portals and set up alerts", "Ask for referrals from seniors and alumni", "Track applications and follow up"]
    },
    {
      "phase": "Entrance & Recruitment Exams",
      "description": "MANDATORY. Every test between the user and this job - company hiring tests, coding and online assessment rounds, government/PSU routes, and any licensing exam the career legally requires. For each: eligibility, when it is held, and how long to prepare. If a category does not apply to this career, say so explicitly.",
      "actionItems": ["Register for the specific exams named above", "Prepare aptitude and DSA to the level those tests demand", "Sit mock tests under timed conditions", "Track exam calendars and deadlines"]
    },
    {
      "phase": "First Role → <the user's career goal>",
      "description": "MANDATORY. What happens after the offer: the realistic entry-level title and starting salary band for this location, what the first 6-12 months look like, and the promotion path from that entry role to the stated career goal with rough timeframes.",
      "actionItems": ["Clear probation and deliver early wins", "Find a mentor at work", "Keep building the skills the next level needs", "Review progress toward the goal every 6 months"]
    }
  ],
  "skills": {
    "technical": ["skill1", "skill2"],
    "soft": ["skill1", "skill2"],
    "life": ["skill1", "skill2"]
  },
  "subjects": ["subject1", "subject2"],
  "courses": ["course1", "course2"],
  "books": ["book1", "book2"],
  "certifications": ["cert1", "cert2"],
  "projects": ["project1", "project2"],
  "entranceExams": ["exam1", "exam2"],
  "colleges": [
    {
      "name": "Real, named institution — never a placeholder",
      "location": "City, State",
      "type": "Government | Private | Deemed | International",
      "programme": "The exact degree to apply for here, matching the roadmap above",
      "tier": "Reach | Target | Safe",
      "entranceExam": "The exam or route that gets the student in",
      "eligibility": "Marks / score / qualification actually needed",
      "approxFees": "Realistic total programme cost with currency",
      "placement": "Typical placement outcome for this programme",
      "whyThisFits": "One or two sentences on why THIS college suits THIS student's goal"
    }
  ],
  "internships": ["internship1", "internship2"],
  "careerTips": ["tip1", "tip2"],
  "timeline": "Estimated timeline from the user's CURRENT stage to the goal, using each programme's REAL length (e.g. '5 years: 2 remaining years of BCA + 2 years MCA + 1 year to mid-level role'). Do not assume 4 years for a degree that takes 3.",
  "motivation": "Encouraging advice"
}
`;

  try {
    const response = await generateWithRetry(ai, prompt, { json: true, kind: 'roadmap' });
    const roadmap = parseJsonObject(response.text);

    // Drop anything the student has already finished before the PG check below,
    // so the postgraduate repair reasons about the trimmed roadmap.
    stripCompletedStages(roadmap, goal);

    // The model intermittently stops the roadmap at the final undergraduate
    // year despite being told not to. Detect that and ask it for just the
    // missing postgraduate phases rather than regenerating the whole roadmap.
    if (!hasPostgraduatePhase(roadmap)) {
      console.warn('Roadmap came back without a postgraduate phase - requesting the missing phases.');
      try {
        const followUp = await generateWithRetry(ai, buildPostgraduatePrompt(goal, roadmap), { json: true, kind: 'roadmap-postgrad' });
        const extra = parseJsonObject(followUp.text);
        if (Array.isArray(extra.postgraduateRoadmap) && extra.postgraduateRoadmap.length > 0) {
          roadmap.educationRoadmap = [...(roadmap.educationRoadmap || []), ...extra.postgraduateRoadmap];
          if (extra.timeline) roadmap.timeline = extra.timeline;
        }
      } catch (repairError) {
        // A roadmap without PG still beats no roadmap at all.
        console.error('Could not append postgraduate phases:', repairError.message);
      }
    }

    // The user's goal is the job, not the qualification. If the roadmap stops at
    // studying, ask for the hiring phases rather than shipping it incomplete.
    if (!hasCareerEntryPhase(roadmap)) {
      console.warn('Roadmap came back without job-application phases - requesting them.');
      try {
        const followUp = await generateWithRetry(ai, buildCareerEntryPrompt(goal, roadmap), { json: true, kind: 'roadmap-career-entry' });
        const extra = parseJsonObject(followUp.text);

        if (Array.isArray(extra.careerEntryRoadmap) && extra.careerEntryRoadmap.length > 0) {
          roadmap.educationRoadmap = [...(roadmap.educationRoadmap || []), ...extra.careerEntryRoadmap];
        }
        // Merge rather than replace: the first pass already listed the academic
        // exams, and this pass adds the recruitment ones.
        if (Array.isArray(extra.entranceExams) && extra.entranceExams.length > 0) {
          roadmap.entranceExams = [...new Set([...(roadmap.entranceExams || []), ...extra.entranceExams])];
        }
      } catch (repairError) {
        console.error('Could not append career-entry phases:', repairError.message);
      }
    }

    return roadmap;
  } catch (error) {
    console.error('Gemini API Error:', error);
    // A spent allowance is not a generation failure. Re-wrapping it would
    // strip the 429 and the reset time off it and report a healthy service
    // as broken, so it passes through untouched.
    if (error instanceof aiQuota.AiBudgetError) throw error;
    throw new Error('Failed to generate roadmap from AI: ' + error.message);
  }
};

const generateTasksFromAI = async (goal, roadmap) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
6. Return raw JSON matching the structure below. Do NOT use markdown code blocks.

Required JSON Structure:
{
  "currentFocus": ["Focus point 1", "Focus point 2"],
  "tasks": [
    {
      "title": "Task title",
      "description": "Task description",
      "category": "Daily|Weekly|Monthly",
      "duration": "e.g., 30 mins"
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
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

11. "learning" says what the student needs BEFORE they can do this task. Be honest — most days it is not a video.
   - "video": they have to LEARN a concept or a technique they do not know yet, and watching someone do it is genuinely the fastest way in. Recursion, flexbox, JOINs, how the event loop works.
     Only choose this if the title is specific enough to find a good tutorial for.
   - "read": they have to learn something, but a short written explanation with an example is enough — syntax, a command, a config file, a definition, a checklist.
   - "none": there is NOTHING to learn first. The student already knows how; today is just doing it.
     This covers practising something already taught, revising, finishing a project started earlier,
     attending a class or workshop, applying for something, setting up an account, pushing code,
     writing a résumé, emailing a professor, solving more problems of a kind already practised.
   Choosing "video" for a task that is really just doing the work wastes the student's time on a
   tutorial they do not need. When in doubt between "read" and "none", pick "none".

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
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
const generateVideoSearchQuery = async (task, goal) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `
Turn this study task into the best possible YouTube search phrase for finding a tutorial that teaches it.

Task title: ${task.title}
Task description: ${task.description || 'Not specified'}
Student's education level: ${goal?.educationLevel || 'Not specified'}

Rules:
- Return the SUBJECT to learn, not the instruction. "Spend 45 minutes practising CSS Flexbox" becomes "CSS flexbox tutorial for beginners".
- Include a level word (for beginners / explained / crash course) when it helps.
- Drop time budgets, "practise", "revise", and any wording specific to this student.
- 3 to 8 words. Plain text only — no quotes, no punctuation, no explanation.

Return ONLY the search phrase on a single line.
`;

  const response = await generateWithRetry(ai, prompt, { kind: 'video-search-query' });
  return (response.text || '').trim().split('\n')[0].replace(/^["']|["']$/g, '').slice(0, 120);
};

module.exports = {
  generateRoadmapFromAI,
  generateTasksFromAI,
  generateRecommendationsFromAI,
  generateMentorResponse,
  // Exported for tests: it is pure, and it is the part of the mentor prompt
  // that can be checked without spending a Gemini call.
  buildMentorContext,
  generateStudyMaterialFromAI,
  generateDailyTasksFromAI,
  generateTaskStudyFromVideo,
  generateReadingLesson,
  generateExtraQuizQuestions,
  generateVideoSearchQuery
};
