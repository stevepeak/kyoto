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

export const browserCookieAuditOutputSchema = z.object({
  checks: z.array(
    z.object({
      category: z.literal('cookies'),
      check: z.string(), // e.g., "Session cookie uses HttpOnly flag"
      status: z.enum(['pass', 'fail', 'warning', 'na']),
      details: z.string(),
      recommendation: z.string(),
    }),
  ),
})

export type BrowserCookieAuditOutput = z.infer<
  typeof browserCookieAuditOutputSchema
>

const SYSTEM_PROMPT = dedent`
  You are a security engineer performing cookie security validation of a web application using browser automation.
  Your goal is to verify that cookies are configured with proper security flags.

  # Tools Available
  - **goto**: Navigate to a specific URL
  - **act**: Perform actions on the page (click, type, scroll, etc.)
  - **extract**: Extract structured data from the page (use this to inspect cookies)
  - **observe**: Discover actionable elements on the page

  # Cookie Security Checks
  - HttpOnly flag: Cookies should use HttpOnly flag (prevents JavaScript access, protects against XSS)
  - Secure flag: Cookies should use Secure flag (only sent over HTTPS)
  - SameSite attribute: Cookies should use SameSite attribute (prevents CSRF)
    - SameSite=Strict: Most secure, prevents all cross-site requests
    - SameSite=Lax: Allows top-level navigation, prevents CSRF
    - SameSite=None: Requires Secure flag, allows cross-site requests
  - Cookie path: Verify cookies are scoped appropriately (not overly broad)
  - Cookie expiration: Check for session cookies vs persistent cookies

  # Important Instructions
  - Use JavaScript execution via act/extract to inspect cookies (you may need to run document.cookie in the browser)
  - Check cookie attributes via browser DevTools or JavaScript
  - Verify HttpOnly, Secure, and SameSite flags are set correctly
  - Check if sensitive cookies (session, authentication) have all security flags
  - Report missing flags or insecure cookie configurations
  - Report all findings in the output schema
`

/**
 * Browser cookie security audit agent that validates cookie security flags
 * (HttpOnly, Secure, SameSite) to prevent XSS and CSRF attacks.
 */
export async function runBrowserCookieAudit(
  options: AnalyzeBrowserAgentOptions,
): Promise<BrowserCookieAuditOutput> {
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
      functionId: 'browser-cookie-audit',
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
      schema: browserCookieAuditOutputSchema,
    }),
  })

  const prompt = dedent`
    Perform cookie security validation for the website at the following URL:

    ${instructions}

    Validate cookie security flags:
    - HttpOnly flag (prevents JavaScript access, XSS protection)
    - Secure flag (HTTPS-only transmission)
    - SameSite attribute (CSRF protection)
    - Cookie scope and expiration settings

    Return the results in the structured format.
  `

  const result = await agent.generate({ prompt })

  return browserCookieAuditOutputSchema.parse(result.experimental_output)
}
