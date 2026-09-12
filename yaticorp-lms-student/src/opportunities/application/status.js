/** Which status badge a state deserves, so every screen agrees on the colour. */
export const toneFor = (status) => ({
    'awaiting-guardian': 'waiting',
    'awaiting-admin': 'waiting',
    approved: 'approved',
    continued: 'approved',
    declined: 'declined',
    rejected: 'declined'
}[status] || 'neutral');

/**
 * The words beside the dot, for the same reason.
 *
 * Two different people can be the one being waited on, and two different
 * people can say no, so each state names who — a student chasing the wrong
 * one is the whole cost of getting this wrong.
 */
export const statusLabel = (status) => ({
    'needs-guardian': 'Guardian permission needed',
    'awaiting-guardian': 'Waiting for parent response',
    'awaiting-admin': 'Parent approved — waiting for admin',
    approved: 'Approved',
    declined: 'Declined by parent',
    rejected: 'Not approved by admin',
    ready: 'Ready to continue',
    continued: 'Application in progress'
}[status] || 'Not started');
