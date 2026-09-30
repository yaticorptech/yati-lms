import { createContext, useContext } from 'react';

/** `{ react }` for any page. Stable, so reading it never re-renders a page. */
export const MascotContext = createContext(null);

/** What the dock needs: the reaction on screen, and the stage's own controls. */
export const MascotStageContext = createContext(null);

// Outside the provider — a screen rendered on its own — reacting does nothing.
const SILENT = { react: () => {} };

/**
 * `const mascot = useMascot(); mascot.react('cheer-jump');`
 *
 * Pass `{ ambient: true }` for small talk that should only play when the
 * mascot is free. Anything asked for while no mascot is on screen is dropped.
 */
export function useMascot() {
    return useContext(MascotContext) ?? SILENT;
}
