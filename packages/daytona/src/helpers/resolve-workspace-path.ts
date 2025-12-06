import path from 'node:path'

/**
 * Resolves a given path to an absolute path within the Daytona workspace/repo directory.
 *
 * Handles both absolute and relative paths, normalizing Windows-style backslashes to forward slashes.
 * - If the path already starts with "workspace/repo", it is returned as-is.
 * - If the path is absolute and contains "/repo/", returns the portion relative to "/repo/" joined with "workspace/repo".
 * - If the path is a simple relative path, joins it to "workspace/repo".
 * - If the resolved path does not remain within "workspace/repo", returns null for security reasons.
 *
 * @param {string} inputPath - The path to resolve, can be absolute or relative, with forward or back slashes.
 * @returns {string | null} Resolved absolute workspace path, or null if input path cannot be securely resolved inside the workspace.
 */
export function resolveWorkspacePath(inputPath: string): string | null {
  const workspaceRoot = `workspace/repo`
  const normalized = inputPath.replace(/\\/g, '/')

  if (normalized.startsWith(workspaceRoot)) {
    return normalized
  }

  const repoSegment = `/repo/`
  if (normalized.startsWith('/')) {
    const repoIndex = normalized.indexOf(repoSegment)
    if (repoIndex >= 0) {
      const relativeToRepo =
        normalized.slice(repoIndex + repoSegment.length) || '.'
      const resolved = path.posix.join(workspaceRoot, relativeToRepo)
      return resolved.startsWith(workspaceRoot) ? resolved : null
    }
    return null
  }

  const resolved = path.posix.join(workspaceRoot, normalized)
  return resolved.startsWith(workspaceRoot) ? resolved : null
}
