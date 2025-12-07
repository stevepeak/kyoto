import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'
import chalk from 'chalk'
import { getAiConfig } from './get-ai-config.js'

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

  // Get config from details.json
  const aiConfig = await getAiConfig()

  // If CLI arguments are provided, use them
  if (cliModel && cliProvider && cliProvider !== 'auto') {
    if (!aiConfig || aiConfig.provider !== cliProvider) {
      log(
        chalk.yellow(
          `⚠️  API key is required when using --provider ${cliProvider}\n`,
        ),
      )
      log(chalk.grey('Please run `kyoto init` to configure your API key.\n'))
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
  }

  // Get from details.json (should exist if assertCliPrerequisites was called)
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
