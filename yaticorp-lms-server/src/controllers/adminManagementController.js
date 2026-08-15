/**
 * @author Preethesh Kulal
 * @description Superadmin management of other admin accounts
 */
const Admin = require('../models/Admin');
const { validatePasswordStrength } = require('../middleware/validatePassword');

// @desc    Get all admins
// @route   GET /api/admin/admins
// @access  Private/SuperAdmin
const getAdmins = async (req, res) => {
    try {
        const admins = await Admin.find({}).select('-password');
        res.json(admins);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const addAdmin = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const pwError = validatePasswordStrength(password);
        if (pwError) return res.status(400).json({ message: pwError });

        const adminExists = await Admin.findOne({ email });
        if (adminExists) return res.status(400).json({ message: 'Admin already exists' });

        const admin = await Admin.create({
            name, email, password,
            role: role || 'admin'
        });

        res.status(201).json({ _id: admin._id, name: admin.name, email: admin.email, role: admin.role });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const deleteAdmin = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });
        if (admin.role === 'superadmin') return res.status(400).json({ message: 'Cannot delete a superadmin' });
        await Admin.findByIdAndDelete(req.params.id);
        res.json({ message: 'Admin removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateAdmin = async (req, res) => {
    try {
        const { name, email, role, password } = req.body;
        const admin = await Admin.findById(req.params.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        if (password) {
            const pwError = validatePasswordStrength(password);
            if (pwError) return res.status(400).json({ message: pwError });
            admin.password = password;
        }

        admin.name = name || admin.name;
        admin.email = email || admin.email;
        admin.role = role || admin.role;

        const updated = await admin.save();
        res.json({ _id: updated._id, name: updated.name, email: updated.email, role: updated.role });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = { getAdmins, addAdmin, deleteAdmin, updateAdmin };
