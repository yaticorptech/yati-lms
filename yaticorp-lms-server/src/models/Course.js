/**
 * @author Preethesh Kulal
 * @description Mongoose schema for LMS courses.
 *
 * A course with no `organizationId` is a platform course, written by the
 * platform's own administrators. One with an `organizationId` belongs to that
 * organization: its administrator writes it, and only its own students can
 * see, enroll in or open it.
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
    },
    /**
     * What the course costs in wallet points, as an alternative to the rupee
     * price. Zero means it is not offered for points at all — the same meaning
     * zero has for `price`.
     */
    pricePoints: {
        type: Number,
        default: 0,
        min: [0, 'A course cannot cost a negative number of points']
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null,
        index: true
    },
    /**
     * A private course (2026-11-12, user: "private courses … admin can add courses to particular students … displayed to
     * those students only, in Available Courses"): a platform course seen only by the students in `privateTo`
     * (services/courseAccess.js). Set on the admin's Private courses page.
     */
    isPrivate: {
        type: Boolean,
        default: false
    },
    privateTo: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        default: [],
        index: true
    }
}, { timestamps: true });

// Who a private course is given to is the admin's to know, never sent to a student with the course: a course read as
// JSON or turned into a plain object (every student response) goes without it. Admin pages read it with lean().
const hideStudents = (_doc, ret) => { delete ret.privateTo; return ret; };
courseSchema.set('toJSON', { transform: hideStudents });
courseSchema.set('toObject', { transform: hideStudents });

module.exports = mongoose.model('Course', courseSchema);
