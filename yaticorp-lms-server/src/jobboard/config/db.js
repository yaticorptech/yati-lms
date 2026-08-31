/**
 * The job board's view of the database connection.
 *
 * The LMS owns the connection — src/config/db.js opens it once at startup and
 * every module shares it. This file exists so the ported CareerCompass code can
 * keep asking the two questions it was written to ask:
 *
 *   isConnected()  — the routes degrade to an empty result rather than throwing
 *                    when the database is briefly away, which is how the
 *                    original behaved and is still the right answer here.
 *   connectDB()    — only for the ingestion scripts, which run as their own
 *                    process (`npm run jobs:ingest`) with no server around them.
 */
const mongoose = require('mongoose');

const isConnected = () => mongoose.connection.readyState === 1;

/**
 * Open a connection for a standalone script.
 *
 * Uses the LMS's own MONGO_URI — the job board's collections live in the same
 * database as everything else, prefixed jobboard_*, so that a deployment has
 * one database to back up and one connection string to rotate.
 */
const connectDB = async () => {
    if (isConnected()) return true;
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
        console.error('✖ MONGO_URI is not set — cannot run without a database.');
        return false;
    }
    try {
        mongoose.set('strictQuery', true);
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 10 });
        console.log(`✔ MongoDB connected → ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
        return true;
    } catch (err) {
        console.error(`✖ MongoDB connection failed: ${err.message}`);
        return false;
    }
};

module.exports = { connectDB, isConnected };
