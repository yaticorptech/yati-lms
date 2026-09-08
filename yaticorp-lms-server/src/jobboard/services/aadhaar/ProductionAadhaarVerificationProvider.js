/** Where an authorised e-KYC vendor is connected. Map the four TODO(vendor) calls; answers PROVIDER_UNAVAILABLE until AADHAAR_PROVIDER_BASE_URL and AADHAAR_PROVIDER_API_KEY are set. */
const axios = require('axios');
const { AadhaarVerificationProvider, ProviderError } = require('./AadhaarVerificationProvider');
const configured = () => !!(process.env.AADHAAR_PROVIDER_BASE_URL && process.env.AADHAAR_PROVIDER_API_KEY);
class ProductionAadhaarVerificationProvider extends AadhaarVerificationProvider {
    constructor() { super(); this.http = axios.create({ baseURL: process.env.AADHAAR_PROVIDER_BASE_URL || '', timeout: 15000, headers: { Authorization: `Bearer ${process.env.AADHAAR_PROVIDER_API_KEY || ''}` } }); }
    get name() { return process.env.AADHAAR_PROVIDER_NAME || 'production'; }
    unavailable() { return new ProviderError('PROVIDER_UNAVAILABLE', 'Identity verification is not available right now. Please try again later.', 503); }
    translate(err) {
        if (err instanceof ProviderError) return err;
        const status = err.response?.status, code = String(err.response?.data?.code || err.response?.data?.error_code || '').toUpperCase();
        if (/OTP.*EXPIRED|EXPIRED.*OTP/.test(code)) return new ProviderError('OTP_EXPIRED', 'This code has expired. Request a new one.');
        if (/INVALID.*OTP|OTP.*INVALID|OTP_MISMATCH/.test(code)) return new ProviderError('INVALID_OTP', 'That code is not right.');
        if (/ATTEMPT|LIMIT/.test(code) || status === 429) return new ProviderError('TOO_MANY_ATTEMPTS', 'Too many attempts. Request a new code.', 429);
        if (/EXPIRED/.test(code)) return new ProviderError('QR_EXPIRED', 'This Aadhaar QR code has expired.');
        if (/INVALID|SIGNATURE|MALFORMED/.test(code) || status === 400 || status === 422) return new ProviderError('INVALID_QR', 'That is not a valid Aadhaar QR code.');
        console.error(`[aadhaar:${this.name}] provider error:`, status || err.code || err.message); return this.unavailable();
    }
    async startVerification({ userId }) { if (!configured()) throw this.unavailable(); return { sessionId: `session-${userId}-${Date.now()}` }; }
    async validateQRCode({ qrPayload }) { if (!configured()) throw this.unavailable(); try { const { data } = await this.http.post('/aadhaar/qr/validate', { qr_payload: String(qrPayload) }); /* TODO(vendor) */ if (!data?.reference_id) throw new ProviderError('INVALID_QR', 'That is not a valid Aadhaar QR code.'); return { reference: String(data.reference_id), maskedMobile: data.masked_mobile ? `******${String(data.masked_mobile).slice(-4)}` : '', card: { name: data.name || '', last4: data.last4 || '', format: 'vendor', mobileLinked: true } }; } catch (err) { throw this.translate(err); } }
    async sendOTP({ reference }) { if (!configured()) throw this.unavailable(); try { const { data } = await this.http.post('/aadhaar/otp/send', { reference_id: reference }); /* TODO(vendor) */ return { transactionId: String(data.transaction_id || data.txn_id || ''), expiresInSeconds: Number(data.expires_in) || 120, maskedMobile: data.masked_mobile ? `******${String(data.masked_mobile).slice(-4)}` : '', delivery: { simulated: false, provider: this.name } }; } catch (err) { throw this.translate(err); } }
    async verifyOTP({ reference, transactionId, otp }) { if (!configured()) throw this.unavailable(); try { const { data } = await this.http.post('/aadhaar/otp/verify', { reference_id: reference, transaction_id: transactionId, otp: String(otp) }); /* TODO(vendor) */ if (!data?.verified) throw new ProviderError('INVALID_OTP', 'That code is not right.'); return { verified: true, verifiedAt: new Date(), mobileLinked: true }; } catch (err) { throw this.translate(err); } }
    async getVerificationStatus({ reference }) { if (!configured()) throw this.unavailable(); try { const { data } = await this.http.get(`/aadhaar/status/${encodeURIComponent(reference)}`); const s = String(data?.status || '').toUpperCase(); return { status: ['VERIFIED', 'FAILED', 'EXPIRED'].includes(s) ? s : 'PENDING' }; } catch (err) { throw this.translate(err); } }
}
module.exports = { ProductionAadhaarVerificationProvider, configured };
