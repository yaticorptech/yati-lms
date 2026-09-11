/** Which status badge a state deserves, so every screen agrees on the colour. */
export const toneFor = (status) => ({
    'awaiting-guardian': 'waiting',
    approved: 'approved',
    continued: 'approved',
    declined: 'declined'
}[status] || 'neutral');

/** The words beside the dot, for the same reason. */
export const statusLabel = (status) => ({
    'needs-guardian': 'Guardian permission needed',
    'awaiting-guardian': 'Waiting for guardian response',
    approved: 'Approved',
    declined: 'Declined',
    ready: 'Ready to continue',
    continued: 'Application in progress'
}[status] || 'Not started');
