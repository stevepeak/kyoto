'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileText, Layers, History, Pause, Play, Sparkles } from 'lucide-react'
import { useTRPCClient } from '@/client/trpc'
import { AppLayout } from '@/components/layout'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { StoryArchiveDialog } from '@/components/apps/story-archive-dialog'
import { StoryTemplatesDialog } from '@/components/apps/story-templates-dialog'
import { StoryEditForm } from '@/components/apps/story-edit-form'
import { StoryCreateForm } from '@/components/apps/story-create-form'
import { StoryDecompositionTab } from '@/components/apps/story-decomposition-tab'
import { StoryRunsTab } from '@/components/apps/story-runs-tab'
import type { DecompositionOutput } from '@app/schemas'
import {
  TriggerDevTrackingDialog,
  useTriggerDevTracking,
} from '@/components/common/workflow-tracking-dialog'
import { EmptyState } from '@/components/common/EmptyState'
import { Loader2 } from 'lucide-react'
import { useRealtimeRun } from '@trigger.dev/react-hooks'

// Define StoryDiscoveryOutput type locally to avoid importing from @app/agents
interface StoryDiscoveryOutput {
  stories: Array<{
    text: string
    title?: string
  }>
}

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
  metadata?: any
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
  const [showGenerationDialog, setShowGenerationDialog] = useState(false)
  const [createMore, setCreateMore] = useState(false)

  // Action states
  const [isSaving, setIsSaving] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isTogglingState, setIsTogglingState] = useState(false)
  const [isDecomposing, setIsDecomposing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationRunId, setGenerationRunId] = useState<string | null>(null)
  const [generationAccessToken, setGenerationAccessToken] = useState<
    string | null
  >(null)

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
        setStory(result.story as Story)
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

  const handleGenerate = async () => {
    if (!isCreateMode) {
      return // Only allow generation in create mode
    }

    setIsGenerating(true)
    setError(null)

    try {
      const result = await trpc.story.generate.mutate({
        orgName,
        repoName,
      })

      if (result.triggerHandle?.publicAccessToken && result.triggerHandle?.id) {
        // Set the run ID and token to enable the hook
        setGenerationRunId(result.triggerHandle.id)
        setGenerationAccessToken(result.triggerHandle.publicAccessToken)
        // Open the dialog to show progress
        setShowGenerationDialog(true)
        // Keep isGenerating true while dialog is open - don't set to false here
      } else {
        throw new Error('Failed to get trigger handle')
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Failed to generate story. Please try again.',
      )
      toast.error('Failed to generate story')
      setIsGenerating(false)
    }
  }

  // Use the realtime run hook to track story generation
  const { run: generationRun, error: generationError } = useRealtimeRun(
    generationRunId ?? '',
    {
      accessToken: generationAccessToken ?? undefined,
      enabled: generationRunId !== null && generationAccessToken !== null,
    },
  )

  // Handle story generation completion
  const handleGenerationComplete = () => {
    if (generationRun) {
      // Extract the story from the output
      const output = generationRun.output as StoryDiscoveryOutput | undefined
      if (output?.stories && output.stories.length > 0) {
        const generatedStory = output.stories[0]
        setStoryContent(generatedStory.text)
        if (generatedStory.title) {
          setStoryName(generatedStory.title)
        }
        toast.success('Story generated successfully')
      } else {
        setError('No story was generated')
        toast.error('No story was generated')
      }
    }
    // Clean up
    setIsGenerating(false)
    setGenerationRunId(null)
    setGenerationAccessToken(null)
    setShowGenerationDialog(false)
  }

  // Handle dialog close (manual or on completion)
  const handleGenerationDialogChange = (open: boolean) => {
    setShowGenerationDialog(open)
    if (!open) {
      // If dialog is closed manually, clean up
      setIsGenerating(false)
      setGenerationRunId(null)
      setGenerationAccessToken(null)
    }
  }

  // Handle generation errors
  useEffect(() => {
    if (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'Failed to generate story',
      )
      toast.error('Failed to generate story')
      setIsGenerating(false)
      setGenerationRunId(null)
      setGenerationAccessToken(null)
      setShowGenerationDialog(false)
    }
  }, [generationError])

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
    if (!storyId) {
      return
    }
    setIsArchiving(true)
    setError(null)
    try {
      await trpc.story.toggleState.mutate({
        orgName,
        repoName,
        storyId: storyId,
        state: 'archived',
      })
      router.push(`/org/${orgName}/repo/${repoName}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to archive story')
      setIsArchiving(false)
      setShowArchiveDialog(false)
    }
  }

  const handleToggleState = async (newState: 'active' | 'paused') => {
    if (!storyId) {
      return
    }
    setIsTogglingState(true)
    setError(null)
    try {
      const result = await trpc.story.toggleState.mutate({
        orgName,
        repoName,
        storyId: storyId,
        state: newState,
      })
      if (result.story) {
        setStory(result.story as Story)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to toggle story state')
    } finally {
      setIsTogglingState(false)
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
        setStory(resp.story as Story)
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

  const handleApproveGenerated = async () => {
    if (!storyId) {
      return
    }
    setIsDecomposing(true)
    setError(null)
    try {
      // Trigger decomposition workflow (task will set state to processing)
      await trpc.story.decompose.mutate({
        storyId: storyId,
      })
      // Navigate back to repos page
      router.push(`/org/${orgName}/repo/${repoName}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve story')
      setIsDecomposing(false)
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
                {story?.state === 'paused' && (
                  <div className="px-6 pb-4 flex items-center justify-center">
                    <div className="w-full max-w-2xl p-4 text-sm border-muted-foreground/30 bg-muted text-muted-foreground rounded-md flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Pause className="h-4 w-4" />
                        <span>
                          This story is paused and will not be tested in CI.
                          Click Enable to activate it for testing.
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleState('active')}
                        disabled={isTogglingState}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Enable
                      </Button>
                    </div>
                  </div>
                )}
                {story?.state === 'generated' && (
                  <div className="px-6 pb-4 flex items-center justify-center">
                    <div className="w-full max-w-2xl p-4 text-sm border-chart-1/30 bg-chart-1/10 text-chart-1 rounded-md flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        <span>
                          This story was generated by reviewing your codebase
                          for potential user stories. Please review it and make
                          appropriate changes. When ready, click approve below
                          to activate.
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-chart-1/30 bg-chart-1/10 text-chart-1 hover:bg-chart-1/20 hover:text-chart-1"
                        onClick={handleApproveGenerated}
                        disabled={isDecomposing}
                      >
                        {isDecomposing ? 'Processing...' : 'Approve'}
                      </Button>
                    </div>
                  </div>
                )}
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
                    storyState={story?.state}
                    onNameChange={setStoryName}
                    onContentChange={setStoryContent}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    onArchive={() => setShowArchiveDialog(true)}
                    onPause={() => handleToggleState('paused')}
                  />
                </TabsContent>
                <TabsContent
                  value="decomposition"
                  className="flex-1 overflow-hidden mt-0"
                  tabIndex={-1}
                >
                  <StoryDecompositionTab
                    decomposition={story?.decomposition ?? null}
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
                isGenerating={isGenerating}
                onContentChange={setStoryContent}
                onCreateMoreChange={setCreateMore}
                onSave={handleSave}
                onCancel={handleCancel}
                onTemplates={() => setShowTemplatesDialog(true)}
                onGenerate={handleGenerate}
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
      <TriggerDevTrackingDialog
        open={showGenerationDialog}
        onOpenChange={handleGenerationDialogChange}
        runId={generationRunId}
        publicAccessToken={generationAccessToken}
        onComplete={handleGenerationComplete}
      >
        <StoryGenerationTrackingContent />
      </TriggerDevTrackingDialog>
    </AppLayout>
  )
}

function StoryGenerationTrackingContent() {
  const { isLoading, isCompleted, error, closeDialog } = useTriggerDevTracking()

  if (isLoading) {
    return (
      <EmptyState
        kanji="そうぞう"
        kanjiTitle="Sōzō - creation."
        title="Generating story..."
        description="Analyzing your codebase to discover a new user story. This may take a minute."
        action={
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        }
      />
    )
  }

  if (error) {
    return (
      <EmptyState
        title="Generation failed"
        description={error}
        action={
          <Button onClick={closeDialog} variant="outline">
            Close
          </Button>
        }
      />
    )
  }

  if (isCompleted) {
    return (
      <EmptyState
        kanji="せいこう"
        kanjiTitle="Seikō - success."
        title="Story generated"
        description="Your story has been generated and added to the editor."
        action={<Button onClick={closeDialog}>Close</Button>}
      />
    )
  }

  return (
    <EmptyState
      title="Preparing generation..."
      description="Setting up story generation."
    />
  )
}
