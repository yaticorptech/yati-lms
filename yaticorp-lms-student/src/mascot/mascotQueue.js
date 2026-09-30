/**
 * What the mascot is showing, and what waits behind it.
 *
 * Two kinds of reaction. An EVENT answers something the student did — a quiz
 * verdict, a finished lesson. It is never lost: it waits its turn, or cuts an
 * ambient reaction short so it still lands while the moment is fresh. An
 * AMBIENT reaction is the mascot's own small talk — the greeting, the idle
 * meditation, the wink at a button. It plays only when the mascot is free and
 * never queues, so small talk cannot pile up in front of a real moment.
 *
 * Nothing is kept while no stage is on screen. A reaction asked for on a page
 * without the mascot would otherwise play, stale, on the next page that has one.
 */

// Events waiting behind the current one. More than this in a burst is noise.
export const MAX_WAITING = 3;

export const initialState = { stages: 0, current: null, waiting: [], nextId: 1 };

export function mascotReducer(state, action) {
    switch (action.type) {
        case 'attach':
            return { ...state, stages: state.stages + 1 };

        case 'detach': {
            const stages = Math.max(0, state.stages - 1);
            return stages ? { ...state, stages } : { ...state, stages, current: null, waiting: [] };
        }

        case 'react': {
            if (!state.stages || !action.name) return state;
            const reaction = { id: state.nextId, name: action.name, ambient: Boolean(action.ambient) };
            const next = { ...state, nextId: state.nextId + 1 };
            if (reaction.ambient) {
                return state.current || state.waiting.length ? state : { ...next, current: reaction };
            }
            if (!state.current || state.current.ambient) return { ...next, current: reaction };
            if (state.waiting.length >= MAX_WAITING || state.waiting.some((r) => r.name === reaction.name)) return state;
            return { ...next, waiting: [...state.waiting, reaction] };
        }

        case 'done': {
            // Only the reaction on screen can finish; a late call for one that
            // was already cut short changes nothing.
            if (!state.current || state.current.id !== action.id) return state;
            const [head = null, ...rest] = state.waiting;
            return { ...state, current: head, waiting: rest };
        }

        default:
            return state;
    }
}
