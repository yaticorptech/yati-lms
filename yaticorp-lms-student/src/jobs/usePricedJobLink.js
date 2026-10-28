/**
 * "Find Job" opens a listing on another site, so there is no server request
 * to charge on. When the admin has priced it (Wallet rules → Find Job), the
 * click pays first — once per job, so reopening the same listing is free —
 * and only then opens the listing. A short balance says so and opens nothing.
 * While it is free the link is left to behave as a plain link.
 *
 * The price is agreed in the wallet popup first (utils/walletCharge); its
 * "Pay" click opens the new tab, so the popup is never hidden behind a blank
 * tab and the browser does not block the tab as a pop-up.
 *
 * Returns { open, error }: `open` is the link's onClick, `error` what to say
 * beside the link when the charge failed for any reason but the balance. A
 * short balance has the app's own message (utils/walletCharge opens it); this
 * used to put a browser alert() with the same words on top of it.
 */
import { useCallback, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import api from '../utils/api';
import { useWalletCost } from '../context/useRewards';
import { serverMessage, isShortOfFunds, isWalletCancel } from '../utils/walletCharge';
import { openExternal } from '../native/saveFile';

export default function usePricedJobLink() {
    const { amount } = useWalletCost('find_job');
    const [error, setError] = useState('');
    // Paid for during this visit: from then on the link opens as a plain link.
    const paid = useRef(new Set());
    const open = useCallback(async (event, job) => {
        if (!amount || !job?.url) return; // free: the <a> opens it as usual
        const ref = String(job.id || job.url);
        if (paid.current.has(ref)) return;
        event.preventDefault();
        setError('');
        const native = Capacitor.isNativePlatform();
        let tab = null;
        try {
            // On the web the tab is opened inside the popup's "Pay" click.
            await api.post('/rewards/wallet/spend', { action: 'find_job', ref }, { walletBeforeConfirm: () => { if (!native) tab = window.open('', '_blank'); } });
            paid.current.add(ref);
            if (native) { await openExternal(job.url); return; }
            // Paid for on an earlier visit, so no popup was shown: open it now.
            if (!tab) tab = window.open('', '_blank');
            if (tab) { tab.opener = null; tab.location.href = job.url; }
            else setError('Your browser blocked the new tab. Tap the job again to open it.');
        } catch (e) {
            tab?.close();
            if (!isShortOfFunds(e) && !isWalletCancel(e)) setError(serverMessage(e, 'This job could not be opened just now. Please try again.'));
        }
    }, [amount]);
    return { open, error };
}
