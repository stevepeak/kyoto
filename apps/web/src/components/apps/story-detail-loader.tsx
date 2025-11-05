import { useEffect, useState } from 'react'

import { useTRPCClient } from '@/client/trpc'
import { AppLayout } from '@/components/layout'
import { GherkinViewer } from '@/components/gherkin/GherkinViewer'
import { LoadingProgress } from '@/components/ui/loading-progress'

interface Story {
  id: string
  title: string
  featureTitle: string
  gherkinText: string
  commitSha?: string
  createdAt?: string
}

interface FileTouched {
  path: string
  summary?: string
}

export function StoryDetailLoader({
  orgSlug,
  repoName,
  storyId,
}: {
  orgSlug: string
  repoName: string
  storyId: string
}) {
  const trpc = useTRPCClient()
  const [isLoading, setIsLoading] = useState(true)
  const [story, setStory] = useState<Story | null>(null)
  const [filesTouched, setFilesTouched] = useState<FileTouched[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const resp = await trpc.story.get.query({ orgSlug, repoName, storyId })
        if (!isMounted) {
          return
        }
        setStory(resp.story)
        setFilesTouched(resp.filesTouched ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load story')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [trpc, orgSlug, repoName, storyId])

  return (
    <AppLayout>
      {isLoading ? (
        <LoadingProgress label="Loading story..." />
      ) : error ? (
        <div className="p-6 text-sm text-red-500">{error}</div>
      ) : story ? (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b">
            <h1 className="text-xl font-semibold text-foreground">
              {story.featureTitle || story.title}
            </h1>
            {story.commitSha ? (
              <div className="text-xs text-muted-foreground mt-1">
                {story.commitSha.slice(0, 7)} • {story.createdAt}
              </div>
            ) : null}
          </div>
          <div className="flex flex-1 overflow-hidden">
            <div className="w-1/2 p-6 overflow-auto border-r">
              <GherkinViewer text={story.gherkinText} />
            </div>
            <div className="w-1/2 p-6 overflow-auto">
              <h2 className="text-sm font-medium text-foreground">Walkthrough</h2>
              <div className="mt-3 text-sm text-muted-foreground">
                <p>This test likely touches:</p>
                <ul className="list-disc ml-5 mt-2">
                  {filesTouched.map((f) => (
                    <li key={f.path}>
                      <span className="font-mono">{f.path}</span>
                      {f.summary ? <span className="ml-2">— {f.summary}</span> : null}
                    </li>
                  ))}
                  {filesTouched.length === 0 ? (
                    <li>No files recorded for this story.</li>
                  ) : null}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  )
}


