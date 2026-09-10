/**
 * Shared setup for the interview tests: the built-in interviewer (no AI key
 * needed), a real database connection, a throwaway student, and an Express
 * app with only the interview router mounted. Everything a test creates is
 * removed in cleanup(), including the rewards rows the routes write.
 */
process.env.INTERVIEW_AI = 'template';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');


const connect = async () => { if (mongoose.connection.readyState !== 1) { const { connectDB } = require('../src/config/db'); await connectDB(); } };

const makeUser = async (label = 'Test') => {
    const User = require('../src/models/User');
    const stamp = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
    const user = await User.create({ name: `${label} Student`, email: `interview-test-${stamp}@example.com`, password: 'Passw0rd!x', phone: '9999999999', cardNumber: `IT${stamp}` });
    return { user, token: jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }) };
};

/**
 * An Express app with one router mounted, and a `call` bound to that mount, so
 * a test asks for '/dashboard' rather than the whole path. Defaults to the
 * interview API; pass a mount and router for anything else.
 */
const startApp = ({ mount = '/api/interview', router = require('../src/interview') } = {}) => {
    const app = express(); app.use(express.json());
    app.use(mount, router);
    // eslint-disable-next-line no-unused-vars
    app.use((err, _req, res, _next) => res.status(err.status || 500).json({ message: err.message }));
    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}${mount}`;
    const call = (token) => (method, path, body) => fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
        .then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
    return { server, call };
};

/**
 * Delete everything these test users left behind, then the users themselves.
 *
 * Every collection with a `userId` is swept rather than a list written by
 * hand: an interview awards XP, badges, streaks and wallet rows through the
 * rewards hooks, and a list missed `rewards_xp_transactions`, whose rows then
 * ranked on the real leaderboard under the fallback name "Student".
 */
const cleanup = async (users, server) => {
    const db = mongoose.connection.db; const ids = users.map((u) => u._id);
    const collections = (await db.listCollections().toArray()).map((c) => c.name).filter((n) => n !== 'users');
    for (const c of collections) await db.collection(c).deleteMany({ userId: { $in: ids } }).catch(() => {});
    await require('../src/models/User').deleteMany({ _id: { $in: ids } });
    if (server) await new Promise((r) => server.close(r));
    await mongoose.disconnect();
};

/** A candidate profile the way studentContext builds one, without a database. */
const fakeContext = (over = {}) => ({
    name: 'Asha Rao', firstName: 'Asha', audience: 'college', education: ['B.E. Computer Science'], experience: [], goal: 'Data Analyst', headline: '',
    skills: [{ name: 'Python', status: 'Proficient', sources: ['course'] }, { name: 'SQL', status: 'Developing', sources: ['career'] }, { name: 'Excel', status: 'Learning', sources: ['resume'] }],
    strongSkills: ['Python'], learningSkills: ['SQL', 'Excel'],
    completedCourses: ['Python Foundations'], ongoingCourses: ['SQL for Analysts'], assessments: { passed: 2, averageScore: 78 },
    projects: [{ name: 'Sales Dashboard', description: 'A retail sales dashboard', skills: ['Python', 'SQL'] }], certificates: [], interests: ['Data'], hash: 'h1', ...over
});

module.exports = { connect, makeUser, startApp, cleanup, fakeContext };
