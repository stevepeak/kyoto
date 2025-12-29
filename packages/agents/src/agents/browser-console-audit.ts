import {
  createActTool,
  createExtractTool,
  createGotoTool,
  createObserveTool,
} from '@app/browserbase'
import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import { dedent } from 'ts-dedent'
import { z } from 'zod'

import { type AnalyzeBrowserAgentOptions } from './browser-agent.types'

export const browserConsoleAuditOutputSchema = z.object({
  checks: z.array(
    z.object({
      category: z.literal('console'),
      check: z.string(), // e.g., "No sensitive data in console logs"
      status: z.enum(['pass', 'fail', 'warning', 'na']),
      details: z.string(),
      recommendation: z.string(),
    }),
  ),
})

export type BrowserConsoleAuditOutput = z.infer<
  typeof browserConsoleAuditOutputSchema
>

const SYSTEM_PROMPT = dedent`
  You are a security engineer performing console log security audit of a web application.
  Your goal is to verify that sensitive data is not being logged to the browser console.

  # Tools Available
  - **goto**: Navigate to a specific URL
  - **act**: Perform actions on the page (click, type, scroll, etc.)
  - **extract**: Extract structured data from the page
  - **observe**: Discover actionable elements on the page

  # Console Log Security Checks
  - Check browser console for sensitive data being logged
  - Look for API keys, tokens, passwords, or credentials in console output
  - Check for Personally Identifiable Information (PII) in console logs
  - Verify error messages don't leak sensitive information
  - Check for debug information that exposes internal application structure

  # Sensitive Data Patterns to Look For
  - API keys or tokens in console.log, console.error, console.warn
  - Passwords or authentication credentials
  - PII: email addresses, user IDs, personal information
  - Stack traces or error messages that reveal internal paths or structure
  - Database connection strings or configuration details

  # Important Instructions
  - Monitor the browser console while interacting with the application
  - Check console logs, errors, and warnings for sensitive data
  - Look for patterns like "api_key", "token", "password", "secret" in console output
  - Test various user actions (login, form submission, errors) to see what gets logged
  - Report any sensitive data found in console logs
  - Report all findings in the output schema
`

/**
 * Browser console security audit agent that validates that sensitive data
 * is not being logged to the browser console.
 */
export async function runBrowserConsoleAudit(
  options: AnalyzeBrowserAgentOptions,
): Promise<BrowserConsoleAuditOutput> {
  const {
    instructions,
    browserContext,
    model,
    maxSteps = 30,
    telemetryTracer,
    onProgress,
  } = options

  const tools = {
    goto: createGotoTool(browserContext),
    act: createActTool(browserContext),
    extract: createExtractTool(browserContext),
    observe: createObserveTool(browserContext),
  }

  const agent = new Agent({
    model,
    system: SYSTEM_PROMPT,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'browser-console-audit',
      tracer: telemetryTracer,
    },
    tools,
    stopWhen: stepCountIs(maxSteps),
    onStepFinish: (step) => {
      if (step.reasoningText && step.reasoningText !== '[REDACTED]') {
        onProgress?.(step.reasoningText)
      }
    },
    experimental_output: Output.object({
      schema: browserConsoleAuditOutputSchema,
    }),
  })

  const prompt = dedent`
    Perform console log security audit for the website at the following URL:

    ${instructions}

    Monitor browser console for:
    - Sensitive data in console logs (API keys, tokens, passwords)
    - PII in console output
    - Error messages that leak sensitive information
    - Debug information exposing internal structure

    Return the results in the structured format.
  `

  const result = await agent.generate({ prompt })

  return browserConsoleAuditOutputSchema.parse(result.experimental_output)
}
