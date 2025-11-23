import {
  evaluationOutputSchema,
  decompositionOutputSchema,
  type DecompositionOutput,
  type TestStatus,
} from '@app/schemas'
import { runDecompositionAgent } from './agents/v3/story-decomposition'
import { main } from './agents/v3/story-evaluator'
import {
  runStoryDiscoveryAgent,
  storyDiscoveryOutputSchema,
  type StoryDiscoveryOutput,
} from './agents/v3/story-discovery'
import { getConfig } from '@app/config'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

export { type TestStatus as Status }
export { generateText } from './helpers/generate-text'
export { generateEmbedding } from './helpers/generate-embedding'
// Re-export for backward compatibility
export type { DecompositionOutput as DecompositionAgentResult }
export { getDaytonaSandbox } from './helpers/daytona'

export { getFileContentFromSandbox } from './tools/read-file-tool'
export { createTerminalCommandTool } from './tools/terminal-command-tool'
export { createReadFileTool } from './tools/read-file-tool'
export { createResolveLibraryTool } from './tools/context7-tool'
export { createSearchStoriesTool } from './tools/search-stories-tool'

// @ts-expect-error - model is not used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function model(
  gateway: 'openai' | 'openrouter' | 'ai-gateway',
  modelId: string,
): any {
  const env = getConfig()
  if (gateway === 'openai') {
    return createOpenAI({ apiKey: env.OPENAI_API_KEY })(modelId)
  }
  if (gateway === 'openrouter') {
    // ! DOES NOT WORK YET
    return createOpenRouter({
      apiKey: env.OPENROUTER_API_KEY,
      // extraBody: {
      //   reasoning: {
      //     max_tokens: 10,
      //   },
      // },
    })(modelId)
  }
  if (gateway === 'ai-gateway') {
    return modelId
  }
  throw new Error(`Unsupported provider: ${gateway}`)
}

export const agents = {
  decomposition: {
    id: 'story-decomposition-v3',
    version: 'v3',
    schema: decompositionOutputSchema,
    run: runDecompositionAgent,
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
  discovery: {
    id: 'story-discovery-v3',
    version: 'v3',
    schema: storyDiscoveryOutputSchema,
    run: runStoryDiscoveryAgent,
    options: {
      maxSteps: 30, // Allow more steps for discovery
      model: 'openai/gpt-5-mini',
    },
  },
} as const

// Re-export discovery types and schema
export type { StoryDiscoveryOutput }
export { storyDiscoveryOutputSchema }

// Export semantic story matcher
export {
  SemanticStoryMatcher,
  findSimilarStories,
  findMostSimilarStory,
  type StoryForMatching,
  type SemanticMatchResult,
} from './helpers/semantic-story-matcher'
