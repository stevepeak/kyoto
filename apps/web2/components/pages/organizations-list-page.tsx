import { type Owner } from '@app/db2'
import Link from 'next/link'

interface OrganizationsListPageProps {
  organizations: Owner[]
}

export function OrganizationsListPage(props: OrganizationsListPageProps) {
  const { organizations } = props

  return (
    <div className="container mx-auto min-h-screen py-12">
      <div className="space-y-8">
        <div>
          <h1 className="font-cormorant text-5xl font-semibold">
            Your Organizations
          </h1>
          <p className="mt-2 text-muted-foreground">
            Organizations you have access to
          </p>
        </div>

        {organizations.length === 0 ? (
          <div className="rounded-lg border p-12 text-center">
            <p className="text-muted-foreground">
              You don&apos;t have access to any organizations yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <Link
                key={org.id}
                href={`/~/${org.login}`}
                className="group flex flex-col gap-4 rounded-lg border p-6 transition-colors hover:border-foreground/20 hover:bg-accent"
              >
                <div className="flex items-start gap-3">
                  {org.avatarUrl && (
                    <img
                      src={org.avatarUrl}
                      alt={org.name ?? org.login}
                      className="size-12 rounded-full border"
                    />
                  )}
                  <div className="flex-1">
                    <h2 className="font-semibold group-hover:underline">
                      {org.name ?? org.login}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      @{org.login}
                    </p>
                  </div>
                </div>
                {org.type && (
                  <span className="text-xs text-muted-foreground">
                    {org.type}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
