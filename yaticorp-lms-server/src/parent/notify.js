/**
 * A student is told when a parent adds them (2026-11-19): the link needs only the card number, so the student
 * always knows who can see their activity. In their notifications, never a popup that interrupts.
 */
const tellChild = async (child, parentName) => {
    const { notify } = require('../rewards/services/notify');
    const who = String(parentName || 'A parent').trim();
    await notify(child._id, 'A parent added you', `${who} added you on the YATICORPX3 parent dashboard. They can now see your learning activity.`, '/profile', 'system');
};

module.exports = { tellChild };
