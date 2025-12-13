import { type VibeCheckScope } from '@app/types'
import { useRef } from 'react'

import { type LanguageModel } from '../config/get-model'
import { init } from '../init'
import { getChangedFiles } from './get-changed-files'
import { getGitHubContext } from './github-actions'
import { getVibeCheckScope } from './scope'
import { showWarningAndExit } from './warnings'

interface UseVibeCheckSetupArgs {
  staged?: boolean
  commitCount?: number
  commitSha?: string
  sinceBranch?: string
  last?: boolean
  onWarning: (warnings: React.ReactNode[]) => void
  onError: (error: string) => void
  exit: () => void
  cancelled: { current: boolean }
}

interface VibeCheckContext {
  gitRoot: string
  kyotoRoot: string
  scope: VibeCheckScope
  model: LanguageModel
  github?: {
    owner: string
    repo: string
    sha: string
    token: string
  }
}

interface UseVibeCheckSetupResult {
  context: VibeCheckContext | null
  changedFiles: string[]
  isLoading: boolean
  error: string | null
}

/**
 * Custom hook that handles vibe check initialization, scope determination,
 * file retrieval, and warning handling.
 *
 * This hook encapsulates all the setup logic that was previously mixed
 * into command components, allowing components to focus on UI state and
 * agent invocation.
 */
export async function setupVibeCheck(
  args: UseVibeCheckSetupArgs,
): Promise<UseVibeCheckSetupResult> {
  const {
    staged = false,
    commitCount,
    commitSha,
    sinceBranch,
    last,
    onWarning,
    onError,
    exit,
    cancelled,
  } = args

  try {
    const { fs, git, model } = await init()

    // Determine scope based on flags or GitHub Actions environment
    const scopeResult = await getVibeCheckScope({
      commitSha,
      commitCount,
      staged,
      sinceBranch,
      last,
      gitRoot: fs.gitRoot,
      hasStagedChanges: git.hasStagedChanges,
      hasChanges: git.hasChanges,
    })

    // Handle warnings and early exits
    if (scopeResult.warning) {
      await showWarningAndExit({
        warning: scopeResult.warning,
        setWarnings: onWarning,
        exit,
        cancelled,
      })
      return {
        context: null,
        changedFiles: [],
        isLoading: false,
        error: null,
      }
    }

    if (!scopeResult.scope) {
      // This shouldn't happen if getVibeCheckScope is correct, but handle it
      return {
        context: null,
        changedFiles: [],
        isLoading: false,
        error: null,
      }
    }

    // Determine which files to check based on scope
    const changedTsFiles = await getChangedFiles({
      scope: scopeResult.scope,
      gitRoot: fs.gitRoot,
    })

    if (changedTsFiles.length === 0) {
      await showWarningAndExit({
        warning: 'No changed source files found.',
        setWarnings: onWarning,
        exit,
        cancelled,
      })
      return {
        context: null,
        changedFiles: [],
        isLoading: false,
        error: null,
      }
    }

    // Detect GitHub Actions environment and add GitHub context if available
    const githubContext = getGitHubContext()

    const testContext: VibeCheckContext = {
      gitRoot: fs.gitRoot,
      kyotoRoot: fs.root,
      scope: scopeResult.scope,
      model,
      ...(githubContext ? { github: githubContext } : {}),
    }

    return {
      context: testContext,
      changedFiles: changedTsFiles,
      isLoading: false,
      error: null,
    }
  } catch (err) {
    if (cancelled.current) {
      return {
        context: null,
        changedFiles: [],
        isLoading: false,
        error: null,
      }
    }

    const message =
      err instanceof Error
        ? err.message
        : staged
          ? 'Failed to analyze staged changes'
          : 'Failed to analyze changes'
    onError(message)

    return {
      context: null,
      changedFiles: [],
      isLoading: false,
      error: message,
    }
  }
}
