'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.useStoryAnalysis = useStoryAnalysis
const react_1 = require('react')

const utils_1 = require('../../utils')
const DecompositionParser_1 = require('../DecompositionParser')
/**
 * Hook to parse and analyze story data including decomposition and test results
 */
function useStoryAnalysis(story, testResult) {
  return (0, react_1.useMemo)(
    function () {
      let _a, _b
      const analysis =
        (_a =
          testResult === null || testResult === void 0
            ? void 0
            : testResult.analysis) !== null && _a !== void 0
          ? _a
          : null
      const displayStatus = (0, utils_1.getDisplayStatus)(story)
      const isRunning = displayStatus === 'running'
      const decomposition = (0, DecompositionParser_1.parseDecomposition)(
        (_b = story.story) === null || _b === void 0
          ? void 0
          : _b.decomposition,
      )
      const showDecompositionLoading =
        (!testResult || isRunning) && decomposition !== null
      return {
        analysis,
        decomposition,
        displayStatus,
        isRunning,
        showDecompositionLoading,
      }
    },
    [story, testResult],
  )
}
