import { useState } from 'react'
import { GitBranch } from 'lucide-react'
import { SiGithub } from 'react-icons/si'

import { useTRPCClient } from '@/client/trpc'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GitHubStyleRunList } from '@/components/runs/GitHubStyleRunList'

interface BranchItem {
  name: string
  headSha?: string
  updatedAt?: string
}

interface RunItem {
  id: string
  runId: string
  status: 'queued' | 'running' | 'success' | 'failed' | 'skipped'
  createdAt: string
  updatedAt: string
  durationMs: number
  commitSha: string
  commitMessage: string | null
  branchName: string
}

interface Props {
  orgSlug: string
  repoName: string
  defaultBranch: string | null
  branches: BranchItem[]
  runs: RunItem[]
  onRefreshRuns?: () => void
}

export function RepoOverview({
  orgSlug,
  repoName,
  defaultBranch,
  branches,
  runs,
  onRefreshRuns,
}: Props) {
  const trpc = useTRPCClient()
  const [selectedBranch, setSelectedBranch] = useState<string>(
    defaultBranch || branches[0]?.name || '',
  )
  const [isCreatingRun, setIsCreatingRun] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const handleStartRun = async () => {
    if (!defaultBranch) {
      return
    }
    setIsCreatingRun(true)
    setCreateError(null)
    try {
      await trpc.run.create.mutate({
        orgSlug,
        repoName,
        // Omit branchName to use default branch
      })
      // Refresh runs list after successful creation
      if (onRefreshRuns) {
        onRefreshRuns()
      }
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : 'Failed to start run',
      )
    } finally {
      setIsCreatingRun(false)
    }
  }

  // Filter runs by selected branch
  const filteredRuns = runs.filter((run) => run.branchName === selectedBranch)

  return (
    <AppLayout
      breadcrumbs={[
        { label: orgSlug, href: `/org/${orgSlug}` },
        { label: repoName, href: `/org/${orgSlug}/repo/${repoName}` },
      ]}
    >
      <div className="p-6 flex flex-col h-full overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <SiGithub className="h-5 w-5" />
            <span>
              {orgSlug}/{repoName}
            </span>
          </h1>
          <div className="flex items-center gap-3">
            {defaultBranch && (
              <Button
                onClick={handleStartRun}
                disabled={isCreatingRun}
                variant="default"
              >
                {isCreatingRun ? 'Starting...' : 'Start new run'}
              </Button>
            )}
            {branches.length > 0 && (
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <GitBranch className="h-4 w-4 shrink-0" />
                    <SelectValue placeholder="Select branch" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.name} value={branch.name}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        {createError && (
          <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {createError}
          </div>
        )}

        <div className="mt-6">
          <h2 className="text-sm font-medium text-foreground mb-3">
            Latest runs
          </h2>
          <div className="border rounded-md overflow-hidden">
            <GitHubStyleRunList
              runs={filteredRuns}
              orgSlug={orgSlug}
              repoName={repoName}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
