import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import {
  fetchOrdersBetween,
  summarizeOrders,
  salesByDay,
  salesByHour,
  paymentDistribution,
  productPerformance,
  categorySales,
  customerReport,
  exportToCsv
} from '../services/reportService';
import { useAuthStore } from '../store/authStore';
import { useActiveProducts, useCategories } from '../hooks/useProducts';
import { useShopSettings } from '../hooks/useShopSettings';
import { formatCurrency } from '../utils/billing';
import BillsList from '../components/reports/BillsList';

const RANGE_PRESETS = {
  today: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }),
  week: () => ({ from: startOfDay(daysAgo(6)), to: endOfDay(new Date()) }),
  month: () => ({ from: startOfDay(daysAgo(29)), to: endOfDay(new Date()) }),
  year: () => ({ from: startOfDay(daysAgo(364)), to: endOfDay(new Date()) })
};

const COLORS = ['#0F5132', '#D4A017', '#3F9B69', '#7E5A0D', '#9FCDB4', '#EFD280'];

export default function Reports() {
  const { t } = useTranslation();
  const shopId = useAuthStore((s) => s.user?.shopId);
  const { products } = useActiveProducts();
  const categories = useCategories();
  const { settings } = useShopSettings();
  const [range, setRange] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const RANGE_LABELS = {
    today: t('reports.today'),
    week: t('reports.week'),
    month: t('reports.month'),
    year: t('reports.year'),
    custom: t('reports.custom')
  };

  useEffect(() => {
    if (!shopId) return;
    if (range === 'custom' && (!customFrom || !customTo)) return;

    setIsLoading(true);
    const { from, to } =
      range === 'custom'
        ? { from: startOfDay(new Date(customFrom)), to: endOfDay(new Date(customTo)) }
        : RANGE_PRESETS[range]();

    fetchOrdersBetween(shopId, from, to).then((data) => {
      setOrders(data);
      setIsLoading(false);
    });
  }, [shopId, range, customFrom, customTo]);

  const summary = useMemo(() => summarizeOrders(orders), [orders]);
  const dailyData = useMemo(() => salesByDay(orders), [orders]);
  const hourlyData = useMemo(() => salesByHour(orders), [orders]);
  const paymentData = useMemo(() => paymentDistribution(orders), [orders]);
  const catData = useMemo(() => categorySales(orders, products, categories), [orders, products, categories]);
  const customers = useMemo(() => customerReport(orders), [orders]);
  const { topSelling, leastSelling } = useMemo(() => productPerformance(orders), [orders]);

  return (
    <div className="p-4 pb-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-brand-700">{t('reports.title')}</h1>
        <button
          onClick={() => exportToCsv(orders, `sales-${range}.csv`)}
          disabled={orders.length === 0}
          className="rounded-card bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600 disabled:opacity-40"
        >
          {t('reports.exportCsv')}
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-2">
        {[...Object.keys(RANGE_PRESETS), 'custom'].map((key) => (
          <button
            key={key}
            onClick={() => setRange(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              range === key ? 'bg-brand-500 text-white' : 'bg-white text-gray-500 shadow-sm'
            }`}
          >
            {RANGE_LABELS[key]}
          </button>
        ))}
      </div>

      {range === 'custom' && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            max={customTo || undefined}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-card border border-gray-200 bg-white px-3 py-2 text-sm"
          />
          <span className="text-sm text-gray-400">{t('common.to')}</span>
          <input
            type="date"
            value={customTo}
            min={customFrom || undefined}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-card border border-gray-200 bg-white px-3 py-2 text-sm"
          />
        </div>
      )}

      {range !== 'custom' && <div className="mb-4" />}

      {isLoading ? (
        <p className="py-10 text-center text-sm text-gray-400">{t('reports.crunchingNumbers')}</p>
      ) : orders.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">{t('reports.noSales')}</p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label={t('reports.totalSales')} value={formatCurrency(summary.totalSales)} />
            <StatCard label={t('reports.totalOrders')} value={summary.totalOrders} />
            <StatCard label={t('reports.avgOrderValue')} value={formatCurrency(summary.avgOrderValue)} />
            <StatCard label={t('reports.highestSale')} value={formatCurrency(summary.highestSale)} />
          </div>

          <ChartCard title={t('reports.salesTrend')}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAF4EF" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Line type="monotone" dataKey="total" stroke="#0F5132" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid gap-4 sm:grid-cols-2">
            <ChartCard title={t('reports.hourlySales')}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={hourlyData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAF4EF" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="total" fill="#3F9B69" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t('reports.paymentMethodSplit')}>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={paymentData} dataKey="total" nameKey="method" outerRadius={65} label={{ fontSize: 10 }}>
                    {paymentData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title={t('reports.categorySales')}>
            {catData.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-400">{t('reports.noCategoryData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={catData} dataKey="total" nameKey="name" outerRadius={75} label={{ fontSize: 10 }}>
                    {catData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <div className="grid gap-4 sm:grid-cols-2">
            <RankList title={t('reports.topSelling')} items={topSelling} soldLabel={t('common.sold')} noDataLabel={t('reports.noDataPeriod')} />
            <RankList title={t('reports.leastSelling')} items={leastSelling} soldLabel={t('common.sold')} noDataLabel={t('reports.noDataPeriod')} />
          </div>

          <div className="mt-4 rounded-card bg-white p-3 shadow-card">
            <p className="mb-2 text-sm font-semibold text-brand-700">{t('reports.topCustomers')}</p>
            {customers.length === 0 ? (
              <p className="text-xs text-gray-400">{t('reports.noCustomersYet')}</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {customers.slice(0, 8).map((c) => (
                  <li key={c.phone} className="flex justify-between">
                    <span>
                      {c.name}{' '}
                      <span className="text-xs text-gray-400">
                        · {c.visits} {c.visits > 1 ? t('common.visits') : t('common.visit')}
                      </span>
                    </span>
                    <span className="font-medium text-brand-600">{formatCurrency(c.spend)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4">
            <BillsList orders={orders} settings={settings} />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-card bg-white p-3 shadow-card">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-display text-xl font-bold text-brand-600">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="mb-4 rounded-card bg-white p-3 shadow-card">
      <p className="mb-2 text-sm font-semibold text-brand-700">{title}</p>
      {children}
    </div>
  );
}

function RankList({ title, items, soldLabel, noDataLabel }) {
  return (
    <div className="rounded-card bg-white p-3 shadow-card">
      <p className="mb-2 text-sm font-semibold text-brand-700">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">{noDataLabel}</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {items.map((item, i) => (
            <li key={item.name} className="flex justify-between">
              <span>
                {i + 1}. {item.name}
              </span>
              <span className="font-medium text-gray-500">{item.qty} {soldLabel}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function daysAgo(n) {
  const x = new Date();
  x.setDate(x.getDate() - n);
  return x;
}
