/**
 * Commit information containing message, code diff, and changed files
 * Used throughout the story discovery and analysis pipeline
 */
export interface Commit {
  /** Commit message(s) - can be a single message or multiple joined with newlines */
  message: string
  /** Code diff showing the changes */
  diff: string
  /** Array of file paths that were changed */
  changedFiles: string[]
}
