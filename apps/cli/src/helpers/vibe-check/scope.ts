import {
  getCommitsRange,
  getCurrentBranch,
  getLatestCommit,
  getPrCommits,
  getRecentCommits,
} from '@app/shell'
import { type VibeCheckScope } from '@app/types'

import { getConfig } from '../config/get'

import {
  getGitHubBaseRef,
  getGitHubHeadRef,
  getGitHubEventName,
  isGitHubActions,
} from './github-actions'

interface GetVibeCheckScopeArgs {
  commitSha?: string
  commitCount?: number
  sinceBranch?: string
  last?: boolean
  staged: boolean
  gitRoot: string
  hasStagedChanges: boolean
  hasChanges: boolean
}

interface GetVibeCheckScopeResult {
  scope: VibeCheckScope | null
  warning: string | null
  hasUnstagedChanges: boolean
}

/**
 * Determines the vibe check scope based on flags, GitHub Actions environment, or local changes.
 *
 * Priority: explicit commit flags > since branch > last vibe check > GitHub Actions auto-detection > staged/unstaged
 *
 * @returns Object with scope, warning message (if no scope), and whether unstaged changes exist
 */
export async function getVibeCheckScope(
  args: GetVibeCheckScopeArgs,
): Promise<GetVibeCheckScopeResult> {
  const {
    commitSha,
    commitCount,
    sinceBranch,
    last,
    staged,
    gitRoot,
    hasStagedChanges,
    hasChanges,
  } = args

  // Priority: explicit commit flags > since branch > last vibe check > GitHub Actions auto-detection > staged/unstaged
  if (commitSha) {
    // Specific commit SHA provided
    return {
      scope: { type: 'commit', commit: commitSha },
      warning: null,
      hasUnstagedChanges: false,
    }
  }

  if (commitCount !== undefined && commitCount > 0) {
    // Number of commits provided (e.g., -1, -4)
    const commits = await getRecentCommits(commitCount, gitRoot)
    if (commits.length === 0) {
      return {
        scope: null,
        warning: 'No commits found.',
        hasUnstagedChanges: false,
      }
    }
    if (commits.length === 1) {
      return {
        scope: { type: 'commit', commit: commits[0]!.hash },
        warning: null,
        hasUnstagedChanges: false,
      }
    }
    return {
      scope: {
        type: 'commits',
        commits: commits.map((c) => c.hash),
      },
      warning: null,
      hasUnstagedChanges: false,
    }
  }

  if (sinceBranch) {
    // Check commits since a branch
    const currentBranch = await getCurrentBranch(gitRoot)
    if (!currentBranch) {
      return {
        scope: null,
        warning: 'Unable to determine current branch.',
        hasUnstagedChanges: false,
      }
    }
    const prCommits = await getPrCommits(sinceBranch, currentBranch, gitRoot)
    if (prCommits.length === 0) {
      return {
        scope: null,
        warning: `No commits found between ${sinceBranch} and ${currentBranch}.`,
        hasUnstagedChanges: false,
      }
    }
    if (prCommits.length === 1) {
      return {
        scope: { type: 'commit', commit: prCommits[0]!.hash },
        warning: null,
        hasUnstagedChanges: false,
      }
    }
    return {
      scope: {
        type: 'commits',
        commits: prCommits.map((c) => c.hash),
      },
      warning: null,
      hasUnstagedChanges: false,
    }
  }

  if (last) {
    // Check commits since last vibe check
    try {
      const config = await getConfig()
      if (!config.latest) {
        return {
          scope: null,
          warning: 'No previous vibe check found. Run a vibe check first.',
          hasUnstagedChanges: false,
        }
      }

      const latestCommit = await getLatestCommit(gitRoot)
      if (!latestCommit) {
        return {
          scope: null,
          warning: 'No commit found.',
          hasUnstagedChanges: false,
        }
      }

      // Get commits between the last vibe check SHA and current HEAD
      const commits = await getCommitsRange(
        config.latest.sha,
        latestCommit.hash,
        gitRoot,
      )
      if (commits.length === 0) {
        return {
          scope: null,
          warning: `No commits found since last vibe check (${config.latest.sha.substring(0, 7)}).`,
          hasUnstagedChanges: false,
        }
      }
      if (commits.length === 1) {
        return {
          scope: { type: 'commit', commit: commits[0]!.hash },
          warning: null,
          hasUnstagedChanges: false,
        }
      }
      return {
        scope: {
          type: 'commits',
          commits: commits.map((c) => c.hash),
        },
        warning: null,
        hasUnstagedChanges: false,
      }
    } catch {
      return {
        scope: null,
        warning: 'No previous vibe check found. Run a vibe check first.',
        hasUnstagedChanges: false,
      }
    }
  }

  if (isGitHubActions()) {
    // Auto-detect scope in GitHub Actions
    const eventName = getGitHubEventName()
    if (eventName === 'pull_request') {
      // For PR events, check all commits in the PR
      const baseRef = getGitHubBaseRef()
      const headRef = getGitHubHeadRef()
      if (baseRef && headRef) {
        const prCommits = await getPrCommits(baseRef, headRef, gitRoot)
        if (prCommits.length === 0) {
          return {
            scope: null,
            warning: 'No commits found in pull request.',
            hasUnstagedChanges: false,
          }
        }
        if (prCommits.length === 1) {
          return {
            scope: { type: 'commit', commit: prCommits[0]!.hash },
            warning: null,
            hasUnstagedChanges: false,
          }
        }
        return {
          scope: {
            type: 'commits',
            commits: prCommits.map((c) => c.hash),
          },
          warning: null,
          hasUnstagedChanges: false,
        }
      }
      // Fallback to latest commit if base/head refs not available
      const latestCommit = await getLatestCommit(gitRoot)
      if (!latestCommit) {
        return {
          scope: null,
          warning: 'No commit found.',
          hasUnstagedChanges: false,
        }
      }
      return {
        scope: { type: 'commit', commit: latestCommit.hash },
        warning: null,
        hasUnstagedChanges: false,
      }
    }
    // For push events, check the last commit
    const latestCommit = await getLatestCommit(gitRoot)
    if (!latestCommit) {
      return {
        scope: null,
        warning: 'No commit found.',
        hasUnstagedChanges: false,
      }
    }
    return {
      scope: { type: 'commit', commit: latestCommit.hash },
      warning: null,
      hasUnstagedChanges: false,
    }
  }

  // Local development: use staged/unstaged
  const scope: VibeCheckScope = staged
    ? ({ type: 'staged' as const } as const)
    : ({ type: 'unstaged' as const } as const)

  // Check for staged changes early (only for local staged checks)
  if (staged && !hasStagedChanges) {
    if (hasChanges) {
      return {
        scope: null,
        warning: 'no-staged-with-unstaged',
        hasUnstagedChanges: true,
      }
    }
    return {
      scope: null,
      warning: 'No staged changes found.',
      hasUnstagedChanges: false,
    }
  }

  return {
    scope,
    warning: null,
    hasUnstagedChanges: hasChanges && !hasStagedChanges,
  }
}
