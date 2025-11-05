import { AppLayout } from '@/components/layout'

interface RepoItem {
  id: string
  name: string
  defaultBranch?: string
  updatedAt?: string
}

interface OrgData {
  id: string
  slug: string
  name: string
}

interface Props {
  org: OrgData | null
  repos: RepoItem[]
}

export function OrgRepoDashboard({ org, repos }: Props) {
  return (
    <AppLayout>
      <div className="p-6 flex flex-col h-full overflow-auto">
        <h1 className="text-xl font-semibold text-foreground">{org?.name ?? 'Organization'}</h1>
        <div className="mt-6">
          <h2 className="text-sm font-medium text-foreground">Repositories</h2>
          <div className="mt-3 border rounded-md">
            <ul className="divide-y">
              {repos.map((r) => (
                <li key={r.id} className="p-3">
                  <a
                    href={`/org/${org?.slug}/repo/${r.name}`}
                    className="text-foreground hover:underline"
                  >
                    {r.name}
                  </a>
                  {r.defaultBranch ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {r.defaultBranch}
                    </span>
                  ) : null}
                </li>
              ))}
              {repos.length === 0 ? (
                <li className="p-6 text-sm text-muted-foreground">No repositories found.</li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}


