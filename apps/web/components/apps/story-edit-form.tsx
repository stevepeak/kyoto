import { Archive, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TiptapEditor } from '@/components/ui/tiptap-editor'
import { KeyboardShortcutHint } from '@/components/common/keyboard-shortcut-hint'

interface StoryEditFormProps {
  storyName: string
  storyContent: string
  hasChanges: boolean
  isSaving: boolean
  storyState?:
    | 'active'
    | 'archived'
    | 'generated'
    | 'paused'
    | 'planned'
    | 'processing'
  onNameChange: (name: string) => void
  onContentChange: (content: string) => void
  onSave: () => void
  onCancel: () => void
  onArchive: () => void
  onPause: () => void
}

export function StoryEditForm({
  storyName,
  storyContent,
  hasChanges,
  isSaving,
  storyState,
  onNameChange,
  onContentChange,
  onSave,
  onCancel,
  onArchive,
  onPause,
}: StoryEditFormProps) {
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onNameChange(e.target.value)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
    if (e.key === 'Escape') {
      onNameChange(storyName)
      e.currentTarget.blur()
    }
  }

  return (
    <div className="flex items-center justify-center min-h-full p-12">
      <div className="w-full max-w-3xl">
        <div className="mb-6">
          <p
            className="text-sm font-semibold tracking-[0.3em] text-primary mb-2"
            title="Henshuu - to edit."
          >
            へんしゅう
          </p>
          <Input
            value={storyName || ''}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled Story"
            disabled={isSaving}
            className="text-2xl md:text-2xl font-display text-foreground h-auto py-2 px-0 border-0 border-none rounded-none focus-visible:ring-0 focus-visible:border-0 focus:border-0 focus:ring-0 bg-transparent shadow-none"
          />
        </div>
        <TiptapEditor
          value={storyContent}
          onChange={onContentChange}
          className="min-h-96 max-h-[600px]"
        />
        <div className="mt-4 flex items-center justify-between pt-4">
          <div className="flex items-center gap-4">
            {storyState === 'active' && (
              <Button variant="ghost" onClick={onPause}>
                <Pause className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" onClick={onArchive}>
              <Archive className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                Revert changes
              </Button>
            )}
            <Button
              onClick={onSave}
              disabled={isSaving || !hasChanges}
              variant={!hasChanges ? 'outline' : 'default'}
            >
              {isSaving
                ? 'Saving...'
                : !hasChanges
                  ? 'No changes made'
                  : 'Save Changes'}
              {!isSaving && hasChanges && <KeyboardShortcutHint />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
