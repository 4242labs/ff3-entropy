// Per-currency formatting — never cross-sum currencies; 2dp, ISO code.

const _formatters = new Map<string, Intl.NumberFormat>()

function formatterFor(currency: string): Intl.NumberFormat {
  let f = _formatters.get(currency)
  if (!f) {
    f = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'XXX',
      currencyDisplay: 'code',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    _formatters.set(currency, f)
  }
  return f
}

/** e.g. formatMoney(1234.5, 'BRL') -> "BRL 1,234.50" */
export function formatMoney(amount: number, currency: string | null | undefined): string {
  const cur = currency || 'XXX'
  try {
    return formatterFor(cur).format(amount)
  } catch {
    // Intl throws on malformed currency codes (shouldn't happen with real
    // Firefly data, but degrade gracefully rather than crash the table).
    return `${cur} ${amount.toFixed(2)}`
  }
}

const _dateFmt = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

/** ISO 'YYYY-MM-DD' -> 'Jul 12, 2026'. Parsed as a local calendar date, not a
 * UTC instant, so it never shifts a day depending on the viewer's timezone. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return _dateFmt.format(new Date(y, m - 1, d))
}
