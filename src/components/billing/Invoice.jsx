import { forwardRef } from 'react';
import { formatCurrency } from '../../utils/billing';
import { formatInvoiceNumber } from '../../utils/invoiceNumber';

const PAPER_WIDTH = { '58mm': '58mm', '80mm': '80mm', a4: '210mm' };

/**
 * A single component handles all three paper sizes — thermal receipts and A4
 * differ mainly in width and font scale, not in structure, so one template
 * kept in sync is safer than three drifting copies.
 */
const Invoice = forwardRef(function Invoice({ shop, order }, ref) {
  const width = PAPER_WIDTH[shop.paperSize] || '80mm';
  const isThermal = shop.paperSize !== 'a4';

  return (
    <div
      ref={ref}
      className="mx-auto bg-white font-mono text-ink"
      style={{ width, padding: isThermal ? '4mm' : '14mm', fontSize: isThermal ? '11px' : '13px' }}
    >
      <div className="text-center">
        {shop.showLogo && shop.logoUrl && (
          <img src={shop.logoUrl} alt={shop.shopName} className="mx-auto mb-1 h-12 w-12 object-contain" />
        )}
        <p className="font-display text-lg font-bold">{shop.shopName}</p>
        {shop.address && <p>{shop.address}</p>}
        {shop.phone && <p>Ph: {shop.phone}</p>}
        {shop.showGst && shop.gstNumber && <p>GSTIN: {shop.gstNumber}</p>}
      </div>

      <hr className="my-2 border-dashed border-ink" />

      <div className="flex justify-between">
        <span>Bill No: {formatInvoiceNumber(shop.invoicePrefix, order.invoiceSeq)}</span>
        <span>{new Date(order.billedAt).toLocaleDateString('en-IN')}</span>
      </div>
      <div className="flex justify-between">
        <span>Time: {new Date(order.billedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
        <span>Billed by: {order.cashierName}</span>
      </div>
      {order.customer?.name && <div>Customer: {order.customer.name}</div>}

      <hr className="my-2 border-dashed border-ink" />

      <table className="w-full">
        <thead>
          <tr className="text-left">
            <th className="pb-1">Item</th>
            <th className="pb-1 text-center">Qty</th>
            <th className="pb-1 text-right">Rate</th>
            <th className="pb-1 text-right">Amt</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.productId}>
              <td className="pr-1">{item.name}</td>
              <td className="text-center">{item.qty}</td>
              <td className="text-right">{item.price.toFixed(0)}</td>
              <td className="text-right">{(item.price * item.qty).toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="my-2 border-dashed border-ink" />

      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{formatCurrency(order.totals.subtotal)}</span>
      </div>
      {order.totals.discountAmount > 0 && (
        <div className="flex justify-between">
          <span>Discount</span>
          <span>-{formatCurrency(order.totals.discountAmount)}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span>GST</span>
        <span>{formatCurrency(order.totals.gstAmount)}</span>
      </div>
      <div className="flex justify-between">
        <span>Round off</span>
        <span>{formatCurrency(order.totals.roundOff)}</span>
      </div>
      <div className="mt-1 flex justify-between border-t border-ink pt-1 text-sm font-bold">
        <span>Grand Total</span>
        <span>{formatCurrency(order.totals.grandTotal)}</span>
      </div>

      <hr className="my-2 border-dashed border-ink" />

      <div className="flex justify-between">
        <span>Payment</span>
        <span className="uppercase">{order.paymentMethod}</span>
      </div>
      {order.transactionId && (
        <div className="flex justify-between">
          <span>Txn ID</span>
          <span>{order.transactionId}</span>
        </div>
      )}

      <div className="mt-3 text-center">
        <p>{shop.footerMessage}</p>
      </div>
    </div>
  );
});

export default Invoice;
