/**
 * @description Extra-curricular tracking inside an organization: NCC, NSS,
 * Scouts & Guides, and the organization's own clubs (scheme 'CLUB' + clubId).
 * The model names keep their NCC/NSS origin.
 *
 *   NccNssClub     a club the organization runs (Eco club, Robotics club…)
 *   NccNssMember   a student's place in one of them
 *   NccNssActivity one thing a student did (drive, camp, award…), with its hours
 *   NccNssEvent    a parade, meeting or camp the college held, with who was present
 *   NccNssSetting  the college's own targets for each scheme
 *   ScoutUnit      a Scouts & Guides unit the organization runs (a Cub pack, a
 *                  Guide company…), with its section and its leaders
 *   BsgNotice      an exam, camp or event a BSG office (national or state)
 *                  publishes for Scouts and Guides to see, with its rules
 *   ScoutAward     a rank passed, a proficiency badge or a training a Scouts
 *                  member earned (./bsg.js), proposed by a leader or the
 *                  organization and approved by the organization
 *
 * Every row carries organizationId, and every query is scoped by the signed-in
 * organization (or the student's own membership), never by the request.
 */
const mongoose = require('mongoose');

const SCHEMES = ['NCC', 'NSS', 'SCOUTS', 'CLUB'];
const SCHEME_LABELS = { NCC: 'NCC', NSS: 'NSS', SCOUTS: 'Scouts & Guides', CLUB: 'Club' };
const CLUB_CATEGORIES = ['cultural', 'sports', 'technical', 'literary', 'arts', 'social', 'other'];
// A club member's post; 'member' for everyone else (and for NCC/NSS/Scouts).
const CLUB_ROLES = ['member', 'president', 'vice_president', 'secretary', 'treasurer', 'coordinator'];
// left and transferred close a membership for good and keep it as history:
// left when the student leaves (or is taken out of) the unit or organization,
// transferred when the organization moves them to another unit (a new row).
const MEMBER_STATUSES = ['pending', 'active', 'rejected', 'completed', 'left', 'transferred'];
// The rows that still count as a place in a scheme; only one of these per student, scheme and club.
const LIVE_STATUSES = ['active', 'pending'];
const CLOSED_STATUSES = ['left', 'transferred'];
// The last three are a club's: a match, a rehearsal or practice, a show.
const ACTIVITY_KINDS = ['social', 'camp', 'parade', 'drill', 'award', 'other', 'competition', 'practice', 'performance'];
const ACTIVITY_STATUSES = ['pending', 'approved', 'rejected'];
// Suggested event types; an event's type is typed freely (eventKind below).
const EVENT_KINDS = ['parade', 'meeting', 'camp', 'drive', 'competition', 'practice', 'performance'];

// Scouts & Guides sections, as a unit is registered under one. Names and
// pairings follow common BSG usage — TO VERIFY against BSG's APRO before
// relying on them for anything official (age bands are not enforced here).
const SCOUT_SECTIONS = ['cubs', 'bulbuls', 'scouts', 'guides', 'rovers', 'rangers'];
const SCOUT_SECTION_LABELS = { cubs: 'Cubs', bulbuls: 'Bulbuls', scouts: 'Scouts', guides: 'Guides', rovers: 'Rovers', rangers: 'Rangers' };
const UNIT_STATUSES = ['active', 'inactive'];

// Starting targets until the college sets its own (NSS: 240 hours over two
// years and one special camp; NCC: one camp and 75% attendance).
const DEFAULT_TARGETS = {
    NSS: { requiredHours: 240, requiredCamps: 1, minAttendance: 75 },
    NCC: { requiredHours: 0, requiredCamps: 1, minAttendance: 75 },
    SCOUTS: { requiredHours: 0, requiredCamps: 1, minAttendance: 75 },
    CLUB: { requiredHours: 0, requiredCamps: 0, minAttendance: 75 }
};

const { ObjectId } = mongoose.Schema.Types;

const clubSchema = new mongoose.Schema({
    organizationId: { type: ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    category: { type: String, enum: CLUB_CATEGORIES, default: 'other' },
    // The teacher in charge: they schedule the club's events from their own dashboard.
    inchargeTeacherId: { type: ObjectId, ref: 'Teacher', default: null, index: true },
    description: { type: String, default: '', trim: true, maxlength: 300 }
}, { timestamps: true });

const memberSchema = new mongoose.Schema({
    organizationId: { type: ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: ObjectId, ref: 'User', required: true },
    scheme: { type: String, enum: SCHEMES, required: true },
    // Which club, for scheme 'CLUB'; null for the others.
    clubId: { type: ObjectId, ref: 'NccNssClub', default: null },
    role: { type: String, enum: CLUB_ROLES, default: 'member' },
    // Free text for NCC/NSS. For Scouts it is the name of the ScoutUnit in unitId
    // when one is chosen, kept in step by the organization's routes, so events,
    // attendance and progress (which match on this string) need no second rule.
    unit: { type: String, default: '', trim: true, maxlength: 80 },
    unitId: { type: ObjectId, ref: 'ScoutUnit', default: null, index: true },
    // The unit's section, copied when the unit is chosen; blank for everything else.
    section: { type: String, enum: ['', ...SCOUT_SECTIONS], default: '' },
    enrolmentNo: { type: String, default: '', trim: true, maxlength: 40 },
    year: { type: Number, min: 1, max: 3, default: 1 },
    // NCC A/B/C certificate the cadet is working towards; blank for NSS.
    certStage: { type: String, enum: ['', 'A', 'B', 'C'], default: '' },
    status: { type: String, enum: MEMBER_STATUSES, default: 'active', index: true },
    addedBy: { type: String, enum: ['student', 'organization'], default: 'organization' },
    note: { type: String, default: '', trim: true, maxlength: 300 },
    // When and why a left or transferred row closed. Its activities and
    // attendance stay with it, so the record survives a move.
    endedAt: { type: Date, default: null },
    endReason: { type: String, default: '', trim: true, maxlength: 200 },
    // The row this one continues (a transfer, or re-joining at a new
    // organization), and for a transferred row the one that replaced it.
    transferredFrom: { type: ObjectId, ref: 'NccNssMember', default: null },
    transferredTo: { type: ObjectId, ref: 'NccNssMember', default: null }
}, { timestamps: true });
// One live row per student per scheme, and per club. Closed rows (history)
// sit beside it, so a student who moved keeps every earlier record.
memberSchema.index(
    { userId: 1, scheme: 1, clubId: 1 },
    { unique: true, name: 'live_membership', partialFilterExpression: { status: { $in: LIVE_STATUSES } } }
);

const activitySchema = new mongoose.Schema({
    organizationId: { type: ObjectId, ref: 'Organization', required: true, index: true },
    memberId: { type: ObjectId, ref: 'NccNssMember', required: true, index: true },
    userId: { type: ObjectId, ref: 'User', required: true },
    scheme: { type: String, enum: SCHEMES, required: true },
    kind: { type: String, enum: ACTIVITY_KINDS, default: 'social' },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    date: { type: Date, required: true },
    hours: { type: Number, min: 0, max: 240, default: 0 },
    place: { type: String, default: '', trim: true, maxlength: 120 },
    proofUrl: { type: String, default: '' },
    status: { type: String, enum: ACTIVITY_STATUSES, default: 'pending', index: true },
    reason: { type: String, default: '', trim: true, maxlength: 300 },
    decidedBy: { type: ObjectId, ref: 'Admin', default: null },
    decidedAt: { type: Date, default: null },
    source: { type: String, enum: ['student', 'organization'], default: 'student' }
}, { timestamps: true });

const eventSchema = new mongoose.Schema({
    organizationId: { type: ObjectId, ref: 'Organization', required: true, index: true },
    scheme: { type: String, enum: SCHEMES, required: true },
    clubId: { type: ObjectId, ref: 'NccNssClub', default: null },
    // Blank means every unit of the scheme. For Scouts, the name of unitId (as on members).
    unit: { type: String, default: '', trim: true, maxlength: 80 },
    unitId: { type: ObjectId, ref: 'ScoutUnit', default: null },
    // Typed by whoever adds it ("Rehearsal", "Inter-college fest"…); EVENT_KINDS are only suggestions.
    // 'camp' still counts towards the camps target.
    kind: { type: String, trim: true, maxlength: 40, default: 'parade' },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    date: { type: Date, required: true },
    hours: { type: Number, min: 0, max: 240, default: 0 },
    place: { type: String, default: '', trim: true, maxlength: 120 },
    // A club's president can add events too; null when the organization or the teacher in charge did.
    addedByUserId: { type: ObjectId, ref: 'User', default: null },
    // Attendance is taken once the event has happened; until then it is null.
    attendanceTaken: { type: Boolean, default: false },
    presentMemberIds: [{ type: ObjectId, ref: 'NccNssMember' }]
}, { timestamps: true });
eventSchema.index({ organizationId: 1, date: -1 });

const settingSchema = new mongoose.Schema({
    organizationId: { type: ObjectId, ref: 'Organization', required: true },
    scheme: { type: String, enum: SCHEMES, required: true },
    requiredHours: { type: Number, min: 0, max: 2000, default: 0 },
    requiredCamps: { type: Number, min: 0, max: 20, default: 0 },
    minAttendance: { type: Number, min: 0, max: 100, default: 75 }
}, { timestamps: true });
settingSchema.index({ organizationId: 1, scheme: 1 }, { unique: true });

const scoutUnitSchema = new mongoose.Schema({
    organizationId: { type: ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    section: { type: String, enum: SCOUT_SECTIONS, required: true },
    // The number the BSG district association registered the unit under, if any.
    regNo: { type: String, default: '', trim: true, maxlength: 40 },
    // Teachers of this organization authorised to lead the unit.
    leaderTeacherIds: [{ type: ObjectId, ref: 'Teacher' }],
    status: { type: String, enum: UNIT_STATUSES, default: 'active' },
    note: { type: String, default: '', trim: true, maxlength: 300 }
}, { timestamps: true });
// Unit names are what members and events carry, so they are unique in an organization.
scoutUnitSchema.index({ organizationId: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
scoutUnitSchema.index({ leaderTeacherIds: 1 });

const { AWARD_TYPES, AWARD_STATUSES, NOTICE_KINDS } = require('./bsg');
const bsgNoticeSchema = new mongoose.Schema({
    // The office that published it; level and state copied so readers need not join.
    officeId: { type: ObjectId, ref: 'Organization', required: true, index: true },
    level: { type: String, enum: ['national', 'state'], required: true },
    state: { type: String, default: '' },
    kind: { type: String, enum: NOTICE_KINDS, default: 'notice' },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    date: { type: Date, required: true },
    endDate: { type: Date, default: null },
    place: { type: String, default: '', trim: true, maxlength: 160 },
    // Which sections it is for; empty is every section.
    sections: [{ type: String }],
    // The rank a member should already hold to take part (an exam's prerequisite), as written.
    minRank: { type: String, default: '', trim: true, maxlength: 60 },
    // What they must already know or bring: one rule per line.
    rules: [{ type: String, trim: true, maxlength: 200 }],
    details: { type: String, default: '', trim: true, maxlength: 2000 },
    // Who came to an exam, camp or training, marked by the office: Scouts &
    // Guides members (NccNssMember) of the institutions it reaches.
    attendanceTaken: { type: Boolean, default: false },
    presentMemberIds: [{ type: ObjectId, ref: 'NccNssMember' }],
    createdBy: { type: ObjectId, ref: 'Admin', default: null }
}, { timestamps: true });
bsgNoticeSchema.index({ level: 1, state: 1, date: -1 });

const scoutAwardSchema = new mongoose.Schema({
    organizationId: { type: ObjectId, ref: 'Organization', required: true, index: true },
    // The membership it was earned in, and the student — whose record it stays
    // on through transfers (current rank is read across all of theirs).
    memberId: { type: ObjectId, ref: 'NccNssMember', required: true, index: true },
    userId: { type: ObjectId, ref: 'User', required: true, index: true },
    unitId: { type: ObjectId, ref: 'ScoutUnit', default: null },
    section: { type: String, default: '' },
    type: { type: String, enum: AWARD_TYPES, required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    date: { type: Date, required: true },
    // Who tested or awarded it, as written on the card or certificate.
    examiner: { type: String, default: '', trim: true, maxlength: 120 },
    certificateNo: { type: String, default: '', trim: true, maxlength: 60 },
    note: { type: String, default: '', trim: true, maxlength: 300 },
    status: { type: String, enum: AWARD_STATUSES, default: 'pending', index: true },
    reason: { type: String, default: '', trim: true, maxlength: 300 },
    // A leader (teacher) proposing it, or the organization recording it.
    proposedByTeacherId: { type: ObjectId, ref: 'Teacher', default: null },
    decidedBy: { type: ObjectId, ref: 'Admin', default: null },
    decidedAt: { type: Date, default: null }
}, { timestamps: true });
scoutAwardSchema.index({ organizationId: 1, status: 1, createdAt: 1 });

const NccNssClub = mongoose.model('NccNssClub', clubSchema, 'nccnss_clubs');
const NccNssMember = mongoose.model('NccNssMember', memberSchema, 'nccnss_members');
// The unique index before clubs was {userId, scheme}: it would allow one club
// per student. Dropped once; missing is fine.
NccNssMember.collection.dropIndex('userId_1_scheme_1').catch(() => {});
// The next one, {userId, scheme, clubId} over every row, allowed no history:
// a student who left could never join again. Replaced by live_membership
// above, which is unique over the same keys for live rows only. No row is
// touched; only the old index goes, then the new one is built. Missing is fine.
NccNssMember.init().catch(() => {})
    .then(() => NccNssMember.collection.dropIndex('userId_1_scheme_1_clubId_1'))
    .then(() => NccNssMember.createIndexes())
    .catch(() => {});
const NccNssActivity = mongoose.model('NccNssActivity', activitySchema, 'nccnss_activities');
const NccNssEvent = mongoose.model('NccNssEvent', eventSchema, 'nccnss_events');
const NccNssSetting = mongoose.model('NccNssSetting', settingSchema, 'nccnss_settings');
const ScoutUnit = mongoose.model('ScoutUnit', scoutUnitSchema, 'nccnss_scout_units');
const ScoutAward = mongoose.model('ScoutAward', scoutAwardSchema, 'nccnss_scout_awards');
const BsgNotice = mongoose.model('BsgNotice', bsgNoticeSchema, 'nccnss_bsg_notices');

/** An event type as typed: trimmed, short, a known one in its own spelling. */
const eventKind = (v, fallback) => {
    const t = String(v || '').trim().slice(0, 40);
    // Anything typed as a camp ("Camp / trip", "Annual camp") counts towards the camps target.
    if (/\bcamp\b/i.test(t)) return 'camp';
    return EVENT_KINDS.find((k) => k === t.toLowerCase()) || t || fallback;
};

/** What a membership or event is called: the club's name for a club, else the scheme's. */
const schemeName = (row) => (row.scheme === 'CLUB' ? row.clubId?.name || 'Club' : SCHEME_LABELS[row.scheme] || row.scheme);

/**
 * The Scouts unit a request names, checked against the organization: { unit }
 * (null for none, or for any other scheme), or { error } for one that is not
 * this organization's or is no longer active.
 */
const scoutUnitFor = async (organizationId, scheme, unitId) => {
    if (scheme !== 'SCOUTS' || !unitId) return { unit: null };
    const unit = mongoose.isValidObjectId(unitId)
        ? await ScoutUnit.findOne({ _id: unitId, organizationId, status: 'active' }).lean()
        : null;
    return unit ? { unit } : { error: 'Choose one of your organization\'s Scouts & Guides units.' };
};

module.exports = {
    scoutUnitFor,
    NccNssClub, NccNssMember, NccNssActivity, NccNssEvent, NccNssSetting, ScoutUnit, ScoutAward, BsgNotice,
    SCOUT_SECTIONS, SCOUT_SECTION_LABELS, UNIT_STATUSES, MEMBER_STATUSES, LIVE_STATUSES, CLOSED_STATUSES,
    SCHEMES, SCHEME_LABELS, CLUB_CATEGORIES, CLUB_ROLES, ACTIVITY_KINDS, EVENT_KINDS, DEFAULT_TARGETS, schemeName, eventKind
};
