'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.useStoryGeneration = useStoryGeneration
const react_1 = require('react')
function useStoryGeneration(_a) {
  const setIsGenerating = _a.setIsGenerating,
    setGenerationRunId = _a.setGenerationRunId,
    setGenerationAccessToken = _a.setGenerationAccessToken,
    setStoryContent = _a.setStoryContent,
    setStoryName = _a.setStoryName,
    setError = _a.setError
  // Extract story from output and update state
  const handleStoryOutput = (0, react_1.useCallback)(
    function (output) {
      if (
        (output === null || output === void 0 ? void 0 : output.stories) &&
        output.stories.length > 0
      ) {
        const generatedStory = output.stories[0]
        setStoryContent(generatedStory.text)
        if (generatedStory.title) {
          setStoryName(generatedStory.title)
        }
      } else {
        setError('No story was generated')
      }
    },
    [setStoryContent, setStoryName, setError],
  )
  // Output is handled by StoryGenerationTracking component
  // No need to call useTriggerRun here since StoryGenerationTracking handles it
  // Handle story generation completion (called from StoryGenerationTracking)
  const handleGenerationComplete = (0, react_1.useCallback)(
    function (output) {
      if (output) {
        handleStoryOutput(output)
      } else {
        setError('Story generation is still processing')
      }
      // Clean up
      setIsGenerating(false)
      setGenerationRunId(null)
      setGenerationAccessToken(null)
    },
    [
      handleStoryOutput,
      setIsGenerating,
      setGenerationRunId,
      setGenerationAccessToken,
      setError,
    ],
  )
  return {
    handleGenerationComplete,
  }
}
