/**
 * @description Making untrusted text safe to put into a platform-sent email.
 *
 * Organization emails carry values typed by whoever filled in a form — the
 * public registration form is unauthenticated — so an organization "named"
 * `<a href="…">Click here</a>` would otherwise have the platform mail a working
 * link on its behalf. Every such value goes through escapeHtml before it is
 * placed in an email body, and through plainHeader before it is used in a
 * subject or a recipient name.
 */

/** Text → HTML that displays exactly that text. `null`/`undefined` become ''. */
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

/**
 * Text for a header (subject, display name): one line, no control characters,
 * so nothing typed into a form can start a header of its own.
 */
// eslint-disable-next-line no-control-regex
const plainHeader = (value) => String(value ?? '').replace(/[\r\n\u0000-\u001f\u007f]+/g, ' ').trim();

module.exports = { escapeHtml, plainHeader };
