import type { Granularity, ProjectionsResponse } from './types'

export interface FetchForecastParams {
  granularity: Granularity
  start: string // ISO date
  end: string // ISO date
}

/**
 * Fetches the full (unfiltered) forecast for one (granularity, range). This is
 * the only server round-trip: every filter (type / category / account /
 * currency) is applied in the browser, so narrowing the view costs nothing.
 */
export async function fetchForecast(params: FetchForecastParams): Promise<ProjectionsResponse> {
  const qs = new URLSearchParams({
    granularity: params.granularity,
    start: params.start,
    end: params.end,
  })

  let res: Response
  try {
    res = await fetch(`api/forecast?${qs.toString()}`, {
      headers: { Accept: 'application/json' },
    })
  } catch (networkErr) {
    // Dev convenience: `npm run dev` with no server running falls back to the
    // synthetic fixtures. Compiled out of a production build.
    if (import.meta.env.DEV) return loadDevFixture(params.granularity)
    throw networkErr
  }

  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new Error(`Server returned ${res.status} ${res.statusText} (not JSON)`)
  }

  if (!res.ok) {
    const detail =
      body && typeof body === 'object' && 'detail' in (body as Record<string, unknown>)
        ? String((body as Record<string, unknown>).detail)
        : `Request failed: ${res.status} ${res.statusText}`
    throw new Error(detail)
  }

  return body as ProjectionsResponse
}

async function loadDevFixture(granularity: Granularity): Promise<ProjectionsResponse> {
  switch (granularity) {
    case 'day':
      return (
        (await import('../fixtures/projections-day.json')) as unknown as {
          default: ProjectionsResponse
        }
      ).default
    case 'year':
      return (
        (await import('../fixtures/projections-year.json')) as unknown as {
          default: ProjectionsResponse
        }
      ).default
    case 'month':
    default:
      // `wide` exercises every status (upcoming / paid / received / done /
      // needs-review), so it's the more useful one to develop against.
      return (
        (await import('../fixtures/projections-wide.json')) as unknown as {
          default: ProjectionsResponse
        }
      ).default
  }
}
