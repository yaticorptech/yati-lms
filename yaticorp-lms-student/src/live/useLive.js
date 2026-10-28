/**
 * Live updates: `useLive(topics, reload)` calls `reload` whenever the server
 * says one of those topics changed — 'competitions', 'arena', 'games',
 * 'leaderboard', and 'wallet' for the student's own (yaticorp-lms-server/src/live). One stream for the whole app,
 * opened by the first page that listens and closed when the last one leaves;
 * fetch rather than EventSource, so the token travels in the header. It
 * reconnects after a drop, and a tab coming back into view reloads too, for
 * whatever happened while it slept.
 */
import { useEffect, useRef } from 'react';
import api from '../utils/api';

const listeners = new Set();
let ctrl = null;
let retry = null;

const connect = async () => {
    if (!listeners.size || ctrl) return;
    ctrl = new AbortController();
    const mine = ctrl;
    try {
        const res = await fetch(`${api.defaults.baseURL}/live/stream`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('studentToken') || ''}`, Accept: 'text/event-stream' },
            signal: mine.signal
        });
        if (!res.ok || !res.body) throw new Error(`live ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            let cut;
            while ((cut = buf.indexOf('\n\n')) >= 0) {
                const block = buf.slice(0, cut);
                buf = buf.slice(cut + 2);
                const data = /^event: live$/m.test(block) && block.match(/^data: (.*)$/m)?.[1];
                if (!data) continue;
                try {
                    const { topic } = JSON.parse(data);
                    listeners.forEach((l) => l(topic));
                } catch { /* not ours */ }
            }
        }
    } catch { /* dropped, or closed on purpose */ }
    if (ctrl === mine) ctrl = null;
    if (listeners.size && !mine.signal.aborted) retry = setTimeout(connect, 5000);
};

const disconnect = () => { clearTimeout(retry); ctrl?.abort(); ctrl = null; };

// A tab in the background lets its connection go (browsers allow only a few
// per server, and every open tab held one) and takes it up again on return —
// when each page reloads anyway, for whatever happened meanwhile.
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') disconnect();
        else connect();
    });
}

const subscribe = (fn) => {
    listeners.add(fn);
    clearTimeout(retry);
    if (typeof document === 'undefined' || document.visibilityState !== 'hidden') connect();
    return () => {
        listeners.delete(fn);
        if (!listeners.size) disconnect();
    };
};

export default function useLive(topics, reload, { enabled = true } = {}) {
    const ref = useRef(reload);
    useEffect(() => { ref.current = reload; });
    const key = [].concat(topics).join(',');
    useEffect(() => {
        if (!enabled) return undefined;
        const wanted = key.split(',');
        const off = subscribe((topic) => { if (wanted.includes(topic)) ref.current?.(); });
        const onVisible = () => { if (document.visibilityState === 'visible') ref.current?.(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => { off(); document.removeEventListener('visibilitychange', onVisible); };
    }, [key, enabled]);
}
