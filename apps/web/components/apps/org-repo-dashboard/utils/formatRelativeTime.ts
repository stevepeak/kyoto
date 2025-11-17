export function formatRelativeTime(value: Date | null): string | null {
  if (!value) {
    return null
  }

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  let deltaSeconds = Math.round((value.getTime() - Date.now()) / 1000)

  const units: Array<{
    limit: number
    divisor: number
    unit: Intl.RelativeTimeFormatUnit
  }> = [
    { limit: 60, divisor: 1, unit: 'second' },
    { limit: 3600, divisor: 60, unit: 'minute' },
    { limit: 86400, divisor: 3600, unit: 'hour' },
    { limit: 604800, divisor: 86400, unit: 'day' },
    { limit: 2629800, divisor: 604800, unit: 'week' },
    { limit: 31557600, divisor: 2629800, unit: 'month' },
  ]

  for (const { limit, divisor, unit } of units) {
    if (Math.abs(deltaSeconds) < limit) {
      return rtf.format(Math.round(deltaSeconds / divisor), unit)
    }
  }

  return rtf.format(Math.round(deltaSeconds / 31557600), 'year')
}
