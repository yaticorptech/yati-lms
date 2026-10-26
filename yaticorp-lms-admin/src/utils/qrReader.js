/**
 * The camera QR reader (html5-qrcode), started and stopped safely.
 *
 * stopReader: its stop() throws (rather than rejecting) when the camera is
 * not running, which is the case while the browser is still asking for
 * permission, after the camera was refused, or on a device without one.
 * Thrown from a React effect's cleanup, that took the whole page down
 * ("Something went wrong on this page"). `started` is the promise start()
 * returned: the reader is stopped once it has settled, so a camera that
 * comes on after the popup closed is still turned off.
 *
 * useQrReader: a reader that runs while `active`, calling onRead with each
 * code it reads. It waits a moment before starting: React's development
 * double mount otherwise started the camera twice on one element, and the
 * second start failed ("The camera could not be opened").
 */
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export const stopReader = (reader, started = Promise.resolve()) => Promise.resolve(started)
    .catch(() => {})
    .then(() => { try { return reader?.stop(); } catch { return undefined; } })
    .catch(() => {});

/** What went wrong with the camera, in words the person can act on. */
export const cameraProblem = (err) => {
    const text = `${err?.name || ''} ${err?.message || ''} ${typeof err === 'string' ? err : ''}`;
    if (typeof window !== 'undefined' && (!window.isSecureContext || !navigator.mediaDevices)) return 'The camera works only on a secure (https) address or localhost. Type the card numbers below instead.';
    if (/NotAllowed|Permission|denied/i.test(text)) return 'Camera access was refused. Allow the camera for this site (the camera icon in the address bar), then press Try again.';
    if (/NotFound|DevicesNotFound|Overconstrained|Requested device not found/i.test(text)) return 'No camera was found on this device. Type the card numbers below instead.';
    if (/NotReadable|TrackStart|Could not start video source|in use/i.test(text)) return 'The camera is being used by another app or tab. Close it, then press Try again.';
    return 'The camera could not be opened. Press Try again, or type the card numbers below.';
};

export const useQrReader = (elementId, onRead, active = true) => {
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    // The latest onRead, without restarting the camera when it changes.
    const onReadRef = useRef(onRead);
    useEffect(() => { onReadRef.current = onRead; }, [onRead]);

    useEffect(() => {
        if (!active) return undefined;
        let closed = false;
        let reader = null;
        let started = null;
        const timer = setTimeout(() => {
            try { reader = new Html5Qrcode(elementId); } catch (e) { setError(cameraProblem(e)); return; }
            started = reader.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } }, (text) => onReadRef.current(text), () => {})
                .catch((e) => { if (!closed) setError(cameraProblem(e)); });
        }, 80);
        return () => {
            closed = true;
            clearTimeout(timer);
            if (reader) stopReader(reader, started).finally(() => { try { reader.clear(); } catch { /* already cleared */ } });
        };
    }, [elementId, active, attempt]);

    return { error, retry: () => { setError(''); setAttempt((n) => n + 1); } };
};
