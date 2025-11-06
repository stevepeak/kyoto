import { useEffect, useState } from 'react'
import { useTRPCClient } from '@/client/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { AppLayout } from '@/components/layout'

export function SetupApp() {
  const trpc = useTRPCClient()
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
  const [orgs, setOrgs] = useState<Array<{ slug: string; name: string }>>([])
  const [enabledRepos, setEnabledRepos] = useState<
    Array<{
      id: string
      name: string
      defaultBranch: string | null
      enabled: boolean
    }>
  >([])
  const [allRepos, setAllRepos] = useState<
    Array<{
      id: string
      name: string
      defaultBranch: string | null
      enabled: boolean
    }>
  >([])
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRepoName, setSelectedRepoName] = useState<string | null>(null)
  const [enabling, setEnabling] = useState(false)

  useEffect(() => {
    let mounted = true
    void (async () => {
      const data = await trpc.org.listInstalled.query()
      if (!mounted) {
        return
      }
      setOrgs(data.orgs)
    })()
    return () => {
      mounted = false
    }
  }, [trpc])

  useEffect(() => {
    if (!selectedOrg) {
      setEnabledRepos([])
      setAllRepos([])
      return
    }
    let mounted = true
    void (async () => {
      setLoadingRepos(true)
      const data = await trpc.repo.listByOrg.query({ orgSlug: selectedOrg })
      if (!mounted) {
        return
      }
      const repos = data.repos as Array<{
        id: string
        name: string
        defaultBranch: string | null
        enabled: boolean
      }>
      setAllRepos(repos)
      setEnabledRepos(repos.filter((r) => r.enabled))
      setLoadingRepos(false)
    })()
    return () => {
      mounted = false
    }
  }, [trpc, selectedOrg])

  const filteredRepos = allRepos.filter((repo) => {
    if (!searchQuery.trim()) {
      return !repo.enabled
    }
    const query = searchQuery.toLowerCase()
    return (
      !repo.enabled &&
      (repo.name.toLowerCase().includes(query) ||
        `${selectedOrg}/${repo.name}`.toLowerCase().includes(query))
    )
  })

  const handleEnableRepo = async () => {
    if (!selectedOrg || !selectedRepoName) {
      return
    }
    setEnabling(true)
    try {
      await trpc.repo.enableRepo.mutate({
        orgSlug: selectedOrg,
        repoName: selectedRepoName,
      })
      // Refresh the repos list
      const data = await trpc.repo.listByOrg.query({ orgSlug: selectedOrg })
      const repos = data.repos as Array<{
        id: string
        name: string
        defaultBranch: string | null
        enabled: boolean
      }>
      setAllRepos(repos)
      setEnabledRepos(repos.filter((r) => r.enabled))
      setIsDialogOpen(false)
      setSearchQuery('')
      setSelectedRepoName(null)
    } catch (error) {
      console.error('Failed to enable repository:', error)
    } finally {
      setEnabling(false)
    }
  }

  const handleDisableRepo = async (repoName: string) => {
    if (!selectedOrg) {
      return
    }
    try {
      await trpc.repo.disableRepo.mutate({
        orgSlug: selectedOrg,
        repoName,
      })
      // Refresh the repos list
      const data = await trpc.repo.listByOrg.query({ orgSlug: selectedOrg })
      const repos = data.repos as Array<{
        id: string
        name: string
        defaultBranch: string | null
        enabled: boolean
      }>
      setAllRepos(repos)
      setEnabledRepos(repos.filter((r) => r.enabled))
    } catch (error) {
      console.error('Failed to disable repository:', error)
    }
  }

  return (
    <AppLayout>
      <div className="p-6 flex flex-col h-full overflow-auto">
        <div className="max-w-3xl mx-auto w-full">
          <Card>
            <CardHeader>
              <CardTitle>Manage repositories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Organization
                  </label>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={selectedOrg ?? ''}
                    onChange={(e) => {
                      setSelectedOrg(e.target.value || null)
                    }}
                  >
                    <option value="">Select organization…</option>
                    {orgs.map((o: { slug: string; name: string }) => (
                      <option key={o.slug} value={o.slug}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Separator />

                {selectedOrg && !loadingRepos && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foreground">
                        Enabled repositories
                      </h3>
                      <Button
                        onClick={() => {
                          setIsDialogOpen(true)
                        }}
                      >
                        Add new repo
                      </Button>
                    </div>
                    {enabledRepos.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-4">
                        No repositories enabled yet. Click &quot;Add new
                        repo&quot; to get started.
                      </div>
                    ) : (
                      <div className="border rounded-md">
                        <ul className="divide-y">
                          {enabledRepos.map((r) => (
                            <li
                              key={r.id}
                              className="flex items-center justify-between p-3"
                            >
                              <span className="text-sm">{r.name}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  void handleDisableRepo(r.name)
                                }}
                              >
                                Disable
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new repository</DialogTitle>
            <DialogDescription>
              Search and select a repository to enable for{' '}
              {selectedOrg ? `${selectedOrg}` : 'this organization'}.
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
            {filteredRepos.length === 0 ? (
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
