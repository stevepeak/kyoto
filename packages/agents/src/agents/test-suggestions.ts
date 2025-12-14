import { dedent } from 'ts-dedent'
import { z } from 'zod'

import { createAnalyzeAgent, toolsAvailableSection } from '../factory'

export const testSuggestionsOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      description: z
        .string()
        .describe(
          'A concise user flow description (e.g., "User creates account and receives confirmation email")',
        ),
      category: z
        .string()
        .optional()
        .describe(
          'Optional category like "authentication", "data-entry", "navigation", etc.',
        ),
    }),
  ),
})

/**
 * Ask an AI agent to analyze code changes and suggest what should be tested.
 * The agent examines the scope and recommends specific test cases.
 */
export const analyzeTestSuggestions = createAnalyzeAgent({
  functionId: 'test-suggestions',
  schema: testSuggestionsOutputSchema,
  defaultMaxSteps: 30,
  buildSystemPrompt: ({ hasGitHub }) => dedent`
    You are a product-focused QA engineer who analyzes code changes and suggests high-level user flows that need testing.
    Your goal is to identify user-facing behaviors and flows that should be manually tested based on the code changes.

    # Your Task
    1. Analyze the pre-loaded code changes to understand what user-facing features or behaviors changed
    2. Read the relevant files if needed to understand the full context
    3. Identify the high-level user flows affected by these changes
    4. Suggest concise user flow descriptions that a human tester would follow
    5. Return structured JSON following the provided schema

    ${toolsAvailableSection({ hasGitHub, includeTerminal: true })}

    # What to Focus On

    Focus ONLY on high-level user-facing behaviors and flows. Think about what a real user would do with the application.

    ## User Flows to Identify
    - New user-facing features or capabilities
    - Changed user workflows or processes
    - Modified UI interactions or screens
    - Updated user journeys through the application
    - Changed user permissions or access patterns
    - Modified data entry or submission flows
    - Updated navigation or routing behaviors

    # What NOT to Include

    DO NOT suggest:
    - Unit tests or code-level testing
    - Functional test cases for individual functions
    - Edge cases in code (null checks, empty arrays, etc.)
    - Error handling at the code level
    - Technical implementation details
    - API endpoint testing (unless it's a user-facing API)
    - Database query testing
    - Code refactoring verification

    # Important Instructions
    - Focus on **user flows** - what a person using the application would actually do
    - Each suggestion should describe a complete user journey or behavior (e.g., "User logs in and navigates to dashboard", "User creates a new project and adds team members")
    - Be concise - one line per user flow
    - Think from the user's perspective, not the developer's
    - Only suggest flows that are directly affected by the code changes
    - For each suggestion:
      - **description**: A concise user flow description (e.g., "User creates account and receives confirmation email", "User uploads file and views preview")
      - **category**: Optional high-level category (e.g., "authentication", "data-entry", "navigation", "settings", "onboarding")
    - Keep the list concise - focus on the most important user flows affected by the changes
  `,
  buildPrompt: ({ scopeDescription, scopeContent }) => dedent`
    Analyze the ${scopeDescription} and identify high-level user flows that need testing.

    Code changes:
    ${scopeContent}

    Analyze the code changes above. If needed, use the readFile tool to read full files for context.
    Understand what user-facing features or behaviors were modified, added, or removed.

    Focus on identifying user flows - what a real person using the application would do:
    - What new user-facing features were added?
    - What existing user workflows were changed?
    - What user interactions or screens were modified?
    - What user journeys through the app were affected?

    For each user flow, provide:
    - A concise description of the user flow (e.g., "User creates account and receives confirmation email")
    - An optional category to help organize the flows

    Remember: Focus on user-facing behaviors, not code-level testing. Think about what a human tester would actually do with the application.

    Return a concise list of user flows as JSON matching the schema.
  `,
})
