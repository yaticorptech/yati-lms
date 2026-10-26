/**
 * Entry fees, paid with real money through Razorpay.
 *
 * When an organizer sets a fee, each approved player pays it online before
 * they can join — no joining code, no seat, until then. The flow:
 *
 *   1. the student asks to pay: a Razorpay order is made here for the amount
 *      (in paise), kept as an EntryPayment row ('created');
 *   2. Razorpay Checkout takes the payment in the student's browser;
 *   3. the browser sends back the order id, payment id and signature; the
 *      signature is checked here with the secret key (HMAC-SHA256 of
 *      "order_id|payment_id") — only then is the player marked paid.
 *
 * If the browser closed before step 3, asking to pay again first asks
 * Razorpay whether that order was already paid, so nobody pays twice.
 *
 * Keys: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the server's .env.
 *
 * Until they are set, payments run in test mode: the student confirms a test
 * payment (no money moves) and it is recorded the same way, marked 'test'.
 * Once the keys are in, every new payment goes through Razorpay.
 */
const crypto = require('crypto');
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: ['competition', 'arena'], required: true },
    competitionId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    amount: { type: Number, required: true },                 // ₹
    orderId: { type: String, required: true, unique: true },
    paymentId: { type: String, default: null },
    status: { type: String, enum: ['created', 'paid'], default: 'created', index: true },
    // 'test' while Razorpay is not set up (no money moves), 'razorpay' after.
    mode: { type: String, enum: ['razorpay', 'test'], default: 'razorpay' },
    paidAt: { type: Date, default: null }
}, { timestamps: true });
const EntryPayment = mongoose.models.EntryPayment || mongoose.model('EntryPayment', paymentSchema, 'competition_entry_payments');

const due = (c) => (c?.entryFee?.enabled && c.entryFee.amount > 0 ? c.entryFee.amount : 0);

const keys = () => ({ id: process.env.RAZORPAY_KEY_ID || '', secret: process.env.RAZORPAY_KEY_SECRET || '' });
const fail = (status, message) => Object.assign(new Error(message), { status });

// Tests swap this for a stand-in Razorpay.
let fetchImpl = (...a) => fetch(...a);
const setFetch = (f) => { fetchImpl = f || ((...a) => fetch(...a)); };

const razorpay = async (path, { method = 'GET', body } = {}) => {
    const { id, secret } = keys();
    const r = await fetchImpl(`https://api.razorpay.com/v1${path}`, {
        method,
        headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw fail(502, data?.error?.description || 'Razorpay did not accept the request. Try again.');
    return data;
};

/** Paid already, according to Razorpay, for an order made earlier: its payment id, or null. */
const paidOnRazorpay = async (orderId) => {
    const list = await razorpay(`/orders/${orderId}/payments`).catch(() => null);
    return list?.items?.find((p) => p.status === 'captured' || p.status === 'authorized')?.id || null;
};

/**
 * Start paying: a Razorpay order for this student and competition (or the
 * open one again). Returns what Razorpay Checkout needs, or { paid: true }
 * when an earlier order turns out to be paid already (it is recorded).
 */
const startPayment = async ({ user, kind, competitionId, amount, title, onPaid }) => {
    const { id } = keys();
    // Razorpay not set up yet: a test payment, recorded the same way.
    if (!id || !keys().secret) {
        const order = await EntryPayment.create({ userId: user._id, kind, competitionId, amount, mode: 'test', orderId: `test_order_${crypto.randomBytes(8).toString('hex')}` });
        return { paid: false, test: true, orderId: order.orderId, amount: Math.round(amount * 100), currency: 'INR', description: `Entry fee: ${title}`.slice(0, 250) };
    }
    const open = await EntryPayment.findOne({ userId: user._id, kind, competitionId, status: 'created', amount, mode: 'razorpay' }).sort({ createdAt: -1 });
    if (open) {
        const paymentId = await paidOnRazorpay(open.orderId);
        if (paymentId) {
            await markPaid(open, paymentId, onPaid);
            return { paid: true };
        }
    }
    const order = open || await EntryPayment.create({
        userId: user._id, kind, competitionId, amount,
        orderId: (await razorpay('/orders', { method: 'POST', body: { amount: Math.round(amount * 100), currency: 'INR', receipt: `${kind}-${String(competitionId).slice(-8)}-${String(user._id).slice(-8)}-${Date.now() % 1e8}`, notes: { kind, competitionId: String(competitionId), userId: String(user._id) } } })).id
    });
    return {
        paid: false, keyId: id, orderId: order.orderId, amount: Math.round(amount * 100), currency: 'INR',
        name: 'YATICORP Competitions', description: `Entry fee: ${title}`.slice(0, 250),
        prefill: { name: user.name || '', email: user.email || '', contact: user.phone || '' }
    };
};

const markPaid = async (payment, paymentId, onPaid) => {
    const saved = await EntryPayment.findOneAndUpdate({ _id: payment._id, status: 'created' }, { $set: { status: 'paid', paymentId, paidAt: new Date() } }, { returnDocument: 'after' });
    if (saved) await onPaid(saved);
};

/** The browser's word that it paid: checked against the signature before anything is recorded. */
const confirmPayment = async ({ user, kind, competitionId, body, onPaid }) => {
    const orderId = String(body?.razorpay_order_id || '');
    const paymentId = String(body?.razorpay_payment_id || '');
    const signature = String(body?.razorpay_signature || '');
    const payment = await EntryPayment.findOne({ orderId, userId: user._id, kind, competitionId });
    if (!payment) throw fail(404, 'That payment is not known here.');
    if (payment.status === 'paid') return { paid: true };
    // A test payment: accepted only while Razorpay is still not set up.
    if (payment.mode === 'test') {
        if (keys().id && keys().secret) throw fail(409, 'Online payment is set up now: pay again to pay through Razorpay.');
        await markPaid(payment, paymentId || `test_pay_${crypto.randomBytes(6).toString('hex')}`, onPaid);
        return { paid: true, test: true };
    }
    const expected = crypto.createHmac('sha256', keys().secret).update(`${orderId}|${paymentId}`).digest('hex');
    const ok = signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!ok) throw fail(400, 'The payment could not be verified. If money was taken, it will be checked and recorded.');
    await markPaid(payment, paymentId, onPaid);
    return { paid: true };
};

/**
 * The fee this player still owes in this competition (0: none, or paid):
 * only once their team is approved.
 */
const owedBy = async (competitionId, userId) => {
    if (!competitionId) return 0;
    const Competition = require('../models/Competition');
    const Team = require('../models/Team');
    const c = await Competition.findById(competitionId).select('entryFee').lean();
    const amount = due(c);
    if (!amount) return 0;
    const team = await Team.findOne({ competitionId, status: 'approved', 'players.userId': userId }).select('players').lean();
    const me = team?.players.find((p) => String(p.userId) === String(userId));
    return me && !me.paidAt ? amount : 0;
};

module.exports = { due, owedBy, startPayment, confirmPayment, setFetch, EntryPayment };
