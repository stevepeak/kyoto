import { type Run, type StatusDisplay } from '../types'
import { RunDetailCommitBlock } from './RunDetailCommitBlock'
import { RunDetailTitle } from './RunDetailTitle'

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
  orgName: string
  repoName: string
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
  orgName,
  repoName,
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
        orgName={orgName}
        repoName={repoName}
      />
      <RunDetailCommitBlock run={run} pullRequestUrl={pullRequestUrl} />
    </>
  )
}
