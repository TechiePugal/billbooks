/**
 * Builds a standard UPI deep link. Any UPI app (GPay, PhonePe, Paytm, BHIM...)
 * can scan this from a QR code and it will pre-fill the exact amount, so the
 * customer only has to confirm — no typing, no mistakes.
 */
export function buildUpiLink({ payeeVpa, payeeName, amount, invoiceNumber, note }) {
  const params = new URLSearchParams({
    pa: payeeVpa,
    pn: payeeName,
    am: Number(amount).toFixed(2),
    cu: 'INR'
  });
  if (invoiceNumber) params.set('tr', String(invoiceNumber));
  if (note) params.set('tn', note);
  return `upi://pay?${params.toString()}`;
}
