/**
 * @author Preethesh Kulal
 * @description Support ticket creation, status updates and admin messaging
 */
const Ticket = require('../models/Ticket');
const { sendEmail } = require('../utils/emailService');

// @desc    Create a support ticket (public)
// @route   POST /api/tickets
// @access  Public
const createTicket = async (req, res) => {
    try {
        const { name, email, cardNumber, subject, message, page } = req.body;
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ message: 'Name, email, subject and message are required.' });
        }

        const ticket = await Ticket.create({ name, email, cardNumber, subject, message, page });

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

        res.status(201).json({ message: 'Your support request has been submitted successfully.' });
    } catch (error) {
        console.error('Create Ticket Error:', error);
        res.status(500).json({ message: 'Failed to submit support request. Please try again.' });
    }
};

// @desc    Get all tickets
const getTickets = async (req, res) => {
    try {
        const { status } = req.query;
        const query = {};
        if (status) query.status = status;
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
const getMyTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({ cardNumber: req.user.cardNumber }).sort('-createdAt');
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};



// 🔥 NEW FEATURE (ADMIN SEND MESSAGE)

// @desc    Admin send message to user
// @route   POST /api/tickets/admin/:id/message
// @access  Admin
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

        await sendEmail({
            to: ticket.email,
            toName: ticket.name,
            subject: `Reply to your support ticket — ${ticket.subject}`,
            htmlContent: `
                <div style="font-family: sans-serif; padding: 24px;">
                    <h2>Message from Support Team</h2>
                    <p>Hi ${ticket.name},</p>
                    <p>${message}</p>
                    <p style="font-size:12px;color:gray;">YATICORP LMS</p>
                </div>
            `
        });

        res.json({ message: 'Message sent successfully' });

    } catch (error) {
        console.error('Send Admin Message Error:', error);
        res.status(500).json({ message: 'Failed to send message' });
    }
};


// ✅ EXPORT ALL
module.exports = {
    createTicket,
    getTickets,
    updateTicketStatus,
    getMyTickets,
    sendAdminMessage
};