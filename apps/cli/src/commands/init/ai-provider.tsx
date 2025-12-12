import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
import Spinner from 'ink-spinner'
import TextInput from 'ink-text-input'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { type Config, getConfig } from '../../helpers/config/get'
import { getDefaultModelForProvider } from '../../helpers/config/get-default-model'
import { updateConfig } from '../../helpers/config/update'
import { useCliLogger } from '../../helpers/logging/logger'

type Provider = 'openai' | 'vercel' | 'openrouter' | 'anthropic'

type Step =
  | 'check-existing'
  | 'confirm-change'
  | 'select-provider'
  | 'api-key'
  | 'saving'
  | 'done'

function getProviderLabel(provider: Provider | null | undefined): string {
  if (!provider) return ''
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
  const [isInputReady, setIsInputReady] = useState(false)
  const previousStateRef = useRef<ComponentState>('pending')

  const providerLabel = useMemo(() => getProviderLabel(provider), [provider])

  const existingProviderLabel = useMemo(
    () => getProviderLabel(existingConfig?.ai.provider),
    [existingConfig],
  )

  // Reset step when state transitions from non-active to active
  useEffect(() => {
    if (state === 'active' && previousStateRef.current !== 'active') {
      setStep('check-existing')
      setExistingConfig(null)
      setFinalConfig(null)
      setProvider(null)
      setApiKey('')
      setError(null)
      setInputValue('')
      setIsInputReady(false)
    }
    previousStateRef.current = state
  }, [state])

  // Check for existing configuration on mount (only when active)
  useEffect(() => {
    if (state !== 'active' || step !== 'check-existing') {
      return
    }

    const checkConfig = async (): Promise<void> => {
      try {
        const config = await getConfig()
        setExistingConfig(config)
        // Don't set finalConfig yet - wait for user confirmation
        setStep('confirm-change')
      } catch {
        setError('Please run `kyoto login` first.')
        process.exitCode = 1
        setStep('done')
        setTimeout(() => {
          onComplete()
        }, 750)
      }
    }

    void checkConfig()
  }, [onComplete, state, step])

  // Mark input as ready when entering confirm-change step (after a small delay to ensure it's rendered)
  useEffect(() => {
    if (step === 'confirm-change') {
      setInputValue('')
      // Small delay to ensure TextInput is fully rendered and focused before allowing submission
      const timer = setTimeout(() => {
        setIsInputReady(true)
      }, 100)
      return () => {
        clearTimeout(timer)
      }
    } else {
      setIsInputReady(false)
      return undefined
    }
  }, [step])

  useEffect(() => {
    if (
      state !== 'active' ||
      step !== 'saving' ||
      !provider ||
      !apiKey ||
      !existingConfig
    ) {
      return
    }

    const save = async (): Promise<void> => {
      try {
        const defaultModel = getDefaultModelForProvider(provider)
        const config = await updateConfig({
          ai: {
            provider,
            apiKey,
            model: defaultModel,
          },
        })

        setFinalConfig(config)

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
              key="confirm-provider-input"
              value={inputValue}
              onChange={setInputValue}
              focus={true}
              onSubmit={(value) => {
                // Only process submission if input is ready (prevents auto-submission on mount)
                if (!isInputReady) {
                  return
                }

                const normalized = value.trim().toLowerCase()
                if (normalized === 'y' || normalized === 'yes') {
                  setStep('select-provider')
                  setError(null)
                } else if (
                  normalized === '' ||
                  normalized === 'n' ||
                  normalized === 'no'
                ) {
                  // Only set finalConfig and complete when user explicitly says no
                  if (existingConfig) {
                    setFinalConfig(existingConfig)
                  }
                  setError(null)
                  setStep('done')
                  onComplete()
                } else {
                  // Invalid input - show error and keep waiting
                  setError(
                    'Please enter "y" for yes or "n" for no (or press Enter for no)',
                  )
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
