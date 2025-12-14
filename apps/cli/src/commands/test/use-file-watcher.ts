import { findGitRoot, getUncommittedFilePaths } from '@app/shell'
import { useCallback, useEffect, useRef, useState } from 'react'

type FileWatcherState = {
  /** List of changed files (staged + unstaged + untracked) */
  changedFiles: string[]
  /** Whether we're waiting for more changes (debouncing) */
  isDebouncing: boolean
  /** Whether we're currently checking for changes */
  isPolling: boolean
  /** Error if file watching fails */
  error: string | null
}

type UseFileWatcherOptions = {
  /** Debounce time in milliseconds (default: 500) */
  debounceMs?: number
  /** Polling interval in milliseconds (default: 1000) */
  pollIntervalMs?: number
  /** Whether the watcher is enabled */
  enabled?: boolean
}

/**
 * Hook that polls git status for file changes with debounce.
 * Detects staged, unstaged, and untracked files.
 */
export function useFileWatcher(
  options: UseFileWatcherOptions = {},
): FileWatcherState & {
  /** Reset the watcher to start fresh */
  reset: () => void
} {
  const { debounceMs = 500, pollIntervalMs = 1000, enabled = true } = options

  const [state, setState] = useState<FileWatcherState>({
    changedFiles: [],
    isDebouncing: false,
    isPolling: false,
    error: null,
  })

  const previousFilesRef = useRef<string[]>([])
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const checkForChanges = useCallback(async () => {
    if (!mountedRef.current) return

    setState((prev) => ({ ...prev, isPolling: true }))

    try {
      const gitRoot = await findGitRoot()
      const files = await getUncommittedFilePaths(gitRoot)

      if (!mountedRef.current) return

      // Sort for consistent comparison
      const sortedFiles = [...files].sort()
      const previousSorted = [...previousFilesRef.current].sort()

      // Check if files have changed
      const hasChanged =
        sortedFiles.length !== previousSorted.length ||
        sortedFiles.some((file, i) => file !== previousSorted[i])

      if (hasChanged) {
        previousFilesRef.current = sortedFiles

        // Clear existing debounce
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current)
        }

        // Start debouncing
        setState((prev) => ({
          ...prev,
          isDebouncing: true,
          isPolling: false,
          error: null,
        }))

        // Set debounce timeout
        debounceTimeoutRef.current = setTimeout(() => {
          if (!mountedRef.current) return

          setState({
            changedFiles: sortedFiles,
            isDebouncing: false,
            isPolling: false,
            error: null,
          })
        }, debounceMs)
      } else {
        setState((prev) => ({ ...prev, isPolling: false }))
      }
    } catch (err) {
      if (!mountedRef.current) return

      setState((prev) => ({
        ...prev,
        isPolling: false,
        error:
          err instanceof Error ? err.message : 'Failed to check for changes',
      }))
    }
  }, [debounceMs])

  const reset = useCallback(() => {
    previousFilesRef.current = []
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
      debounceTimeoutRef.current = null
    }
    setState({
      changedFiles: [],
      isDebouncing: false,
      isPolling: false,
      error: null,
    })
  }, [])

  useEffect(() => {
    mountedRef.current = true

    if (!enabled) {
      return () => {
        mountedRef.current = false
      }
    }

    // Initial check
    void checkForChanges()

    // Set up polling
    pollIntervalRef.current = setInterval(() => {
      void checkForChanges()
    }, pollIntervalMs)

    return () => {
      mountedRef.current = false

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [enabled, pollIntervalMs, checkForChanges])

  return {
    ...state,
    reset,
  }
}
