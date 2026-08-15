/**
 * @author Preethesh Kulal
 * @description Scheduled job that auto-deletes resolved support tickets older than 3 days
 */
const Ticket = require('../models/Ticket');

/**
 * Deletes resolved tickets older than 3 days.
 * Call this on a schedule (e.g., every hour or daily).
 */
const cleanupResolvedTickets = async () => {
    try {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const result = await Ticket.deleteMany({
            status: 'resolved',
            updatedAt: { $lt: threeDaysAgo }
        });
        if (result.deletedCount > 0) {
            console.log(`[TicketCleanup] Deleted ${result.deletedCount} resolved ticket(s) older than 3 days.`);
        }
    } catch (err) {
        console.error('[TicketCleanup] Error:', err.message);
    }
};

module.exports = { cleanupResolvedTickets };
