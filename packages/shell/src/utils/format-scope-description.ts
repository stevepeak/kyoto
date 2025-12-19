import { type VibeCheckScope } from '@app/types'

function formatShortSha({ sha }: { sha: string }): string {
  return sha.length <= 6 ? sha : sha.slice(0, 6)
}

function formatCommitRange({
  commits,
}: {
  commits: readonly string[]
}): string {
  if (commits.length === 0) {
    return 'commits (none)'
  }

  if (commits.length === 1) {
    return `commit ${formatShortSha({ sha: commits[0] })}`
  }

  const first = formatShortSha({ sha: commits[0] })
  const last = formatShortSha({ sha: commits[commits.length - 1] })
  return `${commits.length} commits ${first}...${last}`
}

export function formatScopeDescription({
  scope,
}: {
  scope: VibeCheckScope
}): string {
  switch (scope.type) {
    case 'commit':
      return `commit ${formatShortSha({ sha: scope.commit })}`
    case 'commits':
      return formatCommitRange({ commits: scope.commits })
    case 'staged':
      return 'staged changes'
    case 'unstaged':
      return 'unstaged changes'
    case 'changes':
      return 'all changes'
    case 'paths':
      return `specified paths: ${scope.paths.join(', ')}`
    case 'file-lines': {
      const descriptions = scope.changes.map((c) => {
        if (c.lines && c.lines.trim().length > 0) {
          return `${c.file}:${c.lines}`
        }
        return c.file
      })
      return `specified changes: ${descriptions.join(', ')}`
    }
  }
}
