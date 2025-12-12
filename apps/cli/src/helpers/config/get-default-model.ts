type AIProvider = 'openai' | 'vercel' | 'openrouter' | 'anthropic'

/**
 * Returns the default model for a given AI provider.
 */
export function getDefaultModelForProvider(provider: AIProvider): string {
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
