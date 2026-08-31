/**
 * Builds the semantic vectors the Gemini matching pass reads.
 *
 * The engine behind both `npm run jobs:embed` (unbounded, with progress
 * output) and the nightly maintenance run (bounded, silent). Embeddings are
 * computed at rest rather than during a search because a search can afford
 * exactly one API call — the profile's — and not one per candidate listing.
 *
 * Vectors are keyed on externalId and on a hash of the text they came from,
 * so a run after an ingest only embeds listings that are new or whose wording
 * actually changed — a board refreshing an unchanged listing costs nothing.
 * Safe to interrupt; it resumes from whatever is still missing.
 */
const crypto = require('node:crypto');
const Job = require('../models/Job');
const JobEmbedding = require('../models/JobEmbedding');
const { embedBatch, jobText, geminiInfo, geminiConfigured, EMBED_BATCH } = require('./geminiService');

const hash = (text) => crypto.createHash('sha1').update(text).digest('hex');

/**
 * Embed listings that need it, up to `maxTexts`.
 *
 * Returns { active, pending, written, failed }. `pending` counts what needed
 * embedding BEFORE the cap, so a bounded caller can see there is more left.
 * The monthly request meter inside embedBatch still governs total spend —
 * the cap here only bounds one run's duration.
 */
const embedMissing = async ({ maxTexts = Infinity, redoAll = false, onProgress } = {}) => {
    if (!geminiConfigured()) return { active: 0, pending: 0, written: 0, failed: 0, skipped: 'no key' };

    const info = geminiInfo();
    const already = redoAll ? new Map() : new Map(
        (await JobEmbedding.find({ model: info.model, dimensions: info.dimensions })
            .select('externalId textHash')
            .lean()).map((r) => [r.externalId, r.textHash])
    );

    const jobs = await Job.find({ active: true })
        .select('externalId title company skills type description')
        .lean();

    const pending = [];
    for (const job of jobs) {
        if (!job.externalId) continue;
        const text = jobText(job);
        if (!text) continue;
        const digest = hash(`${info.model}:${info.dimensions}:${text}`);
        if (already.get(job.externalId) === digest) continue;
        pending.push({ externalId: job.externalId, text, digest });
    }

    const queue = Number.isFinite(maxTexts) ? pending.slice(0, maxTexts) : pending;

    let written = 0;
    let failed = 0;

    for (let i = 0; i < queue.length; i += EMBED_BATCH) {
        const slice = queue.slice(i, i + EMBED_BATCH);
        let vectors;
        try {
            vectors = await embedBatch(slice.map((p) => p.text), { retry: true });
        } catch {
            // Rate limits are retried inside the service, so reaching here
            // means the key, the model or the allowance — none of which the
            // next batch would survive either. What is stored stands; a
            // re-run resumes from it.
            failed += slice.length;
            break;
        }

        const ops = [];
        slice.forEach((p, k) => {
            const vector = vectors[k];
            if (!vector?.length) return void failed++;
            ops.push({
                updateOne: {
                    filter: { externalId: p.externalId },
                    update: {
                        $set: {
                            externalId: p.externalId,
                            vector,
                            dimensions: vector.length,
                            model: info.model,
                            textHash: p.digest
                        }
                    },
                    upsert: true
                }
            });
        });

        if (ops.length) {
            const res = await JobEmbedding.bulkWrite(ops, { ordered: false });
            written += (res.upsertedCount ?? 0) + (res.modifiedCount ?? 0);
        }
        onProgress?.({ done: Math.min(i + EMBED_BATCH, queue.length), queued: queue.length, written, failed });
    }

    return { active: jobs.length, pending: pending.length, written, failed };
};

module.exports = { embedMissing };
