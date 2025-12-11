import { Box, Text, useApp } from 'ink'
import React, { useCallback, useState } from 'react'

import { useCliLogger } from '../helpers/logging/logger'
import { Header } from '../ui/header'
import { Jumbo } from '../ui/jumbo'
import { AIProvider } from './init/ai-provider'
import { GitHubWorkflow } from './init/github-workflow'
import { GitIgnore } from './init/gitignore'
import { MCP } from './init/mcp'

type Stage = 'gitignore' | 'ai-provider' | 'mcp' | 'github-workflow' | 'done'
type ComponentState = 'pending' | 'active' | 'completed'

function getReadyMessage(): React.ReactElement {
  return (
    <Text>
      {'\n'}
      <Text color="red">Kyoto is ready to vibe.</Text>
      {'\n\nNext steps:\n  '}
      <Text color="yellow">kyoto vibe</Text>
      {'   - Continuous commit monitoring.\n  '}
      <Text color="yellow">kyoto craft</Text>
      {'  - Create a new user story.\n'}
    </Text>
  )
}

export default function Init(): React.ReactElement {
  const { exit } = useApp()
  const [stage, setStage] = useState<Stage>('gitignore')
  const { logger } = useCliLogger()

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
    logger(getReadyMessage())
    setStage('done')
    await new Promise((resolve) => setTimeout(resolve, 1000))
    exit()
  }, [exit, logger])

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
      <AIProvider
        state={getState('ai-provider')}
        onComplete={handleAIProviderComplete}
      />
      <MCP state={getState('mcp')} onComplete={handleMCPComplete} />
      <GitHubWorkflow
        state={getState('github-workflow')}
        onComplete={handleGitHubWorkflowComplete}
      />
    </Box>
  )
}
