export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount || 0);
}

/**
 * All bill math lives in one place so the cart summary, the invoice, the
 * UPI QR amount, and reports can never quietly disagree with each other.
 */
export function calculateBillTotals(items, discount) {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  const discountAmount =
    discount?.type === 'percent'
      ? (subtotal * (discount.value || 0)) / 100
      : discount?.value || 0;

  const taxableAmount = Math.max(subtotal - discountAmount, 0);

  // Apply each line item's own GST rate proportionally on the discounted base.
  const gstAmount = items.reduce((sum, i) => {
    const lineTotal = i.price * i.qty;
    const lineShareOfSubtotal = subtotal > 0 ? lineTotal / subtotal : 0;
    const lineTaxable = taxableAmount * lineShareOfSubtotal;
    return sum + lineTaxable * ((i.gstRate || 0) / 100);
  }, 0);

  const preRoundTotal = taxableAmount + gstAmount;
  const grandTotal = Math.round(preRoundTotal);
  const roundOff = grandTotal - preRoundTotal;

  return {
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    gstAmount: round2(gstAmount),
    roundOff: round2(roundOff),
    grandTotal
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
