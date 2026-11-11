/**
 * @author Preethesh Kulal
 * @description Support ticket creation, status updates and admin messaging
 */
const Ticket = require('../models/Ticket');
const { sendEmail } = require('../utils/emailService');
const { findUserByCardNumber } = require('../utils/cardNumber');

// @desc    Create a support ticket (public)
// @route   POST /api/tickets
// @access  Public
const createTicket = async (req, res) => {
    try {
        const { name, cardNumber, subject, message, page } = req.body;
        let { email } = req.body;
        if (![name, cardNumber, subject, message].every(v => typeof v === 'string' && v.trim())) {
            return res.status(400).json({ message: 'Name, email, card number, subject and message are required.' });
        }
        // Left blank, the email is the card's account's: the form only shows
        // it partly hidden, so the student cannot type it back in themselves.
        if (!(typeof email === 'string' && email.trim())) {
            const owner = await findUserByCardNumber(cardNumber).catch(() => null);
            email = owner?.email || '';
            if (!email) return res.status(400).json({ message: 'Enter your email so we can reply.' });
        }
        // Only an in-app address is kept; anything else is dropped rather
        // than refusing the ticket over it.
        const path = typeof req.body.path === 'string' && /^\/(?!\/)/.test(req.body.path) ? req.body.path.slice(0, 300) : undefined;

        // Always a student's: teachers and organizations write in from their own
        // routes (teacher/index.js, organizations/index.js), which set `from`.
        const ticket = await Ticket.create({ name, email, cardNumber, subject, message, page, path, from: 'student' });

        // Email the admin
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
            await sendEmail({
                to: adminEmail,
                toName: 'YATICORP Admin',
                subject: `[Support Ticket #${ticket._id}] ${subject}`,
                htmlContent: `...same as your code...`
            }).catch(e => console.error('Failed to email admin:', e.message));
        }

        // Acknowledge email to user
        try {
            await sendEmail({
                to: email,
                toName: name,
                subject: 'We received your support request',
                htmlContent: `...same as your code...`
            });
        } catch (e) {}

        res.status(201).json({ message: 'Your support request has been submitted successfully.', ticketId: ticket._id });
    } catch (error) {
        console.error('Create Ticket Error:', error);
        res.status(500).json({ message: 'Failed to submit support request. Please try again.' });
    }
};

// @desc    Get all tickets
const getTickets = async (req, res) => {
    try {
        const { status, from } = req.query;
        const query = {};
        if (status) query.status = status;
        if (['student', 'teacher', 'organization'].includes(from)) query.from = from === 'student' ? { $in: ['student', null] } : from;
        const tickets = await Ticket.find(query).sort('-createdAt');
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update ticket status
const updateTicketStatus = async (req, res) => {
    try {
        const { status, adminNotes } = req.body;

        const ticket = await Ticket.findByIdAndUpdate(
            req.params.id,
            { status, adminNotes },
            { new: true }
        );

        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        sendEmail({
            to: ticket.email,
            toName: ticket.name,
            subject: `Your support request has been updated`,
            htmlContent: `...same as your code...`
        }).catch(e => console.error('Email error:', e.message));

        res.json(ticket);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get user's tickets
/** A ticket as its sender sees it: no admin notes (those are the team's own). */
const ticketRef = (id) => String(id).slice(-6).toUpperCase();
const ticketView = (t) => ({
    _id: t._id, ref: ticketRef(t._id), subject: t.subject, message: t.message, status: t.status,
    createdAt: t.createdAt, updatedAt: t.updatedAt, reopened: t.reopened || 0,
    thread: (t.thread || []).map((m) => ({ by: m.by, text: m.text, at: m.at }))
});

/** The sender's own tickets, newest first: `filterOf(req)` says whose. */
const listTickets = (filterOf) => async (req, res) => {
    try {
        const tickets = await Ticket.find(filterOf(req)).sort('-createdAt').limit(50).lean();
        res.json({ tickets: tickets.map(ticketView) });
    } catch (error) {
        res.status(500).json({ message: 'Could not load your requests just now.' });
    }
};

/**
 * { message }: not resolved after all — the same ticket, opened again, with the
 * new message in its thread. Only a resolved ticket of the sender's own.
 */
const reopenTicket = (filterOf) => async (req, res) => {
    try {
        const text = String(req.body?.message || '').trim().slice(0, 5000);
        if (text.length < 5) return res.status(400).json({ message: 'Say what is still not working.' });
        if (!require('mongoose').isValidObjectId(req.params.id)) return res.status(404).json({ message: 'That request was not found.' });
        const ticket = await Ticket.findOne({ _id: req.params.id, ...filterOf(req) });
        if (!ticket) return res.status(404).json({ message: 'That request was not found.' });
        if (ticket.status !== 'resolved') return res.status(400).json({ message: 'This request is still open: we are on it.' });
        ticket.thread.push({ by: 'user', text, at: new Date() });
        ticket.status = 'open';
        ticket.reopened = (ticket.reopened || 0) + 1;
        await ticket.save();
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
            sendEmail({
                to: adminEmail, toName: 'YATICORP Admin',
                subject: `[Support Ticket #${ticketRef(ticket._id)} reopened] ${ticket.subject}`,
                htmlContent: `<div style="font-family:sans-serif;padding:24px"><p><strong>${escapeHtml(ticket.name || '')}</strong> says the request is not resolved:</p><p>${escapeHtml(text)}</p></div>`
            }).catch((e) => console.error('Failed to email admin:', e.message));
        }
        res.json({ ticket: ticketView(ticket) });
    } catch (error) {
        console.error('Reopen Ticket Error:', error.message);
        res.status(500).json({ message: 'Could not send it just now. Please try again.' });
    }
};

// A student's: the tickets sent with their card (not an organization's or a teacher's).
const studentFilter = (req) => ({ cardNumber: String(req.user.cardNumber), from: { $nin: ['organization', 'teacher'] } });
const getMyTickets = listTickets(studentFilter);
const reopenMyTicket = reopenTicket(studentFilter);



// 🔥 NEW FEATURE (ADMIN SEND MESSAGE)

// @desc    Admin send message to user
// @route   POST /api/tickets/admin/:id/message
// @access  Admin
// The admin's words go into HTML: escaped, with line breaks kept.
const escapeHtml = (text) => String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');

/** Why an email was refused, in words an admin can act on. */
const emailFailure = (error) => {
    const detail = error?.response?.body?.message || error?.response?.text || error?.message || '';
    if (/api key is not enabled|unauthori[sz]ed|key not found|invalid api key/i.test(detail)) {
        return 'Email could not be sent: the Brevo API key is not enabled. Enable it in Brevo → Settings → API Keys (or set SMTP_HOST, SMTP_USER and SMTP_PASS in the server .env).';
    }
    if (/no email provider configured|no sender email/i.test(detail)) {
        return `Email could not be sent: ${detail}`;
    }
    return detail ? `Email could not be sent: ${detail}` : 'Email could not be sent.';
};

const sendAdminMessage = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        const ticket = await Ticket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Kept in the ticket's thread too, so the sender sees the reply in their request history.
        ticket.thread.push({ by: 'admin', text: String(message).slice(0, 5000), at: new Date() });
        await ticket.save();

        await sendEmail({
            to: ticket.email,
            toName: ticket.name,
            subject: `Reply to your support ticket — ${ticket.subject}`,
            htmlContent: `
                <div style="font-family: sans-serif; padding: 24px;">
                    <h2>Message from Support Team</h2>
                    <p>Hi ${escapeHtml(ticket.name || '')},</p>
                    <p>${escapeHtml(message)}</p>
                    <p style="font-size:12px;color:gray;">YATICORP LMS</p>
                </div>
            `
        });

        res.json({ message: 'Message sent successfully' });

    } catch (error) {
        console.error('Send Admin Message Error:', error?.response?.body || error.message);
        // Say why: "Failed to send message" left the admin nothing to fix.
        res.status(502).json({ message: emailFailure(error) });
    }
};


// ✅ EXPORT ALL
module.exports = {
    listTickets,
    reopenTicket,
    reopenMyTicket,
    createTicket,
    getTickets,
    updateTicketStatus,
    getMyTickets,
    sendAdminMessage
};