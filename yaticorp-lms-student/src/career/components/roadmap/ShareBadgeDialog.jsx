/**
 * @description The share sheet for a milestone badge.
 *
 * A badge is only worth making if it is easy to post, so this leads with the
 * places students actually share — LinkedIn for the ones job-hunting, WhatsApp
 * for everyone else — and keeps the raw link and the image file behind them for
 * anywhere those two do not cover.
 *
 * Where the browser has an OS share sheet it is offered as well — that is the
 * only route to Instagram, Snapchat and the rest — but never in place of the
 * explicit buttons. See canUseSystemShare below for why.
 */
import { useEffect, useState } from 'react';
import { Linkedin, MessageCircle, Link2, Download, X, Check, Share2 } from 'lucide-react';

/**
 * Does this browser have an OS share sheet?
 *
 * Offered ALONGSIDE the explicit buttons, never instead of them. Desktop Chrome
 * reports `navigator.share` too, so keying the layout off it hid the LinkedIn
 * button — the single most valuable target here — from exactly the students
 * most likely to be job-hunting at a laptop.
 */
const canUseSystemShare = () =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function';

export default function ShareBadgeDialog({ badge, onClose }) {
  const [copied, setCopied] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Escape closes it, like every other dialog in the section.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!badge) return null;

  const text = `I just completed "${badge.phaseTitle}" on my YATICORP Career Path${
    badge.careerGoal ? ` towards becoming a ${badge.careerGoal}` : ''
  }.`;

  const shareTargets = [
    {
      name: 'LinkedIn',
      icon: Linkedin,
      className: 'bg-[#0a66c2] text-white hover:bg-[#004182]',
      // LinkedIn reads the Open Graph tags on the shared URL and ignores any
      // text passed here, which is exactly why the badge page carries them.
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(badge.shareUrl)}`
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      className: 'bg-[#25d366] text-white hover:bg-[#1da851]',
      href: `https://wa.me/?text=${encodeURIComponent(`${text} ${badge.shareUrl}`)}`
    },
    {
      // The mark IS the letter, so showing it beside the name read as "X X".
      // The glyph carries it alone; screen readers get the name from aria-label.
      name: 'X',
      icon: null,
      glyph: '𝕏',
      hideName: true,
      className: 'bg-slate-900 text-white hover:bg-slate-800',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(badge.shareUrl)}`
    }
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(badge.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is refused on insecure origins and in some embedded browsers.
      // The link is on screen and selectable, so this is recoverable.
    }
  };

  const systemShare = async () => {
    try {
      await navigator.share({ title: 'My Career Path milestone', text, url: badge.shareUrl });
    } catch {
      // The student dismissed the sheet. Not an error.
    }
  };

  const downloadImage = async () => {
    try {
      const res = await fetch(badge.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `career-path-milestone-${badge.phaseIndex + 1}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // Fall back to simply opening it, which every browser can do.
      window.open(badge.imageUrl, '_blank', 'noopener');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share your milestone badge"
    >
      <div
        className="futurepath-portal w-full max-w-lg overflow-hidden rounded-2xl bg-surface shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-link" />
            <h2 className="text-base font-bold text-ink-900">Share your milestone</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {/* The badge itself. Shown at the aspect ratio the feed will crop to,
              so what the student approves is what their followers see. */}
          <div className="relative overflow-hidden rounded-xl bg-surface-100" style={{ aspectRatio: '1200 / 630' }}>
            {!imageLoaded && <div className="skeleton absolute inset-0" />}
            <img
              src={badge.imageUrl}
              alt={`${badge.phaseTitle} milestone badge`}
              width={1200}
              height={630}
              onLoad={() => setImageLoaded(true)}
              className={`h-full w-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {shareTargets.map((t) => (
              <a
                key={t.name}
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Share on ${t.name}`}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition-colors ${t.className}`}
              >
                {t.icon ? <t.icon className="h-4 w-4" /> : <span aria-hidden="true" className="text-lg leading-none">{t.glyph}</span>}
                {!t.hideName && t.name}
              </a>
            ))}
          </div>

          {/* The OS sheet, where there is one — the only route to Instagram,
              Snapchat and everything else the three buttons above miss. */}
          {canUseSystemShare() && (
            <button
              onClick={systemShare}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-line-200 bg-surface px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-surface-50"
            >
              <Share2 className="h-4 w-4" />
              More apps…
            </button>
          )}

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={copyLink}
              className="flex items-center justify-center gap-2 rounded-xl border border-line-200 bg-surface px-3 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-surface-50"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button
              onClick={downloadImage}
              className="flex items-center justify-center gap-2 rounded-xl border border-line-200 bg-surface px-3 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-surface-50"
            >
              <Download className="h-4 w-4" />
              Save image
            </button>
          </div>

          <p className="mt-3 text-center text-xs leading-relaxed text-ink-400">
            Anyone with the link can see this badge — your name, the milestone and
            your goal. Nothing else from your account is shown.
          </p>
        </div>
      </div>
    </div>
  );
}
