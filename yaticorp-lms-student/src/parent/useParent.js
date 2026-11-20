import { useContext } from 'react';
import { ParentContext } from './parentStore';

/** The parent dashboard's state (ParentProvider.jsx). */
export default function useParent() {
    return useContext(ParentContext);
}
