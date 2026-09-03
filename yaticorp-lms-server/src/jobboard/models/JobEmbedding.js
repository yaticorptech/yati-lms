const mongoose = require("mongoose");

/**
 * A listing's semantic vector, kept apart from the listing itself.
 *
 * Storing 768 floats on the Job document would mean every query that
 * touches jobs drags them along: the recommendation pre-filter alone pulls
 * 600 documents per search, which is several megabytes of vector nobody
 * asked for on a query that only needs titles and locations. Here they are
 * loaded deliberately, and only for the handful of listings that survive
 * ranking and are about to be re-scored.
 *
 * Keyed on `externalId` rather than the Job's `_id` because that is the
 * stable identity across re-ingests — the same listing keeps its vector
 * when a board refreshes it, and text that hasn't changed is never
 * re-embedded.
 */
const jobEmbeddingSchema = new mongoose.Schema(
  {
    externalId: { type: String, required: true, unique: true, index: true },

    vector: { type: [Number], required: true },
    dimensions: { type: Number, required: true },
    model: { type: String, required: true },

    // Hash of the text that produced this vector. A listing whose title and
    // description are unchanged doesn't need re-embedding, which is what
    // keeps a re-ingest from re-spending the whole allowance.
    textHash: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("JobBoardEmbedding", jobEmbeddingSchema, "jobboard_embeddings");
