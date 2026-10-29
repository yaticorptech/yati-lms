import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';

/**
 * Live updates for one game (the server's competitions/realtime.js): the
 * server says the moment the game changes — a player joins, gets ready, the
 * host starts, someone answers or moves, a timer runs out — and `onChange`
 * is called so the page fetches its own view at once. The push carries no
 * game state; the page's poll stays as the fallback. Returns whether the
 * socket is connected, so the page can poll less often while it is.
 *
 * The socket lives at the API's host (VITE_API_URL without "/api") and signs
 * in with the student's token.
 */
const socketUrl = () => String(api.defaults.baseURL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

export default function useLiveGame(gameId, onChange) {
    const [connected, setConnected] = useState(false);
    const changed = useRef(onChange);
    useEffect(() => { changed.current = onChange; }, [onChange]);

    useEffect(() => {
        let token = null;
        try { token = localStorage.getItem('studentToken'); } catch { /* storage unavailable: polling only */ }
        if (!gameId || !token) return undefined;
        const socket = io(socketUrl(), { path: '/socket.io', auth: { token }, transports: ['websocket', 'polling'], reconnection: true });
        // (Re)join the game's channel on every connect: a reconnect after a
        // dropped network picks the game up again, and the page catches up.
        socket.on('connect', () => {
            socket.emit('watch', { gameId }, (r) => { setConnected(!!r?.ok); changed.current?.(); });
        });
        socket.on('disconnect', () => setConnected(false));
        socket.on('connect_error', () => setConnected(false));
        socket.on('game:changed', (e) => { if (e?.id === String(gameId)) changed.current?.(e); });
        return () => { socket.emit('unwatch', { gameId }); socket.disconnect(); };
    }, [gameId]);

    return connected;
}
