import { useEffect, useState } from 'react';

/** Whether a media query matches, kept up to date as the screen turns or resizes. */
export const useMedia = (query) => {
    const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
    useEffect(() => {
        const mq = window.matchMedia(query);
        const change = () => setOn(mq.matches);
        change();
        mq.addEventListener('change', change);
        return () => mq.removeEventListener('change', change);
    }, [query]);
    return on;
};

/** A phone-width screen, upright. */
const usePhone = () => useMedia('(max-width: 767px)');

/** A phone turned sideways: wide, but short. */
export const useLandscapePhone = () => useMedia('(orientation: landscape) and (max-height: 500px)');

export default usePhone;
