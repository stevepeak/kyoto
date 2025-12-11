import { findGitRoot } from '@app/shell'
import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
import Spinner from 'ink-spinner'
import TextInput from 'ink-text-input'
import React, { useEffect, useMemo, useState } from 'react'

import { pwdKyoto } from '../../helpers/config/find-kyoto-dir'
import { type Config, getConfig } from '../../helpers/config/get'
import { updateConfigJson as updateConfig } from '../../helpers/config/update'
import { useCliLogger } from '../../helpers/logging/logger'

type Provider = 'openai' | 'vercel' | 'openrouter' | 'anthropic'

type Step =
  | 'check-existing'
  | 'confirm-change'
  | 'select-provider'
  | 'api-key'
  | 'saving'
  | 'done'

function getDefaultModelForProvider(provider: Provider): string {
  switch (provider) {
    case 'openai':
      return 'gpt-5-mini'
    case 'openrouter':
      return 'x-ai/grok-4.1-fast'
    case 'vercel':
      return 'openai/gpt-5-mini'
    case 'anthropic':
      return 'claude-3.5-sonnet'
  }
}

type ComponentState = 'pending' | 'active' | 'completed'

interface AIProviderProps {
  state: ComponentState
  onComplete: () => void
}

export function AIProvider({
  state,
  onComplete,
}: AIProviderProps): React.ReactElement {
  const [provider, setProvider] = useState<Provider | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [step, setStep] = useState<Step>('check-existing')
  const [inputValue, setInputValue] = useState('')
  const { logs, logger } = useCliLogger()
  const [error, setError] = useState<string | null>(null)
  const [existingConfig, setExistingConfig] = useState<Config | null>(null)
  const [finalConfig, setFinalConfig] = useState<Config | null>(null)

  const providerLabel = useMemo(() => {
    switch (provider) {
      case 'openai':
        return 'OpenAI'
      case 'vercel':
        return 'Vercel AI Gateway'
      case 'openrouter':
        return 'OpenRouter'
      case 'anthropic':
        return 'Anthropic'
      default:
        return ''
    }
  }, [provider])

  const existingProviderLabel = useMemo(() => {
    if (!existingConfig) return ''
    switch (existingConfig.ai.provider) {
      case 'openai':
        return 'OpenAI'
      case 'vercel':
        return 'Vercel AI Gateway'
      case 'openrouter':
        return 'OpenRouter'
      case 'anthropic':
        return 'Anthropic'
      default:
        return ''
    }
  }, [existingConfig])

  // Check for existing configuration on mount (only when active)
  useEffect(() => {
    if (state !== 'active' || step !== 'check-existing') {
      return
    }

    const checkConfig = async (): Promise<void> => {
      try {
        const config = await getConfig()
        setExistingConfig(config)
        setFinalConfig(config)
        setStep('confirm-change')
      } catch {
        setStep('select-provider')
      }
    }

    void checkConfig()
  }, [state, step])

  useEffect(() => {
    if (state !== 'active' || step !== 'saving' || !provider || !apiKey) {
      return
    }

    const save = async (): Promise<void> => {
      try {
        const gitRoot = await findGitRoot()
        const fsPaths = await pwdKyoto(gitRoot)

        const configPath = fsPaths.config
        const config: Partial<Config> = existingConfig
          ? { ...existingConfig }
          : {}

        const defaultModel = getDefaultModelForProvider(provider)

        const finalConfigValue: Config = {
          ...config,
          ai: {
            provider,
            apiKey,
            model: defaultModel,
          },
        }

        setFinalConfig(finalConfigValue)

        await updateConfig(configPath, null, null, finalConfigValue)

        setStep('done')
        onComplete()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to initialize Kyoto'
        if (
          message.includes('git') ||
          message.includes('Git repository') ||
          message.includes('not a git repository')
        ) {
          logger(<Text color="#c27a52">{`\n⚠️  ${message}\n`}</Text>)
        } else {
          setError(message)
        }
        process.exitCode = 1
        setStep('done')
      }
    }

    void save()
  }, [
    apiKey,
    existingConfig,
    logger,
    onComplete,
    provider,
    providerLabel,
    state,
    step,
  ])

  const handleApiSubmit = (value: string): void => {
    if (!value.trim()) {
      setError('API key is required')
      return
    }

    setApiKey(value.trim())
    setError(null)
    setStep('saving')
  }

  if (state === 'pending') {
    return (
      <Box marginTop={1}>
        <Text color="grey">• Configure AI provider</Text>
      </Box>
    )
  }

  if (state === 'completed') {
    const configToShow = finalConfig || existingConfig
    const modelToShow = configToShow?.ai.model
    const providerToShow = configToShow
      ? existingProviderLabel || providerLabel
      : providerLabel

    return (
      <Box flexDirection="column">
        <Text>
          <Text color="green">✓</Text> AI Provider
        </Text>
        {modelToShow && providerToShow ? (
          <Text>
            {'  '}
            <Text color="grey">- </Text>
            <Text color="cyan">{modelToShow}</Text>
            <Text color="grey"> via </Text>
            <Text color="yellow">{providerToShow}</Text>
          </Text>
        ) : null}
        {logs.map((line) => {
          return <React.Fragment key={line.key}>{line.content}</React.Fragment>
        })}
      </Box>
    )
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      {step === 'confirm-change' && existingConfig ? (
        <Box flexDirection="column">
          <Text>
            <Text color="red">
              <Spinner type="dots" />
            </Text>{' '}
            AI Provider
          </Text>
          <Text>
            <Text color="grey">- </Text>
            <Text color="cyan"> {existingConfig.ai.model}</Text>
            <Text color="grey"> via </Text>
            <Text color="yellow">{existingProviderLabel}</Text>
          </Text>
          <Box flexDirection="row" gap={1} alignItems="center">
            <Text>
              Choose a different provider? <Text color="grey">(N/y)</Text>
            </Text>
            <TextInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={(value) => {
                const normalized = value.trim().toLowerCase()
                if (normalized === 'y' || normalized === 'yes') {
                  setStep('select-provider')
                  setError(null)
                } else if (
                  normalized === '' ||
                  normalized === 'n' ||
                  normalized === 'no'
                ) {
                  if (existingConfig) {
                    setFinalConfig(existingConfig)
                  }
                  setError(null)
                  setStep('done')
                  onComplete()
                }
              }}
            />
          </Box>
        </Box>
      ) : null}

      {step === 'select-provider' ? (
        <Box flexDirection="column">
          <Text>
            <Text color="red">
              <Spinner type="dots" />
            </Text>{' '}
            AI Provider
          </Text>
          <Text color="grey">Select your AI provider:</Text>
          <Box>
            <SelectInput
              items={[
                { label: 'OpenAI', value: 'openai' },
                { label: 'Vercel AI Gateway', value: 'vercel' },
                { label: 'OpenRouter', value: 'openrouter' },
                { label: 'Anthropic', value: 'anthropic' },
                // TODO add google gemini
              ]}
              onSelect={(item) => {
                setProvider(item.value as Provider)
                setStep('api-key')
                setError(null)
              }}
            />
          </Box>
        </Box>
      ) : null}

      {step === 'api-key' && provider ? (
        <Box flexDirection="column">
          <Text>
            <Text color="red">
              <Spinner type="dots" />
            </Text>{' '}
            AI Provider
          </Text>
          <Text>
            Enter your <Text color="cyan">{providerLabel}</Text> API key{' '}
            <Text color="grey">(then press &lt;enter&gt; to submit)</Text>:
          </Text>
          <Text color="grey">
            <TextInput
              value={apiKey}
              mask="*"
              onChange={(value) => setApiKey(value)}
              onSubmit={handleApiSubmit}
            />
          </Text>
        </Box>
      ) : null}

      {logs.map((line) => {
        return <React.Fragment key={line.key}>{line.content}</React.Fragment>
      })}
      {error ? <Text color="red">{error}</Text> : null}
    </Box>
  )
}
