/**
 * Wallet rules on the client side. The server charges priced features
 * (downloads, the Global Quiz, mock interviews, rebuilding the roadmap,
 * part-time applications, job listings) and says so in X-Wallet-Charged;
 * the balance shown everywhere is then refreshed. A refusal is a 402 with a
 * message that says what the feature costs — for a file download that answer
 * arrives as a Blob, so it is read back into an object the page can show.
 */
export const onWalletResponse = (response) => {
    const charged = Number(response?.headers?.['x-wallet-charged']);
    if (charged > 0 && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('yati:progress-changed'));
        window.dispatchEvent(new CustomEvent('yati:wallet-charged', { detail: { amount: charged } }));
    }
    return response;
};

// ── Ask first (2026-10-28) ──────────────────────────────────────────────────
// Every request says the app can ask (X-Wallet-Ask). A priced feature is then
// answered 428 WALLET_CONFIRM with its price and the balance; the student
// sees WalletConfirmDialog, and on "Pay" the same request goes again with
// X-Wallet-Confirm set to the price agreed. A free feature, or one already
// paid for, is never asked about: the server only asks when money will move.

/** What a cancelled payment rejects with; pages check isWalletCancel and stay quiet. */
export const WALLET_CANCELLED = 'Cancelled. Nothing was taken from your wallet.';
export const isWalletCancel = (e) => !!e && (e.walletCancelled || e.code === 'WALLET_CANCELLED' || e.response?.data?.code === 'WALLET_CANCELLED' || e.message === WALLET_CANCELLED);

/** Request interceptor: this app can ask before a price is taken. */
export const askWallet = (config) => {
    if (config.headers) config.headers['X-Wallet-Ask'] = '1';
    return config;
};

/**
 * Show the price and wait for the student's answer. WalletConfirmDialog
 * (mounted in the student layout) claims the question; a screen without it
 * falls back to the browser's own confirm box rather than waiting forever.
 */
export const askWalletConfirm = (detail) => new Promise((resolve) => {
    let claimed = false;
    window.dispatchEvent(new CustomEvent('yati:wallet-confirm', { detail: { ...detail, claim: () => { claimed = true; }, resolve } }));
    if (!claimed) {
        const ok = window.confirm(`${detail.message || 'This uses wallet points.'} ${priceLabel(detail.amount, detail.currency)} will be taken from your wallet balance of ${priceLabel(detail.balance, detail.currency)}. Continue?`);
        if (ok) detail.beforeConfirm?.();
        resolve(ok);
    }
});

const cancelled = (config) => {
    const e = new Error(WALLET_CANCELLED);
    e.walletCancelled = true;
    e.code = 'WALLET_CANCELLED';
    e.config = config;
    e.response = { status: 499, data: { code: 'WALLET_CANCELLED', message: WALLET_CANCELLED }, headers: {}, config };
    return e;
};

const confirmAndRetry = async (error, client) => {
    const { config } = error;
    const d = error.response.data || {};
    // Asked twice for the same request (a price changed in between) is fine; a third time is a fault.
    if ((config.walletAsked || 0) >= 2) return Promise.reject(error);
    // `walletBeforeConfirm` runs inside the "Pay" click (a job link opens its tab there).
    const ok = await askWalletConfirm({ action: d.action, label: d.label, message: d.message, amount: d.amount, balance: d.balance, currency: d.currency || 'INR', beforeConfirm: config.walletBeforeConfirm });
    if (!ok) return Promise.reject(cancelled(config));
    const headers = { ...(config.headers?.toJSON ? config.headers.toJSON() : config.headers), 'X-Wallet-Confirm': String(d.amount) };
    return client.request({ ...config, headers, walletAsked: (config.walletAsked || 0) + 1 });
};

/** The response error interceptor. `client` is the axios instance, for asking again after "Pay". */
export const onWalletError = async (error, client) => {
    const res = error?.response;
    if (res && typeof Blob !== 'undefined' && res.data instanceof Blob && /json/.test(res.data.type || res.headers?.['content-type'] || '')) {
        try { res.data = JSON.parse(await res.data.text()); } catch { /* left as it was */ }
    }
    // Read only after the line above: a download's answer arrives as a Blob.
    if (res?.status === 428 && res.data?.code === 'WALLET_CONFIRM' && client && error.config && typeof window !== 'undefined') {
        return confirmAndRetry(error, client);
    }
    // Not enough in the wallet, from any page: one dialog, app-wide, says so
    // and points at Career Path, where XP — and so wallet money — is earned.
    if (res?.status === 402 && typeof window !== 'undefined') {
        const d = res.data || {};
        window.dispatchEvent(new CustomEvent('yati:wallet-short', {
            detail: { message: d.message || d.error || '', needed: d.needed, balance: d.balance, currency: d.currency || 'INR' }
        }));
    }
    return Promise.reject(error);
};

export const isShortOfFunds = (error) => error?.response?.status === 402 || error?.code === 'INSUFFICIENT_FUNDS';

/** The server's own words for a refused or failed request, when it sent any. */
export const serverMessage = (error, fallback) => error?.response?.data?.message || error?.response?.data?.error || fallback;

/** "₹20" for a price in the wallet's currency. */
export const priceLabel = (amount, currency = 'INR') =>
    (currency === 'INR' ? `₹${Number(amount).toLocaleString('en-IN')}` : `${amount} ${currency}`);
