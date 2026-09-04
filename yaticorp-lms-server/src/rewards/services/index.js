module.exports = {
  config: require('./configService'),
  xp: require('./xpService'),
  streak: require('./streakService'),
  points: require('./rewardPointsService'),
  wallet: require('./walletService'),
  badges: require('./badgeService'),
  activity: require('./activityService'),
  leaderboard: require('./leaderboardService'),
  eligibility: require('./eligibility'),
  jobs: require('./jobs'),
  notify: require('./notify')
};
