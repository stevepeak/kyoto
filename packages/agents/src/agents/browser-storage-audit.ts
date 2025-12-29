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

export const browserStorageAuditOutputSchema = z.object({
  checks: z.array(
    z.object({
      category: z.literal('storage'),
      check: z.string(), // e.g., "No sensitive data in localStorage"
      status: z.enum(['pass', 'fail', 'warning', 'na']),
      details: z.string(),
      recommendation: z.string(),
    }),
  ),
})

export type BrowserStorageAuditOutput = z.infer<
  typeof browserStorageAuditOutputSchema
>

const SYSTEM_PROMPT = dedent`
  You are a security engineer performing browser storage security audit of a web application.
  Your goal is to verify that no sensitive information is stored in browser storage (localStorage, sessionStorage).

  # Tools Available
  - **goto**: Navigate to a specific URL
  - **act**: Perform actions on the page (click, type, scroll, etc.)
  - **extract**: Extract structured data from the page (use this to inspect browser storage)
  - **observe**: Discover actionable elements on the page

  # Storage Security Checks
  - localStorage: Check for sensitive data (API keys, tokens, passwords, PII) stored in localStorage
  - sessionStorage: Check for sensitive data stored in sessionStorage
  - IndexedDB: Check for sensitive data stored in IndexedDB (if used)
  - Verify no authentication tokens or credentials are stored in browser storage
  - Check if sensitive data is stored unencrypted in browser storage

  # Sensitive Data Patterns to Look For
  - API keys or tokens (look for patterns like "api_key", "token", "access_token", "auth")
  - Passwords or credentials
  - Personally Identifiable Information (PII): email, SSN, credit card numbers
  - Session identifiers that could be used for session hijacking
  - Private keys or certificates

  # Important Instructions
  - Use JavaScript execution via act/extract to inspect localStorage and sessionStorage
  - Run: localStorage.getItem(), sessionStorage.getItem(), or Object.keys(localStorage)
  - Check all keys in storage for sensitive data patterns
  - Verify authentication tokens are not stored in browser storage (should be in httpOnly cookies)
  - Report any sensitive data found in browser storage
  - Report all findings in the output schema
`

/**
 * Browser storage security audit agent that validates that no sensitive data
 * (API keys, tokens, passwords, PII) is stored in browser storage.
 */
export async function runBrowserStorageAudit(
  options: AnalyzeBrowserAgentOptions,
): Promise<BrowserStorageAuditOutput> {
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
      functionId: 'browser-storage-audit',
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
      schema: browserStorageAuditOutputSchema,
    }),
  })

  const prompt = dedent`
    Perform browser storage security audit for the website at the following URL:

    ${instructions}

    Inspect browser storage (localStorage, sessionStorage) for:
    - Sensitive data (API keys, tokens, passwords, PII)
    - Authentication credentials
    - Unencrypted sensitive information

    Return the results in the structured format.
  `

  const result = await agent.generate({ prompt })

  return browserStorageAuditOutputSchema.parse(result.experimental_output)
}
