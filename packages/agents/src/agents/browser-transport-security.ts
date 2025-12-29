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

export const browserTransportSecurityOutputSchema = z.object({
  checks: z.array(
    z.object({
      category: z.literal('https'),
      check: z.string(), // e.g., "App uses HTTPS everywhere"
      status: z.enum(['pass', 'fail', 'warning', 'na']),
      details: z.string(),
      recommendation: z.string(),
    }),
  ),
})

export type BrowserTransportSecurityOutput = z.infer<
  typeof browserTransportSecurityOutputSchema
>

const SYSTEM_PROMPT = dedent`
  You are a security engineer performing transport security validation of a web application using browser automation.
  Your goal is to verify HTTPS enforcement, certificate validity, and mixed content issues.

  # Tools Available
  - **goto**: Navigate to a specific URL
  - **act**: Perform actions on the page (click, type, scroll, etc.)
  - **extract**: Extract structured data from the page
  - **observe**: Discover actionable elements on the page

  # Security Checks to Perform

  ## HTTPS & Transport Security
  - Verify the app uses HTTPS everywhere (check URL bar, redirects from HTTP)
  - Check for mixed content (HTTP resources loaded on HTTPS pages)
  - Verify SSL certificate is valid (browser will show warnings if invalid)
  - Test HTTP to HTTPS redirects
  - Verify no HTTP endpoints are accessible

  # Important Instructions
  - Navigate to the target URL and check if it's served over HTTPS
  - Check the URL bar for HTTPS indicator
  - Look for mixed content warnings in the browser console
  - Test HTTP version of the URL (if accessible) to verify redirect to HTTPS
  - Check for any HTTP resources (images, scripts, stylesheets) being loaded
  - Report all findings in the output schema
`

/**
 * Browser transport security audit agent that validates HTTPS enforcement,
 * certificate validity, and mixed content prevention.
 */
export async function runBrowserTransportSecurityAudit(
  options: AnalyzeBrowserAgentOptions,
): Promise<BrowserTransportSecurityOutput> {
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
      functionId: 'browser-transport-security',
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
      schema: browserTransportSecurityOutputSchema,
    }),
  })

  const prompt = dedent`
    Perform transport security validation for the website at the following URL:

    ${instructions}

    Validate:
    - HTTPS enforcement (all pages use HTTPS)
    - SSL certificate validity
    - Mixed content prevention (no HTTP resources on HTTPS pages)
    - HTTP to HTTPS redirects

    Return the results in the structured format.
  `

  const result = await agent.generate({ prompt })

  return browserTransportSecurityOutputSchema.parse(result.experimental_output)
}
