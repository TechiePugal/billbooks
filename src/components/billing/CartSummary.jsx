import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, calculateBillTotals } from '../../utils/billing';
import { useCartStore } from '../../store/cartStore';

export default function CartSummary({ items }) {
  const { t } = useTranslation();
  const discount = useCartStore((s) => s.discount);
  const setDiscount = useCartStore((s) => s.setDiscount);
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  const totals = calculateBillTotals(items, discount);

  return (
    <div className="space-y-1.5 border-t border-dashed border-gray-200 pt-3 text-sm">
      <Row label={t('cart.subtotal')} value={formatCurrency(totals.subtotal)} />

      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowDiscountInput((v) => !v)}
          className="text-gray-500 underline decoration-dotted"
        >
          {t('cart.discount')}
        </button>
        {showDiscountInput ? (
          <div className="flex items-center gap-1">
            <select
              value={discount.type}
              onChange={(e) => setDiscount({ ...discount, type: e.target.value })}
              className="rounded-md border border-gray-200 bg-white px-1.5 py-1 text-xs"
            >
              <option value="flat">₹</option>
              <option value="percent">%</option>
            </select>
            <input
              type="number"
              value={discount.value}
              onChange={(e) => setDiscount({ ...discount, value: Math.max(0, Number(e.target.value)) })}
              className="w-16 rounded-md border border-gray-200 px-2 py-1 text-right text-xs"
            />
          </div>
        ) : (
          <span className="font-medium text-ink">- {formatCurrency(totals.discountAmount)}</span>
        )}
      </div>

      <Row label={t('cart.gst')} value={formatCurrency(totals.gstAmount)} />
      <Row label={t('cart.roundOff')} value={formatCurrency(totals.roundOff)} />

      <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-base font-display font-bold text-brand-700">
        <span>{t('cart.grandTotal')}</span>
        <span>{formatCurrency(totals.grandTotal)}</span>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-gray-500">
      <span>{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
