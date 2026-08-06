/**
 * Format a monetary amount for display.
 * TZS (Tanzania Shillings) renders as "TSh 9,000" with no decimals; other
 * currencies use the standard Intl currency style.
 */
export function formatCurrency(amount: number, currency?: string | null): string {
  const code = (currency || 'TZS').toUpperCase();
  try {
    if (code === 'TZS') {
      const n = new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(amount);
      return `TSh ${n}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount}`;
  }
}
