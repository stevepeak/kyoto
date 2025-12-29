import {
  analyzeBackendSecurity,
  analyzeDatabaseSecurity,
  analyzeDependencySecurity,
  analyzeFrontendSecurity,
  analyzeInfrastructureSecurity,
  runBrowserConsoleAudit,
  runBrowserCookieAudit,
  runBrowserHeadersAudit,
  runBrowserStorageAudit,
  runBrowserTransportSecurityAudit,
  runCliSecurityAudit,
  securityAuditCheckItemSchema,
} from '@app/agents'
import { getConfig } from '@app/config'
import {
  type VibeCheckContext,
  type VibeCheckScope,
  type ScopeContext,
} from '@app/types'
import { extractErrorMessage } from '@app/utils'
import { Stagehand } from '@browserbasehq/stagehand'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { logger, task } from '@trigger.dev/sdk'
import { z } from 'zod'

export type AuditTestTaskInput = {
  auditName: string
  // Browser audit inputs
  targetUrl?: string
  // Code audit inputs
  gitRoot?: string
  scope?: VibeCheckScope
  scopeContent?: ScopeContext
  github?: {
    owner: string
    repo: string
    sha: string
    token: string
  }
  // Common inputs
  userApiKey: string
  modelName: string
  maxSteps?: number
}

type AuditTestTaskOutput = {
  checks: z.infer<typeof securityAuditCheckItemSchema>[]
  sessionId: string | null
  sessionRecordingUrl: string | null
  error: string | null
}

export const auditTestTask = task({
  id: 'security-audit-test',
  maxDuration: 60 * 10, // 10 minutes timeout
  queue: {
    concurrencyLimit: 1,
  },
  run: async (input: AuditTestTaskInput): Promise<AuditTestTaskOutput> => {
    const {
      auditName,
      targetUrl,
      gitRoot,
      scope,
      scopeContent,
      github,
      userApiKey,
      modelName,
      maxSteps = 50,
    } = input

    logger.log('Starting security audit test', {
      auditName,
      targetUrl,
      gitRoot,
    })

    const config = getConfig()
    let stagehand: Stagehand | null = null

    try {
      const openrouter = createOpenRouter({
        apiKey: userApiKey,
      })
      const model = openrouter(modelName)

      // Determine if this audit needs browser context
      const needsBrowser =
        auditName.startsWith('browser-') || auditName === 'cli-audit'
      // Determine if this audit needs code context
      const needsCode =
        auditName.startsWith('code-') || auditName === 'cli-audit'

      // Set up browser context if needed
      if (needsBrowser && targetUrl) {
        stagehand = new Stagehand({
          env: 'BROWSERBASE',
          apiKey: config.BROWSERBASE_API_KEY,
          projectId: config.BROWSERBASE_PROJECT_ID,
          model: modelName,
          verbose: 1,
        })

        await stagehand.init()
        logger.log('Browser session initialized', {
          sessionId: stagehand.browserbaseSessionID,
        })
      }

      // Set up code context if needed
      let codeContext: VibeCheckContext | null = null
      if (needsCode && gitRoot && scope && scopeContent) {
        codeContext = {
          gitRoot,
          scope,
          scopeContent,
          model,
          github,
        }
      }

      // Run the appropriate audit based on audit name
      let checks: z.infer<typeof securityAuditCheckItemSchema>[] = []
      const now = new Date().toISOString()

      switch (auditName) {
        case 'browser-console': {
          if (!targetUrl || !stagehand) {
            throw new Error('browser-console audit requires targetUrl')
          }
          const result = await runBrowserConsoleAudit({
            instructions: targetUrl,
            browserContext: {
              stagehand,
              agent: stagehand.agent({
                model: modelName,
              }),
              onProgress: (message) => {
                logger.log('Console audit progress', { message })
              },
            },
            model,
            maxSteps,
          })
          checks = result.checks.map((check) => ({
            category: check.category,
            check: check.check,
            status: check.status,
            method: 'Browser automation',
            tool: 'Browserbase/Stagehand',
            date: now,
            finding: check.details || undefined,
            severity:
              check.status === 'fail'
                ? 'high'
                : check.status === 'warning'
                  ? 'medium'
                  : 'low',
            details: check.details || undefined,
            recommendation: check.recommendation || undefined,
          }))
          break
        }

        case 'browser-cookies': {
          if (!targetUrl || !stagehand) {
            throw new Error('browser-cookies audit requires targetUrl')
          }
          const result = await runBrowserCookieAudit({
            instructions: targetUrl,
            browserContext: {
              stagehand,
              agent: stagehand.agent({
                model: modelName,
              }),
              onProgress: (message) => {
                logger.log('Cookies audit progress', { message })
              },
            },
            model,
            maxSteps,
          })
          checks = result.checks.map((check) => ({
            category: check.category,
            check: check.check,
            status: check.status,
            method: 'Browser automation',
            tool: 'Browserbase/Stagehand',
            date: now,
            finding: check.details || undefined,
            severity:
              check.status === 'fail'
                ? 'high'
                : check.status === 'warning'
                  ? 'medium'
                  : 'low',
            details: check.details || undefined,
            recommendation: check.recommendation || undefined,
          }))
          break
        }

        case 'browser-headers': {
          if (!targetUrl || !stagehand) {
            throw new Error('browser-headers audit requires targetUrl')
          }
          const result = await runBrowserHeadersAudit({
            instructions: targetUrl,
            browserContext: {
              stagehand,
              agent: stagehand.agent({
                model: modelName,
              }),
              onProgress: (message) => {
                logger.log('Headers audit progress', { message })
              },
            },
            model,
            maxSteps,
          })
          checks = result.checks.map((check) => ({
            category: check.category,
            check: check.check,
            status: check.status,
            method: 'Browser automation',
            tool: 'Browserbase/Stagehand',
            date: now,
            finding: check.details || undefined,
            severity:
              check.status === 'fail'
                ? 'high'
                : check.status === 'warning'
                  ? 'medium'
                  : 'low',
            details: check.details || undefined,
            recommendation: check.recommendation || undefined,
          }))
          break
        }

        case 'browser-storage': {
          if (!targetUrl || !stagehand) {
            throw new Error('browser-storage audit requires targetUrl')
          }
          const result = await runBrowserStorageAudit({
            instructions: targetUrl,
            browserContext: {
              stagehand,
              agent: stagehand.agent({
                model: modelName,
              }),
              onProgress: (message) => {
                logger.log('Storage audit progress', { message })
              },
            },
            model,
            maxSteps,
          })
          checks = result.checks.map((check) => ({
            category: check.category,
            check: check.check,
            status: check.status,
            method: 'Browser automation',
            tool: 'Browserbase/Stagehand',
            date: now,
            finding: check.details || undefined,
            severity:
              check.status === 'fail'
                ? 'high'
                : check.status === 'warning'
                  ? 'medium'
                  : 'low',
            details: check.details || undefined,
            recommendation: check.recommendation || undefined,
          }))
          break
        }

        case 'browser-transport': {
          if (!targetUrl || !stagehand) {
            throw new Error('browser-transport audit requires targetUrl')
          }
          const result = await runBrowserTransportSecurityAudit({
            instructions: targetUrl,
            browserContext: {
              stagehand,
              agent: stagehand.agent({
                model: modelName,
              }),
              onProgress: (message) => {
                logger.log('Transport audit progress', { message })
              },
            },
            model,
            maxSteps,
          })
          checks = result.checks.map((check) => ({
            category: check.category,
            check: check.check,
            status: check.status,
            method: 'Browser automation',
            tool: 'Browserbase/Stagehand',
            date: now,
            finding: check.details || undefined,
            severity:
              check.status === 'fail'
                ? 'high'
                : check.status === 'warning'
                  ? 'medium'
                  : 'low',
            details: check.details || undefined,
            recommendation: check.recommendation || undefined,
          }))
          break
        }

        case 'code-backend': {
          if (!codeContext) {
            throw new Error(
              'code-backend audit requires gitRoot, scope, and scopeContent',
            )
          }
          const result = await analyzeBackendSecurity({
            context: codeContext,
            options: {
              maxSteps,
            },
          })
          checks = result.findings.map((finding) => {
            const status: z.infer<
              typeof securityAuditCheckItemSchema
            >['status'] =
              finding.severity === 'critical' || finding.severity === 'high'
                ? 'fail'
                : finding.severity === 'medium'
                  ? 'warning'
                  : 'pass'

            return {
              category: 'Backend Security',
              check: finding.message,
              status,
              method: 'Static code analysis',
              tool: 'AI code review',
              severity: finding.severity,
              details: finding.path,
              recommendation: finding.suggestion,
            }
          })
          break
        }

        case 'code-frontend': {
          if (!codeContext) {
            throw new Error(
              'code-frontend audit requires gitRoot, scope, and scopeContent',
            )
          }
          const result = await analyzeFrontendSecurity({
            context: codeContext,
            options: {
              maxSteps,
            },
          })
          checks = result.findings.map((finding) => {
            const status: z.infer<
              typeof securityAuditCheckItemSchema
            >['status'] =
              finding.severity === 'critical' || finding.severity === 'high'
                ? 'fail'
                : finding.severity === 'medium'
                  ? 'warning'
                  : 'pass'

            return {
              category: 'Frontend Security',
              check: finding.message,
              status,
              method: 'Static code analysis',
              tool: 'AI code review',
              severity: finding.severity,
              details: finding.path,
              recommendation: finding.suggestion,
            }
          })
          break
        }

        case 'code-database': {
          if (!codeContext) {
            throw new Error(
              'code-database audit requires gitRoot, scope, and scopeContent',
            )
          }
          const result = await analyzeDatabaseSecurity({
            context: codeContext,
            options: {
              maxSteps,
            },
          })
          checks = result.findings.map((finding) => {
            const status: z.infer<
              typeof securityAuditCheckItemSchema
            >['status'] =
              finding.severity === 'critical' || finding.severity === 'high'
                ? 'fail'
                : finding.severity === 'medium'
                  ? 'warning'
                  : 'pass'

            return {
              category: 'Data Security',
              check: finding.message,
              status,
              method: 'Static code analysis',
              tool: 'AI code review',
              severity: finding.severity,
              details: finding.path,
              recommendation: finding.suggestion,
            }
          })
          break
        }

        case 'code-infrastructure': {
          if (!codeContext) {
            throw new Error(
              'code-infrastructure audit requires gitRoot, scope, and scopeContent',
            )
          }
          const result = await analyzeInfrastructureSecurity({
            context: codeContext,
            options: {
              maxSteps,
            },
          })
          checks = result.findings.map((finding) => {
            const status: z.infer<
              typeof securityAuditCheckItemSchema
            >['status'] =
              finding.severity === 'critical' || finding.severity === 'high'
                ? 'fail'
                : finding.severity === 'medium'
                  ? 'warning'
                  : 'pass'

            return {
              category: 'Infrastructure Security',
              check: finding.message,
              status,
              method: 'Static code analysis',
              tool: 'AI code review',
              severity: finding.severity,
              details: finding.path,
              recommendation: finding.suggestion,
            }
          })
          break
        }

        case 'code-dependency': {
          if (!codeContext) {
            throw new Error(
              'code-dependency audit requires gitRoot, scope, and scopeContent',
            )
          }
          const result = await analyzeDependencySecurity({
            context: codeContext,
            options: {
              maxSteps,
            },
          })
          checks = result.findings.map((finding) => {
            const status: z.infer<
              typeof securityAuditCheckItemSchema
            >['status'] =
              finding.severity === 'critical' || finding.severity === 'high'
                ? 'fail'
                : finding.severity === 'medium'
                  ? 'warning'
                  : 'pass'

            return {
              category: 'Dependency Security',
              check: finding.message,
              status,
              method: finding.method,
              tool: finding.tool,
              finding: finding.finding,
              severity: finding.severity,
              details: finding.path,
              recommendation: finding.suggestion,
            }
          })
          break
        }

        case 'cli-audit': {
          if (!targetUrl || !codeContext) {
            throw new Error(
              'cli-audit requires both targetUrl and code context (gitRoot, scope, scopeContent)',
            )
          }
          const result = await runCliSecurityAudit({
            context: codeContext,
            options: {
              maxSteps,
            },
            targetUrl,
          })
          checks = result.checks.map((check) => ({
            category: check.category,
            check: check.check,
            status: check.status,
            method: check.method,
            tool: check.tool,
            date: now,
            finding: check.finding,
            severity: check.severity,
            details: check.details,
            recommendation: check.recommendation,
          }))
          break
        }

        default:
          throw new Error(`Unknown audit name: ${auditName}`)
      }

      const sessionId = stagehand?.browserbaseSessionID ?? null
      const sessionRecordingUrl = sessionId
        ? `https://www.browserbase.com/sessions/${sessionId}`
        : null

      return {
        checks,
        sessionId,
        sessionRecordingUrl,
        error: null,
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error)
      logger.error('Security audit test failed', {
        error: errorMessage,
        auditName,
        targetUrl,
        gitRoot,
      })

      return {
        checks: [],
        sessionId: stagehand?.browserbaseSessionID ?? null,
        sessionRecordingUrl: null,
        error: errorMessage,
      }
    } finally {
      if (stagehand) {
        await stagehand.close()
      }
    }
  },
})
