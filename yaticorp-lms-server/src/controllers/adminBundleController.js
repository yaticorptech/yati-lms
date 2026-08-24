/**
 * @author Preethesh Kulal
 * @description CRUD operations for course bundles scoped to admin's organization
 */
const Bundle = require('../models/Bundle');
const { uploadToBunny } = require('../utils/bunnyStorage');

// @desc    Get all bundles
// @route   GET /api/admin/bundles
// @access  Private/Admin
const getBundles = async (req, res) => {
    try {
        const bundles = await Bundle.find({}).populate('courses', 'title thumbnail');
        res.json(bundles);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get bundle by ID
// @route   GET /api/admin/bundles/:id
// @access  Private/Admin
const getBundleById = async (req, res) => {
    try {
        const bundle = await Bundle.findById(req.params.id).populate('courses', 'title thumbnail');
        if (!bundle) return res.status(404).json({ message: 'Bundle not found' });
        res.json(bundle);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Create a bundle
// @route   POST /api/admin/bundles
// @access  Private/Admin
const createBundle = async (req, res) => {
    try {
        const { title, description, thumbnail, courses, isPublished, isVisible } = req.body;

        // ✅ 1. Title is required
        if (!title || title.trim() === '') {
            return res.status(400).json({ message: 'Bundle title is required' });
        }

        // ✅ 2. Description is mandatory
        if (!description || description.trim() === '') {
            return res.status(400).json({ message: 'Bundle description is required' });
        }

        // ✅ 3. Duplicate name check (case-insensitive)
        const existing = await Bundle.findOne({ title: { $regex: `^${title.trim()}$`, $options: 'i' } });
        if (existing) {
            return res.status(400).json({ message: `A bundle named "${title.trim()}" already exists. Please use a different name.` });
        }

        // ✅ 4. Publish / Visible only allowed if more than 1 course
        const courseList = Array.isArray(courses) ? courses : [];
        const safeIsPublished = courseList.length > 1 ? isPublished : false;
        const safeIsVisible   = courseList.length > 1 ? isVisible   : false;

        const bundle = await Bundle.create({
            title: title.trim(),
            description: description.trim(),
            thumbnail,
            courses: courseList,
            isPublished: safeIsPublished,
            isVisible: safeIsVisible
        });

        res.status(201).json(bundle);

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


// @desc    Update a bundle
// @route   PUT /api/admin/bundles/:id
// @access  Private/Admin
const updateBundle = async (req, res) => {
    try {
        const { title, description, courses, isPublished, isVisible } = req.body;

        // ✅ 1. Description is mandatory on update too
        if (description !== undefined && description.trim() === '') {
            return res.status(400).json({ message: 'Bundle description is required' });
        }

        // ✅ 2. Duplicate name check on update (exclude current bundle)
        if (title) {
            const existing = await Bundle.findOne({
                title: { $regex: `^${title.trim()}$`, $options: 'i' },
                _id: { $ne: req.params.id }
            });
            if (existing) {
                return res.status(400).json({ message: `A bundle named "${title.trim()}" already exists. Please use a different name.` });
            }
        }

        // ✅ 3. Publish / Visible only allowed if more than 1 course
        if (courses !== undefined) {
            const courseList = Array.isArray(courses) ? courses : [];
            if (courseList.length <= 1) {
                req.body.isPublished = false;
                req.body.isVisible   = false;
            }
        }

        const bundle = await Bundle.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!bundle) return res.status(404).json({ message: 'Bundle not found' });
        res.json(bundle);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete a bundle
// @route   DELETE /api/admin/bundles/:id
// @access  Private/Admin
const deleteBundle = async (req, res) => {
    try {
        const bundle = await Bundle.findById(req.params.id);
        if (!bundle) return res.status(404).json({ message: 'Bundle not found' });

        const Enrollment = require('../models/Enrollment');

        // Cascade: remove all enrollments for this bundle
        await Enrollment.deleteMany({ type: 'Bundle', bundleId: bundle._id.toString() });

        await bundle.deleteOne();
        res.json({ message: 'Bundle and all related enrollments removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Upload a bundle thumbnail → Bunny Storage → return CDN URL
// @route   POST /api/admin/bundles/thumbnail
// @access  Private/Admin
const uploadThumbnail = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }
        // Its own folder rather than course-thumbnails: the two are managed
        // separately, and a shared folder makes it impossible to tell later
        // which images are still referenced by what.
        const url = await uploadToBunny(req.file.buffer, req.file.originalname, 'bundle-thumbnails');
        res.json({ url });
    } catch (error) {
        console.error('Bundle thumbnail upload error:', error);
        res.status(500).json({ message: 'Thumbnail upload failed', error: error.message });
    }
};

module.exports = {
    getBundles, getBundleById, createBundle, updateBundle, deleteBundle, uploadThumbnail
};