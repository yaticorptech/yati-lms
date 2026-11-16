/** The card number in a scanned QR code: the longest run of digits (the code may be a link). */
export const cardNumberOf = (text) => (String(text || '').match(/\d{6,}/g) || []).sort((a, b) => b.length - a.length)[0] || String(text || '').trim();
