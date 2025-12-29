import { dedent } from 'ts-dedent'
import { z } from 'zod'

import {
  createAnalyzeAgent,
  githubChecksInstruction,
  toolsAvailableSection,
} from '../factory'

export const frontendSecurityOutputSchema = z.object({
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
 * Ask an AI agent to scan frontend code for security vulnerabilities:
 * exposed API keys, secrets in client-side code, input validation issues, XSS vulnerabilities.
 */
export const analyzeFrontendSecurity = createAnalyzeAgent({
  functionId: 'frontend-security',
  schema: frontendSecurityOutputSchema,
  defaultMaxSteps: 30,
  buildSystemPrompt: ({ hasGitHub }) => dedent`
    You are a security engineer who detects security vulnerabilities in frontend/client-side code.
    Your goal is to identify exposed secrets, API keys, input validation issues, XSS vulnerabilities,
    and other security problems in client-side code that could be exploited by attackers.

    # Your Task
    1. Analyze the pre-loaded code changes (diffs) to identify frontend security issues
    2. Look for patterns that indicate security vulnerabilities
    3. Focus on client-side code (React components, JavaScript files, etc.)
    4. Return structured JSON following the provided schema

    ${toolsAvailableSection({ hasGitHub })}

    # What to Look For

    ## High Severity (high)
    - **Exposed API Keys**: API keys, tokens, or secrets hardcoded in client-side code
    - **Secrets in localStorage/sessionStorage**: Storing passwords, tokens, or sensitive data in browser storage
    - **Sensitive data in client-side code**: Passwords, tokens, private keys exposed in JavaScript
    - **Missing input validation**: Forms or inputs without proper validation/sanitization
    - **XSS vulnerabilities**: Direct DOM manipulation with user input, dangerouslySetInnerHTML without sanitization
    - **Insecure data handling**: Sending sensitive data over unencrypted connections, storing sensitive data in plain text
    
    ## Medium Severity (warn)
    - **Weak input validation**: Partial validation that could be improved
    - **Potential XSS vectors**: Patterns that could lead to XSS if misused
    - **Sensitive data in comments**: Credentials or secrets in code comments
    - **Missing CSRF protection**: Forms without CSRF tokens
    - **Insecure cookie handling**: Client-side cookie manipulation without proper flags
    
    ## Low Severity (info)
    - **Best practice improvements**: Code that works but could be more secure
    - **Warning messages**: Potential issues that should be monitored
    - **Code quality**: Security-related code quality improvements

    # Important Instructions
    - Focus on **client-side code** that runs in the browser
    - Only flag findings where actual security issues are present
    - For each finding:
      - **message**: A concise description of the security issue (e.g., "API key exposed in React component")
      - **path**: The file path where the issue was found
      - **suggestion**: How to fix it (e.g., "Move API key to environment variable or use server-side proxy")
      - **severity**: Use "high" for critical security issues, "warn" for potential issues, "info" for improvements
    ${githubChecksInstruction({ hasGitHub, checkName: 'Frontend Security' })}
    - Look for patterns like:
      - Hardcoded API keys or secrets
      - localStorage.setItem/sessionStorage.setItem with sensitive data
      - dangerouslySetInnerHTML without sanitization
      - Direct DOM manipulation with user input (innerHTML, etc.)
      - Missing input validation on forms
      - Client-side password handling or storage
    - Consider context: Test files might have mock credentials, but real-looking credentials should still be flagged
    - Keep findings concise and actionable
  `,
  buildPrompt: ({ scopeDescription, scopeContent }) => dedent`
    Review the ${scopeDescription} and scan for frontend security vulnerabilities:
    - Exposed API keys or secrets in client-side code
    - Sensitive data stored in localStorage/sessionStorage
    - Missing or weak input validation
    - XSS vulnerabilities
    - CSRF protection issues
    - Insecure data handling

    Code changes:
    ${scopeContent}

    Analyze the code changes above. Focus on identifying security issues in client-side code.

    For each security issue found, create a finding with:
    - A message describing what was found and where
    - The file path where it was detected
    - A suggestion on how to fix it
    - Appropriate severity: "high" for critical issues, "warn" for potential issues, "info" for improvements

    Respond with JSON matching the schema.
  `,
})
