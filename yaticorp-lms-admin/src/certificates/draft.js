/**
 * The certificate form, kept in this browser as it is filled in (2026-11-02: "on refresh it must still be there"):
 * IndexedDB, not localStorage, because the logo, seal, signatures and template are pictures of a few MB.
 */
const DB = 'yati-certificates';
const STORE = 'drafts';

const open = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
});
const run = async (mode, fn) => {
    const db = await open();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => { db.close(); resolve(req?.result); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
};

export const loadDraft = (key) => run('readonly', (s) => s.get(key)).catch(() => null);
export const saveDraft = (key, value) => run('readwrite', (s) => s.put(value, key)).catch(() => {});
export const clearDraft = (key) => run('readwrite', (s) => s.delete(key)).catch(() => {});
