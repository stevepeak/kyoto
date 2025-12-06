import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import type { LanguageModel } from 'ai'
import { z } from 'zod'
import { createLocalReadFileTool } from '@app/shell'
import type { StoryFile } from './story-file-reader.js'

// ============================================================================
// Zod Schema
// ============================================================================

const hierarchyOutputSchema = z.object({
  hierarchy: z.array(
    z.object({
      path: z
        .string()
        .describe(
          'Directory path relative to .kyoto/stories (e.g., "users/preference" or "auth")',
        ),
      description: z
        .string()
        .describe('Brief description of what stories belong in this directory'),
    }),
  ),
  reasoning: z
    .string()
    .describe('Explanation of the hierarchy structure and organization logic'),
})

export type HierarchyOutput = z.infer<typeof hierarchyOutputSchema>

// ============================================================================
// Hierarchy Generation Agent
// ============================================================================

function buildHierarchyInstructions(): string {
  return `You are an expert at organizing and categorizing user behavior stories.

# Objective
Review all the provided story files and create a logical directory hierarchy for organizing them. The hierarchy should group related stories together based on their titles and behaviors.

# Guidelines
1. Create a hierarchical folder structure that makes sense for the stories
2. Use descriptive, lowercase folder names (e.g., "users", "auth", "api", "errors")
3. Keep the hierarchy shallow (2-3 levels max) unless necessary
4. Group stories by:
   - Domain/feature area (e.g., authentication, user management)
   - User journey (e.g., signup, login, dashboard)
   - Technical area (e.g., api, errors, loading)
5. Each directory should have a clear purpose and description

# Output Format
Return a JSON object with:
- hierarchy: Array of directory objects with path and description
- reasoning: Explanation of why this structure makes sense

# Example
If you have stories about:
- "Client sends POST request to authentication endpoint"
- "User views the signin component"
- "User navigates to dashboard"

You might create:
- auth/ (for authentication-related stories)
- users/ (for user-related stories)
- navigation/ (for navigation-related stories)`
}

interface GenerateHierarchyOptions {
  model: LanguageModel
  storyFiles: StoryFile[]
  onProgress?: (message: string) => void
}

export async function generateHierarchy(
  options: GenerateHierarchyOptions,
): Promise<HierarchyOutput> {
  const { model, storyFiles, onProgress } = options

  const agent = new Agent({
    model,
    system: buildHierarchyInstructions(),
    tools: {
      readFile: createLocalReadFileTool(),
    } as any,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'story-hierarchy-generator',
      metadata: {
        storyCount: storyFiles.length,
      },
    },
    stopWhen: stepCountIs(30),
    onStepFinish: (step) => {
      if (step.reasoningText) {
        onProgress?.(step.reasoningText)
      }
    },
    experimental_output: Output.object({
      schema: hierarchyOutputSchema,
    }),
  })

  // Create a summary of all stories for the agent
  const storiesSummary = storyFiles
    .map((file) => ({
      filename: file.filename,
      title: file.story.title,
      behavior: file.story.behavior,
    }))
    .map(
      (s) =>
        `File: ${s.filename}\nTitle: ${s.title}\nBehavior: ${s.behavior}\n`,
    )
    .join('\n---\n\n')

  const prompt = `Review all these stories and create a logical directory hierarchy for organizing them:

${storiesSummary}

You can read individual story files if you need more details. Create a hierarchy that groups related stories together.`

  try {
    const result = await agent.generate({ prompt })

    // If we got structured output, return it
    if (result.experimental_output) {
      return result.experimental_output
    }

    // Try to parse raw text response
    const rawText = result.text
    if (rawText) {
      onProgress?.('Attempting to parse raw response...')

      try {
        const parsed = JSON.parse(rawText)
        const validationResult = hierarchyOutputSchema.safeParse(parsed)
        if (validationResult.success) {
          onProgress?.('✅ Schema validation passed')
          return validationResult.data
        }

        onProgress?.('❌ Schema validation errors:')
        validationResult.error.issues.forEach((err) => {
          onProgress?.(`  - ${err.path.join('.') || 'root'}: ${err.message}`)
        })
      } catch (parseError) {
        onProgress?.(
          `❌ Failed to parse as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        )
      }
    }

    throw new Error('No hierarchy generated: response did not match schema')
  } catch (error) {
    if (error instanceof Error) {
      onProgress?.(`❌ Error: ${error.message}`)
    }
    throw error
  }
}
