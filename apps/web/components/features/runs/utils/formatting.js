'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.formatDate = formatDate
exports.formatRelativeTime = formatRelativeTime
exports.formatDurationMs = formatDurationMs
exports.getCommitTitle = getCommitTitle
exports.getShortSha = getShortSha
function formatDate(dateString) {
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
function formatRelativeTime(dateString) {
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
    return ''
      .concat(diffMins, ' minute')
      .concat(diffMins === 1 ? '' : 's', ' ago')
  }
  if (diffHours < 24) {
    return ''
      .concat(diffHours, ' hour')
      .concat(diffHours === 1 ? '' : 's', ' ago')
  }
  if (diffDays < 7) {
    return ''.concat(diffDays, ' day').concat(diffDays === 1 ? '' : 's', ' ago')
  }
  if (diffWeeks < 5) {
    return ''
      .concat(diffWeeks, ' week')
      .concat(diffWeeks === 1 ? '' : 's', ' ago')
  }
  // Use a consistent locale to prevent hydration mismatches
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
function formatDurationMs(durationMs) {
  if (!durationMs || durationMs < 1) {
    return '—'
  }
  if (durationMs < 1000) {
    return ''.concat(durationMs, 'ms')
  }
  if (durationMs < 60000) {
    return ''.concat(Math.round(durationMs / 1000), 's')
  }
  const minutes = Math.floor(durationMs / 60000)
  const seconds = Math.round((durationMs % 60000) / 1000)
  if (minutes < 60) {
    return seconds > 0
      ? ''.concat(minutes, 'm ').concat(seconds, 's')
      : ''.concat(minutes, 'm')
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0
    ? ''.concat(hours, 'h ').concat(remainingMinutes, 'm')
    : ''.concat(hours, 'h')
}
/**
 * Extracts the first line of a commit message, with optional fallback.
 */
function getCommitTitle(commitMessage, fallback) {
  let _a
  if (fallback === void 0) {
    fallback = 'No commit message'
  }
  return (
    ((_a =
      commitMessage === null || commitMessage === void 0
        ? void 0
        : commitMessage.split('\n')[0]) === null || _a === void 0
      ? void 0
      : _a.trim()) || fallback
  )
}
/**
 * Formats a commit SHA to short format (first 7 characters).
 */
function getShortSha(commitSha, fallback) {
  if (fallback === void 0) {
    fallback = null
  }
  return commitSha ? commitSha.slice(0, 7) : fallback
}
