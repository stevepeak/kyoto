import { useEffect, useState } from 'react'
import { Archive, FileText, Sparkles } from 'lucide-react'
import { useTRPCClient } from '@/client/trpc'
import { AppLayout } from '@/components/layout'
import { LoadingProgress } from '@/components/ui/loading-progress'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TiptapEditor } from '@/components/ui/tiptap-editor'
import { StoryTemplatesPanel } from '@/components/apps/story-templates-panel'

interface Story {
  id: string
  name: string
  story: string
  createdAt: Date | string | null
  updatedAt: Date | string | null
  // TODO we cannot import from agents :(
  decomposition: any
}

interface StoryLoaderProps {
  orgName: string
  repoName: string
  storyId?: string
}

export function StoryLoader({ orgName, repoName, storyId }: StoryLoaderProps) {
  const trpc = useTRPCClient()
  const isCreateMode = !storyId

  const [isLoading, setIsLoading] = useState(!isCreateMode)
  const [story, setStory] = useState<Story | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [storyName, setStoryName] = useState('foobar')
  const [storyContent, setStoryContent] = useState('')
  const [originalStoryContent, setOriginalStoryContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDecomposing, setIsDecomposing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [createMore, setCreateMore] = useState(false)
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false)

  const hasChanges = storyContent !== originalStoryContent

  useEffect(() => {
    if (isCreateMode) {
      return
    }

    let isMounted = true
    async function load() {
      try {
        const resp = await trpc.story.get.query({
          orgName,
          repoName,
          storyId: storyId!,
        })
        if (!isMounted) {
          return
        }
        if (resp.story) {
          setStory(resp.story)
          setStoryName(resp.story.name)
          setStoryContent(resp.story.story)
          setOriginalStoryContent(resp.story.story)
        }
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
  }, [trpc, orgName, repoName, storyId, isCreateMode])

  const handleSave = async () => {
    if (!storyContent.trim()) {
      setError('Story content is required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      if (isCreateMode) {
        await trpc.story.create.mutate({
          orgName,
          repoName,
          name: storyName.trim(),
          story: storyContent,
          files: [],
        })
      } else {
        const result = await trpc.story.update.mutate({
          orgName,
          repoName,
          storyId: storyId!,
          name: storyName,
          story: storyContent,
        })
        setStory(result.story)
        setOriginalStoryContent(storyContent)
        setIsSaving(false)
        return
      }

      // Navigate back to the repository page after saving (create mode only)
      // Unless "create more" is checked, then reset the form
      if (createMore) {
        setStoryContent('')
        setOriginalStoryContent('')
        setIsSaving(false)
      } else {
        window.location.href = `/org/${orgName}/repo/${repoName}`
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isCreateMode
            ? 'Failed to create story'
            : 'Failed to update story',
      )
      setIsSaving(false)
    }
  }

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!isSaving && (isCreateMode || hasChanges)) {
          void handleSave()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSaving, isCreateMode, hasChanges])

  const handleCancel = () => {
    if (isCreateMode) {
      window.location.href = `/org/${orgName}/repo/${repoName}`
    } else {
      setStoryContent(originalStoryContent)
    }
  }

  if (isLoading) {
    return (
      <AppLayout
        breadcrumbs={[
          { label: orgName, href: `/org/${orgName}` },
          { label: repoName, href: `/org/${orgName}/repo/${repoName}` },
        ]}
      >
        <LoadingProgress label="Loading story..." />
      </AppLayout>
    )
  }

  const breadcrumbs = [
    { label: orgName, href: `/org/${orgName}` },
    { label: repoName, href: `/org/${orgName}/repo/${repoName}` },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .shimmer-effect {
          animation: shimmer 3s infinite;
        }
      `}</style>
      {error && (
        <div className="mx-6 mt-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}
      {isCreateMode || story ? (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex flex-1 overflow-hidden flex-col">
            {!isCreateMode ? (
              <Tabs
                defaultValue="story"
                className="flex flex-1 flex-col overflow-hidden"
              >
                <div className="px-6 pt-4 flex items-center justify-center">
                  <TabsList>
                    <TabsTrigger value="story">Story</TabsTrigger>
                    <TabsTrigger value="decomposition">
                      Decomposition
                    </TabsTrigger>
                    <TabsTrigger value="runs">Recent Runs</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent
                  value="story"
                  className="flex-1 overflow-auto mt-0"
                >
                  <div className="flex items-center justify-center min-h-full p-12">
                    <div className="w-full max-w-3xl">
                      <div className="mb-6">
                        <p
                          className="text-sm font-semibold tracking-[0.3em] text-primary mb-2"
                          title="Henshuu - to edit."
                        >
                          へんしゅう
                        </p>
                        <h1 className="text-2xl font-display text-foreground">
                          {storyName}
                        </h1>
                      </div>
                      <TiptapEditor
                        value={storyContent}
                        onChange={setStoryContent}
                        className="min-h-96 max-h-[600px]"
                      />
                      <div className="mt-4 flex items-center justify-between pt-4">
                        <div className="flex items-center gap-4">
                          {!isCreateMode && (
                            <Button
                              variant="ghost"
                              onClick={() => setShowArchiveDialog(true)}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                          {isCreateMode && (
                            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                              <input
                                type="checkbox"
                                checked={createMore}
                                onChange={(e) =>
                                  setCreateMore(e.target.checked)
                                }
                                className="h-4 w-4 rounded border-input"
                              />
                              Create more
                            </label>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isSaving}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSave}
                            disabled={
                              isSaving || (!isCreateMode && !hasChanges)
                            }
                            variant={
                              !isCreateMode && !hasChanges
                                ? 'outline'
                                : 'default'
                            }
                          >
                            {isSaving
                              ? 'Saving...'
                              : isCreateMode
                                ? 'Create'
                                : !hasChanges
                                  ? 'No changes made'
                                  : 'Save Changes'}
                            {!isSaving && (
                              <span className="ml-2 text-xs opacity-60">
                                {navigator.platform.includes('Mac')
                                  ? '⌘'
                                  : 'Ctrl'}
                                +Enter
                              </span>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent
                  value="decomposition"
                  className="flex-1 overflow-hidden mt-0"
                >
                  <div className="flex h-full">
                    <div className="w-1/2 p-6 overflow-auto border-r">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p
                            className="text-sm font-semibold tracking-[0.3em] text-primary mb-2"
                            title="Bunkai - to break down."
                          >
                            ぶんかい
                          </p>
                          <h2 className="mb-0">Decomposition</h2>
                        </div>
                        <Button
                          variant="outline"
                          onClick={async () => {
                            setIsDecomposing(true)
                            setError(null)
                            try {
                              await trpc.story.decompose.mutate({
                                storyId: storyId!,
                              })
                              // Reload story to get updated decomposition
                              const resp = await trpc.story.get.query({
                                orgName,
                                repoName,
                                storyId: storyId!,
                              })
                              if (resp.story) {
                                setStory(resp.story)
                                setStoryContent(resp.story.story)
                                setOriginalStoryContent(resp.story.story)
                              }
                            } catch (e) {
                              setError(
                                e instanceof Error
                                  ? e.message
                                  : 'Failed to start decomposition',
                              )
                            } finally {
                              setIsDecomposing(false)
                            }
                          }}
                          disabled={isDecomposing}
                        >
                          {isDecomposing ? 'Decomposing...' : 'Decompose'}
                        </Button>
                      </div>
                      <div className="mt-3">
                        {story?.decomposition ? (
                          <pre className="text-xs bg-muted p-4 rounded-md overflow-auto">
                            {JSON.stringify(story.decomposition, null, 2)}
                          </pre>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No decomposition data available.
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-1/2 p-6 overflow-auto">
                      {/* Placeholder for code section - to be implemented later */}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="runs" className="flex-1 overflow-auto mt-0">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">Recent Runs</h2>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          setIsTesting(true)
                          setError(null)
                          try {
                            await trpc.story.test.mutate({
                              storyId: storyId!,
                            })
                          } catch (e) {
                            setError(
                              e instanceof Error
                                ? e.message
                                : 'Failed to start test',
                            )
                          } finally {
                            setIsTesting(false)
                          }
                        }}
                        disabled={isTesting}
                      >
                        {isTesting ? 'Testing...' : 'Test'}
                      </Button>
                    </div>
                    {/* Placeholder for recent runs - to be implemented later */}
                    <div className="text-sm text-muted-foreground">
                      Recent runs will be displayed here.
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex items-center justify-center min-h-full p-12">
                <div className="w-full max-w-3xl">
                  <div className="mb-6">
                    <p
                      className="text-sm font-semibold tracking-[0.3em] text-primary mb-2"
                      title="Sakusei - to create."
                    >
                      さくせい
                    </p>
                    <div className="flex items-center justify-between">
                      <h1 className="text-2xl font-display text-foreground">
                        Craft new user story
                      </h1>
                      <Button
                        variant="outline"
                        onClick={() => {
                          // TODO: Implement story generation
                        }}
                        className="gap-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 hover:from-primary/20 hover:via-primary/10 hover:to-primary/20 hover:border-primary/50 transition-all shadow-sm hover:shadow-md backdrop-blur-sm relative overflow-hidden group"
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent shimmer-effect"></span>
                        <Sparkles className="h-4 w-4 text-primary relative z-10" />
                        <span className="relative z-10">Generate Story</span>
                      </Button>
                    </div>
                  </div>
                  <TiptapEditor
                    value={storyContent}
                    onChange={setStoryContent}
                    className="min-h-96 max-h-[600px]"
                  />
                  <div className="mt-4 flex items-center justify-between pt-4">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createMore}
                          onChange={(e) => setCreateMore(e.target.checked)}
                          className="h-4 w-4 rounded border-input"
                        />
                        Create more
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setShowTemplatesDialog(true)}
                        disabled={isSaving}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Templates
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Create'}
                        {!isSaving && (
                          <span className="ml-2 text-xs opacity-60">
                            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
                            +Enter
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
      <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Story Templates</DialogTitle>
            <DialogDescription>
              Choose a template to get started with your story. You can modify
              it after selecting.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0">
            <StoryTemplatesPanel
              onSelectTemplate={(template) => {
                setStoryContent(template.content)
                setShowTemplatesDialog(false)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Story</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive &ldquo;{story?.name}&rdquo;? The
              story will be hidden from the list but can be restored later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowArchiveDialog(false)}
              disabled={isArchiving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setIsArchiving(true)
                setError(null)
                try {
                  await trpc.story.archive.mutate({
                    orgName,
                    repoName,
                    storyId: storyId!,
                  })
                  window.location.href = `/org/${orgName}/repo/${repoName}`
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : 'Failed to archive story',
                  )
                  setIsArchiving(false)
                  setShowArchiveDialog(false)
                }
              }}
              disabled={isArchiving}
            >
              {isArchiving ? 'Archiving...' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
