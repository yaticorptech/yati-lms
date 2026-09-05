/**
 * The vocabulary of the Local Jobs section — what a job can be, what a
 * student can be interested in, and how long a shift runs.
 *
 * Kept as data rather than as enum literals scattered across the model, the
 * seed, the rules, the admin form and the client, because the whole point
 * of the section is that these lists match: a student who ticks "Events"
 * must be matched to a job tagged `events`, not `event`. The student client
 * and the admin form both receive this table from the API and never keep
 * their own.
 */

const CATEGORIES = [
  { id: 'catering', label: 'Catering & serving', icon: '🍽️' },
  { id: 'events', label: 'Events & functions', icon: '🎪' },
  { id: 'decoration', label: 'Decoration & buntings', icon: '🎀' },
  { id: 'packing', label: 'Packing & sweet boxing', icon: '📦' },
  { id: 'photography', label: 'Photography & media', icon: '📷' },
  { id: 'promotion', label: 'Promotion & flyers', icon: '📣' },
  { id: 'shop', label: 'Shop & counter help', icon: '🛍️' },
  { id: 'setup', label: 'Setup & cleanup', icon: '🧹' },
  { id: 'delivery', label: 'Delivery & driving', icon: '🛵' },
  // Most real part-time listings for students are tutoring or coaching;
  // without a heading of their own they all file under "Other".
  { id: 'tutoring', label: 'Tutoring & coaching', icon: '📚' },
  // Everyday local work a student can pick up around the neighbourhood —
  // the kind of job a shop, a family or a small business posts on a board.
  { id: 'househelp', label: 'House help & cleaning', icon: '🧽' },
  { id: 'cooking', label: 'Cooking & tiffin help', icon: '🍲' },
  { id: 'babysitting', label: 'Babysitting & child care', icon: '🧸' },
  { id: 'eldercare', label: 'Elder care & companionship', icon: '🧓' },
  { id: 'petcare', label: 'Pet care & dog walking', icon: '🐕' },
  { id: 'gardening', label: 'Gardening & plant care', icon: '🪴' },
  { id: 'farm', label: 'Farm & harvest help', icon: '🌾' },
  { id: 'carwash', label: 'Car & bike washing', icon: '🚗' },
  { id: 'laundry', label: 'Laundry & ironing', icon: '👕' },
  { id: 'tailoring', label: 'Tailoring & stitching', icon: '🧵' },
  { id: 'salon', label: 'Salon & mehendi', icon: '💅' },
  { id: 'bakery', label: 'Bakery & sweets shop', icon: '🧁' },
  { id: 'canteen', label: 'Canteen & tea stall', icon: '☕' },
  { id: 'market', label: 'Market & vegetable stall', icon: '🥬' },
  { id: 'newspaper', label: 'Newspaper & milk rounds', icon: '🗞️' },
  { id: 'xerox', label: 'Xerox & printing shop', icon: '🖨️' },
  { id: 'mobilerepair', label: 'Mobile & cycle repair shop', icon: '🔧' },
  { id: 'painting', label: 'Painting & whitewash help', icon: '🎨' },
  { id: 'construction', label: 'Construction site helper', icon: '🧱' },
  { id: 'loading', label: 'Loading & unloading', icon: '🏋️' },
  { id: 'tenthouse', label: 'Tent house & mandap', icon: '⛺' },
  { id: 'festival', label: 'Temple & festival help', icon: '🪔' },
  { id: 'security', label: 'Security & watchman', icon: '🛡️' },
  { id: 'parking', label: 'Parking & gate attendant', icon: '🅿️' },
  { id: 'survey', label: 'Survey & door-to-door', icon: '📋' },
  { id: 'dataentry', label: 'Data entry & typing', icon: '⌨️' },
  { id: 'sports', label: 'Sports & fitness help', icon: '🏏' },
  { id: 'other', label: 'Other', icon: '🌱' }
];

// What a student may say they are interested in — the categories, minus the
// one no minor may ever be offered. The rules hide it; the onboarding does
// not offer it either, so nothing is ticked that can never match.
const INTERESTS = CATEGORIES.filter((c) => c.id !== 'delivery');

const HOURS = [
  { id: '1-2', label: '1–2 hours' },
  { id: '2-4', label: '2–4 hours' },
  { id: '4+', label: '4+ hours' }
];

/* Every type here is work — this is a job board, not a course list. */
const TYPES = [
  { id: 'gig', label: 'One-day job', employment: true },
  { id: 'event-support', label: 'Event work', employment: true },
  { id: 'part-time', label: 'Part-time', employment: true }
];

const SAFETY = [
  { id: 'youth-safe', label: 'Youth-safe', blurb: 'Light, daytime, supervised work with no hazards — open to teens.' },
  { id: 'supervised', label: 'Supervised', blurb: 'Adult-led with a named supervisor; light duties, daytime.' },
  { id: 'general', label: 'General', blurb: 'A standard adult workplace.' },
  { id: 'restricted', label: 'Restricted', blurb: 'Late hours, driving, heavy lifting or licensed premises.' }
];

const ids = (list) => list.map((x) => x.id);

module.exports = {
  CATEGORIES, INTERESTS, HOURS, TYPES, SAFETY,
  CATEGORY_IDS: ids(CATEGORIES),
  INTEREST_IDS: ids(INTERESTS),
  HOUR_IDS: ids(HOURS),
  TYPE_IDS: ids(TYPES),
  SAFETY_IDS: ids(SAFETY)
};
