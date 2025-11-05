interface ActionItem {
  id: string
  runId: string
  status: 'queued' | 'running' | 'success' | 'failed'
  createdAt: string
  commitSha: string
}

interface ActionListProps {
  actions: ActionItem[]
}

export function ActionList({ actions }: ActionListProps) {
  return (
    <ul className="divide-y">
      {actions.map((a) => (
        <li key={a.id} className="py-3 flex items-center justify-between">
          <div>
            <div className="font-medium">Run #{a.runId}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {a.createdAt} • {a.commitSha.slice(0, 7)} • {a.status}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
