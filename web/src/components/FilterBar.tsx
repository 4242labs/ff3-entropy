import { X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FacetedFilter } from '@/components/FacetedFilter'
import { activeFilterCount, EMPTY_FILTERS, hasActiveFilters, type FilterOptions } from '@/lib/filters'
import type { ActiveFilters, ItemType } from '@/lib/types'

const TYPE_LABEL: Record<ItemType, string> = {
  withdrawal: 'Expense',
  deposit: 'Income',
  transfer: 'Transfer',
}

export interface FilterBarProps {
  options: FilterOptions
  filters: ActiveFilters
  onChange: (filters: ActiveFilters) => void
}

/** The four data facets. Lives in the header (not the page body) so it costs
 * no vertical space. */
export function FilterBar({ options, filters, onChange }: FilterBarProps) {
  const set = <K extends keyof ActiveFilters>(key: K, value: ActiveFilters[K]) =>
    onChange({ ...filters, [key]: value })

  return (
    <>
      <FacetedFilter
        title="Type"
        options={options.types.map((t) => ({ value: t, label: TYPE_LABEL[t] ?? t }))}
        selected={filters.type}
        onChange={(v) => set('type', v as ItemType[])}
      />
      <FacetedFilter
        title="Category"
        options={options.categories}
        selected={filters.category}
        onChange={(v) => set('category', v)}
      />
      <FacetedFilter
        title="Asset Account"
        options={options.accounts.map((a) => ({ value: a, label: a }))}
        selected={filters.account}
        onChange={(v) => set('account', v)}
      />
      <FacetedFilter
        title="Currency"
        options={options.currencies.map((c) => ({ value: c, label: c }))}
        selected={filters.currency}
        onChange={(v) => set('currency', v)}
      />

      {hasActiveFilters(filters) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="h-8 px-2"
        >
          Reset
          <Badge variant="secondary" className="mx-2 rounded-sm px-1 font-normal">
            {activeFilterCount(filters)}
          </Badge>
          <X className="h-4 w-4" />
        </Button>
      )}
    </>
  )
}
