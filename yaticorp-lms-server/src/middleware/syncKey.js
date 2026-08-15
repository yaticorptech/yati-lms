/**
 * @author YATICORP
 * @description Shared-secret guard for the website -> LMS sync webhook
 */

/**
 * Protects the sync endpoint with a shared secret sent by the main website.
 *
 * Staged rollout: the check is only enforced once SYNC_API_KEY is configured on
 * the server. That way this can ship before the website is updated, without
 * breaking live activations. Set SYNC_API_KEY on both sides to close it.
 *
 * The caller must send the secret as `x-sync-key`.
 */
const requireSyncKey = (req, res, next) => {
    const expected = process.env.SYNC_API_KEY;

    if (!expected) {
        console.warn(
            '[sync] SYNC_API_KEY is not set — POST /api/sync/activate is accepting ' +
            'unauthenticated requests. Anyone who finds this URL can create active ' +
            'users and enrollments. Set SYNC_API_KEY here and on the calling website.'
        );
        return next();
    }

    const provided = req.get('x-sync-key');
    if (!provided || provided !== expected) {
        return res.status(401).json({ message: 'Invalid or missing sync key.' });
    }

    return next();
};

module.exports = { requireSyncKey };
