import { Inbox } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

export function EmptyState({ message }: { message?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <Inbox className="h-8 w-8" aria-hidden />
        <p className="font-heading font-medium text-foreground">Nothing here</p>
        <p className="text-sm">{message ?? 'No obligations in this range.'}</p>
      </CardContent>
    </Card>
  )
}
