/**
 * @author Preethesh Kulal
 * @description Hook that auto-logs out admin after inactivity timeout
 */
import { useCallback, useEffect, useRef, useState } from "react";

const SESSION_TIMEOUT = 10 * 60 * 1000;

const useAutoLogout = () => {
    const timerRef = useRef(null);
    const [showSessionModal, setShowSessionModal] = useState(false);

    const logout = () => {
        setShowSessionModal(true);
    };

    // Stable identity: only touches refs and a state setter, so it never needs
    // to be rebuilt — which lets the effect below list it as a dependency.
    const resetTimer = useCallback(() => {
        if (document.hidden) return; // ❗ ignore if tab inactive

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(logout, SESSION_TIMEOUT);
    }, []);

    useEffect(() => {
    const events = [
        "mousemove",
        "mousedown",
        "keydown",
        "keypress",
        "keyup",
        "scroll",
        "touchstart",
        "input"
    ];

    events.forEach(event =>
        window.addEventListener(event, resetTimer)
    );

    // Named so the cleanup below can actually detach it; the previous inline
    // handler was left registered after unmount.
    const onVisibilityChange = () => {
        if (!document.hidden) {
            resetTimer();
        }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    resetTimer();

    return () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        events.forEach(event =>
            window.removeEventListener(event, resetTimer)
        );

        document.removeEventListener("visibilitychange", onVisibilityChange);
    };
}, [resetTimer]);

    const confirmLogout = () => {
        localStorage.removeItem("adminToken");
        window.location.replace("/login");
    };

    return { showSessionModal, confirmLogout };
};

export default useAutoLogout;