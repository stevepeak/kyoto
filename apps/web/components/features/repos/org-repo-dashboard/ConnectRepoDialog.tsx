'use client'

import { BookMarked } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { useTRPCClient } from '@/client/trpc'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { useRepoSearch } from './hooks/useRepoSearch'

interface DialogRepoItem {
  id: string
  name: string
  defaultBranch: string | null
  enabled: boolean
  isPrivate: boolean
}

interface OrgData {
  id: string
  slug: string
  name: string
}

interface Props {
  org: OrgData | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function ConnectRepoDialog({ org, isOpen, onOpenChange }: Props) {
  const router = useRouter()
  const trpc = useTRPCClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRepoName, setSelectedRepoName] = useState<string | null>(null)
  const [enabling, setEnabling] = useState(false)
  const [allRepos, setAllRepos] = useState<DialogRepoItem[]>([])
  const [loadingRepos, setLoadingRepos] = useState(false)

  const loadRepos = useCallback(async () => {
    if (!org?.slug) {
      return
    }
    setLoadingRepos(true)
    try {
      const data = await trpc.repo.listByOrg.query({ orgName: org.slug })
      const reposList: DialogRepoItem[] = data.repos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        defaultBranch: repo.defaultBranch,
        enabled: repo.enabled,
        isPrivate: repo.isPrivate,
      }))
      setAllRepos(reposList)
    } catch (error) {
      console.error('Failed to load repositories:', error)
    } finally {
      setLoadingRepos(false)
    }
  }, [org?.slug, trpc.repo.listByOrg])

  const filteredRepos = useRepoSearch(allRepos, searchQuery, org?.slug)

  useEffect(() => {
    if (isOpen && org?.slug) {
      void loadRepos()
    }
  }, [isOpen, org?.slug, loadRepos])

  const handleEnableRepo = async () => {
    if (!org?.slug || !selectedRepoName) {
      return
    }
    setEnabling(true)
    try {
      await trpc.repo.enableRepo.mutate({
        orgName: org.slug,
        repoName: selectedRepoName,
      })
      router.push(`/org/${org.slug}/repo/${selectedRepoName}`)
    } catch (error) {
      console.error('Failed to connect repository:', error)
    } finally {
      setEnabling(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
    if (!open) {
      setSearchQuery('')
      setSelectedRepoName(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Repository</DialogTitle>
          <DialogDescription>
            Search and select a repository to connect for{' '}
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
            searchQuery.trim() ? (
              <div className="space-y-3 py-6 text-center text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  No matching repositories found
                </p>
                <p>
                  Need to connect another repo?{' '}
                  <a
                    href={`/setup?owner=${org?.slug}`}
                    className="font-medium text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Configure the GitHub app
                  </a>{' '}
                  to add more repositories and projects to Kyoto.
                </p>
                <p>
                  After updating the installation, reopen this dialog to search
                  again.
                </p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-4 text-center">
                Start typing to search for repositories
              </div>
            )
          ) : (
            <div className="border rounded-md max-h-60 overflow-auto">
              <ul className="divide-y">
                {filteredRepos.map((r) => (
                  <li
                    key={r.id}
                    className={cn(
                      'cursor-pointer p-3 hover:bg-accent',
                      selectedRepoName === r.name && 'bg-accent',
                    )}
                    onClick={() => {
                      setSelectedRepoName(r.name)
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <BookMarked className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate text-sm font-medium text-foreground">
                          {r.name}
                        </span>
                      </div>
                      <span className="flex-shrink-0 rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {r.isPrivate ? 'Private' : 'Public'}
                      </span>
                    </div>
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
              handleOpenChange(false)
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
            {enabling ? 'Connecting...' : 'Connect repository'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
