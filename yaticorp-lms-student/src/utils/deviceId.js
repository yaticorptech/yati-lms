/**
 * This browser's (or app's) own id for the device limit (server: services/deviceGuard.js): made
 * once and kept, so the same laptop or phone is always the same device. Sent on every request
 * with a readable name ("Chrome on Windows") that the student sees in their device list.
 */
const KEY = 'yati:device-id';

export const getDeviceId = () => {
    try {
        let id = localStorage.getItem(KEY);
        if (!id) {
            id = (crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`).replace(/[^A-Za-z0-9-]/g, '');
            localStorage.setItem(KEY, id);
        }
        return id;
    } catch {
        return '';
    }
};

// Phone makers from the model code Android reports (SM-S918B, 2201117TI, A065, V2145…).
const BRANDS = [
    [/^SM-|^GT-|galaxy/i, 'Samsung'],
    [/redmi/i, 'Redmi'], [/poco/i, 'POCO'], [/^M\d{4}[A-Z]|^\d{4,5}[A-Z0-9]{3,7}$|^mi\b|xiaomi/i, 'Xiaomi'],
    [/^A0[0-9]{2}$|nothing/i, 'Nothing'],
    [/^I\d{4}|iqoo/i, 'iQOO'], [/^V\d{4}|vivo/i, 'vivo'],
    [/^RMX|realme/i, 'realme'], [/oneplus|^(LE|IN|KB|NE|GM|HD|PJ[A-Z])\d{3,4}/i, 'OnePlus'], [/^CPH\d|^PH[A-Z]\d|oppo/i, 'OPPO'],
    [/pixel/i, 'Google'], [/moto|^XT\d/i, 'Motorola'], [/nokia|^TA-\d/i, 'Nokia'],
    [/huawei|^(ELE|VOG|ANE|JNY|MAR)-/i, 'Huawei'], [/honor/i, 'Honor'],
    [/infinix|^X6\d{2}/i, 'Infinix'], [/tecno|^(KE|KF|BE|CK|LH)\d/i, 'Tecno'], [/lava/i, 'Lava'], [/micromax/i, 'Micromax'], [/^itel|^A\d{3}L/i, 'itel']
];
const MODEL_KEY = 'yati:device-model';

/** The phone's model: from Chrome's client hints (cached), or the user agent when it still names one. */
const modelOf = (ua) => {
    try { const saved = localStorage.getItem(MODEL_KEY); if (saved) return saved; } catch { /* storage off */ }
    const m = ua.match(/Android [\d.]+;\s*([^;)]+?)(?:\s+Build\/|\)|;)/);
    const model = m?.[1]?.trim();
    return model && model !== 'K' && !/^wv$/i.test(model) ? model : '';
};

/** "Samsung SM-S918B" from the model code, or the code itself when the maker is unknown. */
const phoneName = (model) => {
    const brand = BRANDS.find(([re]) => re.test(model))?.[1];
    return brand && !model.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${model}` : model;
};

// Chrome on Android hides the model in its user agent ("Android 10; K") but tells it when asked.
if (typeof navigator !== 'undefined' && navigator.userAgentData?.mobile && navigator.userAgentData.getHighEntropyValues) {
    navigator.userAgentData.getHighEntropyValues(['model']).then(({ model }) => {
        try { if (model) localStorage.setItem(MODEL_KEY, model); } catch { /* storage off */ }
    }).catch(() => {});
}

export const deviceName = () => {
    const ua = navigator.userAgent || '';
    const browser = /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Edg/.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const app = window.Capacitor?.isNativePlatform?.();
    // A phone or tablet by maker and model: what a student recognises when choosing one to remove.
    if (/Android/.test(ua)) {
        const model = modelOf(ua);
        const what = model ? phoneName(model) : /Mobile/.test(ua) ? 'Android phone' : 'Android tablet';
        return app ? `${what} · YATICORP app` : `${what} · ${browser}`;
    }
    const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? (navigator.maxTouchPoints > 1 ? 'iPad' : 'Mac') : /CrOS/.test(ua) ? 'Chromebook' : /Linux/.test(ua) ? 'Linux' : 'device';
    if (os === 'iPhone' || os === 'iPad') return app ? `${os} · YATICORP app` : `${os} · ${browser}`;
    return app ? `YATICORP app on ${os}` : `${browser} on ${os}`;
};

/** Headers for a request: this device's id and name. */
export const deviceHeaders = () => {
    const id = getDeviceId();
    return id ? { 'X-Device-Id': id, 'X-Device-Name': deviceName() } : {};
};
