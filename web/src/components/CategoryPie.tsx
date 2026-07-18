import { useEffect, useMemo, useState } from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { colorForIndex } from '@/lib/colors'
import { formatMoney } from '@/lib/format'
import type { Period, PieGroupBy, ProjectionItem } from '@/lib/types'
import { EmptyState } from '@/components/EmptyState'

function groupKey(item: ProjectionItem, groupBy: PieGroupBy): string {
  switch (groupBy) {
    case 'category':
      return item.category ?? 'Uncategorised'
    case 'account':
      // The pie only ever sums withdrawals, so `source` is always the paying
      // asset account — the meaningful breakdown when categories are unset.
      return item.source ?? 'Uncategorised'
    case 'payee':
      return item.title || 'Uncategorised'
  }
}

/** Currency with the largest total `out` across the given periods — the
 * default chart-currency selection. */
export function currencyWithLargestOut(periods: Period[]): string | null {
  const totals = new Map<string, number>()
  for (const p of periods) {
    for (const it of p.items) {
      if (it.type !== 'withdrawal') continue
      totals.set(it.currency, (totals.get(it.currency) ?? 0) + it.amount)
    }
  }
  let best: string | null = null
  let bestVal = -Infinity
  for (const [cur, val] of totals) {
    if (val > bestVal) {
      best = cur
      bestVal = val
    }
  }
  return best
}

/** Max pie slices shown before the tail collapses into one "Other" slice
 * (also caps the legend, which mirrors the Pie's own data). */
const MAX_SLICES = 8

export interface CategoryPieProps {
  periods: Period[]
  availableCurrencies: string[]
}

export function CategoryPie({ periods, availableCurrencies }: CategoryPieProps) {
  const [groupBy, setGroupBy] = useState<PieGroupBy>('category')
  const defaultCurrency = useMemo(() => currencyWithLargestOut(periods), [periods])
  const [currency, setCurrency] = useState<string | null>(defaultCurrency)

  // Re-pin the selected currency if it's no longer in range (filters
  // narrowed it out) or on first data load.
  useEffect(() => {
    if (!currency || !availableCurrencies.includes(currency)) {
      setCurrency(defaultCurrency)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCurrency, availableCurrencies])

  const data = useMemo(() => {
    if (!currency) return []
    const totals = new Map<string, number>()
    for (const p of periods) {
      for (const it of p.items) {
        if (it.type !== 'withdrawal' || it.currency !== currency) continue
        const key = groupKey(it, groupBy)
        totals.set(key, (totals.get(key) ?? 0) + it.amount)
      }
    }
    const sorted = [...totals.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
    // High-cardinality group-bys (Payee in particular — real data produces
    // ~40 unique titles) blow out the Recharts legend past the card bounds,
    // overlapping the summary cards and eating clicks meant for the
    // group-by tabs. Cap to the top 8 slices + a single "Other" bucket
    // summing the tail, for every group-by mode.
    if (sorted.length <= MAX_SLICES) return sorted
    const top = sorted.slice(0, MAX_SLICES)
    const otherValue = sorted.slice(MAX_SLICES).reduce((sum, s) => sum + s.value, 0)
    return [...top, { name: 'Other', value: otherValue }]
  }, [periods, groupBy, currency])

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Out by {groupBy === 'payee' ? 'payee' : groupBy}</CardTitle>
        <div className="flex items-center gap-2">
          <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as PieGroupBy)}>
            <TabsList>
              <TabsTrigger value="category">Category</TabsTrigger>
              <TabsTrigger value="account">Asset Account</TabsTrigger>
              <TabsTrigger value="payee">Payee</TabsTrigger>
            </TabsList>
          </Tabs>
          {availableCurrencies.length > 1 && (
            <Select value={currency ?? undefined} onValueChange={setCurrency}>
              <SelectTrigger className="h-8 w-24" aria-label="Pie chart currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCurrencies.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 || !currency ? (
          <EmptyState message="No expenses in this range." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              {/* paddingAngle only between real slices — on a single 100%
                  slice it carves a wedge-shaped notch ("pac-man"). */}
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={0}
                outerRadius={100}
                paddingAngle={data.length > 1 ? 0.5 : 0}
                isAnimationActive={false}
              >
                {data.map((entry, i) => (
                  <Cell key={entry.name} fill={colorForIndex(i)} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatMoney(value, currency)}
                contentStyle={{
                  background: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--popover-foreground)',
                }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: 12,
                  // Belt-and-suspenders on top of the top-8+Other cap above:
                  // even a bounded slice count can wrap to several lines
                  // with long payee names, so hard-cap the legend's own
                  // height and let it scroll rather than push past the
                  // card's edge.
                  maxHeight: 64,
                  overflowY: 'auto',
                  paddingTop: 8,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
