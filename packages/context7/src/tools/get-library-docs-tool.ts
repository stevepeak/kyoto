import { logger } from '@trigger.dev/sdk'
import { tool } from 'ai'
import { z } from 'zod'
import { getConfig } from '@app/config'

const getLibraryDocsInputSchema = z.object({
  libraryId: z
    .string()
    .min(1)
    .max(256)
    .describe(
      'Context7-compatible library ID (e.g., "/vercel/next.js", "/mongodb/docs")',
    ),
  topic: z
    .string()
    .min(1)
    .max(256)
    .describe(
      'Optional topic to focus documentation on (e.g., "hooks", "routing")',
    )
    .optional(),
  tokens: z
    .number()
    .int()
    .min(1000)
    .max(50_000)
    .default(5000)
    .describe('Maximum number of tokens to retrieve (default: 5000)')
    .optional(),
})

const CONTEXT7_API_BASE = 'https://api.context7.com'

export function createGetLibraryDocsTool() {
  return tool({
    name: 'getLibraryDocs',
    description:
      'Fetch up-to-date documentation for a library using its Context7 library ID. Use resolveLibrary first if you only have the library name.',
    inputSchema: getLibraryDocsInputSchema,
    execute: async (input) => {
      try {
        const env = getConfig()
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }

        if (env.CONTEXT7_API_KEY) {
          headers['Authorization'] = `Bearer ${env.CONTEXT7_API_KEY}`
        }

        const params = new URLSearchParams({
          libraryId: input.libraryId,
        })

        if (input.topic) {
          params.append('topic', input.topic)
        }

        if (input.tokens) {
          params.append('tokens', input.tokens.toString())
        }

        const response = await fetch(
          `${CONTEXT7_API_BASE}/docs?${params.toString()}`,
          {
            method: 'GET',
            headers,
          },
        )

        if (!response.ok) {
          const errorText = await response.text()
          logger.error(`📚 Failed to get docs for: ${input.libraryId}`, {
            status: response.status,
            error: errorText,
          })
          return `Failed to get library docs: ${response.status} ${errorText}`
        }

        const responseSchema = z.object({
          libraryId: z.string(),
          documentation: z.string(),
          topic: z.string().optional(),
          tokensUsed: z.number().optional(),
        })

        const result = responseSchema.parse(await response.json())

        logger.info(`📚 Retrieved docs for: ${input.libraryId}`, {
          topic: input.topic,
          tokensUsed: result.tokensUsed,
        })

        return result.documentation
      } catch (error) {
        logger.error(`📚 Error getting docs for: ${input.libraryId}`, { error })
        throw error
      }
    },
  })
}

