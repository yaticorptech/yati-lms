/**
 * Reading salaries out of the strings employers actually publish.
 *
 * There is no common format. One board writes "$168K – $275.1K • Offers
 * Equity", another "160,000–190,000" with no currency at all, Google for
 * Jobs writes "120K–160K a year", and remote boards write "$50-$75 /hour"
 * or "Pay per task". Everything here is about turning that into a number
 * that can be compared with what the user said they expect — and, just as
 * importantly, refusing to guess when it can't be done honestly.
 */

/* 1,234 and 6,00,000 use the comma as a thousands separator; 31,2 uses it
   as a decimal point. Telling them apart: a single comma with one or two
   digits after it is a decimal, anything else groups digits. */
function toNumber(raw) {
  let t = String(raw).replace(/\s/g, "");
  const commas = (t.match(/,/g) || []).length;
  if (commas === 1 && /,\d{1,2}$/.test(t)) t = t.replace(",", ".");
  else t = t.replace(/,/g, "");
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

const CURRENCY_PATTERNS = [
  ["INR", /₹|\bINR\b|\bRs\.?\b/i],
  ["AED", /\bAED\b|د\.إ/i],
  ["SGD", /S\$|\bSGD\b/i],
  ["AUD", /A\$|\bAUD\b/i],
  ["CAD", /C\$|\bCAD\b/i],
  ["EUR", /€|\bEUR\b/i],
  ["GBP", /£|\bGBP\b/i],
  // Last: a bare "$" only means USD once the prefixed variants are ruled out.
  ["USD", /\$|\bUSD\b/],
];

function currencyOf(text) {
  for (const [code, re] of CURRENCY_PATTERNS) if (re.test(text)) return code;
  return null;
}

/* Hours and months are annualised on the conventional full-time basis so a
   range can be set beside a yearly expectation at all. It is an assumption,
   which is why `period` is reported back and the UI can say so. */
const PER_YEAR = { year: 1, month: 12, hour: 2080 };

function periodOf(text) {
  const t = text.toLowerCase();
  if (/\/\s*h(r|our)?\b|\bper\s*hour\b|\ban?\s*hour\b|\bhourly\b/.test(t)) return "hour";
  if (/\/\s*mo(nth)?\b|\bper\s*month\b|\ba\s*month\b|\bmonthly\b/.test(t)) return "month";
  return "year";
}

/**
 * `{ min, max, currency, period, annual }` from a published salary string,
 * or null when it holds no figure at all ("", "Pay per task").
 *
 * `annual` is the top of the range converted to a yearly amount — the top,
 * because that is the number a candidate is asking to be measured against.
 * `currency` is null when the string never said, and callers must treat
 * that as unknown rather than assuming their own.
 */
export function parsePay(raw) {
  // Anything past the first bullet is benefits prose: "• Offers Equity
  // • This role is also eligible for medical benefits, 401(k) plan…"
  const text = String(raw ?? "").split("•")[0].trim();
  if (!text) return null;

  const period = periodOf(text);

  /* "401(k) plan" and "24/7" are not pay, so a bare number has to be large
     enough to be a salary before it counts. That floor can only apply to
     yearly and monthly figures: an hourly rate really is $14, and judging
     it by the same rule threw away every hourly listing on the board. */
  const floor = period === "hour" ? 1 : 1000;

  const numbers = [];
  const re = /(\d[\d.,]*)\s*([kKmM])?/g;
  let hit;
  while ((hit = re.exec(text)) !== null) {
    const value = toNumber(hit[1]);
    if (value == null || value <= 0) continue;
    const suffix = (hit[2] || "").toLowerCase();
    const scaled = suffix === "k" ? value * 1e3 : suffix === "m" ? value * 1e6 : value;
    if (!suffix && scaled < floor) continue;
    numbers.push(scaled);
  }
  if (!numbers.length) return null;

  const min = Math.min(...numbers);
  const max = Math.max(...numbers);

  return {
    min,
    max,
    currency: currencyOf(text),
    period,
    annual: Math.round(max * PER_YEAR[period]),
  };
}

/**
 * How a listing's pay stands against what the user asked for.
 *
 * Returns null whenever an honest answer isn't available: no figure on the
 * listing, nothing expected, or two currencies that would need a rate to
 * compare. Converting between currencies without a live rate would be
 * inventing the answer, so it declines instead.
 */
export function comparePay(jobSalary, expectedAmount, expectedCurrency) {
  const pay = parsePay(jobSalary);
  if (!pay) return null;

  const want = parsePay(expectedAmount);
  if (!want) return null;

  // A listing that never named its currency can't be set against one that
  // did — "160,000" is a very different offer in rupees and in dollars.
  if (!pay.currency || pay.currency !== expectedCurrency) return null;

  const meets = pay.annual >= want.annual;
  return {
    meets,
    label: meets ? "Meets your expectation" : "Below your expectation",
    // Both sides of the comparison, so the tooltip can show its working.
    detail: `Listing ≈ ${pay.annual.toLocaleString("en-US")} ${pay.currency}/year vs your ${want.annual.toLocaleString("en-US")} ${expectedCurrency}/year`,
    assumedPeriod: pay.period !== "year" ? pay.period : null,
  };
}
