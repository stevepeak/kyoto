import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { type LanguageModel } from 'ai'

import { type Config } from './get'

type Provider = 'openai' | 'vercel' | 'openrouter' | 'anthropic' | 'auto'

interface ConstructModelOptions {
  model?: string
  provider?: Provider
}

/**
 * Constructs a model instance from the provided config.
 *
 * Priority:
 * 1. CLI arguments (--model and --provider) - uses API key from config
 * 2. config.json configuration (~/.kyoto/config.json)
 *
 * @param config - The validated config from getConfig()
 * @param options - Optional model and provider overrides
 * @returns The model configuration
 */
export function constructModel(
  config: Config,
  options: ConstructModelOptions = {},
): {
  model: LanguageModel
  provider: Provider
  modelId: string
  apiKeySource: 'cli' | 'config' | 'none'
} {
  const { model: cliModel, provider: cliProvider } = options
  // config.ai is always present if config is valid
  const aiConfig = config.ai

  // If CLI arguments are provided, use them
  if (cliModel && cliProvider && cliProvider !== 'auto') {
    if (aiConfig.provider !== cliProvider) {
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

  // Use model from CLI argument or config.json (model is required in config)
  const modelToUse = cliModel || aiConfig.model

  if (aiConfig.provider === 'openai') {
    return {
      model: createOpenAI({ apiKey: aiConfig.apiKey })(modelToUse),
      provider: 'openai',
      modelId: modelToUse,
      apiKeySource: 'config',
    }
  }
  if (aiConfig.provider === 'openrouter') {
    return {
      model: createOpenRouter({ apiKey: aiConfig.apiKey })(modelToUse),
      provider: 'openrouter',
      modelId: modelToUse,
      apiKeySource: 'config',
    }
  }
  if (aiConfig.provider === 'vercel') {
    return {
      model: createOpenAI({ apiKey: aiConfig.apiKey })(modelToUse),
      provider: 'vercel',
      modelId: modelToUse,
      apiKeySource: 'config',
    }
  }
  if (aiConfig.provider === 'anthropic') {
    return {
      model: createAnthropic({ apiKey: aiConfig.apiKey })(modelToUse),
      provider: 'anthropic',
      modelId: modelToUse,
      apiKeySource: 'config',
    }
  }

  throw new Error(`Unsupported provider: ${aiConfig.provider}`)
}
