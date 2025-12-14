export type Provider = 'openai' | 'vercel' | 'openrouter' | 'anthropic'

export function getProviderLabel(
  provider: Provider | null | undefined,
): string {
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

export const PROVIDER_ITEMS = [
  { label: 'OpenAI', value: 'openai' as const },
  { label: 'Vercel AI Gateway', value: 'vercel' as const },
  { label: 'OpenRouter', value: 'openrouter' as const },
  { label: 'Anthropic', value: 'anthropic' as const },
  // TODO add google gemini
]
