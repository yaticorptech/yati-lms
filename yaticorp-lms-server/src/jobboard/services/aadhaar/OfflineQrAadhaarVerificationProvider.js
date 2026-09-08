/**
 * Offline Aadhaar verification: the card's Secure QR is read, the mobile the
 * student types is matched against the hash inside it, and an OTP goes to
 * that number through the LMS SMS service. Proves a valid card, the linked
 * mobile, and that the student holds the phone. Not UIDAI e-KYC. Stateless:
 * the card summary rides in `reference`, the OTP session in `transactionId`
 * (both encrypted by the service); the OTP itself is kept only as an HMAC.
 */
const crypto = require('crypto');
const { AadhaarVerificationProvider, ProviderError } = require('./AadhaarVerificationProvider');
const { parseAadhaarQr, mobileMatches, verifySignature, QrParseError } = require('./secureQr');
const { sendSms, normaliseIndianMobile, maskMobile } = require('../../../services/smsService');
const OTP_TTL_SECONDS = 120, MAX_ATTEMPTS = 5;
const otpKey = () => crypto.createHash('sha256').update(`otp:${process.env.VERIFICATION_ENCRYPTION_KEY || ''}:${process.env.JWT_SECRET || 'yati'}`).digest();
const otpMac = (otp, nonce) => crypto.createHmac('sha256', otpKey()).update(`${nonce}:${otp}`).digest('hex');
const mask4 = (d) => `******${String(d).slice(-4)}`;
class OfflineQrAadhaarVerificationProvider extends AadhaarVerificationProvider {
    get name() { return 'offline-qr'; }
    get requiresMobile() { return true; }
    async startVerification() { return { sessionId: `offline-${crypto.randomUUID()}` }; }
    async validateQRCode({ qrPayload }) {
        let card; try { card = parseAadhaarQr(qrPayload); } catch (err) { if (err instanceof QrParseError) throw new ProviderError(err.code, err.message); throw new ProviderError('QR_UNREADABLE', 'The QR code could not be read.'); }
        const signatureVerified = verifySignature(card);
        if (signatureVerified === false) throw new ProviderError('INVALID_QR', 'This Aadhaar QR failed its signature check.');
        const reference = JSON.stringify({ id: crypto.randomUUID(), format: card.format, last4: card.last4, name: card.name, mobileHash: card.mobileHash, flagKnown: card.flagKnown !== false, hashRounds: card.hashRounds, mobileLast4: card.mobileLast4, at: Date.now() });
        return { reference, maskedMobile: card.mobileLast4 ? mask4(card.mobileLast4) : '', card: { name: card.name, last4: card.last4, format: card.format, mobileLinked: !!card.mobileHash && card.flagKnown !== false, signatureVerified } };
    }
    async sendOTP({ reference, mobile }) {
        const card = JSON.parse(reference);
        const e164 = normaliseIndianMobile(mobile);
        if (!e164) throw new ProviderError('MOBILE_REQUIRED', 'Enter the 10-digit mobile number linked with your Aadhaar.');
        const ten = e164.slice(-10);
        const matched = !!card.mobileHash && mobileMatches(card, ten);
        if (card.mobileHash && !matched && card.flagKnown !== false) throw new ProviderError('MOBILE_MISMATCH', 'That number is not the mobile linked with this Aadhaar. Enter the number registered with UIDAI.');
        const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
        const nonce = crypto.randomUUID();
        const sms = await sendSms(e164, `${otp} is your YATICORP LMS verification code for Aadhaar ending ${card.last4}. It expires in 2 minutes. Do not share it.`);
        if (!sms.sent) throw new ProviderError('PROVIDER_UNAVAILABLE', 'The verification SMS could not be sent right now. Try again in a moment.', 503);
        return { transactionId: JSON.stringify({ n: nonce, h: otpMac(otp, nonce), m: e164, exp: Date.now() + OTP_TTL_SECONDS * 1000, mobileLinked: matched }), expiresInSeconds: OTP_TTL_SECONDS, maskedMobile: mask4(ten), delivery: { simulated: !!sms.simulated, provider: sms.provider } };
    }
    async verifyOTP({ transactionId, otp, attempts = 0 }) {
        let s; try { s = JSON.parse(transactionId); } catch { throw new ProviderError('OTP_EXPIRED', 'Request a new code.'); }
        if (Date.now() > s.exp) throw new ProviderError('OTP_EXPIRED', 'This code has expired. Request a new one.');
        if (attempts >= MAX_ATTEMPTS) throw new ProviderError('TOO_MANY_ATTEMPTS', 'Too many attempts. Request a new code.', 429);
        const a = Buffer.from(s.h, 'hex'), b = Buffer.from(otpMac(String(otp), s.n), 'hex');
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new ProviderError('INVALID_OTP', 'That code is not right.');
        return { verified: true, verifiedAt: new Date(), mobile: maskMobile(s.m), mobileLinked: s.mobileLinked };
    }
    async getVerificationStatus() { return { status: 'PENDING' }; }
}
module.exports = { OfflineQrAadhaarVerificationProvider };
