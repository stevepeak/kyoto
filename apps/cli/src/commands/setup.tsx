import { Box, useApp } from 'ink'
import React, { useCallback, useState } from 'react'

import { Header } from '../ui/header'
import { Jumbo } from '../ui/jumbo'
import { AIProvider } from './init/ai-provider'
import { GitHubWorkflow } from './init/github-workflow'
import { GitIgnore } from './init/gitignore'
import { MCP } from './init/mcp'

type Stage = 'gitignore' | 'ai-provider' | 'mcp' | 'github-workflow' | 'done'
type ComponentState = 'pending' | 'active' | 'completed'

export default function Setup(): React.ReactElement {
  const { exit } = useApp()
  const [stage, setStage] = useState<Stage>('gitignore')

  const handleGitIgnoreComplete = useCallback(() => {
    setStage('ai-provider')
  }, [])

  const handleAIProviderComplete = useCallback(() => {
    setStage('mcp')
  }, [])

  const handleMCPComplete = useCallback(() => {
    setStage('github-workflow')
  }, [])

  const handleGitHubWorkflowComplete = useCallback(async () => {
    setStage('done')
    await new Promise((resolve) => setTimeout(resolve, 1000))
    exit()
  }, [exit])

  const getState = (componentStage: Stage): ComponentState => {
    if (stage === 'done') {
      return 'completed'
    }
    if (stage === componentStage) {
      return 'active'
    }
    const stageOrder: Stage[] = [
      'gitignore',
      'ai-provider',
      'mcp',
      'github-workflow',
    ]
    const currentIndex = stageOrder.indexOf(stage)
    const componentIndex = stageOrder.indexOf(componentStage)
    return componentIndex < currentIndex ? 'completed' : 'pending'
  }

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Header kanji="改善" title="Setup" />
      <GitIgnore
        state={getState('gitignore')}
        onComplete={handleGitIgnoreComplete}
      />
      <MCP state={getState('mcp')} onComplete={handleMCPComplete} />
      <GitHubWorkflow
        state={getState('github-workflow')}
        onComplete={handleGitHubWorkflowComplete}
      />
      <AIProvider
        state={getState('ai-provider')}
        onComplete={handleAIProviderComplete}
      />
    </Box>
  )
}
