/**
 * Who may turn points into money. Younger accounts keep XP, badges and
 * points; adults, professionals and instructors (by default) may redeem and
 * withdraw. An admin can override a single account either way.
 */
const monetaryEnabledFor = (user, config) => {
  if (!config || !config.enabled) return false;
  if (!user) return false;
  if (user.walletAccess === 'enabled') return true;
  if (user.walletAccess === 'disabled') return false;
  const allowed = (config.walletAccess && config.walletAccess.allowedAccountTypes) || [];
  return allowed.includes(user.accountType || 'school_student');
};

// What reward points are worth in money: nothing. Only XP pays into the
// wallet (walletService.convertXp); points are a score. Kept as a function so
// the celebrations that report a "value" all say the same thing.
// eslint-disable-next-line no-unused-vars
const pointsToMoney = (points, config) => 0;

module.exports = { monetaryEnabledFor, pointsToMoney };
