/** AADHAAR_PROVIDER: offline-qr (default) | mock (dev only, refused in production) | production. */
const { ProviderError } = require('./AadhaarVerificationProvider');
const { MockAadhaarVerificationProvider } = require('./MockAadhaarVerificationProvider');
const { OfflineQrAadhaarVerificationProvider } = require('./OfflineQrAadhaarVerificationProvider');
const { ProductionAadhaarVerificationProvider, configured } = require('./ProductionAadhaarVerificationProvider');
let instance = null;
const choose = () => {
    const isProd = process.env.NODE_ENV === 'production';
    const wanted = String(process.env.AADHAAR_PROVIDER || 'offline-qr').toLowerCase();
    if (wanted === 'offline-qr' || wanted === 'offline') { console.log('[aadhaar] Using the offline Secure-QR provider: card QR + linked-mobile hash + SMS OTP.'); return new OfflineQrAadhaarVerificationProvider(); }
    if (wanted === 'mock') {
        if (isProd) { console.error('[aadhaar] AADHAAR_PROVIDER=mock is not allowed in production. Using the production provider.'); return new ProductionAadhaarVerificationProvider(); }
        console.warn('[aadhaar] Using the MOCK Aadhaar provider — development only. OTP is AADHAAR_MOCK_OTP (default 123456).'); return new MockAadhaarVerificationProvider();
    }
    if (!configured()) console.warn('[aadhaar] Production provider selected but not configured — identity verification will answer "unavailable".');
    return new ProductionAadhaarVerificationProvider();
};
module.exports = { getAadhaarProvider: () => (instance ||= choose()), ProviderError };
