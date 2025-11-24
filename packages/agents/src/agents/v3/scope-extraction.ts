import { dedent } from 'ts-dedent'
import { generateText } from '../../helpers/generate-text'

interface ExtractScopeOptions {
  changelog: string
  options?: {
    maxScopeCount?: number
  }
}

/**
 * Extract scope items from a changelog summary
 * Focuses on user-facing changes informed by technical changes
 * Returns a concise list of scope items (one per line)
 */
export async function extractScope({
  changelog,
  options,
}: ExtractScopeOptions): Promise<string[]> {
  const maxScopeCount = options?.maxScopeCount ?? 10

  const systemPrompt = dedent`
    You are an expert product analyst tasked with extracting concise scope items from a changelog that represent user-facing changes.

    # Your Task
    Analyze the provided changelog and extract a concise list of scope items. Each scope item should represent a distinct user-facing change or feature that would impact user stories.

    # Focus Priority
    1. **User-Facing Functionalities**: Prioritize changes that directly impact end users
       - New features visible to users
       - UI/UX improvements
       - User workflow changes
       - Customer-facing API changes

    2. **Functionality**: Include internal functionality changes that may affect user stories
       - New internal features
       - Feature enhancements
       - Business logic changes

    3. **Technical Changes**: Use technical changes to inform and understand user-facing features
       - Technical changes should help you understand the context of user-facing changes
       - Only extract technical changes as scope if they directly enable or impact user-facing functionality
       - Don't extract pure refactoring, dependency updates, or infrastructure changes as separate scope items

    # Output Format
    Return a simple list of scope items, one per line. Each scope item should be:
    - Concise (1-2 sentences max)
    - Focused on what changed from a user or product perspective
    - Specific enough to be actionable
    - Distinct from other scope items

    Example format:
    - Added user authentication with OAuth support
    - Improved dashboard loading performance
    - Enhanced payment processing with retry logic

    If no user-facing changes are found, return an empty response.
    
    Limit your output to ${maxScopeCount} scope items maximum. Focus on the most important and distinct user-facing changes.
  `

  const userPrompt = dedent`
    Extract scope items from this changelog:

    ${changelog}

    Return a concise list of scope items, one per line, focusing on user-facing changes.
  `

  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

  const text = await generateText({
    prompt: fullPrompt,
    modelId: 'gpt-4o-mini',
  })

  // Parse the text output to extract scope items
  // Split by newlines and filter out empty lines and markdown list markers
  const scopeItems = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      // Remove empty lines
      if (!line) {
        return false
      }
      // Remove markdown list markers (-, *, •)
      const cleaned = line.replace(/^[*•-]\s+/, '').trim()
      // Remove numbered list markers (1., 2., etc.)
      const cleaned2 = cleaned.replace(/^\d+\.\s+/, '').trim()
      return cleaned2.length > 0
    })
    .map((line) => {
      // Clean up any remaining list markers
      return line
        .replace(/^[*•-]\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .trim()
    })
    .filter((line) => line.length > 0)
    .slice(0, maxScopeCount) // Enforce maxScopeCount limit

  return scopeItems
}
