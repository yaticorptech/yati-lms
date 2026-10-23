/**
 * The picture of a Games & Competitions certificate: the PDF the server draws
 * (server: competitions/services/certificate.js), redrawn here with the same
 * words at the same places — points on an A4 landscape page, turned into
 * shares of the picture's width, as CertificatePreview does for courses — so
 * the frame on My Profile shows the certificate itself: the designed winners'
 * certificate for 1st, 2nd and 3rd (WinnerPreview), the plain indigo one for
 * participation.
 *
 * Drawn here rather than fetched, so the preview costs nothing.
 */
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const ORDINAL = { 1: '1st', 2: '2nd', 3: '3rd' };
const GOLD = '#b7791f';
const INK = '#1e1b4b';
const INDIGO = '#4f46e5';
const SERIF = '"Times New Roman", Times, serif';
const SANS = 'Helvetica, Arial, sans-serif';

const pct = (v, of) => `${(v / of) * 100}%`;
const size = (pt) => `${(pt / PAGE_W) * 100}cqw`;
/** A line of centred text whose top is `y` points down the page. */
const line = (y, pt, style) => ({ top: pct(y, PAGE_H), fontSize: size(pt), ...style });

/*
 * 1st, 2nd and 3rd: the designed certificate (the account owner's, 2026-10-10)
 * — public/certificates/competition_winner.jpg, a lighter copy of the server's
 * template — with the server's own lines (`words`) written where the PDF
 * writes them. Positions and sizes are in the template's pixels (1500 × 1049),
 * the same numbers as competitions/services/certificate.js on the server.
 */
const TPL_W = 1500;
const TPL_H = 1049;
const RED = '#8b1418';
const at = (x, y, px, style) => ({ left: `${(x / TPL_W) * 100}%`, top: `${(y / TPL_H) * 100}%`, fontSize: `${(px / TPL_W) * 100}cqw`, ...style });

const WinnerPreview = ({ c }) => {
    const w = c.words;
    return (
        <div className="relative aspect-[1500/1049] w-full overflow-hidden bg-white [container-type:inline-size]" data-competition-certificate data-winner>
            <img src="/certificates/competition_winner.jpg" alt="" className="absolute inset-0 h-full w-full" />
            <span className="absolute whitespace-nowrap leading-none" style={at(155, 314, 30, { color: '#1f1f1f', fontFamily: SANS })}>{w.subtitle}</span>
            <span className="absolute truncate font-bold leading-none" style={at(152, 392, 84, { color: RED, fontFamily: SERIF, maxWidth: `${(560 / TPL_W) * 100}%` })}>{c.playerName}</span>
            <span className="absolute whitespace-nowrap leading-none" style={at(157, 519, 26, { color: '#1f1f1f', fontFamily: SANS })}>{w.lead}</span>
            <span className="absolute truncate font-bold leading-none" style={at(155, 556, 48, { color: RED, fontFamily: SERIF, maxWidth: `${(800 / TPL_W) * 100}%` })}>{c.name}</span>
            <span className="absolute" style={at(157, 636, 24, { color: '#222', fontFamily: SANS, width: `${(735 / TPL_W) * 100}%`, lineHeight: 33 / 24 })}>{w.paragraph}</span>
            <span className="absolute whitespace-nowrap leading-none" style={at(838, 930, 19, { color: '#111', fontFamily: SERIF })}>Date: {w.date}</span>
        </div>
    );
};

export default function CompetitionCertificatePreview({ certificate: c }) {
    if (c.place && c.words) return <WinnerPreview c={c} />;
    const winner = !!c.place;
    const y = (placed, other) => (winner ? placed : other);
    const why = winner
        ? `${c.place === 1 ? 'for winning' : `for finishing ${c.place === 2 ? 'runner-up' : 'third'}`} with ${c.teamName} (${c.collegeName})`
        : `for representing ${c.collegeName} as part of ${c.teamName}`;
    const when = c.completedAt ? new Date(c.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const centred = 'absolute inset-x-0 px-[4%] text-center leading-tight';
    const ring = (r) => ({ left: pct(PAGE_W / 2 - r, PAGE_W), top: pct(112 - r, PAGE_H), width: pct(2 * r, PAGE_W) });

    return (
        <div className="relative aspect-[842/595] w-full overflow-hidden [container-type:inline-size]" style={{ background: '#fffdf7' }} data-competition-certificate>
            {/* The two borders */}
            <span aria-hidden="true" className="absolute" style={{ inset: `${pct(17, PAGE_H)} ${pct(17, PAGE_W)}`, border: `${size(10)} solid ${winner ? GOLD : INDIGO}` }} />
            <span aria-hidden="true" className="absolute" style={{ inset: `${pct(38, PAGE_H)} ${pct(38, PAGE_W)}`, border: `${size(1.5)} solid ${winner ? '#d69e2e' : '#a5b4fc'}` }} />

            {/* The rosette, for the placed */}
            {winner && (
                <>
                    <span aria-hidden="true" className="absolute aspect-square rounded-full" style={{ ...ring(36), background: GOLD }} />
                    <span className="absolute flex aspect-square items-center justify-center rounded-full font-bold" style={{ ...ring(28), background: '#f6e05e', color: INK, fontSize: size(20), fontFamily: SANS }}>{ORDINAL[c.place]}</span>
                </>
            )}

            <span className={`${centred} font-bold uppercase`} style={line(y(160, 110), 13, { color: winner ? GOLD : INDIGO, letterSpacing: size(4), fontFamily: SANS })}>
                {winner ? 'Certificate of achievement' : 'Certificate'}
            </span>
            <span className={`${centred} font-bold`} style={line(y(182, 132), 34, { color: INK, fontFamily: SERIF })}>{c.title}</span>
            <span className={centred} style={line(y(236, 196), 13, { color: '#475569', fontFamily: SANS })}>This certificate is presented to</span>
            <span className={`${centred} truncate font-bold italic`} style={line(y(258, 218), 36, { color: INK, fontFamily: SERIF })}>{c.playerName}</span>
            <span className={`${centred} line-clamp-2`} style={line(y(312, 272), 14, { color: '#334155', fontFamily: SANS })}>{why}</span>
            <span className={`${centred} line-clamp-2 font-bold`} style={line(y(338, 298), 16, { color: INK, fontFamily: SANS })}>{c.name} — {c.gameLabel}</span>
            <span className={centred} style={line(PAGE_H - 120, 11, { color: '#64748b', fontFamily: SANS })}>Organized by {c.organizedBy}{when ? `  ·  ${when}` : ''}</span>
            <span aria-hidden="true" className="absolute" style={{ left: pct(PAGE_W / 2 - 110, PAGE_W), width: pct(220, PAGE_W), top: pct(PAGE_H - 86, PAGE_H), borderTop: `${size(1)} solid #cbd5e1` }} />
            <span className={centred} style={line(PAGE_H - 80, 10, { color: '#475569', fontFamily: SANS })}>YATICORP LMS · Games &amp; Competitions</span>
        </div>
    );
}
