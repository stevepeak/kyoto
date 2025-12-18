'use client'

type RelativeTimeProps = {
  date: Date | string | number
  ago?: boolean
  shorthand?: boolean
  className?: string
}

function formatRelativeTime(
  date: Date | string | number,
  shorthand = true,
  ago = true,
): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = target.getTime() - now.getTime()
  const isPast = diffMs < 0
  const absDiffMs = Math.abs(diffMs)
  const absDiffSeconds = Math.floor(absDiffMs / 1000)
  const absDiffMinutes = Math.floor(absDiffMs / (1000 * 60))
  const absDiffHours = Math.floor(absDiffMs / (1000 * 60 * 60))
  const absDiffDays = Math.floor(absDiffMs / (1000 * 60 * 60 * 24))
  const absDiffWeeks = Math.floor(absDiffDays / 7)
  const absDiffMonths = Math.floor(absDiffDays / 30)
  const absDiffYears = Math.floor(absDiffDays / 365)

  // Handle "just now" for very recent times (within 60 seconds)
  if (absDiffSeconds < 60) {
    return 'just now'
  }

  // Format the time unit
  let timeText: string
  if (absDiffMinutes < 60) {
    timeText = shorthand
      ? `${absDiffMinutes}m`
      : `${absDiffMinutes} ${absDiffMinutes === 1 ? 'minute' : 'minutes'}`
  } else if (absDiffHours < 24) {
    timeText = shorthand
      ? `${absDiffHours}h`
      : `${absDiffHours} ${absDiffHours === 1 ? 'hour' : 'hours'}`
  } else if (absDiffDays < 7) {
    timeText = shorthand
      ? `${absDiffDays}d`
      : `${absDiffDays} ${absDiffDays === 1 ? 'day' : 'days'}`
  } else if (absDiffWeeks < 4) {
    timeText = shorthand
      ? `${absDiffWeeks}w`
      : `${absDiffWeeks} ${absDiffWeeks === 1 ? 'week' : 'weeks'}`
  } else if (absDiffMonths < 12) {
    timeText = shorthand
      ? `${absDiffMonths}mo`
      : `${absDiffMonths} ${absDiffMonths === 1 ? 'month' : 'months'}`
  } else {
    timeText = shorthand
      ? `${absDiffYears}y`
      : `${absDiffYears} ${absDiffYears === 1 ? 'year' : 'years'}`
  }

  // Add prefix/suffix based on direction and ago prop
  if (isPast) {
    return ago ? `${timeText} ago` : timeText
  } else {
    return ago ? `in ${timeText}` : timeText
  }
}

export function RelativeTime({
  date,
  ago = true,
  shorthand = true,
  className,
}: RelativeTimeProps) {
  const dateObj = new Date(date)
  const relativeTimeText = formatRelativeTime(date, shorthand, ago)
  const fullDate = dateObj.toLocaleString()

  return (
    <span className={className} title={fullDate}>
      {relativeTimeText}
    </span>
  )
}
