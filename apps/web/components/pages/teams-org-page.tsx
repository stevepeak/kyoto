import { type Owner, type Repo } from '@app/db'
import Link from 'next/link'

interface TeamsOrgPageProps {
  owner: Owner
  repositories: Repo[]
}

export function TeamsOrgPage(props: TeamsOrgPageProps) {
  const { owner, repositories } = props

  return (
    <div className="container mx-auto min-h-screen py-12">
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          {owner.avatarUrl && (
            <img
              src={owner.avatarUrl}
              alt={owner.name ?? owner.login}
              className="size-20 rounded-full border"
            />
          )}
          <div>
            <h1 className="font-cormorant text-4xl font-semibold">
              {owner.name ?? owner.login}
            </h1>
            <p className="text-muted-foreground">@{owner.login}</p>
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-xl font-semibold">Repositories</h2>
          {repositories.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No repositories found for this team.
            </p>
          ) : (
            <div className="grid gap-3">
              {repositories.map((repo) => (
                <Link
                  key={repo.id}
                  href={`/${owner.login}/${repo.name}`}
                  className="group flex items-center justify-between rounded-md border p-4 transition-colors hover:border-foreground/20 hover:bg-accent"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold group-hover:underline">
                        {repo.name}
                      </h3>
                      {repo.private && (
                        <span className="rounded-full border px-2 py-0.5 text-xs">
                          Private
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {repo.description}
                      </p>
                    )}
                    {repo.defaultBranch && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Default branch: {repo.defaultBranch}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
