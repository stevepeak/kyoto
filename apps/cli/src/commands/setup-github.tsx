import { Box, useApp } from 'ink'
import React, { useCallback } from 'react'

import { Header } from '../ui/header'
import { Jumbo } from '../ui/jumbo'
import { GitHubWorkflow } from './init/github-workflow'

export default function SetupGithub(): React.ReactElement {
  const { exit } = useApp()

  const handleComplete = useCallback(() => {
    setTimeout(() => exit(), 250)
  }, [exit])

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Header kanji="改善" title="Setup GitHub Actions" />
      <GitHubWorkflow state="active" onComplete={handleComplete} />
    </Box>
  )
}
