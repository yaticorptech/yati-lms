/** A ready-made avatar (bundled illustration or DiceBear), not a real photo. Same rule as the server. */
export const isAvatarPicture = (url) => {
    const v = String(url || '');
    if (!v) return false;
    if (/api\.dicebear\.com/i.test(v)) return true;
    try { return /^\/avatars\/(boys|girls|kids|elders)\//i.test(new URL(v, 'http://x').pathname); } catch { return false; }
};
