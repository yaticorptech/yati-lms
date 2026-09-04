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

const pointsToMoney = (points, config) => {
  const { pointsPerUnit = 100, unitValue = 10 } = config.conversion || {};
  return Math.round(((points / pointsPerUnit) * unitValue) * 100) / 100;
};

module.exports = { monetaryEnabledFor, pointsToMoney };
