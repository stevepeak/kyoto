import { analyzeStagingSuggestions } from '@app/agents'
import { type LanguageModel } from 'ai'

import { type CommitPlan } from './commit-plan'

export async function createCommitPlan(args: {
  model: LanguageModel
  instructions?: string
  onProgress?: (message: string) => void
}): Promise<CommitPlan> {
  const { model, instructions, onProgress } = args

  const result = await analyzeStagingSuggestions({
    scope: { type: 'changes' },
    instructions,
    options: {
      model,
      progress: (message) => {
        onProgress?.(message)
      },
    },
  })

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    steps: result.suggestions
      .map((s) => ({
        order: s.order,
        commitMessage: s.commitMessage,
        files: s.files,
        reasoning: s.reasoning,
      }))
      .sort((a, b) => a.order - b.order),
  }
}
