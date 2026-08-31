/**
 * The nightly upkeep that stops the index quietly rotting.
 *
 * Without this, `npm run jobs:ingest` is a thing someone must remember:
 * listings go stale in 45 days, new ones never arrive, and the decay is
 * invisible until a student's search comes back thin. The LMS already keeps
 * itself tidy on setIntervals in server.js (ticket cleanup, job alerts); this
 * is the same pattern for the job index.
 *
 * One run a day does three things, in order:
 *
 *   1. ingest — re-read every keyless board, plus the metered sources within
 *      their own budgets;
 *   2. retire — deactivate listings not seen for 45 days, so dead links do
 *      not outnumber live ones;
 *   3. geocode — resolve up to GEOCODE_BATCH new place names (~1s each), so
 *      distance ranking keeps covering what ingest just brought in;
 *   4. embed — vectors for up to EMBED_TEXTS new or reworded listings, so the
 *      semantic signal keeps covering the index. Off-peak by construction:
 *      this is the answer to a big manual `jobs:embed` spending the shared
 *      Gemini allowance mid-class (see also JOBS_GEMINI_API_KEY, which
 *      separates the allowances entirely). Skipped without a key; the
 *      monthly request meter still governs total spend.
 *
 * The database-backed claim is what makes the schedule safe: the interval in
 * server.js fires far more often than the run happens, redeploys cannot
 * double-run a day, and on a multi-instance host exactly one instance wins.
 *
 * Runs even while the student section is locked — locking hides the board,
 * and an operator expects to unlock a live index, not a decayed one.
 *
 * Opt out with JOBS_AUTO_INGEST=false (for hosts that prefer a real cron or
 * that run many short-lived instances).
 */
const { isConnected } = require('../config/db');
const { ingestAll, deactivateStale, meteredUsage } = require('./providerService');
const { geocodeMissing } = require('./geocodeService');
const { embedMissing } = require('./embedService');
const { claimRun, markRun } = require('./stateService');

const STATE_KEY = 'scheduled-ingest';
// "Daily" with slack, so the run drifts to whenever the interval fires
// instead of creeping later every day until it skips one.
const MIN_GAP_MS = 20 * 60 * 60 * 1000;
// ~3–4 minutes of geocoding at one place per second. New places per day are
// far fewer than this once the cache is warm; the cap only matters on the
// first runs after a cold start.
const GEOCODE_BATCH = 200;
// 10 batch requests of 50 texts. Bounded per night so the run stays short;
// the monthly meter in geminiService bounds the spend either way, and what
// does not fit tonight is picked up tomorrow.
const EMBED_TEXTS = 500;

const enabled = () =>
    !/^(0|false|off|no)$/i.test(String(process.env.JOBS_AUTO_INGEST ?? ''));

const runScheduledMaintenance = async () => {
    try {
        if (!enabled() || !isConnected()) return;

        const { claimed } = await claimRun(STATE_KEY, MIN_GAP_MS);
        if (!claimed) return;

        console.log('[jobs] Scheduled maintenance: ingesting…');
        const { upserted, report } = await ingestAll({});
        for (const r of report) {
            if (!r.ok) console.warn(`[jobs]   ${r.source} failed: ${r.error}`);
        }

        const retired = await deactivateStale(45);
        const geo = await geocodeMissing({ maxPlaces: GEOCODE_BATCH });
        const emb = await embedMissing({ maxTexts: EMBED_TEXTS });

        // The lazy per-search refresh keys off this too — a search arriving
        // right after maintenance should not trigger a second global ingest.
        await markRun('ingest:GLOBAL');

        console.log(
            `[jobs] Maintenance done: ${upserted} listings written, ${retired} retired, ` +
            `${geo.resolved}/${geo.worked} places geocoded (${geo.written} listings located), ` +
            (emb.skipped ? 'embeddings skipped (no key).' : `${emb.written} embeddings stored (${emb.pending} were pending).`)
        );
        for (const u of await meteredUsage()) {
            console.log(`[jobs]   ${u.provider}: ${u.calls} metered requests used in ${u.month}.`);
        }
    } catch (err) {
        // A missed night costs freshness, never anything else.
        console.error('[jobs] Scheduled maintenance failed:', err.message);
    }
};

module.exports = { runScheduledMaintenance };
