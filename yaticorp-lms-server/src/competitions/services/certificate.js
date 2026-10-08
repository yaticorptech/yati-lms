/**
 * A competition certificate, drawn as a PDF: "Winner — 1st Place" for the
 * placed teams' players, "Certificate of Participation" for everyone else who
 * played for an approved team.
 */
const PDFDocument = require('pdfkit');

const ORDINAL = { 1: '1st', 2: '2nd', 3: '3rd' };
const GAME = { chess: 'Chess', ludo: 'Ludo', carrom: 'Carrom', uno: 'UNO' };
const TITLE = { 1: 'Winner', 2: 'Runner-up', 3: 'Third Place' };

/**
 * Whether this team's players get a certificate: the placed teams when the
 * competition gives winners' certificates, everyone else when it gives
 * participation certificates.
 */
const eligible = (competition, team) => (team?.place ? competition.certificates !== false : competition.participationCertificates !== false);

const draw = (res, { competition, team, playerName, place }) => {
    const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 0 });
    const name = `${competition.name}`.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'Competition';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Certificate_${name}.pdf"`);
    doc.pipe(res);

    const W = doc.page.width;
    const H = doc.page.height;
    const gold = '#b7791f';
    const ink = '#1e1b4b';
    const winner = !!place;

    // Ground and borders.
    doc.rect(0, 0, W, H).fill('#fffdf7');
    doc.lineWidth(10).strokeColor(winner ? gold : '#4f46e5').rect(22, 22, W - 44, H - 44).stroke();
    doc.lineWidth(1.5).strokeColor(winner ? '#d69e2e' : '#a5b4fc').rect(38, 38, W - 76, H - 76).stroke();

    // A rosette for the placed, a ribbon line for everyone.
    if (winner) {
        doc.circle(W / 2, 112, 36).fill(gold);
        doc.circle(W / 2, 112, 28).fill('#f6e05e');
        doc.fillColor(ink).font('Helvetica-Bold').fontSize(20).text(ORDINAL[place], W / 2 - 30, 101, { width: 60, align: 'center' });
    }

    doc.fillColor(winner ? gold : '#4f46e5').font('Helvetica-Bold').fontSize(13)
        .text(winner ? 'CERTIFICATE OF ACHIEVEMENT' : 'CERTIFICATE', 0, winner ? 160 : 110, { width: W, align: 'center', characterSpacing: 4 });
    doc.fillColor(ink).font('Times-Bold').fontSize(34)
        .text(winner ? TITLE[place] : 'Certificate of Participation', 0, winner ? 182 : 132, { width: W, align: 'center' });

    doc.fillColor('#475569').font('Helvetica').fontSize(13)
        .text('This certificate is presented to', 0, winner ? 236 : 196, { width: W, align: 'center' });
    doc.fillColor(ink).font('Times-BoldItalic').fontSize(36)
        .text(playerName, 60, winner ? 258 : 218, { width: W - 120, align: 'center' });

    const line = winner
        ? `${place === 1 ? 'for winning' : `for finishing ${place === 2 ? 'runner-up' : 'third'}`} with ${team.teamName} (${team.collegeName})`
        : `for representing ${team.collegeName} as part of ${team.teamName}`;
    doc.fillColor('#334155').font('Helvetica').fontSize(14)
        .text(line, 80, winner ? 312 : 272, { width: W - 160, align: 'center' });
    doc.fillColor(ink).font('Helvetica-Bold').fontSize(16)
        .text(`${competition.name} — ${GAME[competition.game] || competition.game}`, 80, winner ? 338 : 298, { width: W - 160, align: 'center' });

    const when = (competition.completedAt || new Date()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.fillColor('#64748b').font('Helvetica').fontSize(11)
        .text(`Organized by ${competition.organizedBy || 'YATICORP'}  ·  ${when}`, 0, H - 120, { width: W, align: 'center' });
    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(W / 2 - 110, H - 86).lineTo(W / 2 + 110, H - 86).stroke();
    doc.fillColor('#475569').fontSize(10).text('YATICORP LMS · Games & Competitions', 0, H - 80, { width: W, align: 'center' });
    doc.end();
};

module.exports = { draw, eligible, TITLE };
