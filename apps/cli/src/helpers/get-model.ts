import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'
import chalk from 'chalk'

type Provider = 'openai' | 'vercel' | 'openrouter' | 'auto'

interface GetModelOptions {
  model?: string
  provider?: Provider
  logger?: (message: string) => void
}

/**
 * Gets the appropriate model configuration based on environment variables or CLI arguments.
 *
 * Priority:
 * 1. CLI arguments (--model and --provider)
 * 2. Environment variables (OPENAI_API_KEY, OPENROUTER_API_KEY, or AI_GATEWAY_API_KEY)
 *
 * @param options - Configuration options
 * @returns The model configuration (either a provider instance or a string for AI Gateway)
 */
export function getModel(options: GetModelOptions = {}): {
  model: LanguageModel
  provider: Provider
  modelId: string
  apiKeySource: 'cli' | 'env' | 'none'
} {
  const { model: cliModel, provider: cliProvider, logger } = options
  const log = logger || ((message: string) => console.log(chalk.grey(message)))

  const openaiApiKey = process.env.OPENAI_API_KEY
  const aiGatewayApiKey = process.env.AI_GATEWAY_API_KEY
  const openrouterApiKey = process.env.OPENROUTER_API_KEY

  // If CLI arguments are provided, use them
  if (cliModel && cliProvider && cliProvider !== 'auto') {
    if (cliProvider === 'openai') {
      if (!openaiApiKey) {
        log(
          chalk.yellow(
            '⚠️  OPENAI_API_KEY is required when using --provider openai\n',
          ),
        )
        throw new Error('OPENAI_API_KEY is required for OpenAI provider')
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
            '⚠️  AI_GATEWAY_API_KEY is required when using --provider vercel\n',
          ),
        )
        throw new Error('AI_GATEWAY_API_KEY is required for Vercel provider')
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
            '⚠️  OPENROUTER_API_KEY is required when using --provider openrouter\n',
          ),
        )
        throw new Error(
          'OPENROUTER_API_KEY is required for OpenRouter provider',
        )
      }
      return {
        model: createOpenRouter({ apiKey: openrouterApiKey })(cliModel),
        modelId: cliModel,
        provider: 'openrouter',
        apiKeySource: 'cli',
      }
    }
  }

  // Auto-detect from environment variables
  if (openaiApiKey) {
    const defaultModel = cliModel || 'gpt-5-mini'
    return {
      model: createOpenAI({ apiKey: openaiApiKey })(defaultModel),
      provider: 'openai',
      modelId: defaultModel,
      apiKeySource: 'env',
    }
  }

  if (openrouterApiKey) {
    const defaultModel = cliModel || 'x-ai/grok-4.1-fast'

    return {
      model: createOpenRouter({ apiKey: openrouterApiKey })(defaultModel),
      provider: 'openrouter',
      modelId: defaultModel,
      apiKeySource: 'env',
    }
  }

  if (aiGatewayApiKey) {
    return {
      model: cliModel || 'openai/gpt-5-mini',
      provider: 'vercel',
      modelId: cliModel || 'openai/gpt-5-mini',
      apiKeySource: 'env',
    }
  }

  // No API keys found
  log(
    chalk.yellow(
      '\n⚠️  Neither OPENAI_API_KEY, OPENROUTER_API_KEY, nor AI_GATEWAY_API_KEY is set.\n',
    ),
  )
  log(chalk.grey('Please set one of the following to use this command:\n'))
  log(chalk.grey('  export OPENAI_API_KEY=your-api-key-here\n'))
  log(chalk.grey('  or\n'))
  log(chalk.grey('  export OPENROUTER_API_KEY=your-api-key-here\n'))
  log(chalk.grey('  or\n'))
  log(chalk.grey('  export AI_GATEWAY_API_KEY=your-gateway-key-here\n'))
  log(chalk.grey('\nOr use --model and --provider flags:\n'))
  log(chalk.grey('  --model "gpt-4o-mini" --provider openai\n'))
  log(chalk.grey('  --model "gpt-4o-mini" --provider openrouter\n'))
  log(chalk.grey('  --model "openai/gpt-4o-mini" --provider vercel\n'))

  throw new Error(
    'OPENAI_API_KEY, OPENROUTER_API_KEY, or AI_GATEWAY_API_KEY is required',
  )
}
