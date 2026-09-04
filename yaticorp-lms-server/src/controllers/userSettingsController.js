/**
 * @author Preethesh Kulal
 * @description Retrieves platform settings visible to students
 */
const Setting = require('../models/Setting');

// @desc    Get global platform settings mapped for the student view
// @route   GET /api/user/settings
// @access  Private/User
const getUserSettings = async (req, res) => {
    try {
        let settings = await Setting.findOne();
        if (!settings) {
            settings = await Setting.create({});
        }

        // Return only the settings safe/relevant for students
        res.json({
            isCreditSystemEnabled: settings.isCreditSystemEnabled,
            isCareerPathEnabled: settings.isCareerPathEnabled,
            isJobsEnabled: settings.isJobsEnabled,
            isRewardsEnabled: settings.isRewardsEnabled !== false
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching settings', error: error.message });
    }
};

module.exports = {
    getUserSettings
};
