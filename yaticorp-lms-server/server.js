/**
 * @author Preethesh Kulal
 * @description Main Express server entry point, configures middleware, routes, CORS and scheduled jobs
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./src/config/db');

// Connect to database
connectDB();

const app = express();

// Trust proxy for rate limiting behind proxies (Railway, Heroku, etc.)
app.set('trust proxy', 1);

 
// Build the list of CORS-allowed origins from env vars
// ALLOWED_ORIGINS can be a comma-separated list of production domains
// e.g. ALLOWED_ORIGINS=https://student.yourdomain.com,https://admin.yourdomain.com
const buildAllowedOrigins = () => {
    const origins = new Set();

    // Hardcoded production origins (fallback)
    origins.add('https://yaticorp-lms-admin.vercel.app');
    origins.add('https://yaticorp-lms-student.vercel.app');

    // Add from individual env vars
    if (process.env.FRONTEND_URL) origins.add(process.env.FRONTEND_URL.trim());
    if (process.env.ADMIN_URL) origins.add(process.env.ADMIN_URL.trim());

    // Add from comma-separated ALLOWED_ORIGINS env var
    if (process.env.ALLOWED_ORIGINS) {
        process.env.ALLOWED_ORIGINS.split(',').forEach(o => origins.add(o.trim()));
    }

    return [...origins];
};

const allowedOrigins = buildAllowedOrigins();
console.log('CORS allowed origins:', allowedOrigins);

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, Postman, server-to-server)
        if (!origin) return callback(null, true);

        // Dynamically allow any localhost or 127.0.0.1 variant for development
        const isLocalhost = origin.startsWith('http://localhost:') || 
                           origin.startsWith('http://127.0.0.1:') ||
                           origin === 'http://localhost' ||
                           origin === 'http://127.0.0.1';

        if (isLocalhost || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        console.warn(`CORS blocked request from origin: ${origin}`);
        const corsError = new Error(`CORS policy does not allow access from origin: ${origin}`);
        corsError.status = 403;
        return callback(corsError, false);
    },
    credentials: true
}));
app.use(express.json());

// const { globalLimiter } = require('./src/middleware/rateLimiter');
// app.use('/api', globalLimiter);

// Basic Route
app.get('/', (req, res) => {
    res.send('YATICORP LMS API is running...');
});

// Serve Static Files
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// Import Routes
app.use('/api/auth', require('./src/routes/authRoutes'));       // All credential/auth routes
app.use('/api/admin', require('./src/routes/adminRoutes'));
app.use('/api/user', require('./src/routes/userRoutes'));
app.use('/api/sync', require('./src/routes/syncRoutes'));
app.use('/api/certificates', require('./src/routes/certificateRoutes'));
app.use('/api/vdocipher', require('./src/routes/vdoCipherRoutes'));
app.use('/api/bunny', require('./src/routes/bunnyRoutes'));
app.use('/api/tickets', require('./src/routes/ticketRoutes'));
app.use('/api/community', require('./src/routes/communityRoutes'));
// Career Path (FuturePath) — student-only AI roadmap section. One mount; the
// module's own router fans out to /goals, /roadmap, /tasks, /chat and the rest.
app.use('/api/career', require('./src/career'));
// Public share links for Career Path milestone badges: /b/<code> renders the
// page a student's followers open, /b/<code>/image.png is what LinkedIn, X and
// WhatsApp embed. Deliberately outside /api and deliberately unauthenticated —
// a social crawler has no session. Short path because it is a link people see.
app.use('/b', require('./src/career/routes/publicBadgeRoutes'));

// Error handler — must come after every route so next(err) lands here instead
// of Express's default HTML "Internal Server Error" page.
const { errorHandler } = require('./src/middleware/errorHandler');
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// ── Scheduled Jobs ──────────────────────────────────────────────────────────
const { cleanupResolvedTickets } = require('./src/jobs/ticketCleanup');

// Run ticket cleanup every hour
setInterval(cleanupResolvedTickets, 60 * 60 * 1000);

// Also run once on startup
cleanupResolvedTickets();
