import { AppLayout } from '@/components/layout'

interface BranchItem {
  name: string
  headSha?: string
  updatedAt?: string
}

interface Props {
  orgSlug: string
  repoName: string
  branches: BranchItem[]
}

export function RepoOverview({ orgSlug, repoName, branches }: Props) {
  return (
    <AppLayout
      breadcrumbs={[
        { label: orgSlug, href: `/org/${orgSlug}` },
        { label: repoName, href: `/org/${orgSlug}/repo/${repoName}` },
      ]}
    >
      <div className="p-6 flex flex-col h-full overflow-auto">
        <h1 className="text-xl font-semibold text-foreground">
          {orgSlug}/{repoName}
        </h1>
        <div className="mt-6">
          <h2 className="text-sm font-medium text-foreground">Branches</h2>
          <div className="mt-3 border rounded-md">
            <ul className="divide-y">
              {branches.map((b) => (
                <li key={b.name} className="p-3">
                  <a
                    href={`/org/${orgSlug}/repo/${repoName}/branches/${b.name}/stories`}
                    className="text-foreground hover:underline"
                  >
                    {b.name}
                  </a>
                  {b.headSha ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {b.headSha.slice(0, 7)}
                    </span>
                  ) : null}
                </li>
              ))}
              {branches.length === 0 ? (
                <li className="p-6 text-sm text-muted-foreground">
                  No branches found.
                </li>
              ) : null}
            </ul>
          </div>
          <div className="mt-6">
            <a
              href={`/org/${orgSlug}/repo/${repoName}/runs`}
              className="text-sm text-primary hover:underline"
            >
              View Runs
            </a>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
