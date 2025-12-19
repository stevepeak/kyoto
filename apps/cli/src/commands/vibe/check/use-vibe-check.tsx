import {
  formatScopeDescription,
  getCurrentBranch,
  getCurrentCommitSha,
  getScopeContext,
} from '@app/shell'
import { type AgentRunState, type VibeCheckContext } from '@app/types'
import { useApp } from 'ink'
import { useCallback, useEffect, useRef, useState } from 'react'

import { openBrowser } from '../../../helpers/browser/open-browser'
import { updateConfig } from '../../../helpers/config/update'
import { init } from '../../../helpers/init'
import { generateCursorDeepLink } from './cursor-deep-link'
import { type ConsolidatedFinding } from './findings'
import { getChangedFiles } from './get-changed-files'
import { getGitHubContext } from './github-actions'
import { getVibeCheckScope } from './scope'
import { showWarningAndExit } from './warnings'
import { writeVibeCheckFile } from './write-check-file'

interface UseVibeCheckArgs {
  staged?: boolean
  timeoutMinutes?: number
  commitCount?: number
  commitSha?: string
  sinceBranch?: string
  last?: boolean
  changes?: { file: string; lines: string }[]
}

type VibeCheckStep = 'initializing' | 'agents' | 'issues'

interface UseVibeCheckResult {
  step: VibeCheckStep
  warnings: React.ReactNode[]
  error: string | null
  context: VibeCheckContext | null
  finalStates: AgentRunState[] | null
  scopeDescription: string | null
  handleAgentComplete: (states: AgentRunState[]) => void
  handleIssueSelect: (finding: ConsolidatedFinding) => Promise<void>
  handleExit: () => void
}

/**
 * Custom hook that orchestrates the vibe check flow:
 * 1. Initialization - sets up git context, scope, and changed files
 * 2. Agents - runs vibe check agents on the changed files
 * 3. Issues - allows user to select and act on found issues
 */
export function useVibeCheck(args: UseVibeCheckArgs): UseVibeCheckResult {
  const {
    staged = false,
    commitCount,
    commitSha,
    sinceBranch,
    last,
    changes,
  } = args

  const { exit } = useApp()
  const [step, setStep] = useState<VibeCheckStep>('initializing')
  const [warnings, setWarnings] = useState<React.ReactNode[]>([])
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<VibeCheckContext | null>(null)
  const [finalStates, setFinalStates] = useState<AgentRunState[] | null>(null)
  const [scopeDescription, setScopeDescription] = useState<string | null>(null)

  const cancelledRef = useRef(false)

  // Initialization effect - runs once on mount
  useEffect(() => {
    cancelledRef.current = false

    const runCheck = async (): Promise<void> => {
      try {
        const { fs, git, model } = await init()

        // Determine scope based on flags or GitHub Actions environment
        const scopeResult = await getVibeCheckScope({
          commitSha,
          commitCount,
          staged,
          sinceBranch,
          last,
          changes,
          gitRoot: fs.gitRoot,
          hasStagedChanges: git.hasStagedChanges,
          hasChanges: git.hasChanges,
        })

        // Handle warnings and early exits
        if (scopeResult.warning) {
          await showWarningAndExit({
            warning: scopeResult.warning,
            setWarnings,
            exit,
            cancelled: cancelledRef,
            commandName: 'vibe check',
            alternativeCommand: 'kyoto vibe check',
          })
          return
        }

        if (!scopeResult.scope) {
          return
        }

        // Determine which files to check based on scope
        const changedTsFiles = await getChangedFiles({
          scope: scopeResult.scope,
          gitRoot: fs.gitRoot,
        })

        if (changedTsFiles.length === 0) {
          await showWarningAndExit({
            warning: 'No changed source files found.',
            setWarnings,
            exit,
            cancelled: cancelledRef,
            commandName: 'vibe check',
            alternativeCommand: 'kyoto vibe check',
          })
          return
        }

        // Detect GitHub Actions environment and add GitHub context if available
        const githubContext = getGitHubContext()

        // TODO this method below can take a little time.
        // TODO so we need a spinner on the scope descriptions.
        // Retrieve scope content programmatically before agents start
        const scopeContent = await getScopeContext(
          scopeResult.scope,
          fs.gitRoot,
        )

        // Set scope description for display
        setScopeDescription(
          formatScopeDescription({ scope: scopeResult.scope }),
        )
        setContext({
          gitRoot: fs.gitRoot,
          scope: scopeResult.scope,
          scopeContent,
          model,
          ...(githubContext ? { github: githubContext } : {}),
        })

        setStep('agents')
      } catch (err) {
        if (cancelledRef.current) {
          return
        }

        const message =
          err instanceof Error
            ? err.message
            : staged
              ? 'Failed to evaluate staged changes'
              : 'Failed to evaluate changes'
        setError(message)
        process.exitCode = 1

        // Wait for error to be displayed before exiting
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(undefined)
          }, 500)
        })

        if (!cancelledRef.current) {
          exit()
        }
      }
    }

    void runCheck()

    return () => {
      cancelledRef.current = true
    }
  }, [exit, staged, commitCount, commitSha, sinceBranch, last, changes])

  // Update config and write check.json after successful vibe check
  useEffect(() => {
    if (!finalStates || !context || finalStates.length === 0) {
      return
    }

    void (async () => {
      try {
        const sha = await getCurrentCommitSha(context.gitRoot)
        const branch = await getCurrentBranch(context.gitRoot)
        if (sha && branch) {
          await updateConfig({
            latest: {
              sha,
              branch,
            },
          })
        }

        // Write check.json for extension to read
        await writeVibeCheckFile({
          gitRoot: context.gitRoot,
          scope: context.scope,
          branch,
          headCommit: sha,
          agentStates: finalStates,
        })
      } catch {
        // Silently fail - config/file update is not critical
      }
    })()
  }, [finalStates, context])

  const handleAgentComplete = useCallback((states: AgentRunState[]): void => {
    setFinalStates(states)
    setStep('issues')
  }, [])

  const handleIssueSelect = useCallback(
    async (finding: ConsolidatedFinding): Promise<void> => {
      try {
        // Generate deep link for this finding
        const deepLink = generateCursorDeepLink(finding)

        // Open the deep link (don't await, let it run in background)
        openBrowser({ url: deepLink }).catch((err) => {
          // eslint-disable-next-line no-console
          console.error(`Failed to open deep link for finding: ${err}`)
        })
      } catch (err) {
        // Log error but don't exit - user can continue selecting other issues
        // eslint-disable-next-line no-console
        console.error(`Failed to spawn agent for finding: ${err}`)
      }
    },
    [],
  )

  const handleExit = useCallback((): void => {
    exit()
  }, [exit])

  return {
    step,
    warnings,
    error,
    context,
    finalStates,
    scopeDescription,
    handleAgentComplete,
    handleIssueSelect,
    handleExit,
  }
}
