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

/*
 * The winners' certificate: the account owner's design (2026-10-10), the red
 * "Games Competition" banner with the trophy, the founder's signature and the
 * QR code. public/assets/competition_winner_template.jpg is that
 * design with the words that change taken out; they are written back here.
 *
 * Every position is in the template picture's own pixels (1500 × 1049), so the
 * student app's preview (CompetitionCertificatePreview.jsx) can use the same
 * numbers on its copy of the picture.
 */
const path = require('path');
const fs = require('fs');
const WINNER_TEMPLATE = path.join(__dirname, '..', '..', '..', 'public', 'assets', 'competition_winner_template.jpg');
const TPL_W = 1500;
const TPL_H = 1049;
const RED = '#8b1418';
const LEAD = { 1: 'has won first place in the', 2: 'has finished runner-up in the', 3: 'has finished third in the' };

/** The words on a winner's certificate — shared with the preview's wording. */
const winnerWords = ({ competition, team, place }) => ({
    subtitle: `of Achievement — ${TITLE[place]}`,
    lead: LEAD[place],
    paragraph: `This certificate is awarded in recognition of your outstanding performance with ${team.teamName} (${team.collegeName}) in ${GAME[competition.game] || competition.game}. Your achievement reflects your skill, team spirit and sportsmanship, and the effort you brought to every match.`,
    date: (competition.completedAt ? new Date(competition.completedAt) : new Date()).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
});

/** The largest size, down to `min`, at which `text` fits `width` points. */
const fit = (doc, text, font, size, width, min) => {
    let s = size;
    doc.font(font);
    while (s > min && doc.fontSize(s).widthOfString(text) > width) s -= 0.5;
    return s;
};

const drawWinner = (doc, { competition, team, playerName, place }) => {
    const W = doc.page.width;
    const H = doc.page.height;
    const X = (px) => (px / TPL_W) * W;
    const Y = (px) => (px / TPL_H) * H;
    const words = winnerWords({ competition, team, place });

    doc.image(WINNER_TEMPLATE, 0, 0, { width: W, height: H });
    doc.fillColor('#1f1f1f').font('Helvetica').fontSize(X(30)).text(words.subtitle, X(155), Y(314), { lineBreak: false });
    doc.fillColor(RED).font('Times-Bold').fontSize(fit(doc, playerName, 'Times-Bold', X(84), X(560), 22)).text(playerName, X(152), Y(392), { lineBreak: false });
    doc.fillColor('#1f1f1f').font('Helvetica').fontSize(X(26)).text(words.lead, X(157), Y(519), { lineBreak: false });
    doc.fillColor(RED).font('Times-Bold').fontSize(fit(doc, competition.name, 'Times-Bold', X(48), X(800), 14)).text(competition.name, X(155), Y(556), { lineBreak: false });
    doc.fillColor('#222222').font('Helvetica').fontSize(X(24)).text(words.paragraph, X(157), Y(636), { width: X(735), lineGap: X(9) });
    // The date, under the digital signature. (The design's stamp was taken
    // off at the account owner's request, 2026-10-10, and its date with it.)
    doc.fillColor('#111111').font('Times-Roman').fontSize(X(19)).text(`Date: ${words.date}`, X(838), Y(930), { lineBreak: false });
};

const draw = (res, { competition, team, playerName, place }) => {
    const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 0 });
    const name = `${competition.name}`.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'Competition';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Certificate_${name}.pdf"`);
    doc.pipe(res);

    // 1st, 2nd and 3rd: the designed certificate. Without its picture (a
    // deploy that left it out), they get the plain one below rather than none.
    if (place && fs.existsSync(WINNER_TEMPLATE)) {
        drawWinner(doc, { competition, team, playerName, place });
        doc.end();
        return;
    }

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

module.exports = { draw, eligible, winnerWords, TITLE, GAME };
