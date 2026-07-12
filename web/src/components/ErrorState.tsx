import { AlertTriangle, RotateCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    // `border-[--red]/40` (Tailwind's opacity modifier on the CSS-var
    // arbitrary-value shorthand) silently emits no CSS in this Tailwind
    // version — verified against the built stylesheet — so the tint is
    // done directly with color-mix() instead. Still a token reference,
    // zero raw hex.
    <Card style={{ borderColor: 'color-mix(in srgb, var(--red) 40%, transparent)' }}>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-[--red]" aria-hidden />
        <div>
          <p className="font-heading font-semibold">Couldn't load projections</p>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
        <Button onClick={onRetry} variant="outline" size="sm">
          <RotateCw className="h-4 w-4" />
          Retry
        </Button>
      </CardContent>
    </Card>
  )
}
