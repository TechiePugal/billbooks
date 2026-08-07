import { getDocs, orderBy, query, where, Timestamp } from 'firebase/firestore';
import { ordersCol } from '../firebase/collections';

/**
 * Reports are read-once, not realtime — an owner checking yesterday's sales
 * doesn't need a live socket held open, and one-shot reads keep Firestore
 * costs predictable as order history grows.
 */
export async function fetchOrdersBetween(shopId, from, to) {
  const q = query(
    ordersCol(shopId),
    where('createdAt', '>=', Timestamp.fromDate(from)),
    where('createdAt', '<=', Timestamp.fromDate(to)),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function summarizeOrders(orders) {
  const totalOrders = orders.length;
  const totalSales = orders.reduce((sum, o) => sum + (o.totals?.grandTotal || 0), 0);
  const avgOrderValue = totalOrders ? totalSales / totalOrders : 0;
  const amounts = orders.map((o) => o.totals?.grandTotal || 0);

  return {
    totalOrders,
    totalSales,
    avgOrderValue,
    highestSale: amounts.length ? Math.max(...amounts) : 0,
    lowestSale: amounts.length ? Math.min(...amounts) : 0
  };
}

export function salesByDay(orders) {
  const map = {};
  orders.forEach((o) => {
    const day = (o.billedAt || '').slice(0, 10);
    map[day] = (map[day] || 0) + (o.totals?.grandTotal || 0);
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date, total }));
}

export function salesByHour(orders) {
  const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, total: 0 }));
  orders.forEach((o) => {
    const hour = new Date(o.billedAt).getHours();
    buckets[hour].total += o.totals?.grandTotal || 0;
  });
  return buckets;
}

/**
 * A "split" bill isn't one payment method — part of it is cash, part UPI,
 * part card — so it must be decomposed into those real components or the
 * cash-drawer and UPI-settlement totals in reports would be wrong.
 */
export function paymentDistribution(orders) {
  const map = { cash: 0, upi: 0, card: 0 };
  orders.forEach((o) => {
    if (o.paymentMethod === 'split' && o.splitDetails) {
      map.cash += Number(o.splitDetails.cash) || 0;
      map.upi += Number(o.splitDetails.upi) || 0;
      map.card += Number(o.splitDetails.card) || 0;
    } else {
      map[o.paymentMethod] = (map[o.paymentMethod] || 0) + (o.totals?.grandTotal || 0);
    }
  });
  return Object.entries(map)
    .filter(([, total]) => total > 0)
    .map(([method, total]) => ({ method, total }));
}

export function productPerformance(orders) {
  const map = {};
  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      if (!map[item.name]) map[item.name] = { name: item.name, qty: 0, revenue: 0 };
      map[item.name].qty += item.qty;
      map[item.name].revenue += item.price * item.qty;
    });
  });
  const list = Object.values(map).sort((a, b) => b.qty - a.qty);
  return {
    topSelling: list.slice(0, 5),
    leastSelling: list.slice(-5).reverse()
  };
}

export function categorySales(orders, products, categories = []) {
  const productToCategory = Object.fromEntries(products.map((p) => [p.id, p.categoryId]));
  const categoryNames = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const map = {};
  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const catId = productToCategory[item.productId];
      const name = categoryNames[catId] || 'Uncategorized';
      map[name] = (map[name] || 0) + item.price * item.qty;
    });
  });
  return Object.entries(map).map(([name, total]) => ({ name, total }));
}

export function customerReport(orders) {
  const map = {};
  orders.forEach((o) => {
    const phone = o.customer?.phone;
    if (!phone) return; // walk-in / anonymous sales aren't attributable to a customer
    if (!map[phone]) map[phone] = { phone, name: o.customer.name || phone, visits: 0, spend: 0 };
    map[phone].visits += 1;
    map[phone].spend += o.totals?.grandTotal || 0;
  });
  return Object.values(map).sort((a, b) => b.spend - a.spend);
}

export function exportToCsv(orders, filename = 'sales-report.csv') {
  const header = ['Invoice', 'Date', 'Customer', 'Payment', 'Total'];
  const rows = orders.map((o) => [
    o.invoiceSeq,
    new Date(o.billedAt).toLocaleString('en-IN'),
    o.customer?.name || '',
    o.paymentMethod,
    o.totals?.grandTotal || 0
  ]);
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
  downloadBlob(csv, filename, 'text/csv');
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
