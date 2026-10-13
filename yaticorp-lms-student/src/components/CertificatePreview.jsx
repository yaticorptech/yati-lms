/**
 * The picture of a certificate the LMS issued: the same design the PDF is
 * printed on (public/certificates/cert_template.jpg, a lighter copy of the
 * server's public/assets/cert_template.jpg), with the student's name, the
 * course, the certificate number and the dates written where the PDF writes
 * them (server: controllers/certificateController.js). Positions and sizes
 * are the PDF's own, in points on an A4 landscape page, turned into shares of
 * the picture's width so it reads the same at any size.
 *
 * Drawn here rather than fetched: downloading the PDF is charged to the
 * wallet, and a preview must cost nothing.
 */
const PAGE_W = 841.89;
const PAGE_H = 595.28;

const at = (x, y, size) => ({
    left: `${(x / PAGE_W) * 100}%`,
    top: `${(y / PAGE_H) * 100}%`,
    fontSize: `${(size / PAGE_W) * 100}cqw`
});

const day = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');

export default function CertificatePreview({ name, course, number, issuedAt }) {
    const date = day(issuedAt);
    const serif = { fontFamily: '"Times New Roman", Times, serif' };
    return (
        <div className="relative aspect-[842/595] w-full overflow-hidden bg-white text-black [container-type:inline-size]" data-certificate-preview>
            <img src="/certificates/cert_template.jpg" alt="" className="absolute inset-0 h-full w-full" />
            {number && <span className="absolute whitespace-nowrap leading-tight" style={{ ...at(218, 107, 11), ...serif, color: '#bc2a2a' }}>{number}</span>}
            <span className="absolute max-w-[58%] truncate font-bold leading-tight" style={{ ...at(95, 240, 36), ...serif }}>{name}</span>
            <span className="absolute line-clamp-2 font-bold leading-tight" style={{ ...at(95, 320, 22), ...serif, width: `${(450 / PAGE_W) * 100}%` }}>{course}</span>
            {date && (
                <>
                    <span className="absolute text-center font-bold leading-tight" style={{ ...at(315, 498, 7), width: `${(80 / PAGE_W) * 100}%`, fontFamily: 'Helvetica, Arial, sans-serif' }}>{date}</span>
                    <span className="absolute whitespace-nowrap leading-tight" style={{ ...at(470, 523, 10), ...serif }}>Date: {date}</span>
                    <span className="absolute whitespace-nowrap leading-tight" style={{ ...at(600, 295, 14), ...serif }}>Issued on: {date}</span>
                </>
            )}
        </div>
    );
}
