/**
 * @description Scouts & Guides progression: the ranks each section works
 * through, in order, and the kinds of award a member's record holds.
 *
 * TO VERIFY against BSG's official APRO (Part II) and the state association
 * before relying on it for anything official. These are the names commonly
 * used across BSG units; the LMS only orders and displays them — it enforces
 * no age band, no test syllabus and no waiting period between ranks. Edit
 * this one file to correct them: rows already recorded keep the name they
 * were given.
 */
const RANKS = {
    cubs: ['Pravesh', 'Pratham Charan', 'Dwitiya Charan', 'Tritiya Charan', 'Chaturth Charan', 'Golden Arrow'],
    bulbuls: ['Pravesh', 'Pratham Charan', 'Dwitiya Charan', 'Tritiya Charan', 'Chaturth Charan', 'Golden Hand'],
    scouts: ['Pravesh', 'Pratham Sopan', 'Dwitiya Sopan', 'Tritiya Sopan', 'Rajya Puraskar', 'Rashtrapati Scout'],
    guides: ['Pravesh', 'Pratham Sopan', 'Dwitiya Sopan', 'Tritiya Sopan', 'Rajya Puraskar', 'Rashtrapati Guide'],
    rovers: ['Pravesh', 'Nipun', 'Rajya Puraskar', 'Rashtrapati Rover'],
    rangers: ['Pravesh', 'Nipun', 'Rajya Puraskar', 'Rashtrapati Ranger']
};

// rank        a step of the section's progression above (the name must be one of them)
// badge       a proficiency or skill badge, named as on the badge
// training    a course, camp or training the member completed
const AWARD_TYPES = ['rank', 'badge', 'training'];
const AWARD_TYPE_LABELS = { rank: 'Rank', badge: 'Proficiency badge', training: 'Training' };
const AWARD_STATUSES = ['pending', 'approved', 'rejected'];

/** The ranks of every section, as one ordered list each, for pickers. */
const ranksFor = (section) => RANKS[section] || [];

/**
 * A member's current rank from their approved rank awards (any organization,
 * so it survives a transfer). Ranks count within the section they were earned
 * in — a Scout's Pravesh is not a Rover's — so: the furthest rank earned in
 * their current section; or, before they pass one there, the furthest in the
 * section of their latest rank (a Scout who has just become a Rover is still
 * shown as the Scout they were).
 */
const currentRank = (awards, section) => {
    const ranks = awards.filter((a) => a.type === 'rank' && a.status === 'approved');
    if (!ranks.length) return '';
    const furthest = (rows, order) => [...rows].sort((a, b) => order.indexOf(b.name) - order.indexOf(a.name))[0].name;
    const here = ranksFor(section);
    const inSection = ranks.filter((a) => (a.section || section) === section && here.includes(a.name));
    if (inSection.length) return furthest(inSection, here);
    const latest = [...ranks].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const before = ranksFor(latest.section);
    const same = ranks.filter((a) => a.section === latest.section && before.includes(a.name));
    return same.length ? furthest(same, before) : latest.name;
};

// The states and union territories an institution (and a BSG state office) belongs to.
const INDIA_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
    'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
    'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

// What a BSG office publishes: Scouts and Guides see it, nothing more.
// 'rules' is the office's standing rules and regulations: no date of its own, never drops out of the feed.
const NOTICE_KINDS = ['exam', 'camp', 'training', 'event', 'rules', 'notice'];
const NOTICE_KIND_LABELS = { exam: 'Exam / test', camp: 'Camp', training: 'Training', event: 'Event', rules: 'Rules & regulations', notice: 'Notice' };

module.exports = { INDIA_STATES, NOTICE_KINDS, NOTICE_KIND_LABELS, RANKS, AWARD_TYPES, AWARD_TYPE_LABELS, AWARD_STATUSES, ranksFor, currentRank };
