'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.StoryGenerationTracking = StoryGenerationTracking
const use_trigger_run_1 = require('@/hooks/use-trigger-run')
function StoryGenerationTracking(_a) {
  const runId = _a.runId,
    publicAccessToken = _a.publicAccessToken,
    onComplete = _a.onComplete,
    onError = _a.onError
  ;(0, use_trigger_run_1.useTriggerRun)({
    runId,
    publicAccessToken,
    showToast: false,
    onComplete(output) {
      if (onComplete && output) {
        onComplete(output)
      }
    },
    onError(error) {
      if (onError) {
        onError(error)
      }
    },
  })
  // Don't render anything - just track the run
  return null
}
