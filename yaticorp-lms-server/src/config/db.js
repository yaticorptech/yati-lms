/**
 * @author Preethesh Kulal
 * @description MongoDB database connection using Mongoose
 */
const mongoose = require('mongoose');
const dns = require('dns');

// A dropped DNS packet or a few seconds of flaky wifi should cost a retry, not
// the whole server. Only give up once the link has stayed down across all of
// these attempts, which spans a couple of minutes.
const MAX_ATTEMPTS = 8;
const RETRY_DELAY_MS = 5000;

/**
 * A `mongodb+srv://` address is resolved with a DNS SRV query, and some
 * routers, ISPs and VPNs answer that query with ECONNREFUSED or SERVFAIL
 * while resolving ordinary hostnames fine — which looks like "MongoDB is
 * down" when the database is perfectly reachable. When the system resolver
 * fails that way, switch this process to public resolvers and try again.
 * MONGO_DNS_SERVERS overrides the list (comma-separated).
 */
const FALLBACK_DNS = String(process.env.MONGO_DNS_SERVERS || '8.8.8.8,1.1.1.1,8.8.4.4')
    .split(',').map((s) => s.trim()).filter(Boolean);
const isDnsFailure = (error) => /querySrv|queryTxt|ECONNREFUSED|ESERVFAIL|ENOTFOUND|EAI_AGAIN|ETIMEOUT/i.test(error?.message || '')
    && /srv|txt|dns|ENOTFOUND|EAI_AGAIN/i.test(error?.message || '');
let usingFallbackDns = false;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async () => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const conn = await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
            console.log(`LMS MongoDB Connected: ${conn.connection.host}${usingFallbackDns ? ' (via public DNS)' : ''}`);
            return conn;
        } catch (error) {
            const lastAttempt = attempt === MAX_ATTEMPTS;
            console.error(`Error: ${error.message}`);

            // The name could not be looked up rather than the server not
            // answering: retry at once through resolvers that do answer.
            if (!usingFallbackDns && isDnsFailure(error) && FALLBACK_DNS.length) {
                usingFallbackDns = true;
                dns.setServers(FALLBACK_DNS);
                console.warn(`DNS lookup failed on the system resolver (${error.code || 'DNS'}) — retrying through ${FALLBACK_DNS.join(', ')}...`);
                continue;
            }

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
