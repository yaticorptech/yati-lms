/**
 * Loads the SSS list of 360 activities into one organization (2026-10-31):
 * ten categories, each activity "up to 10 marks" — the organization changes
 * the marks, adds or deletes activities on its Teachers → Activities page.
 * "Unstructured Earn While Learn — individual activities" is 1 point per proof.
 *
 *   node scripts/seed360Activities.js ORG-2026-0015            # what it would do
 *   node scripts/seed360Activities.js ORG-2026-0015 --apply    # load it
 *
 * Replaces that organization's list only if it has none yet (--force to replace).
 * Uses MONGO_URI from .env.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const LIST = [
    ['Academic Excellence', ['Handwritten Assignments', 'Presentations', 'Semester Examination Marks', 'Research Projects (Bonus)', 'Paper Presentation and Research Articles']],
    ['Campus Involvement', ['Shikshamitra News', 'EPS', 'Boot Camp', 'NSS Annual Camp', 'Participation in NSS Activities', 'Student Forum', 'Volunteering in Events', 'Rangers and Rovers', 'Participation in 5 Swastika Events', 'Admission Reference', 'Attendance', 'Mentor and Mentee Meetings', "Parents' Involvement", 'Paying Full Fees']],
    ['Skill Enhancement', ['Online Training', 'Offline Training', 'Weekly Series', 'Swastika Workshops', 'Marketing Skills', 'Online Certificate Courses', 'Offline Certificate Courses', 'Designing and Video Creation Courses', 'Managerial Skills (Second Year)']],
    ['Earn While Learn', ['Structured Earn While Learn', ['Unstructured Earn While Learn — Individual activities', 'each', 1], 'Short-Term Projects']],
    ['Student Entrepreneurship', ['Startup Activities', 'Attending BNI Meets and Expos', 'Udyamashala Meetings, Sessions and Trainings', 'Certification of Business Aspects', 'Lucky Coupon']],
    ['Digital Proficiency', ['Diploma in Computer Applications', 'Diploma in KSOU', 'Certificate Courses in Excel', 'Certificate in Aviation', 'Advanced Excel', 'Certificate Courses in Tally', 'Advanced Tally', 'Certificate Courses in Logistics', 'Certificate Courses in AI', 'Bus Apps', 'Personal Laptop']],
    ['Talent and Cultural Enrichment', ['Sports Activities', 'Dance, Singing and Cultural Activities', 'Yakshagana and Drama', 'Inter-collegiate Participation', 'Inter-collegiate Prize and Awards']],
    ['Internship and Educational Visits', ['Industrial Visits', 'Social Agency Visits', 'Non-Paid Internships', 'Research Projects (Bonus)']],
    ['Institutional Social Responsibility', ['Membership in Other Public Organizations', 'Blood Donation', 'Organ Donation Commitment', 'Community Outreach Programs', 'Green Revolution Activities', 'Sustainable Development Goals (SDG)']],
    ['Personal Growth', ['Skill Club Participation', 'Preparing Biodata and Profile File', 'Building LinkedIn Profile', 'Viva and Debate', 'Attending Spoken English Classes', 'Savings', 'Investment', 'Attending Job Fairs (Final Year)', 'Mock Interviews (Final Year)']]
];

const groups = LIST.map(([name, items]) => ({
    name,
    activities: items.map((it) => (Array.isArray(it) ? { name: it[0], mode: it[1], marks: it[2] } : { name: it, mode: 'max', marks: 10 }))
}));

(async () => {
    const [orgCode] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
    const apply = process.argv.includes('--apply');
    const force = process.argv.includes('--force');
    if (!orgCode) { console.log('Give the Organization ID, e.g. ORG-2026-0015.'); process.exit(1); }
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const Organization = require('../src/organizations/models/Organization');
    const { cleanGroups } = require('../src/three60/activities');
    const org = await Organization.findOne({ orgCode });
    if (!org) { console.log(`No organization ${orgCode}.`); process.exit(1); }
    const { groups: clean, error } = cleanGroups(groups);
    if (error) { console.log('The list is not valid:', error.message); process.exit(1); }
    const has = (org.three60?.activityGroups || []).length;
    const count = clean.reduce((n, g) => n + g.activities.length, 0);
    console.log(`${org.name} (${orgCode}): ${clean.length} categories, ${count} activities.${has ? ` It already has ${has} categories.` : ''}`);
    if (has && !force) { console.log('Left as it is (use --force to replace).'); await mongoose.disconnect(); return; }
    if (!apply) { console.log('Nothing written (run with --apply).'); await mongoose.disconnect(); return; }
    org.set('three60.activityGroups', clean);
    await org.save();
    console.log('Loaded.');
    await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
