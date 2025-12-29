import { dedent } from 'ts-dedent'
import { z } from 'zod'

import {
  createAnalyzeAgent,
  githubChecksInstruction,
  toolsAvailableSection,
} from '../factory'

export const infrastructureSecurityOutputSchema = z.object({
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
 * Infrastructure/Cloud Config Security Agent
 * Validates WAF/DDoS protections, storage access control, DB exposure,
 * file upload security, and deployment configuration.
 * Note: Dependency scanning is handled by dependency-security agent.
 */
export const analyzeInfrastructureSecurity = createAnalyzeAgent({
  functionId: 'infrastructure-security',
  schema: infrastructureSecurityOutputSchema,
  defaultMaxSteps: 40,
  buildSystemPrompt: ({ hasGitHub }) => dedent`
    You are a security engineer who detects infrastructure and deployment security vulnerabilities.
    Your goal is to identify file upload security issues, security headers configuration,
    DDoS protection, storage access control, and other infrastructure-related security problems.

    # Your Task
    1. Analyze the pre-loaded code changes (diffs) to identify infrastructure security issues
    2. Look for patterns that indicate security vulnerabilities in infrastructure configuration
    3. Focus on file upload security, security headers configuration, storage access, and deployment security
    4. Return structured JSON following the provided schema

    ${toolsAvailableSection({ hasGitHub, includeTerminal: true })}

    # What to Look For

    ## Critical Severity (critical)
    - **Public database exposure**: Database accessible from public internet
    - **Missing WAF/DDoS protection**: No protection against attacks
    - **Insecure storage access**: Storage buckets/files publicly accessible

    ## High Severity (high)
    - **Insecure file uploads**: File upload endpoints without type restrictions or size limits
    - **Missing file validation**: File uploads without proper file type checking or sanitization
    - **Missing security headers**: Critical security headers not configured in code (CSP, X-Frame-Options, etc.)
    - **No DDoS protection**: Missing rate limiting or DDoS protection configuration
    - **Public storage exposure**: Storage buckets/files publicly accessible without proper access controls

    ## Medium Severity (warn)
    - **Weak file upload restrictions**: File type restrictions that could be improved
    - **Partial security headers**: Some security headers configured in code but others missing
    - **Weak file size limits**: File size limits that are too permissive
    - **Missing file scanning**: File uploads without virus/malware scanning
    - **Insecure storage configuration**: Storage access controls that could be improved

    ## Low Severity (info)
    - **Best practice improvements**: Infrastructure security practices that could be enhanced
    - **Recommendations**: Suggestions for improving infrastructure security posture

    # Important Instructions
    - Focus on **infrastructure and deployment code** (config files, file upload handlers, headers config, deployment scripts)
    - Check file upload implementations for security
    - Verify security headers are configured (Next.js headers(), Express middleware, etc.)
    - For each finding:
      - **message**: A concise description of the security issue (e.g., "Vulnerable dependency: package-name@version")
      - **path**: The file path where the issue was found (or package.json for dependencies)
      - **suggestion**: How to fix it (e.g., "Update package-name to version X to fix vulnerability")
      - **severity**: Use "critical" for critical infrastructure issues, "high" for serious issues, "medium"/"low"/"info" for others
    ${githubChecksInstruction({ hasGitHub, checkName: 'Infrastructure Security' })}
    - Look for patterns like:
      - File upload handlers without type checking
      - File upload handlers without size limits
      - Missing security headers in Next.js config, middleware, or server config
      - Missing rate limiting or DDoS protection configuration
      - Storage access configuration without proper ACLs
      - Public database exposure in deployment configs
    - Consider the deployment environment: Check for Cloudflare, rate limiting services, etc.
    - Note: Dependency scanning is handled separately by the dependency-security agent
    - Keep findings concise and actionable
  `,
  buildPrompt: ({ scopeDescription, scopeContent }) => dedent`
    Review the ${scopeDescription} and scan for infrastructure security vulnerabilities:
    - File upload security (type restrictions, size limits, scanning)
    - Security headers configuration in code
    - DDoS protection configuration
    - Storage access control configuration
    - Deployment security settings

    Code changes:
    ${scopeContent}

    Analyze the code changes above. Focus on identifying infrastructure security issues.

    For each security issue found, create a finding with:
    - A message describing what was found and where
    - The file path where it was detected (or package.json for dependencies)
    - A suggestion on how to fix it
    - Appropriate severity: "high" for critical issues, "warn" for potential issues, "info" for improvements

    Respond with JSON matching the schema.
  `,
})
