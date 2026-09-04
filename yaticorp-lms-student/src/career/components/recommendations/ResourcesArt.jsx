import { useId } from 'react';
import '../artwork.css';

/**
 * 🔭 The stargazing scene behind the Ideas & Resources header.
 *
 * Original artwork built from primitives — a ringed planet, a smaller moon,
 * sparkles, a bank of cloud, and a student at a telescope looking out at all
 * of it. The stargazer is drawn into the scene rather than composed over it,
 * so the hands land on the tube at every size instead of drifting off it as a
 * separately positioned figure did.
 *
 * The planet drifts, the moon bobs, the sparkles twinkle and the whole
 * telescope-and-student group breathes gently. Everything stops under
 * prefers-reduced-motion.
 */
export default function ResourcesArt({ className = '' }) {
  const uid = useId();
  const ring = `ring-${uid}`;
  const planet = `planet-${uid}`;
  const moon = `moon-${uid}`;
  const tube = `tube-${uid}`;

  return (
    <svg viewBox="0 0 320 240" className={className} aria-hidden>
      <defs>
        <linearGradient id={planet} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b6cff" />
          <stop offset="100%" stopColor="#4f34d6" />
        </linearGradient>
        <linearGradient id={ring} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c9b8ff" />
          <stop offset="100%" stopColor="#7f9dff" />
        </linearGradient>
        <linearGradient id={moon} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5b73e8" />
          <stop offset="100%" stopColor="#2f3d9e" />
        </linearGradient>
        <linearGradient id={tube} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#c3cffb" />
        </linearGradient>
      </defs>

      {/* Ringed planet, high and right, where the eye lands after the headline. */}
      <g className="yatiArt-float-slow">
        <circle cx="214" cy="62" r="34" fill={`url(#${planet})`} />
        <ellipse
          cx="214"
          cy="62"
          rx="54"
          ry="13"
          fill="none"
          stroke={`url(#${ring})`}
          strokeWidth="7"
          transform="rotate(-19 214 62)"
        />
        <circle cx="203" cy="52" r="7" fill="#ffffff" opacity="0.22" />
        <circle cx="224" cy="74" r="4.5" fill="#ffffff" opacity="0.16" />
      </g>

      <circle className="yatiArt-float-delay" cx="286" cy="132" r="15" fill={`url(#${moon})`} />
      <circle className="yatiArt-float-delay" cx="281" cy="127" r="4" fill="#ffffff" opacity="0.2" />

      {/* Sparkles, kept clear of the telescope so nothing sits behind it. */}
      <g fill="#a78bfa">
        <path className="yatiArt-twinkle" d="M96 34 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" opacity="0.85" />
        <path className="yatiArt-twinkle" d="M268 28 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4z" opacity="0.7" />
        <path className="yatiArt-twinkle" d="M60 104 l2 4.6 4.6 2 -4.6 2 -2 4.6 -2 -4.6 -4.6 -2 4.6 -2z" opacity="0.55" />
        <path className="yatiArt-twinkle" d="M300 78 l2 4.6 4.6 2 -4.6 2 -2 4.6 -2 -4.6 -4.6 -2 4.6 -2z" opacity="0.5" />
      </g>

      {/* Telescope and the student at it, breathing together as one group. */}
      <g className="yatiArt-bob">
        {/* Tripod. */}
        <g stroke="#8c9bd6" strokeWidth="7" strokeLinecap="round">
          <path d="M182 210 L166 178" />
          <path d="M182 210 L204 178" />
          <path d="M190 198 L190 170" />
        </g>
        <rect x="164" y="196" width="52" height="8" rx="4" fill="#b9c5ef" />

        {/* Tube, angled up at the planet. */}
        <g transform="rotate(-27 190 156)">
          <rect x="140" y="140" width="106" height="32" rx="16" fill={`url(#${tube})`} />
          <rect x="140" y="140" width="106" height="32" rx="16" fill="none" stroke="#c9d4f7" strokeWidth="2" />
          <ellipse cx="244" cy="156" rx="7" ry="17" fill="#6d4dff" />
          <ellipse cx="244" cy="156" rx="3.5" ry="11" fill="#a68dff" opacity="0.7" />
          <rect x="182" y="136" width="20" height="40" rx="7" fill="#d7dffb" />
        </g>
        <circle cx="153" cy="188" r="9" fill="#8b6cff" />

        {/* The stargazer, leaning into the eyepiece. */}
        <g>
          {/* Legs and hoodie first, then head, then the near arm on the tube. */}
          <path d="M104 206 l6 -34 h20 l4 34z" fill="#3f3d69" />
          <path d="M100 152 c-14 0 -24 11 -24 25 v21 h48 v-21 c0 -14 -10 -25 -24 -25z" fill="#7c5cff" />
          <path d="M100 152 c-8 0 -15 3 -19 8 a23 23 0 0 0 38 0 c-4 -5 -11 -8 -19 -8z" fill="#6d4dff" />
          <path d="M84 132 c0 -15 7 -24 18 -24 s18 9 18 24z" fill="#2f2a44" />
          <circle cx="102" cy="134" r="16" fill="#f7c9a6" />
          <path d="M86 130 c1 -12 7 -18 16 -18 s15 6 16 18 c-4 -7 -9 -9 -16 -9 s-12 2 -16 9z" fill="#2f2a44" />
          <circle cx="110" cy="136" r="1.6" fill="#2f2a44" />
          <path d="M106 143 a4.5 4.5 0 0 0 7 -1" fill="none" stroke="#2f2a44" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="96" y="147" width="10" height="8" rx="3" fill="#efb694" />
          {/* Arm reaching up to steady the tube. */}
          <g style={{ transformBox: 'view-box', transformOrigin: '118px 168px' }} className="yatiArt-sway">
            <rect x="114" y="160" width="36" height="13" rx="6.5" fill="#8b6cff" transform="rotate(-22 118 168)" />
            <circle cx="146" cy="149" r="7" fill="#f7c9a6" />
          </g>
        </g>
      </g>

      {/* Cloud bank grounds the scene and hides where the tripod ends. */}
      <g fill="#ffffff">
        <ellipse cx="120" cy="216" rx="62" ry="20" opacity="0.95" />
        <ellipse cx="196" cy="220" rx="54" ry="17" opacity="0.9" />
        <ellipse cx="272" cy="224" rx="44" ry="14" opacity="0.75" />
        <ellipse cx="52" cy="224" rx="40" ry="13" opacity="0.7" />
      </g>
    </svg>
  );
}
