/**
 * @author Preethesh Kulal
 * @description MongoDB database connection using Mongoose
 */
const mongoose = require('mongoose');

// A dropped DNS packet or a few seconds of flaky wifi should cost a retry, not
// the whole server. Only give up once the link has stayed down across all of
// these attempts, which spans roughly a minute.
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 5000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async () => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const conn = await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
            console.log(`LMS MongoDB Connected: ${conn.connection.host}`);
            return conn;
        } catch (error) {
            const lastAttempt = attempt === MAX_ATTEMPTS;
            console.error(`Error: ${error.message}`);

            if (lastAttempt) {
                console.error(`MongoDB unreachable after ${MAX_ATTEMPTS} attempts — exiting.`);
                process.exit(1);
            }

            const delaySeconds = RETRY_DELAY_MS / 1000;
            console.warn(`Retrying MongoDB connection in ${delaySeconds}s (attempt ${attempt + 1}/${MAX_ATTEMPTS})...`);
            await wait(RETRY_DELAY_MS);
        }
    }
};

module.exports = { connectDB };
