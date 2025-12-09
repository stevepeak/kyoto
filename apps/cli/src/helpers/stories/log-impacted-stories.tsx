import { type DiffEvaluatorOutput } from '@app/schemas'
import { Text } from 'ink'

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
    logger(<Text color="grey">No stories impacted</Text>)
    return
  }

  logger('')
  logger(
    <Text color="#7ba179">
      {`${result.stories.length} ${result.stories.length === 1 ? 'story' : 'stories'} impacted:`}
    </Text>,
  )
  logger('')

  for (const story of result.stories) {
    const overlapColor = overlapColors[story.scopeOverlap] ?? 'grey'
    logger(<Text color={overlapColor}>{story.scopeOverlap.toUpperCase()}</Text>)
    logger(<Text color="white">{`  ${story.filePath}`}</Text>)
    logger(<Text color="grey">{`  ${story.reasoning}`}</Text>)
    logger('')
  }
}
