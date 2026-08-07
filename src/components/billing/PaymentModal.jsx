import { useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import UpiQr from './UpiQr';
import Invoice from './Invoice';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useShopSettings } from '../../hooks/useShopSettings';
import { saveOrder } from '../../services/orderService';
import { formatCurrency } from '../../utils/billing';
import { formatInvoiceNumber } from '../../utils/invoiceNumber';

const METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'upi', label: 'UPI' },
  { id: 'card', label: 'Card' },
  { id: 'split', label: 'Split' }
];

export default function PaymentModal({ isOpen, onClose, totals }) {
  const items = useCartStore((s) => s.items);
  const discount = useCartStore((s) => s.discount);
  const customer = useCartStore((s) => s.customer);
  const clearCart = useCartStore((s) => s.clearCart);
  const user = useAuthStore((s) => s.user);
  const { settings } = useShopSettings();

  const [method, setMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [split, setSplit] = useState({ cash: '', upi: '', card: '' });
  const [transactionId, setTransactionId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedOrder, setSavedOrder] = useState(null);

  const invoiceRef = useRef(null);
  const handlePrint = useReactToPrint({ contentRef: invoiceRef });

  const balanceReturn = useMemo(() => {
    const received = Number(cashReceived) || 0;
    return Math.max(received - totals.grandTotal, 0);
  }, [cashReceived, totals.grandTotal]);

  const splitTotal = useMemo(
    () => (Number(split.cash) || 0) + (Number(split.upi) || 0) + (Number(split.card) || 0),
    [split]
  );

  const canConfirm =
    method === 'cash'
      ? Number(cashReceived) >= totals.grandTotal
      : method === 'split'
      ? Math.abs(splitTotal - totals.grandTotal) < 0.5
      : true;

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      const order = {
        shopId: user.shopId,
        cashierName: user.name || user.email,
        items,
        discount,
        totals,
        customer,
        paymentMethod: method,
        splitDetails: method === 'split' ? split : null,
        transactionId: transactionId || null,
        billedAt: new Date().toISOString(),
        status: 'completed'
      };
      const { invoiceSeq } = await saveOrder(user.shopId, order);
      setSavedOrder({ ...order, invoiceSeq });
      clearCart();
      toast.success('Bill saved!');
    } catch (err) {
      toast.error(err.message || 'Could not save the order. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleWhatsApp = () => {
    if (!customer.phone) {
      toast.error('Add a customer phone number to share on WhatsApp.');
      return;
    }
    const invoiceNo = formatInvoiceNumber(settings.invoicePrefix, savedOrder.invoiceSeq);
    const message = encodeURIComponent(
      `${settings.shopName}\nBill ${invoiceNo}\nTotal: ${formatCurrency(totals.grandTotal)}\n${settings.footerMessage}`
    );
    window.open(`https://wa.me/91${customer.phone.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const handleStartNewBill = () => {
    setSavedOrder(null);
    setCashReceived('');
    setSplit({ cash: '', upi: '', card: '' });
    setTransactionId('');
    setMethod('cash');
    onClose();
  };

  if (!isOpen) return null;

  // --- Post-payment: invoice + print/share actions ---
  if (savedOrder) {
    return (
      <Modal isOpen={isOpen} onClose={handleStartNewBill} title="Bill Saved">
        <div className="max-h-[50vh] overflow-y-auto rounded-card border border-gray-100">
          <Invoice ref={invoiceRef} shop={settings} order={savedOrder} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="primary" onClick={handlePrint}>
            Print Invoice
          </Button>
          <Button variant="outline" onClick={handleWhatsApp}>
            Share on WhatsApp
          </Button>
        </div>
        <Button variant="accent" className="mt-2" onClick={handleStartNewBill}>
          Start New Bill
        </Button>
      </Modal>
    );
  }

  // --- Payment collection ---
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Take Payment">
      <p className="mb-3 text-center font-display text-3xl font-bold text-brand-700">
        {formatCurrency(totals.grandTotal)}
      </p>

      <div className="mb-4 grid grid-cols-4 gap-2">
        {METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id)}
            className={`rounded-card py-2 text-sm font-semibold transition ${
              method === m.id ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-600'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {method === 'cash' && (
        <div className="space-y-2">
          <Input
            label="Amount received"
            type="number"
            inputMode="decimal"
            value={cashReceived}
            onChange={(e) => setCashReceived(e.target.value)}
            autoFocus
          />
          <div className="flex justify-between rounded-card bg-brand-50 px-3 py-2 text-sm font-medium">
            <span>Balance to return</span>
            <span>{formatCurrency(balanceReturn)}</span>
          </div>
        </div>
      )}

      {method === 'upi' && (
        <div className="space-y-3">
          <UpiQr
            qrType={settings.qrType}
            staticQrUrl={settings.staticQrUrl}
            payeeVpa={settings.upiId}
            payeeName={settings.merchantName || settings.shopName}
            amount={totals.grandTotal}
            invoiceNumber="pending"
          />
          <Input
            label="Transaction ID (optional)"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
          />
        </div>
      )}

      {method === 'card' && (
        <Input
          label="Transaction / Reference ID (optional)"
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
        />
      )}

      {method === 'split' && (
        <div className="space-y-2">
          {['cash', 'upi', 'card'].map((k) => (
            <Input
              key={k}
              label={k.toUpperCase()}
              type="number"
              inputMode="decimal"
              value={split[k]}
              onChange={(e) => setSplit({ ...split, [k]: e.target.value })}
            />
          ))}
          <div className={`text-right text-sm font-medium ${splitTotal === totals.grandTotal ? 'text-brand-600' : 'text-red-500'}`}>
            Entered: {formatCurrency(splitTotal)} / {formatCurrency(totals.grandTotal)}
          </div>
        </div>
      )}

      <Button className="mt-4" onClick={handleConfirm} disabled={!canConfirm} loading={isSaving}>
        Confirm Payment
      </Button>
    </Modal>
  );
}
