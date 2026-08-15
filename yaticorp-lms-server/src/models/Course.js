/**
 * @author Preethesh Kulal
 * @description Mongoose schema for LMS courses scoped by organization
 */
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
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
    isPublished: {
        type: Boolean,
        default: false
    },
    instructor: {
        type: String,
        default: 'YATICORP'
    },
    price: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
