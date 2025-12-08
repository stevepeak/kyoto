import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

import { type EvidenceConclusionDisplay } from '../types'

export function getEvidenceConclusionDisplay(
  conclusion: 'pass' | 'fail',
): EvidenceConclusionDisplay {
  if (conclusion === 'pass') {
    return {
      Icon: CheckCircle2,
      iconClassName: 'text-chart-1',
      label: 'Pass',
    }
  }

  return {
    Icon: XCircle,
    iconClassName: 'text-destructive',
    label: 'Fail',
  }
}

export function getLoadingConclusionDisplay(): EvidenceConclusionDisplay {
  return {
    Icon: Loader2,
    iconClassName: 'text-primary animate-spin',
    label: 'Loading',
  }
}
