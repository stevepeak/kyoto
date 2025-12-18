'use client'

import { Loader2, Play, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

import { DeleteStoryDialog } from './delete-story-dialog'

type StoryHeaderProps = {
  editedName: string
  hasUnsavedChanges: boolean
  isSaving: boolean
  isRunning: boolean
  isDeleting: boolean
  isCreatingNewStory: boolean
  showDeleteDialog: boolean
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSave: () => void
  onTrigger: () => void
  onDeleteClick: () => void
  onDeleteConfirm: () => void
  onDeleteCancel: () => void
}

export function StoryHeader({
  editedName,
  hasUnsavedChanges,
  isSaving,
  isRunning,
  isDeleting,
  isCreatingNewStory,
  showDeleteDialog,
  onNameChange,
  onSave,
  onTrigger,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}: StoryHeaderProps) {
  return (
    <>
      {/* Header with name and actions */}
      <div className="flex items-center gap-4 border-b px-6 py-4">
        <input
          type="text"
          value={editedName}
          onChange={onNameChange}
          className="flex-1 bg-transparent text-xl font-semibold outline-none placeholder:text-muted-foreground"
          placeholder="Story name..."
        />
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-xs text-muted-foreground">Unsaved</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={!hasUnsavedChanges || isSaving}
          >
            {isSaving ? <Spinner /> : 'Save'}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onTrigger}
            disabled={isRunning || hasUnsavedChanges}
          >
            {isRunning ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="size-4" />
                Run
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteClick}
            disabled={isDeleting || isCreatingNewStory}
            className="text-destructive hover:text-destructive"
          >
            {isDeleting ? <Spinner /> : <Trash2 className="size-4" />}
          </Button>
        </div>
      </div>

      <DeleteStoryDialog
        storyName={editedName}
        open={showDeleteDialog}
        onConfirm={onDeleteConfirm}
        onCancel={onDeleteCancel}
      />
    </>
  )
}
