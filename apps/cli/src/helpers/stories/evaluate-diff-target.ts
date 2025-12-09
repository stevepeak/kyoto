import { agents, type DiffEvaluationTarget } from '@app/agents'
import { type DiffEvaluatorOutput } from '@app/schemas'

import { type Logger } from '../../types/logger'
import { createSearchStoriesTool } from '../tools/search-stories-tool'

/**
 * Evaluates the diff for candidate stories to change/add/test/etc.
 * @param target - Being a commit, staged, unstaged changes
 */
export async function evaluateDiff(
  target: DiffEvaluationTarget,
  logger: Logger,
): Promise<DiffEvaluatorOutput> {
  const searchStoriesTool = createSearchStoriesTool({ logger })
  const aiResult: DiffEvaluatorOutput = await agents.diffEvaluator.run({
    target,
    searchStoriesTool,
    options: {
      logger,
    },
  })
  return aiResult
}
