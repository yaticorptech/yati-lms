/**
 * 360 activities ⇄ Excel (2026-11-06), for the 360 Activities page: the
 * organization downloads its list as a workbook, edits it in Excel (or
 * Google Sheets), and uploads it back. Parsed here in the browser: the file
 * never goes to the server as is, only the list read from it, which the
 * server checks like any list typed on the page (src/three60/activities.js
 * cleanGroups). Nothing is saved until the organization presses Save.
 *
 * Sheet "Activities", one row per activity:
 *   Category | Activity | Marks are (Up to / Per proof) | Marks | Most it can give | Bonus up to | Extra (Yes/No) | Counts toward total
 * A blank Category carries the one above down, so a category can be written once.
 * Sheet "Settings": B1 the total to aim for (e.g. 360); B2 what the list adds up to.
 * "Counts toward total" and B2 are worked out in the sheet; they are not read back.
 */
import * as XLSX from 'xlsx';

export const SHEET = 'Activities';
export const HEADERS = ['Category', 'Activity', 'Marks are', 'Marks', 'Most it can give', 'Bonus up to', 'Extra', 'Counts toward total'];
export const MAX_ROWS = 2000;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_CAP = 100000;

const up = (name, marks) => ({ name, mode: 'max', marks, cap: '', bonus: false, bonusMax: 0 });
const per = (name, marks, cap, bonusMax = 0) => ({ name, mode: 'each', marks, cap, bonus: false, bonusMax });
const extra = (a) => ({ ...a, bonus: true });
/**
 * The college's 2027 score sheet as a list (2026-11-06): 360 marks, with its bonus and
 * year-specific items as extra. The template starts from it while the organization has
 * no list yet. Kept the same as yaticorp-lms-server/scripts/seed360Activities.js.
 */
export const STANDARD_TARGET = 360;
export const STANDARD = [
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
].map(([name, activities]) => ({ name, activities }));

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const num = (v) => (v === '' || v == null ? NaN : Number(String(v).replace(/,/g, '').trim()));
/** "Up to" / "Per proof", and the ways people write them. */
export const modeOf = (v) => {
    const t = clean(v).toLowerCase().replace(/[^a-z]/g, '');
    if (!t || ['upto', 'max', 'maximum', 'outof'].includes(t)) return 'max';
    if (['perproof', 'each', 'per', 'perupload', 'perentry', 'proof'].includes(t)) return 'each';
    return null;
};
export const yes = (v) => ['yes', 'y', 'true', '1', 'extra', 'bonus'].includes(clean(v).toLowerCase());
/** The most one activity can give: N for "up to N", its cap for "per proof" (null: no limit). */
export const maxOf = (a) => (a.mode === 'each' ? (a.cap === '' || a.cap == null ? null : Number(a.cap)) : Number(a.marks) || 0);
/** What a list adds up to: { possible, extra, uncapped }. "Per proof" without a cap counts once at its marks. */
export const sumOf = (groups) => {
    let possible = 0; let extra = 0; let uncapped = 0;
    for (const g of groups) for (const a of g.activities) {
        const top = maxOf(a);
        if (top == null) uncapped += 1;
        const n = top == null || !Number.isFinite(top) ? Number(a.marks) || 0 : top;
        if (a.bonus) extra += n; else possible += n;
        extra += Number(a.bonusMax) || 0;
    }
    const r = (n) => Math.round(n * 100) / 100;
    return { possible: r(possible), extra: r(extra), uncapped };
};

/** The list as a workbook. With no activities yet it starts from the standard 360 list (STANDARD). */
export const buildWorkbook = (groups, target) => {
    const rows = [HEADERS];
    const fresh = !groups.some((g) => g.activities.length);
    const list = fresh ? STANDARD : groups;
    if (fresh && (target === '' || target == null)) target = STANDARD_TARGET;
    for (const g of list) {
        g.activities.forEach((a) => {
            const each = a.mode === 'each';
            rows.push([g.name, a.name, each ? 'Per proof' : 'Up to', Number(a.marks) || 0, each && a.cap !== '' && a.cap != null ? Number(a.cap) : '', Number(a.bonusMax) || '', a.bonus ? 'Yes' : 'No', null]);
        });
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    // Worked out in the sheet as it is edited; the value written is the one it has now.
    for (let r = 2; r <= rows.length; r += 1) {
        const [, , mode, marks, cap, , extra] = rows[r - 1];
        const v = extra === 'Yes' ? 0 : mode === 'Per proof' ? (cap === '' ? marks : cap) : marks;
        ws[`H${r}`] = { t: 'n', v, f: `IF(G${r}="Yes",0,IF(C${r}="Per proof",IF(E${r}="",D${r},E${r}),D${r}))` };
    }
    ws['!cols'] = [{ wch: 34 }, { wch: 52 }, { wch: 12 }, { wch: 8 }, { wch: 16 }, { wch: 12 }, { wch: 8 }, { wch: 20 }];
    ws['!autofilter'] = { ref: `A1:H${rows.length}` };
    const counted = sumOf(list).possible;
    const settings = XLSX.utils.aoa_to_sheet([
        ['Total to aim for', target === '' || target == null ? '' : Number(target)],
        ['Your list adds up to', null]
    ]);
    settings.B2 = { t: 'n', v: counted, f: `SUM(${SHEET}!H2:H${MAX_ROWS + 1})` };
    settings['!cols'] = [{ wch: 24 }, { wch: 12 }];
    const help = XLSX.utils.aoa_to_sheet([
        ['How to fill the Activities sheet'],
        [''],
        ['Category', 'The group the activity is in, e.g. Academic Excellence. Leave it blank to use the category of the row above.'],
        ['Activity', 'What the student earns marks for, e.g. Presentations. Each activity once in the whole list.'],
        ['Marks are', '"Up to": the teacher looks at the proof and gives 0 to Marks.  "Per proof": every accepted proof adds Marks.'],
        ['Marks', 'For "Up to": the most it gives. For "Per proof": what one accepted proof gives (0 to 1000).'],
        ['Most it can give', '"Per proof" only: the most it gives however many proofs, e.g. 1 per presentation, at most 5. Blank: no limit.'],
        ['Bonus up to', 'Optional: the teacher may add up to this much bonus, in all, when accepting proof (e.g. Volunteering: 5). Not part of the total.'],
        ['Extra', '"Yes" for a bonus or an activity for one year only (e.g. Mock Interview, final year): it adds to the student\'s score but not to the total.'],
        ['Counts toward total', 'Worked out for you. Settings → "Your list adds up to" should match "Total to aim for" (e.g. 360).'],
        [''],
        ['Upload the file on the 360 Activities page, check the list, then press Save. Activities you keep by name keep the proof and marks already given.']
    ]);
    help['!cols'] = [{ wch: 22 }, { wch: 110 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, SHEET);
    XLSX.utils.book_append_sheet(wb, settings, 'Settings');
    XLSX.utils.book_append_sheet(wb, help, 'How to fill');
    return wb;
};
export const downloadWorkbook = (groups, target, fileName = '360-activities.xlsx') => XLSX.writeFile(buildWorkbook(groups, target), fileName, { compression: true });

/**
 * A workbook → { groups: [{ name, activities: [{ name, mode, marks, cap, bonus }] }], target, errors: ['Row 4: …'] }.
 * Only the cells' values are read: no formulas, no HTML.
 */
export const parseWorkbook = (data) => {
    let wb;
    try {
        wb = XLSX.read(data, { type: 'array', cellFormula: false, cellHTML: false, cellStyles: false, sheetRows: MAX_ROWS + 50 });
    } catch {
        return { groups: [], target: undefined, errors: ['That file could not be read. Upload the Excel file (.xlsx) downloaded from this page.'] };
    }
    const name = wb.SheetNames.find((n) => n.trim().toLowerCase() === SHEET.toLowerCase()) || wb.SheetNames[0];
    const rows = name ? XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: true, blankrows: true }) : [];
    // The header row: the first with both Category and Activity in it.
    const h = rows.findIndex((r) => r.some((c) => clean(c).toLowerCase() === 'category') && r.some((c) => clean(c).toLowerCase() === 'activity'));
    if (h < 0) return { groups: [], target: undefined, errors: ['The sheet needs a header row with Category and Activity. Download the template from this page and fill it in.'] };
    const col = (...names) => rows[h].findIndex((c) => names.includes(clean(c).toLowerCase()));
    const at = { cat: col('category'), act: col('activity'), mode: col('marks are', 'type', 'mode'), marks: col('marks'), cap: col('most it can give', 'max', 'cap', 'limit'), bonusMax: col('bonus up to', 'bonus'), extra: col('extra') };
    if (at.marks < 0) return { groups: [], target: undefined, errors: ['The sheet needs a Marks column.'] };
    const errors = [];
    const groups = [];
    const byName = new Map();
    const seen = new Map();
    let category = '';
    const body = rows.slice(h + 1);
    if (body.length > MAX_ROWS) errors.push(`Keep the list under ${MAX_ROWS} rows.`);
    body.slice(0, MAX_ROWS).forEach((r, i) => {
        const row = h + i + 2;
        const cell = (k) => (at[k] >= 0 ? r[at[k]] : '');
        const activity = clean(cell('act'));
        if (clean(cell('cat'))) category = clean(cell('cat'));
        if (!activity) { if (r.some((c) => clean(c) && typeof c !== 'number')) errors.push(`Row ${row}: the activity has no name.`); return; }
        if (!category) { errors.push(`Row ${row}: ${activity} has no category.`); return; }
        if (category.length > 80) { errors.push(`Row ${row}: keep the category name under 80 characters.`); return; }
        if (activity.length > 120) { errors.push(`Row ${row}: keep the activity name under 120 characters.`); return; }
        const mode = modeOf(cell('mode'));
        if (!mode) { errors.push(`Row ${row}: ${activity}: Marks are should be "Up to" or "Per proof".`); return; }
        const marks = num(cell('marks'));
        if (!Number.isFinite(marks) || marks < 0 || marks > 1000) { errors.push(`Row ${row}: ${activity}: Marks should be a number from 0 to 1000.`); return; }
        let cap = '';
        const rawCap = clean(cell('cap'));
        if (mode === 'each' && rawCap) {
            const c = num(rawCap);
            if (!Number.isFinite(c) || c < 0 || c > MAX_CAP) { errors.push(`Row ${row}: ${activity}: Most it can give should be a number, or blank for no limit.`); return; }
            if (c < marks) { errors.push(`Row ${row}: ${activity}: Most it can give (${c}) is less than one proof's marks (${marks}).`); return; }
            cap = c;
        }
        const rawBonus = clean(cell('bonusMax'));
        const bonusMax = rawBonus ? num(rawBonus) : 0;
        if (!Number.isFinite(bonusMax) || bonusMax < 0 || bonusMax > 1000) { errors.push(`Row ${row}: ${activity}: Bonus up to should be a number from 0 to 1000, or blank.`); return; }
        const key = activity.toLowerCase();
        if (seen.has(key)) { errors.push(`Row ${row}: ${activity} is already on row ${seen.get(key)}. Keep each activity once, or it counts twice.`); return; }
        seen.set(key, row);
        let g = byName.get(category.toLowerCase());
        if (!g) { g = { name: category, activities: [] }; byName.set(category.toLowerCase(), g); groups.push(g); }
        g.activities.push({ name: activity, mode, marks, cap, bonus: yes(cell('extra')), bonusMax });
    });
    if (!groups.length && !errors.length) errors.push('The sheet has no activities. Fill in at least one row under the header.');
    if (groups.length > 30) errors.push('Keep it to 30 categories.');
    for (const g of groups) if (g.activities.length > 60) errors.push(`${g.name}: keep it to 60 activities.`);
    // The total to aim for, from Settings B1 (left as it is when the sheet has none).
    let target;
    const set = wb.Sheets[wb.SheetNames.find((n) => n.trim().toLowerCase() === 'settings')];
    if (set?.B1) {
        const t = num(set.B1.v);
        if (clean(set.B1.v) === '') target = '';
        else if (Number.isFinite(t) && t >= 0 && t <= MAX_CAP) target = t;
        else errors.push('Settings: "Total to aim for" should be a number, or blank.');
    }
    return { groups, target, errors };
};

/**
 * The uploaded list, with the ids of the activities already saved under the same name (in any
 * category) and of the categories of the same name, so proof and marks given for them stay.
 */
export const keepIds = (uploaded, current) => {
    const acts = new Map();
    const cats = new Map();
    for (const g of current) {
        if (g._id) cats.set(g.name.trim().toLowerCase(), g._id);
        for (const a of g.activities) if (a._id) acts.set(a.name.trim().toLowerCase(), a._id);
    }
    let kept = 0;
    const groups = uploaded.map((g) => ({
        ...(cats.get(g.name.toLowerCase()) ? { _id: cats.get(g.name.toLowerCase()) } : {}), name: g.name,
        activities: g.activities.map((a) => {
            const id = acts.get(a.name.toLowerCase());
            if (id) kept += 1;
            return { ...(id ? { _id: id } : {}), ...a };
        })
    }));
    const keptNames = new Set(uploaded.flatMap((g) => g.activities.map((a) => a.name.toLowerCase())));
    const dropped = [...acts.keys()].filter((n) => !keptNames.has(n)).length;
    return { groups, kept, dropped };
};
