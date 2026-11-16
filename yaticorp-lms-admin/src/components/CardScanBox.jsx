/**
 * The camera reading an AI card's QR code (2026-11-14, shared): the first code read is handed back
 * and the camera stops. utils/cardNumber.js reads the number out of it.
 */
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useQrReader } from '../utils/qrReader';

export default function CardScanBox({ id = 'qr-reader-card', onRead, onClose }) {
    const [done, setDone] = useState(false);
    const { error, retry } = useQrReader(id, (text) => { if (done) return; setDone(true); onRead(text); }, !done);
    return (
        <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-2">
            <button type="button" onClick={onClose} aria-label="Close the camera" className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1 text-slate-500 shadow hover:text-slate-800"><X size={14} /></button>
            <div id={id} className="w-full overflow-hidden rounded-lg" />
            {error
                ? <p className="mt-2 text-xs text-red-600">{error} <button type="button" onClick={retry} className="font-bold underline">Try again</button></p>
                : <p className="mt-1 text-center text-xs text-slate-500">Hold the QR code on the card up to the camera.</p>}
        </div>
    );
}
