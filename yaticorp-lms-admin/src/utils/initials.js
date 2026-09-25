/** Up to two initials from a name, for an avatar with no picture. */
const initials = (name = '') =>
    (name || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

export default initials;
