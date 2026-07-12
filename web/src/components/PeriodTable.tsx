import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/StatusBadge'
import { EmptyState } from '@/components/EmptyState'
import { formatDate, formatMoney } from '@/lib/format'
import type { Period, ProjectionItem } from '@/lib/types'

const TYPE_LABEL: Record<ProjectionItem['type'], string> = {
  withdrawal: 'Expense',
  deposit: 'Income',
  transfer: 'Transfer',
}

function accountsLabel(item: ProjectionItem): string {
  if (item.type === 'transfer') return `${item.source ?? '—'} → ${item.destination ?? '—'}`
  if (item.type === 'deposit') return item.destination ?? item.source ?? '—'
  return item.source ?? item.destination ?? '—'
}

/** One section per period (`label`), rows sorted by date (the
 * `periods` prop is already client-sorted by `key` before it gets here). */
export function PeriodTable({ periods }: { periods: Period[] }) {
  if (periods.length === 0) {
    return <EmptyState message="No obligations match the current filters." />
  }

  return (
    <div className="space-y-6">
      {periods.map((period) => (
        <Card key={period.key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{period.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Account(s)</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {period.items.map((item, i) => (
                  <TableRow key={`${item.date}-${item.title}-${i}`}>
                    <TableCell className="whitespace-nowrap tabular-nums">{formatDate(item.date)}</TableCell>
                    <TableCell className="max-w-[220px] truncate" title={item.title}>
                      {item.title}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {TYPE_LABEL[item.type]}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.category ?? 'Uncategorised'}</TableCell>
                    <TableCell className="max-w-[240px] truncate" title={accountsLabel(item)}>
                      {accountsLabel(item)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {formatMoney(item.amount, item.currency)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
