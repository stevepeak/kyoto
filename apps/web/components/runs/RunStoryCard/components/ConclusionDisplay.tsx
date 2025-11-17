import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { getConclusionStyles, getEvidenceConclusionDisplay } from '../../utils'
import type { EvaluationOutput } from '@app/schemas'
import { EvidenceList } from './EvidenceList'

interface ConclusionDisplayProps {
  analysis: EvaluationOutput
  storyResultId: string
  orgName: string
  repoName: string
  commitSha: string | null
}

export function ConclusionDisplay({
  analysis,
  storyResultId,
  orgName,
  repoName,
  commitSha,
}: ConclusionDisplayProps) {
  const status = analysis.status
  if (status !== 'pass' && status !== 'fail' && status !== 'error') {
    // Skip rendering conclusion for 'running' or 'skipped' status
    return null
  }

  const conclusionStyles = getConclusionStyles(status)

  // Filter out given steps - only show requirement steps
  const requirementSteps =
    analysis.steps?.filter((step) => step.type === 'requirement') ?? []

  // Don't render if there are no requirement steps
  if (requirementSteps.length === 0) {
    return null
  }

  // Group steps by goal (for requirement steps, goal is the outcome)
  const stepsByGoal = new Map<string, typeof requirementSteps>()

  requirementSteps.forEach((step) => {
    const goal = step.outcome

    if (!stepsByGoal.has(goal)) {
      stepsByGoal.set(goal, [])
    }
    stepsByGoal.get(goal)!.push(step)
  })

  return (
    <div className="space-y-4">
      {status === 'fail' || status === 'error' ? (
        <div
          className={cn(
            'rounded-md border p-4 sm:p-5',
            conclusionStyles.container,
          )}
        >
          <p className="text-sm font-semibold text-foreground">
            {conclusionStyles.label}
          </p>
          <p className="mt-2 text-sm text-foreground">{analysis.explanation}</p>
        </div>
      ) : null}

      <div className="space-y-4">
        {Array.from(stepsByGoal.entries()).map(([goal, steps]) => (
          <div key={goal} className="space-y-3">
            <div className="space-y-2">
              {steps.map((step, stepIndex) => {
                const conclusionDisplay = getEvidenceConclusionDisplay(
                  step.conclusion === 'pass' ? 'pass' : 'fail',
                )

                return (
                  <details
                    key={`${storyResultId}-step-${goal}-${stepIndex}`}
                    className="group rounded-md border bg-muted/40 text-sm text-foreground"
                  >
                    <summary className="flex w-full cursor-pointer select-none items-center gap-2 px-3 py-3 text-left [&::-webkit-details-marker]:hidden">
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                      <conclusionDisplay.Icon
                        aria-label={conclusionDisplay.label}
                        className={cn(
                          'size-4 shrink-0',
                          conclusionDisplay.iconClassName,
                        )}
                      />
                      <span className="truncate text-sm font-medium text-foreground">
                        {step.outcome}
                      </span>
                    </summary>
                    <div className="space-y-3 border-t px-3 py-3 text-sm text-foreground">
                      {step.assertions && step.assertions.length > 0 ? (
                        <div className="space-y-2">
                          {step.assertions.map((assertion, assertionIndex) => (
                            <div
                              key={`${storyResultId}-assertion-${goal}-${stepIndex}-${assertionIndex}`}
                              className="rounded-md border bg-background p-3"
                            >
                              <div className="text-sm font-medium text-foreground">
                                {assertion.fact}
                              </div>
                              {assertion.evidence &&
                              assertion.evidence.length > 0 ? (
                                <EvidenceList
                                  evidence={assertion.evidence}
                                  orgName={orgName}
                                  repoName={repoName}
                                  commitSha={commitSha}
                                />
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </details>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
