import { useCallback, useEffect, useState } from 'react'

import { fetchForecast } from '@/lib/api'
import type { ProjectionsResponse } from '@/lib/types'

interface Query {
  granularity: 'day' | 'month' | 'year'
  start: string
  end: string
}

interface State {
  data: ProjectionsResponse | null
  loading: boolean
  error: string | null
}

/** Fetches once per (granularity, start, end) — never on a filter change, since
 * filtering happens entirely in the browser. */
export function useProjections(query: Query) {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null })
  const [nonce, setNonce] = useState(0)

  const load = useCallback(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    fetchForecast(query)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        // Keep whatever `data` was already loaded (if any) so a failed
        // refresh/period-switch doesn't wipe a previously good render —
        // App.tsx shows it dimmed with an inline error, not a blank state.
        setState((s) => ({
          data: s.data,
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        }))
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.granularity, query.start, query.end, nonce])

  useEffect(() => load(), [load])

  const refetch = useCallback(() => setNonce((n) => n + 1), [])

  return { ...state, refetch }
}
