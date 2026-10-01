/**
 * Pull down at the top of a page, let go, and the page reloads — on touch
 * screens only. The student pages scroll inside the layout's <main>, not the
 * window, so neither a phone's browser nor the app's web view does this on
 * its own.
 *
 * It only starts when the scroller is already at the top and the finger moves
 * mostly downwards, and never from inside something that scrolls on its own
 * and is not at its top (a list, a dialog), so ordinary scrolling and sideways
 * swipes are untouched. The pull is damped, so it feels like rubber, and it
 * has to pass THRESHOLD before letting go refreshes.
 */
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, RefreshCw } from 'lucide-react';

const THRESHOLD = 70;   // px of (damped) pull that counts as "refresh"
const MAX = 110;

const scrolledAncestor = (el, stop) => {
    for (let n = el; n && n !== stop; n = n.parentElement) {
        if (n.scrollTop > 0) return true;
        if (n.getAttribute?.('role') === 'dialog') return true;
    }
    return false;
};

export default function PullToRefresh({ scrollerRef, onRefresh = () => window.location.reload() }) {
    const [pull, setPull] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [dragging, setDragging] = useState(false);   // follows the finger, no easing
    const state = useRef({ startY: 0, startX: 0, active: false, decided: false, pull: 0 });

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return undefined;
        const s = state.current;
        const onStart = (e) => {
            if (refreshing || e.touches.length !== 1 || el.scrollTop > 0 || scrolledAncestor(e.target, el)) { s.active = false; return; }
            s.startY = e.touches[0].clientY; s.startX = e.touches[0].clientX; s.active = true; s.decided = false; s.pull = 0;
        };
        const onMove = (e) => {
            if (!s.active) return;
            const dy = e.touches[0].clientY - s.startY; const dx = e.touches[0].clientX - s.startX;
            if (!s.decided) {
                if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
                // Sideways or upwards: not a pull, let the page have it.
                if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) { s.active = false; return; }
                s.decided = true;
                setDragging(true);
            }
            if (el.scrollTop > 0) { s.active = false; s.pull = 0; setPull(0); return; }
            s.pull = Math.min(MAX, Math.max(0, dy * 0.5));
            setPull(s.pull);
        };
        const onEnd = () => {
            if (!s.active) return;
            s.active = false;
            setDragging(false);
            if (s.pull >= THRESHOLD) {
                setRefreshing(true); setPull(THRESHOLD);
                // A beat for the spinner to show, then the reload.
                setTimeout(() => onRefresh(), 350);
            } else {
                setPull(0);
            }
            s.pull = 0;
        };
        el.addEventListener('touchstart', onStart, { passive: true });
        el.addEventListener('touchmove', onMove, { passive: true });
        el.addEventListener('touchend', onEnd);
        el.addEventListener('touchcancel', onEnd);
        return () => {
            el.removeEventListener('touchstart', onStart);
            el.removeEventListener('touchmove', onMove);
            el.removeEventListener('touchend', onEnd);
            el.removeEventListener('touchcancel', onEnd);
        };
    }, [scrollerRef, refreshing, onRefresh]);

    if (!pull && !refreshing) return null;
    const ready = pull >= THRESHOLD;
    return (
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-16 z-[60] flex justify-center sidebar:top-20"
            style={{ transform: `translateY(${pull - 44}px)`, transition: dragging ? 'none' : 'transform 0.25s ease' }}>
            <div className="flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3.5 py-2 text-xs font-bold text-indigo-600 shadow-lg"
                style={{ opacity: Math.min(1, pull / 40) }}>
                {refreshing
                    ? <RefreshCw size={16} className="animate-spin" />
                    : <ArrowDown size={16} style={{ transform: `rotate(${ready ? 180 : 0}deg)`, transition: 'transform 0.2s' }} />}
                {refreshing ? 'Refreshing…' : ready ? 'Release to refresh' : 'Pull to refresh'}
            </div>
        </div>
    );
}
