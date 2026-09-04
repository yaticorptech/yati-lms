import '../artwork.css';

/**
 * 🎯 A clipboard with a target on it, for the Current Focus card.
 *
 * Decorative, hidden from assistive technology — everything factual on the
 * card is written beside it.
 */
export default function FocusArt({ className = '' }) {
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden preserveAspectRatio="xMaxYMid meet">
      {/* leaves */}
      <g className="yatiArt-sway" fill="#86efac">
        <path d="M34 120 c-16 -4 -26 -18 -24 -34 c16 2 26 16 24 34z" />
        <path d="M40 126 c-6 -14 -2 -30 10 -40 c8 14 4 30 -10 40z" fill="#4ade80" />
      </g>
      {/* clipboard shadow */}
      <ellipse cx="118" cy="142" rx="60" ry="6" fill="#6c3bff" opacity="0.1" />
      {/* clipboard */}
      <g transform="rotate(-6 118 80)">
        <rect x="70" y="22" width="96" height="116" rx="12" fill="#c7d2fe" />
        <rect x="76" y="30" width="84" height="102" rx="9" fill="#ffffff" />
        <rect x="100" y="14" width="36" height="16" rx="6" fill="#818cf8" />
        <rect x="110" y="10" width="16" height="10" rx="4" fill="#a5b4fc" />
        {/* ticked lines */}
        <g>
          <circle cx="90" cy="48" r="5" fill="#a5b4fc" />
          <path d="M87.5 48 l2 2 l3.5 -4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="100" y="45" width="46" height="6" rx="3" fill="#e0e7ff" />
          <circle cx="90" cy="66" r="5" fill="#a5b4fc" />
          <path d="M87.5 66 l2 2 l3.5 -4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="100" y="63" width="38" height="6" rx="3" fill="#e0e7ff" />
          <circle cx="90" cy="84" r="5" fill="#e0e7ff" />
          <rect x="100" y="81" width="42" height="6" rx="3" fill="#eef2ff" />
        </g>
      </g>
      {/* target */}
      <g transform="translate(150 106)">
        <circle r="30" fill="#6c3bff" />
        <circle r="23" fill="#ffffff" />
        <circle r="16" fill="#6c3bff" />
        <circle r="9" fill="#ffffff" />
        <circle r="3.5" fill="#6c3bff" />
        {/* arrow */}
        <g transform="rotate(-35)">
          <rect x="-2" y="-48" width="4" height="46" rx="2" fill="#fbbf24" />
          <path d="M0 -50 l-6 8 h12 z" fill="#f97316" />
          <path d="M-2 -46 l-8 -8 h6 l4 4 z M2 -46 l8 -8 h-6 l-4 4 z" fill="#f472b6" />
        </g>
      </g>
    </svg>
  );
}
