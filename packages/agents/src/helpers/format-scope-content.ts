import { type ScopeContext } from '@app/types'

/**
 * Formats scope content (diffs and file contents) for inclusion in agent prompts.
 * Returns a formatted string with all changed files and their diffs/contents.
 */
export function formatScopeContent(scopeContent: ScopeContext): string {
  return scopeContent.filePaths
    .map((filePath) => {
      const diff = scopeContent.diffs[filePath]
      const fileContent = scopeContent.fileContents[filePath]
      if (diff) {
        return `File: ${filePath}\n${diff}`
      } else if (fileContent) {
        return `File: ${filePath}\n${fileContent}`
      }
      return null
    })
    .filter((content): content is string => content !== null)
    .join('\n\n')
}
