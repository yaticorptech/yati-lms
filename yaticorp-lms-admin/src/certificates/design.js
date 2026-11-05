/** The templates (a plain script shared with the server: it sets self.CERTIFICATE_TEMPLATES), and what the canvas is given. */
import './templates.shared.js';

export const CT = globalThis.CERTIFICATE_TEMPLATES;

/** The pictures of a design, for the canvas: Yaticorp's logo (white on a dark template) when it carries Yaticorp's branding. */
export const imagesOf = (template, branding = {}, signatories = []) => {
    const out = { logo: branding.logo || (branding.yaticorp ? '/assets/certificates/yaticorp-logo.png' : ''), seal: branding.seal || '', background: branding.background || '' };
    signatories.forEach((s, i) => { out[`sig${i}`] = s.signature || ''; });
    return out;
};

/** What the canvas draws, from a design and one recipient. */
export const inputOf = (design, recipient, certId) => ({
    recipient: { name: recipient?.name, institution: recipient?.institution, course: recipient?.course },
    details: design.details,
    award: recipient?.award,
    competition: design.competition?.name,
    description: design.description,
    date: design.date,
    venue: design.venue,
    certId: certId || 'YC-XXXX-XXXX',
    signatories: (design.signatories || []).map((s) => ({ name: s.name, designation: s.designation, signature: Boolean(s.signature) })),
    brand: { name: design.branding?.name || '', tagline: design.branding?.tagline || '', org: design.branding?.org || '' },
    hasLogo: Boolean(design.branding?.logo || design.branding?.yaticorp),
    ownLogo: Boolean(design.branding?.logo),
    logoAt: design.branding?.logoAt || null,
    logoShape: design.branding?.logoShape || 'original',
    sealAt: design.branding?.sealAt || null,
    hasSeal: Boolean(design.branding?.seal),
    elements: design.elements || null
});
