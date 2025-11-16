import type { Run } from '../types'

interface RunDetailCommitBlockProps {
  run: Run
  pullRequestUrl: string | null
}

export function RunDetailCommitBlock({
  run,
  pullRequestUrl,
}: RunDetailCommitBlockProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 text-sm sm:grid-cols-2">
        {run.prNumber ? (
          <div className="space-y-1">
            <div className="text-muted-foreground">Pull request</div>
            <div className="text-foreground font-medium">
              {pullRequestUrl ? (
                <a
                  href={pullRequestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:text-primary/80"
                >
                  #{run.prNumber}
                </a>
              ) : (
                `#${run.prNumber}`
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
