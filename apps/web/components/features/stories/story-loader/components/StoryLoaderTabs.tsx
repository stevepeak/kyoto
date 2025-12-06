import { FileText, Layers, History } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StoryEditForm } from '@/components/features/stories/story-edit-form'
import { StoryDecompositionTab } from '@/components/features/stories/story-decomposition-tab'
import { StoryRunsTab } from '@/components/features/stories/story-runs-tab'
import { StoryStateBanner } from './StoryStateBanner'
import type { Story } from '../types'

interface StoryLoaderTabsProps {
  story: Story | null
  storyName: string
  storyContent: string
  hasChanges: boolean
  isSaving: boolean
  isDecomposing: boolean
  isTesting: boolean
  isTogglingState: boolean
  onNameChange: (name: string) => void
  onContentChange: (content: string) => void
  onSave: () => void
  onCancel: () => void
  onArchive: () => void
  onPause: () => void
  onDecompose: () => void
  onTest: () => void
  onToggleState: (state: 'active' | 'paused') => void
  onApproveGenerated: () => void
}

export function StoryLoaderTabs({
  story,
  storyName,
  storyContent,
  hasChanges,
  isSaving,
  isDecomposing,
  isTesting,
  isTogglingState,
  onNameChange,
  onContentChange,
  onSave,
  onCancel,
  onArchive,
  onPause,
  onDecompose,
  onTest,
  onToggleState,
  onApproveGenerated,
}: StoryLoaderTabsProps) {
  return (
    <Tabs defaultValue="story" className="flex flex-1 flex-col overflow-hidden">
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
            <span className="text-base font-medium">Intent Composition</span>
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
      <StoryStateBanner
        story={story}
        isTogglingState={isTogglingState}
        isDecomposing={isDecomposing}
        onToggleState={onToggleState}
        onApproveGenerated={onApproveGenerated}
      />
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
          onNameChange={onNameChange}
          onContentChange={onContentChange}
          onSave={onSave}
          onCancel={onCancel}
          onArchive={onArchive}
          onPause={onPause}
        />
      </TabsContent>
      <TabsContent
        value="decomposition"
        className="flex-1 overflow-hidden mt-0"
        tabIndex={-1}
      >
        <StoryDecompositionTab
          decomposition={story?.composition ?? null}
          isDecomposing={isDecomposing}
          onDecompose={onDecompose}
        />
      </TabsContent>
      <TabsContent
        value="runs"
        className="flex-1 overflow-auto mt-0"
        tabIndex={-1}
      >
        <StoryRunsTab isTesting={isTesting} onTest={onTest} />
      </TabsContent>
    </Tabs>
  )
}
