/**
 * Small illustrations that stand where the mascot used to, inside Career Path.
 *
 * Each one says what its panel is about rather than showing a character
 * reacting to it. Drawn rather than imported, so they scale, cost nothing to
 * download, and can take their colour from the panel they sit in.
 */

/**
 * Skills: three bars climbing toward a star.
 *
 * The panel's own subtitle is "built up as you complete tasks", and a chart
 * that grows is the shortest way to draw that.
 */
export function SkillsArt({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 140 140" aria-hidden focusable="false">
      <defs>
        <linearGradient id="pa-bar1" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id="pa-bar2" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="pa-bar3" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>

      <rect x="24" y="80" width="24" height="38" rx="8" fill="url(#pa-bar1)" />
      <rect x="58" y="60" width="24" height="58" rx="8" fill="url(#pa-bar2)" />
      <rect x="92" y="46" width="24" height="72" rx="8" fill="url(#pa-bar3)" />

      {/* The line of progress across the tops, ending in the reward. */}
      <path
        d="M36 74 L70 56 L104 40"
        fill="none"
        stroke="#f472b6"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="36" cy="74" r="6" fill="#ffffff" stroke="#f472b6" strokeWidth="4" />
      <circle cx="70" cy="56" r="6" fill="#ffffff" stroke="#f472b6" strokeWidth="4" />

      <path
        d="M104 6 l6.5 13.6 15 2.2 -10.9 10.5 2.6 14.9 -13.2 -7 -13.2 7 2.6 -14.9 -10.9 -10.5 15 -2.2 Z"
        fill="#fbbf24"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect x="16" y="120" width="108" height="6" rx="3" fill="#ddd6fe" />
    </svg>
  );
}

/**
 * The quiz verdict: a rosette when it is passed, a target when it is not.
 *
 * A target rather than a cross, because the panel beside it already says
 * "almost there" and the picture should agree with the words.
 */
export function QuizVerdictArt({ passed, className = '' }) {
  return (
    <svg className={className} viewBox="0 0 80 80" aria-hidden focusable="false">
      {passed ? (
        <>
          <path d="M28 52 l-6 22 18 -10 18 10 -6 -22 Z" fill="#f59e0b" />
          <circle cx="40" cy="34" r="24" fill="#fbbf24" />
          <circle cx="40" cy="34" r="17" fill="#fde68a" />
          <path
            d="M31 34 l6 7 12 -14"
            fill="none"
            stroke="#b45309"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <circle cx="40" cy="40" r="26" fill="#e0e7ff" />
          <circle cx="40" cy="40" r="17" fill="#c7d2fe" />
          <circle cx="40" cy="40" r="8" fill="#6366f1" />
          {/* The arrow landed close, which is what "almost there" looks like. */}
          <path d="M70 10 L45 35" stroke="#4338ca" strokeWidth="4" strokeLinecap="round" />
          <path d="M45 35 l11 -2 -2 11 Z" fill="#4338ca" />
          <g stroke="#818cf8" strokeWidth="4" strokeLinecap="round">
            <line x1="70" y1="10" x2="60" y2="10" />
            <line x1="70" y1="10" x2="70" y2="20" />
          </g>
        </>
      )}
    </svg>
  );
}

/**
 * The mark beside one question: a tick, a cross, or a question mark while it
 * is still unanswered.
 */
export function QuizMarkArt({ outcome, className = '' }) {
  const state = !outcome ? 'asking' : outcome.correct ? 'right' : 'wrong';
  const ring = { asking: '#ddd6fe', right: '#bbf7d0', wrong: '#fecdd3' }[state];
  const disc = { asking: '#8b5cf6', right: '#16a34a', wrong: '#e11d48' }[state];

  return (
    <svg className={className} viewBox="0 0 56 56" aria-hidden focusable="false">
      <circle cx="28" cy="28" r="26" fill={ring} />
      <circle cx="28" cy="28" r="19" fill={disc} />
      {state === 'right' && (
        <path
          d="M19 28 l6 7 13 -15"
          fill="none"
          stroke="#ffffff"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {state === 'wrong' && (
        <g stroke="#ffffff" strokeWidth="5" strokeLinecap="round">
          <line x1="21" y1="21" x2="35" y2="35" />
          <line x1="35" y1="21" x2="21" y2="35" />
        </g>
      )}
      {state === 'asking' && (
        <text
          x="28"
          y="36"
          textAnchor="middle"
          fontSize="24"
          fontWeight="800"
          fill="#ffffff"
          fontFamily="inherit"
        >
          ?
        </text>
      )}
    </svg>
  );
}
