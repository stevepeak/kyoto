import { findGitRoot, getGitHubInfo } from '@app/shell'
import { execa } from 'execa'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import React, { useEffect, useReducer } from 'react'

import { getConfig } from '../../../helpers/config/get'
import { CreatedResult } from './created-result'
import { DefaultResult } from './default-result'
import { ExistsResult } from './exists-result'
import { createWorkflowContent } from './github-workflow-template'
import { LoadingStep } from './loading-step'

// State machine types
type WorkflowState =
  | { status: 'checking' }
  | { status: 'setting-up' }
  | { status: 'done'; result: 'exists' | 'created' | 'default' }

type WorkflowAction =
  | { type: 'START_SETUP' }
  | { type: 'COMPLETE'; result: 'exists' | 'created' | 'default' }

function workflowReducer(
  state: WorkflowState,
  action: WorkflowAction,
): WorkflowState {
  switch (action.type) {
    case 'START_SETUP':
      return { status: 'setting-up' }
    case 'COMPLETE':
      return { status: 'done', result: action.result }
    default:
      return state
  }
}

type ComponentState = 'pending' | 'active' | 'completed'

export interface GitHubWorkflowProps {
  state: ComponentState
  onComplete: () => void
}

export function GitHubWorkflow({
  state: componentState,
  onComplete,
}: GitHubWorkflowProps): React.ReactElement {
  const [workflowState, dispatch] = useReducer(workflowReducer, {
    status: 'checking',
  })

  const [apiKey, setApiKey] = React.useState<string | null>(null)
  const [secretsUrl, setSecretsUrl] = React.useState<string | null>(null)
  const [isFileTracked, setIsFileTracked] = React.useState<boolean>(false)

  // Transition to setting-up when component becomes active
  useEffect(() => {
    if (componentState === 'active' && workflowState.status === 'checking') {
      dispatch({ type: 'START_SETUP' })
    }
  }, [componentState, workflowState.status])

  // Initial check on mount
  useEffect(() => {
    const checkInitial = async (): Promise<void> => {
      try {
        const config = await getConfig()
        const configApiKey = config.user.openrouterApiKey || config.ai.apiKey
        setApiKey(configApiKey)
      } catch {
        // Config might not exist
      }

      try {
        const gitRoot = await findGitRoot()
        const githubInfo = await getGitHubInfo(gitRoot)
        const url = githubInfo
          ? `https://github.com/${githubInfo.owner}/${githubInfo.repo}/settings/secrets/actions/new`
          : null
        setSecretsUrl(url)
      } catch {
        // Ignore errors
      }
    }

    void checkInitial()
  }, [])

  // Main workflow setup effect
  useEffect(() => {
    if (componentState !== 'active' || workflowState.status !== 'setting-up') {
      return
    }

    const ensureWorkflow = async (): Promise<void> => {
      try {
        // Get API key
        try {
          const config = await getConfig()
          const configApiKey = config.user.openrouterApiKey || config.ai.apiKey
          setApiKey(configApiKey)
        } catch {
          // Config might not exist
        }

        const gitRoot = await findGitRoot()
        const githubInfo = await getGitHubInfo(gitRoot)
        const githubDir = join(gitRoot, '.github', 'workflows')
        const workflowFile = join(githubDir, 'kyoto.yml')

        // Set secrets URL
        const url = githubInfo
          ? `https://github.com/${githubInfo.owner}/${githubInfo.repo}/settings/secrets/actions/new`
          : null
        setSecretsUrl(url)

        // Check if file exists
        try {
          await readFile(workflowFile, 'utf-8')
          // File exists - check if tracked in git
          try {
            const relativePath = relative(gitRoot, workflowFile)
            await execa('git', ['ls-files', '--error-unmatch', relativePath], {
              cwd: gitRoot,
            })
            setIsFileTracked(true)
          } catch {
            setIsFileTracked(false)
          }
          dispatch({ type: 'COMPLETE', result: 'exists' })
          onComplete()
          return
        } catch {
          // File doesn't exist - create it
        }

        // Create workflow file
        await mkdir(githubDir, { recursive: true })
        const workflowContent = createWorkflowContent()
        await writeFile(workflowFile, workflowContent, 'utf-8')
        setIsFileTracked(false)

        dispatch({ type: 'COMPLETE', result: 'created' })
        onComplete()
      } catch {
        dispatch({ type: 'COMPLETE', result: 'default' })
        onComplete()
      }
    }

    void ensureWorkflow()
  }, [componentState, onComplete, workflowState.status])

  // Render based on state
  if (
    workflowState.status === 'checking' ||
    workflowState.status === 'setting-up'
  ) {
    return <LoadingStep phase={workflowState.status} />
  }

  if (workflowState.result === 'exists') {
    return <ExistsResult apiKey={apiKey} secretsUrl={secretsUrl} />
  }

  if (workflowState.result === 'created') {
    return (
      <CreatedResult
        apiKey={apiKey}
        secretsUrl={secretsUrl}
        isFileTracked={isFileTracked}
      />
    )
  }

  return <DefaultResult />
}
