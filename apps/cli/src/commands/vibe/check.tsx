import { getLatestCommit, getPrCommits, getRecentCommits } from '@app/shell'
import { type AgentRunState, type VibeCheckScope } from '@app/types'
import { Box, Text, useApp } from 'ink'
import React, { useEffect, useState } from 'react'

import { defaultVibeCheckAgents } from '../../agents'
import { type LanguageModel } from '../../helpers/config/get-model'
import { SummarizationAgent } from '../../helpers/display/summarization-agent'
import { VibeAgents } from '../../helpers/display/vibe-agents'
import { init } from '../../helpers/init'
import { getChangedFiles } from '../../helpers/vibe-check/get-changed-files'
import {
  getGitHubBaseRef,
  getGitHubContext,
  getGitHubEventName,
  getGitHubHeadRef,
  isGitHubActions,
} from '../../helpers/vibe-check/github-actions'
import { writePlanFile } from '../../helpers/vibe-check/plan'
import { Header } from '../../ui/header'
import { Jumbo } from '../../ui/jumbo'

interface VibeCheckProps {
  staged?: boolean
  timeoutMinutes?: number
  commitCount?: number
  commitSha?: string
}

export default function VibeCheck({
  staged = false,
  timeoutMinutes = 1,
  commitCount,
  commitSha,
}: VibeCheckProps): React.ReactElement {
  const { exit } = useApp()
  const [warnings, setWarnings] = useState<React.ReactNode[]>([])
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<{
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
  } | null>(null)
  const [finalStates, setFinalStates] = useState<AgentRunState[] | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)

  useEffect(() => {
    let cancelled = false

    const runCheck = async (): Promise<void> => {
      try {
        const { fs, git, model } = await init()

        // Determine scope based on flags or GitHub Actions environment
        let scope: VibeCheckScope

        // Priority: explicit commit flags > GitHub Actions auto-detection > staged/unstaged
        if (commitSha) {
          // Specific commit SHA provided
          scope = { type: 'commit', commit: commitSha }
        } else if (commitCount !== undefined && commitCount > 0) {
          // Number of commits provided (e.g., -1, -4)
          const commits = await getRecentCommits(commitCount, fs.gitRoot)
          if (commits.length === 0) {
            setWarnings([
              <Text color="grey" key="no-commits">
                No commits found.
              </Text>,
            ])
            await new Promise((resolve) => {
              setTimeout(() => {
                resolve(undefined)
              }, 500)
            })
            if (!cancelled) {
              exit()
            }
            return
          }
          if (commits.length === 1) {
            scope = { type: 'commit', commit: commits[0]!.hash }
          } else {
            scope = {
              type: 'commits',
              commits: commits.map((c) => c.hash),
            }
          }
        } else if (isGitHubActions()) {
          // Auto-detect scope in GitHub Actions
          const eventName = getGitHubEventName()
          if (eventName === 'pull_request') {
            // For PR events, check all commits in the PR
            const baseRef = getGitHubBaseRef()
            const headRef = getGitHubHeadRef()
            if (baseRef && headRef) {
              const prCommits = await getPrCommits(baseRef, headRef, fs.gitRoot)
              if (prCommits.length === 0) {
                setWarnings([
                  <Text color="grey" key="no-pr-commits">
                    No commits found in pull request.
                  </Text>,
                ])
                await new Promise((resolve) => {
                  setTimeout(() => {
                    resolve(undefined)
                  }, 500)
                })
                if (!cancelled) {
                  exit()
                }
                return
              }
              if (prCommits.length === 1) {
                scope = { type: 'commit', commit: prCommits[0]!.hash }
              } else {
                scope = {
                  type: 'commits',
                  commits: prCommits.map((c) => c.hash),
                }
              }
            } else {
              // Fallback to latest commit if base/head refs not available
              const latestCommit = await getLatestCommit(fs.gitRoot)
              if (!latestCommit) {
                setWarnings([
                  <Text color="grey" key="no-commit">
                    No commit found.
                  </Text>,
                ])
                await new Promise((resolve) => {
                  setTimeout(() => {
                    resolve(undefined)
                  }, 500)
                })
                if (!cancelled) {
                  exit()
                }
                return
              }
              scope = { type: 'commit', commit: latestCommit.hash }
            }
          } else {
            // For push events, check the last commit
            const latestCommit = await getLatestCommit(fs.gitRoot)
            if (!latestCommit) {
              setWarnings([
                <Text color="grey" key="no-commit">
                  No commit found.
                </Text>,
              ])
              await new Promise((resolve) => {
                setTimeout(() => {
                  resolve(undefined)
                }, 500)
              })
              if (!cancelled) {
                exit()
              }
              return
            }
            scope = { type: 'commit', commit: latestCommit.hash }
          }
        } else {
          // Local development: use staged/unstaged
          scope = staged
            ? ({ type: 'staged' as const } as const)
            : ({ type: 'unstaged' as const } as const)

          // Check for staged changes early (only for local staged checks)
          if (staged && !git.hasStagedChanges) {
            if (git.hasChanges) {
              setWarnings([
                <Box flexDirection="column" key="no-staged-with-unstaged">
                  <Text color="grey">No staged changes found.</Text>
                  <Text> </Text>
                  <Text color="grey">
                    You can vibe check all changes (including unstaged) via:
                  </Text>
                  <Text color="yellow">kyoto vibe check</Text>
                </Box>,
              ])
            } else {
              setWarnings([
                <Text color="grey" key="no-staged">
                  No staged changes found.
                </Text>,
              ])
            }
            await new Promise((resolve) => {
              setTimeout(() => {
                resolve(undefined)
              }, 500)
            })
            if (!cancelled) {
              exit()
            }
            return
          }
        }

        // Determine which files to check based on scope
        const changedTsFiles = await getChangedFiles({
          scope,
          gitRoot: fs.gitRoot,
        })

        if (changedTsFiles.length === 0) {
          setWarnings([
            <Text color="grey" key="no-changed-files">
              No changed source files found.
            </Text>,
          ])
          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(undefined)
            }, 500)
          })
          if (!cancelled) {
            exit()
          }
          return
        }

        // Detect GitHub Actions environment and add GitHub context if available
        const githubContext = getGitHubContext()

        setContext({
          gitRoot: fs.gitRoot,
          kyotoRoot: fs.root,
          scope,
          model,
          ...(githubContext ? { github: githubContext } : {}),
        })
      } catch (err) {
        if (cancelled) {
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

        if (!cancelled) {
          exit()
        }
      }
    }

    void runCheck()

    return () => {
      cancelled = true
    }
  }, [exit, staged, commitCount, commitSha])

  const handleAgentComplete = async (
    states: AgentRunState[],
  ): Promise<void> => {
    if (!context) {
      return
    }

    // Store states and trigger summarization
    setFinalStates(states)
    setIsSummarizing(true)
  }

  const handleSummarizationComplete = async (
    markdown: string,
  ): Promise<void> => {
    if (!context) {
      return
    }

    try {
      await writePlanFile(markdown, context.kyotoRoot)

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(undefined)
        }, 250)
      })

      exit()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to write plan file'
      setError(message)
      process.exitCode = 1

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(undefined)
        }, 500)
      })

      exit()
    }
  }

  const handleSummarizationError = (errorMessage: string): void => {
    setError(errorMessage)
    process.exitCode = 1
  }

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Header kanji="空気" title="Vibe checking" />
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
      {isSummarizing && finalStates && context && (
        <SummarizationAgent
          agentStates={finalStates}
          gitRoot={context.gitRoot}
          model={context.model}
          onComplete={handleSummarizationComplete}
          onError={handleSummarizationError}
        />
      )}
      {error && <Text color="red">{error}</Text>}
    </Box>
  )
}
