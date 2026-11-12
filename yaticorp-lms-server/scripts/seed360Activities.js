/**
 * Loads the SSS list of 360 activities into one organization (2026-10-31;
 * marks from the college's 2027 score sheet since 2026-11-06): ten
 * categories adding up to 360, with the sheet's bonus and year-specific
 * items as "extra" on top. The organization changes the marks, adds or
 * deletes activities on its 360 Activities page, or through its Excel
 * template there.
 *
 *   up(name, N)          the teacher gives 0–N
 *   per(name, N, cap, B) N for each accepted proof, at most `cap`; the teacher may add up to B bonus
 *   extra(…)             adds to the score, not to the 360
 *
 *   node scripts/seed360Activities.js ORG-2026-0015            # what it would do
 *   node scripts/seed360Activities.js ORG-2026-0015 --apply    # load it
 *
 * Replaces that organization's list only if it has none yet (--force to replace).
 * Uses MONGO_URI from .env.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const up = (name, marks) => ({ name, mode: 'max', marks });
const per = (name, marks, cap, bonusMax = 0) => ({ name, mode: 'each', marks, cap, bonusMax });
const extra = (a) => ({ ...a, bonus: true });
const TARGET = 360;

const LIST = [
    ['Academic Excellence', [per('Handwritten Assignments', 1, 4), per('Presentations', 1, 5), up('Semester Examination Marks', 10), up('Paying Full Fees', 5)]],
    ['Campus Involvement', [per('Shikshamitra News', 1, 5), up('EPS', 10), up('Boot Camp', 10), up('NSS Annual Camp', 5), per('Participation in NSS Activities', 1, 5),
        up('Student Forum', 5), per('Volunteering in Events', 1, 5, 5), up('Rangers and Rovers', 5), per('Participation in 5 Swastika Events', 1, 5),
        up('Admission Reference', 5), up('Attendance', 6), extra(up('Mentor and Mentee Meetings', 5)), up("Parents' Involvement", 5)]],
    ['Skill Enhancement', [per('Online Training', 1, 5), per('Offline Training', 1, 5), per('Weekly Series', 1, 10), per('Swastika Workshops', 1, 10),
        up('Marketing Skills', 5), up('Online Certificate Courses', 5), up('Offline Certificate Courses', 5), up('Designing and Video Creation Courses', 5),
        extra(up('Managerial Skills (Second Year)', 5))]],
    ['Earn While Learn', [up('Structured Earn While Learn', 20), per('Unstructured Earn While Learn — Individual activities', 1, 5), up('Short-Term Projects', 5)]],
    ['Student Entrepreneurship', [up('Startup Activities', 10), up('Attending BNI Meets and Expos', 5), up('Udyamashala Meetings, Sessions and Trainings', 5),
        up('Certification of Business Aspects', 5), up('Lucky Coupon', 10)]],
    ['Digital Proficiency', [up('Diploma in Computer Applications / Diploma in KSOU', 5), up('Certificate Courses in Excel / Aviation / Advanced Excel', 5),
        up('Certificate Courses in Tally / Advanced Tally', 5), up('Certificate Courses in Logistics', 5), up('Certificate Courses in AI', 5), up('Bus Apps', 5), up('Personal Laptop', 5)]],
    ['Talent and Cultural Enrichment', [up('Sports Activities', 5), up('Dance, Singing and Cultural Activities', 5), up('Yakshagana and Drama', 5),
        up('Inter-collegiate Participation and Prizes', 5)]],
    ['Internship and Educational Visits', [per('Industrial Visits', 1, 5), up('Social Agency Visits', 5), up('Non-Paid Internships', 10), extra(up('Research Projects', 5))]],
    ['Institutional Social Responsibility', [up('Membership in Other Public Organizations', 5), up('Blood Donation / Organ Donation Commitment', 5),
        up('Community Outreach Programs', 2), up('Green Revolution Activities', 8), up('Sustainable Development Goals (SDG)', 5), up('Skill Club Participation', 15)]],
    ['Personal Growth', [up('Preparing Biodata and Profile File', 5), up('Building LinkedIn Profile', 5), up('Paper Presentation and Research Articles', 5),
        up('Viva and Debate', 5), up('Attending Spoken English Classes', 5), up('Savings', 5), up('Investment', 5),
        extra(up('Attending Job Fairs (Final Year)', 5)), extra(up('Mock Interviews (Final Year)', 5))]]
];

const groups = LIST.map(([name, activities]) => ({ name, activities }));

(async () => {
    const [orgCode] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
    const apply = process.argv.includes('--apply');
    const force = process.argv.includes('--force');
    if (!orgCode) { console.log('Give the Organization ID, e.g. ORG-2026-0015.'); process.exit(1); }
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const Organization = require('../src/organizations/models/Organization');
    const { cleanGroups, summaryOf } = require('../src/three60/activities');
    const org = await Organization.findOne({ orgCode });
    if (!org) { console.log(`No organization ${orgCode}.`); process.exit(1); }
    const { groups: clean, error } = cleanGroups(groups);
    if (error) { console.log('The list is not valid:', error.message); process.exit(1); }
    const has = (org.three60?.activityGroups || []).length;
    const count = clean.reduce((n, g) => n + g.activities.length, 0);
    const sum = summaryOf({ three60: { activityGroups: clean } });
    console.log(`${org.name} (${orgCode}): ${clean.length} categories, ${count} activities, out of ${sum.possible} (+${sum.extra} extra).${has ? ` It already has ${has} categories.` : ''}`);
    if (sum.possible !== TARGET) { console.log(`The list adds up to ${sum.possible}, not ${TARGET}.`); process.exit(1); }
    if (has && !force) { console.log('Left as it is (use --force to replace).'); await mongoose.disconnect(); return; }
    if (!apply) { console.log('Nothing written (run with --apply).'); await mongoose.disconnect(); return; }
    org.set('three60.activityGroups', clean);
    org.set('three60.targetTotal', TARGET);
    await org.save();
    console.log('Loaded.');
    await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
