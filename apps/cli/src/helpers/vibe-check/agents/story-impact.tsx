import { Text } from 'ink'

import { evaluateDiff } from '../../stories/evaluate-diff-target'
import { logImpactedStories } from '../../stories/log-impacted-stories'
import {
  type VibeCheckAgent,
  type VibeCheckFinding,
  type VibeCheckResult,
} from '../types'

const overlapSeverity: Record<string, VibeCheckFinding['severity']> = {
  significant: 'error',
  moderate: 'warn',
  low: 'info',
}

export const storyImpactAgent: VibeCheckAgent = {
  id: 'story-impact',
  label: 'Story impact',
  description: 'Run Kyoto AI to understand which stories are touched',
  async run(context, reporter): Promise<VibeCheckResult> {
    reporter.progress('Evaluating diff with Kyoto...')
    const result = await evaluateDiff({ type: context.target }, context.logger)

    if (result.text) {
      context.logger(
        <Text color="grey">
          {`Kyoto reasoning: ${result.text.substring(0, 240)}${result.text.length > 240 ? '…' : ''}`}
        </Text>,
      )
    }

    logImpactedStories(result, context.logger)

    if (result.stories.length === 0) {
      return {
        status: 'pass',
        summary: 'No impacted stories',
        findings: [],
      }
    }

    const findings: VibeCheckFinding[] = result.stories.map((story) => ({
      message: `${story.scopeOverlap.toUpperCase()} overlap in ${story.filePath}`,
      path: story.filePath,
      suggestion: story.reasoning,
      severity: overlapSeverity[story.scopeOverlap] ?? 'info',
    }))

    const severity = findings.some((finding) => finding.severity === 'error')
      ? 'fail'
      : 'warn'

    return {
      status: severity,
      summary: `${findings.length} impacted stor${findings.length === 1 ? 'y' : 'ies'}`,
      findings,
    }
  },
}
