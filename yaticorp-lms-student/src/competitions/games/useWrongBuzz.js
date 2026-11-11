import { useEffect, useRef } from 'react';
import { sfx } from '../../career/components/games/gameSfx';

/**
 * The wrong buzz for the group tables (2026-11-06): played once for each mistake `key` names (null: no mistake
 * now). A key seen before, as on the next poll of the same view, stays quiet, so one mistake buzzes once.
 */
export default function useWrongBuzz(key) {
    const last = useRef(null);
    useEffect(() => {
        if (key == null || key === last.current) return;
        last.current = key;
        sfx.wrong();
    }, [key]);
}
