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

export const CLOSED_JOB = 'This job has closed. The employer took the listing down.';

/** Ask the server whether the employer's page is still up. Unsure counts as up. */
export async function jobStillOpen(job) {
    try {
        const { data } = await api.post('/jobs/check-link', job?.id && /^[a-f0-9]{24}$/i.test(String(job.id)) ? { id: job.id } : { url: job.url });
        return data?.open !== false;
    } catch {
        return true;
    }
}

/**
 * Open a job's page only once it is known to be up. The tab is opened at the
 * click (so the browser does not block it) and sent on after the check, or
 * closed again when the job is gone. Resolves false when the job has closed.
 */
export async function openCheckedJob(job) {
    const native = Capacitor.isNativePlatform();
    const tab = native ? null : window.open('', '_blank');
    const open = await jobStillOpen(job);
    if (!open) { tab?.close(); return false; }
    if (native) await openExternal(job.url);
    else if (tab) { tab.opener = null; tab.location.href = job.url; }
    else window.open(job.url, '_blank', 'noopener');
    return true;
}

export default function usePricedJobLink() {
    const { amount } = useWalletCost('find_job');
    const [error, setError] = useState('');
    // Paid for during this visit: from then on the link opens as a plain link.
    const paid = useRef(new Set());
    const open = useCallback(async (event, job) => {
        if (!job?.url) return;
        event.preventDefault();
        setError('');
        const ref = String(job.id || job.url);
        // Free, or already paid for: just check the job is still up and open it.
        if (!amount || paid.current.has(ref)) {
            if (!(await openCheckedJob(job))) setError(CLOSED_JOB);
            return;
        }
        // Priced: never charge for a job that has closed.
        if (!(await jobStillOpen(job))) { setError(CLOSED_JOB); return; }
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
