import { findGitRoot, getUncommittedFilePaths } from '@app/shell'
import { createHash } from 'crypto'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'
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

/**
 * Compute a hash of file contents for a list of files.
 * Returns a composite hash representing the state of all files.
 */
async function computeFilesHash(args: {
  gitRoot: string
  files: string[]
}): Promise<string> {
  const { gitRoot, files } = args

  if (files.length === 0) return ''

  const hash = createHash('md5')

  // Sort files for consistent ordering
  const sortedFiles = [...files].sort()

  for (const file of sortedFiles) {
    try {
      const filePath = join(gitRoot, file)
      const fileStat = await stat(filePath)

      if (fileStat.isFile()) {
        const content = await readFile(filePath)
        // Include filename and content in hash
        hash.update(file)
        hash.update(content)
      }
    } catch {
      // File may have been deleted, include just the name
      hash.update(file)
      hash.update('DELETED')
    }
  }

  return hash.digest('hex')
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

  const previousHashRef = useRef<string>('')
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

      // Compute content hash of all files
      const currentHash = await computeFilesHash({
        gitRoot,
        files: sortedFiles,
      })

      if (!mountedRef.current) return

      // Check if content has actually changed (not just the file list)
      const hasChanged = currentHash !== previousHashRef.current

      if (hasChanged && sortedFiles.length > 0) {
        previousHashRef.current = currentHash

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
    // Don't reset the hash - we want to keep tracking the current state
    // Only reset UI state
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
