import { type securityAuditCheckItemSchema } from '@app/agents'
import { getConfig } from '@app/config'
import { createDb, eq, schema } from '@app/db'
import { ensureOpenRouterApiKey } from '@app/openrouter'
import { extractErrorMessage } from '@app/utils'
import { logger, streams, task } from '@trigger.dev/sdk'
import { type z } from 'zod'

import { auditTestTask, type AuditTestTaskInput } from './audit-test-task'

type SecurityAuditTaskInput = {
  runId: string
  auditId: string
  targetUrl: string
}

type SecurityAuditTaskOutput = {
  success: boolean
  sessionId: string | null
  sessionRecordingUrl: string | null
  error: string | null
}

export const securityAuditTask = task({
  id: 'security-audit',
  maxDuration: 60 * 15, // 15 minutes timeout
  run: async (
    input: SecurityAuditTaskInput,
  ): Promise<SecurityAuditTaskOutput> => {
    const { runId, auditId, targetUrl } = input

    logger.log('Starting security audit task', { runId, auditId })

    const config = getConfig()
    const db = createDb({ databaseUrl: config.DATABASE_URL })

    // Fetch audit info
    const audit = await db.query.securityAudits.findFirst({
      where: eq(schema.securityAudits.id, auditId),
    })

    if (!audit) {
      throw new Error(`Security audit not found: ${auditId}`)
    }

    // Update run status to running
    await db
      .update(schema.securityAuditRuns)
      .set({ status: 'running', updatedAt: new Date() })
      .where(eq(schema.securityAuditRuns.id, runId))

    try {
      // Get user's OpenRouter API key
      const userApiKey = await ensureOpenRouterApiKey({
        db,
        userId: audit.userId,
      })

      const modelName = 'openai/gpt-5-mini' // TODO: Make configurable

      void streams.append(
        'progress',
        'Starting comprehensive security audit...',
      )

      // Set up code analysis context if repoId exists
      // TODO: Implement repo cloning and context setup
      // For now, code analysis sub-tasks won't run if context is not set up
      type CodeAnalysisContext = {
        gitRoot: string
        scope: { type: 'unstaged' }
        scopeContent: {
          filePaths: string[]
          diffs: Record<string, string>
          fileContents: Record<string, string>
        }
        userApiKey: string
        modelName: string
        github?: {
          owner: string
          repo: string
          sha: string
          token: string
        }
      }

      // TODO: Implement repo cloning to set up context
      // const repo = await db.query.repos.findFirst({ where: eq(schema.repos.id, audit.repoId) })
      // if (repo) { codeAnalysisContext = await setupCodeAnalysisContext(repo) }
      // eslint-disable-next-line prefer-const
      let codeAnalysisContext: CodeAnalysisContext | null = null

      // Determine which sub-tasks to run
      const subTasks: {
        payload: AuditTestTaskInput
      }[] = []

      // Browser audits (if targetUrl is provided)
      if (targetUrl) {
        const browserAuditPayload = {
          auditName: '',
          targetUrl,
          userApiKey,
          modelName,
          maxSteps: 50,
        }

        subTasks.push(
          {
            payload: { ...browserAuditPayload, auditName: 'browser-transport' },
          },
          {
            payload: { ...browserAuditPayload, auditName: 'browser-headers' },
          },
          {
            payload: { ...browserAuditPayload, auditName: 'browser-cookies' },
          },
          {
            payload: { ...browserAuditPayload, auditName: 'browser-storage' },
          },
          {
            payload: { ...browserAuditPayload, auditName: 'browser-console' },
          },
        )

        // CLI audit requires both targetUrl and codeAnalysisContext
        if (codeAnalysisContext !== null) {
          const ctx = codeAnalysisContext as CodeAnalysisContext
          subTasks.push({
            payload: {
              auditName: 'cli-audit',
              targetUrl,
              gitRoot: ctx.gitRoot,
              scope: ctx.scope,
              scopeContent: ctx.scopeContent,
              userApiKey: ctx.userApiKey,
              modelName: ctx.modelName,
              maxSteps: 50,
              github: ctx.github,
            },
          })
        }
      }

      // Code analysis audits (if context is set up)
      if (codeAnalysisContext !== null) {
        const ctx = codeAnalysisContext as CodeAnalysisContext
        const codeAuditPayload = {
          auditName: '',
          gitRoot: ctx.gitRoot,
          scope: ctx.scope,
          scopeContent: ctx.scopeContent,
          userApiKey: ctx.userApiKey,
          modelName: ctx.modelName,
          maxSteps: 50,
          github: ctx.github,
        }

        subTasks.push(
          {
            payload: { ...codeAuditPayload, auditName: 'code-backend' },
          },
          {
            payload: { ...codeAuditPayload, auditName: 'code-frontend' },
          },
          {
            payload: { ...codeAuditPayload, auditName: 'code-database' },
          },
          {
            payload: { ...codeAuditPayload, auditName: 'code-infrastructure' },
          },
          {
            payload: { ...codeAuditPayload, auditName: 'code-dependency' },
          },
        )
      }

      if (subTasks.length === 0) {
        throw new Error(
          'No sub-tasks to run. Provide targetUrl for browser audits or set up codeAnalysisContext for code analysis.',
        )
      }

      void streams.append(
        'progress',
        `Spawning ${subTasks.length} security audit sub-tasks...`,
      )

      // Spawn all sub-tasks and wait for completion
      const batchResult = await auditTestTask.batchTriggerAndWait(subTasks)

      // Aggregate results from all sub-tasks, grouped by audit name
      const agents: {
        agent: string
        status: 'pass' | 'fail' | 'warning'
        checks: z.infer<typeof securityAuditCheckItemSchema>[]
        logs: string[]
      }[] = []
      const allChecks: z.infer<typeof securityAuditCheckItemSchema>[] = []
      const sessionIds: string[] = []
      const sessionRecordingUrls: string[] = []
      const errors: string[] = []

      for (let i = 0; i < batchResult.runs.length; i++) {
        const run = batchResult.runs[i]
        const subTask = subTasks[i]
        const auditName = subTask?.payload.auditName ?? 'unknown'

        if (run.ok) {
          const output = run.output as {
            checks: z.infer<typeof securityAuditCheckItemSchema>[]
            sessionId?: string | null
            sessionRecordingUrl?: string | null
            error?: string | null
          }

          allChecks.push(...output.checks)

          // Determine agent status from checks
          const hasFail = output.checks.some((c) => c.status === 'fail')
          const hasWarning = output.checks.some((c) => c.status === 'warning')
          const agentStatus: 'pass' | 'fail' | 'warning' = hasFail
            ? 'fail'
            : hasWarning
              ? 'warning'
              : 'pass'

          agents.push({
            agent: auditName,
            status: agentStatus,
            checks: output.checks,
            logs: output.error ? [output.error] : [],
          })

          if (output.sessionId) {
            sessionIds.push(output.sessionId)
          }
          if (output.sessionRecordingUrl) {
            sessionRecordingUrls.push(output.sessionRecordingUrl)
          }
          if (output.error) {
            errors.push(output.error)
          }
        } else {
          const errorMsg =
            run.error instanceof Error
              ? run.error.message
              : String(run.error) || 'Unknown error'
          errors.push(`Sub-task ${run.id} failed: ${errorMsg}`)

          // Add failed agent to results
          agents.push({
            agent: auditName,
            status: 'fail',
            checks: [],
            logs: [errorMsg],
          })

          logger.error('Sub-task failed', {
            runId: run.id,
            error: run.error,
          })
        }
      }

      // Calculate score
      const totalChecks = allChecks.length
      const passedChecks = allChecks.filter((c) => c.status === 'pass').length
      const score =
        totalChecks > 0
          ? `${Math.round((passedChecks / totalChecks) * 100)}%`
          : '0%'

      // Collect critical issues
      const criticalIssues: {
        category: string
        check: string
        details?: string
        recommendation?: string
      }[] = []

      for (const check of allChecks) {
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

      // Collect recommendations
      const recommendations: string[] = []
      for (const check of allChecks) {
        if (
          (check.status === 'fail' || check.status === 'warning') &&
          check.recommendation &&
          !recommendations.includes(check.recommendation)
        ) {
          recommendations.push(check.recommendation)
        }
      }

      // Use first session recording URL (or null if none)
      const sessionRecordingUrl =
        sessionRecordingUrls.length > 0 ? sessionRecordingUrls[0] : null
      const sessionId = sessionIds.length > 0 ? sessionIds[0] : null

      // Combine errors if any
      const combinedError = errors.length > 0 ? errors.join('; ') : null

      void streams.append('progress', 'Security audit completed successfully!')

      // Update run with results structured as { agents: [...] }
      await db
        .update(schema.securityAuditRuns)
        .set({
          status: 'completed',
          results: { agents },
          score,
          criticalIssues,
          recommendations,
          sessionId,
          sessionRecordingUrl,
          error: combinedError,
          updatedAt: new Date(),
        })
        .where(eq(schema.securityAuditRuns.id, runId))

      return {
        success: true,
        sessionId,
        sessionRecordingUrl,
        error: combinedError,
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error)

      // Extract detailed error information for logging
      const errorDetails: Record<string, unknown> = {}
      if (error instanceof Error) {
        errorDetails.name = error.name
        errorDetails.message = error.message
        errorDetails.stack = error.stack
        errorDetails.cause = error.cause

        // Extract response details if available (common in AI SDK errors)
        const errorObj = error as unknown as Record<string, unknown>
        if (
          'response' in errorObj &&
          typeof errorObj.response === 'object' &&
          errorObj.response !== null
        ) {
          const response = errorObj.response as Record<string, unknown>
          errorDetails.response = {
            status: response.status,
            statusText: response.statusText,
            statusCode: response.statusCode,
            body: response.body,
            data: response.data,
            error: response.error,
            headers: response.headers,
          }
        }
        if ('data' in errorObj) {
          errorDetails.data = errorObj.data
        }
        if ('status' in errorObj) {
          errorDetails.status = errorObj.status
        }
        if ('statusCode' in errorObj) {
          errorDetails.statusCode = errorObj.statusCode
        }
      } else {
        errorDetails.raw = error
      }

      logger.error('Security audit task failed', {
        error: errorMessage,
        errorDetails,
      })

      await db
        .update(schema.securityAuditRuns)
        .set({
          status: 'failed',
          error: errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(schema.securityAuditRuns.id, runId))

      void streams.append('progress', `Security audit failed: ${errorMessage}`)

      return {
        success: false,
        sessionId: null,
        sessionRecordingUrl: null,
        error: errorMessage,
      }
    }
  },
})
