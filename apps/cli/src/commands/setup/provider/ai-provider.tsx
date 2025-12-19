import { Box, Text } from 'ink'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { type Config, getConfig } from '../../../helpers/config/get'
import { getDefaultModelForProvider } from '../../../helpers/config/get-default-model'
import { updateConfig } from '../../../helpers/config/update'
import { useCliLogger } from '../../../helpers/logging/logger'
import { getProviderLabel, type Provider } from './constants'
import {
  ApiKeyStep,
  CompletedStep,
  ConfirmChangeStep,
  PendingStep,
  SelectProviderStep,
} from './steps'
import { type AIProviderProps, type ComponentState, type Step } from './types'

export function AIProvider({
  state,
  onComplete,
}: AIProviderProps): React.ReactElement {
  const [provider, setProvider] = useState<Provider | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [step, setStep] = useState<Step>('check-existing')
  const { logs, logger } = useCliLogger()
  const [error, setError] = useState<string | null>(null)
  const [existingConfig, setExistingConfig] = useState<Config | null>(null)
  const [finalConfig, setFinalConfig] = useState<Config | null>(null)
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

  // Save configuration
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
  }, [apiKey, existingConfig, logger, onComplete, provider, state, step])

  if (state === 'pending') {
    return <PendingStep />
  }

  if (state === 'completed') {
    const configToShow = finalConfig || existingConfig
    const modelToShow = configToShow?.ai.model
    const providerToShow = configToShow
      ? existingProviderLabel || providerLabel
      : providerLabel

    return (
      <CompletedStep
        model={modelToShow}
        providerLabel={providerToShow}
        logs={logs}
      />
    )
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      {step === 'confirm-change' && existingConfig ? (
        <ConfirmChangeStep
          existingConfig={existingConfig}
          existingProviderLabel={existingProviderLabel}
          onConfirmChange={() => {
            setStep('select-provider')
            setError(null)
          }}
          onKeepExisting={() => {
            setFinalConfig(existingConfig)
            setError(null)
            setStep('done')
            onComplete()
          }}
          onError={setError}
        />
      ) : null}

      {step === 'select-provider' ? (
        <SelectProviderStep
          onSelect={(selectedProvider) => {
            setProvider(selectedProvider)
            setStep('api-key')
            setError(null)
          }}
        />
      ) : null}

      {step === 'api-key' && provider ? (
        <ApiKeyStep
          providerLabel={providerLabel}
          onSubmit={(key) => {
            setApiKey(key)
            setError(null)
            setStep('saving')
          }}
          onError={setError}
        />
      ) : null}

      {logs.map((line) => {
        return <React.Fragment key={line.key}>{line.content}</React.Fragment>
      })}
      {error ? <Text color="red">{error}</Text> : null}
    </Box>
  )
}
