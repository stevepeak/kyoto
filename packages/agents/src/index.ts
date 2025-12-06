import z from 'zod'

import {
  evaluationOutputSchema,
  type TestStatus,
  discoveryAgentOutputSchema,
} from '@app/schemas'
import { runCompositionAgent } from './agents/v3/story-composition.js'
import { main } from './agents/v3/story-evaluator.js'
import { runStoryDiscoveryAgent } from './agents/v3/story-discovery.js'
import { rewriteStoryForChanges } from './agents/v3/story-rewrite.js'
import {
  findImpactedStories,
  storyImpactOutputSchema,
} from './agents/v3/story-impact.js'
import { generateChangelogSummary } from './agents/v3/changelog-summary.js'
import { extractScope } from './agents/v3/scope-extraction.js'
import { evaluateCommit } from './agents/v3/commit-evaluator.js'
import { compositionAgentOutputSchema } from '../../schemas/src/story-flow.js'

export { type TestStatus as Status }
export { generateText } from './helpers/generate-text.js'
export { generateEmbedding } from './helpers/generate-embedding.js'

type Agent<TSchema extends z.ZodSchema = z.ZodSchema> = {
  id: string
  version: string
  schema: TSchema
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
  rewrite: Agent
  impact: Agent
  changelogSummary: Agent
  scopeExtraction: Agent
  commitEvaluator: Agent
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
  commitEvaluator: {
    id: 'commit-evaluator-v3',
    version: 'v3',
    schema: z.string(),
    run: evaluateCommit,
    options: {
      maxSteps: 10,
      model: 'openai/gpt-5-mini',
    },
  },
}
