/**
 * @author Preethesh Kulal
 * @description Manages organization-level platform settings
 */
const Setting = require('../models/Setting');

// @desc    Get admin platform settings
// @route   GET /api/admin/settings
// @access  Private/Admin
const getSettings = async (req, res) => {
    try {
        let settings = await Setting.findOne();
        if (!settings) {
            settings = await Setting.create({});
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching settings', error: error.message });
    }
};

// @desc    Update admin platform settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
const updateSettings = async (req, res) => {
    try {
        const { isCreditSystemEnabled, isCareerPathEnabled, isJobsEnabled } = req.body;

        let settings = await Setting.findOne();
        if (!settings) {
            settings = new Setting();
        }

        if (isCreditSystemEnabled !== undefined) {
            settings.isCreditSystemEnabled = isCreditSystemEnabled;
        }

        if (isCareerPathEnabled !== undefined) {
            settings.isCareerPathEnabled = isCareerPathEnabled;
        }

        if (isJobsEnabled !== undefined) {
            settings.isJobsEnabled = isJobsEnabled;
        }

        await settings.save();
        // Both gates cache this to keep a database read off every request, so a
        // lock has to reach them immediately rather than 30s later.
        require('../career/middleware/featureGate').invalidateCareerSetting();
        require('../jobboard/middleware/featureGate').invalidateJobsSetting();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Server error updating settings', error: error.message });
    }
};

module.exports = {
    getSettings,
    updateSettings
};
