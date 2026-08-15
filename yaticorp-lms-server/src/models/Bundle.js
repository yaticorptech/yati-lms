/**
 * @author Preethesh Kulal
 * @description Mongoose schema for course bundles (grouped courses) scoped by organization
 */
const mongoose = require('mongoose');

const bundleSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => Math.floor(10000 + Math.random() * 90000).toString()
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    thumbnail: {
        type: String
    },
    courses: [{
        type: String,
        ref: 'Course'
    }],
    isPublished: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Bundle', bundleSchema);
