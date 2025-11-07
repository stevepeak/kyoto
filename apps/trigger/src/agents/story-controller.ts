import { pathToFileURL } from 'node:url'

import { createOpenAI } from '@ai-sdk/openai'

import {
  aggregateStoryOutcome,
  runStepReviewerAgent,
  runStoryDirectorPlanAgent,
  type StepReviewerAgentResult,
  type StoryDirectorPlan,
  type StoryStep,
} from './story-agents'
import {
  storyDirectorOutputSchema,
  type StepReviewerOutput,
  type StoryDirectorOutput,
} from './schemas'

import { parseEnv } from '@/helpers/env'
import type { SearchContext } from '@/tools'

const DEFAULT_MODEL_ID = 'gpt-4o-mini'
const DEFAULT_BRANCH = 'main'

interface StoryEvaluationContext extends SearchContext {
  story: string
  repoName?: string
  modelId?: string
  directorMaxSteps?: number
  reviewerMaxSteps?: number
}

interface ReviewedStep {
  step: StoryStep
  evaluation: StepReviewerOutput
  metrics: StepReviewerAgentResult
}

export interface StoryEvaluationResult {
  plan: StoryDirectorPlan
  reviewedSteps: ReviewedStep[]
  output: StoryDirectorOutput
  planStepsExecuted: number
  metrics: {
    totalReviewerToolCalls: number
    totalReviewerIterations: number
  }
}

function buildTraceFromSteps(
  steps: ReviewedStep[],
): StoryDirectorOutput['trace'] {
  const reasoning = steps.map((entry, index) => {
    return `Step ${index + 1} (${entry.evaluation.result}): ${entry.evaluation.trace.summary}`
  })

  const queries = steps.flatMap((entry) => entry.evaluation.trace.searchQueries)
  const uniqueQueries = Array.from(new Set(queries))

  const summaryLines = steps.map((entry, index) => {
    return `Step ${index + 1}: ${entry.evaluation.description}`
  })

  return {
    summary: summaryLines.join('\n'),
    reasoning,
    searchQueries: uniqueQueries,
  }
}

export async function evaluateStory(
  context: StoryEvaluationContext,
): Promise<StoryEvaluationResult> {
  const {
    story,
    modelId,
    directorMaxSteps,
    reviewerMaxSteps,
    ...searchContext
  } = context

  const env = parseEnv()
  const openAi = createOpenAI({ apiKey: env.OPENAI_API_KEY })
  const model = openAi(modelId ?? DEFAULT_MODEL_ID)

  const planResult = await runStoryDirectorPlanAgent(
    {
      model,
      maxSteps: directorMaxSteps,
    },
    story,
  )

  console.log('🎩 Story director plan result', { plan: planResult })

  const reviewedSteps: ReviewedStep[] = []

  for (const step of planResult.plan.steps) {
    const evaluation = await runStepReviewerAgent(
      {
        ...searchContext,
        model,
        maxSteps: reviewerMaxSteps,
      },
      story,
      {
        step,
        priorSteps: reviewedSteps.map((entry) => entry.evaluation),
      },
    )

    console.log('🙇 Step reviewer result', {
      step,
      evaluation,
    })

    reviewedSteps.push({
      step,
      evaluation: evaluation.output,
      metrics: evaluation,
    })
  }

  const stepOutputs = reviewedSteps.map((entry) => entry.evaluation)
  const aggregation = aggregateStoryOutcome({
    story,
    steps: stepOutputs,
  })

  const trace = buildTraceFromSteps(reviewedSteps)

  const output: StoryDirectorOutput = storyDirectorOutputSchema.parse({
    result: aggregation.conclusion,
    story,
    steps: stepOutputs,
    trace,
  })

  const totalReviewerToolCalls = reviewedSteps.reduce(
    (sum, entry) => sum + entry.metrics.toolCalls,
    0,
  )

  const totalReviewerIterations = reviewedSteps.reduce(
    (sum, entry) => sum + entry.metrics.stepsExecuted,
    0,
  )

  return {
    plan: planResult.plan,
    reviewedSteps,
    output,
    planStepsExecuted: planResult.stepsExecuted,
    metrics: {
      totalReviewerToolCalls,
      totalReviewerIterations,
    },
  }
}

function parseArgs(argv: string[]): {
  story: string | null
  repoId: string | null
  branch: string | null
  modelId: string | null
} {
  const args = argv.slice(2)
  let story: string | null = null
  let repoId: string | null = null
  let branch: string | null = null
  let modelId: string | null = null

  for (const arg of args) {
    if (arg.startsWith('--repoId=')) {
      repoId = arg.replace('--repoId=', '').trim() || null
    } else if (arg.startsWith('--branch=')) {
      branch = arg.replace('--branch=', '').trim() || null
    } else if (arg.startsWith('--model=')) {
      modelId = arg.replace('--model=', '').trim() || null
    } else if (!story) {
      story = arg.trim()
    }
  }

  return { story, repoId, branch, modelId }
}

async function runCli(): Promise<void> {
  const { story, repoId, branch, modelId } = parseArgs(process.argv)

  if (!story) {
    console.error('❌ Story text is required as the first argument.')
    process.exit(1)
  }

  if (!repoId) {
    console.error('❌ --repoId=<id> is required to perform code search.')
    process.exit(1)
  }

  const evaluation = await evaluateStory({
    story,
    repoId,
    branch: branch ?? DEFAULT_BRANCH,
    modelId: modelId ?? undefined,
  })

  console.log(JSON.stringify(evaluation, null, 2))
}

const cliEntryHref =
  typeof process.argv[1] === 'string'
    ? pathToFileURL(process.argv[1]).href
    : null

if (cliEntryHref === import.meta.url) {
  runCli().catch((error) => {
    console.error('Story evaluation failed', error)
    process.exit(1)
  })
}
