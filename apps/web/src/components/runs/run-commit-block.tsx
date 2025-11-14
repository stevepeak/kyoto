import ReactMarkdown from 'react-markdown'
import type { Run } from './run-detail-view-types'

interface RunCommitBlockProps {
  run: Run
  pullRequestUrl: string | null
}

export function RunCommitBlock({
  run,
  pullRequestUrl,
}: RunCommitBlockProps) {
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
        {run.summary ? (
          <div className="space-y-2 md:col-span-2">
            <div className="prose prose-sm max-w-none text-foreground">
              <ReactMarkdown>{run.summary}</ReactMarkdown>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
