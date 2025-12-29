import { z } from 'zod'

import { type AnalyzeAgentOptions } from '../types'
import { analyzeBackendSecurity } from './backend-security'
import { type AnalyzeBrowserAgentOptions } from './browser-agent.types'
import { runBrowserConsoleAudit } from './browser-console-audit'
import { runBrowserCookieAudit } from './browser-cookie-audit'
import { runBrowserHeadersAudit } from './browser-headers-audit'
import { runBrowserStorageAudit } from './browser-storage-audit'
import { runBrowserTransportSecurityAudit } from './browser-transport-security'
import {
  type CliSecurityAuditOutput,
  runCliSecurityAudit,
} from './cli-security-audit'
import { analyzeDatabaseSecurity } from './database-security'
import { analyzeDependencySecurity } from './dependency-security'
import { analyzeFrontendSecurity } from './frontend-security'
import { analyzeInfrastructureSecurity } from './infrastructure-security'

export const securityAuditCheckItemSchema = z.object({
  category: z.string(),
  check: z.string(), // e.g., "App uses HTTPS everywhere"
  status: z.enum(['pass', 'fail', 'warning', 'na']),
  method: z.string().optional(), // e.g., "Browser proxy test", "CLI curl command", "Codebase analysis"
  tool: z.string().optional(), // e.g., "Browserbase", "curl", "npm audit", "Code analysis"
  date: z.string().optional(), // ISO date string
  finding: z.string().optional(), // Detailed finding
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']).optional(),
  details: z.string().optional(),
  recommendation: z.string().optional(),
  remediation: z
    .object({
      owner: z.string().optional(),
      eta: z.string().optional(),
      steps: z.array(z.string()).optional(),
    })
    .optional(),
})

export const securityAuditOutputSchema = z.object({
  checks: z.array(securityAuditCheckItemSchema),
  score: z.string(), // e.g., "85%"
  criticalIssues: z.array(
    z.object({
      category: z.string(),
      check: z.string(),
      details: z.string().optional(),
      recommendation: z.string().optional(),
    }),
  ),
  recommendations: z.array(z.string()),
})

export type SecurityAuditOutput = z.infer<typeof securityAuditOutputSchema>

type SecurityAuditOptions = {
  /** Code analysis context for backend, frontend, database, infrastructure, dependency agents */
  codeAnalysisContext?: AnalyzeAgentOptions['context']
  codeAnalysisOptions?: AnalyzeAgentOptions['options']
  /** Browser agent options for browser-based security audit (DAST) */
  browserAgentOptions?: AnalyzeBrowserAgentOptions
  /** Target URL for browser and CLI-based audits */
  targetUrl?: string
}

/**
 * Comprehensive security audit orchestrator that coordinates all security agents
 * and generates a unified security audit report matching the checklist format.
 */
export async function runSecurityAudit(
  options: SecurityAuditOptions,
): Promise<SecurityAuditOutput> {
  const {
    codeAnalysisContext,
    codeAnalysisOptions,
    browserAgentOptions,
    targetUrl,
  } = options

  const allChecks: z.infer<typeof securityAuditCheckItemSchema>[] = []
  const criticalIssues: SecurityAuditOutput['criticalIssues'] = []
  const recommendations: string[] = []

  // Run browser security audits if browser context is provided
  if (browserAgentOptions && targetUrl) {
    const now = new Date().toISOString()

    // Run all browser security audits in parallel
    const [
      transportResults,
      headersResults,
      cookieResults,
      storageResults,
      consoleResults,
    ] = await Promise.all([
      runBrowserTransportSecurityAudit({
        ...browserAgentOptions,
        instructions: targetUrl,
      }),
      runBrowserHeadersAudit({
        ...browserAgentOptions,
        instructions: targetUrl,
      }),
      runBrowserCookieAudit({
        ...browserAgentOptions,
        instructions: targetUrl,
      }),
      runBrowserStorageAudit({
        ...browserAgentOptions,
        instructions: targetUrl,
      }),
      runBrowserConsoleAudit({
        ...browserAgentOptions,
        instructions: targetUrl,
      }),
    ])

    // Convert browser results to checks with metadata
    const browserResults = [
      ...transportResults.checks,
      ...headersResults.checks,
      ...cookieResults.checks,
      ...storageResults.checks,
      ...consoleResults.checks,
    ]

    for (const check of browserResults) {
      const details = check.details || ''
      const recommendation = check.recommendation || ''

      allChecks.push({
        category: check.category,
        check: check.check,
        status: check.status,
        method: 'Browser automation',
        tool: 'Browserbase/Stagehand',
        date: now,
        finding: details || undefined,
        severity:
          check.status === 'fail'
            ? 'high'
            : check.status === 'warning'
              ? 'medium'
              : 'low',
        details: details || undefined,
        recommendation: recommendation || undefined,
      })
      if (check.status === 'fail') {
        criticalIssues.push({
          category: check.category,
          check: check.check,
          details: details || undefined,
          recommendation: recommendation || undefined,
        })
      }
    }
  }

  // Run CLI security audit if target URL is provided
  let cliResults: CliSecurityAuditOutput | null = null
  if (targetUrl && codeAnalysisContext) {
    cliResults = await runCliSecurityAudit({
      context: codeAnalysisContext,
      options: codeAnalysisOptions,
      targetUrl,
    })

    // Convert CLI results to checks
    for (const check of cliResults.checks) {
      allChecks.push({
        category: check.category,
        check: check.check,
        status: check.status,
        method: check.method,
        tool: check.tool,
        finding: check.finding,
        severity: check.severity,
        details: check.details,
        recommendation: check.recommendation,
      })
      if (
        check.status === 'fail' &&
        (check.severity === 'critical' || check.severity === 'high')
      ) {
        criticalIssues.push({
          category: check.category,
          check: check.check,
          details: check.details,
          recommendation: check.recommendation,
        })
      }
    }
  }

  // Run code analysis agents if context is provided
  if (codeAnalysisContext) {
    const [
      backendResults,
      frontendResults,
      databaseResults,
      infrastructureResults,
      dependencyResults,
    ] = await Promise.all([
      analyzeBackendSecurity({
        context: codeAnalysisContext,
        options: codeAnalysisOptions,
      }),
      analyzeFrontendSecurity({
        context: codeAnalysisContext,
        options: codeAnalysisOptions,
      }),
      analyzeDatabaseSecurity({
        context: codeAnalysisContext,
        options: codeAnalysisOptions,
      }),
      analyzeInfrastructureSecurity({
        context: codeAnalysisContext,
        options: codeAnalysisOptions,
      }),
      analyzeDependencySecurity({
        context: codeAnalysisContext,
        options: codeAnalysisOptions,
      }),
    ])

    // Convert backend security findings to checks
    for (const finding of backendResults.findings) {
      const status: z.infer<typeof securityAuditCheckItemSchema>['status'] =
        finding.severity === 'critical' || finding.severity === 'high'
          ? 'fail'
          : finding.severity === 'medium'
            ? 'warning'
            : 'pass'
      allChecks.push({
        category: 'Backend Security',
        check: finding.message,
        status,
        method: 'Static code analysis',
        tool: 'AI code review',
        severity: finding.severity,
        details: finding.path,
        recommendation: finding.suggestion,
      })
      if (finding.severity === 'critical' || finding.severity === 'high') {
        criticalIssues.push({
          category: 'Backend Security',
          check: finding.message,
          details: finding.path,
          recommendation: finding.suggestion,
        })
      }
    }

    // Convert frontend security findings to checks
    for (const finding of frontendResults.findings) {
      const status: z.infer<typeof securityAuditCheckItemSchema>['status'] =
        finding.severity === 'critical' || finding.severity === 'high'
          ? 'fail'
          : finding.severity === 'medium'
            ? 'warning'
            : 'pass'
      allChecks.push({
        category: 'Frontend Security',
        check: finding.message,
        status,
        method: 'Static code analysis',
        tool: 'AI code review',
        severity: finding.severity,
        details: finding.path,
        recommendation: finding.suggestion,
      })
      if (finding.severity === 'critical' || finding.severity === 'high') {
        criticalIssues.push({
          category: 'Frontend Security',
          check: finding.message,
          details: finding.path,
          recommendation: finding.suggestion,
        })
      }
    }

    // Convert database findings to checks
    for (const finding of databaseResults.findings) {
      const status: z.infer<typeof securityAuditCheckItemSchema>['status'] =
        finding.severity === 'critical' || finding.severity === 'high'
          ? 'fail'
          : finding.severity === 'medium'
            ? 'warning'
            : 'pass'
      allChecks.push({
        category: 'Data Security',
        check: finding.message,
        status,
        method: 'Static code analysis',
        tool: 'AI code review',
        severity: finding.severity,
        details: finding.path,
        recommendation: finding.suggestion,
      })
      if (finding.severity === 'critical' || finding.severity === 'high') {
        criticalIssues.push({
          category: 'Data Security',
          check: finding.message,
          details: finding.path,
          recommendation: finding.suggestion,
        })
      }
    }

    // Convert infrastructure findings to checks
    for (const finding of infrastructureResults.findings) {
      const status: z.infer<typeof securityAuditCheckItemSchema>['status'] =
        finding.severity === 'critical' || finding.severity === 'high'
          ? 'fail'
          : finding.severity === 'medium'
            ? 'warning'
            : 'pass'
      allChecks.push({
        category: 'Infrastructure Security',
        check: finding.message,
        status,
        method: 'Static code analysis',
        tool: 'AI code review',
        severity: finding.severity,
        details: finding.path,
        recommendation: finding.suggestion,
      })
      if (finding.severity === 'critical' || finding.severity === 'high') {
        criticalIssues.push({
          category: 'Infrastructure Security',
          check: finding.message,
          details: finding.path,
          recommendation: finding.suggestion,
        })
      }
    }

    // Convert dependency findings to checks
    for (const finding of dependencyResults.findings) {
      const status: z.infer<typeof securityAuditCheckItemSchema>['status'] =
        finding.severity === 'critical' || finding.severity === 'high'
          ? 'fail'
          : finding.severity === 'medium'
            ? 'warning'
            : 'pass'
      allChecks.push({
        category: 'Dependency Security',
        check: finding.message,
        status,
        method: finding.method,
        tool: finding.tool,
        finding: finding.finding,
        severity: finding.severity,
        details: finding.path,
        recommendation: finding.suggestion,
      })
      if (finding.severity === 'critical' || finding.severity === 'high') {
        criticalIssues.push({
          category: 'Dependency Security',
          check: finding.message,
          details: finding.path,
          recommendation: finding.suggestion,
        })
      }
    }
  }

  // Calculate score
  const totalChecks = allChecks.length
  const passedChecks = allChecks.filter((c) => c.status === 'pass').length
  const score =
    totalChecks > 0
      ? `${Math.round((passedChecks / totalChecks) * 100)}%`
      : '0%'

  // Collect recommendations from failed/warning checks
  for (const check of allChecks) {
    if (check.status === 'fail' || check.status === 'warning') {
      if (
        check.recommendation &&
        !recommendations.includes(check.recommendation)
      ) {
        recommendations.push(check.recommendation)
      }
    }
  }

  return {
    checks: allChecks,
    score,
    criticalIssues,
    recommendations,
  }
}
