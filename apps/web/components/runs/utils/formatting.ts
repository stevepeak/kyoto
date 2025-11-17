export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  // Use a consistent locale to prevent hydration mismatches
  // en-US is a safe default that works on both server and client
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  const diffWeeks = Math.floor(diffDays / 7)

  if (diffMins < 1) {
    return 'just now'
  }
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  }
  if (diffWeeks < 5) {
    return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`
  }
  // Use a consistent locale to prevent hydration mismatches
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDurationMs(
  durationMs: number | null | undefined,
): string {
  if (!durationMs || durationMs < 1) {
    return '—'
  }
  if (durationMs < 1000) {
    return `${durationMs}ms`
  }
  if (durationMs < 60000) {
    return `${Math.round(durationMs / 1000)}s`
  }
  const minutes = Math.floor(durationMs / 60000)
  const seconds = Math.round((durationMs % 60000) / 1000)
  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

/**
 * Extracts the first line of a commit message, with optional fallback.
 */
export function getCommitTitle(
  commitMessage: string | null,
  fallback = 'No commit message',
): string {
  return commitMessage?.split('\n')[0]?.trim() || fallback
}

/**
 * Formats a commit SHA to short format (first 7 characters).
 */
export function getShortSha(
  commitSha: string | null,
  fallback: string | null = null,
): string | null {
  return commitSha ? commitSha.slice(0, 7) : fallback
}
