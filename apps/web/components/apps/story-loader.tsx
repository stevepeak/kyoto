import { Suspense } from 'react'

import { getTRPCCaller } from '@/lib/trpc-server'
import { AppLayout } from '@/components/layout'
import { LoadingProgress } from '@/components/ui/loading-progress'

import { StoryLoaderClient } from './story-loader-client'
import type { DecompositionOutput } from '@app/schemas'

interface Story {
  id: string
  name: string
  story: string
  state:
    | 'active'
    | 'archived'
    | 'generated'
    | 'paused'
    | 'planned'
    | 'processing'
  createdAt: Date | string | null
  updatedAt: Date | string | null
  decomposition: DecompositionOutput | null
  repoId: string
}

interface StoryLoaderProps {
  orgName: string
  repoName: string
  storyId?: string
}

async function StoryContent({
  orgName,
  repoName,
  storyId,
}: {
  orgName: string
  repoName: string
  storyId?: string
}) {
  // For create mode, no server-side loading needed
  if (!storyId) {
    return (
      <StoryLoaderClient
        orgName={orgName}
        repoName={repoName}
        storyId={undefined}
        initialStory={null}
      />
    )
  }

  // For edit mode, load story data server-side
  const trpc = await getTRPCCaller()
  const resp = await trpc.story.get({
    orgName,
    repoName,
    storyId,
  })

  return (
    <StoryLoaderClient
      orgName={orgName}
      repoName={repoName}
      storyId={storyId}
      initialStory={resp.story as Story | null}
    />
  )
}

export function StoryLoader({ orgName, repoName, storyId }: StoryLoaderProps) {
  // For create mode, no Suspense needed
  if (!storyId) {
    return (
      <StoryLoaderClient
        orgName={orgName}
        repoName={repoName}
        storyId={undefined}
        initialStory={null}
      />
    )
  }

  // For edit mode, use Suspense for server-side loading
  return (
    <Suspense
      fallback={
        <AppLayout
          breadcrumbs={[
            { label: orgName, href: `/org/${orgName}` },
            { label: repoName, href: `/org/${orgName}/repo/${repoName}` },
          ]}
        >
          <LoadingProgress label="Loading story..." />
        </AppLayout>
      }
    >
      <StoryContent orgName={orgName} repoName={repoName} storyId={storyId} />
    </Suspense>
  )
}
