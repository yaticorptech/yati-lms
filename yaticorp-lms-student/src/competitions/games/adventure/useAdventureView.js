import { useState } from 'react';
import usePhone, { useLandscapePhone } from './usePhone';

/**
 * How The Lost Kingdom and The Final Vault lay out (2026-11-05: "on a phone it should open sideways at once, and
 * fit the screen"). On a phone, while the game is on, the wide layout — the whole picture with everything on it —
 * is the default: drawn turned a quarter (`rotated`) while the phone is upright, so it is read by turning the
 * phone; filling the screen (`landscape`) once it is sideways. The upright layout (`stacked`: the picture, the
 * puzzle under it) stays a button away; asked for while the phone is sideways, it waits for the phone to be
 * turned (`turn-upright`). Off a phone, or once the game is over, it sits in the page (`page`).
 *
 * `wide`: whether the wide layout is showing, for what is laid out outside the picture.
 */
export default function useAdventureView(over) {
    const narrow = usePhone();
    const sideways = useLandscapePhone();
    const [upright, setUpright] = useState(false);
    const onPhone = (narrow || sideways) && !over;
    const view = !onPhone ? 'page' : upright ? (sideways ? 'turn-upright' : 'stacked') : sideways ? 'landscape' : 'rotated';
    const stacked = view === 'stacked' || (view === 'page' && narrow);
    return { view, onPhone, stacked, wide: !stacked, setUpright };
}
