/**
 * The "claim your wallet bonus" popup, over the dashboard, for a signed-in
 * student whose card has no AI Passport linked yet. It comes:
 *  - at once, with the ID filled in, when the passport's QR link opened the app;
 *  - otherwise once a day until they link one ("Later" hides it for a day).
 * Not while the profile-picture gate is up, nor while an admin views as the student.
 */
import React, { useContext, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';
import { ADMIN_VIEW_KEY } from '../../utils/sessionExpiry';
import PassportClaim from './PassportClaim';
import { getPendingPassport, clearPendingPassport, dismissPassportPopup, popupDismissedRecently } from './passportPending';

const adminIsViewing = () => { try { return !!localStorage.getItem(ADMIN_VIEW_KEY); } catch { return false; } };

export default function PassportClaimPopup() {
    const { user } = useContext(AuthContext);
    const [status, setStatus] = useState(null);
    const [code, setCode] = useState('');
    const [show, setShow] = useState(false);
    const ready = Boolean(user && user.profilePicture && !adminIsViewing());

    useEffect(() => {
        if (!ready) return undefined;
        let alive = true;
        const check = () => {
            const pending = getPendingPassport();
            if (!pending && popupDismissedRecently()) return;
            api.get('/user/passport').then((r) => {
                if (!alive) return;
                if (r.data.linked) { clearPendingPassport(); return; }
                setStatus(r.data); setCode(pending); setShow(true);
            }).catch(() => {});
        };
        // A moment after the dashboard settles, not over its first paint.
        const t = setTimeout(check, 1200);
        // The QR link opened while signed in: bring it up now.
        window.addEventListener('yati:passport-pending', check);
        return () => { alive = false; clearTimeout(t); window.removeEventListener('yati:passport-pending', check); };
    }, [ready]);

    useEffect(() => {
        if (!show) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') later(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const later = () => { dismissPassportPopup(); setShow(false); };
    if (!show || !status) return null;

    return (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) later(); }}>
            <div role="dialog" aria-modal="true" aria-labelledby="passport-popup-title"
                className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl">
                <button type="button" onClick={later} aria-label="Close"
                    className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25">
                    <X size={17} />
                </button>
                <PassportClaim variant="modal" status={status} initialCode={code} onClose={() => setShow(false)} />
            </div>
        </div>
    );
}
