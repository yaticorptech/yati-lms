/**
 * A Final Vault chamber: the picture it was designed from (asked again
 * 2026-10-27), with the picture's own panels cut out — its title, standings,
 * tracker, clock, puzzle panel and buttons — so nothing shows twice. Where
 * they were, a blurred, darker copy of the picture shows through, and the
 * game's own HUD sits on top.
 *
 * `holes` are [x, y, width, height] in % of the picture.
 */
const W = 2000; const H = 1120;

export default function ChamberPhoto({ src, holes, id }) {
    const mask = `fv-mask-${id}`; const soft = `fv-soft-${id}`; const blur = `fv-blur-${id}`;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true" data-chamber-photo={id}>
            <defs>
                <filter id={blur} x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="22" /></filter>
                <filter id={soft} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="10" /></filter>
                <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
                    <rect width={W} height={H} fill="#fff" />
                    <g filter={`url(#${soft})`}>
                        {holes.map(([x, y, w, h], i) => <rect key={i} x={(x / 100) * W} y={(y / 100) * H} width={(w / 100) * W} height={(h / 100) * H} rx="18" fill="#000" />)}
                    </g>
                </mask>
            </defs>
            {/* Underneath: the same picture, blurred and darker, for where the panels were. */}
            <image href={src} width={W} height={H} preserveAspectRatio="xMidYMid slice" filter={`url(#${blur})`} opacity="0.55" />
            <rect width={W} height={H} fill="#0b0804" opacity="0.35" />
            {/* On top: the picture, sharp, without its panels. */}
            <image href={src} width={W} height={H} preserveAspectRatio="xMidYMid slice" mask={`url(#${mask})`} />
        </svg>
    );
}
