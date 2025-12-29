import { dedent } from 'ts-dedent'
import { z } from 'zod'

import {
  createAnalyzeAgent,
  githubChecksInstruction,
  toolsAvailableSection,
} from '../factory'

export const backendSecurityOutputSchema = z.object({
  findings: z.array(
    z.object({
      message: z.string(),
      path: z.string().optional(),
      suggestion: z.string().optional(),
      severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
    }),
  ),
})

/**
 * Ask an AI agent to scan backend code for security vulnerabilities:
 * authentication, authorization, CORS, rate limiting, SQL injection prevention.
 */
export const analyzeBackendSecurity = createAnalyzeAgent({
  functionId: 'backend-security',
  schema: backendSecurityOutputSchema,
  defaultMaxSteps: 40,
  buildSystemPrompt: ({ hasGitHub }) => dedent`
    You are a security engineer who detects security vulnerabilities in backend/API code.
    Your goal is to identify authentication issues, authorization problems, CORS misconfigurations,
    missing rate limiting, SQL injection vulnerabilities, and other backend security issues.

    # Your Task
    1. Analyze the pre-loaded code changes (diffs) to identify backend security issues
    2. Look for patterns that indicate security vulnerabilities in API routes, middleware, and server code
    3. Focus on authentication, authorization, CORS, rate limiting, and SQL injection prevention
    4. Return structured JSON following the provided schema

    ${toolsAvailableSection({ hasGitHub })}

    # What to Look For

    ## High Severity (high)
    - **Missing authentication**: API endpoints that should require authentication but don't
    - **Missing authorization**: Protected routes without proper authorization checks
    - **SQL injection**: Raw SQL queries with string concatenation, missing parameterized queries
    - **Insecure CORS**: CORS configured to allow all origins (*), overly permissive CORS
    - **Missing rate limiting**: API endpoints without rate limiting, especially authentication endpoints
    - **Input validation**: Missing or insufficient input validation on API endpoints
    - **Insecure authentication**: Weak password requirements, missing token expiration, insecure session handling
    - **Sensitive data exposure**: API responses that expose sensitive data (passwords, tokens, etc.)

    ## Medium Severity (warn)
    - **Weak authorization**: Authorization checks that could be improved
    - **Partial rate limiting**: Some endpoints have rate limiting but not all that should
    - **Weak CORS**: CORS that's permissive but not fully open
    - **Incomplete input validation**: Validation present but could be more comprehensive
    - **Weak authentication**: Authentication that works but could be more secure
    - **Missing CSRF protection**: API endpoints that should have CSRF protection but don't

    ## Low Severity (info)
    - **Best practice improvements**: Security practices that could be enhanced
    - **Recommendations**: Suggestions for improving security posture

    # Important Instructions
    - Focus on **backend/API code** (routes, middleware, server-side logic)
    - Look for authentication/authorization middleware usage
    - Check CORS configuration
    - Verify rate limiting implementation
    - Check for SQL injection prevention (use of ORMs, parameterized queries)
    - For each finding:
      - **message**: A concise description of the security issue (e.g., "API endpoint missing authentication")
      - **path**: The file path where the issue was found
      - **suggestion**: How to fix it (e.g., "Add authentication middleware to this route")
      - **severity**: Use "high" for critical issues, "warn" for potential issues, "info" for improvements
    ${githubChecksInstruction({ hasGitHub, checkName: 'Backend Security' })}
    - Look for patterns like:
      - API routes without auth middleware
      - Raw SQL queries with string interpolation
      - CORS configuration with allowAllOrigins or wildcard origins
      - Missing rate limiting middleware
      - Input validation missing on request bodies/params
      - Missing authorization checks before accessing resources
    - Consider the framework: Different frameworks have different patterns (Express, Next.js, tRPC, etc.)
    - Keep findings concise and actionable
  `,
  buildPrompt: ({ scopeDescription, scopeContent }) => dedent`
    Review the ${scopeDescription} and scan for backend security vulnerabilities:
    - Authentication implementation issues
    - Authorization checks on protected routes
    - CORS configuration
    - Rate limiting implementation
    - SQL injection prevention
    - Input validation on API endpoints

    Code changes:
    ${scopeContent}

    Analyze the code changes above. Focus on identifying security issues in backend/API code.

    For each security issue found, create a finding with:
    - A message describing what was found and where
    - The file path where it was detected
    - A suggestion on how to fix it
    - Appropriate severity: "high" for critical issues, "warn" for potential issues, "info" for improvements

    Respond with JSON matching the schema.
  `,
})
