/**
 * Age eligibility and safety policy for the Local Jobs section.
 *
 * One table, read everywhere. A card never decides for itself whether a
 * 15-year-old may see it: it carries facts — minimum age, safety class,
 * whether the organisation is verified, how long a shift runs — and this
 * file holds the policy that turns those facts into a yes or a no. Changing
 * what a teen may see is an edit to BANDS, not a sweep through the jobs.
 *
 * Three bands. Under 14 sees no jobs at all — every listing here is work.
 * 14–17 sees only jobs explicitly open to their age, classed youth-safe or
 * supervised, from a verified organisation, no longer than a school-day
 * shift, and behind guardian approval. 18+ sees everything.
 */
const { TYPES } = require('../data/opportunityVocab');

const EMPLOYMENT_TYPES = TYPES.filter((t) => t.employment).map((t) => t.id);

// Every job on the board is open to every student, whatever their age
// (the account owner's instruction, 2026-09-29). What age still decides is
// who has to agree first: under GUARDIAN_AGE a parent or guardian approves
// each application, then the school; from then on the student goes straight
// on. The bands keep only what differs beyond that — what is shown of the
// organisation's contact and pay.
const BANDS = [
  {
    id: 'explore',
    label: 'Local jobs',
    minAge: 0,
    maxAge: 13,
    employment: false,
    allowedTypes: null,
    allowedSafety: null,
    verifiedOnly: false,
    maxHours: null,
    guardianApproval: true,
    exposeContact: false,
    exposeCompensation: true,
    hiddenCategories: []
  },
  {
    id: 'teen',
    label: 'Local jobs',
    minAge: 14,
    maxAge: 17,
    employment: 'restricted',
    allowedTypes: null,
    allowedSafety: null,
    verifiedOnly: false,
    maxHours: null,
    guardianApproval: true,
    exposeContact: false,
    exposeCompensation: true,
    hiddenCategories: []
  },
  {
    id: 'adult',
    label: 'Local jobs',
    minAge: 18,
    maxAge: null,
    employment: true,
    allowedTypes: null,      // everything
    allowedSafety: null,     // everything
    verifiedOnly: false,
    maxHours: null,
    guardianApproval: false,
    exposeContact: true,
    exposeCompensation: true,
    hiddenCategories: []
  }
];

const HOUR_RANK = { '1-2': 1, '2-4': 2, '4+': 3 };

/** Whole years between a date of birth and today, or null. */
const ageFrom = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday = now.getMonth() < dob.getMonth()
    || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
};

const bandFor = (age) => {
  if (age == null) return null;
  return BANDS.find((b) => age >= b.minAge && (b.maxAge == null || age <= b.maxAge)) || null;
};

/**
 * Whether one job may be shown to one student. The first failing rule
 * names itself, so the caller can count exclusions by stage and the details
 * endpoint can say why a link someone shared does not open.
 */
const check = (opp, { age, band }) => {
  if (!band) return { ok: false, rule: 'unknown-age' };
  if (opp.status !== 'open') return { ok: false, rule: 'closed' };
  // A job's minimum age is shown on the card, not enforced: every job is
  // open to every student, and the parent's approval is the safeguard.
  if (opp.maximumAge != null && age > opp.maximumAge) return { ok: false, rule: 'age' };
  if (band.hiddenCategories.includes(opp.category)) return { ok: false, rule: 'safety' };
  if (band.allowedTypes && !band.allowedTypes.includes(opp.opportunityType)) return { ok: false, rule: 'safety' };
  if (band.allowedSafety && !band.allowedSafety.includes(opp.safetyClassification)) return { ok: false, rule: 'safety' };
  if (band.verifiedOnly && !opp.verified) return { ok: false, rule: 'verification' };
  if (band.maxHours && HOUR_RANK[opp.hoursPerSession] > HOUR_RANK[band.maxHours]) return { ok: false, rule: 'safety' };
  return { ok: true, rule: null };
};

/**
 * The band's policy in the shape the client needs — never the band object
 * itself, so a rule added here later is not silently shipped to the browser.
 */
const clientRules = (band) => band && ({
  band: band.id,
  label: band.label,
  employment: band.employment,
  guardianApproval: band.guardianApproval,
  exposeContact: band.exposeContact,
  exposeCompensation: band.exposeCompensation,
  allowedTypes: band.allowedTypes || TYPES.map((t) => t.id),
  hiddenCategories: band.hiddenCategories,
  verifiedOnly: band.verifiedOnly
});

/**
 * One job as this student may see it. Contact details leave the document
 * only for adults; everyone else expresses interest through the LMS and the
 * organisation reaches the guardian, not the child.
 */
const publicView = (opp, band) => {
  const o = opp.toObject ? opp.toObject() : { ...opp };
  const view = {
    id: String(o._id),
    slug: o.slug,
    source: o.source,
    title: o.title,
    organization: o.organization,
    description: o.description,
    category: o.category,
    icon: o.icon,
    skills: o.skills,
    interests: o.interests,
    opportunityType: o.opportunityType,
    location: o.location,
    startsAt: o.startsAt,
    endsAt: o.endsAt,
    timeLabel: o.timeLabel,
    minimumAge: o.minimumAge,
    maximumAge: o.maximumAge,
    hoursPerSession: o.hoursPerSession,
    slots: o.slots,
    compensation: band?.exposeCompensation === false ? null : o.compensation,
    verified: o.verified,
    safetyClassification: o.safetyClassification,
    guardianApprovalRequired: !!band?.guardianApproval && (o.guardianApprovalRequired || EMPLOYMENT_TYPES.includes(o.opportunityType)),
    supervision: o.supervision,
    safetyNotes: o.safetyNotes,
    status: o.status,
    postedAt: o.postedAt
  };
  if (band?.exposeContact && o.contact && (o.contact.email || o.contact.phone)) view.contact = o.contact;
  return view;
};

module.exports = { BANDS, ageFrom, bandFor, check, clientRules, publicView, EMPLOYMENT_TYPES };
