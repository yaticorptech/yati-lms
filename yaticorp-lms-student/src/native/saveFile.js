import { Capacitor } from '@capacitor/core';
import { safeFileName } from './links';

const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });

/**
 * Hands a file to the student. On the web, the browser's own download. In
 * the app, where a web view cannot save a download, the file is written to
 * the app's cache and offered through the system share sheet — Files, Drive,
 * AirDrop, mail, whatever the phone has.
 */
export async function saveBlob(blob, fileName, { title } = {}) {
    const name = safeFileName(fileName);
    if (!Capacitor.isNativePlatform()) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
    }
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
    const { uri } = await Filesystem.writeFile({ path: name, data: await blobToBase64(blob), directory: Directory.Cache });
    try {
        await Share.share({ title: title || name, url: uri, dialogTitle: title || name });
    } catch {
        // The share sheet was dismissed. The file is saved; nothing to report.
    }
}

/** Opens a page outside the app: the system browser sheet in the app, a new tab on the web. */
export async function openExternal(url) {
    if (!url) return;
    if (!Capacitor.isNativePlatform()) {
        window.open(url, '_blank', 'noopener');
        return;
    }
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
}
