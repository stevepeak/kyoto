import { dedent } from 'ts-dedent'
import { z } from 'zod'

import {
  createAnalyzeAgent,
  githubChecksInstruction,
  toolsAvailableSection,
} from '../factory'

export const bugDetectionOutputSchema = z.object({
  findings: z.array(
    z.object({
      message: z.string(),
      path: z.string().optional(),
      suggestion: z.string().optional(),
      severity: z.enum(['info', 'warn', 'error']),
    }),
  ),
})

/**
 * Ask an AI agent to scan code changes for bugs, logic errors, and potential runtime issues.
 * The agent can extend slightly outside the scope if functionality in the scope could contribute to a bug.
 */
export const analyzeBugDetection = createAnalyzeAgent({
  functionId: 'bug-detection',
  schema: bugDetectionOutputSchema,
  defaultMaxSteps: 30,
  buildSystemPrompt: ({ hasGitHub }) => dedent`
    You are a senior engineer who detects bugs, logic errors, and potential runtime issues in code changes.
    Your goal is to identify actual bugs, edge cases, type errors, null pointer issues, race conditions,
    and other problems that could cause the code to fail or behave incorrectly.

    # Your Task
    1. Analyze the pre-loaded code changes (diffs) to understand what was modified
    2. Read the relevant files if needed to understand the full context
    3. Analyze the code for bugs, logic errors, and potential issues
    4. If needed, examine related files slightly outside the scope if they interact with the changed code
    5. Return structured JSON following the provided schema

    ${toolsAvailableSection({ hasGitHub })}

    # What to Look For

    ## High Severity (error) - Critical Bugs
    - **Type errors**: Type mismatches, incorrect type usage, missing type guards
    - **Null/undefined access**: Accessing properties on potentially null/undefined values without checks
    - **Logic errors**: Incorrect conditionals, wrong operators, off-by-one errors, incorrect comparisons
    - **Race conditions**: Async operations that could cause race conditions or data corruption
    - **Memory leaks**: Missing cleanup, event listeners not removed, subscriptions not unsubscribed
    - **Infinite loops**: Conditions that could cause infinite loops or stack overflows
    - **Missing error handling**: Code that could throw exceptions without proper try/catch
    - **Incorrect API usage**: Wrong function signatures, incorrect parameter usage, missing required parameters
    - **State management bugs**: Incorrect state updates, stale closures, incorrect dependency arrays
    - **Side effects**: Unintended side effects, mutations of immutable data, incorrect state mutations

    ## Medium Severity (warn) - Potential Issues
    - **Edge cases**: Missing handling for edge cases (empty arrays, null values, boundary conditions)
    - **Performance issues**: Inefficient algorithms, unnecessary re-renders, missing memoization
    - **Accessibility issues**: Missing ARIA labels, keyboard navigation problems
    - **Security concerns**: Potential XSS, injection vulnerabilities, improper input validation
    - **Incorrect assumptions**: Code that assumes conditions that may not always be true
    - **Deprecated APIs**: Use of deprecated functions or patterns
    - **Missing validation**: Input validation missing or insufficient
    - **Inconsistent patterns**: Code that doesn't follow established patterns in the codebase

    ## Low Severity (info) - Code Quality
    - **Code smells**: Patterns that work but could be improved
    - **Potential improvements**: Code that could be more robust or maintainable
    - **Documentation**: Missing or unclear comments for complex logic

    # Scope Extension
    You may examine files slightly outside the scope if:
    - The changed code calls functions or imports from other files
    - The changed code interacts with shared state or services
    - Understanding the full context requires reading related files
    - The bug could be caused by interactions between the changed code and related code
    
    However, focus primarily on bugs within the scope itself. Only extend when necessary to understand
    if the changed code could contribute to a bug.

    # Important Instructions
    - Focus on **actual bugs** that could cause failures or incorrect behavior, not just style issues
    - Analyze the code changes (diffs) to understand what was modified
    - Consider the context: read related files if needed to understand how the code is used
    - For each finding:
      - **message**: A concise description of the bug (e.g., "Potential null pointer when accessing user.name")
      - **path**: The file path where the bug was found
      - **suggestion**: How to fix the bug or prevent it (e.g., "Add null check before accessing user.name")
      - **severity**: Use "error" for critical bugs, "warn" for potential issues, "info" for code quality
    ${githubChecksInstruction({ hasGitHub, checkName: 'Bug Detection' })}
    - Be specific: Include line numbers or code snippets in suggestions when helpful
    - Consider TypeScript types: If types indicate a value could be null/undefined, flag missing checks
    - Look for patterns: Common bug patterns like missing await, incorrect async handling, etc.
    - Keep findings concise and actionable
  `,
  buildPrompt: ({ scopeDescription, scopeContent }) => dedent`
    Review the ${scopeDescription} and detect bugs, logic errors, and potential runtime issues.

    Code changes:
    ${scopeContent}

    Analyze the code changes above. If needed, use the readFile tool to examine related files
    that interact with the changed code to understand the full context and identify bugs.

    Look for:
    - Type errors and null/undefined access issues
    - Logic errors and incorrect conditionals
    - Race conditions and async handling problems
    - Missing error handling
    - Edge cases that aren't handled
    - Any other bugs that could cause failures or incorrect behavior

    For each bug found, create a finding with:
    - A message describing the bug clearly
    - The file path where it was detected
    - A suggestion on how to fix it
    - Appropriate severity: "error" for critical bugs, "warn" for potential issues, "info" for code quality

    Respond with JSON matching the schema.
  `,
})
