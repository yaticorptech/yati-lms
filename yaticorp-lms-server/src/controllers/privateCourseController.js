/**
 * Private courses (2026-11-12, user: "in courses add another section like private courses … admin can add courses to
 * particular students … displayed to those students only … in Available Courses in the student dashboard").
 *
 * A platform course made private is seen only by the students it is given to (Course.isPrivate / privateTo, the rule
 * in services/courseAccess.js): in their Available Courses, its page and its lessons once enrolled. Everyone else never
 * sees it. Made public again, it is every student's, as before. Organizations' own courses are theirs already, so
 * only platform courses are offered here.
 */
const mongoose = require('mongoose');
const Course = require('../models/Course');
const User = require('../models/User');
require('../organizations/models/Organization'); // for each student's organization name

/** GET /api/admin/private-courses — the platform courses (private ones with their students) and the students to choose from. */
const listPrivateCourses = async (req, res) => {
    try {
        const courses = await Course.find({ organizationId: null }).select('title thumbnail isPublished isPrivate privateTo createdAt').sort('-createdAt').lean();
        const students = await User.find({})
            .select('name email cardNumber organizationId profilePicture').populate('organizationId', 'name').sort('name').lean();
        res.json({
            courses: courses.map((c) => ({
                _id: c._id, title: c.title, thumbnail: c.thumbnail || '', isPublished: !!c.isPublished, isPrivate: !!c.isPrivate,
                studentIds: (c.privateTo || []).map(String)
            })),
            students: students.map((u) => ({
                _id: String(u._id), name: u.name || '', email: u.email || '', cardNumber: u.cardNumber || '',
                organization: u.organizationId?.name || '', profilePicture: u.profilePicture || ''
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Could not load the private courses.', error: error.message });
    }
};

/**
 * PUT /api/admin/private-courses/:id — { isPrivate, studentIds }: a platform course made private for these students
 * (the list replaces the one before), or public again (isPrivate false; the list is kept empty).
 */
const setPrivateCourse = async (req, res) => {
    try {
        const { isPrivate, studentIds } = req.body || {};
        const course = await Course.findById(String(req.params.id)).select('organizationId').lean();
        if (!course) return res.status(404).json({ message: 'Course not found' });
        if (course.organizationId) return res.status(400).json({ message: 'An organization\'s course is for its own students already; only platform courses can be made private.' });
        if (!isPrivate) {
            await Course.updateOne({ _id: course._id }, { $set: { isPrivate: false, privateTo: [] } });
            return res.json({ _id: course._id, isPrivate: false, studentIds: [] });
        }
        const chosen = await studentsOf(studentIds);
        if (chosen.error) return res.status(400).json({ message: chosen.error });
        const ids = chosen.ids;
        await Course.updateOne({ _id: course._id }, { $set: { isPrivate: true, privateTo: ids } });
        res.json({ _id: course._id, isPrivate: true, studentIds: ids });
    } catch (error) {
        res.status(500).json({ message: 'Could not save the private course.', error: error.message });
    }
};

/** The chosen students, checked: { ids } or { error } (a 400's message). */
const studentsOf = async (studentIds) => {
    const ids = [...new Set((Array.isArray(studentIds) ? studentIds : []).map(String))];
    if (!ids.length) return { error: 'Choose at least one student for a private course.' };
    if (ids.some((id) => !mongoose.isValidObjectId(id))) return { error: 'One of the students chosen is not valid.' };
    const found = await User.countDocuments({ _id: { $in: ids } });
    if (found !== ids.length) return { error: 'One of the students chosen no longer exists. Refresh the page and choose again.' };
    return { ids };
};

/**
 * POST /api/admin/private-courses — { title, description, price, studentIds }: a new platform course, private to these
 * students from its first moment (2026-11-12, user: "admin will create the course and publish it, only for some users it
 * will be available"). A draft: its lessons are added in the course editor, then it is published there — to them only.
 */
const createPrivateCourse = async (req, res) => {
    try {
        const { title, description, price, studentIds } = req.body || {};
        const name = String(title || '').trim();
        if (!name) return res.status(400).json({ message: 'Give the course a title.' });
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (await Course.exists({ organizationId: null, title: new RegExp(`^${escaped}$`, 'i') })) return res.status(400).json({ message: 'A course with this title already exists.' });
        const amount = Number(price) || 0;
        if (amount < 0) return res.status(400).json({ message: 'The price cannot be below zero.' });
        const chosen = await studentsOf(studentIds);
        if (chosen.error) return res.status(400).json({ message: chosen.error });
        const fields = { title: name, description: String(description || '').trim(), price: amount, isPublished: false, organizationId: null, isPrivate: true, privateTo: chosen.ids };
        // A course id is a random five-digit number (models/Course.js): a clash is drawn again, as createCourse does.
        let course;
        for (let attempt = 1; ; attempt += 1) {
            try { course = await Course.create(fields); break; } catch (error) {
                const idClash = error.code === 11000 && (error.keyPattern?._id || /_id_/.test(error.message));
                if (!idClash || attempt >= 5) throw error;
            }
        }
        res.status(201).json({ _id: course._id, title: course.title, isPublished: false, isPrivate: true, studentIds: chosen.ids });
    } catch (error) {
        res.status(500).json({ message: 'Could not create the course.', error: error.message });
    }
};

module.exports = { listPrivateCourses, setPrivateCourse, createPrivateCourse };
