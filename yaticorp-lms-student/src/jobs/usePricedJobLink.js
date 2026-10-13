/**
 * "Find Job" opens a listing on another site, so there is no server request
 * to charge on. When the admin has priced it (Wallet rules → Find Job), the
 * click pays first — once per job, so reopening the same listing is free —
 * and only then opens the listing. A short balance says so and opens nothing.
 * While it is free the link is left to behave as a plain link.
 *
 * Returns { open, error }: `open` is the link's onClick, `error` what to say
 * beside the link when the charge failed for any reason but the balance. A
 * short balance has the app's own message (utils/walletCharge opens it); this
 * used to put a browser alert() with the same words on top of it.
 */
import { useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import api from '../utils/api';
import { useWalletCost } from '../context/useRewards';
import { serverMessage, isShortOfFunds } from '../utils/walletCharge';
import { openExternal } from '../native/saveFile';

export default function usePricedJobLink() {
    const { amount } = useWalletCost('find_job');
    const [error, setError] = useState('');
    const open = useCallback(async (event, job) => {
        if (!amount || !job?.url) return; // free: the <a> opens it as usual
        event.preventDefault();
        setError('');
        // On the web the new tab is opened now, inside the click, or the
        // browser blocks it as a pop-up once the payment has been awaited.
        const tab = Capacitor.isNativePlatform() ? null : window.open('', '_blank');
        try {
            await api.post('/rewards/wallet/spend', { action: 'find_job', ref: String(job.id || job.url) });
            if (tab) { tab.opener = null; tab.location.href = job.url; } else await openExternal(job.url);
        } catch (e) {
            tab?.close();
            if (!isShortOfFunds(e)) setError(serverMessage(e, 'This job could not be opened just now. Please try again.'));
        }
    }, [amount]);
    return { open, error };
}
