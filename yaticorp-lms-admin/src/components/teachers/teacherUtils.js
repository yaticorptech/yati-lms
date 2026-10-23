/**
 * What the teacher screens share that is not a component: the spreadsheet
 * template, reading a server refusal, and the words for a teacher's status.
 * Used by the platform's Teachers page and the organization's own.
 */
import * as XLSX from 'xlsx';

export const TEMPLATE_COLUMNS = ['Name', 'Email', 'Phone', 'CardNumber', 'CVV', 'QRCodeNumber', 'Password', 'Institution', 'Department', 'Designation'];

/** The Excel file to fill in for Bulk upload, with two example rows. */
export const downloadTeacherTemplate = () => {
    const sheet = XLSX.utils.aoa_to_sheet([
        TEMPLATE_COLUMNS,
        ['Dr. Asha Rao', 'asha.rao@college.edu', '9845012345', '123456789012', 'AB123', 'QR123456', 'Teach@2026a', 'Govt. First Grade College', 'Education', 'Assistant Professor'],
        ['Meera Iyer', 'meera.iyer@college.edu', '9845012346', '210987654321', 'CD456', 'QR654321', 'Teach@2026b', 'Govt. First Grade College', 'Physics', 'Associate Professor']
    ]);
    sheet['!cols'] = [22, 28, 14, 16, 8, 14, 14, 28, 16, 22].map((wch) => ({ wch }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Teachers');
    XLSX.writeFile(book, 'teachers_template.xlsx');
};

/**
 * A refusal from the server as { field, message }. The teacher endpoints
 * answer a form mistake with 400 and name the field it is about.
 */
export const refusal = (err, fallback) => ({
    field: err?.response?.data?.field || '',
    message: err?.response?.data?.message || fallback
});

export const STATUS_LABEL = { active: 'Active', pending: 'Waiting', inactive: 'Blocked' };

/** The password rules the server holds a teacher's password to. */
export const strongPassword = (pw) => pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);

/** "12,400" — numbers as Indian readers write them. */
export const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN');

/** "14 Oct 2026", or a dash. */
export const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** Organizations a teacher can be put into: not waiting for approval, not rejected. */
export const assignable = (organizations) => (organizations || []).filter((o) => !['pending', 'rejected'].includes(o.status));
