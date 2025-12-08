import { type CompositionAgentOutput } from '@app/schemas'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

import { getLoadingConclusionDisplay } from '../../utils'

interface DecompositionDisplayProps {
  decomposition: CompositionAgentOutput
  showLoadingState?: boolean
}

export function DecompositionDisplay({
  decomposition,
  showLoadingState = false,
}: DecompositionDisplayProps) {
  const requirementSteps =
    decomposition.steps.filter((step) => step.type === 'requirement') ?? []

  if (requirementSteps.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
        No decomposition steps available yet.
      </div>
    )
  }

  const loadingDisplay = getLoadingConclusionDisplay()

  return (
    <div className="space-y-4">
      {showLoadingState && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-semibold text-primary">
            Evaluation in progress...
          </p>
          <p className="mt-1 text-muted-foreground">
            Showing expected steps and assertions from decomposition. Results
            will appear as evaluation completes.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {requirementSteps.map((step, stepIndex) => (
          <details
            key={`decomp-step-${step.goal}-${stepIndex}`}
            className="group rounded-md border bg-muted/40 text-sm text-foreground"
          >
            <summary className="flex w-full cursor-pointer select-none items-center gap-2 px-3 py-3 text-left [&::-webkit-details-marker]:hidden">
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
              {showLoadingState && (
                <loadingDisplay.Icon
                  aria-label={loadingDisplay.label}
                  className={cn(
                    'size-4 shrink-0',
                    loadingDisplay.iconClassName,
                  )}
                />
              )}
              <span className="truncate text-sm font-medium text-foreground">
                {step.goal}
              </span>
            </summary>
            <div className="space-y-3 border-t px-3 py-3 text-sm text-foreground">
              {step.assertions && step.assertions.length > 0 ? (
                <div className="space-y-2">
                  {step.assertions.map((assertion, assertionIndex) => (
                    <div
                      key={`decomp-assertion-${step.goal}-${stepIndex}-${assertionIndex}`}
                      className={cn(
                        'rounded-md border bg-background p-3',
                        showLoadingState && 'opacity-75',
                      )}
                    >
                      <div className="text-sm font-medium text-foreground">
                        {assertion}
                      </div>
                      {showLoadingState && (
                        <div className="mt-2 text-xs text-muted-foreground italic">
                          Evidence will appear when evaluation completes
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
