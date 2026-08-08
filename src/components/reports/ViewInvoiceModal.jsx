import { useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Invoice from '../billing/Invoice';
import { formatCurrency } from '../../utils/billing';
import { formatInvoiceNumber } from '../../utils/invoiceNumber';

/**
 * @param {object} order - the order to display, or null to keep the modal closed
 * @param {object} settings - shop settings (for invoice prefix, paper size, branding)
 * @param {boolean} autoPrint - if true, opens the print dialog automatically
 *   once the invoice has rendered — used for the one-tap "reprint" action on
 *   each row in the bills list, so the cashier doesn't need a second tap
 *   inside the modal to get the paper copy.
 */
export default function ViewInvoiceModal({ order, settings, autoPrint = false, onClose }) {
  const { t } = useTranslation();
  const invoiceRef = useRef(null);
  const handlePrint = useReactToPrint({ contentRef: invoiceRef });
  const hasAutoPrintedRef = useRef(false);

  useEffect(() => {
    if (!order) {
      hasAutoPrintedRef.current = false;
      return;
    }
    if (autoPrint && !hasAutoPrintedRef.current) {
      hasAutoPrintedRef.current = true;
      // Small delay so the invoice content is fully painted before the
      // browser's print dialog captures it — react-to-print handles most of
      // this itself, but an extra tick avoids a blank first print on slower devices.
      const timer = setTimeout(() => handlePrint(), 150);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, autoPrint]);

  const handleWhatsApp = () => {
    if (!order.customer?.phone) {
      toast.error(t('payment.addPhoneForWhatsAppToast'));
      return;
    }
    const invoiceNo = formatInvoiceNumber(settings.invoicePrefix, order.invoiceSeq);
    const message = encodeURIComponent(
      `${settings.shopName}\nBill ${invoiceNo}\nTotal: ${formatCurrency(order.totals.grandTotal)}\n${settings.footerMessage}`
    );
    window.open(`https://wa.me/91${order.customer.phone.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  return (
    <Modal
      isOpen={!!order}
      onClose={onClose}
      title={order ? formatInvoiceNumber(settings.invoicePrefix, order.invoiceSeq) : ''}
    >
      {order && (
        <>
          <div className="max-h-[55vh] overflow-y-auto rounded-card border border-gray-100">
            <Invoice ref={invoiceRef} shop={settings} order={order} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={handlePrint}>
              {t('payment.printInvoice')}
            </Button>
            <Button variant="outline" onClick={handleWhatsApp}>
              {t('payment.shareOnWhatsApp')}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
