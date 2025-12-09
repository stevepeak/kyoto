import { findGitRoot, getCurrentBranch, getCurrentCommitSha } from '@app/shell'
import { Box, Text, useApp } from 'ink'
import SelectInput from 'ink-select-input'
import Spinner from 'ink-spinner'
import TextInput from 'ink-text-input'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import React, { useEffect, useMemo, useState } from 'react'

import { updateDetailsJson } from '../helpers/config/update-details-json'
import { Header } from '../helpers/display/display-header'

type Provider = 'openai' | 'vercel' | 'openrouter'

interface DetailsJson {
  latest?: {
    sha: string
    branch: string
  }
  ai?: {
    provider: Provider
    apiKey: string
    model?: string
  }
}

type Step = 'select-provider' | 'api-key' | 'saving' | 'done'

function getDefaultModelForProvider(provider: Provider): string {
  switch (provider) {
    case 'openai':
      return 'gpt-5-mini'
    case 'openrouter':
      return 'x-ai/grok-4.1-fast'
    case 'vercel':
      return 'openai/gpt-5-mini'
  }
}

export default function Init(): React.ReactElement {
  const { exit } = useApp()
  const [provider, setProvider] = useState<Provider | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [step, setStep] = useState<Step>('select-provider')
  const [logs, setLogs] = useState<{ message: string; color?: string }[]>([])
  const [error, setError] = useState<string | null>(null)

  const providerLabel = useMemo(() => {
    switch (provider) {
      case 'openai':
        return 'OpenAI'
      case 'vercel':
        return 'Vercel AI Gateway'
      case 'openrouter':
        return 'OpenRouter'
      default:
        return ''
    }
  }, [provider])

  useEffect(() => {
    if (step !== 'saving' || !provider || !apiKey) {
      return
    }

    const save = async (): Promise<void> => {
      try {
        const gitRoot = await findGitRoot()
        const kyotoDir = join(gitRoot, '.kyoto')
        await mkdir(kyotoDir, { recursive: true })

        const ignoreDir = join(kyotoDir, '.ignore')
        await mkdir(ignoreDir, { recursive: true })

        const detailsPath = join(ignoreDir, 'config.json')
        let details: DetailsJson = {}

        try {
          const content = await readFile(detailsPath, 'utf-8')
          details = JSON.parse(content) as DetailsJson
        } catch {
          details = {}
        }

        const defaultModel = getDefaultModelForProvider(provider)

        details.ai = {
          provider,
          apiKey,
          model: defaultModel,
        }

        await writeFile(
          detailsPath,
          JSON.stringify(details, null, 2) + '\n',
          'utf-8',
        )

        const branch = await getCurrentBranch(gitRoot)
        const sha = await getCurrentCommitSha(gitRoot)
        await updateDetailsJson(detailsPath, branch, sha)

        setLogs((prev) => [
          ...prev,
          {
            message: `\n✓ Successfully configured ${providerLabel} provider\n`,
            color: '#7ba179',
          },
          {
            message: 'Configuration saved\n',
            color: 'grey',
          },
        ])
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to initialize Kyoto'
        if (
          message.includes('git') ||
          message.includes('Git repository') ||
          message.includes('not a git repository')
        ) {
          setLogs((prev) => [
            ...prev,
            {
              message: `\n⚠️  ${message}\n`,
              color: '#c27a52',
            },
          ])
        } else {
          setError(message)
        }
        process.exitCode = 1
      } finally {
        setStep('done')
        exit()
      }
    }

    void save()
  }, [apiKey, exit, provider, providerLabel, step])

  const handleApiSubmit = (value: string): void => {
    if (!value.trim()) {
      setError('API key is required')
      return
    }

    setApiKey(value.trim())
    setError(null)
    setStep('saving')
  }

  return (
    <Box flexDirection="column">
      <Header message="Initialize Kyoto" />
      {step === 'select-provider' ? (
        <Box flexDirection="column">
          <Text>Select your AI provider:</Text>
          <SelectInput
            items={[
              { label: 'OpenAI', value: 'openai' },
              { label: 'Vercel AI Gateway', value: 'vercel' },
              { label: 'OpenRouter', value: 'openrouter' },
            ]}
            onSelect={(item) => {
              setProvider(item.value as Provider)
              setStep('api-key')
              setError(null)
            }}
          />
        </Box>
      ) : null}

      {step === 'api-key' && provider ? (
        <Box flexDirection="column" marginTop={1}>
          <Text>
            Enter your {providerLabel} API key (press Enter to submit):
          </Text>
          <TextInput
            value={apiKey}
            mask="*"
            onChange={(value) => setApiKey(value)}
            onSubmit={handleApiSubmit}
          />
        </Box>
      ) : null}

      {step === 'saving' ? (
        <Box marginTop={1} gap={1}>
          <Text color="red">
            <Spinner type="dots" />
          </Text>
          <Text>Saving configuration...</Text>
        </Box>
      ) : null}

      {logs.map((line, index) => (
        <Text key={`${index}-${line.message}`} color={line.color}>
          {line.message}
        </Text>
      ))}
      {error ? <Text color="red">{error}</Text> : null}
    </Box>
  )
}
