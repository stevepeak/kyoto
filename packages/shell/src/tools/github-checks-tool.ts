import { Octokit } from '@octokit/rest'
import { type Tool, tool } from 'ai'
import { z } from 'zod'

type GitHubContext = {
  owner: string
  repo: string
  sha: string
  token: string
}

// Store check run IDs per agent name
const checkRunStore = new Map<string, number>()

const createCheckRunSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .describe(
      'Name of the check run (e.g., "Bug Detection", "Code Organization")',
    ),
  status: z
    .enum(['queued', 'in_progress', 'completed'])
    .describe('Status of the check run'),
})

const updateCheckRunSchema = z.object({
  checkRunId: z.number().describe('ID of the check run to update'),
  status: z
    .enum(['completed'])
    .describe('Status must be "completed" when updating'),
  conclusion: z
    .enum(['success', 'failure', 'neutral'])
    .describe('Conclusion of the check run'),
  summary: z.string().max(65535).describe('Summary of the check run results'),
})

const addAnnotationSchema = z.object({
  checkRunId: z.number().describe('ID of the check run to add annotation to'),
  path: z.string().min(1).describe('File path relative to repository root'),
  startLine: z
    .number()
    .int()
    .positive()
    .describe('Starting line number (1-indexed)'),
  endLine: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Ending line number (1-indexed, defaults to startLine)'),
  annotationLevel: z
    .enum(['notice', 'warning', 'failure'])
    .describe('Level of the annotation'),
  message: z.string().min(1).max(65535).describe('Annotation message'),
  title: z
    .string()
    .max(255)
    .optional()
    .describe('Optional title for the annotation'),
})

// Batch annotations to avoid GitHub's 50-per-request limit
const annotationBatches = new Map<
  number,
  z.infer<typeof addAnnotationSchema>[]
>()

async function flushAnnotations(
  octokit: Octokit,
  owner: string,
  repo: string,
  checkRunId: number,
): Promise<void> {
  const batch = annotationBatches.get(checkRunId)
  if (!batch || batch.length === 0) {
    return
  }

  // Clear the batch before sending to avoid duplicates
  annotationBatches.set(checkRunId, [])

  // Convert to GitHub API format
  const annotations = batch.map((ann) => ({
    path: ann.path,
    start_line: ann.startLine,
    end_line: ann.endLine ?? ann.startLine,
    annotation_level: ann.annotationLevel,
    message: ann.message,
    title: ann.title ?? undefined,
  }))

  // GitHub allows max 50 annotations per request
  const chunkSize = 50
  for (let i = 0; i < annotations.length; i += chunkSize) {
    const chunk = annotations.slice(i, i + chunkSize)
    await octokit.rest.checks.update({
      owner,
      repo,
      check_run_id: checkRunId,
      output: {
        title: 'Kyoto Vibe Check',
        summary: `Found ${annotations.length} issue(s)`,
        annotations: chunk,
      },
    })
  }
}

export function createGitHubChecksTool(
  github: GitHubContext,
  logger?: (message: string) => void,
): Tool {
  const octokit = new Octokit({ auth: github.token })

  return tool({
    name: 'githubChecks',
    description:
      'Create and manage GitHub check runs and annotations. Use this to report findings directly on code lines in GitHub. Each agent should create one check run with its name, then add annotations as it finds issues.',
    inputSchema: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('createCheckRun'),
        ...createCheckRunSchema.shape,
      }),
      z.object({
        action: z.literal('updateCheckRun'),
        ...updateCheckRunSchema.shape,
      }),
      z.object({
        action: z.literal('addAnnotation'),
        ...addAnnotationSchema.shape,
      }),
      z.object({
        action: z.literal('flushAnnotations'),
        checkRunId: z
          .number()
          .describe('ID of the check run to flush annotations for'),
      }),
    ]),
    execute: async (input) => {
      try {
        if (input.action === 'createCheckRun') {
          if (logger) {
            logger(`Creating check run: ${input.name}`)
          }

          const response = await octokit.rest.checks.create({
            owner: github.owner,
            repo: github.repo,
            name: input.name,
            head_sha: github.sha,
            status: input.status,
            ...(input.status === 'completed'
              ? { conclusion: 'success' as const }
              : {}),
          })

          const checkRunId = response.data.id
          checkRunStore.set(input.name, checkRunId)
          annotationBatches.set(checkRunId, [])

          return JSON.stringify({
            success: true,
            checkRunId,
            message: `Check run "${input.name}" created with ID ${checkRunId}`,
          })
        }

        if (input.action === 'updateCheckRun') {
          if (logger) {
            logger(`Updating check run ${input.checkRunId}`)
          }

          // Flush any pending annotations before updating
          await flushAnnotations(
            octokit,
            github.owner,
            github.repo,
            input.checkRunId,
          )

          await octokit.rest.checks.update({
            owner: github.owner,
            repo: github.repo,
            check_run_id: input.checkRunId,
            status: input.status,
            conclusion: input.conclusion,
            output: {
              title: 'Kyoto Vibe Check',
              summary: input.summary,
            },
          })

          return JSON.stringify({
            success: true,
            message: `Check run ${input.checkRunId} updated`,
          })
        }

        if (input.action === 'addAnnotation') {
          // Add to batch instead of sending immediately
          const batch = annotationBatches.get(input.checkRunId) ?? []
          batch.push(input)
          annotationBatches.set(input.checkRunId, batch)

          // Auto-flush if batch is getting large (close to 50 limit)
          if (batch.length >= 45) {
            await flushAnnotations(
              octokit,
              github.owner,
              github.repo,
              input.checkRunId,
            )
          }

          return JSON.stringify({
            success: true,
            message: `Annotation queued for check run ${input.checkRunId}`,
            batched: true,
          })
        }

        if (input.action === 'flushAnnotations') {
          await flushAnnotations(
            octokit,
            github.owner,
            github.repo,
            input.checkRunId,
          )
          return JSON.stringify({
            success: true,
            message: `Annotations flushed for check run ${input.checkRunId}`,
          })
        }

        return JSON.stringify({
          success: false,
          error: 'Unknown action',
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error occurred'
        if (logger) {
          logger(`GitHub Checks API error: ${message}`)
        }
        return JSON.stringify({
          success: false,
          error: message,
        })
      }
    },
  })
}
