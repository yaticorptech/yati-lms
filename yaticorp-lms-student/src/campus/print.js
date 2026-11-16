/**
 * Printable documents — the admit card, the fee receipt and the marks card —
 * opened in their own window and sent to the printer (or "Save as PDF").
 * The same layouts as the institution app (yaticorp-lms-institution/src/print.js).
 */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const date = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => (d ? new Date(String(d).length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('en-IN', opts) : '—');

const STYLE = `
*{box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;color:#17201f;margin:0;padding:28px;background:#fff}
.doc{max-width:780px;margin:0 auto 28px;border:1.5px solid #0e3b3a;padding:26px 30px;position:relative;page-break-after:always;background:#fff}
.doc:last-child{page-break-after:auto}
.doc:before{content:'';position:absolute;inset:5px;border:1px solid #d9c9a3;pointer-events:none}
.head{display:flex;align-items:center;gap:16px;padding-bottom:14px;margin-bottom:16px;border-bottom:2px solid #0e3b3a}
.head img{height:60px;width:60px;object-fit:contain}.head h1{margin:0;font:600 22px Fraunces,Georgia,serif;letter-spacing:.01em}
.head p{margin:3px 0 0;font-size:12px;color:#4b5755}
.title{text-align:center;font-weight:700;font-size:12px;letter-spacing:.28em;text-transform:uppercase;background:#0e3b3a;color:#fff;padding:7px;margin:0 0 16px}
table{width:100%;border-collapse:collapse;font-size:12.5px}th,td{border:1px solid #d3cdbf;padding:7px 9px;text-align:left}
th{background:#f5f3ee;font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:#4b5755}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:5px 24px;font-size:12.5px;margin-bottom:16px}
.grid b{display:inline-block;min-width:118px;color:#7c8785;font-weight:600}
.photo{position:absolute;top:104px;right:36px;width:92px;height:112px;border:1px solid #b9b2a3;object-fit:cover;background:#fbfaf7}
.sign{display:flex;justify-content:space-between;margin-top:46px;font-size:11.5px;color:#4b5755}
.sign span{border-top:1px solid #7c8785;padding-top:4px;min-width:170px;text-align:center}
.note{font-size:11.5px;color:#4b5755;margin-top:12px;white-space:pre-wrap}
.r{text-align:right}.c{text-align:center}.big{font:600 20px Fraunces,Georgia,serif}
.sum{display:flex;gap:10px;margin-top:14px}.sum div{flex:1;border:1px solid #d3cdbf;padding:8px 10px}
.sum small{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#7c8785}.sum strong{font:600 18px Fraunces,Georgia,serif}
.fail{color:#be123c;font-weight:700}.pass{color:#145250;font-weight:700}
@media print{body{padding:0}.doc{margin:0 auto}}`;

/**
 * Print documents that are still being fetched: the window opens now, inside the
 * click (pop-up blockers allow that), and is filled when `docs` arrive.
 * `const done = printLater(); … done(title, docs)` (or done.fail() to close it).
 */
export const printLater = () => {
    const w = window.open('', '_blank', 'width=920,height=1000');
    if (w) w.document.write('<p style="font:14px system-ui;padding:24px;color:#4b5755">Preparing…</p>');
    const done = (title, docs) => { if (w) write(w, title, docs); else window.alert('Allow pop-ups for this site to print.'); };
    done.fail = () => w?.close();
    return done;
};
export const printDocs = (title, docs) => printLater()(title, docs);
const write = (w, title, docs) => {
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>${STYLE}</style></head><body>${docs.join('')}<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
    w.document.close();
};

const head = (inst, line) => `<div class="head">${inst?.logo ? `<img src="${esc(inst.logo)}" alt="">` : ''}<div><h1>${esc(inst?.name || '')}</h1><p>${esc(line || inst?.address || '')}</p></div></div>`;

/** t: the hall-ticket answer of the API. */
export const admitCard = (t) => `
<div class="doc">${head(t.institution)}
  <p class="title">Admit card · ${esc(t.exam.name)}</p>
  ${t.student.picture ? `<img class="photo" src="${esc(t.student.picture)}" alt="">` : '<div class="photo"></div>'}
  <div class="grid" style="padding-right:116px">
    <div><b>Name</b> ${esc(t.student.name)}</div><div><b>Admit card no.</b> ${esc(t.ticketNo)}</div>
    <div><b>Roll no.</b> ${esc(t.student.rollNo || '—')}</div><div><b>Admission no.</b> ${esc(t.student.admissionNo || '—')}</div>
    <div><b>Department</b> ${esc(t.department?.name || '')}</div><div><b>Semester</b> ${esc(t.student.semester)}${t.student.section ? ` · Section ${esc(t.student.section)}` : ''}</div>
    <div><b>Card no.</b> ${esc(t.student.cardNumber || '—')}</div><div><b>Attendance</b> ${t.attendance === null || t.attendance === undefined ? '—' : `${t.attendance}%`}</div>
    ${t.exam.venue ? `<div style="grid-column:1/-1"><b>Venue</b> ${esc(t.exam.venue)}</div>` : ''}
  </div>
  <table><thead><tr><th>Date</th><th>Time</th><th>Code</th><th>Subject</th><th>Invigilator</th></tr></thead><tbody>
  ${(t.exam.schedule || []).map((x) => `<tr><td>${esc(date(x.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }))}</td><td>${esc(x.start || '')}${x.end ? `–${esc(x.end)}` : ''}</td><td>${esc(x.code || '')}</td><td>${esc(x.subject)}</td><td></td></tr>`).join('') || '<tr><td colspan="5">The timetable will be announced.</td></tr>'}
  </tbody></table>
  ${t.exam.instructions ? `<p class="note"><b>Instructions</b>\n${esc(t.exam.instructions)}</p>` : ''}
  <div class="sign"><span>Student’s signature</span><span>Controller of Examinations</span></div>
</div>`;

export const receipt = (inst, student, p) => `
<div class="doc">${head(inst, 'Fee receipt')}
  <p class="title">Receipt ${esc(p.receipt)}</p>
  <div class="grid">
    <div><b>Received from</b> ${esc(student.name)}</div><div><b>Date</b> ${esc(date(p.at))}</div>
    <div><b>Roll no.</b> ${esc(student.rollNo || '—')}</div><div><b>Admission no.</b> ${esc(student.admissionNo || '—')}</div>
    <div><b>Mode</b> ${esc(p.mode)}</div><div><b>Reference</b> ${esc(p.ref || '—')}</div>
  </div>
  <table><thead><tr><th>Towards</th><th class="r">Amount</th></tr></thead><tbody><tr><td>${esc(p.title)}</td><td class="r big">${esc(money(p.amount))}</td></tr></tbody></table>
  <div class="sign"><span>Received by ${esc(p.by || '')}</span><span>Authorised signatory</span></div>
</div>`;

/** A marks card: inst, department, student { name, rollNo, admissionNo, semester, section, cardNumber }, exam { name, semester }, result (resultOf). */
export const marksCard = ({ inst, department, student, exam, result }) => {
    const percent = result.max ? Math.round((result.total / result.max) * 1000) / 10 : 0;
    return `
<div class="doc">${head(inst)}
  <p class="title">Statement of marks · ${esc(exam.name)}</p>
  ${student.picture ? `<img class="photo" src="${esc(student.picture)}" alt="">` : ''}
  <div class="grid"${student.picture ? ' style="padding-right:118px;min-height:118px;align-content:start"' : ''}>
    <div><b>Name</b> ${esc(student.name)}</div><div><b>Roll no.</b> ${esc(student.rollNo || '—')}</div>
    <div><b>Department</b> ${esc(department?.name || '')}</div><div><b>Admission no.</b> ${esc(student.admissionNo || '—')}</div>
    <div><b>Semester</b> ${esc(exam.semester)}${student.section ? ` · Section ${esc(student.section)}` : ''}</div><div><b>Card no.</b> ${esc(student.cardNumber || '—')}</div>
  </div>
  <table><thead><tr><th>Code</th><th>Subject</th><th class="c">Credits</th><th class="c">Max</th><th class="c">Marks</th><th class="c">Grade</th><th class="c">Points</th><th class="c">Result</th></tr></thead><tbody>
  ${result.subjects.map((s) => `<tr><td>${esc(s.code || '')}</td><td>${esc(s.name)}</td><td class="c">${esc(s.credits ?? '')}</td><td class="c">${esc(s.max ?? exam.maxMarks ?? '')}</td>
    <td class="c">${s.marks === undefined ? '—' : s.marks === null ? 'AB' : esc(s.marks)}</td><td class="c">${esc(s.grade || '—')}</td><td class="c">${esc(s.points ?? '—')}</td>
    <td class="c ${s.passed ? 'pass' : s.marks === undefined ? '' : 'fail'}">${s.marks === undefined ? '—' : s.passed ? 'P' : 'F'}</td></tr>`).join('')}
  </tbody></table>
  <div class="sum">
    <div><small>Total</small><strong>${esc(result.total)} / ${esc(result.max)}</strong></div>
    <div><small>Percentage</small><strong>${esc(percent)}%</strong></div>
    <div><small>SGPA</small><strong>${result.sgpa === null || result.sgpa === undefined ? '—' : esc(result.sgpa.toFixed(2))}</strong></div>
    <div><small>Result</small><strong class="${result.failed ? 'fail' : 'pass'}">${esc(result.result)}</strong></div>
  </div>
  <p class="note">Grades: O ≥ 90 · A+ ≥ 80 · A ≥ 70 · B+ ≥ 60 · B ≥ 55 · C ≥ 50 · P = pass · F = fail · AB = absent</p>
  <div class="sign"><span>Prepared by</span><span>Controller of Examinations</span></div>
</div>`;
};
