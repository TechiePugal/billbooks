export function formatInvoiceNumber(prefix, seq) {
  const padded = String(seq).padStart(4, '0');
  return `${prefix || 'INV'}-${padded}`;
}
