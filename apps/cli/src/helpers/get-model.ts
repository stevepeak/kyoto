import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'
import chalk from 'chalk'
import { getAiConfig, getApiKeyForProvider } from './get-ai-config.js'

type Provider = 'openai' | 'vercel' | 'openrouter' | 'auto'

interface GetModelOptions {
  model?: string
  provider?: Provider
  logger?: (message: string) => void
}

/**
 * Gets the appropriate model configuration based on details.json or CLI arguments.
 *
 * Priority:
 * 1. CLI arguments (--model and --provider) - uses API key from details.json
 * 2. details.json configuration (.kyoto/details.json)
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
  const log = logger || ((message: string) => console.log(chalk.grey(message)))

  // Get API keys from details.json
  const openaiApiKey = await getApiKeyForProvider('openai')
  const aiGatewayApiKey = await getApiKeyForProvider('vercel')
  const openrouterApiKey = await getApiKeyForProvider('openrouter')

  // If CLI arguments are provided, use them
  if (cliModel && cliProvider && cliProvider !== 'auto') {
    if (cliProvider === 'openai') {
      if (!openaiApiKey) {
        log(
          chalk.yellow(
            '⚠️  API key is required when using --provider openai\n',
          ),
        )
        log(chalk.grey('Please run `kyoto init` to configure your API key.\n'))
        throw new Error('API key is required for OpenAI provider')
      }
      return {
        model: createOpenAI({ apiKey: openaiApiKey })(cliModel),
        modelId: cliModel,
        provider: 'openai',
        apiKeySource: 'cli',
      }
    }

    if (cliProvider === 'vercel') {
      if (!aiGatewayApiKey) {
        log(
          chalk.yellow(
            '⚠️  API key is required when using --provider vercel\n',
          ),
        )
        log(chalk.grey('Please run `kyoto init` to configure your API key.\n'))
        throw new Error('API key is required for Vercel provider')
      }
      // For Vercel AI Gateway, return the model string format
      return {
        model: createOpenAI({ apiKey: aiGatewayApiKey })(cliModel),
        modelId: cliModel,
        provider: 'vercel',
        apiKeySource: 'cli',
      }
    }

    if (cliProvider === 'openrouter') {
      if (!openrouterApiKey) {
        log(
          chalk.yellow(
            '⚠️  API key is required when using --provider openrouter\n',
          ),
        )
        log(chalk.grey('Please run `kyoto init` to configure your API key.\n'))
        throw new Error('API key is required for OpenRouter provider')
      }
      return {
        model: createOpenRouter({ apiKey: openrouterApiKey })(cliModel),
        modelId: cliModel,
        provider: 'openrouter',
        apiKeySource: 'cli',
      }
    }
  }

  // Get from details.json (should exist if assertCliPrerequisites was called)
  const aiConfig = await getAiConfig()
  if (aiConfig) {
    // Use model from details.json, CLI argument, or default
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
  }

  // No API keys found
  log(
    chalk.yellow(
      '\n⚠️  No AI API key found. Please configure your AI provider.\n',
    ),
  )
  log(
    chalk.grey('Run `kyoto init` to configure your AI provider and API key.\n'),
  )

  throw new Error('AI API key is required. Run `kyoto init` to configure.')
}

function getDefaultModelForProvider(
  provider: 'openai' | 'vercel' | 'openrouter',
): string {
  switch (provider) {
    case 'openai':
      return 'gpt-5-mini'
    case 'openrouter':
      return 'x-ai/grok-4.1-fast'
    case 'vercel':
      return 'openai/gpt-5-mini'
  }
}
