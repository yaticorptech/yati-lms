/**
 * @description Public organization registration — the only unauthenticated
 *              write in this module.
 *
 * Registering creates two documents: a `pending` Organization and the Admin
 * account that will speak for it. The account is real and can sign in
 * immediately, but every organization route sits behind
 * requireActiveOrganization, so until a superadmin approves it the only thing
 * it can see is its own application status. Nothing is granted by registering.
 */
const Organization = require('../models/Organization');
const Admin = require('../../models/Admin');
const { createWithOrgCode } = require('../services/orgCode');
const { validatePasswordStrength } = require('../../middleware/validatePassword');
const { sendEmail } = require('../../utils/emailService');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Registration is the one place an organization's details arrive from an
 * untrusted source, so each field is checked and clipped here rather than
 * relying on schema maxlength to reject silently.
 */
const validate = ({ name, organizationType, email, phone, contactPerson, website, expectedStudents }) => {
    if (!name || String(name).trim().length < 2) return 'Enter the organization name.';
    if (String(name).trim().length > 150) return 'The organization name is too long.';
    if (!organizationType || !Organization.TYPES.includes(organizationType)) return 'Choose the kind of organization.';
    if (!email || !EMAIL_PATTERN.test(String(email).trim())) return 'Enter a valid official email address.';
    if (!contactPerson || String(contactPerson).trim().length < 2) return 'Enter the name of a contact person.';
    if (!phone || !/^[\d\s+()-]{8,20}$/.test(String(phone).trim())) return 'Enter a valid phone number.';
    if (website && String(website).trim().length > 200) return 'The website address is too long.';
    if (expectedStudents !== undefined && expectedStudents !== null && expectedStudents !== '') {
        const n = Number(expectedStudents);
        if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return 'Enter a realistic number of students, or leave it blank.';
    }
    return null;
};

/**
 * Tell the platform's administrators that something is waiting for them, and
 * confirm to the applicant that it arrived.
 *
 * Both are best-effort. Email is not configured in every deployment, and a
 * registration that succeeded must not report failure because a message could
 * not be sent — the application is in the queue either way.
 */
const notify = async (organization) => {
    const reviewUrl = `${process.env.ADMIN_URL || ''}/organizations`.replace(/\/+$/, '') || 'the admin panel';

    try {
        await sendEmail({
            to: organization.email,
            toName: organization.contactPerson || organization.name,
            subject: 'We have received your organization registration',
            htmlContent: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #4F46E5;">Registration received</h2>
                    <p>Hi <strong>${organization.contactPerson || organization.name}</strong>,</p>
                    <p>Thank you for registering <strong>${organization.name}</strong> with YATICORP LMS.
                       Our administrator will review your request and you will hear from us once a
                       decision has been made.</p>
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p style="margin: 0 0 8px 0;"><strong>Organization ID:</strong> ${organization.orgCode}</p>
                        <p style="margin: 0;"><strong>Status:</strong> Pending review</p>
                    </div>
                    <p style="color: #6b7280; font-size: 0.9em;">You can already sign in with the email and
                       password you chose, and you will see the status of this application there.</p>
                </div>`
        });
    } catch (error) {
        console.error('[organizations] could not email the applicant:', error.message);
    }

    if (process.env.ADMIN_EMAIL) {
        try {
            await sendEmail({
                to: process.env.ADMIN_EMAIL,
                toName: 'Platform Administrator',
                subject: `New organization registration: ${organization.name}`,
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                        <h2 style="color: #4F46E5;">An organization is waiting for review</h2>
                        <p><strong>${organization.name}</strong> (${organization.orgCode}) has registered
                           and is awaiting approval.</p>
                        <p>Contact: ${organization.contactPerson || '—'} &lt;${organization.email}&gt;</p>
                        <p>Review it in ${reviewUrl}.</p>
                    </div>`
            });
        } catch (error) {
            console.error('[organizations] could not email the platform administrator:', error.message);
        }
    }
};

// @desc    Register an organization and its administrator account
// @route   POST /api/organizations/register
// @access  Public
const registerOrganization = async (req, res) => {
    try {
        const {
            name, organizationType, contactPerson, email, phone,
            address, website, expectedStudents, password, confirmPassword
        } = req.body;

        const invalid = validate(req.body);
        if (invalid) return res.status(400).json({ message: invalid });

        const passwordError = validatePasswordStrength(password);
        if (passwordError) return res.status(400).json({ message: passwordError });
        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'The two passwords do not match.' });
        }

        const cleanEmail = String(email).trim().toLowerCase();

        // Both collections are checked up front so the applicant gets one clear
        // sentence rather than a duplicate-key error from whichever insert lost.
        if (await Organization.findOne({ email: cleanEmail })) {
            return res.status(400).json({ message: 'An organization is already registered with that email address.' });
        }
        if (await Admin.findOne({ email: cleanEmail })) {
            return res.status(400).json({ message: 'That email address is already in use on this platform.' });
        }

        const organization = await createWithOrgCode(String(name).trim(), (orgCode) => Organization.create({
            orgCode,
            name: String(name).trim(),
            organizationType,
            email: cleanEmail,
            phone: String(phone).trim(),
            address: address ? String(address).trim().slice(0, 400) : '',
            website: website ? String(website).trim().slice(0, 200) : '',
            contactPerson: String(contactPerson).trim().slice(0, 120),
            expectedStudents: expectedStudents === '' || expectedStudents === undefined || expectedStudents === null
                ? null
                : Number(expectedStudents),
            status: 'pending',
            statusHistory: [{ status: 'pending', reason: 'Registered through the public form', at: new Date() }]
        }));

        try {
            await Admin.create({
                name: String(contactPerson).trim().slice(0, 120),
                email: cleanEmail,
                password,
                role: 'orgadmin',
                organizationId: organization._id
            });
        } catch (error) {
            // MongoDB here is not guaranteed to be a replica set, so there is no
            // transaction to roll back. An organization with no account can never
            // be used or re-registered (its email is taken), so remove it by hand
            // rather than leaving a dead row a superadmin would have to approve.
            await Organization.deleteOne({ _id: organization._id }).catch(() => {});
            throw error;
        }

        // Deliberately not awaited: a slow mail provider should not hold the
        // applicant on a spinner after the registration is safely stored.
        notify(organization).catch(() => {});

        return res.status(201).json({
            message: 'Your organization registration has been submitted. Our administrator will review your request.',
            organization: {
                orgCode: organization.orgCode,
                name: organization.name,
                status: organization.status
            }
        });
    } catch (error) {
        console.error('[organizations] registration failed:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'That email address is already in use on this platform.' });
        }
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    The organization types the registration form offers
// @route   GET /api/organizations/types
// @access  Public
const getOrganizationTypes = (req, res) => {
    res.json({
        types: Organization.TYPES.map((value) => ({ value, label: Organization.TYPE_LABELS[value] }))
    });
};

module.exports = { registerOrganization, getOrganizationTypes };
