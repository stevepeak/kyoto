import { type RunStory, type StoryTestResult } from '../types'
import { ConclusionDisplay } from './components/ConclusionDisplay'
import { DecompositionDisplay } from './components/DecompositionDisplay'
import { useStoryAnalysis } from './hooks/useStoryAnalysis'

interface RunStoryCardContentProps {
  story: RunStory
  testResult: StoryTestResult | null
  orgName: string
  repoName: string
  commitSha: string | null
}

export function RunStoryCardContent({
  story,
  testResult,
  orgName,
  repoName,
  commitSha,
}: RunStoryCardContentProps) {
  const { analysis, decomposition, showDecompositionLoading } =
    useStoryAnalysis(story, testResult)

  const conclusionContent = (() => {
    // Show decomposition data when results are still loading
    if (showDecompositionLoading && decomposition) {
      return (
        <DecompositionDisplay
          decomposition={decomposition}
          showLoadingState={true}
        />
      )
    }

    if (!testResult) {
      return (
        <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
          No evaluation results available yet.
        </div>
      )
    }

    if (!analysis) {
      return (
        <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
          Evaluation completed without additional analysis details.
        </div>
      )
    }

    return (
      <ConclusionDisplay
        analysis={analysis}
        storyResultId={testResult.id}
        orgName={orgName}
        repoName={repoName}
        commitSha={commitSha}
      />
    )
  })()

  return <div className="w-full space-y-4">{conclusionContent}</div>
}
