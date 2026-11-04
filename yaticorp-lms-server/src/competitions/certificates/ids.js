/** A certificate's ID: 'YC-7K2Q-9MXA' — no 0/O or 1/I, so it reads back without mistakes. */
const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newId = () => {
    const c = [...crypto.randomBytes(8)].map((x) => ALPHABET[x % ALPHABET.length]).join('');
    return `YC-${c.slice(0, 4)}-${c.slice(4)}`;
};

module.exports = { newId };
