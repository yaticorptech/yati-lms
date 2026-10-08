/**
 * " · ₹20" after a button's words when the admin has priced that feature
 * under Wallet rules; nothing at all while it is free.
 */
import { useWalletCost } from '../../context/useRewards';
import { priceLabel } from '../../utils/walletCharge';

export default function PriceTag({ action, className = '' }) {
    const { amount, currency } = useWalletCost(action);
    if (!amount) return null;
    return <span className={`whitespace-nowrap font-black opacity-90 ${className}`} title="Paid from your wallet balance">· {priceLabel(amount, currency)}</span>;
}
