const DAY_IN_MS = 24 * 60 * 60 * 1000
const EDGE_PADDING_DAYS = 3
const MIN_VISIBLE_SPAN_DAYS = 7

export function getPaddedTimeDomain(timestamps: number[]): [number, number] {
  if (timestamps.length === 0) {
    const now = Date.now()
    return [now - MIN_VISIBLE_SPAN_DAYS * DAY_IN_MS / 2, now + MIN_VISIBLE_SPAN_DAYS * DAY_IN_MS / 2]
  }

  const sorted = [...timestamps].sort((a, b) => a - b)
  const firstDate = sorted[0]
  const lastDate = sorted[sorted.length - 1]
  const paddedMin = firstDate - EDGE_PADDING_DAYS * DAY_IN_MS
  const paddedMax = lastDate + EDGE_PADDING_DAYS * DAY_IN_MS
  const minVisibleSpan = MIN_VISIBLE_SPAN_DAYS * DAY_IN_MS
  const currentSpan = paddedMax - paddedMin

  if (currentSpan >= minVisibleSpan) {
    return [paddedMin, paddedMax]
  }

  const midpoint = (firstDate + lastDate) / 2
  return [midpoint - minVisibleSpan / 2, midpoint + minVisibleSpan / 2]
}

