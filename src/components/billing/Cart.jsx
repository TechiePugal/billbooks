import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiOutlinePause, HiOutlineTrash, HiXMark } from 'react-icons/hi2';
import CartItem from './CartItem';
import CartSummary from './CartSummary';
import HoldBillModal from './HoldBillModal';
import Button from '../common/Button';
import Input from '../common/Input';
import { useCartStore } from '../../store/cartStore';
import { calculateBillTotals } from '../../utils/billing';
import toast from 'react-hot-toast';

export default function Cart({ onCheckout, onClose }) {
  const { t } = useTranslation();
  const items = useCartStore((s) => s.items);
  const discount = useCartStore((s) => s.discount);
  const customer = useCartStore((s) => s.customer);
  const setCustomer = useCartStore((s) => s.setCustomer);
  const clearCart = useCartStore((s) => s.clearCart);
  const holdCurrentBill = useCartStore((s) => s.holdCurrentBill);
  const heldBills = useCartStore((s) => s.heldBills);
  const [showHoldList, setShowHoldList] = useState(false);

  const totals = calculateBillTotals(items, discount);

  const handleHold = () => {
    if (items.length === 0) return;
    holdCurrentBill();
    toast.success(t('cart.billHeldToast'));
  };

  const handleClear = () => {
    if (items.length === 0) return;
    clearCart();
    toast(t('cart.cartClearedToast'), { icon: '🗑️' });
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="font-display text-lg font-semibold text-brand-700">{t('cart.currentBill')}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHoldList(true)}
            className="relative rounded-full p-2 text-brand-500 active:bg-brand-50"
            aria-label={t('cart.heldBills')}
          >
            <HiOutlinePause className="h-5 w-5" />
            {heldBills.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-brand-900">
                {heldBills.length}
              </span>
            )}
          </button>
          <button onClick={handleClear} className="rounded-full p-2 text-gray-400 active:bg-gray-50" aria-label={t('common.delete')}>
            <HiOutlineTrash className="h-5 w-5" />
          </button>
          {onClose && (
            <button onClick={onClose} className="rounded-full p-2 text-gray-400 active:bg-gray-50" aria-label={t('common.close')}>
              <HiXMark className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {items.length === 0 ? (
          <p className="mt-10 text-center text-sm text-gray-400">{t('cart.tapToAdd')}</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <CartItem key={item.productId} item={item} />
            ))}
          </div>
        )}
      </div>

      <div
        className="border-t border-gray-100 px-4 pt-3"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <details className="mb-2">
          <summary className="cursor-pointer text-xs font-medium text-gray-400">
            {t('cart.customerDetailsOptional')}
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Input
              placeholder={t('cart.namePlaceholder')}
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              className="!py-2 text-sm"
            />
            <Input
              placeholder={t('cart.phonePlaceholder')}
              value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              className="!py-2 text-sm"
            />
          </div>
        </details>

        <CartSummary items={items} />

        <div className="mt-3 flex gap-2">
          <Button variant="outline" onClick={handleHold} disabled={items.length === 0}>
            {t('cart.holdBill')}
          </Button>
          <Button
            variant="primary"
            onClick={() => onCheckout(totals)}
            disabled={items.length === 0}
          >
            {t('cart.charge')} {items.length > 0 ? `· ${t('billing.itemCount', { count: items.length })}` : ''}
          </Button>
        </div>
      </div>

      <HoldBillModal isOpen={showHoldList} onClose={() => setShowHoldList(false)} />
    </div>
  );
}
