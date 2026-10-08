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

export const onWalletError = async (error) => {
    const res = error?.response;
    if (res && typeof Blob !== 'undefined' && res.data instanceof Blob && /json/.test(res.data.type || res.headers?.['content-type'] || '')) {
        try { res.data = JSON.parse(await res.data.text()); } catch { /* left as it was */ }
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
