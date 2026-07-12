import {
  UNCONFIRMED_STATUSES,
  type ActiveFilters,
  type ItemStatus,
  type ItemType,
  type Period,
  type ProjectionItem,
  type ProjectionsResponse,
} from './types'

/** Sentinel filter value for "category is null" (real data today is 100%
 * null-category, so this is the only way to ever filter by
 * category until recurrences get categorised upstream). */
export const UNCATEGORISED = '__uncategorised__'

const DIRECTION: Record<ItemType, 'out' | 'in' | 'xfer'> = {
  withdrawal: 'out',
  deposit: 'in',
  transfer: 'xfer',
}

/** Client sort of `periods[]` by `key` — the engine emits first-seen order,
 * not chronological. ISO day/month/year keys sort correctly
 * lexically. */
export function sortPeriods<T extends { key: string }>(periods: T[]): T[] {
  return [...periods].sort((a, b) => a.key.localeCompare(b.key))
}

export interface FilterOptions {
  types: ItemType[]
  categories: { value: string; label: string }[]
  accounts: string[]
  currencies: string[]
}

/** Union of values present, computed over the UNFILTERED dataset —
 * this is what populates the filter dropdowns, and must not shrink as the
 * user narrows other filters (avoids the "option collapse" trap). */
export function getFilterOptions(data: ProjectionsResponse): FilterOptions {
  const types = new Set<ItemType>()
  const categories = new Set<string>()
  let hasUncategorised = false
  const accounts = new Set<string>()
  const currencies = new Set<string>()

  for (const period of data.periods) {
    for (const it of period.items) {
      types.add(it.type)
      if (it.category) categories.add(it.category)
      else hasUncategorised = true
      if (it.source) accounts.add(it.source)
      if (it.destination) accounts.add(it.destination)
      if (it.currency) currencies.add(it.currency)
    }
  }

  const categoryOptions = [...categories]
    .sort((a, b) => a.localeCompare(b))
    .map((c) => ({ value: c, label: c }))
  if (hasUncategorised) {
    categoryOptions.push({ value: UNCATEGORISED, label: 'Uncategorised' })
  }

  return {
    types: [...types].sort(),
    categories: categoryOptions,
    accounts: [...accounts].sort((a, b) => a.localeCompare(b)),
    currencies: [...currencies].sort((a, b) => a.localeCompare(b)),
  }
}

/** Faceted match: an empty facet array means "unconstrained"; a non-empty one
 * is an OR within the facet, AND across facets. */
export function itemMatchesFilters(item: ProjectionItem, filters: ActiveFilters): boolean {
  if (filters.type.length && !filters.type.includes(item.type)) return false

  if (filters.category.length) {
    const key = item.category ?? UNCATEGORISED
    if (!filters.category.includes(key)) return false
  }

  if (filters.account.length) {
    const hit =
      (item.source !== null && filters.account.includes(item.source)) ||
      (item.destination !== null && filters.account.includes(item.destination))
    if (!hit) return false
  }

  if (filters.currency.length && !filters.currency.includes(item.currency)) return false

  return true
}

export const EMPTY_FILTERS: ActiveFilters = {
  type: [],
  category: [],
  account: [],
  currency: [],
}

export function activeFilterCount(filters: ActiveFilters): number {
  return (
    filters.type.length + filters.category.length + filters.account.length + filters.currency.length
  )
}

export function hasActiveFilters(filters: ActiveFilters): boolean {
  return activeFilterCount(filters) > 0
}

function recomputePeriodTotals(items: ProjectionItem[]) {
  const totals: Record<string, { out?: number; in?: number; xfer?: number }> = {}
  const statusCounts: Partial<Record<ItemStatus, number>> = {}
  for (const it of items) {
    const bucket = (totals[it.currency] ??= {})
    const flow = DIRECTION[it.type]
    bucket[flow] = (bucket[flow] ?? 0) + it.amount
    statusCounts[it.status] = (statusCounts[it.status] ?? 0) + 1
  }
  return { totals, statusCounts }
}

/** Re-aggregate periods + currency summaries after client-side filtering
 * (do NOT trust server aggregates once filtered, since the server
 * only ever saw the unfiltered fetch). Drops periods left with zero items;
 * result is sorted per R5. */
export function applyFilters(
  data: ProjectionsResponse,
  filters: ActiveFilters,
  /** Cumulative views (Outstanding / Due by Month-End) show ONLY what hasn't
   * happened yet or can't be confirmed — never the already Paid/Received/Done. */
  unconfirmedOnly = false,
): ProjectionsResponse {
  const filteredPeriods: Period[] = []
  const currencyAgg: Record<string, { out: number; in: number }> = {}

  for (const period of sortPeriods(data.periods)) {
    const items = period.items.filter(
      (it) =>
        itemMatchesFilters(it, filters) &&
        (!unconfirmedOnly || UNCONFIRMED_STATUSES.includes(it.status)),
    )
    if (items.length === 0) continue
    const { totals, statusCounts } = recomputePeriodTotals(items)
    filteredPeriods.push({
      key: period.key,
      label: period.label,
      items: [...items].sort((a, b) => a.date.localeCompare(b.date)),
      totals,
      status_counts: statusCounts,
    })
    for (const it of items) {
      const flow = DIRECTION[it.type]
      if (flow === 'xfer') continue
      const bucket = (currencyAgg[it.currency] ??= { out: 0, in: 0 })
      bucket[flow] += it.amount
    }
  }

  const currencies: ProjectionsResponse['currencies'] = {}
  for (const [cur, { out, in: inflow }] of Object.entries(currencyAgg)) {
    currencies[cur] = { out, in: inflow, net: inflow - out }
  }

  const itemCount = filteredPeriods.reduce((n, p) => n + p.items.length, 0)

  return {
    ...data,
    currencies,
    periods: filteredPeriods,
    meta: { ...data.meta, item_count: itemCount },
  }
}

/** Sum of status_counts.needs_review across the UNFILTERED dataset
 * — the header warning chip always reflects the full range, regardless of
 * active filters. */
export function countNeedsReview(data: ProjectionsResponse): number {
  let n = 0
  for (const period of data.periods) {
    n += period.status_counts.needs_review ?? 0
  }
  return n
}
