import { useMemo, useReducer } from 'react';
import { MascotContext, MascotStageContext } from './useMascot';
import { initialState, mascotReducer } from './mascotQueue';

/**
 * The one mascot state for the whole app, so any page can `useMascot().react()`.
 * The stage that shows it lives on the pages that have a mascot (MascotDock).
 */
export default function MascotProvider({ children }) {
    const [{ current }, dispatch] = useReducer(mascotReducer, initialState);

    const api = useMemo(() => ({
        react: (name, { ambient = false } = {}) => dispatch({ type: 'react', name, ambient })
    }), []);

    // Made once: the dock attaches in an effect keyed on `attach`, and a new
    // function on every reaction would detach it — and clear it — each time.
    const controls = useMemo(() => ({
        attach: () => {
            dispatch({ type: 'attach' });
            return () => dispatch({ type: 'detach' });
        },
        done: (id) => dispatch({ type: 'done', id })
    }), []);

    const stage = useMemo(() => ({ current, ...controls }), [current, controls]);

    return (
        <MascotContext.Provider value={api}>
            <MascotStageContext.Provider value={stage}>{children}</MascotStageContext.Provider>
        </MascotContext.Provider>
    );
}
