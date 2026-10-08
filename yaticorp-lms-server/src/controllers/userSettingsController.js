/**
 * @author Preethesh Kulal
 * @description Retrieves platform settings visible to students
 */
const Setting = require('../models/Setting');
const { hasFullAccess } = require('../services/fullAccess');

// @desc    Get global platform settings mapped for the student view
// @route   GET /api/user/settings
// @access  Private/User
const getUserSettings = async (req, res) => {
    try {
        let settings = await Setting.findOne();
        if (!settings) {
            settings = await Setting.create({});
        }

        // The demo cards see every section, whatever is switched off for
        // everyone else (services/fullAccess.js). Rewards is the points engine
        // itself rather than a section, so it follows the site-wide switch.
        const all = hasFullAccess(req.user);
        // Return only the settings safe/relevant for students
        res.json({
            isCreditSystemEnabled: all || settings.isCreditSystemEnabled,
            isCareerPathEnabled: all || settings.isCareerPathEnabled,
            isJobsEnabled: all || settings.isJobsEnabled,
            isRewardsEnabled: settings.isRewardsEnabled !== false,
            isGlobalQuizEnabled: all || settings.globalQuiz?.enabled !== false
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching settings', error: error.message });
    }
};

module.exports = {
    getUserSettings
};
