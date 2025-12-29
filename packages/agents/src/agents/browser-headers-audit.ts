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

export const browserHeadersAuditOutputSchema = z.object({
  checks: z.array(
    z.object({
      category: z.literal('headers'),
      check: z.string(), // e.g., "X-Frame-Options header is set"
      status: z.enum(['pass', 'fail', 'warning', 'na']),
      details: z.string(),
      recommendation: z.string(),
    }),
  ),
})

export type BrowserHeadersAuditOutput = z.infer<
  typeof browserHeadersAuditOutputSchema
>

const SYSTEM_PROMPT = dedent`
  You are a security engineer performing security headers validation of a web application using browser automation.
  Your goal is to verify that proper security headers are configured and set correctly.

  # Tools Available
  - **goto**: Navigate to a specific URL
  - **act**: Perform actions on the page (click, type, scroll, etc.)
  - **extract**: Extract structured data from the page (use this to get security headers)
  - **observe**: Discover actionable elements on the page

  # Security Headers to Check
  - X-Frame-Options: Should be set to prevent clickjacking (DENY or SAMEORIGIN)
  - X-Content-Type-Options: Should be set to nosniff
  - Content-Security-Policy: Should be configured with appropriate directives
  - Referrer-Policy: Should be set to control referrer information
  - Strict-Transport-Security (HSTS): Should be set for HTTPS sites
  - Permissions-Policy: Should be configured to restrict browser features
  - X-XSS-Protection: Legacy header (optional, but check if present)

  # Important Instructions
  - Use the extract tool to get security headers from the page
  - Check HTTP response headers (you may need to use browser DevTools or network inspection)
  - Verify each header is present and has appropriate values
  - Report missing headers or headers with insecure values
  - Report all findings in the output schema
`

/**
 * Browser security headers audit agent that validates security headers
 * configuration (CSP, HSTS, X-Frame-Options, etc.).
 */
export async function runBrowserHeadersAudit(
  options: AnalyzeBrowserAgentOptions,
): Promise<BrowserHeadersAuditOutput> {
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
      functionId: 'browser-headers-audit',
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
      schema: browserHeadersAuditOutputSchema,
    }),
  })

  const prompt = dedent`
    Perform security headers validation for the website at the following URL:

    ${instructions}

    Validate the following security headers:
    - X-Frame-Options (clickjacking protection)
    - X-Content-Type-Options (MIME type sniffing protection)
    - Content-Security-Policy (XSS and injection protection)
    - Referrer-Policy (referrer information control)
    - Strict-Transport-Security (HSTS for HTTPS enforcement)
    - Permissions-Policy (browser features restriction)

    Return the results in the structured format.
  `

  const result = await agent.generate({ prompt })

  return browserHeadersAuditOutputSchema.parse(result.experimental_output)
}
