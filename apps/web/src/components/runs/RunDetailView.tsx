import { cn } from '@/lib/utils'
import { StoryStatusCheck } from './StoryStatusCheck'

interface StoryAnalysisEvidence {
  filePath: string
  startLine: number | null
  endLine: number | null
  note: string | null
}

interface StoryAnalysis {
  conclusion: 'pass' | 'fail' | 'blocked'
  explanation: string
  evidence: StoryAnalysisEvidence[]
}

interface StoryResult {
  id: string
  storyId: string
  status: 'pass' | 'fail' | 'running' | 'blocked'
  analysisVersion: number
  analysis: StoryAnalysis | null
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  createdAt: string | null
  updatedAt: string | null
}

interface RunStory {
  storyId: string
  resultId: string | null
  status: 'pass' | 'fail' | 'running' | 'skipped' | 'blocked'
  summary: string | null
  startedAt: string | null
  completedAt: string | null
  result: StoryResult | null
  story: {
    id: string
    name: string
    story: string
    branchName: string
    commitSha: string | null
    createdAt: string
    updatedAt: string
  } | null
}

interface Run {
  id: string
  commitSha: string | null
  branchName: string
  commitMessage: string | null
  prNumber: string | null
  status: 'pass' | 'fail' | 'skipped' | 'running'
  summary: string | null
  createdAt: string
  updatedAt: string
  stories: RunStory[]
}

interface RunDetailViewProps {
  run: Run
  orgSlug: string
  repoName: string
}

function getStatusBadgeClass(status: 'pass' | 'fail' | 'skipped' | 'running') {
  switch (status) {
    case 'pass':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    case 'fail':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    case 'skipped':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    case 'running':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString()
}

function formatDurationMs(durationMs: number | null | undefined): string {
  if (!durationMs || durationMs < 1) {
    return '—'
  }
  if (durationMs < 1000) {
    return `${durationMs}ms`
  }
  if (durationMs < 60000) {
    return `${Math.round(durationMs / 1000)}s`
  }
  const minutes = Math.floor(durationMs / 60000)
  const seconds = Math.round((durationMs % 60000) / 1000)
  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

export function RunDetailView({ run, orgSlug, repoName }: RunDetailViewProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Section: Metadata */}
      <div className="p-6 border-b space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Run Details</h1>
          <span
            className={cn(
              'px-2 py-1 text-xs font-medium rounded-md',
              getStatusBadgeClass(run.status),
            )}
          >
            {run.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Time</div>
            <div className="text-foreground mt-1">
              {formatDate(run.createdAt)}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground">Branch</div>
            <div className="text-foreground mt-1">{run.branchName}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Commit</div>
            <div className="text-foreground mt-1 font-mono text-xs">
              {run.commitSha ? run.commitSha.slice(0, 7) : '—'}
            </div>
          </div>

          {run.prNumber ? (
            <div>
              <div className="text-muted-foreground">Pull Request</div>
              <div className="text-foreground mt-1">#{run.prNumber}</div>
            </div>
          ) : null}

          {run.commitMessage ? (
            <div className="md:col-span-2">
              <div className="text-muted-foreground">Commit Message</div>
              <div className="text-foreground mt-1">{run.commitMessage}</div>
            </div>
          ) : null}

          {run.summary ? (
            <div className="md:col-span-2">
              <div className="text-muted-foreground">Summary</div>
              <div className="text-foreground mt-1">{run.summary}</div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Stories Column */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-foreground mb-4">Stories</h2>
          {run.stories.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No stories in this run.
            </div>
          ) : (
            <ul className="divide-y rounded-md border">
              {run.stories.map((runStory) => {
                const storyTitle = runStory.story
                  ? runStory.story.name
                  : `Story not found (${runStory.storyId.slice(0, 8)}...)`

                const storyResult = runStory.result
                const startedTimestamp =
                  storyResult?.startedAt ?? runStory.startedAt
                const completedTimestamp =
                  storyResult?.completedAt ?? runStory.completedAt

                const durationMs =
                  storyResult?.durationMs ??
                  (startedTimestamp && completedTimestamp
                    ? new Date(completedTimestamp).getTime() -
                      new Date(startedTimestamp).getTime()
                    : null)

                const content = (
                  <>
                    <div className="mt-0.5">
                      <StoryStatusCheck status={runStory.status} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{storyTitle}</div>
                      {runStory.summary ? (
                        <div className="text-xs text-muted-foreground mt-1">
                          {runStory.summary}
                        </div>
                      ) : null}
                      <div className="mt-3 space-y-2 text-xs">
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
                          <span>
                            <span className="font-medium text-foreground">Story status:</span>{' '}
                            {runStory.status.toUpperCase()}
                          </span>
                          <span>
                            <span className="font-medium text-foreground">Result status:</span>{' '}
                            {storyResult ? storyResult.status.toUpperCase() : '—'}
                          </span>
                          <span>
                            <span className="font-medium text-foreground">Result ID:</span>{' '}
                            {storyResult ? storyResult.id : '—'}
                          </span>
                          <span>
                            <span className="font-medium text-foreground">Analysis version:</span>{' '}
                            {storyResult ? storyResult.analysisVersion : '—'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
                          <span>
                            <span className="font-medium text-foreground">Started:</span>{' '}
                            {startedTimestamp ? formatDate(startedTimestamp) : '—'}
                          </span>
                          <span>
                            <span className="font-medium text-foreground">Completed:</span>{' '}
                            {completedTimestamp ? formatDate(completedTimestamp) : '—'}
                          </span>
                          <span>
                            <span className="font-medium text-foreground">Duration:</span>{' '}
                            {formatDurationMs(durationMs)}
                          </span>
                        </div>
                        {storyResult ? (
                          storyResult.analysis ? (
                            <div className="rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground">
                              <div className="font-medium text-foreground">
                                Conclusion: {storyResult.analysis.conclusion.toUpperCase()}
                              </div>
                              <div className="mt-1 text-foreground">
                                {storyResult.analysis.explanation}
                              </div>
                              {storyResult.analysis.evidence.length > 0 ? (
                                <div className="mt-2 space-y-1">
                                  <div className="font-medium text-foreground">Evidence</div>
                                  <ul className="list-disc space-y-1 pl-4">
                                    {storyResult.analysis.evidence.map((evidence, index) => (
                                      <li key={`${storyResult.id}-evidence-${index}`}>
                                        <span className="text-foreground">{evidence.filePath}</span>
                                        {evidence.startLine !== null && evidence.endLine !== null ? (
                                          <span>
                                            {' '}
                                            ({evidence.startLine} - {evidence.endLine})
                                          </span>
                                        ) : null}
                                        {evidence.note ? (
                                          <span className="block text-muted-foreground">
                                            {evidence.note}
                                          </span>
                                        ) : null}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="rounded-md border border-dashed bg-muted/30 p-3 text-muted-foreground">
                              Evaluation completed without additional analysis details.
                            </div>
                          )
                        ) : (
                          <div className="rounded-md border border-dashed bg-muted/30 p-3 text-muted-foreground">
                            No evaluation result recorded for this run story.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )

                if (runStory.story) {
                  return (
                    <li key={runStory.storyId}>
                      <a
                        href={`/org/${orgSlug}/repo/${repoName}/stories/${runStory.storyId}`}
                        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/60"
                      >
                        {content}
                      </a>
                    </li>
                  )
                }

                return (
                  <li key={runStory.storyId}>
                    <div className="flex items-start gap-3 px-4 py-3">
                      {content}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div>
          <h2 className="text-sm font-medium text-foreground mb-2">Run Metadata</h2>
          <pre className="max-h-96 overflow-auto rounded-md border bg-muted p-4 text-xs font-mono text-muted-foreground">
            {JSON.stringify(run, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
