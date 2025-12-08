'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.getEvidenceConclusionDisplay = getEvidenceConclusionDisplay
exports.getLoadingConclusionDisplay = getLoadingConclusionDisplay
const lucide_react_1 = require('lucide-react')
function getEvidenceConclusionDisplay(conclusion) {
  if (conclusion === 'pass') {
    return {
      Icon: lucide_react_1.CheckCircle2,
      iconClassName: 'text-chart-1',
      label: 'Pass',
    }
  }
  return {
    Icon: lucide_react_1.XCircle,
    iconClassName: 'text-destructive',
    label: 'Fail',
  }
}
function getLoadingConclusionDisplay() {
  return {
    Icon: lucide_react_1.Loader2,
    iconClassName: 'text-primary animate-spin',
    label: 'Loading',
  }
}
