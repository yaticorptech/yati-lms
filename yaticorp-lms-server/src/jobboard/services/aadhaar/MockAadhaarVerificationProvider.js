/** DEVELOPMENT ONLY. Accepts MOCK-AADHAAR:<name>:<10 digits> (EXPIRED → QR_EXPIRED) or anything shaped like a real QR; fixed OTP AADHAAR_MOCK_OTP (123456). Verifies nobody. */
const crypto = require('crypto');
const { AadhaarVerificationProvider, ProviderError } = require('./AadhaarVerificationProvider');
class MockAadhaarVerificationProvider extends AadhaarVerificationProvider {
    constructor() { super(); this.otp = String(process.env.AADHAAR_MOCK_OTP || '123456'); }
    get name() { return 'mock'; } get isMock() { return true; }
    async startVerification() { return { sessionId: `mock-${crypto.randomUUID()}` }; }
    async validateQRCode({ qrPayload }) {
        const t = String(qrPayload || '').trim();
        if (!t) throw new ProviderError('QR_UNREADABLE', 'The QR code could not be read.');
        if (/EXPIRED/i.test(t)) throw new ProviderError('QR_EXPIRED', 'This Aadhaar QR code has expired.');
        const test = t.match(/^MOCK-AADHAAR:([^:]{1,80}):(\d{10})\s*$/i);
        if (!test && !/^\d{200,}$/.test(t) && !/<PrintLetterBarcodeData/i.test(t)) throw new ProviderError('INVALID_QR', 'That is not an Aadhaar QR code.');
        const reference = JSON.stringify({ id: crypto.randomUUID(), name: test ? test[1] : 'Card holder', last4: '0000', mobileLast4: test ? test[2].slice(-4) : '0000' });
        return { reference, maskedMobile: `******${test ? test[2].slice(-4) : '0000'}`, card: { name: test ? test[1] : 'Card holder', last4: '0000', format: 'mock', mobileLinked: true } };
    }
    async sendOTP({ reference }) { const c = JSON.parse(reference); return { transactionId: JSON.stringify({ exp: Date.now() + 120000 }), expiresInSeconds: 120, maskedMobile: `******${c.mobileLast4}`, delivery: { simulated: true, provider: 'mock' } }; }
    async verifyOTP({ transactionId, otp, attempts = 0 }) {
        const s = JSON.parse(transactionId);
        if (Date.now() > s.exp) throw new ProviderError('OTP_EXPIRED', 'This code has expired. Request a new one.');
        if (attempts >= 5) throw new ProviderError('TOO_MANY_ATTEMPTS', 'Too many attempts. Request a new code.', 429);
        if (String(otp) !== this.otp) throw new ProviderError('INVALID_OTP', 'That code is not right.');
        return { verified: true, verifiedAt: new Date(), mobileLinked: true };
    }
    async getVerificationStatus() { return { status: 'PENDING' }; }
}
module.exports = { MockAadhaarVerificationProvider };
