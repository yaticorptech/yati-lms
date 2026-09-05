/**
 * Sends a text message to a student's mobile.
 *
 * The provider is chosen by environment, so the same call works in every
 * deployment: Fast2SMS or MSG91 for Indian numbers, Twilio anywhere, and a
 * console log when none is configured (development). Sending never throws —
 * the caller gets { sent, provider, reason } and decides what to tell the user.
 *
 * Set one of:
 *   FAST2SMS_API_KEY
 *   MSG91_AUTH_KEY + MSG91_TEMPLATE_ID (+ MSG91_SENDER_ID, default YATICP)
 *   TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM
 * or SMS_PROVIDER=console to log only.
 */
const axios = require('axios');

/** Indian mobile in any common form → +91XXXXXXXXXX, or null. */
const normaliseIndianMobile = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '');
    const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2)
        : digits.length === 11 && digits.startsWith('0') ? digits.slice(1)
            : digits;
    return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
};

const maskMobile = (e164) => (e164 ? `${e164.slice(0, 3)} •••••${e164.slice(-5)}` : '');

const provider = () => {
    if (process.env.SMS_PROVIDER === 'console') return 'console';
    if (process.env.FAST2SMS_API_KEY) return 'fast2sms';
    if (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID) return 'msg91';
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) return 'twilio';
    return 'console';
};

const senders = {
    fast2sms: async (to, message) => {
        await axios.post('https://www.fast2sms.com/dev/bulkV2',
            { route: 'q', message, numbers: to.replace('+91', '') },
            { headers: { authorization: process.env.FAST2SMS_API_KEY }, timeout: 10000 });
    },
    msg91: async (to, message) => {
        await axios.post('https://control.msg91.com/api/v5/flow/',
            { template_id: process.env.MSG91_TEMPLATE_ID, sender: process.env.MSG91_SENDER_ID || 'YATICP', mobiles: to.replace('+', ''), message },
            { headers: { authkey: process.env.MSG91_AUTH_KEY, 'Content-Type': 'application/json' }, timeout: 10000 });
    },
    twilio: async (to, message) => {
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const params = new URLSearchParams({ To: to, From: process.env.TWILIO_FROM, Body: message });
        await axios.post(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, params,
            { auth: { username: sid, password: process.env.TWILIO_AUTH_TOKEN }, timeout: 10000 });
    },
    console: async (to, message) => {
        console.log(`[sms:console] to ${to}: ${message}`);
    }
};

const sendSms = async (to, message) => {
    const name = provider();
    try {
        await senders[name](to, message);
        return { sent: true, provider: name, simulated: name === 'console' };
    } catch (err) {
        console.error(`[sms:${name}] failed:`, err.response?.data || err.message);
        return { sent: false, provider: name, reason: err.response?.data?.message || err.message };
    }
};

module.exports = { sendSms, normaliseIndianMobile, maskMobile };
