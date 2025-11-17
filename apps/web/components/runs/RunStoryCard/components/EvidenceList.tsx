import { parseEvidenceToGitHubLink } from '../EvidenceParser'

interface EvidenceListProps {
  evidence: string[]
  orgName: string
  repoName: string
  commitSha: string | null
}

export function EvidenceList({
  evidence,
  orgName,
  repoName,
  commitSha,
}: EvidenceListProps) {
  if (evidence.length === 0) {
    return null
  }

  return (
    <div className="mt-2 space-y-1">
      <div className="text-xs font-medium text-muted-foreground">Evidence:</div>
      <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
        {evidence.map((ev, evIndex) => {
          const { text, url } = parseEvidenceToGitHubLink(
            ev,
            orgName,
            repoName,
            commitSha,
          )
          return (
            <li key={evIndex}>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {text}
                </a>
              ) : (
                text
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
