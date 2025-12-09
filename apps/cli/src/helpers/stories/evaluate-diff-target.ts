import { agents, type DiffEvaluationTarget } from '@app/agents'
import { type DiffEvaluatorOutput } from '@app/schemas'
import {
  getChangedTsFiles,
  getStagedTsFiles,
  getUnstagedTsFiles,
} from '@app/shell'

import { createSearchStoriesTool } from '../tools/search-stories-tool'
import { findStoriesByTrace } from './find-stories-by-trace'

async function deterministicCheck(
  changedTsFiles: string[],
): Promise<DiffEvaluatorOutput | null> {
  if (changedTsFiles.length === 0) {
    return null
  }

  const matchedStoryPaths = await findStoriesByTrace({
    files: changedTsFiles,
  })

  if (matchedStoryPaths.length > 0) {
    const matchedStories: DiffEvaluatorOutput['stories'] =
      matchedStoryPaths.map((filePath) => ({
        filePath,
        scopeOverlap: 'significant',
        reasoning: 'Changed file matches story code reference',
      }))

    return {
      text: '',
      stories: matchedStories,
    }
  }

  return null
}

async function getChangedTypeScriptFiles(
  target: DiffEvaluationTarget,
  gitRoot: string,
): Promise<string[]> {
  if (target.type === 'commit') {
    return await getChangedTsFiles(target.commitSha, gitRoot)
  }

  if (target.type === 'staged') {
    return await getStagedTsFiles(gitRoot)
  }

  return await getUnstagedTsFiles(gitRoot)
}

export async function evaluateDiffTarget(
  target: DiffEvaluationTarget,
  gitRoot: string,
  options?: {
    onProgress?: (message: string) => void
  },
): Promise<DiffEvaluatorOutput> {
  const changedTsFiles = await getChangedTypeScriptFiles(target, gitRoot)
  const deterministicResult = await deterministicCheck(changedTsFiles)

  if (deterministicResult === null) {
    return {
      text: 'No relevant files changed',
      stories: [],
    }
  }

  const searchStoriesTool = createSearchStoriesTool()
  const aiResult: DiffEvaluatorOutput = await agents.diffEvaluator.run({
    target,
    searchStoriesTool,
    options: {
      maxSteps: agents.diffEvaluator.options.maxSteps,
      onProgress: options?.onProgress,
    },
  })

  if (deterministicResult.stories.length > 0) {
    return {
      text: aiResult.text,
      stories: [...deterministicResult.stories, ...aiResult.stories],
    }
  }

  return aiResult
}
