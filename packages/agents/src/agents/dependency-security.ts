import { dedent } from 'ts-dedent'
import { z } from 'zod'

import {
  createAnalyzeAgent,
  githubChecksInstruction,
  toolsAvailableSection,
} from '../factory'

export const dependencySecurityOutputSchema = z.object({
  findings: z.array(
    z.object({
      message: z.string(),
      path: z.string().optional(),
      method: z.string(), // e.g., "npm audit", "bun audit", "dependency scanning"
      tool: z.string(), // e.g., "npm audit", "bun audit", "snyk"
      finding: z.string().optional(),
      suggestion: z.string().optional(),
      severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
    }),
  ),
})

/**
 * Dependency & Supply Chain Security Agent
 * Audits lockfiles and dependency vulnerabilities; checks update posture.
 */
export const analyzeDependencySecurity = createAnalyzeAgent({
  functionId: 'dependency-security',
  schema: dependencySecurityOutputSchema,
  defaultMaxSteps: 30,
  buildSystemPrompt: ({ hasGitHub }) => dedent`
    You are a security engineer auditing dependencies and supply chain security.
    Your goal is to identify vulnerable dependencies, outdated packages, lockfile integrity issues,
    and supply chain risks.

    # Your Task
    1. Use terminal commands to run dependency vulnerability scans (npm audit, bun audit, etc.)
    2. Review package.json and lockfiles for security issues
    3. Check for outdated dependencies with known vulnerabilities
    4. Verify lockfile integrity
    5. Identify supply chain risks
    6. Return structured JSON following the provided schema

    ${toolsAvailableSection({ hasGitHub, includeTerminal: true })}

    # What to Look For

    ## Critical Severity (critical)
    - **Critical vulnerabilities**: Dependencies with critical CVEs
    - **Known exploited vulnerabilities**: Packages with actively exploited vulnerabilities
    - **Malicious packages**: Dependencies that are known to be malicious
    - **Compromised maintainers**: Packages from compromised accounts

    ## High Severity (high)
    - **High severity vulnerabilities**: Dependencies with high severity CVEs
    - **Outdated critical packages**: Severely outdated packages with known vulnerabilities
    - **Missing lockfiles**: Projects without lockfiles (package-lock.json, yarn.lock, bun.lockb)
    - **Inconsistent lockfiles**: Lockfiles that don't match package.json

    ## Medium Severity (medium)
    - **Medium severity vulnerabilities**: Dependencies with medium severity CVEs
    - **Outdated packages**: Packages that should be updated for security fixes
    - **Large dependency trees**: Projects with excessive dependencies increasing attack surface
    - **Unmaintained packages**: Dependencies that are no longer maintained

    ## Low Severity (low)
    - **Low severity vulnerabilities**: Dependencies with low severity CVEs
    - **Minor outdated packages**: Packages slightly behind latest version
    - **Best practice improvements**: Recommendations for dependency management

    ## Info Severity (info)
    - **Update recommendations**: Non-critical updates available
    - **Dependency health**: Information about dependency maintenance status

    # Important Instructions
    - Use terminalCommand tool to run: npm audit --json, bun audit, or similar
    - Review package.json for dependency versions
    - Check for lockfiles and verify their presence
    - Map vulnerability severity from audit tool to our severity levels
    - For each finding:
      - **message**: Description of the vulnerability or issue (e.g., "Critical vulnerability in package-name@version")
      - **path**: Usually "package.json" or specific lockfile path
      - **method**: The scanning method used (e.g., "npm audit", "bun audit")
      - **tool**: The tool used (e.g., "npm audit", "bun audit", "snyk")
      - **finding**: Detailed finding including CVE ID if available
      - **suggestion**: How to fix (e.g., "Update package-name to version X")
      - **severity**: Map audit tool severity to our levels
    ${githubChecksInstruction({ hasGitHub, checkName: 'Dependency Security' })}
    - Parse audit output and extract:
      - Package name and version
      - Vulnerability description
      - Severity level
      - Recommended fix version
      - CVE ID if available
    - Keep findings concise and actionable
    - Prioritize critical and high severity issues
  `,
  buildPrompt: ({ scopeDescription, scopeContent }) => dedent`
    Review the ${scopeDescription} and audit dependencies for security vulnerabilities.

    Code changes:
    ${scopeContent}

    If package.json is in the changes or repository, run dependency vulnerability scans using:
    - npm audit --json (for npm projects)
    - bun audit (for bun projects)
    - Or appropriate command for the package manager used

    Analyze the audit results and identify:
    - Vulnerable dependencies with CVEs
    - Outdated packages with security fixes available
    - Lockfile integrity issues
    - Supply chain risks

    For each vulnerability or issue found, create a finding with:
    - A message describing the vulnerability
    - The path (usually "package.json")
    - Method: The scanning method used
    - Tool: The tool used
    - A detailed finding including CVE ID if available
    - A suggestion on how to fix it (including recommended version)
    - Appropriate severity: critical/high/medium/low/info

    Respond with JSON matching the schema.
  `,
})
