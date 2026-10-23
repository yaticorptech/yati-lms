/**
 * A thesis as a Word document: the title page, a contents list Word can
 * update with page numbers, then each chapter on a new page with its
 * headings and bullet points as Word headings and lists — ready for the
 * university's own template, the supervisor's tracked changes, or printing.
 */
const { buildDocx, paragraph, pageBreak, contentsField } = require('./docx');
const { blocksOf } = require('./textBlocks');

const renderThesisDocx = (thesis, author) => {
    const body = [];
    body.push(paragraph(thesis.title, { style: 'Title' }));
    if (thesis.degree) body.push(paragraph({ text: `A thesis submitted for the degree of ${thesis.degree}`, italic: true }, { align: 'center' }));
    if (thesis.field) body.push(paragraph(thesis.field, { align: 'center' }));
    body.push(paragraph('', { spaceAfter: 1200 }));
    if (author) body.push(paragraph({ text: author, bold: true, size: 14 }, { align: 'center' }));
    if (thesis.supervisor) body.push(paragraph(`Supervisor: ${thesis.supervisor}`, { align: 'center' }));
    if (thesis.university) body.push(paragraph(thesis.university, { align: 'center' }));
    body.push(paragraph({ text: `Draft of ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, italic: true, size: 10 }, { align: 'center', spaceBefore: 600 }));

    body.push(pageBreak());
    body.push(paragraph({ text: 'Contents', bold: true, size: 16 }, { spaceAfter: 240 }));
    body.push(contentsField(thesis.chapters.map((c, i) => `${i + 1}. ${c.title}`)));
    body.push(paragraph('In Word, right-click the contents and choose Update Field to add page numbers.', { style: 'Subtle' }));

    thesis.chapters.forEach((c, i) => {
        body.push(paragraph(`${i + 1}. ${c.title}`, { style: 'Heading1', pageBreakBefore: true }));
        const blocks = blocksOf(c.content);
        if (!blocks.length) body.push(paragraph({ text: '(Not written yet.)', italic: true, color: '6B7280' }));
        for (const b of blocks) {
            if (b.type === 'heading') body.push(paragraph(b.text, { style: 'Heading2' }));
            else if (b.type === 'bullet') body.push(paragraph(b.text, { style: 'ListBullet' }));
            else body.push(paragraph(b.text, { align: 'both' }));
        }
    });

    return buildDocx({ title: thesis.title, author, body });
};

module.exports = { renderThesisDocx };
