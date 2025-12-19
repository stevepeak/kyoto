import { Box, useApp } from 'ink'
import React, { useCallback } from 'react'

import { Header } from '../../../ui/header'
import { Jumbo } from '../../../ui/jumbo'
import { GitHubWorkflow } from './github-workflow'

export default function SetupGithub(): React.ReactElement {
  const { exit } = useApp()

  const handleComplete = useCallback(exit, [exit])

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Header kanji="設" title="Setup GitHub Actions" />
      <GitHubWorkflow state="active" onComplete={handleComplete} />
    </Box>
  )
}

export { GitHubWorkflow, type GitHubWorkflowProps } from './github-workflow'
