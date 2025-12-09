import { type DiffEvaluatorOutput } from '@app/schemas'

import { type Logger } from '../../types/logger'

const overlapColors: Record<string, string> = {
  significant: '#c27a52',
  moderate: '#d4a574',
  low: 'grey',
}

export function logImpactedStories(
  result: DiffEvaluatorOutput,
  logger: Logger,
): void {
  if (result.stories.length === 0) {
    logger('No stories impacted', 'grey')
    return
  }

  logger('')
  logger(
    `${result.stories.length} ${result.stories.length === 1 ? 'story' : 'stories'} impacted:`,
    '#7ba179',
  )
  logger('')

  for (const story of result.stories) {
    const overlapColor = overlapColors[story.scopeOverlap] ?? 'grey'
    logger(story.scopeOverlap.toUpperCase(), overlapColor)
    logger(`  ${story.filePath}`, 'white')
    logger(`  ${story.reasoning}`, 'grey')
    logger('')
  }
}
