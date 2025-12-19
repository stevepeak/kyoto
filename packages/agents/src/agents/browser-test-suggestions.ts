import { dedent } from 'ts-dedent'
import { z } from 'zod'

import { createAnalyzeAgent, toolsAvailableSection } from '../factory'

export const browserTestSuggestionsOutputSchema = z.object({
  tests: z.array(
    z.object({
      id: z
        .string()
        .describe(
          'A unique identifier for this test (e.g., "auth-login-flow")',
        ),
      description: z
        .string()
        .describe(
          'A concise description of what to test (e.g., "Verify user can log in with valid credentials")',
        ),
      category: z
        .string()
        .optional()
        .describe(
          'Optional category like "authentication", "navigation", "forms", etc.',
        ),
      steps: z
        .array(z.string())
        .describe(
          'Ordered list of steps to perform in the browser to test this behavior',
        ),
    }),
  ),
})

export type BrowserTestSuggestion = z.infer<
  typeof browserTestSuggestionsOutputSchema
>['tests'][number]

/**
 * Analyzes code changes and suggests specific browser tests to run.
 * Returns actionable test cases with steps that can be executed in a browser.
 */
export const analyzeBrowserTestSuggestions = createAnalyzeAgent({
  functionId: 'browser-test-suggestions',
  schema: browserTestSuggestionsOutputSchema,
  defaultMaxSteps: 30,
  buildSystemPrompt: () => dedent`
    You are a QA engineer who analyzes code changes and suggests specific browser tests.
    Your goal is to identify user-facing behaviors that should be tested in a browser and provide
    actionable test cases with clear steps.

    # Your Task
    1. Analyze the code changes to understand what user-facing features or behaviors changed
    2. Read relevant files if needed to understand the full context
    3. Identify specific browser tests that should be run
    4. For each test, provide clear steps that can be executed in a browser
    5. Return structured JSON following the provided schema

    ${toolsAvailableSection({ includeTerminal: true })}

    # What to Focus On

    Focus on user-facing behaviors that can be tested in a browser:

    ## Types of Tests to Suggest
    - UI component interactions (clicks, forms, modals)
    - Navigation flows between pages
    - Data entry and validation
    - Visual feedback and state changes
    - Error handling from user perspective
    
    # What NOT to Include
    
    DO NOT suggest:
    - Authentication and authorization flows
    - Responsive behavior changes
    - Unit tests or code-level testing
    - API endpoint testing (unless via UI)
    - Database testing
    - Backend-only changes with no UI impact
    - Tests for unchanged functionality

    # Output Format

    For each test provide:
    - **id**: A unique kebab-case identifier (e.g., "login-with-email")
    - **description**: What the test verifies (1-2 sentences)
    - **category**: Optional grouping (e.g., "auth", "forms", "navigation")
    - **steps**: Ordered list of browser actions to perform

    Keep the list focused - suggest only the most important tests for the changes.
    Aim for 3-7 tests unless the changes are very broad.
  `,
  buildPrompt: ({ scopeDescription, scopeContent }) => dedent`
    Analyze the ${scopeDescription} and suggest browser tests to run.

    Code changes:
    ${scopeContent}

    Based on these changes, identify what user-facing behaviors need to be tested in a browser.
    For each test:
    1. Create a unique id (kebab-case)
    2. Write a clear description of what to verify
    3. List the specific steps to perform in the browser

    Focus on the most important tests for these specific changes.
    Return a concise list of browser tests as JSON matching the schema.
  `,
})
