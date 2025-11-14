import { RunDetailTitle } from './RunDetailTitle'
import { RunDetailCommitBlock } from './RunDetailCommitBlock'
import type { Run, StatusDisplay } from '../types'

interface RunDetailHeaderProps {
  commitTitle: string
  runStatusDescriptor: string
  relativeStarted: string
  absoluteStarted: string
  durationDisplay: string
  statusDisplay: StatusDisplay
  run: Run
  shortSha: string | null
  commitUrl: string | null
  pullRequestUrl: string | null
}

export function RunDetailHeader({
  commitTitle,
  runStatusDescriptor,
  relativeStarted,
  absoluteStarted,
  durationDisplay,
  statusDisplay,
  run,
  shortSha,
  commitUrl,
  pullRequestUrl,
}: RunDetailHeaderProps) {
  return (
    <>
      <RunDetailTitle
        commitTitle={commitTitle}
        runStatusDescriptor={runStatusDescriptor}
        relativeStarted={relativeStarted}
        absoluteStarted={absoluteStarted}
        durationDisplay={durationDisplay}
        statusDisplay={statusDisplay}
        run={run}
        shortSha={shortSha}
        commitUrl={commitUrl}
      />
      <RunDetailCommitBlock run={run} pullRequestUrl={pullRequestUrl} />
    </>
  )
}

