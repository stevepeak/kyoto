import { getConfig } from '@app/config'
import { validateCronMinimumInterval } from '@app/utils'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { TRPCError } from '@trpc/server'
import { generateText } from 'ai'
import { dedent } from 'ts-dedent'

/**
 * Generate a story title from instructions using AI
 */
export async function generateStoryTitle(
  instructions: string,
): Promise<string> {
  const config = getConfig()
  const openrouter = createOpenRouter({
    apiKey: config.OPENROUTER_API_KEY,
  })

  const result = await generateText({
    model: openrouter('openai/gpt-5-mini'),
    prompt: dedent`
      Generate a concise title for this test story based on the instructions below.
      
      Instructions:
      ${instructions}
      
      Rules:
      - Output ONLY the title, nothing else
      - Title must be less than 6 words
      - Make it descriptive and clear about what the story tests
      - Use title case
      - No quotes or punctuation marks
      
      Title:
    `,
  })

  const title = result.text.trim()

  // Ensure title is less than 6 words (truncate if needed)
  const words = title.split(/\s+/)
  if (words.length > 5) {
    return words.slice(0, 5).join(' ')
  }

  return title
}

/**
 * Parse natural language schedule text into a cron expression using AI
 */
export async function parseCron(text: string): Promise<string> {
  const config = getConfig()
  const openrouter = createOpenRouter({
    apiKey: config.OPENROUTER_API_KEY,
  })

  const result = await generateText({
    model: openrouter('openai/gpt-4o-mini'),
    prompt: dedent`
      Convert the following natural language schedule into a cron expression.
      
      Input: "${text}"
      
      Rules:
      - Output ONLY the cron expression, nothing else
      - Use standard 5-field cron format: minute hour day-of-month month day-of-week
      - If the input is ambiguous, make a reasonable interpretation
      - Examples:
        - "every hour" → "0 * * * *"
        - "every day at 5pm" → "0 17 * * *"
        - "every monday at 9am" → "0 9 * * 1"
        - "every 30 minutes" → "*/30 * * * *"
      
      Output the cron expression:
    `,
  })

  const cronSchedule = result.text.trim()

  // Basic validation: should have 5 space-separated parts
  const parts = cronSchedule.split(/\s+/)
  if (parts.length !== 5) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Failed to parse schedule. Please try a different phrasing.',
    })
  }

  // Validate minimum interval of 1 hour
  const validation = validateCronMinimumInterval(cronSchedule)
  if (!validation.isValid) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: validation.error ?? 'Invalid cron schedule',
    })
  }

  return cronSchedule
}
