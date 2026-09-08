/**
 * The camera for the Aadhaar Secure QR — a dense version-30+ code, so: the
 * browser's native BarcodeDetector where it exists, a 1080p stream, and a
 * photo route that decodes a still on the device with both decoders. The
 * image never leaves the device; only the decoded text does. Stop/clear are
 * guarded because the library throws synchronously when the camera is not
 * yet running (StrictMode's double mount, a fast Cancel).
 */
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CameraOff, Loader2, X, ScanLine, ImageUp, RefreshCw } from 'lucide-react';
const SCANNER_ID = 'aadhaar-qr-scanner', FILE_SCANNER_ID = 'aadhaar-qr-file-scanner', START_TIMEOUT_MS = 20000, HINT_AFTER_MS = 7000;
const LIB = { verbose: false, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], experimentalFeatures: { useBarcodeDetectorIfSupported: true } };
const JS = { verbose: false, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] };
const describe = (err) => { const t = String(err?.message || err || '').toLowerCase(); if (/permission|notallowed|denied/.test(t)) return { code: 'PERMISSION_DENIED', message: 'Camera permission was denied. Allow the camera in your browser settings and try again.' }; if (/notfound|no camera|requested device|could not start|overconstrained/.test(t)) return { code: 'NO_CAMERA', message: 'No camera was found on this device.' }; if (/insecure|secure context|https/.test(t)) return { code: 'INSECURE', message: 'The camera only works on a secure (https) connection.' }; return { code: 'CAMERA_ERROR', message: 'The camera could not be started. Try again.' }; };
export default function AadhaarScanner({ onScan, onCancel, busy }) {
    const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
    const [phase, setPhase] = useState(supported ? 'starting' : 'error');
    const [error, setError] = useState(supported ? null : { code: 'NO_CAMERA', message: 'This browser cannot use the camera.' });
    const [mode, setMode] = useState('camera'); const [attempt, setAttempt] = useState(0); const [photoError, setPhotoError] = useState(''); const [showHint, setShowHint] = useState(false);
    const ref = useRef(null), fileRef = useRef(null), handled = useRef(false);
    useEffect(() => {
        if (!supported || mode !== 'camera') return undefined;
        let cancelled = false; handled.current = false;
        const inst = new Html5Qrcode(SCANNER_ID, LIB); ref.current = inst;
        const timer = setTimeout(() => { if (!cancelled) { setPhase('error'); setError({ code: 'CAMERA_TIMEOUT', message: 'The camera did not start. Check that nothing else is using it and try again.' }); } }, START_TIMEOUT_MS);
        const hint = setTimeout(() => { if (!cancelled) setShowHint(true); }, HINT_AFTER_MS);
        const started = inst.start({ facingMode: 'environment' }, { fps: 12, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.9); return { width: s, height: s }; }, aspectRatio: 1, videoConstraints: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 }, advanced: [{ focusMode: 'continuous' }] } },
            (text) => { if (cancelled || handled.current) return; handled.current = true; onScan(text); }, () => {});
        started.then(() => { clearTimeout(timer); if (!cancelled) setPhase('scanning'); }).catch((err) => { clearTimeout(timer); if (cancelled) return; ref.current = null; setPhase('error'); setError(describe(err)); });
        return () => { cancelled = true; clearTimeout(timer); clearTimeout(hint); ref.current = null; started.catch(() => {}).then(() => { try { return inst.stop(); } catch { return undefined; } }).then(() => { try { inst.clear(); } catch { /* nothing */ } }).catch(() => {}); };
    }, [onScan, supported, mode, attempt]);
    const scanPhoto = async (file) => {
        if (!file || handled.current) return;
        if (!file.type.startsWith('image/')) { setPhotoError('Choose a photo (JPG or PNG).'); return; }
        setPhotoError(''); setMode('photo');
        const readers = [new Html5Qrcode(FILE_SCANNER_ID, LIB), new Html5Qrcode(FILE_SCANNER_ID, JS)];
        try {
            let text = '';
            for (const r of readers) { try { const res = await r.scanFileV2(file, false); text = res?.decodedText || ''; } catch { /* next */ } try { r.clear(); } catch { /* nothing */ } if (text) break; }
            if (!text) throw new Error('empty');
            handled.current = true; onScan(text);
        } catch { setPhotoError('No QR code could be read in that photo. Take it closer and in good light, with the whole QR in frame.'); setPhase('starting'); setMode('camera'); setAttempt((n) => n + 1); }
        finally { if (fileRef.current) fileRef.current.value = ''; }
    };
    const retry = () => { setError(null); setPhase('starting'); setShowHint(false); setAttempt((n) => n + 1); };
    const reading = mode === 'photo';
    return (
        <div className="animate-fade-in-up">
            <h3 className="text-lg font-extrabold text-slate-900">Scan Aadhaar QR</h3>
            <p className="mt-1 text-sm text-slate-500">Position the Aadhaar Secure QR Code inside the frame.</p>
            <div className="relative mx-auto mt-5 aspect-square w-full max-w-xs overflow-hidden rounded-3xl bg-slate-900 ring-1 ring-slate-200">
                <div id={SCANNER_ID} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" /><div id={FILE_SCANNER_ID} className="hidden" aria-hidden="true" />
                {phase !== 'error' && !reading && (<div aria-hidden="true" className="pointer-events-none absolute inset-0"><span className="absolute left-5 top-5 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-white/90" /><span className="absolute right-5 top-5 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-white/90" /><span className="absolute bottom-5 left-5 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-white/90" /><span className="absolute bottom-5 right-5 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-white/90" />{phase === 'scanning' && !busy && <span className="jv-scanline absolute inset-x-8 h-0.5 bg-indigo-400 shadow-[0_0_12px_2px_rgba(129,140,248,0.8)]" />}</div>)}
                {(phase === 'starting' || busy || reading) && (<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/70 text-white"><Loader2 size={28} className="animate-spin" /><p className="text-sm font-semibold">{busy ? 'Validating Aadhaar information…' : reading ? 'Reading the photo…' : 'Starting camera…'}</p></div>)}
                {phase === 'error' && !reading && (<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900 px-6 text-center text-white"><CameraOff size={30} className="text-rose-300" /><p className="text-sm font-semibold">{error?.message}</p><button type="button" onClick={retry} className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold hover:bg-white/25"><RefreshCw size={13} /> Try again</button></div>)}
            </div>
            <p className="mt-4 min-h-5 text-center text-sm font-semibold text-indigo-700" aria-live="polite">{phase === 'scanning' && !busy && !reading ? <span className="inline-flex items-center gap-1.5"><ScanLine size={15} /> Scanning…</span> : phase === 'error' ? 'Camera unavailable' : ''}</p>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => scanPhoto(e.target.files?.[0])} />
            <div className={`mt-3 rounded-2xl border px-4 py-3 text-center transition-colors ${showHint || phase === 'error' ? 'border-indigo-200 bg-indigo-50/70' : 'border-slate-200 bg-slate-50/70'}`}>
                <p className="text-xs text-slate-600">{showHint || phase === 'error' ? 'The Secure QR is very dense. A close, sharp photo of it reads more reliably than the live camera.' : 'Can’t get it to read? Use a photo of the QR instead.'}</p>
                <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || reading} className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-600 transition-colors hover:bg-indigo-50 disabled:opacity-60"><ImageUp size={15} /> Upload a photo of the QR</button>
                {photoError && <p role="alert" className="mt-2 text-xs font-semibold text-rose-600">{photoError}</p>}
            </div>
            <button type="button" onClick={onCancel} disabled={busy} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"><X size={14} /> Cancel</button>
        </div>
    );
}
