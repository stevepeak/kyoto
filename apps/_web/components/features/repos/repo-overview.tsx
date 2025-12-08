'use client'

import { type AppRouter } from '@app/api'
import { type inferRouterOutputs } from '@trpc/server'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { SiGithub } from 'react-icons/si'

import { useTRPCClient } from '@/client/trpc'
import { KeyboardShortcutHint } from '@/components/common/keyboard-shortcut-hint'
import { RunList } from '@/components/features/runs/RunList'
import { StoryList } from '@/components/features/stories/story-list'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useTriggerRun } from '@/hooks/use-trigger-run'

type RouterOutputs = inferRouterOutputs<AppRouter>
type RunItem = RouterOutputs['run']['listByRepo']['runs'][number]
type StoryItem = RouterOutputs['story']['listByRepo']['stories'][number]

interface Props {
  orgName: string
  repoName: string
  defaultBranch: string | null
  runs: RunItem[]
  stories: StoryItem[]
  onRefreshRuns?: () => void
  onRefreshStories?: () => void
}

export function RepoOverview({
  orgName,
  repoName,
  defaultBranch,
  runs,
  stories,
  onRefreshRuns,
  onRefreshStories,
}: Props) {
  const trpc = useTRPCClient()
  const router = useRouter()
  const [isCreatingRun, setIsCreatingRun] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [triggerHandle, setTriggerHandle] = useState<{
    runId: string
    publicAccessToken: string
  } | null>(null)

  // Use trigger run hook to track CI runs with built-in toast
  useTriggerRun({
    runId: triggerHandle?.runId ?? null,
    publicAccessToken: triggerHandle?.publicAccessToken ?? null,
    onComplete: () => {
      // Clear trigger handle after completion
      setTriggerHandle(null)
      // Refresh runs list
      if (onRefreshRuns) {
        onRefreshRuns()
      }
    },
    onError: () => {
      // Clear trigger handle after error
      setTriggerHandle(null)
    },
  })

  // Check if any CI build is in progress
  const hasRunningBuild = runs.some(
    (run) => run.status === 'queued' || run.status === 'running',
  )

  useHotkeys(
    'mod+enter',
    () => {
      router.push(`/org/${orgName}/repo/${repoName}/stories/new`)
    },
    { preventDefault: true },
  )

  const handleStartRun = async () => {
    if (!defaultBranch) {
      return
    }

    setIsCreatingRun(true)
    setCreateError(null)

    try {
      const result = await trpc.run.create.mutate({
        orgName,
        repoName,
      })

      // Set trigger handle to start tracking with toast
      if (result.triggerHandle?.publicAccessToken && result.triggerHandle?.id) {
        setTriggerHandle({
          runId: result.triggerHandle.id,
          publicAccessToken: result.triggerHandle.publicAccessToken,
        })

        // Refresh runs list after successful creation
        if (onRefreshRuns) {
          onRefreshRuns()
        }
      } else {
        setCreateError('Failed to get run tracking information')
      }
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : 'Failed to start run',
      )
    } finally {
      setIsCreatingRun(false)
    }
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: orgName, href: `/org/${orgName}` },
        { label: repoName, href: `/org/${orgName}/repo/${repoName}` },
      ]}
    >
      <div className="p-6 flex flex-col h-full overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <a
              href={`https://github.com/${orgName}/${repoName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-70 transition-opacity"
              aria-label="View repository on GitHub"
            >
              <SiGithub className="h-5 w-5" />
            </a>
            <span>{repoName}</span>
          </h1>
          <div className="flex items-center gap-3" />
        </div>
        {createError && (
          <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {createError}
          </div>
        )}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Panel: Stories */}
          <div>
            <div className="border rounded-md overflow-hidden">
              <div className="flex items-center justify-between bg-muted px-4 py-2 border-b">
                <div className="flex items-center gap-2">
                  {stories.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {stories.length}{' '}
                      {stories.length === 1 ? 'story' : 'stories'}
                    </span>
                  )}
                </div>
                {stories.length > 0 && (
                  <Button asChild variant="default" size="sm">
                    <a href={`/org/${orgName}/repo/${repoName}/stories/new`}>
                      Craft new story
                      <KeyboardShortcutHint />
                    </a>
                  </Button>
                )}
              </div>
              <div className="max-h-[600px] overflow-auto">
                <StoryList
                  stories={stories}
                  orgName={orgName}
                  repoName={repoName}
                  onStoriesChange={onRefreshStories}
                />
              </div>
            </div>
          </div>

          {/* Right Panel: Runs */}
          <div>
            <div className="border rounded-md overflow-hidden">
              <div className="flex items-center justify-between bg-muted px-4 py-2 border-b">
                <div className="flex items-center gap-2">
                  {runs.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {runs.length} {runs.length === 1 ? 'run' : 'runs'}
                    </span>
                  )}
                </div>
                {defaultBranch && stories.length > 0 && (
                  <Button
                    disabled={isCreatingRun || hasRunningBuild}
                    variant="outline"
                    size="sm"
                    onClick={handleStartRun}
                  >
                    {isCreatingRun ? (
                      'Starting...'
                    ) : hasRunningBuild ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Tests running...
                      </>
                    ) : (
                      'Begin new run'
                    )}
                  </Button>
                )}
              </div>
              <RunList runs={runs} orgName={orgName} repoName={repoName} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
