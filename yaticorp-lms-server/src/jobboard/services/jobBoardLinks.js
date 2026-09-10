/**
 * Where to look for part-time work when this server cannot fetch it.
 *
 * The board's own listings come from Google Jobs through a metered API. When
 * that is unconfigured, out of allowance, or simply has nothing for a small
 * town, the honest answer is not an empty section: it is to hand the student
 * the same searches, on the sites that run them, for their own town.
 *
 * These are search pages, not vacancies. Every URL is built from a template
 * with the town in a query parameter, so it is real for any place name and
 * nothing here is ever invented. No API key, no allowance, no network call.
 */

const e = encodeURIComponent;

/** A town's name reduced to the slug Naukri uses in its own URLs. */
const slug = (city) => String(city).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const BOARDS = [
    {
        id: 'google',
        name: 'Google Jobs',
        url: (city) => `https://www.google.com/search?q=${e(`part time jobs in ${city}`)}&ibp=htl;jobs`
    },
    {
        id: 'indeed',
        name: 'Indeed',
        url: (city) => `https://in.indeed.com/jobs?q=${e('part time')}&l=${e(city)}`
    },
    {
        id: 'linkedin',
        name: 'LinkedIn',
        url: (city) => `https://www.linkedin.com/jobs/search/?keywords=${e('part time')}&location=${e(city)}`
    },
    {
        id: 'naukri',
        name: 'Naukri',
        url: (city) => `https://www.naukri.com/part-time-jobs-in-${slug(city)}`
    }
];

/**
 * Search links for a town, or an empty list when no town is known — there is
 * nothing useful to link to without one.
 * @returns {{ id: string, name: string, url: string }[]}
 */
const searchLinks = (city) => {
    const where = String(city || '').trim();
    if (!where) return [];
    return BOARDS.map((b) => ({ id: b.id, name: b.name, url: b.url(where) }));
};

module.exports = { searchLinks, slug };
