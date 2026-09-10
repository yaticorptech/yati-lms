/**
 * The artwork on the Scholarships banner: a graduation cap resting on a stack
 * of coins, with a sealed award certificate behind it.
 *
 * It replaces the mascot, and it says what the page is for without a word.
 * The banner's promise is "your dreams, fully funded", which is exactly a cap
 * on top of money, and the certificate is what the money arrives as.
 *
 * Drawn rather than an image so it scales to any banner size, carries no
 * download, and can be tinted to sit on the purple gradient behind it.
 */
export function FundedArt({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden focusable="false">
      <defs>
        <linearGradient id="sa-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="sa-gold-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="sa-paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e9e5ff" />
        </linearGradient>
        <linearGradient id="sa-cap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4c1d95" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>
      </defs>

      {/* A light behind everything, lifting the whole group off the gradient. */}
      <circle cx="100" cy="104" r="66" fill="#ffffff" opacity="0.14" />

      {/* The certificate, tucked behind and tilted, with its seal and ribbon. */}
      <g transform="rotate(-9 128 92)">
        <rect x="104" y="52" width="62" height="80" rx="6" fill="url(#sa-paper)" />
        <g stroke="#c7bdf5" strokeWidth="3" strokeLinecap="round">
          <line x1="114" y1="68" x2="150" y2="68" />
          <line x1="114" y1="80" x2="156" y2="80" />
          <line x1="114" y1="92" x2="142" y2="92" />
        </g>
        <circle cx="150" cy="114" r="11" fill="#f43f5e" />
        <path d="M144 122 l-4 14 10 -6 10 6 -4 -14 Z" fill="#e11d48" />
      </g>

      {/* The stack of coins. Rupee on the top one, because that is the currency
          every amount on this page is quoted in. */}
      <g>
        {[
          { y: 150, w: 78 },
          { y: 136, w: 72 },
          { y: 122, w: 66 }
        ].map((c) => (
          <g key={c.y}>
            <rect x={100 - c.w / 2} y={c.y - 9} width={c.w} height="14" rx="7" fill="url(#sa-gold-edge)" />
            <ellipse cx="100" cy={c.y - 9} rx={c.w / 2} ry="7.5" fill="url(#sa-gold)" />
          </g>
        ))}
        <text
          x="100"
          y="118"
          textAnchor="middle"
          fontSize="15"
          fontWeight="800"
          fill="#92400e"
          fontFamily="inherit"
        >
          ₹
        </text>
      </g>

      {/* The mortarboard, sitting on top of the money. */}
      <g>
        <path d="M100 44 L156 66 L100 88 L44 66 Z" fill="url(#sa-cap)" />
        <path d="M100 44 L156 66 L100 78 L44 66 Z" fill="#312e81" opacity="0.55" />
        <path d="M76 76 v16 c0 8 48 8 48 0 v-16 l-24 10 Z" fill="#3730a3" />
        {/* The tassel, hanging off the right corner. */}
        <path d="M156 66 v22" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <circle cx="156" cy="92" r="6" fill="#f59e0b" />
      </g>

      {/* Sparkles, the same language as the rest of the product. */}
      <g fill="#fde68a">
        <path d="M40 40 l5 11 12 2 -9 8 2 12 -10 -6 -10 6 2 -12 -9 -8 12 -2 Z" />
        <path d="M172 34 l4 8 9 1 -7 6 2 9 -8 -4 -8 4 2 -9 -7 -6 9 -1 Z" opacity="0.85" />
        <path d="M28 118 l3 7 8 1 -6 5 2 8 -7 -4 -7 4 2 -8 -6 -5 8 -1 Z" opacity="0.7" />
      </g>
    </svg>
  );
}

/**
 * A quieter companion for the empty state: an open hand offering a coin. The
 * banner is a promise; this one is an invitation to press the button.
 */
export function SearchFundingArt({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden focusable="false">
      <defs>
        <linearGradient id="sb-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="100" r="58" fill="#f5f3ff" />

      {/* A magnifier over a coin: looking for funding. */}
      <circle cx="92" cy="92" r="34" fill="#ffffff" stroke="#a78bfa" strokeWidth="7" />
      <circle cx="92" cy="92" r="20" fill="url(#sb-gold)" />
      <text x="92" y="99" textAnchor="middle" fontSize="20" fontWeight="800" fill="#92400e" fontFamily="inherit">
        ₹
      </text>
      <path d="M118 118 L142 142" stroke="#7c3aed" strokeWidth="11" strokeLinecap="round" />

      <g fill="#fbbf24">
        <path d="M148 52 l4 9 10 1 -7 6 2 10 -9 -5 -9 5 2 -10 -7 -6 10 -1 Z" />
        <path d="M46 140 l3 7 8 1 -6 5 2 8 -7 -4 -7 4 2 -8 -6 -5 8 -1 Z" opacity="0.8" />
      </g>
    </svg>
  );
}
