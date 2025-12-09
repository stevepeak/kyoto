import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { type LanguageModel } from 'ai'
import { Text } from 'ink'

import { type Logger } from '../../types/logger'
import { getAiConfig } from './get-ai-config'

type Provider = 'openai' | 'vercel' | 'openrouter' | 'anthropic' | 'auto'

interface GetModelOptions {
  model?: string
  provider?: Provider
  logger?: Logger
}

/**
 * Gets the appropriate model configuration based on config.json or CLI arguments.
 *
 * Priority:
 * 1. CLI arguments (--model and --provider) - uses API key from config.json
 * 2. config.json configuration (.kyoto/cache/config.json)
 *
 * @param options - Configuration options
 * @returns The model configuration (either a provider instance or a string for AI Gateway)
 */
export async function getModel(options: GetModelOptions = {}): Promise<{
  model: LanguageModel
  provider: Provider
  modelId: string
  apiKeySource: 'cli' | 'details' | 'none'
}> {
  const { model: cliModel, provider: cliProvider, logger } = options
  // eslint-disable-next-line no-console
  const log: Logger =
    logger ||
    ((message) => {
      const text =
        typeof message === 'string'
          ? message
          : typeof message === 'object' &&
              message !== null &&
              'toString' in message
            ? String(message)
            : JSON.stringify(message)
      // eslint-disable-next-line no-console
      console.log(text)
    })

  // Get config from config.json
  const aiConfig = await getAiConfig()

  // If CLI arguments are provided, use them
  if (cliModel && cliProvider && cliProvider !== 'auto') {
    if (!aiConfig || aiConfig.provider !== cliProvider) {
      log(
        <Text color="yellow">
          {`⚠️  API key is required when using --provider ${cliProvider}\n`}
        </Text>,
      )
      log(
        <Text color="grey">
          Please run `kyoto init` to configure your API key.\n
        </Text>,
      )
      throw new Error(`API key is required for ${cliProvider} provider`)
    }

    if (cliProvider === 'openai') {
      return {
        model: createOpenAI({ apiKey: aiConfig.apiKey })(cliModel),
        modelId: cliModel,
        provider: 'openai',
        apiKeySource: 'cli',
      }
    }

    if (cliProvider === 'vercel') {
      return {
        model: createOpenAI({ apiKey: aiConfig.apiKey })(cliModel),
        modelId: cliModel,
        provider: 'vercel',
        apiKeySource: 'cli',
      }
    }

    if (cliProvider === 'openrouter') {
      return {
        model: createOpenRouter({ apiKey: aiConfig.apiKey })(cliModel),
        modelId: cliModel,
        provider: 'openrouter',
        apiKeySource: 'cli',
      }
    }

    if (cliProvider === 'anthropic') {
      return {
        model: createAnthropic({ apiKey: aiConfig.apiKey })(cliModel),
        modelId: cliModel,
        provider: 'anthropic',
        apiKeySource: 'cli',
      }
    }
  }

  // Get from config.json (should exist if init was called)
  if (aiConfig) {
    // Use model from config.json, CLI argument, or default
    const modelToUse =
      cliModel ||
      aiConfig.model ||
      getDefaultModelForProvider(aiConfig.provider)
    if (aiConfig.provider === 'openai') {
      return {
        model: createOpenAI({ apiKey: aiConfig.apiKey })(modelToUse),
        provider: 'openai',
        modelId: modelToUse,
        apiKeySource: 'details',
      }
    }
    if (aiConfig.provider === 'openrouter') {
      return {
        model: createOpenRouter({ apiKey: aiConfig.apiKey })(modelToUse),
        provider: 'openrouter',
        modelId: modelToUse,
        apiKeySource: 'details',
      }
    }
    if (aiConfig.provider === 'vercel') {
      return {
        model: createOpenAI({ apiKey: aiConfig.apiKey })(modelToUse),
        provider: 'vercel',
        modelId: modelToUse,
        apiKeySource: 'details',
      }
    }
    if (aiConfig.provider === 'anthropic') {
      return {
        model: createAnthropic({ apiKey: aiConfig.apiKey })(modelToUse),
        provider: 'anthropic',
        modelId: modelToUse,
        apiKeySource: 'details',
      }
    }
  }

  // No API keys found
  log(
    <Text color="yellow">
      {'\n⚠️  No AI API key found. Please configure your AI provider.\n'}
    </Text>,
  )
  log(
    <Text color="grey">
      Run `kyoto init` to configure your AI provider and API key.\n
    </Text>,
  )

  throw new Error('AI API key is required. Run `kyoto init` to configure.')
}

function getDefaultModelForProvider(
  provider: 'openai' | 'vercel' | 'openrouter' | 'anthropic',
): string {
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
