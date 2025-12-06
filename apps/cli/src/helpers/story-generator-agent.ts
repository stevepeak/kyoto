import { z } from 'zod'
import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import type { LanguageModel } from 'ai'

import { readFile } from 'node:fs/promises'
import { resolve, isAbsolute } from 'node:path'
import { findGitRoot } from './find-kyoto-dir.js'
import {
  createLocalTerminalCommandTool,
  createLocalReadFileTool,
} from '@app/shell'

// ============================================================================
// Zod Schema
// ============================================================================

export const storySchema = z.object({
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

function buildStoryGeneratorInstructions(maxStories?: number): string {
  const limitInstruction = maxStories
    ? `\n# Story Limit\nGenerate at most ${maxStories} story/stories from this file. Focus on the most important user behaviors first.\n`
    : ''

  return `You are an expert QA engineer who writes **Gherkin-style user behavior stories**. ${limitInstruction}

**Turn code into clear user-facing behavior stories**, not technical descriptions.

# What You Produce

For each meaningful user-facing behavior, produce:

1. **Title** — one sentence describing the user outcome
2. **Gherkin Story** — GIVEN / WHEN / THEN (testable by QA without reviewing code)
3. **Dependencies** — brief notes:
   * Entry point (where user accesses the feature)
   * Exit point (what happens next / where user goes)
   * Prerequisites (user-visible requirements)
   * Side effects (user-visible changes)
4. **Acceptance Criteria** — testable, user-visible outcomes (REQUIRED - never leave empty)
5. **Code References** — \`filepath:lineStart:lineEnd\` for all files that contribute (REQUIRED - never leave empty)

Return stories as JSON.

# What Makes a Good User Story

A good user story meets these criteria:

1. **Business Value** — The story represents business logic that is valuable to the overall application.

2. **Implementation-Agnostic** — The story does not concern underlying implementation details. It should be written so that code changes, improvements, or refactors would not adjust the user behavior (unless explicitly changed by the code). For example, how/where data is stored in a database is not relevant to the user seeing the information they desire.

3. **Simple, Testable, and Valuable** — The story is simple, testable, and provides clear value.

# Granularity Guidelines

Stories must be at the **right level of granularity** - high enough to be implementation-agnostic, but specific enough to provide clear user-facing value.

## ✅ Good Examples (Right Granularity)

- "User can sign in with GitHub" - Focuses on user outcome, not implementation
- "User receives email confirmation after registration" - User-visible result
- "User can create a new team" - Clear capability, not tied to specific API calls
- "User sees error message when login fails" - User-visible feedback

## ❌ Bad Examples (Too Granular - Implementation Details)

- "Button accepts children prop to customize label" - This is about component API, not user behavior
- "Component calls signIn.social() method" - Implementation detail, user doesn't care about method names
- "User clicks button that triggers POST /api/teams" - Too technical, mentions API endpoints
- "Form validates email using regex pattern" - Implementation detail, user only sees validation result

## ❌ Bad Examples (Too Vague - Not Actionable)

- "User interacts with authentication" - Too abstract, what specifically happens?
- "Component renders correctly" - Not a user behavior, too vague
- "User experiences the application" - No specific outcome

## ❌ Bad Examples (UI Rendering - Skip These)

- "Page presents a welcome message and kanji label" - This is about static content rendering, not user behavior
- "User sees a button with GitHub icon" - Describes UI appearance, not a meaningful action
- "Component displays text and links" - Static content display is not a user behavior story

**Before writing a story, ask yourself:**
- "Would a user notice or care about this behavior?"
- "Is this describing what the user experiences, or how the code works?"

If it's about implementation details or static content rendering, skip it.

# How to Work

### Step 1 — Determine if the file has distinct user-facing behaviors

Evaluate if the target file, on its own, contains distinct aspects that inform user behavior. Look for:
* User actions (clicking buttons, submitting forms, navigating)
* User-visible results (messages, UI changes, displayed data)

If the file only contains internal logic (helpers, utilities, schemas, state management), skip file discovery.

### Step 2 — Write a user story for each unique behavior

For each unique user-facing behavior discovered, write a complete user story. Each story should focus on one outcome.

**Critical**: Every story MUST include:
- At least 3 acceptance criteria (user-visible, testable outcomes)
- At least 1 code reference (the file being analyzed, plus any related files)

### Step 3 — Research and enrich with external context

Use the provided tools to research related files and code paths. Include any external referenced files that contribute to the story, ensuring you capture entry points, exit points, prerequisites, and side effects.

# ❌ Exclude

Skip stories about:
* Static UI rendering (just displaying content, not user actions)
* Component APIs, method names, or implementation details
* Internal logic invisible to users

Focus on what users experience, not how the code works.

`
}

export interface GenerateStoriesOptions {
  model: LanguageModel
  filePath: string
  maxStories?: number
  onProgress?: (message: string) => void
}

export async function generateStories(
  options: GenerateStoriesOptions,
): Promise<StoriesOutput> {
  const { model, filePath, maxStories, onProgress } = options

  const agent = new Agent({
    model,
    system: buildStoryGeneratorInstructions(maxStories),
    tools: {
      terminalCommand: createLocalTerminalCommandTool(onProgress),
      readFile: createLocalReadFileTool(onProgress),
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'behavior-story-generator',
      metadata: {
        filePath,
      },
    },
    stopWhen: stepCountIs(50),
    onStepFinish: (step) => {
      if (step.reasoningText) {
        onProgress?.(step.reasoningText)
      }
    },
    experimental_output: Output.object({
      schema: storiesOutputSchema,
    }),
  })

  // Resolve file path relative to git root
  const gitRoot = await findGitRoot()
  const resolvedFilePath = isAbsolute(filePath)
    ? filePath
    : resolve(gitRoot, filePath)
  const fileContent = await readFile(resolvedFilePath, 'utf-8')
  const limitPrompt = maxStories
    ? `\n\nGenerate at most ${maxStories} story/stories from this file. Focus on the most important user behaviors first.`
    : ''
  const prompt = `Analyze this code file and generate enriched user behavior stories.

Target File: ${filePath}

File Content:
${fileContent}
${limitPrompt}

Workflow:
1. First, navigate the codebase to understand context (imports, related files, parent components)
2. Then, discover user behaviors in THIS FILE (focal point)
3. Finally, navigate the codebase to enrich each behavior with specific details (entry points, exit points, prerequisites, side effects)

Remember: The target file is the focal point. Use navigation to enrich, not to discover new behaviors elsewhere.`

  try {
    const result = await agent.generate({ prompt })

    // If we got structured output, return it (potentially limited)
    if (result.experimental_output) {
      const output = result.experimental_output
      // Limit the number of stories if maxStories is specified
      if (maxStories && output.stories.length > maxStories) {
        return {
          stories: output.stories.slice(0, maxStories),
        }
      }
      return output
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
