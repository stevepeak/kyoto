import { tool } from 'ai'
import chalk from 'chalk'
import { type Ora } from 'ora'
import { z } from 'zod'

import { writeLocalFile } from './write-file-tool'

const updateStoryInputSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(4_096)
    .describe(
      'Relative path to the story JSON file (e.g., ".kyoto/story-name.json").',
    ),
  story: z.any().describe('The updated story object with enriched details.'),
})

export function createLocalUpdateStoryTool(
  storySchema: z.ZodSchema,
  ora?: Ora,
) {
  return tool({
    name: 'updateStory',
    description:
      'Update a story JSON file with enriched details. Validates the story structure before writing.',
    inputSchema: updateStoryInputSchema,
    execute: async (input) => {
      // Validate the story against the schema
      const validationResult = storySchema.safeParse(input.story)

      if (!validationResult.success) {
        const errors = validationResult.error.issues
          .map((issue) => {
            const path = issue.path.join('.') || 'root'
            return `  - ${path}: ${issue.message}`
          })
          .join('\n')

        throw new Error(
          `Story validation failed:\n${errors}\n\nPlease ensure all required fields are present and correctly formatted.`,
        )
      }

      // Update ora to show file being updated
      if (ora) {
        ora.text = chalk.hex('#f1dab4')(`Updating: ${input.path}`)
      }

      // Write the validated story as JSON
      const json = JSON.stringify(validationResult.data, null, 2)
      await writeLocalFile(input.path, json)

      // Reset ora text after writing
      if (ora) {
        ora.text = ''
      }

      return `Successfully updated story file: ${input.path}`
    },
  })
}
