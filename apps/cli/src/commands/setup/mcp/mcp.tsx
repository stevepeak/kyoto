import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import TextInput from 'ink-text-input'
import React from 'react'

import { useMcpSetup } from './use-mcp-setup'

type ComponentState = 'pending' | 'active' | 'completed'

interface MCPProps {
  state: ComponentState
  onComplete: () => void
}

export function MCP({ state, onComplete }: MCPProps): React.ReactElement {
  const {
    step,
    configuredFiles,
    commitPromptValue,
    setCommitPromptValue,
    commitError,
    handleCommitSubmit,
    logs,
  } = useMcpSetup({ state, onComplete })

  if (step === 'commit-prompt' || step === 'committing' || step === 'done') {
    const filesToShow =
      configuredFiles.length > 0
        ? configuredFiles
        : ['.cursor/mcp.json', '.cursor/rules/kyoto.mdc']

    return (
      <Box flexDirection="column">
        <Text>
          <Text color="green">✓</Text> MCP
        </Text>
        {filesToShow.map((file) => (
          <Text color="grey" key={file}>
            {'  '}
            <Text>- </Text>
            <Text>{file}</Text>
          </Text>
        ))}
        <Box flexDirection="column" marginTop={1}>
          {step === 'committing' ? (
            <Text color="grey">
              <Text color="red">
                <Spinner type="dots" />
              </Text>{' '}
              Committing changes...
            </Text>
          ) : step === 'commit-prompt' ? (
            <Box flexDirection="column">
              <Text>
                Commit these changes now? <Text color="grey">(Y/n)</Text>
                <TextInput
                  value={commitPromptValue}
                  onChange={(v) => {
                    setCommitPromptValue(v)
                  }}
                  onSubmit={handleCommitSubmit}
                />
              </Text>
              {commitError ? <Text color="#c27a52">{commitError}</Text> : null}
            </Box>
          ) : (
            <Text color="grey">Done.</Text>
          )}
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box flexDirection="column">
        <Text>
          <Text color="red">
            <Spinner type="dots" />
          </Text>{' '}
          Setup Kyoto MCP
        </Text>
        <Text color="grey">
          Creating <Text color="cyan">.cursor/rules/kyoto.mdc</Text> and
          updating <Text color="cyan">.cursor/mcp.json</Text>...
        </Text>
      </Box>

      {logs.map((line) => {
        return <React.Fragment key={line.key}>{line.content}</React.Fragment>
      })}
    </Box>
  )
}
