'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileText, Layers, History } from 'lucide-react'
import { useTRPCClient } from '@/client/trpc'
import { AppLayout } from '@/components/layout'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StoryArchiveDialog } from '@/components/apps/story-archive-dialog'
import { StoryTemplatesDialog } from '@/components/apps/story-templates-dialog'
import { StoryEditForm } from '@/components/apps/story-edit-form'
import { StoryCreateForm } from '@/components/apps/story-create-form'
import { StoryDecompositionTab } from '@/components/apps/story-decomposition-tab'
import { StoryRunsTab } from '@/components/apps/story-runs-tab'

interface Story {
  id: string
  name: string
  story: string
  createdAt: Date | string | null
  updatedAt: Date | string | null
  // TODO we cannot import from agents :(
  decomposition: any
}

interface StoryLoaderClientProps {
  orgName: string
  repoName: string
  storyId?: string
  initialStory?: Story | null
}

export function StoryLoaderClient({
  orgName,
  repoName,
  storyId,
  initialStory,
}: StoryLoaderClientProps) {
  const trpc = useTRPCClient()
  const router = useRouter()
  const isCreateMode = !storyId

  // Error state
  const [error, setError] = useState<string | null>(null)

  // Story data states - initialize from server data if available
  const [story, setStory] = useState<Story | null>(initialStory ?? null)

  // Story form state
  const [storyName, setStoryName] = useState(initialStory?.name ?? '')
  const [storyContent, setStoryContent] = useState(initialStory?.story ?? '')
  const [originalStoryContent, setOriginalStoryContent] = useState(
    initialStory?.story ?? '',
  )
  const [originalStoryName, setOriginalStoryName] = useState(
    initialStory?.name ?? '',
  )

  // UI state (dialogs and flags)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false)
  const [createMore, setCreateMore] = useState(false)

  // Action states
  const [isSaving, setIsSaving] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDecomposing, setIsDecomposing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  // Derived values
  const hasContentChanges = storyContent !== originalStoryContent
  const hasNameChanges = storyName !== originalStoryName
  const hasChanges = hasContentChanges || hasNameChanges
  const breadcrumbs = [
    { label: orgName, href: `/org/${orgName}` },
    { label: repoName, href: `/org/${orgName}/repo/${repoName}` },
  ]

  // Update form state when initialStory changes (from server)
  useEffect(() => {
    if (initialStory) {
      setStory(initialStory)
      setStoryName(initialStory.name)
      setOriginalStoryName(initialStory.name)
      setStoryContent(initialStory.story)
      setOriginalStoryContent(initialStory.story)
    }
  }, [initialStory])

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
          name: storyName.trim() || undefined,
          story: storyContent,
        })
      } else {
        // Build update payload with only changed fields
        const updatePayload: {
          orgName: string
          repoName: string
          storyId: string
          name?: string
          story?: string
        } = {
          orgName,
          repoName,
          storyId: storyId,
        }

        // Only include fields that have changed
        if (hasNameChanges) {
          updatePayload.name = storyName
        }
        if (hasContentChanges) {
          updatePayload.story = storyContent
        }

        const result = await trpc.story.update.mutate(updatePayload)
        setStory(result.story)
        setOriginalStoryContent(storyContent)
        setOriginalStoryName(storyName)
        setIsSaving(false)
        return
      }

      // If "create more" is checked, reset the form and stay on the page
      if (createMore) {
        setStoryContent('')
        setStoryName('')
        setOriginalStoryContent('')
        setOriginalStoryName('')
        setIsSaving(false)
        toast.success('Story created.')
        return // Early return to prevent any navigation
      }

      // Otherwise, navigate back to the repository page
      router.push(`/org/${orgName}/repo/${repoName}`)
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
      // Handle Cmd/Ctrl+Enter for save
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        // Prevent default to stop TipTap from inserting newline
        e.preventDefault()
        e.stopPropagation()
        if (!isSaving && (isCreateMode || hasChanges)) {
          void handleSave()
        }
        return
      }

      // Handle Escape key to navigate back to repo page
      if (e.key === 'Escape') {
        // Check if user is actively editing (input/textarea/contenteditable focused)
        const activeElement = document.activeElement
        const isEditing =
          activeElement &&
          (activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.hasAttribute('contenteditable') ||
            activeElement.closest('[contenteditable="true"]'))

        // Navigate if:
        // 1. In create mode (always allow Escape)
        // 2. In edit mode but not actively editing (editor not focused)
        // 3. In edit mode with no changes (existing behavior)
        if (isCreateMode || !isEditing || !hasChanges) {
          e.preventDefault()
          e.stopPropagation()
          // Use router.back() in create mode to avoid chunk loading issues
          // For edit mode, use router.push() to ensure we go to the repo page
          if (isCreateMode) {
            router.back()
          } else {
            router.push(`/org/${orgName}/repo/${repoName}`)
          }
        }
      }
    }

    // Use capture phase to catch the event before TipTap handles it
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSaving, isCreateMode, hasChanges, orgName, repoName, router])

  const handleCancel = () => {
    if (isCreateMode) {
      // Don't clear draft on cancel - user might come back
      window.history.back()
    } else {
      setStoryContent(originalStoryContent)
      setStoryName(originalStoryName)
    }
  }

  const handleArchive = async () => {
    setIsArchiving(true)
    setError(null)
    try {
      await trpc.story.archive.mutate({
        orgName,
        repoName,
        storyId: storyId!,
      })
      router.push(`/org/${orgName}/repo/${repoName}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to archive story')
      setIsArchiving(false)
      setShowArchiveDialog(false)
    }
  }

  const handleDecompose = async () => {
    if (!storyId) {
      return
    }
    setIsDecomposing(true)
    setError(null)
    try {
      await trpc.story.decompose.mutate({
        storyId: storyId,
      })
      // Reload story to get updated decomposition
      const resp = await trpc.story.get.query({
        orgName,
        repoName,
        storyId: storyId,
      })
      if (resp.story) {
        setStory(resp.story)
        setStoryName(resp.story.name)
        setOriginalStoryName(resp.story.name)
        setStoryContent(resp.story.story)
        setOriginalStoryContent(resp.story.story)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start decomposition')
    } finally {
      setIsDecomposing(false)
    }
  }

  const handleTest = async () => {
    if (!storyId) {
      return
    }
    setIsTesting(true)
    setError(null)
    try {
      await trpc.story.test.mutate({
        storyId: storyId,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start test')
    } finally {
      setIsTesting(false)
    }
  }

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
                <div className="px-6 pt-6 pb-4 flex items-center justify-center">
                  <TabsList className="h-auto p-2 w-full max-w-2xl">
                    <TabsTrigger
                      value="story"
                      className="flex flex-col items-center gap-2 h-auto px-6 py-4 flex-1 data-[state=active]:bg-background"
                    >
                      <FileText className="h-6 w-6" />
                      <span className="text-base font-medium">Story</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="decomposition"
                      className="flex flex-col items-center gap-2 h-auto px-6 py-4 flex-1 data-[state=active]:bg-background"
                    >
                      <Layers className="h-6 w-6" />
                      <span className="text-base font-medium">
                        Intent Composition
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="runs"
                      className="flex flex-col items-center gap-2 h-auto px-6 py-4 flex-1 data-[state=active]:bg-background"
                    >
                      <History className="h-6 w-6" />
                      <span className="text-base font-medium">Recent Runs</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent
                  value="story"
                  className="flex-1 overflow-auto mt-0"
                  tabIndex={-1}
                >
                  <StoryEditForm
                    storyName={storyName}
                    storyContent={storyContent}
                    hasChanges={hasChanges}
                    isSaving={isSaving}
                    onNameChange={setStoryName}
                    onContentChange={setStoryContent}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    onArchive={() => setShowArchiveDialog(true)}
                  />
                </TabsContent>
                <TabsContent
                  value="decomposition"
                  className="flex-1 overflow-hidden mt-0"
                  tabIndex={-1}
                >
                  <StoryDecompositionTab
                    decomposition={story?.decomposition}
                    isDecomposing={isDecomposing}
                    onDecompose={handleDecompose}
                  />
                </TabsContent>
                <TabsContent
                  value="runs"
                  className="flex-1 overflow-auto mt-0"
                  tabIndex={-1}
                >
                  <StoryRunsTab isTesting={isTesting} onTest={handleTest} />
                </TabsContent>
              </Tabs>
            ) : (
              <StoryCreateForm
                storyContent={storyContent}
                createMore={createMore}
                isSaving={isSaving}
                onContentChange={setStoryContent}
                onCreateMoreChange={setCreateMore}
                onSave={handleSave}
                onCancel={handleCancel}
                onTemplates={() => setShowTemplatesDialog(true)}
              />
            )}
          </div>
        </div>
      ) : null}
      <StoryTemplatesDialog
        open={showTemplatesDialog}
        onOpenChange={setShowTemplatesDialog}
        onSelectTemplate={(content) => {
          setStoryContent(content)
        }}
      />
      <StoryArchiveDialog
        open={showArchiveDialog}
        onOpenChange={setShowArchiveDialog}
        storyName={story?.name ?? null}
        isArchiving={isArchiving}
        onArchive={handleArchive}
      />
    </AppLayout>
  )
}
