/**
 * Illustrations for the Community and Enrolled Courses pages, in place of the
 * mascot.
 *
 * Two families, because they sit on two different grounds. The banner pieces
 * live on a coloured gradient, so they are built from white and gold and carry
 * their own soft light. The empty-state pieces live on a white card, so they
 * use the product's violets and slates instead.
 *
 * All drawn rather than imported: they scale to any size, add nothing to the
 * download, and say what the page is for without a word.
 */

/* ---- Community ---------------------------------------------------------- */

/** The banner: a conversation, drawn as bubbles overlapping. */
export function CommunityArt({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden focusable="false">
      <circle cx="100" cy="100" r="66" fill="#ffffff" opacity="0.14" />

      {/* The reply, behind. */}
      <g opacity="0.92">
        <path d="M112 44 h58 a12 12 0 0 1 12 12 v30 a12 12 0 0 1 -12 12 h-30 l-16 14 v-14 h-12 a12 12 0 0 1 -12 -12 v-30 a12 12 0 0 1 12 -12 Z" fill="#c4b5fd" />
        <g fill="#5b21b6" opacity="0.6">
          <rect x="124" y="62" width="44" height="6" rx="3" />
          <rect x="124" y="76" width="30" height="6" rx="3" />
        </g>
      </g>

      {/* The question, in front and larger: someone always starts it. */}
      <g>
        <path d="M32 78 h74 a14 14 0 0 1 14 14 v38 a14 14 0 0 1 -14 14 h-46 l-22 18 v-18 h-6 a14 14 0 0 1 -14 -14 v-38 a14 14 0 0 1 14 -14 Z" fill="#ffffff" />
        <g fill="#7c3aed" opacity="0.75">
          <rect x="46" y="98" width="60" height="7" rx="3.5" />
          <rect x="46" y="114" width="44" height="7" rx="3.5" />
        </g>
      </g>

      {/* The people, as a row of heads along the foot. */}
      <g>
        <circle cx="70" cy="164" r="14" fill="#fbbf24" />
        <circle cx="98" cy="164" r="14" fill="#f472b6" />
        <circle cx="126" cy="164" r="14" fill="#38bdf8" />
        <g fill="#ffffff" opacity="0.85">
          <circle cx="70" cy="160" r="4.5" />
          <circle cx="98" cy="160" r="4.5" />
          <circle cx="126" cy="160" r="4.5" />
        </g>
      </g>
    </svg>
  );
}

/** Nobody has posted yet: one empty bubble and a pencil. */
export function FirstPostArt({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden focusable="false">
      <circle cx="100" cy="100" r="58" fill="#f5f3ff" />
      <path d="M46 62 h96 a16 16 0 0 1 16 16 v46 a16 16 0 0 1 -16 16 h-52 l-26 20 v-20 h-18 a16 16 0 0 1 -16 -16 v-46 a16 16 0 0 1 16 -16 Z" fill="#ffffff" stroke="#ddd6fe" strokeWidth="4" />
      {/* A dashed line where the first words will go. */}
      <g stroke="#c4b5fd" strokeWidth="6" strokeLinecap="round" strokeDasharray="2 14">
        <line x1="66" y1="90" x2="134" y2="90" />
        <line x1="66" y1="110" x2="112" y2="110" />
      </g>
      {/* The pencil, poised. */}
      <g transform="rotate(38 146 128)">
        <rect x="140" y="96" width="14" height="48" rx="3" fill="#a78bfa" />
        <rect x="140" y="90" width="14" height="8" rx="2" fill="#7c3aed" />
        <path d="M140 144 h14 l-7 14 Z" fill="#fbbf24" />
      </g>
    </svg>
  );
}

/* ---- Enrolled Courses --------------------------------------------------- */

/** Nothing enrolled: an open book waiting to be started. */
export function NoCoursesArt({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden focusable="false">
      <circle cx="100" cy="100" r="58" fill="#f5f3ff" />
      <path d="M100 68 c-14 -10 -34 -12 -52 -8 v66 c18 -4 38 -2 52 8 Z" fill="#ffffff" stroke="#ddd6fe" strokeWidth="4" />
      <path d="M100 68 c14 -10 34 -12 52 -8 v66 c-18 -4 -38 -2 -52 8 Z" fill="#ffffff" stroke="#ddd6fe" strokeWidth="4" />
      <line x1="100" y1="68" x2="100" y2="134" stroke="#c4b5fd" strokeWidth="4" />
      <g stroke="#ddd6fe" strokeWidth="4" strokeLinecap="round">
        <line x1="60" y1="86" x2="86" y2="86" />
        <line x1="60" y1="100" x2="82" y2="100" />
        <line x1="114" y1="86" x2="140" y2="86" />
        <line x1="114" y1="100" x2="136" y2="100" />
      </g>
      {/* A plus, because the fix for an empty shelf is to add to it. */}
      <circle cx="144" cy="140" r="18" fill="#7c3aed" />
      <g stroke="#ffffff" strokeWidth="5" strokeLinecap="round">
        <line x1="136" y1="140" x2="152" y2="140" />
        <line x1="144" y1="132" x2="144" y2="148" />
      </g>
    </svg>
  );
}

