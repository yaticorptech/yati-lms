/**
 * Small readers over the job shape the server sends. Kept out of the
 * components so the card, the details dialog and the list say the same
 * thing about the same listing.
 */

export const labelFor = (list, id) => list?.find((x) => x.id === id)?.label || id;

const joinNames = (names) => {
    if (names.length <= 1) return names.join('');
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

/**
 * "Recommended because …" from the reasons the recommender actually fired.
 * With none fired the sentence claims only what is true of every listing on
 * the page: that the age rules let it through.
 */
export const reasonSentence = (o) => {
    const reasons = o.matchReasons || [];
    if (!reasons.length) {
        return o.verified
            ? 'Open to your age group, from a verified organisation.'
            : 'Open to your age group.';
    }
    return `Recommended because ${joinNames(reasons)}.`;
};

export const ageLabel = (o) =>
    o.maximumAge != null ? `Ages ${o.minimumAge}–${o.maximumAge}` : `Ages ${o.minimumAge}+`;

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const fmt = (d, opts) => new Date(d).toLocaleDateString('en-IN', opts);

/** "Sat 12 Sep" for a day, "Sat 12 – Mon 14 Sep" for a run of days. */
export const dateLabel = (o) => {
    if (!o?.startsAt) return '';
    if (!o.endsAt || sameDay(o.startsAt, o.endsAt)) return fmt(o.startsAt, { weekday: 'short', day: 'numeric', month: 'short' });
    const a = new Date(o.startsAt), b = new Date(o.endsAt);
    if (a.getMonth() === b.getMonth()) {
        return `${fmt(a, { weekday: 'short', day: 'numeric' })} – ${fmt(b, { weekday: 'short', day: 'numeric', month: 'short' })}`;
    }
    return `${fmt(a, { day: 'numeric', month: 'short' })} – ${fmt(b, { day: 'numeric', month: 'short' })}`;
};

export const longDate = (d) => fmt(d, { weekday: 'long', day: 'numeric', month: 'long' });
export const shortDate = (d) => fmt(d, { day: 'numeric', month: 'short' });

export const whereLabel = (o) => [o.location?.area, o.location?.city].filter(Boolean).join(', ') || 'Location on request';

export const hoursLabel = (h) => ({ '1-2': '1–2 hrs', '2-4': '2–4 hrs', '4+': '4+ hrs' })[h] || h;

/** yyyy-mm-dd for a date input, in local time. */
export const toDateInput = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Whole years from a yyyy-mm-dd string, or null. Mirrors the server. */
export const ageFromDob = (value) => {
    if (!value) return null;
    const dob = new Date(value);
    if (Number.isNaN(dob.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const before = now.getMonth() < dob.getMonth()
        || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
    if (before) age -= 1;
    return age >= 0 && age < 130 ? age : null;
};

export const bandFromAge = (age) => (age == null ? null : age < 14 ? 'explore' : age < 18 ? 'teen' : 'adult');

export const BAND_COPY = {
    explore: {
        title: "Let's explore your future.",
        subtitle: "Local jobs aren't available for your age group yet, but you can explore skills, projects and career paths in the meantime.",
        eyebrow: 'Explore & Learn'
    },
    teen: {
        title: 'Part-time jobs on your dates',
        subtitle: 'Supervised, verified, age-appropriate local work — catering, events, packing, decoration — on the dates you say you\'re free, with a guardian in the loop.',
        eyebrow: 'Age-appropriate part-time jobs'
    },
    adult: {
        title: 'Part-time jobs on your dates',
        subtitle: 'Catering, events, packing, decoration, photography and more — local work near you, on the dates you want it.',
        eyebrow: 'Part-time jobs'
    }
};

/** The filter bar's blank state, and how many facets are set. */
export const EMPTY_FILTERS = { category: '', type: '', interest: '', verified: false, anyDate: false };
export const countActive = (f) => ['category', 'type', 'interest'].filter((k) => f[k]).length + (f.verified ? 1 : 0);
