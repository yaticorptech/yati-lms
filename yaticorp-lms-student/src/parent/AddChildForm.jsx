/**
 * Adding a child: scan the QR code on their card, or type its number (2026-11-19). Used in the child switcher's
 * "Add a child" popup and on the empty dashboard. A child added is chosen at once.
 */
import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, Loader2, Plus, ScanLine, X } from 'lucide-react';
import parentApi from './parentSession';

export default function AddChildForm({ onAdded, autoFocus = false }) {
    const [card, setCard] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [added, setAdded] = useState('');
    const [scanning, setScanning] = useState(false);
    const scannerRef = useRef(null);
    const add = async (body) => {
        setBusy(true); setError(''); setAdded('');
        try { const r = await parentApi.post('/children', body); setCard(''); setAdded(r.data.child.name); onAdded?.(r.data.child); }
        catch (err) { setError(err.response?.data?.message || (!err.response ? 'Check your connection and try again.' : 'Could not add this card.')); }
        finally { setBusy(false); }
    };
    const submit = (e) => {
        e.preventDefault();
        if (card.length !== 12) { setError('A card number has 12 digits.'); return; }
        setScanning(false);
        add({ cardNumber: card });
    };
    useEffect(() => {
        const stop = () => {
            const inst = scannerRef.current;
            scannerRef.current = null;
            if (!inst) return;
            try { Promise.resolve(inst.stop()).then(() => { try { inst.clear(); } catch { /* already clear */ } }).catch(() => {}); } catch { /* was not running */ }
        };
        if (!scanning) { stop(); return undefined; }
        let cancelled = false;
        import('html5-qrcode').then(({ Html5Qrcode }) => {
            if (cancelled) return undefined;
            const inst = new Html5Qrcode('child-card-scanner');
            scannerRef.current = inst;
            return inst.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } }, (text) => {
                if (cancelled) return;
                setScanning(false);
                add({ code: text.trim() });
            }, () => {});
        }).catch(() => {
            if (cancelled) return;
            scannerRef.current = null;
            setScanning(false);
            setError('The camera is not available. Type the card number instead.');
        });
        return () => { cancelled = true; stop(); };
        // `add` only sends and sets state; the camera restarts only with `scanning`.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanning]);

    return (
        <form onSubmit={submit} noValidate data-add-child>
            <button type="button" onClick={() => { setError(''); setAdded(''); setScanning((on) => !on); }} disabled={busy} aria-pressed={scanning}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition disabled:opacity-60 ${scanning ? 'bg-slate-800 text-white hover:bg-slate-900' : 'bg-teal-600 text-white hover:bg-teal-700'}`} data-scan-child>
                {scanning ? <X size={17} /> : <ScanLine size={17} />} {scanning ? 'Stop scanning' : 'Scan your child’s card'}
            </button>
            {/* html5-qrcode needs this element present before it starts. */}
            <div className={scanning ? 'mt-3' : 'hidden'}>
                <div id="child-card-scanner" className="overflow-hidden rounded-2xl bg-black" />
                <p className="mt-2 text-xs text-slate-500">Hold the QR code on your child’s card up to the camera.</p>
            </div>
            <p className="my-3 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" />or type the number<span className="h-px flex-1 bg-slate-200" /></p>
            <div className="flex gap-2">
                <label htmlFor="child-card" className="sr-only">Your child’s card number</label>
                <div className="relative min-w-0 flex-1">
                    <CreditCard size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input id="child-card" inputMode="numeric" autoComplete="off" autoFocus={autoFocus} value={card.replace(/(\d{4})(?=\d)/g, '$1 ')} placeholder="12-digit card number"
                        onChange={(e) => { setCard(e.target.value.replace(/\D/g, '').slice(0, 12)); setError(''); setAdded(''); }}
                        aria-invalid={!!error || undefined} aria-describedby={error ? 'child-card-error' : undefined}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 font-mono text-[15px] tracking-wider text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15" />
                </div>
                <button type="submit" disabled={busy} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-teal-600 bg-white px-4 text-sm font-bold text-teal-700 hover:bg-teal-50 disabled:opacity-70">
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add
                </button>
            </div>
            {busy && !card && <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-600"><Loader2 size={15} className="animate-spin" /> Adding…</p>}
            {added && <p role="status" className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><CheckCircle2 size={15} /> {added} is added.</p>}
            {error && <p id="child-card-error" role="alert" className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-rose-600"><AlertCircle size={15} /> {error}</p>}
        </form>
    );
}
