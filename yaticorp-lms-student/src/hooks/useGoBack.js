import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * A Back link's click: back to the page the person came from. Only when the
 * page was opened directly (nothing before it in this app) does the link's
 * own address take over.
 */
export default function useGoBack() {
    const navigate = useNavigate();
    return useCallback((e) => {
        if (window.history.state?.idx > 0) {
            e.preventDefault();
            navigate(-1);
        }
    }, [navigate]);
}
