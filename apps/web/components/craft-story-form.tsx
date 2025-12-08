'use client'

import { FileText, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { toast } from 'sonner'

import { Kanji } from '@/components/kanji'
import { KeyboardShortcutHint } from '@/components/keyboard-shortcut-hint'
import { ShimmerButton } from '@/components/shimmer-button'
import { Tiptap } from '@/components/tiptap'
import { Button } from '@/components/ui/button'

interface CraftStoryFormProps {
  owner: string
  repo: string
}

export function CraftStoryForm({ owner, repo }: CraftStoryFormProps) {
  const router = useRouter()
  const [storyContent, setStoryContent] = useState('')
  const [createMore, setCreateMore] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleSave = async () => {
    if (!storyContent.trim()) {
      toast.error('Story content cannot be empty')
      return
    }

    setIsSaving(true)
    try {
      // TODO: Implement actual save logic with tRPC
      // const result = await trpc.story.create.mutate({
      //   orgName: owner,
      //   repoName: repo,
      //   content: storyContent,
      // })

      // Simulate save for now
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (createMore) {
        setStoryContent('')
        setIsSaving(false)
        toast.success('Story created.')
        return
      }

      // Navigate back to the repository page
      router.push(`/~/${owner}/${repo}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create story')
      setIsSaving(false)
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      // TODO: Implement actual generate logic with tRPC
      // const result = await trpc.story.generate.mutate({
      //   orgName: owner,
      //   repoName: repo,
      // })

      // Simulate generation for now
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setStoryContent(
        '# Generated Story\n\nThis is a generated story placeholder.',
      )
      toast.success('Story generated!')
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : 'Failed to generate story. Please try again.',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  const handleTemplates = () => {
    toast.info('Templates feature coming soon!')
  }

  // Handle Cmd/Ctrl+Enter for save
  useHotkeys(
    'mod+enter',
    (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (!isSaving && storyContent.trim()) {
        void handleSave()
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
  )

  return (
    <div className="flex items-center justify-center min-h-full p-12">
      <div className="w-full max-w-3xl">
        <div className="mb-6">
          <Kanji title="Sakusei - to create." className="mb-2">
            さくせい
          </Kanji>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-display text-foreground">
              Craft new user story
            </h1>
            <ShimmerButton
              icon={Sparkles}
              onClick={handleGenerate}
              disabled={isSaving}
              isLoading={isGenerating}
              loadingText="Generating..."
            >
              Generate
            </ShimmerButton>
          </div>
        </div>
        <Tiptap
          value={storyContent}
          onChange={setStoryContent}
          className="min-h-96 max-h-[600px]"
          readOnly={isGenerating}
          autoFocus
        />
        <div className="mt-4 flex items-center justify-between pt-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={createMore}
                onChange={(e) => setCreateMore(e.target.checked)}
                disabled={isGenerating || isSaving}
                className="h-4 w-4 rounded border-input disabled:opacity-50 disabled:cursor-not-allowed"
              />
              Create more
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleTemplates}
              disabled={isGenerating || isSaving}
            >
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isGenerating || isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isGenerating || isSaving}>
              {isSaving ? 'Saving...' : 'Create'}
              {!isSaving && <KeyboardShortcutHint />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
