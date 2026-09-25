/**
 * Who may open the Jobs section before they have earned it.
 *
 * The section is normally shut until a student is a quarter of the way through
 * their enrolled learning. A short list of accounts is exempt — the people
 * building and demonstrating the product, who have no course progress at all.
 *
 * This lives on the server, keyed to the account, for two reasons the previous
 * arrangement got wrong. It was a build-time flag (VITE_JOBS_GATE_BYPASS) baked
 * into whatever machine ran the dev server: every account that signed in on
 * that machine got Jobs, and the same account got nothing on any other machine.
 * Access belongs to a person, not to a computer.
 *
 * The account's own `jobsAlwaysOpen` field is the real switch. JOBS_ALWAYS_OPEN
 * in .env is a convenience on top of it: a comma-separated list matched,
 * case-insensitively, against the account's name, email or card number:
 *
 *   JOBS_ALWAYS_OPEN=Yaticorp,Bhagyashree
 *   JOBS_ALWAYS_OPEN=yati@example.com,YC-1029
 *
 * Unset or empty means nobody is exempt, which is the right default for
 * production: the progress rule then applies to everyone.
 */

/** The list as written in the environment, lowercased and trimmed. */
const allowList = () => String(process.env.JOBS_ALWAYS_OPEN || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

/**
 * Is this account exempt from the progress rule?
 * @param {{name?: string, email?: string, cardNumber?: string}} user
 */
const jobsAlwaysOpen = (user) => {
    if (!user) return false;
    // The account's own flag comes first: it lives in the database, so it
    // travels with the card to any machine and any server pointed at that
    // database. The environment list below is only a convenience for setting
    // accounts up, and a server without it changes nothing.
    if (user.jobsAlwaysOpen === true) return true;

    const list = allowList();
    if (!list.length) return false;
    // Name, email and card number are all accepted so the list can be written
    // with whichever of them the person running it actually knows.
    const mine = [user.name, user.email, user.cardNumber]
        .map((v) => String(v || '').trim().toLowerCase())
        .filter(Boolean);
    return mine.some((value) => list.includes(value));
};

module.exports = { jobsAlwaysOpen, allowList };
