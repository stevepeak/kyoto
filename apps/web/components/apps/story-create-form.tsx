import { FileText, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TiptapEditor } from '@/components/ui/tiptap-editor'
import { KeyboardShortcutHint } from '@/components/common/keyboard-shortcut-hint'

interface StoryCreateFormProps {
  storyContent: string
  createMore: boolean
  isSaving: boolean
  isGenerating?: boolean
  onContentChange: (content: string) => void
  onCreateMoreChange: (checked: boolean) => void
  onSave: () => void
  onCancel: () => void
  onTemplates: () => void
  onGenerate?: () => void
}

export function StoryCreateForm({
  storyContent,
  createMore,
  isSaving,
  isGenerating = false,
  onContentChange,
  onCreateMoreChange,
  onSave,
  onCancel,
  onTemplates,
  onGenerate,
}: StoryCreateFormProps) {
  return (
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
              onClick={onGenerate}
              disabled={isGenerating || isSaving || !onGenerate}
              className="gap-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 hover:from-primary/20 hover:via-primary/10 hover:to-primary/20 hover:border-primary/50 transition-all shadow-sm hover:shadow-md backdrop-blur-sm relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent shimmer-effect"></span>
              <Sparkles className="h-4 w-4 text-primary relative z-10" />
              <span className="relative z-10">
                {isGenerating ? 'Generating...' : 'Generate'}
              </span>
            </Button>
          </div>
        </div>
        <TiptapEditor
          value={storyContent}
          onChange={onContentChange}
          className="min-h-96 max-h-[600px]"
          autoFocus={true}
          readOnly={isGenerating}
        />
        <div className="mt-4 flex items-center justify-between pt-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={createMore}
                onChange={(e) => onCreateMoreChange(e.target.checked)}
                disabled={isGenerating || isSaving}
                className="h-4 w-4 rounded border-input disabled:opacity-50 disabled:cursor-not-allowed"
              />
              Create more
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onTemplates}
              disabled={isGenerating || isSaving}
            >
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isGenerating || isSaving}
            >
              Cancel
            </Button>
            <Button onClick={onSave} disabled={isGenerating || isSaving}>
              {isSaving ? 'Saving...' : 'Create'}
              {!isSaving && <KeyboardShortcutHint />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
