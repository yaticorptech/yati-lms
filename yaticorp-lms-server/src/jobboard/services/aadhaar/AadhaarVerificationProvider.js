/**
 * What an Aadhaar verification provider must do. Failures throw a
 * ProviderError with a code: INVALID_QR, QR_EXPIRED, QR_UNREADABLE,
 * INVALID_OTP, OTP_EXPIRED, TOO_MANY_ATTEMPTS, MOBILE_REQUIRED,
 * MOBILE_MISMATCH, PROVIDER_UNAVAILABLE. Never carries the Aadhaar number.
 */
class ProviderError extends Error { constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; } }
class AadhaarVerificationProvider {
    get name() { return 'abstract'; }
    get isMock() { return false; }
    get requiresMobile() { return false; }
    async startVerification() { throw new ProviderError('PROVIDER_UNAVAILABLE', 'Not implemented', 503); }
    async validateQRCode() { throw new ProviderError('PROVIDER_UNAVAILABLE', 'Not implemented', 503); }
    async sendOTP() { throw new ProviderError('PROVIDER_UNAVAILABLE', 'Not implemented', 503); }
    async verifyOTP() { throw new ProviderError('PROVIDER_UNAVAILABLE', 'Not implemented', 503); }
    async getVerificationStatus() { throw new ProviderError('PROVIDER_UNAVAILABLE', 'Not implemented', 503); }
}
module.exports = { AadhaarVerificationProvider, ProviderError };
