/**
 * XP for the optional rules an admin adds under Reward rules (a forum post, a
 * resume upload, a part-time application, a scholarship search). Paid only
 * after the route has answered successfully, and only while the rule exists:
 * with no rule, nothing is recorded at all — not even toward the streak.
 *
 * `ref(req)` names what is being rewarded, and the activity ledger pays each
 * ref once: `post:<day>` pays once a day however many posts, `resume` once
 * ever. That is what keeps a forum from becoming an XP farm.
 */
const { getConfig } = require('./configService');
const { safeRecordActivity } = require('./activityService');
const { dayKey } = require('../config/constants');

const xpOnSuccess = (type, ref) => (req, res, next) => {
  res.on('finish', async () => {
    try {
      if (res.statusCode >= 400 || !req.user?._id) return;
      // A ref of null means "this request is not the rewarded thing".
      const refId = ref(req);
      if (refId === null || refId === undefined || refId === '') return;
      const config = await getConfig();
      if (config.enabled === false || !(Number(config.xpRules?.[type]) > 0)) return;
      await safeRecordActivity({ userId: req.user._id, type, refId: String(refId) });
    } catch (e) { console.error(`[rewards] ${type} XP failed:`, e.message); }
  });
  next();
};

const today = () => dayKey();

module.exports = { xpOnSuccess, today };
