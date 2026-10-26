/**
 * Paying an entry fee with Razorpay Checkout: the server makes the order
 * (`start`), Razorpay's own window takes the payment, and the server checks
 * Razorpay's signature (`verify`) before marking it paid. Resolves once the
 * payment is recorded; rejects with a message to show (cancelled, failed).
 */
const SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';
let loading = null;

const loadCheckout = () => {
    if (window.Razorpay) return Promise.resolve();
    loading = loading || new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = SCRIPT;
        s.async = true;
        s.onload = resolve;
        s.onerror = () => { loading = null; reject(new Error('Could not open Razorpay. Check your internet connection and try again.')); };
        document.body.appendChild(s);
    });
    return loading;
};

/**
 * Razorpay not set up on the server yet: a test checkout, so the whole flow
 * can be tried. No money moves; the payment is recorded as a test.
 */
const testCheckout = (order) => new Promise((resolve, reject) => {
    const box = document.createElement('div');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.style.cssText = 'position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.6);padding:16px;font-family:inherit';
    const rupees = (order.amount / 100).toLocaleString('en-IN');
    box.innerHTML = `
        <div style="width:100%;max-width:360px;border-radius:20px;background:#fff;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,.4)">
            <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;padding:20px 22px">
                <div style="font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;opacity:.85">Test payment</div>
                <div data-desc style="margin-top:4px;font-size:15px;font-weight:600"></div>
                <div style="margin-top:10px;font-size:32px;font-weight:900">₹${rupees}</div>
            </div>
            <div style="padding:20px 22px">
                <p style="margin:0 0 16px;font-size:13px;color:#475569">Online payment (Razorpay) is not set up yet, so this is a test: no money is taken. It is recorded as paid, as a real payment would be.</p>
                <button data-pay style="width:100%;border:0;border-radius:14px;background:#4f46e5;color:#fff;padding:12px;font-size:14px;font-weight:800;cursor:pointer">Pay ₹${rupees} (test)</button>
                <button data-cancel style="margin-top:8px;width:100%;border:0;background:none;color:#64748b;padding:8px;font-size:13px;font-weight:600;cursor:pointer">Cancel</button>
            </div>
        </div>`;
    box.querySelector('[data-desc]').textContent = order.description || 'Entry fee';
    const done = (fn) => { box.remove(); fn(); };
    box.querySelector('[data-pay]').onclick = () => done(() => resolve({ razorpay_order_id: order.orderId, razorpay_payment_id: `test_pay_${Date.now()}`, razorpay_signature: 'test' }));
    box.querySelector('[data-cancel]').onclick = () => done(() => reject(new Error('Payment cancelled. You can pay whenever you are ready.')));
    document.body.appendChild(box);
});

export const payOnline = async (start, verify) => {
    const order = await start();
    if (order.paid) return order;
    if (order.test) return verify(await testCheckout(order));
    await loadCheckout();
    return new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
            key: order.keyId,
            order_id: order.orderId,
            amount: order.amount,
            currency: order.currency,
            name: order.name,
            description: order.description,
            prefill: order.prefill,
            theme: { color: '#4f46e5' },
            handler: (response) => { verify(response).then(resolve, reject); },
            modal: { ondismiss: () => reject(new Error('Payment cancelled. You can pay whenever you are ready.')) }
        });
        rzp.on('payment.failed', (r) => reject(new Error(r?.error?.description || 'The payment did not go through. Try again.')));
        rzp.open();
    });
};
