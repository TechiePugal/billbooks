import { useTranslation } from 'react-i18next';
import { HiXMark } from 'react-icons/hi2';
import { useCartStore } from '../../store/cartStore';
import { formatCurrency, calculateBillTotals } from '../../utils/billing';

export default function HeldBillsStrip() {
  const { t } = useTranslation();
  const heldBills = useCartStore((s) => s.heldBills);
  const items = useCartStore((s) => s.items);
  const recallBill = useCartStore((s) => s.recallBill);
  const discardHeldBill = useCartStore((s) => s.discardHeldBill);

  if (heldBills.length === 0) return null;

  const handleRecall = (bill) => {
    if (items.length > 0 && !window.confirm(t('cart.recallConfirm'))) return;
    recallBill(bill.id);
  };

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-2">
      {heldBills.map((bill, i) => {
        const totals = calculateBillTotals(bill.items, bill.discount);
        return (
          <button
            key={bill.id}
            onClick={() => handleRecall(bill)}
            // Fixed width + shrink-0 so cards stay a consistent, scannable
            // size and the row scrolls horizontally once there are more
            // holds than fit the screen, rather than wrapping or squeezing.
            className="relative w-36 shrink-0 rounded-card border border-accent-300 bg-accent-50 px-3 py-2 text-left shadow-card active:scale-95"
          >
            <span
              onClick={(e) => {
                e.stopPropagation();
                discardHeldBill(bill.id);
              }}
              role="button"
              aria-label={t('cart.discard')}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-gray-400 shadow-card active:text-red-500"
            >
              <HiXMark className="h-3.5 w-3.5" />
            </span>
            <p className="truncate text-sm font-semibold text-brand-800">
              {bill.label || `${t('cart.holdBill')} ${i + 1}`}
            </p>
            <p className="text-xs text-brand-600">
              {t('billing.itemCount', { count: bill.items.length })} · {formatCurrency(totals.grandTotal)}
            </p>
            <p className="text-[10px] text-gray-400">
              {new Date(bill.heldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </button>
        );
      })}
    </div>
  );
}
