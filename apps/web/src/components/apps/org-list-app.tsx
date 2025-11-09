import { useEffect, useState } from 'react'

import { useTRPCClient } from '@/client/trpc'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { LoadingProgress } from '@/components/ui/loading-progress'
import { EmptyState } from '@/components/common/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SiGithub } from 'react-icons/si'

interface OrgItem {
  slug: string
  name: string
  accountName: string | null
  repoCount: number
}

export function OrgListApp() {
  const trpc = useTRPCClient()
  const [isLoading, setIsLoading] = useState(true)
  const [orgs, setOrgs] = useState<OrgItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const data = await trpc.org.listInstalled.query()
        if (!isMounted) {
          return
        }
        setOrgs(data.orgs)
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Failed to load organizations',
        )
      } finally {
        setIsLoading(false)
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [trpc])

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingProgress label="Loading organizations..." />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 text-sm text-destructive">{error}</div>
      </AppLayout>
    )
  }

  if (orgs.length === 0) {
    return (
      <AppLayout>
        <div className="p-6">
          <EmptyState
            title="No organizations found"
            description="Install the GitHub app to get started with your organizations."
          />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 flex flex-col h-full overflow-auto">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-foreground">
            Organizations
          </h1>
          <Button asChild>
            <a href="/setup">Add new organization</a>
          </Button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <a key={org.slug} href={`/org/${org.slug}`} className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <SiGithub className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">
                      {org.accountName ?? org.name}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">@{org.slug}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {org.repoCount}
                    </span>{' '}
                    {org.repoCount === 1 ? 'repository' : 'repositories'}
                  </p>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
