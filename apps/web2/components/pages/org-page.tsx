import { type Owner, type Repo } from '@app/db2'
import Link from 'next/link'

interface OrgPageProps {
  owner: Owner
  organizations: Owner[]
  repositories: Repo[]
}

export function OrgPage(props: OrgPageProps) {
  const { owner, organizations, repositories } = props

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
              No repositories found for this organization.
            </p>
          ) : (
            <div className="grid gap-3">
              {repositories.map((repo) => (
                <Link
                  key={repo.id}
                  href={`/~/${owner.login}/${repo.name}`}
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

        {organizations.length > 1 && (
          <div className="rounded-lg border p-4">
            <h2 className="mb-4 text-lg font-semibold">Your Organizations</h2>
            <div className="grid gap-2">
              {organizations.map((org) => (
                <Link
                  key={org.id}
                  href={`/~/${org.login}`}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-accent"
                >
                  {org.avatarUrl && (
                    <img
                      src={org.avatarUrl}
                      alt={org.name ?? org.login}
                      className="size-8 rounded-full border"
                    />
                  )}
                  <div>
                    <div className="font-medium">{org.name ?? org.login}</div>
                    <div className="text-sm text-muted-foreground">
                      @{org.login}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
