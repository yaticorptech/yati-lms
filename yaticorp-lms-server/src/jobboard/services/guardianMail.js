/**
 * The permission request a parent is emailed, built from the application.
 *
 * In one place because two things send it: the request route, when the
 * student presses Send, and the bounce watcher, when the parent's address
 * turned out not to exist and the same request goes to the school's mailbox
 * instead. Both must send the identical message.
 */

/** A plain, readable line for the email body. */
const field = (label, value) => (value
    ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:110px">${label}</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600">${value}</td></tr>`
    : '');

/**
 * Subject and HTML for the request. `link` is the guardian's page. `note`,
 * when given, is a line at the top for a reader who is not the parent — the
 * school, when the parent's address bounced.
 */
const guardianMail = (application, link, { note = '' } = {}) => {
    const who = application.student?.name || 'A student';
    const job = application.job || {};
    const subject = `${who} needs your permission for a part-time job`;
    const htmlContent = `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
  ${note ? `<p style="margin:0 0 16px;padding:10px 14px;border:1px solid #fde68a;background:#fffbeb;border-radius:10px;font-size:14px;line-height:1.5;color:#92400e">${note}</p>` : ''}
  <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#4f46e5">Guardian permission</p>
  <h1 style="margin:0 0 12px;font-size:22px">Part-time job permission</h1>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569">
    ${who} has asked to apply for a part-time job. Nothing is arranged until you answer.
  </p>
  <table style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:8px 16px">
    ${field('Job', job.title)}${field('Company', job.company)}${field('Hours', job.hours)}
    ${field('Dates', job.duration)}${field('Location', job.location)}${field('Pay', job.pay)}
  </table>
  <p style="margin:24px 0 10px;font-size:15px;font-weight:700">Do you give permission?</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 10px;width:100%">
    <tr><td>
      <a href="${link}?answer=approve" style="display:block;background:#059669;color:#fff;text-align:center;text-decoration:none;font-weight:700;font-size:16px;padding:16px 24px;border-radius:12px">
        &#10003;&nbsp; Yes, I approve
      </a>
    </td></tr>
    <tr><td>
      <a href="${link}?answer=decline" style="display:block;background:#fff;color:#be123c;border:2px solid #fecdd3;text-align:center;text-decoration:none;font-weight:700;font-size:16px;padding:14px 24px;border-radius:12px">
        &#10007;&nbsp; No, I do not approve
      </a>
    </td></tr>
  </table>
  <p style="margin:14px 0 8px;font-size:13px;line-height:1.6;color:#64748b">
    Pressing a button records your answer straight away. Simply opening this email changes nothing.
  </p>
  ${note ? '' : `<p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#64748b">
    Only you can answer this. Nobody at the school or the LMS can approve it for you.
  </p>`}
  <p style="margin:0;font-size:12px;color:#94a3b8;word-break:break-all">If the buttons do not work, open: ${link}</p>
</div>`;
    return { subject, htmlContent };
};

/** Where the guardian's page lives, from the settings alone (no request in hand). */
const defaultSiteUrl = () => String(process.env.FRONTEND_URL || process.env.CLIENT_URL || '').replace(/\/$/, '');

/**
 * The mailbox a request goes to when the parent's address turned out not to
 * exist: the sending mailbox itself, unless GUARDIAN_FALLBACK_EMAIL says
 * otherwise. That is where the bounce notice already lands, so the notice and
 * the request to act on sit side by side in one inbox (the account owner's
 * choice, 2026-09-29). ADMIN_EMAIL only when there is no sending mailbox.
 */
const fallbackAddress = () => String(process.env.GUARDIAN_FALLBACK_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || process.env.ADMIN_EMAIL || '').trim();

module.exports = { guardianMail, defaultSiteUrl, fallbackAddress };
