import { type VibeCheckContext } from '@app/types'
import { pluralize } from '@app/utils'

import {
  analyzeBrowserTestSuggestions,
  type BrowserTestSuggestion,
} from './agents/browser-test-suggestions'

type BrowserTestAgent = {
  resetContext: (args: {
    changedFiles: string[]
    testPlan: { description: string; steps: string[] }[]
  }) => void
  run: (prompt: string) => Promise<{ response: string }>
  close: () => Promise<void>
}

type PerformBrowserTestsOptions = {
  agent: BrowserTestAgent
  context: VibeCheckContext
  parsedChanges: { file: string; lines: string }[]
  progress?: (message: string) => void
}

export type BrowserTestResult = {
  passed: boolean
  response: string
}

export type PerformBrowserTestsResult = {
  status: 'pass' | 'warn' | 'fail' | 'info'
  summary: string
  tests: BrowserTestSuggestion[]
  results: BrowserTestResult[]
}

/**
 * Performs browser tests by analyzing suggestions and executing them.
 *
 * This function:
 * 1. Analyzes code changes to suggest browser tests
 * 2. Resets the agent context with the test plan
 * 3. Executes each suggested test
 * 4. Calculates summary and status
 *
 * @returns Test execution results with status, summary, tests, and individual test results
 */
export async function performBrowserTests(
  options: PerformBrowserTestsOptions,
): Promise<PerformBrowserTestsResult> {
  const { agent, context, parsedChanges, progress } = options

  // Analyze test suggestions
  const analysisResult = await analyzeBrowserTestSuggestions({
    context,
    options: {
      progress:
        progress ||
        (() => {
          // Progress is logged internally
        }),
    },
  })

  if (analysisResult.tests.length === 0) {
    return {
      status: 'info',
      summary: 'No tests suggested for these changes.',
      tests: [],
      results: [],
    }
  }

  // Execute all suggested tests
  const testResults: BrowserTestResult[] = []

  // Reset agent context with test plan
  agent.resetContext({
    changedFiles: parsedChanges.map((c) => c.file),
    testPlan: analysisResult.tests.map((t) => ({
      description: t.description,
      steps: t.steps,
    })),
  })

  // Run each test
  for (const test of analysisResult.tests) {
    try {
      const prompt = `Test the following behavior:\n\n**${test.description}**\n\nSteps:\n${test.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nPerform these steps and report whether the test passes or fails.`

      const result = await agent.run(prompt)
      const passed = result.response.toLowerCase().includes('pass')

      testResults.push({
        passed,
        response: result.response,
      })
    } catch (err) {
      testResults.push({
        passed: false,
        response: `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
      })
    }
  }

  // Calculate summary
  const passedCount = testResults.filter((r) => r.passed).length
  const failedCount = testResults.filter((r) => !r.passed).length
  const totalCount = testResults.length

  let status: 'pass' | 'warn' | 'fail' = 'pass'
  if (failedCount > 0) {
    status = 'fail'
  } else if (totalCount === 0) {
    status = 'warn'
  }

  const summary = `${passedCount}/${totalCount} ${pluralize(totalCount, 'test')} passed`

  return {
    status,
    summary,
    tests: analysisResult.tests,
    results: testResults,
  }
}
