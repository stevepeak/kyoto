interface ActionItem {
  id: string
  runId: string
  status: 'queued' | 'running' | 'success' | 'failed'
  createdAt: string
  commitSha: string
}

interface ActionListProps {
  actions: ActionItem[]
  orgSlug: string
  repoName: string
}

export function ActionList({ actions, orgSlug, repoName }: ActionListProps) {
  return (
    <ul className="divide-y">
      {actions.map((a) => (
        <li key={a.id} className="py-3 flex items-center justify-between">
          <a
            href={`/org/${orgSlug}/repo/${repoName}/runs/${a.runId}`}
            className="flex-1 text-foreground hover:underline"
          >
            <div className="font-medium">Run #{a.runId}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {a.createdAt} • {a.commitSha.slice(0, 7)} • {a.status}
            </div>
          </a>
        </li>
      ))}
    </ul>
  )
}
