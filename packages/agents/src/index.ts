import {
  diffEvaluatorOutputSchema,
  discoveryAgentOutputSchema,
  evaluationOutputSchema,
  type TestStatus,
} from '@app/schemas'
import z from 'zod'

import { compositionAgentOutputSchema } from '../../schemas/src/story-flow'
import { generateChangelogSummary } from './agents/v3/changelog-summary'
import {
  evaluateDiff,
  type DiffEvaluationTarget,
} from './agents/v3/diff-evaluator'
import { extractScope } from './agents/v3/scope-extraction'
import { runStoryCheckAgent } from './agents/v3/story-check'
import { runCompositionAgent } from './agents/v3/story-composition'
import { runStoryDiscoveryAgent } from './agents/v3/story-discovery'
import { runStoryEnrichmentAgent } from './agents/v3/story-enrichment'
import { main } from './agents/v3/story-evaluator'
import {
  findImpactedStories,
  storyImpactOutputSchema,
} from './agents/v3/story-impact'
import { rewriteStoryForChanges } from './agents/v3/story-rewrite'

export { type TestStatus as Status }
export { generateText } from './helpers/generate-text'
export { generateEmbedding } from './helpers/generate-embedding'
export { runStoryCheckAgent } from './agents/v3/story-check'
export { runStoryEnrichmentAgent } from './agents/v3/story-enrichment'
export type { DiffEvaluationTarget }

type Agent<TSchema extends z.ZodSchema = z.ZodSchema> = {
  id: string
  version: string
  schema: TSchema
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run: (options: any) => Promise<z.infer<TSchema>>
  options: {
    maxSteps: number
    model: string
    cacheOptions?: {
      enabled: boolean
      invalidationStrategy: 'step' | 'assertion'
    }
  }
}

type AgentsConfig = {
  composition: Agent
  evaluation: Agent
  discovery: Agent
  storyCheck: Agent
  storyEnrichment: Agent
  rewrite: Agent
  impact: Agent
  changelogSummary: Agent
  scopeExtraction: Agent
  diffEvaluator: Agent
}

export const agents: AgentsConfig = {
  discovery: {
    id: 'story-discovery-v3',
    version: 'v3',
    schema: discoveryAgentOutputSchema,
    run: runStoryDiscoveryAgent,
    options: {
      maxSteps: 30, // Allow more steps for discovery
      model: 'openai/gpt-5-mini',
    },
  },
  storyCheck: {
    id: 'story-check-v3',
    version: 'v3',
    schema: z.boolean(),
    run: runStoryCheckAgent,
    options: {
      maxSteps: 10,
      model: 'openai/gpt-5-mini',
    },
  },
  storyEnrichment: {
    id: 'story-enrichment-v3',
    version: 'v3',
    schema: z.object({
      story: z.any(), // DiscoveredStory schema
    }),
    run: runStoryEnrichmentAgent,
    options: {
      maxSteps: 20,
      model: 'openai/gpt-5-mini',
    },
  },
  composition: {
    id: 'story-composition-v3',
    version: 'v3',
    schema: compositionAgentOutputSchema,
    run: runCompositionAgent,
    options: {
      maxSteps: 15, // typically ends in 3-5 steps
      model: 'openai/gpt-5-mini',
    },
  },
  evaluation: {
    id: 'story-evaluation-v3',
    version: 'v3',
    schema: evaluationOutputSchema,
    run: main,
    options: {
      maxSteps: 50,
      // * Examples - Vercel AI
      model: 'openai/gpt-5-mini',
      // ! DOES NOT WORK YET * Examples - OpenRouter
      // model: model('openrouter', 'anthropic/claude-sonnet-4.5'),
      // model: model('openrouter', 'openai/gpt-5.1-codex-mini'),
      // * Examples - OpenAI
      // model: model('openai', 'gpt-5-mini'),
      cacheOptions: {
        enabled: true,
        invalidationStrategy: 'step' as const, // 'step' | 'assertion'
      },
    },
  },
  rewrite: {
    id: 'story-rewrite-v3',
    version: 'v3',
    schema: z.string(),
    run: rewriteStoryForChanges,
    options: {
      maxSteps: 20,
      model: 'openai/gpt-5-mini',
    },
  },
  impact: {
    id: 'story-impact-v3',
    version: 'v3',
    schema: storyImpactOutputSchema,
    run: findImpactedStories,
    options: {
      maxSteps: 30,
      model: 'openai/gpt-5-mini',
    },
  },
  changelogSummary: {
    id: 'changelog-summary-v3',
    version: 'v3',
    schema: z.string(),
    run: generateChangelogSummary,
    options: {
      maxSteps: 15,
      model: 'openai/gpt-5-mini',
    },
  },
  scopeExtraction: {
    id: 'scope-extraction-v3',
    version: 'v3',
    schema: z.array(z.string()),
    run: extractScope,
    options: {
      maxSteps: 1,
      model: 'openai/gpt-4o-mini',
    },
  },
  /**
   * Review diff for candidate stories impacted by the changes
   */
  diffEvaluator: {
    id: 'diff-evaluator-v3',
    version: 'v3',
    schema: diffEvaluatorOutputSchema,
    run: evaluateDiff,
    options: {
      maxSteps: 10,
      model: 'openai/gpt-5-mini',
    },
  },
}
