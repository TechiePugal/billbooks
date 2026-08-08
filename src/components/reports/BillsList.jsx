import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiOutlineEye, HiOutlinePrinter, HiMagnifyingGlass } from 'react-icons/hi2';
import ViewInvoiceModal from './ViewInvoiceModal';
import { formatCurrency } from '../../utils/billing';
import { formatInvoiceNumber } from '../../utils/invoiceNumber';

const DATE_LOCALES = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN' };

export default function BillsList({ orders, settings }) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const dateLocale = DATE_LOCALES[i18n.language] || 'en-IN';

  // Most recent bill first — that's the one a cashier is almost always
  // looking for ("the customer who just left"), not the oldest of the day.
  const sorted = useMemo(() => [...orders].sort((a, b) => new Date(b.billedAt) - new Date(a.billedAt)), [orders]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sorted;
    return sorted.filter((o) => {
      const invoiceNo = formatInvoiceNumber(settings.invoicePrefix, o.invoiceSeq).toLowerCase();
      return (
        invoiceNo.includes(term) ||
        o.customer?.name?.toLowerCase().includes(term) ||
        o.customer?.phone?.includes(term)
      );
    });
  }, [sorted, search, settings.invoicePrefix]);

  const openView = (order) => {
    setAutoPrint(false);
    setSelectedOrder(order);
  };

  const openReprint = (order) => {
    setAutoPrint(true);
    setSelectedOrder(order);
  };

  return (
    <div className="rounded-card bg-white p-3 shadow-card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-brand-700">
          {t('reports.allBills')} <span className="font-normal text-gray-400">· {orders.length}</span>
        </p>
      </div>

      <div className="relative mb-2">
        <HiMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('reports.searchBillsPlaceholder')}
          className="w-full rounded-card border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-xs text-gray-400">{t('reports.noBillsMatch')}</p>
      ) : (
        <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
          {filtered.map((order) => (
            <li key={order.id} className="flex items-center gap-2 py-2.5">
              <button onClick={() => openView(order)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-ink">
                  {formatInvoiceNumber(settings.invoicePrefix, order.invoiceSeq)}
                  <span className="ml-2 text-xs font-normal uppercase text-gray-400">{order.paymentMethod}</span>
                </p>
                <p className="truncate text-xs text-gray-400">
                  {order.customer?.name || t('reports.walkIn')} ·{' '}
                  {new Date(order.billedAt).toLocaleString(dateLocale, {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </button>
              <span className="shrink-0 text-sm font-semibold text-brand-600">
                {formatCurrency(order.totals?.grandTotal || 0)}
              </span>
              <button
                onClick={() => openView(order)}
                aria-label={t('reports.viewBill')}
                className="shrink-0 rounded-full p-2 text-brand-500 active:bg-brand-50"
              >
                <HiOutlineEye className="h-4 w-4" />
              </button>
              <button
                onClick={() => openReprint(order)}
                aria-label={t('reports.reprintBill')}
                className="shrink-0 rounded-full p-2 text-brand-500 active:bg-brand-50"
              >
                <HiOutlinePrinter className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ViewInvoiceModal
        order={selectedOrder}
        settings={settings}
        autoPrint={autoPrint}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
