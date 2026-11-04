/**
 * The organisers' certificates (the admin's Certificate Builder, 2026-10-31), drawn as they print: the templates are
 * an exact copy of the server's (yaticorp-lms-server/src/competitions/certificates/templates.js — a server test
 * fails when they drift apart), drawn by CertificateCanvas.jsx (a copy of the admin app's).
 */
import './templates.shared.js';

export const CT = globalThis.CERTIFICATE_TEMPLATES;

/** The server's `issued` (competitions/routes/student.js issuedView) → the canvas's pictures; Yaticorp's logo from here. */
export const imagesOfIssued = (issued) => {
    const logo = issued.images?.logo === 'yaticorp' ? '/assets/certificates/yaticorp-logo.png' : issued.images?.logo;
    return { ...issued.images, logo };
};
