import { z } from 'zod'
import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import type { LanguageModel } from 'ai'

import { readFile } from 'node:fs/promises'

// ============================================================================
// Zod Schema
// ============================================================================

const storySchema = z.object({
  title: z.string(),
  behavior: z.string(),
  dependencies: z
    .object({
      entry: z.string().nullable(),
      exit: z.string().nullable(),
      prerequisites: z.array(z.string()).default([]),
      sideEffects: z.array(z.string()).default([]),
    })
    .nullable()
    .default(null),
  acceptanceCriteria: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  codeReferences: z
    .array(
      z.object({
        file: z.string(),
        lines: z.string(),
        description: z.string(),
      }),
    )
    .default([]),
})

export type Story = z.infer<typeof storySchema>

const storiesOutputSchema = z.object({
  stories: z.array(storySchema),
})

type StoriesOutput = z.infer<typeof storiesOutputSchema>

// Helper to normalize story data (fix common model response issues)
function normalizeStoryData(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(normalizeStoryData)
  }

  const obj = data as Record<string, unknown>
  const normalized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    // Convert null arrays to empty arrays
    if (
      (key === 'acceptanceCriteria' ||
        key === 'assumptions' ||
        key === 'codeReferences' ||
        key === 'prerequisites' ||
        key === 'sideEffects') &&
      value === null
    ) {
      normalized[key] = []
    } else if (key === 'dependencies' && value === null) {
      normalized[key] = null
    } else if (
      key === 'dependencies' &&
      typeof value === 'object' &&
      value !== null
    ) {
      // Normalize nested dependencies object
      const deps = value as Record<string, unknown>
      normalized[key] = {
        entry: deps.entry ?? null,
        exit: deps.exit ?? null,
        prerequisites:
          deps.prerequisites === null ? [] : (deps.prerequisites ?? []),
        sideEffects: deps.sideEffects === null ? [] : (deps.sideEffects ?? []),
      }
    } else {
      normalized[key] = normalizeStoryData(value)
    }
  }

  return normalized
}

// ============================================================================
// Story Generation Agent
// ============================================================================

function buildStoryGeneratorInstructions(): string {
  return `You are an expert code analyst tasked with generating Gherkin-style user behavior stories from code files.

# Objective
Analyze the provided code file and generate one or more user behavior stories. Each story should:
- Focus on a SINGLE user behavior outcome
- Use Gherkin syntax (WHEN/THEN/GIVEN)
- Include specific code references with line numbers
- Identify dependencies (entry/exit points, prerequisites, side effects)
- List acceptance criteria with evidence
- Note assumptions and TODOs where context is incomplete

# Story Structure
Each story should have:
1. **Title**: Clear, descriptive title
2. **Behavior**: Gherkin-style steps (WHEN/THEN/GIVEN) with code references
3. **Dependencies**: 
   - Entry: How user arrives here (use TODO if unknown)
   - Exit: Where user goes next (use TODO if unknown)
   - Prerequisites: Required state/data
   - Side Effects: What changes as a result
4. **Acceptance Criteria**: Testable criteria with evidence
5. **Assumptions**: Known assumptions and TODOs for verification

# Code References Format
Use format: \`filepath:startLine:endLine\` or \`filepath:line\` for single lines.
Include function/component names when relevant.

# Instructions
1. Read the target file to understand the code
2. Identify all user interaction points
3. Generate stories with singular behavior outcomes
4. Track dependencies by following navigation, redirects, and API calls
5. Be explicit about TODOs where you cannot determine dependencies

# Output Format
Return a JSON object with an array of stories. Each story should be complete and self-contained.`
}

export interface GenerateStoriesOptions {
  model: LanguageModel
  filePath: string
  onProgress?: (message: string) => void
}

export async function generateStories(
  options: GenerateStoriesOptions,
): Promise<StoriesOutput> {
  const { model, filePath, onProgress } = options

  const agent = new Agent({
    model,
    system: buildStoryGeneratorInstructions(),
    // tools: {
    //   terminalCommand: createLocalTerminalCommandTool(onProgress),
    //   readFile: createLocalReadFileTool(onProgress),
    // },
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'behavior-story-generator',
      metadata: {
        filePath,
      },
    },
    stopWhen: stepCountIs(30),
    onStepFinish: (step) => {
      if (step.reasoningText) {
        onProgress?.(step.reasoningText)
      }
    },
    experimental_output: Output.object({
      schema: storiesOutputSchema,
    }),
  })

  const fileContent = await readFile(filePath, 'utf-8')
  const prompt = fileContent

  try {
    const result = await agent.generate({ prompt })

    // If we got structured output, return it
    if (result.experimental_output) {
      return result.experimental_output
    }

    // Debug: Log if experimental_output is missing
    onProgress?.('⚠️  No structured output received from model')

    // Try to get the raw text response for debugging and recovery
    const rawText = result.text
    if (rawText) {
      onProgress?.('Attempting to parse raw response...')

      // Try to parse as JSON manually
      try {
        let parsed = JSON.parse(rawText)
        onProgress?.('✅ Successfully parsed JSON')

        // Normalize the data to fix common issues
        parsed = normalizeStoryData(parsed)

        // Try to validate against schema
        const validationResult = storiesOutputSchema.safeParse(parsed)
        if (validationResult.success) {
          onProgress?.('✅ Schema validation passed after normalization')
          return validationResult.data
        }

        // Log validation errors
        onProgress?.('❌ Schema validation errors after normalization:')
        validationResult.error.issues.forEach((err) => {
          onProgress?.(`  - ${err.path.join('.') || 'root'}: ${err.message}`)
        })

        // Log a sample of the parsed data for debugging
        onProgress?.(
          `Sample parsed data: ${JSON.stringify(parsed, null, 2).slice(0, 500)}`,
        )
      } catch (parseError) {
        onProgress?.(
          `❌ Failed to parse as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        )
        onProgress?.(
          `Raw response (first 1000 chars): ${rawText.slice(0, 1000)}`,
        )
      }
    } else {
      onProgress?.('❌ No text response available')
    }

    throw new Error('No object generated: response did not match schema')
  } catch (error) {
    // Enhanced error logging
    if (error instanceof Error) {
      if (error.message.includes('did not match schema')) {
        onProgress?.('❌ Schema validation failed')
        onProgress?.(
          'This usually means the model returned data in an unexpected format.',
        )
        onProgress?.('Common issues:')
        onProgress?.('  - Missing required fields')
        onProgress?.('  - Wrong data types (e.g., number instead of string)')
        onProgress?.('  - Null values where arrays are expected')
        onProgress?.('  - Extra fields not in schema')
        onProgress?.('')
        onProgress?.('Try:')
        onProgress?.('  - Using a different model')
        onProgress?.('  - Simplifying the code file being analyzed')
        onProgress?.('  - Checking the model response format')
      }
    }
    throw error
  }
}
