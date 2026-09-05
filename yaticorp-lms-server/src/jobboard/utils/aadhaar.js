/**
 * Aadhaar number checks. UIDAI numbers are 12 digits whose last digit is a
 * Verhoeff check digit, so a typo is caught before anything is stored. This
 * is a format check, not UIDAI e-KYC — that needs a licensed OTP flow.
 */
const D = [
    [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],
    [5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]
];
const P = [
    [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],
    [9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]
];

const verhoeffValid = (digits) => {
    let c = 0;
    const rev = digits.split('').reverse();
    for (let i = 0; i < rev.length; i++) c = D[c][P[i % 8][Number(rev[i])]];
    return c === 0;
};

/** Strips spaces and dashes; returns the 12 digits or null when it is not an Aadhaar number. */
const normaliseAadhaar = (raw) => {
    const digits = String(raw || '').replace(/[\s-]/g, '');
    if (!/^[2-9]\d{11}$/.test(digits)) return null; // UIDAI numbers never start with 0 or 1
    return verhoeffValid(digits) ? digits : null;
};

module.exports = { normaliseAadhaar, verhoeffValid };
