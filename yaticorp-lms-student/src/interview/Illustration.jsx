/**
 * The picture beside a piece of Interview Ready.
 *
 * Looks for your own artwork in `public/illustrations/` first — the slot's own
 * file, then a single `student` image that stands in for every slot — and
 * falls back to the LMS mascot when neither is there, so nothing is ever a
 * broken image. Drop the file in and it appears; no code change and no rebuild
 * of this file is needed. PNG, WebP and JPEG are all tried, so whichever your
 * design tool exports works without renaming.
 *
 * `mascot={false}` turns that fallback off for a slot that should stay empty
 * until its own artwork arrives — the report's banner is one.
 *
 *   public/illustrations/cheer.png      the report, after an interview
 *   public/illustrations/thumbs-up.png  the dashboard welcome
 *   public/illustrations/thinking.png   the practice-bank invitation
 *   public/illustrations/idea.png       the recommendation card
 *   public/illustrations/student.png    used for any of the above that is missing
 */
import { useState } from 'react';
import Mascot from '../career/components/mascot/Mascot';

export default function Illustration({ name, pose = 'point', mascot = true, height = 150, alt = '', motion = 'mc-float', className = '' }) {
    // Each miss moves to the next candidate; running out shows the mascot,
    // or nothing where this slot has asked to stay empty.
    const [attempt, setAttempt] = useState(0);
    // The slot's own file wins; a shared `student` image stands in; each is
    // tried in every format a design tool is likely to have exported.
    const sources = [name, 'student'].flatMap((base) => ['png', 'webp', 'jpg', 'jpeg'].map((ext) => `/illustrations/${base}.${ext}`));
    if (attempt >= sources.length) return mascot ? <Mascot pose={pose} height={height} motion={motion} className={className} /> : null;
    return (
        <span className={`block ${className}`} style={{ height }}>
            <img
                src={sources[attempt]}
                alt={alt}
                aria-hidden={alt ? undefined : true}
                draggable={false}
                onError={() => setAttempt((n) => n + 1)}
                className={`h-full w-auto select-none object-contain object-bottom ${motion}`}
            />
        </span>
    );
}
