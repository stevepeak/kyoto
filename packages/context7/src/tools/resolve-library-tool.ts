import { logger } from '@trigger.dev/sdk'
import { tool } from 'ai'
import { z } from 'zod'
import { getConfig } from '@app/config'

const resolveLibraryInputSchema = z.object({
  libraryName: z
    .string()
    .min(1)
    .max(256)
    .describe(
      'Name of the library to search for (e.g., "react", "next.js", "tailwindcss")',
    ),
})

const CONTEXT7_API_BASE = 'https://api.context7.com'

export function createResolveLibraryTool() {
  return tool({
    name: 'resolveLibrary',
    description:
      'Resolve a library name to a Context7-compatible library ID. Use this before getting documentation.',
    inputSchema: resolveLibraryInputSchema,
    execute: async (input) => {
      try {
        const env = getConfig()
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }

        if (env.CONTEXT7_API_KEY) {
          headers['Authorization'] = `Bearer ${env.CONTEXT7_API_KEY}`
        }

        const response = await fetch(
          `${CONTEXT7_API_BASE}/resolve?library=${encodeURIComponent(input.libraryName)}`,
          {
            method: 'GET',
            headers,
          },
        )

        if (!response.ok) {
          const errorText = await response.text()
          logger.error(`📚 Failed to resolve library: ${input.libraryName}`, {
            status: response.status,
            error: errorText,
          })
          return `Failed to resolve library: ${response.status} ${errorText}`
        }

        const responseSchema = z.object({
          libraryId: z.string(),
          name: z.string(),
          description: z.string().optional(),
          trustScore: z.number().optional(),
        })

        const result = responseSchema.parse(await response.json())

        logger.info(`📚 Resolved library: ${input.libraryName}`, {
          libraryId: result.libraryId,
        })

        return JSON.stringify(result, null, 2)
      } catch (error) {
        logger.error(`📚 Error resolving library: ${input.libraryName}`, {
          error,
        })
        throw error
      }
    },
  })
}

