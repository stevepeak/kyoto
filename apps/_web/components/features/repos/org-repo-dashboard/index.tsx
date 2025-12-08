'use client'

import { Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { SiGithub } from 'react-icons/si'

import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'

import { ConnectRepoDialog } from './ConnectRepoDialog'
import { RepoList } from './RepoList'

interface RepoItem {
  id: string
  name: string
  defaultBranch?: string
  isPrivate: boolean
  storyCount: number
  lastRunStatus: 'pass' | 'fail' | 'skipped' | 'running' | 'error' | null
  lastRunAt: Date | null
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
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleOpenDialog = useCallback(() => {
    setIsDialogOpen(true)
  }, [])

  useHotkeys(
    'mod+enter',
    () => {
      handleOpenDialog()
    },
    { enabled: repos.length === 0 && !isDialogOpen, preventDefault: true },
  )

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
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b border-border bg-background/80 px-6 py-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="text-xl font-semibold text-foreground">
                {org?.name ?? 'Organization'}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {org?.slug ? (
                  <a
                    href={`https://github.com/${org.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    <SiGithub className="h-4 w-4 text-muted-foreground" />
                    <span>{org.slug}</span>
                  </a>
                ) : null}
              </div>
            </div>
            {repos.length > 0 && (
              <Button onClick={handleOpenDialog} className="gap-2">
                <Plus className="h-5 w-5" />
                <span>Add Repository</span>
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto px-6 py-6">
          <RepoList org={org} repos={repos} onOpenDialog={handleOpenDialog} />
        </div>
      </div>

      <ConnectRepoDialog
        org={org}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </AppLayout>
  )
}
