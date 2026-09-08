/**
 * Shared setup for the interview tests: the built-in interviewer (no AI key
 * needed), a real database connection, a throwaway student, and an Express
 * app with only the interview router mounted. Everything a test creates is
 * removed in cleanup(), including the rewards rows the routes write.
 */
process.env.INTERVIEW_AI = 'template';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');

const REWARD_COLLECTIONS = ['rewards_learning_activities', 'rewards_events', 'rewards_user_badges', 'rewards_reward_transactions', 'rewards_streaks', 'rewards_wallets'];

const connect = async () => { if (mongoose.connection.readyState !== 1) { const { connectDB } = require('../../src/config/db'); await connectDB(); } };

const makeUser = async (label = 'Test') => {
    const User = require('../../src/models/User');
    const stamp = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
    const user = await User.create({ name: `${label} Student`, email: `interview-test-${stamp}@example.com`, password: 'Passw0rd!x', phone: '9999999999', cardNumber: `IT${stamp}` });
    return { user, token: jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }) };
};

const startApp = () => {
    const app = express(); app.use(express.json());
    app.use('/api/interview', require('../../src/interview'));
    // eslint-disable-next-line no-unused-vars
    app.use((err, _req, res, _next) => res.status(err.status || 500).json({ message: err.message }));
    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}/api/interview`;
    const call = (token) => (method, path, body) => fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
        .then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
    return { server, call };
};

const cleanup = async (users, server) => {
    const db = mongoose.connection.db; const ids = users.map((u) => u._id);
    for (const c of ['interview_sessions', 'interview_prep', ...REWARD_COLLECTIONS]) await db.collection(c).deleteMany({ userId: { $in: ids } }).catch(() => {});
    await require('../../src/models/User').deleteMany({ _id: { $in: ids } });
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
