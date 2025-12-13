import {
  formatScopeDescription,
  getCurrentBranch,
  getCurrentCommitSha,
  getScopeContext,
} from '@app/shell'
import { type AgentRunState, type VibeCheckContext } from '@app/types'
import { Box, Text, useApp } from 'ink'
import React, { useEffect, useRef, useState } from 'react'

import { defaultVibeCheckAgents } from '../../agents'
import { openBrowser } from '../../helpers/browser/open-browser'
import { updateConfig } from '../../helpers/config/update'
import { IssueSelection } from '../../helpers/display/issue-selection'
import { VibeAgents } from '../../helpers/display/vibe-agents'
import { init } from '../../helpers/init'
import { generateCursorDeepLink } from '../../helpers/vibe-check/cursor-deep-link'
import { type ConsolidatedFinding } from '../../helpers/vibe-check/findings'
import { getChangedFiles } from '../../helpers/vibe-check/get-changed-files'
import { getGitHubContext } from '../../helpers/vibe-check/github-actions'
import { getVibeCheckScope } from '../../helpers/vibe-check/scope'
import { showWarningAndExit } from '../../helpers/vibe-check/warnings'
import { Header } from '../../ui/header'
import { Jumbo } from '../../ui/jumbo'
import { ScopeDisplay } from '../../ui/ScopeDisplay'

interface VibeCheckProps {
  staged?: boolean
  timeoutMinutes?: number
  commitCount?: number
  commitSha?: string
  sinceBranch?: string
  last?: boolean
}

export default function VibeCheck({
  staged = false,
  timeoutMinutes = 1,
  commitCount,
  commitSha,
  sinceBranch,
  last,
}: VibeCheckProps): React.ReactElement {
  const { exit } = useApp()
  const [warnings, setWarnings] = useState<React.ReactNode[]>([])
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<VibeCheckContext | null>(null)
  const [finalStates, setFinalStates] = useState<AgentRunState[] | null>(null)
  const [showIssueSelection, setShowIssueSelection] = useState(false)
  const [scopeDescription, setScopeDescription] = useState<string | null>(null)

  const cancelledRef = useRef(false)

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
          })
          return
        }

        if (!scopeResult.scope) {
          // This shouldn't happen if getVibeCheckScope is correct, but handle it
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
          })
          return
        }

        // Detect GitHub Actions environment and add GitHub context if available
        const githubContext = getGitHubContext()

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
  }, [exit, staged, commitCount, commitSha, sinceBranch, last])

  // Update config with latest commit SHA and branch after successful vibe check
  useEffect(() => {
    if (!finalStates || !context || finalStates.length === 0) {
      return
    }

    void (async () => {
      try {
        const commitSha = await getCurrentCommitSha(context.gitRoot)
        const branch = await getCurrentBranch(context.gitRoot)
        if (commitSha && branch) {
          await updateConfig({
            latest: {
              sha: commitSha,
              branch,
            },
          })
        }
      } catch {
        // Silently fail - config update is not critical
      }
    })()
  }, [finalStates, context])

  const handleAgentComplete = async (
    states: AgentRunState[],
  ): Promise<void> => {
    if (!context) {
      return
    }

    // Store states and show issue selection
    setFinalStates(states)
    setShowIssueSelection(true)
  }

  const handleIssueSelect = async (
    finding: ConsolidatedFinding,
  ): Promise<void> => {
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
  }

  const handleExit = (): void => {
    exit()
  }

  return (
    <Box flexDirection="column">
      <Jumbo />
      <ScopeDisplay scopeDescription={scopeDescription} />
      <Header kanji="空気" title="Vibe checks" />
      {warnings.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          {warnings.map((warning, index) => (
            <React.Fragment key={index}>{warning}</React.Fragment>
          ))}
        </Box>
      )}
      {context && (
        <VibeAgents
          agents={defaultVibeCheckAgents}
          context={context}
          onComplete={handleAgentComplete}
          timeoutMinutes={timeoutMinutes}
        />
      )}
      {showIssueSelection && finalStates && (
        <IssueSelection
          agentStates={finalStates}
          onSelect={handleIssueSelect}
          onExit={handleExit}
        />
      )}
      {error && <Text color="red">{error}</Text>}
    </Box>
  )
}
