/**
 * Client-side mirror of the server's Aadhaar check, so a typo is flagged as
 * the student types rather than after a round trip. 12 digits, not starting
 * with 0 or 1, last digit a Verhoeff check digit.
 */
const D = [
    [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],
    [5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]
];
const P = [
    [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],
    [9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]
];

export const aadhaarDigits = (raw) => String(raw || '').replace(/\D/g, '').slice(0, 12);

export const isValidAadhaar = (raw) => {
    const digits = aadhaarDigits(raw);
    if (!/^[2-9]\d{11}$/.test(digits)) return false;
    let c = 0;
    const rev = digits.split('').reverse();
    for (let i = 0; i < rev.length; i++) c = D[c][P[i % 8][Number(rev[i])]];
    return c === 0;
};

/** 1234 5678 9012 — how the number is printed on the card. */
export const formatAadhaar = (raw) => aadhaarDigits(raw).replace(/(\d{4})(?=\d)/g, '$1 ');
