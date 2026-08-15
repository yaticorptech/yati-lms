/**
 * @author Preethesh Kulal
 * @description Auto-refresh hook — calls the provided fetch function on mount
 * and then on a fixed interval. Clears on unmount.
 *
 * Usage:
 *   useAutoRefresh(fetchFn, 30000); // refresh every 30s
 */
import { useEffect } from 'react';

const useAutoRefresh = (fetchFn, intervalMs = 30000) => {
    useEffect(() => {
        fetchFn();
        const id = setInterval(fetchFn, intervalMs);
        return () => clearInterval(id);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
};

export default useAutoRefresh;
