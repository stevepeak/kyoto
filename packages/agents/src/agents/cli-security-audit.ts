import {
  createLocalReadFileTool,
  createLocalTerminalCommandTool,
} from '@app/shell'
import { type VibeCheckContext } from '@app/types'
import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import { dedent } from 'ts-dedent'
import { z } from 'zod'

import { type AnalyzeAgentOptions } from '../types'

export const cliSecurityAuditOutputSchema = z.object({
  checks: z.array(
    z.object({
      category: z.enum(['tls', 'headers', 'cors', 'api', 'rate-limiting']),
      check: z.string(),
      status: z.enum(['pass', 'fail', 'warning', 'na']),
      method: z.string(),
      tool: z.string(),
      finding: z.string().optional(),
      severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
      details: z.string().optional(),
      recommendation: z.string().optional(),
    }),
  ),
})

export type CliSecurityAuditOutput = z.infer<
  typeof cliSecurityAuditOutputSchema
>

/**
 * CLI-based security audit agent that validates TLS, headers, CORS, API auth,
 * and rate limiting using terminal commands (curl, openssl, etc.)
 */
export async function runCliSecurityAudit({
  context,
  options: { maxSteps = 40, telemetryTracer, progress } = {},
  targetUrl,
}: {
  context: VibeCheckContext
  options?: AnalyzeAgentOptions['options']
  targetUrl: string
}): Promise<CliSecurityAuditOutput> {
  const agent = new Agent({
    model: context.model,
    system: dedent`
      You are a security engineer performing CLI-based security validation.
      Your goal is to verify TLS configuration, security headers, CORS rules,
      API authentication, and rate limiting using terminal commands.

      # Tools Available
      - **terminalCommand**: Execute CLI commands (curl, openssl, nmap, etc.)
      - **readFile**: Read configuration files if needed

      # Security Checks to Perform

      ## TLS & Transport Security
      - Verify TLS configuration and certificate chain using openssl
      - Check for TLS 1.2+ requirement
      - Validate certificate expiration and validity
      - Test HSTS header and redirect behavior
      - Check for weak cipher suites

      ## Security Headers
      - Use curl to fetch headers and verify:
        - X-Frame-Options
        - X-Content-Type-Options
        - Content-Security-Policy
        - Strict-Transport-Security (HSTS)
        - Referrer-Policy
        - Permissions-Policy
      - Test header presence and correct values

      ## CORS Configuration
      - Test CORS headers with curl -H "Origin: ..."
      - Verify Access-Control-Allow-Origin is not wildcard for sensitive endpoints
      - Check Access-Control-Allow-Credentials configuration
      - Validate Access-Control-Allow-Methods restrictions

      ## API Authentication
      - Test API endpoints without authentication (should fail)
      - Verify authentication is required on protected routes
      - Test with invalid tokens (should be rejected)
      - Check for authentication bypass vulnerabilities

      ## Rate Limiting
      - Send multiple rapid requests to API endpoints
      - Verify rate limiting is in place (should see 429 responses after threshold)
      - Check rate limit headers (X-RateLimit-*)

      # Important Instructions
      - Use curl commands to test headers and API endpoints
      - Use openssl commands to test TLS configuration
      - For each check, document the method (e.g., "curl -I", "openssl s_client")
      - Document the tool used (e.g., "curl", "openssl")
      - Provide detailed findings including actual values observed
      - Include severity assessment: critical, high, medium, low, info
      - Provide actionable recommendations for failures
    `,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'cli-security-audit',
      tracer: telemetryTracer,
    },
    tools: {
      terminalCommand: createLocalTerminalCommandTool(progress),
      readFile: createLocalReadFileTool(progress),
    },
    stopWhen: stepCountIs(maxSteps),
    onStepFinish: (step) => {
      if (step.reasoningText && step.reasoningText !== '[REDACTED]') {
        progress?.(step.reasoningText)
      }
    },
    experimental_output: Output.object({
      schema: cliSecurityAuditOutputSchema,
    }),
  })

  const prompt = dedent`
    Perform CLI-based security validation for the following target:

    Target URL: ${targetUrl}

    Use terminal commands (curl, openssl, etc.) to verify:
    1. TLS configuration and certificate chain
    2. Security headers (X-Frame-Options, CSP, HSTS, etc.)
    3. CORS configuration
    4. API authentication requirements
    5. Rate limiting

    For each check, provide:
    - category: tls, headers, cors, api, or rate-limiting
    - check: Description of what was checked
    - status: pass/fail/warning/na
    - method: The CLI method used (e.g., "curl -I", "openssl s_client")
    - tool: The tool used (e.g., "curl", "openssl")
    - finding: Detailed finding including actual values observed
    - severity: critical/high/medium/low/info
    - details: Additional context
    - recommendation: How to fix if it failed

    Return the results in the structured format.
  `

  const result = await agent.generate({ prompt })

  return cliSecurityAuditOutputSchema.parse(result.experimental_output)
}
