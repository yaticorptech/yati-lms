/**
 * @author Preethesh Kulal
 * @description Mongoose schema for global platform settings per organization
 */
const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    isCreditSystemEnabled: {
        type: Boolean,
        default: true
    },
    // The Career Path section as a whole. Locking it hides the student tab and
    // closes the /api/career endpoints behind it; admin reporting on the
    // section keeps working, so an operator can still see what was collected.
    isCareerPathEnabled: {
        type: Boolean,
        default: true
    },
    // The Jobs section as a whole. Locking it hides the student tab and closes
    // the /api/jobs endpoints behind it; admin ingestion and reporting keep
    // working, so an operator can still maintain the index while it is shut.
    isJobsEnabled: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
