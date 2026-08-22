import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useCartStore } from '../../store/cartStore';
import { formatCurrency, calculateBillTotals } from '../../utils/billing';

export default function HoldBillModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const heldBills = useCartStore((s) => s.heldBills);
  const recallBill = useCartStore((s) => s.recallBill);
  const discardHeldBill = useCartStore((s) => s.discardHeldBill);
  const items = useCartStore((s) => s.items);

  const handleRecall = (id) => {
    if (items.length > 0) {
      const confirmed = window.confirm(t('cart.recallConfirm'));
      if (!confirmed) return;
    }
    recallBill(id);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('cart.heldBills')}>
      {heldBills.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">{t('cart.noHeldBills')}</p>
      ) : (
        <ul className="space-y-2">
          {heldBills.map((bill) => {
            const totals = calculateBillTotals(bill.items, bill.discount);
            return (
              <li key={bill.id} className="flex items-center justify-between rounded-card bg-brand-50 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">
                    {bill.label ? `${bill.label} · ` : ''}
                    {t('billing.itemCount', { count: bill.items.length })} · {formatCurrency(totals.grandTotal)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(bill.heldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {bill.customer?.name ? ` · ${bill.customer.name}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRecall(bill.id)} className="text-sm font-semibold text-brand-600">
                    {t('cart.recall')}
                  </button>
                  <button onClick={() => discardHeldBill(bill.id)} className="text-sm text-red-400">
                    {t('cart.discard')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Button variant="ghost" onClick={onClose} className="mt-4">
        {t('common.close')}
      </Button>
    </Modal>
  );
}
