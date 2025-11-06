import { navigate } from 'astro:transitions/client'
import { useState } from 'react'
import { SiGithub } from 'react-icons/si'

import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useTRPCClient } from '@/client/trpc'

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
  const trpc = useTRPCClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRepoName, setSelectedRepoName] = useState<string | null>(null)
  const [enabling, setEnabling] = useState(false)
  const [allRepos, setAllRepos] = useState<
    Array<{
      id: string
      name: string
      defaultBranch: string | null
      enabled: boolean
    }>
  >([])
  const [loadingRepos, setLoadingRepos] = useState(false)

  const loadRepos = async () => {
    if (!org?.slug) {
      return
    }
    setLoadingRepos(true)
    try {
      const data = await trpc.repo.listByOrg.query({ orgSlug: org.slug })
      const reposList = data.repos as Array<{
        id: string
        name: string
        defaultBranch: string | null
        enabled: boolean
      }>
      setAllRepos(reposList)
    } catch (error) {
      console.error('Failed to load repositories:', error)
    } finally {
      setLoadingRepos(false)
    }
  }

  const filteredRepos = allRepos.filter((repo) => {
    if (!searchQuery.trim()) {
      return !repo.enabled
    }
    const query = searchQuery.toLowerCase()
    return (
      !repo.enabled &&
      (repo.name.toLowerCase().includes(query) ||
        `${org?.slug}/${repo.name}`.toLowerCase().includes(query))
    )
  })

  const handleEnableRepo = async () => {
    if (!org?.slug || !selectedRepoName) {
      return
    }
    setEnabling(true)
    try {
      await trpc.repo.enableRepo.mutate({
        orgSlug: org.slug,
        repoName: selectedRepoName,
      })
      // Refresh the page to show the new repo
      window.location.reload()
    } catch (error) {
      console.error('Failed to enable repository:', error)
    } finally {
      setEnabling(false)
    }
  }

  const handleOpenDialog = () => {
    setIsDialogOpen(true)
    void loadRepos()
  }

  return (
    <AppLayout
      breadcrumbs={
        org
          ? [
              {
                label: org.slug,
                href: `/org/${org.slug}`,
              },
            ]
          : undefined
      }
    >
      <div className="p-6 flex flex-col h-full overflow-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <SiGithub className="h-5 w-5" />
            <span>{org?.name ?? 'Organization'}</span>
          </h1>
          <Button
            variant="outline"
            onClick={() => {
              void navigate('/setup/repos')
            }}
          >
            Manage Repositories
          </Button>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-foreground">
              Repositories
            </h2>
            <Button onClick={handleOpenDialog}>Add new repo</Button>
          </div>
          {repos.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No repositories activated yet"
                description="Get started by adding your first repository to begin tracking stories and runs."
                action={
                  <Button onClick={handleOpenDialog}>
                    Add your first repository
                  </Button>
                }
              />
            </div>
          ) : (
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
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new repository</DialogTitle>
            <DialogDescription>
              Search and select a repository to enable for{' '}
              {org?.slug ? `${org.slug}` : 'this organization'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Input
                placeholder="Search by repository name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSelectedRepoName(null)
                }}
              />
            </div>
            {loadingRepos ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                Loading repositories...
              </div>
            ) : filteredRepos.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                {searchQuery.trim()
                  ? 'No matching repositories found'
                  : 'Start typing to search for repositories'}
              </div>
            ) : (
              <div className="border rounded-md max-h-60 overflow-auto">
                <ul className="divide-y">
                  {filteredRepos.map((r) => (
                    <li
                      key={r.id}
                      className={`p-3 cursor-pointer hover:bg-accent ${
                        selectedRepoName === r.name ? 'bg-accent' : ''
                      }`}
                      onClick={() => {
                        setSelectedRepoName(r.name)
                      }}
                    >
                      <span className="text-sm">{r.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false)
                setSearchQuery('')
                setSelectedRepoName(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleEnableRepo()
              }}
              disabled={!selectedRepoName || enabling}
            >
              {enabling ? 'Enabling...' : 'Enable repository'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
